# Munaqasa · مناقصة

A live auction for construction materials. A buyer posts what a site needs,
suppliers undercut each other in the open while the clock runs, and when it
stops the lowest **landed cost** wins by itself — nobody picks a winner.

**Live site:** https://yasser1164-ux.github.io/munaqasa/
(auto-deploys from `main` via GitHub Pages; live about a minute after each merge)

Plain HTML/CSS/JS — no build step, no framework — with
[Supabase](https://supabase.com) as the data backend. Fully bilingual:
English and Arabic with true RTL, toggled from the header.

## Why it exists

Buying materials by phone means taking the first quote from the supplier who
answered, comparing unit prices that aren't comparable, and never knowing what
the others would have said. Munaqasa turns that into an auction that runs
itself:

1. **Post** — materials, quantities, specification, the date it must be on site.
2. **They undercut** — one link to the supplier WhatsApp group. Every supplier
   sees the price to beat, so it keeps falling: one opens at 64,216, another
   answers 62,204, an hour later the first comes back at 61,600.
3. **Lowest wins** — when the clock stops, the cheapest complete landed cost
   wins automatically. The buyer decides nothing, which is exactly why the
   suppliers bother going lower.

Every price is public while the auction runs, and the whole walk-down is kept:
the **price drops** panel shows each price, who placed it and when.

## Architecture

```
index.html    BOARD — every request, filtered by status/material/search, with
              "Your activity" (what you posted, what you bid on) on top.
post.html     Buyer's form: line items, delivery site, bidding window.
tender.html   One auction — the price to beat, the live standings, the
              price-drop history, the bid form, and the automatic winner.
i18n.js       LANGUAGE — the en/ar dictionary, tr(), Arabic plural rules, and
              the toggle that flips dir=rtl and re-renders each page.
core.js       Materials catalog (bilingual), units, cities, formatting, and the
              auction maths: landed cost, coverage, ranking, who is winning,
              price history, split award.
store.js      DATA layer: Supabase REST + a localStorage mirror, plus the
              device-key identity. Polls for new prices while an auction runs.
seed.js       Sample board — six auctions, live and finished, with real
              price-drop histories.
list.js       Board logic.   post.js  Form logic.   tender.js  Detail page.
styles.css    All styling, mobile at 760px, plus the RTL rules.
config.js     Supabase URL + anon key.
supabase/tenders.sql  Tables, row level security, bidder-count trigger.
```

Script order on every page: `config → i18n → core → store → seed → (list|post|tender)`.

## The numbers

Everything is compared on **landed cost**, never on unit price:

```
landed = Σ(quantity × unit price) + delivery − discount + 15% VAT
```

- **Partial bids** are normal (a sand yard won't quote your rebar). They're
  never ranked against complete bids — a smaller total for a smaller scope is
  meaningless — but they compete line by line in the split award.
- **The winner is computed, never chosen.** It is the lowest complete bid when
  the clock stops — `leadingBid()` in `core.js`, recalculated on every render.
  Nothing stores it, so nothing can override it.
- **You can only go down.** A supplier may drop their price as often as they
  like; each drop is a new row and only their latest one competes. Raising your
  own standing price is refused — this is an auction, not a quote sheet.
- **Split award** takes the cheapest supplier per line, then charges every
  chosen supplier's delivery once and checks the split still wins. Volume
  discounts quoted on a full package aren't counted toward a split order.
- **Market check** is the median unit price actually bid for that material and
  unit across the board — real bids only, and only once at least three exist.
  Nothing on this page is an invented benchmark.

## Setup

`supabase/tenders.sql` has already been run on the project `config.js` points
at. To point this at a different Supabase project: create one, run that file in
**SQL Editor**, and paste the project URL and anon key into `config.js`.

Until a database is reachable the app works entirely on the device: requests,
bids and awards are mirrored to localStorage, so the whole flow is demoable
offline. The one thing that can't work offline is sharing — a link only opens
for someone else once the database exists.

## What's enforced where

The anon key is public, so nothing important is left to the browser:

| Rule | Enforced by |
|------|-------------|
| Prices are public while the auction runs | RLS policy on `bids` (select `true`) |
| **No bid after the close** — the one rule that matters | RLS policy on `bids` (insert) |
| A tender needs a title, ≥1 line and a future close | RLS policy on `tenders` (insert) |
| How many suppliers are competing | `bid_count`, kept by a trigger |
| The cheapest wins, and nobody can override it | there is no award write at all — the winner is computed from the rows |

Nothing can update or delete a row with the public key. A price, once placed,
stands as placed.

## Language (i18n.js)

Every UI string lives once in the `MZ_STR` dictionary and renders through
`tr(key, vars)`; the toggle re-renders each page via `window.onLangChange`
(the tender page snapshots and restores a half-typed bid form first). Details
that are easy to get wrong and are handled deliberately:

- **RTL** comes from `dir="rtl"` plus logical CSS properties
  (`text-align:start/end`, `margin-inline-start`) — the layout mirrors itself.
- **Arabic type**: IBM Plex Sans Arabic, and `letter-spacing: 0` under
  `[dir=rtl]` — tracking breaks joined Arabic letterforms.
- **Dates** use `ar-SA-u-ca-gregory-nu-latn`: Arabic month names but the
  Gregorian calendar and Latin digits (plain `ar-SA` silently switches to the
  Islamic calendar).
- **Plurals** are real: عرض / عرضان / عروض / عرضًا by count, same for بند,
  يوم, ساعة, دقيقة.
- **User content is never translated** — titles, specs and notes appear as
  typed. The materials/units catalog shows both languages; city names are
  stored in English (stable in the database) and displayed per language.

## Identity — and its limits

No accounts. A random key in `localStorage` proves "I posted this" and "this is
my bid" — it is what lets a supplier come back and drop their price, and what
marks an auction as yours on the board. That means:

- clearing site data, or switching device, loses the thread back to an auction
  you posted or a price you placed — keep the link;
- it is proof of *possession*, not identity: good enough for a supplier group
  you already deal with, not for a public procurement portal. Real accounts
  (Supabase Auth) are the upgrade path, and the schema is ready for it — swap
  `owner_key`/`bidder_key` for `auth.uid()`.

## Local development

```
python3 -m http.server 8000
# then open http://localhost:8000
```

Without a database you get the sample board and everything stays on the device.
To start clean, clear `munaqasa.*` from localStorage. The sample board retires
itself the moment a real auction exists — except a sample you bid on, which
stays so your own bid still points somewhere.

The live pages poll every 20–30 seconds so prices and countdowns move without a
reload; a supplier halfway through typing a price is never re-rendered out from
under them.
