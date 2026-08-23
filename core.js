// ---- CORE -------------------------------------------------------------------
// The shared vocabulary of the app: the materials catalog, units, cities, and
// the bid maths. Every page loads this first so the board, the request form and
// the comparison table all agree on what a bid is actually worth.
//
// The rule everything else follows: suppliers are compared on LANDED COST —
// unit prices x quantity, plus delivery, minus discount, plus VAT — never on
// unit price alone. A cheap bag of cement with an expensive truck is not cheap.

const VAT_RATE = 0.15;           // KSA VAT
const CURRENCY = 'SAR';

// ---- catalog ----------------------------------------------------------------
// Bilingual on purpose: the buyer types the request in English, the supplier
// reading it on WhatsApp in Dammam thinks in Arabic. Both names are shown.
// units[0] is the default unit for that material.

const MATERIALS = [
  { key: 'cement',     en: 'Cement',              ar: 'أسمنت',            emoji: '🏭', units: ['bag', 'tonne', 'pallet'] },
  { key: 'readymix',   en: 'Ready-mix concrete',  ar: 'خرسانة جاهزة',     emoji: '🚛', units: ['m3'] },
  { key: 'rebar',      en: 'Rebar / steel bars',  ar: 'حديد تسليح',       emoji: '🔩', units: ['tonne', 'piece'] },
  { key: 'blocks',     en: 'Blocks',              ar: 'بلك',              emoji: '🧱', units: ['piece', 'pallet'] },
  { key: 'sand',       en: 'Sand',                ar: 'رمل',              emoji: '🏜️', units: ['m3', 'truck'] },
  { key: 'aggregate',  en: 'Aggregate / gravel',  ar: 'بحص',              emoji: '🪨', units: ['m3', 'truck'] },
  { key: 'gypsum',     en: 'Gypsum board',        ar: 'جبس بورد',         emoji: '⬜', units: ['sheet', 'm2'] },
  { key: 'tiles',      en: 'Tiles / ceramic',     ar: 'بلاط وسيراميك',    emoji: '🔲', units: ['m2', 'box'] },
  { key: 'paint',      en: 'Paint',               ar: 'دهانات',           emoji: '🎨', units: ['drum', 'm2'] },
  { key: 'timber',     en: 'Timber / formwork',   ar: 'خشب وشدة',         emoji: '🪵', units: ['sheet', 'piece'] },
  { key: 'insulation', en: 'Insulation',          ar: 'عوازل',            emoji: '🧊', units: ['m2', 'roll'] },
  { key: 'electrical', en: 'Electrical',          ar: 'مواد كهربائية',    emoji: '⚡', units: ['roll', 'piece', 'lot'] },
  { key: 'plumbing',   en: 'Plumbing / pipes',    ar: 'سباكة وأنابيب',    emoji: '🚰', units: ['piece', 'lm', 'lot'] },
  { key: 'steel',      en: 'Steel structure',     ar: 'هيكل حديدي',       emoji: '🏗️', units: ['tonne', 'piece'] },
  { key: 'openings',   en: 'Doors & windows',     ar: 'أبواب ونوافذ',     emoji: '🚪', units: ['piece', 'm2'] },
  { key: 'other',      en: 'Other',               ar: 'أخرى',             emoji: '📦', units: ['lot', 'piece'] }
];

const MATERIAL_BY_KEY = Object.fromEntries(MATERIALS.map(m => [m.key, m]));

const UNITS = {
  bag:    { en: 'bag (50 kg)', ar: 'كيس',   short: 'bag' },
  tonne:  { en: 'tonne',       ar: 'طن',    short: 'tn' },
  pallet: { en: 'pallet',      ar: 'طبلية', short: 'plt' },
  m3:     { en: 'cubic metre', ar: 'م³',    short: 'm³' },
  m2:     { en: 'square metre',ar: 'م²',    short: 'm²' },
  lm:     { en: 'linear metre',ar: 'متر طولي', short: 'lm' },
  piece:  { en: 'piece',       ar: 'حبة',   short: 'pc' },
  sheet:  { en: 'sheet',       ar: 'لوح',   short: 'sheet' },
  roll:   { en: 'roll',        ar: 'لفة',   short: 'roll' },
  box:    { en: 'box',         ar: 'صندوق', short: 'box' },
  drum:   { en: 'drum (20 L)', ar: 'برميل', short: 'drum' },
  truck:  { en: 'truckload',   ar: 'نقلة',  short: 'truck' },
  lot:    { en: 'lot',         ar: 'دفعة',  short: 'lot' }
};

const CITIES = ['Al Khobar', 'Dammam', 'Dhahran', 'Jubail', 'Qatif', 'Ras Tanura', 'Al Ahsa', 'Riyadh', 'Jeddah'];

// The stored value is always the English name (stable in the database);
// the Arabic name is display only.
const CITY_AR = {
  'Al Khobar': 'الخبر', 'Dammam': 'الدمام', 'Dhahran': 'الظهران',
  'Jubail': 'الجبيل', 'Qatif': 'القطيف', 'Ras Tanura': 'رأس تنورة',
  'Al Ahsa': 'الأحساء', 'Riyadh': 'الرياض', 'Jeddah': 'جدة', 'Other': 'أخرى'
};

function cityLabel(c) {
  return mzIsAr() && CITY_AR[c] ? CITY_AR[c] : c;
}

const PAYMENT_TERMS = ['advance', 'delivery', 'net30', 'net60', 'net90'];

function materialOf(key) {
  return MATERIAL_BY_KEY[key] || MATERIAL_BY_KEY.other;
}

function unitShort(key) {
  const u = UNITS[key] || UNITS.lot;
  return mzIsAr() ? u.ar : u.short;
}

function termsLabel(key) {
  return tr(PAYMENT_TERMS.includes(key) ? `terms.${key}` : 'terms.delivery');
}

// Material and unit names in the current language, with the other language as
// the secondary line where both are shown.
function matL(m)  { return mzIsAr() ? m.ar : m.en; }
function matL2(m) { return mzIsAr() ? m.en : m.ar; }
function unitLong(key) {
  const u = UNITS[key] || UNITS.lot;
  return mzIsAr() ? u.ar : u.en;
}

// ---- formatting -------------------------------------------------------------

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Money is shown whole for anything above 1,000 — nobody negotiates halalas on
// a 90,000 SAR concrete pour, but unit prices for a cement bag need the decimals.
function money(n) {
  if (n == null || !isFinite(n)) return '—';
  const dp = Math.abs(n) >= 1000 || Number.isInteger(n) ? 0 : 2;
  const num = n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return `${num} ${mzIsAr() ? 'ر.س' : CURRENCY}`;
}

function qtyText(n) {
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function mzLocale() {
  return mzIsAr() ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB';
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString(mzLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return `${d.toLocaleDateString(mzLocale(), { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString(mzLocale(), { hour: '2-digit', minute: '2-digit' })}`;
}

// "2d 4h left" — the pressure that makes suppliers actually answer.
function countdown(iso) {
  const ms = new Date(iso) - new Date();
  if (isNaN(ms)) return '';
  if (ms <= 0) return tr('cd.closed');
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (mzIsAr()) {
    if (days >= 1) return tr('cd.dh', { d: dayWord(days), h: hourWord(hours) });
    if (hours >= 1) return tr('cd.hm', { h: hourWord(hours), m: minWord(mins % 60) });
    return tr('cd.m', { m: minWord(mins) });
  }
  if (days >= 1) return tr('cd.dh', { d: days, h: hours });
  if (hours >= 1) return tr('cd.hm', { h: hours, m: mins % 60 });
  return tr('cd.m', { m: mins });
}

// ---- tender status ----------------------------------------------------------
// One source of truth, used by the board, the tender page and the share text.
// A tender closes on its own clock: after that, bids are opened and compared.

function tenderStatus(t) {
  if (t.awardedBidId) return { kind: 'awarded', label: tr('status.awarded'), short: tr('f.awarded') };
  const ms = new Date(t.closesAt) - new Date();
  if (isNaN(ms)) return { kind: 'open', label: tr('status.open'), short: tr('status.open') };
  if (ms <= 0) return { kind: 'closed', label: tr('status.closed'), short: tr('status.short.closed') };
  if (ms < 24 * 3600 * 1000) return { kind: 'closing', label: `${tr('status.closing')} · ${countdown(t.closesAt)}`, short: countdown(t.closesAt) };
  return { kind: 'open', label: `${tr('status.open')} · ${countdown(t.closesAt)}`, short: countdown(t.closesAt) };
}

function isSealed(t) {
  // Bids stay sealed until the closing time — nobody, buyer included, sees a
  // price before then. That is what stops the board from becoming a race to
  // undercut the last quote, and it is enforced in the database too.
  return new Date(t.closesAt) > new Date() && !t.awardedBidId;
}

// ---- bid maths --------------------------------------------------------------
// A bid prices some or all of the tender's lines. Partial bids are legitimate
// (a sand supplier will not quote your rebar) and are handled everywhere:
// they are never ranked against complete bids, but they do compete line by
// line in the split award below.

function lineUnitPrice(bid, i) {
  const v = bid.lines && bid.lines[i];
  const n = v == null || v === '' ? null : Number(v);
  return n == null || !isFinite(n) || n <= 0 ? null : n;
}

function lineTotal(tender, bid, i) {
  const p = lineUnitPrice(bid, i);
  return p == null ? null : p * Number(tender.items[i].qty || 0);
}

function bidCoverage(tender, bid) {
  const total = tender.items.length;
  let priced = 0;
  for (let i = 0; i < total; i++) if (lineUnitPrice(bid, i) != null) priced++;
  return { priced, total, complete: priced === total && total > 0 };
}

// Landed cost — the only number worth ranking on.
function bidTotals(tender, bid) {
  let goods = 0;
  for (let i = 0; i < tender.items.length; i++) goods += lineTotal(tender, bid, i) || 0;
  const delivery = Number(bid.deliveryFee) || 0;
  const discount = Number(bid.discount) || 0;
  const net = Math.max(0, goods + delivery - discount);
  const vat = net * VAT_RATE;
  return { goods, delivery, discount, net, vat, total: net + vat };
}

// Value score: cheapest is not always best when the crew is waiting on site.
// weight = how much price matters (0.5 balanced … 1 price only). Score is
// relative to the best bid on each axis, so 100 means "cheapest AND fastest".
function scoreBids(tender, bids, weight = 0.75) {
  const complete = bids.filter(b => bidCoverage(tender, b).complete);
  const pool = complete.length ? complete : bids;
  if (!pool.length) return [];
  const bestTotal = Math.min(...pool.map(b => bidTotals(tender, b).total));
  const bestLead = Math.min(...pool.map(b => Math.max(1, Number(b.leadDays) || 1)));
  return bids.map(b => {
    const totals = bidTotals(tender, b);
    const cov = bidCoverage(tender, b);
    const lead = Math.max(1, Number(b.leadDays) || 1);
    const priceScore = totals.total > 0 ? bestTotal / totals.total : 0;
    const speedScore = bestLead / lead;
    return {
      bid: b,
      totals,
      coverage: cov,
      lead,
      // Only complete bids are scored: a bid covering one line of three has a
      // smaller total for the obvious reason, and ranking it against the
      // others on that total would be nonsense. Partial bids compete in the
      // split award instead.
      score: cov.complete ? Math.round((weight * priceScore + (1 - weight) * speedScore) * 100) : null,
      deltaVsBest: cov.complete ? totals.total - bestTotal : null
    };
  }).sort((a, b) => {
    if (a.coverage.complete !== b.coverage.complete) return a.coverage.complete ? -1 : 1;
    if (a.score != null && b.score != null) return b.score - a.score;
    return a.totals.total - b.totals.total;   // partial bids: cheapest first
  });
}

// ---- split award ------------------------------------------------------------
// Where the real money is. Take the cheapest supplier for each line rather than
// one supplier for everything — then pay each chosen supplier's delivery once
// and check the split still wins after the extra trucks.

function splitAward(tender, bids) {
  if (!bids.length || !tender.items.length) return null;
  const picks = tender.items.map((item, i) => {
    let best = null;
    for (const b of bids) {
      const t = lineTotal(tender, b, i);
      if (t == null) continue;
      if (!best || t < best.lineTotal) best = { bid: b, unitPrice: lineUnitPrice(b, i), lineTotal: t };
    }
    return best ? { index: i, item, ...best } : { index: i, item, bid: null };
  });
  if (picks.some(p => !p.bid)) return null;   // some line nobody quoted

  const suppliers = [...new Set(picks.map(p => p.bid.id))]
    .map(id => bids.find(b => b.id === id));
  const goods = picks.reduce((s, p) => s + p.lineTotal, 0);
  const delivery = suppliers.reduce((s, b) => s + (Number(b.deliveryFee) || 0), 0);
  // Volume discounts were quoted against a full order; a split order does not
  // earn them, so they are deliberately not applied here.
  const net = goods + delivery;
  const total = net * (1 + VAT_RATE);

  const complete = bids.filter(b => bidCoverage(tender, b).complete);
  const singleBest = complete.length
    ? Math.min(...complete.map(b => bidTotals(tender, b).total))
    : null;

  return {
    picks, suppliers, goods, delivery, total,
    singleBest,
    savings: singleBest == null ? null : singleBest - total,
    // Two trucks from two yards is real work: flag when the gain is thin.
    worthIt: singleBest != null && singleBest - total > singleBest * 0.02
  };
}

// Median unit price actually bid for a material, across every open comparison
// on the board — a market check with no invented numbers behind it.
function marketMedian(materialKey, unit, allTenders, allBids) {
  const prices = [];
  for (const t of allTenders) {
    if (isSealed(t)) continue;               // sealed bids never leak into stats
    const tb = allBids.filter(b => b.tenderId === t.id);
    t.items.forEach((item, i) => {
      if (item.material !== materialKey || item.unit !== unit) return;
      for (const b of tb) {
        const p = lineUnitPrice(b, i);
        if (p != null) prices.push(p);
      }
    });
  }
  if (prices.length < 3) return null;        // too thin to mean anything
  prices.sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  return { median, samples: prices.length };
}

// ---- misc -------------------------------------------------------------------

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Human reference a foreman can read down the phone: RFQ-4821.
function makeRef() {
  return `RFQ-${Math.floor(1000 + Math.random() * 9000)}`;
}
