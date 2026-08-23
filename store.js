// ---- DATA LAYER -------------------------------------------------------------
// Tenders and bids come from Supabase when supabase/tenders.sql has been run;
// everything is also mirrored into localStorage, so a request posted on a site
// with no signal still exists, still opens, and still compares. If Supabase is
// unreachable the app runs entirely on this device instead of breaking.
//
// This file is also where sealed bidding is enforced on the client: before a
// tender's closing time, bidsFor() returns only the bids this device sent.
// (The database enforces the same rule for everyone else — see tenders.sql.)

const MZ_ME_KEY = 'munaqasa.me';
const MZ_LOCAL_KEY = 'munaqasa.local.v1';

const mzConfigured =
  typeof MZ_SUPABASE_URL === 'string' && MZ_SUPABASE_URL.startsWith('http') &&
  typeof MZ_SUPABASE_ANON_KEY === 'string' && !MZ_SUPABASE_ANON_KEY.startsWith('YOUR_');

let MZ_ONLINE = mzConfigured;   // flipped to false the first time a call fails

// ---- identity ---------------------------------------------------------------
// No accounts, no passwords. A random key kept on the device proves "I posted
// this request" (so only the buyer sees the comparison and awards it) and
// "this is my bid" (so a supplier can review their own sealed price). Losing
// the device means losing that proof — the manage link below is the way back.

function mzMe() {
  let me = null;
  try { me = JSON.parse(localStorage.getItem(MZ_ME_KEY) || 'null'); } catch { me = null; }
  if (!me || !me.key) {
    me = { key: uuid(), name: '', company: '', phone: '' };
    mzWriteMe(me);
  }
  return me;
}

function mzWriteMe(me) {
  try { localStorage.setItem(MZ_ME_KEY, JSON.stringify(me)); } catch { /* private mode */ }
}

function mzSaveMe(patch) {
  const me = { ...mzMe(), ...patch };
  mzWriteMe(me);
  return me;
}

// ---- local mirror -----------------------------------------------------------

function mzLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(MZ_LOCAL_KEY) || 'null');
    if (raw && Array.isArray(raw.tenders) && Array.isArray(raw.bids)) return raw;
  } catch { /* fall through */ }
  return { tenders: [], bids: [] };
}

function mzWriteLocal(db) {
  try { localStorage.setItem(MZ_LOCAL_KEY, JSON.stringify(db)); } catch { /* private mode */ }
}

function mzRemember(kind, row) {
  const db = mzLocal();
  const list = db[kind];
  const i = list.findIndex(r => r.id === row.id);
  if (i >= 0) list[i] = { ...list[i], ...row }; else list.push(row);
  mzWriteLocal(db);
}

// ---- row mapping ------------------------------------------------------------

function tenderFromRow(r) {
  return {
    id: r.id, ref: r.ref, title: r.title,
    buyerName: r.buyer_name, buyerCompany: r.buyer_company, buyerPhone: r.buyer_phone,
    city: r.city, site: r.site_note,
    neededBy: r.needed_by, closesAt: r.closes_at,
    items: Array.isArray(r.items) ? r.items : [],
    notes: r.notes,
    bidCount: r.bid_count || 0,
    awardedBidId: r.awarded_bid_id, awardedAt: r.awarded_at,
    ownerKey: r.owner_key, createdAt: r.created_at
  };
}

function tenderToRow(t) {
  return {
    id: t.id, ref: t.ref, title: t.title,
    buyer_name: t.buyerName, buyer_company: t.buyerCompany, buyer_phone: t.buyerPhone,
    city: t.city, site_note: t.site,
    needed_by: t.neededBy, closes_at: t.closesAt,
    items: t.items, notes: t.notes,
    owner_key: t.ownerKey, created_at: t.createdAt
  };
}

function bidFromRow(r) {
  return {
    id: r.id, tenderId: r.tender_id,
    supplierName: r.supplier_name, supplierCompany: r.supplier_company, supplierPhone: r.supplier_phone,
    lines: Array.isArray(r.lines) ? r.lines : [],
    deliveryFee: r.delivery_fee, discount: r.discount,
    leadDays: r.lead_days, validityDays: r.validity_days,
    terms: r.terms, notes: r.notes,
    bidderKey: r.bidder_key, createdAt: r.created_at
  };
}

function bidToRow(b) {
  return {
    id: b.id, tender_id: b.tenderId,
    supplier_name: b.supplierName, supplier_company: b.supplierCompany, supplier_phone: b.supplierPhone,
    lines: b.lines, delivery_fee: b.deliveryFee, discount: b.discount,
    lead_days: b.leadDays, validity_days: b.validityDays,
    terms: b.terms, notes: b.notes,
    bidder_key: b.bidderKey, created_at: b.createdAt
  };
}

// ---- transport --------------------------------------------------------------

function mzHeaders(extra) {
  return {
    apikey: MZ_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${MZ_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

async function mzGet(path) {
  if (!MZ_ONLINE) return null;
  try {
    const res = await fetch(`${MZ_SUPABASE_URL}/rest/v1/${path}`, { headers: mzHeaders() });
    if (!res.ok) throw new Error(`Supabase responded ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Supabase unreachable — running on local data.', err);
    MZ_ONLINE = false;
    return null;
  }
}

async function mzPost(table, row) {
  if (!MZ_ONLINE) return false;
  try {
    const res = await fetch(`${MZ_SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: mzHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify(row)
    });
    if (!res.ok) throw new Error(`Supabase responded ${res.status}`);
    return true;
  } catch (err) {
    console.warn('Could not save to Supabase — kept on this device.', err);
    return false;
  }
}

// ---- board ------------------------------------------------------------------
// Remote rows win on conflict; anything created here that the server never got
// is merged back in, so an offline post is not lost when the signal returns.

const MZ_BOARD = { tenders: [], bids: [], loaded: false };

function mzMerge(remote, local) {
  const byId = new Map(remote.map(r => [r.id, r]));
  for (const row of local) if (!byId.has(row.id)) byId.set(row.id, row);
  return [...byId.values()];
}

async function mzLoadBoard() {
  const local = mzLocal();
  const [tenderRows, bidRows] = await Promise.all([
    mzGet('tenders?select=*&order=created_at.desc'),
    mzGet('bids?select=*')
  ]);

  const remoteTenders = (tenderRows || []).map(tenderFromRow);
  const remoteBids = (bidRows || []).map(bidFromRow);
  const haveRemote = remoteTenders.length > 0;

  // The bundled sample board is a demo, not data: it disappears the moment
  // there is anything real to look at, here or on the server. Interacting with
  // a sample request (bidding on it, awarding it) saves a local copy of that
  // sample — which is still demo data and must not take the rest down with it.
  const realLocal = local.tenders.filter(t => !t.demo);
  const showDemo = !haveRemote && realLocal.length === 0;
  // One exception when the demo retires: a sample request this device actually
  // bid on stays, so the bid under "Your activity" still points somewhere.
  const bidOn = new Set(local.bids.filter(b => !b.demo).map(b => b.tenderId));
  const base = showDemo ? MZ_SEED.tenders : MZ_SEED.tenders.filter(t => bidOn.has(t.id));
  const baseBids = showDemo ? MZ_SEED.bids : MZ_SEED.bids.filter(b => bidOn.has(b.tenderId));

  const localTenders = showDemo ? local.tenders : realLocal;
  // A bid this device sent stays, whatever tender it was for — that copy is
  // how a supplier sees their own price back while it is still sealed.
  const localBids = showDemo ? local.bids : local.bids.filter(b => !b.demo);

  MZ_BOARD.tenders = mzMerge(mzMerge(remoteTenders, localTenders), base)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  MZ_BOARD.bids = mzMerge(mzMerge(remoteBids, localBids), baseBids);
  MZ_BOARD.loaded = true;
  return MZ_BOARD;
}

function mzTender(id) {
  return MZ_BOARD.tenders.find(t => t.id === id) || null;
}

// Sealed bidding, enforced: while a tender is open nobody sees a price except
// the supplier who wrote it. After the closing time every bid is revealed at
// once, which is the whole point of a sealed tender.
function mzBidsFor(tenderId) {
  const t = mzTender(tenderId);
  const all = MZ_BOARD.bids.filter(b => b.tenderId === tenderId);
  if (!t || !isSealed(t)) return all;
  const me = mzMe();
  return all.filter(b => b.bidderKey === me.key);
}

// What the buyer is allowed to know before opening: how many came in.
// bid_count is kept by a database trigger so the number is public while the
// prices are not; the local max() covers bids this device sent offline.
function mzSealedCount(t) {
  const local = new Set(MZ_BOARD.bids.filter(b => b.tenderId === t.id).map(b => b.bidderKey)).size;
  return Math.max(t.bidCount || 0, local);
}

function mzIsMine(t) {
  return !!t && t.ownerKey === mzMe().key;
}

// The latest revision — a supplier may re-bid as often as they like before the
// close, and only their last price counts.
function mzMyBid(tenderId) {
  const me = mzMe();
  return MZ_BOARD.bids
    .filter(b => b.tenderId === tenderId && b.bidderKey === me.key)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
}

// ---- writes -----------------------------------------------------------------

async function mzCreateTender(draft) {
  const me = mzMe();
  const t = {
    id: uuid(),
    ref: makeRef(),
    ownerKey: me.key,
    createdAt: new Date().toISOString(),
    bidCount: 0,
    awardedBidId: null,
    ...draft
  };
  mzRemember('tenders', t);
  MZ_BOARD.tenders.unshift(t);
  t.synced = await mzPost('tenders', tenderToRow(t));
  return t;
}

async function mzCreateBid(draft) {
  const me = mzMe();
  const b = {
    id: uuid(),
    bidderKey: me.key,
    createdAt: new Date().toISOString(),
    ...draft
  };
  mzRemember('bids', b);
  MZ_BOARD.bids.push(b);
  b.synced = await mzPost('bids', bidToRow(b));
  // A revision replaces a price, it does not add a bidder — only the first bid
  // from this supplier moves the count the buyer sees.
  const t = mzTender(b.tenderId);
  const first = !MZ_BOARD.bids.some(x =>
    x.tenderId === b.tenderId && x.bidderKey === b.bidderKey && x.id !== b.id);
  if (t && first) t.bidCount = (t.bidCount || 0) + 1;
  return b;
}

async function mzAward(tenderId, bidId) {
  const t = mzTender(tenderId);
  if (!t) return false;
  t.awardedBidId = bidId;
  t.awardedAt = new Date().toISOString();
  mzRemember('tenders', t);
  if (!MZ_ONLINE) return false;
  // The award is the one write the public key must not be trusted with, so it
  // goes through award_tender() in tenders.sql: the function checks the buyer's
  // device key server-side and refuses to award a tender that is still open,
  // already awarded, or somebody else's.
  try {
    const res = await fetch(`${MZ_SUPABASE_URL}/rest/v1/rpc/award_tender`, {
      method: 'POST',
      headers: mzHeaders(),
      body: JSON.stringify({ p_tender: tenderId, p_owner_key: t.ownerKey, p_bid: bidId })
    });
    if (!res.ok) throw new Error(`Supabase responded ${res.status}`);
    return await res.json() === true;
  } catch (err) {
    console.warn('Award saved on this device only.', err);
    return false;
  }
}
