// ---- THE BOARD --------------------------------------------------------------
// Every request in one grid: what is open for bidding, what has closed and is
// being compared, what has been awarded. Suppliers browse it; buyers find
// their own requests at the top under "Your activity". All text renders
// through tr() (i18n.js), so the language toggle re-renders the whole board.

let LIST_STATUS = 'all';
let LIST_MAT = 'all';
let LIST_Q = '';

const STATUS_FILTERS = [
  { key: 'all', label: 'f.all' },
  { key: 'live', label: 'f.live' },
  { key: 'closing', label: 'f.closing' },
  { key: 'ended', label: 'f.ended' }
];

// Only a supplier's latest price counts in the standings — the earlier ones
// are history, not competing offers.
function activeBidsOf(tenderId) {
  const byBidder = new Map();
  for (const b of mzBidsFor(tenderId)) {
    const prev = byBidder.get(b.bidderKey);
    if (!prev || new Date(b.createdAt) > new Date(prev.createdAt)) byBidder.set(b.bidderKey, b);
  }
  return [...byBidder.values()];
}

function supplierName(b) {
  return b.supplierCompany || b.supplierName || (mzIsAr() ? 'مورد' : 'Supplier');
}

function tenderCard(t) {
  const st = tenderStatus(t);
  const mats = [...new Set(t.items.map(i => i.material))].map(k => {
    const m = materialOf(k);
    return `<span class="mtag">${m.emoji} ${esc(matL(m))}</span>`;
  }).join('');

  // A live auction advertises the price to beat; a finished one, its winner.
  const bids = activeBidsOf(t.id);
  const best = leadingBid(t, bids);
  let bidLine;
  if (!isLive(t)) {
    bidLine = best
      ? `<span class="bidcount">${tr('card.winner', { s: esc(supplierName(best.bid)), p: money(best.totals.total) })}</span>`
      : `<span class="bidcount">${tr('card.noBids')}</span>`;
  } else if (best) {
    bidLine = `<span class="bidcount">${tr('card.best', { bids: bidsWord(bids.length), p: money(best.totals.total) })}</span>`;
  } else {
    bidLine = `<span class="bidcount">${tr('card.noBids')}</span>`;
  }

  const qty = t.items.map(i => `${qtyText(i.qty)} ${unitShort(i.unit)}`).join(' · ');
  const mine = mzIsMine(t) ? `<span class="badge mine">${tr('badge.yours')}</span>` : '';

  return `<a class="tcard" href="tender.html?id=${encodeURIComponent(t.id)}">
    <div class="ref">${esc(t.ref)} · ${esc(cityLabel(t.city))}</div>
    <h3>${esc(t.title)}</h3>
    <div class="mats">${mats}</div>
    <div class="meta">${esc(qty)}<br>${tr('card.neededBy', { d: fmtDate(t.neededBy) })}</div>
    <div class="foot">
      <span class="badge ${st.kind}">${esc(st.label)}</span>
      ${mine}
      ${bidLine}
    </div>
  </a>`;
}

function matchesFilters(t) {
  const st = tenderStatus(t).kind;
  if (LIST_STATUS !== 'all' && st !== LIST_STATUS) return false;
  if (LIST_MAT !== 'all' && !t.items.some(i => i.material === LIST_MAT)) return false;
  if (LIST_Q) {
    const hay = [
      t.title, t.ref, t.city, cityLabel(t.city), t.site, t.notes,
      ...t.items.map(i => `${materialOf(i.material).en} ${materialOf(i.material).ar} ${i.spec || ''}`)
    ].join(' ').toLowerCase();
    if (!hay.includes(LIST_Q)) return false;
  }
  return true;
}

function renderChips() {
  document.getElementById('status-chips').innerHTML = STATUS_FILTERS.map(f =>
    `<button class="chip ${LIST_STATUS === f.key ? 'active' : ''}" data-status="${f.key}">${esc(tr(f.label))}</button>`
  ).join('');

  // Only materials somebody is actually asking for get a chip.
  const present = MATERIALS.filter(m => MZ_BOARD.tenders.some(t => t.items.some(i => i.material === m.key)));
  document.getElementById('mat-chips').innerHTML =
    `<button class="chip ${LIST_MAT === 'all' ? 'active' : ''}" data-mat="all">${tr('f.allmats')}</button>` +
    present.map(m => `<button class="chip ${LIST_MAT === m.key ? 'active' : ''}" data-mat="${m.key}">${m.emoji} ${esc(matL(m))}</button>`).join('');
}

function renderBoard() {
  const list = MZ_BOARD.tenders.filter(matchesFilters);
  document.getElementById('board-list').innerHTML = list.map(tenderCard).join('');
  document.getElementById('board-empty').hidden = list.length > 0;
  document.getElementById('board-count').textContent =
    tr('count.of', { a: list.length, b: MZ_BOARD.tenders.length });
}

function renderMine() {
  const me = mzMe();
  const mine = MZ_BOARD.tenders.filter(t => mzIsMine(t));
  const bidOn = MZ_BOARD.tenders.filter(t =>
    !mzIsMine(t) && MZ_BOARD.bids.some(b => b.tenderId === t.id && b.bidderKey === me.key));
  const all = [...mine, ...bidOn];
  document.getElementById('mine').hidden = all.length === 0;
  if (!all.length) return;
  document.getElementById('mine-note').textContent =
    tr('mine.note', { a: mine.length, b: bidOn.length });
  document.getElementById('mine-board').innerHTML = all.map(tenderCard).join('');
}

function render() {
  renderChips();
  renderMine();
  renderBoard();
}

document.getElementById('status-chips').addEventListener('click', e => {
  const b = e.target.closest('[data-status]');
  if (!b) return;
  LIST_STATUS = b.dataset.status;
  render();
});

document.getElementById('mat-chips').addEventListener('click', e => {
  const b = e.target.closest('[data-mat]');
  if (!b) return;
  LIST_MAT = b.dataset.mat;
  render();
});

document.getElementById('q').addEventListener('input', e => {
  LIST_Q = e.target.value.trim().toLowerCase();
  renderBoard();
});

window.onLangChange = () => { if (MZ_BOARD.loaded) render(); };

mzLoadBoard().then(render);

// The board is a live board: countdowns tick and prices move without a reload.
setInterval(async () => {
  if (!MZ_BOARD.loaded) return;
  if (MZ_BOARD.tenders.some(isLive)) await mzRefresh();
  render();
}, 30000);
