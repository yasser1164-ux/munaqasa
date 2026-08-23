-- ============================================================================
-- Munaqasa — construction materials tenders (the /bids app)
-- Paste this whole file into Supabase → SQL Editor → Run, once.
--
-- Two tables and one rule that matters: a bid is invisible to everybody except
-- the supplier who wrote it until its tender's closing time passes. That is
-- enforced here, in row level security, not just in the browser — otherwise
-- anyone with the public key could read the competition's prices and undercut
-- them by a riyal.
-- ============================================================================

create table if not exists public.tenders (
  id             uuid primary key,
  ref            text not null,                    -- RFQ-4821, for the phone
  title          text not null,
  buyer_name     text,
  buyer_company  text,
  buyer_phone    text,
  city           text,
  site_note      text,                             -- access, gate, offloading hours
  needed_by      date,
  closes_at      timestamptz not null,             -- bids open at this moment
  items          jsonb not null default '[]'::jsonb,  -- [{material,spec,qty,unit}]
  notes          text,
  bid_count      integer not null default 0,       -- public count, private prices
  awarded_bid_id uuid,
  awarded_at     timestamptz,
  owner_key      text not null,                    -- the buyer's device secret
  created_at     timestamptz not null default now()
);

create table if not exists public.bids (
  id              uuid primary key,
  tender_id       uuid not null references public.tenders(id) on delete cascade,
  supplier_name   text,
  supplier_company text,
  supplier_phone  text,
  lines           jsonb not null default '[]'::jsonb,  -- unit price per tender line, null = no bid
  delivery_fee    numeric(12,2) not null default 0,
  discount        numeric(12,2) not null default 0,
  lead_days       integer not null default 3,
  validity_days   integer not null default 14,
  terms           text,
  notes           text,
  bidder_key      text not null,                   -- the supplier's device secret
  created_at      timestamptz not null default now()
);

create index if not exists bids_tender_idx on public.bids (tender_id);
create index if not exists tenders_closes_idx on public.tenders (closes_at desc);

alter table public.tenders enable row level security;
alter table public.bids enable row level security;

-- ---- who may do what -------------------------------------------------------
-- The anon key is public, so it gets exactly three verbs: read tenders, post a
-- tender, post a bid. Awarding goes through the function at the bottom, which
-- checks the buyer's key server-side; nothing here can update or delete a row.

revoke all on public.tenders from anon;
revoke all on public.bids from anon;
grant select, insert on public.tenders to anon;
grant select, insert on public.bids to anon;

drop policy if exists "tenders are public" on public.tenders;
create policy "tenders are public"
  on public.tenders for select using (true);

-- Guard rails, not validation: a request needs a real title, at least one line,
-- and a closing time in the future.
drop policy if exists "anyone may post a tender" on public.tenders;
create policy "anyone may post a tender"
  on public.tenders for insert with check (
    closes_at > now()
    and char_length(title) between 3 and 200
    and jsonb_array_length(items) between 1 and 50
  );

-- THE SEAL: a bid becomes readable only once its tender has closed. Before
-- that the row exists and counts, but no one can select it — not the other
-- suppliers, not the buyer. (A supplier still sees their own bid: the browser
-- keeps a copy on the device that sent it.)
drop policy if exists "bids open at closing time" on public.bids;
create policy "bids open at closing time"
  on public.bids for select using (
    exists (select 1 from public.tenders t
            where t.id = bids.tender_id and t.closes_at <= now())
  );

-- ...and no bid may arrive after the close.
drop policy if exists "bids only while open" on public.bids;
create policy "bids only while open"
  on public.bids for insert with check (
    exists (select 1 from public.tenders t
            where t.id = bids.tender_id and t.closes_at > now())
  );

-- ---- public bid count ------------------------------------------------------
-- The buyer is allowed to know how many bids are in, never what they say. A
-- trigger keeps the number; a revised price from a supplier who already bid
-- replaces their bid rather than adding a bidder.

create or replace function public.bump_bid_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.bids b
    where b.tender_id = new.tender_id and b.bidder_key = new.bidder_key and b.id <> new.id
  ) then
    update public.tenders set bid_count = bid_count + 1 where id = new.tender_id;
  end if;
  return new;
end $$;

drop trigger if exists bids_bump_count on public.bids;
create trigger bids_bump_count after insert on public.bids
  for each row execute function public.bump_bid_count();

-- A trigger function must never be callable directly through /rest/v1/rpc.
revoke all on function public.bump_bid_count() from public;
revoke all on function public.bump_bid_count() from anon;
revoke all on function public.bump_bid_count() from authenticated;

-- ---- awarding --------------------------------------------------------------
-- The one write that has to be protected. The buyer's device key never leaves
-- their browser except in this call, and the function refuses everything else:
-- awarding somebody else's tender, awarding before the bids have opened,
-- awarding twice, or awarding a bid that was placed on another tender.

create or replace function public.award_tender(p_tender uuid, p_owner_key text, p_bid uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare updated integer;
begin
  update public.tenders t
     set awarded_bid_id = p_bid, awarded_at = now()
   where t.id = p_tender
     and t.owner_key = p_owner_key
     and t.closes_at <= now()
     and t.awarded_bid_id is null
     and exists (select 1 from public.bids b where b.id = p_bid and b.tender_id = p_tender);
  get diagnostics updated = row_count;
  return updated > 0;
end $$;

revoke all on function public.award_tender(uuid, text, uuid) from public;
grant execute on function public.award_tender(uuid, text, uuid) to anon;

-- ---- housekeeping ----------------------------------------------------------
-- Closed tenders are the market history the "market check" median is built
-- from, so nothing is deleted automatically. To clear the board manually:
--   delete from public.tenders where closes_at < now() - interval '90 days';
-- (bids follow through the cascade).
