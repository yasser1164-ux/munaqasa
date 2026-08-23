-- ============================================================================
-- Munaqasa — live auctions for construction materials
-- Paste this whole file into Supabase → SQL Editor → Run, once.
--
-- Two tables and one rule that matters: the DEADLINE. Prices are public the
-- moment they are placed — suppliers are meant to see each other and undercut,
-- that is the whole mechanism — but no bid may arrive after the closing time.
-- When the clock stops, the lowest complete price has won; the winner is
-- computed from the data, never written by a hand that could pick differently.
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
  bid_count      integer not null default 0,       -- how many suppliers are in
  awarded_bid_id uuid,                             -- unused: the clock decides
  awarded_at     timestamptz,                      -- unused: the clock decides
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
                                                       -- (a supplier inserts a new row to go lower;
                                                       --  only their latest row competes)
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
-- The anon key is public, so it gets exactly four verbs: read tenders, read
-- bids, post a tender, post a bid. Nothing here can update or delete a row —
-- and because the winner is computed rather than stored, there is no "award"
-- write for anyone to abuse.

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

-- Prices are public. A supplier who cannot see the price to beat cannot beat
-- it, and an auction where nobody undercuts anybody is just a slow quote.
drop policy if exists "bids are public" on public.bids;
create policy "bids are public"
  on public.bids for select using (true);

-- THE DEADLINE — the one rule the auction really enforces. Without it a "live"
-- auction never ends and the last bidder always wins by waiting.
drop policy if exists "bids only while open" on public.bids;
create policy "bids only while open"
  on public.bids for insert with check (
    exists (select 1 from public.tenders t
            where t.id = bids.tender_id and t.closes_at > now())
  );

-- ---- bidder count ----------------------------------------------------------
-- How many suppliers are competing, kept by a trigger. A supplier who drops
-- their price four times is still one bidder, not four.

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

-- ---- no awarding ------------------------------------------------------------
-- There is deliberately no award function. The winner of an auction is the
-- lowest complete bid at the closing time — a fact about the rows, computed by
-- the app on every render. Storing it would create a way to override it, and a
-- buyer who can quietly pick someone other than the cheapest is exactly what a
-- supplier has to trust this thing not to do.

-- ---- housekeeping ----------------------------------------------------------
-- Finished auctions are the market history the "market check" median is built
-- from, so nothing is deleted automatically. To clear the board manually:
--   delete from public.tenders where closes_at < now() - interval '90 days';
-- (bids follow through the cascade).
