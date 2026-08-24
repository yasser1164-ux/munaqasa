// ---- ONE AUCTION ------------------------------------------------------------
// Two screens, decided only by the clock:
//   · LIVE   — the price to beat, the standings, the drop-by-drop history, and
//              (for a supplier) the form to go lower. Everything is public;
//              undercutting is the whole point.
//   · ENDED  — the lowest complete price won, automatically. Nobody picks.
// The page polls for new prices while an auction is live, because a live
// auction that only updates on reload is not live.

const TENDER_ID = new URLSearchParams(location.search).get('id');
const JUST_POSTED = new URLSearchParams(location.search).get('posted') === '1';

let T = null;
let BID_FORM_OPEN = false;   // supplier asked to (re)enter a price
let LAST_LIVE = null;        // last rendered live/ended state

// A supplier may drop their price as often as they like; only their latest
// price stands in the ranking. The earlier ones live on in the history.
function activeBids(t) {
  const byBidder = new Map();
  for (const b of mzBidsFor(t.id)) {
    const prev = byBidder.get(b.bidderKey);
    if (!prev || new Date(b.createdAt) > new Date(prev.createdAt)) byBidder.set(b.bidderKey, b);
  }
  return [...byBidder.values()];
}

function supplierName(b) {
  return b.supplierCompany || b.supplierName || (mzIsAr() ? 'مورد' : 'Supplier');
}

function tenderUrl(t) {
  return `${location.origin}${location.pathname}?id=${encodeURIComponent(t.id)}`;
}

function shareText(t) {
  const lines = t.items.map(i =>
    `• ${qtyText(i.qty)} ${unitShort(i.unit)} — ${matL(materialOf(i.material))}${i.spec ? ` (${i.spec})` : ''}`).join('\n');
  return tr('share.text', {
    ref: t.ref, title: t.title, city: cityLabel(t.city),
    d: fmtDate(t.neededBy), lines, t: fmtDateTime(t.closesAt)
  });
}

function shareBlock(t) {
  const url = tenderUrl(t);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${shareText(t)}\n${url}`)}`;
  const offline = !MZ_ONLINE ? `<p class="hint">${tr('share.offline')}</p>` : '';
  return `<div class="card">
    <h2>${tr('share.h')}</h2>
    <p>${tr('share.d')}</p>
    <div class="btn-row" style="margin-top:0">
      <a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">${tr('share.wa')}</a>
      <button class="btn btn-ghost" id="copy-link" data-url="${esc(url)}">${tr('share.copy')}</button>
    </div>
    ${offline}
  </div>`;
}

// ---- head + items -----------------------------------------------------------

function renderHead() {
  const st = tenderStatus(T);
  const bids = activeBids(T);
  const winner = isLive(T) ? null : leadingBid(T, bids);
  const bidFact = winner
    ? esc(supplierName(winner.bid))
    : String(mzBidderCount(T));

  document.getElementById('head').innerHTML = `
    <div class="head-row">
      <h1 dir="auto">${esc(T.title)}</h1>
      <span class="badge ${st.kind}">${esc(st.label)}</span>
      ${mzIsMine(T) ? `<span class="badge mine">${tr('badge.yourReq')}</span>` : ''}
    </div>
    <p class="sub">${esc(T.ref)} · ${esc(cityLabel(T.city))}${(T.buyerCompany || T.buyerName) ? ` · ${tr('postedBy', { c: `<bdi>${esc(T.buyerCompany || T.buyerName)}</bdi>` })}` : ''}</p>
    <div class="facts">
      <div class="fact"><b>${tr('fact.needed')}</b><span>${fmtDate(T.neededBy)}</span></div>
      <div class="fact"><b>${tr('fact.closes')}</b><span>${fmtDateTime(T.closesAt)}</span></div>
      <div class="fact"><b>${winner ? tr('fact.won') : tr('fact.bids')}</b><span>${bidFact}</span></div>
      ${T.site ? `<div class="fact"><b>${tr('fact.site')}</b><span style="font-size:13px;font-weight:600">${esc(T.site)}</span></div>` : ''}
    </div>`;
}

function renderItems() {
  const rows = T.items.map((i) => {
    const m = materialOf(i.material);
    const mk = marketMedian(i.material, i.unit, MZ_BOARD.tenders, MZ_BOARD.bids);
    return `<tr>
      <td>
        <b>${esc(matL(m))}</b> <span style="color:var(--muted)">${esc(matL2(m))}</span>
        ${i.spec ? `<div class="spec">${esc(i.spec)}</div>` : ''}
        ${mk ? `<div class="market">${tr('market', { p: money(mk.median), u: esc(unitShort(i.unit)), bids: bidsWord(mk.samples) })}</div>` : ''}
      </td>
      <td class="num">${qtyText(i.qty)}</td>
      <td>${esc(unitLong(i.unit))}</td>
    </tr>`;
  }).join('');

  document.getElementById('items').innerHTML = `
  ${T.notes ? `<div class="card"><h2>${tr('cond.h')}</h2><p style="margin:0">${esc(T.notes)}</p></div>` : ''}
  <div class="card">
    <h2>${tr('buy.h')}</h2>
    <p>${tr('buy.d', { lines: linesWord(T.items.length) })}</p>
    <div class="scroll-x"><table>
      <thead><tr><th>${tr('th.material')}</th><th class="num">${tr('th.qty')}</th><th>${tr('th.unit')}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

// ---- the live ticker --------------------------------------------------------

let LAST_TICKER = null;   // last shown price, to flash when it drops live

function tickerHtml(bids) {
  const best = leadingBid(T, bids);
  if (!best) {
    return `<div class="ticker empty">
      <div class="ticker-label">${tr('live.none')}</div>
      <p>${tr('live.noneHint')}</p>
    </div>`;
  }
  const mine = best.bid.bidderKey === mzMe().key;
  const dropped = LAST_TICKER != null && best.totals.total < LAST_TICKER;
  LAST_TICKER = best.totals.total;
  return `<div class="ticker${dropped ? ' just-dropped' : ''}">
    <div class="ticker-label">${tr('live.lowest')} <span class="pulse">● ${tr('live.updating')}</span></div>
    <div class="ticker-price">${moneyHtml(best.totals.total)}</div>
    <div class="ticker-who">${tr('live.from', { s: `<bdi>${esc(supplierName(best.bid))}</bdi>` })}${mine ? ` — ${tr('live.youLead')}` : ''}</div>
    <div class="ticker-clock ${tenderStatus(T).kind}">${countdown(T.closesAt)}</div>
  </div>`;
}

function standingsHtml(bids, opts = {}) {
  const ranked = rankBids(T, bids);
  const me = mzMe();
  const rows = ranked.map((r, n) => {
    const b = r.bid;
    const first = n === 0 && r.coverage.complete;
    const isMine = b.bidderKey === me.key;
    return `<tr class="${first ? 'winner' : ''} ${r.coverage.complete ? '' : 'partial'}">
      <td><span class="rank ${first ? 'first' : ''}">${n + 1}</span></td>
      <td class="who">
        <b><bdi>${esc(supplierName(b))}</bdi>${isMine ? ` <span class="you">${tr('live.myPrice')}</span>` : ''}</b>
        <span>${r.coverage.complete ? tr('cmp.allLines') : tr('cmp.someLines', { a: r.coverage.priced, b: r.coverage.total })}${b.notes ? ` · ${tr('cmp.seeNote')}` : ''}</span>
      </td>
      <td class="num">${r.coverage.complete
        ? `<b>${money(r.totals.total)}</b>`
        : `${money(r.totals.total)}<div class="spec">${tr('cmp.partialTotal')}</div>`}</td>
      <td class="num">${tr('d.short', { n: esc(r.lead) })}</td>
      <td>${esc(termsLabel(b.terms))}</td>
    </tr>`;
  }).join('');

  const notes = ranked.filter(r => r.bid.notes).map(r =>
    `<p class="hint"><b><bdi>${esc(supplierName(r.bid))}</bdi>:</b> ${esc(r.bid.notes)}</p>`).join('');

  return `<div class="card">
    <h2>${opts.final ? tr('cmp.h') : tr('live.standings')}</h2>
    <p>${opts.final ? tr('cmp.d', { p: Math.round(VAT_RATE * 100) }) : tr('live.rule')}</p>
    <div class="scroll-x"><table class="cmp">
      <thead><tr>
        <th>#</th><th>${tr('th.supplier')}</th><th class="num">${tr('th.landed')}</th>
        <th class="num">${tr('th.lead')}</th><th>${tr('th.terms')}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    ${notes}
  </div>`;
}

// The drop-by-drop story: "opened at 51,000 … dropped to 48,300 an hour later".
function historyHtml(all) {
  const hist = bidHistory(T, all);
  if (hist.length < 2) return '';
  const seen = new Set();
  const rows = hist.slice(0, 12).map(h => {
    const firstFromThem = !seen.has(h.bid.bidderKey);
    seen.add(h.bid.bidderKey);
    // walking newest-first, the LAST row we see from a bidder is their opening price
    return `<li>
      <span class="h-price">${money(h.totals.total)}</span>
      <span class="h-who">${esc(supplierName(h.bid))}</span>
      <span class="h-when">${fmtDateTime(h.bid.createdAt)}</span>
    </li>`;
  }).join('');
  return `<div class="card">
    <h2>${tr('live.history')}</h2>
    <p>${tr('live.historyD')}</p>
    <ul class="history">${rows}</ul>
  </div>`;
}

// ---- supplier: place or drop a price ----------------------------------------

function bidFormHtml(existing, bids) {
  const me = mzMe();
  const best = leadingBid(T, bids);
  const iLead = best && best.bid.bidderKey === me.key;
  const target = !best ? tr('live.first')
    : iLead ? tr('live.youLead')
    : tr('live.beat', { p: money(best.totals.total) });   // target line

  const lines = T.items.map((i, n) => {
    const m = materialOf(i.material);
    const val = existing && existing.lines[n] != null ? existing.lines[n] : '';
    return `<div class="bidline">
      <div class="what">
        <b>${esc(matL(m))}</b>
        <div class="spec">${qtyText(i.qty)} ${esc(unitShort(i.unit))}${i.spec ? ` · ${esc(i.spec)}` : ''}</div>
      </div>
      <div>
        <input class="b-line" data-i="${n}" type="number" min="0" step="any" inputmode="decimal"
               value="${esc(val)}" placeholder="${esc(tr('bid.priceph', { u: unitShort(i.unit) }))}" />
        <div class="linesum" id="sum-${n}"></div>
      </div>
    </div>`;
  }).join('');

  return `<div class="card">
    <h2>${existing ? tr('live.lowerBtn') : tr('bid.h.new')}</h2>
    <p class="target">${target}</p>
    <p>${tr('bid.d')}</p>
    ${lines}
    <div class="grid3" style="margin-top:16px">
      <label class="field"><span>${tr('bid.delivery')}</span>
        <input id="b-delivery" type="number" min="0" step="any" inputmode="decimal" value="${existing ? esc(existing.deliveryFee || 0) : ''}" placeholder="0" /></label>
      <label class="field"><span>${tr('bid.lead')}</span>
        <input id="b-lead" type="number" min="1" step="1" inputmode="numeric" value="${existing ? esc(existing.leadDays) : '3'}" /></label>
      <label class="field"><span>${tr('bid.terms')}</span>
        <select id="b-terms">${PAYMENT_TERMS.map(k =>
          `<option value="${k}" ${existing && existing.terms === k ? 'selected' : ''}>${esc(termsLabel(k))}</option>`).join('')}</select></label>
    </div>
    <div class="totals" id="b-totals"></div>
    <div class="grid2" style="margin-top:16px">
      <label class="field"><span>${tr('bid.who')}</span><input id="b-name" maxlength="80" value="${esc(me.company || me.name)}" placeholder="${esc(tr('bid.company.ph'))}" /></label>
      <label class="field"><span>${tr('bid.phone')}</span><input id="b-phone" type="tel" maxlength="24" value="${esc(me.phone)}" placeholder="05xxxxxxxx" /></label>
    </div>
    <label class="field"><span>${tr('bid.notes')}</span>
      <textarea id="b-notes" maxlength="400" placeholder="${esc(tr('bid.notes.ph'))}">${existing ? esc(existing.notes || '') : ''}</textarea></label>
    <p class="err" id="bid-err" hidden></p>
    <div class="btn-row" style="margin-top:6px">
      <button class="btn btn-lg" id="bid-submit">${existing ? tr('live.lowerBtn') : tr('bid.send')}</button>
    </div>
    <p class="hint">${tr('bid.sealedHint', { t: fmtDateTime(T.closesAt) })}</p>
  </div>`;
}

function readBidDraft() {
  return {
    lines: T.items.map((_, i) => {
      const el = document.querySelector(`.b-line[data-i="${i}"]`);
      const v = el ? el.value.trim() : '';
      return v === '' ? null : Number(v);
    }),
    deliveryFee: Number(document.getElementById('b-delivery').value) || 0,
    discount: 0,
    leadDays: Number(document.getElementById('b-lead').value) || 1,
    validityDays: 14,
    terms: document.getElementById('b-terms').value
  };
}

function refreshBidTotals() {
  const draft = readBidDraft();
  T.items.forEach((item, i) => {
    const el = document.getElementById(`sum-${i}`);
    const t = lineTotal(T, draft, i);
    el.textContent = t == null ? tr('bid.notQuoted') : `${qtyText(item.qty)} × ${money(lineUnitPrice(draft, i))} = ${money(t)}`;
  });
  const tot = bidTotals(T, draft);
  const cov = bidCoverage(T, draft);
  document.getElementById('b-totals').innerHTML = `
    <div><span>${tr('tot.goods', { a: cov.priced, b: cov.total })}</span><span>${money(tot.goods)}</span></div>
    <div><span>${tr('tot.delivery')}</span><span>${money(tot.delivery)}</span></div>
    <div><span>${tr('tot.vat', { p: Math.round(VAT_RATE * 100) })}</span><span>${money(tot.vat)}</span></div>
    <div class="grand"><span>${tr('tot.landed')}</span><span>${money(tot.total)}</span></div>`;
}

function wireBidForm(existing) {
  document.querySelectorAll('.b-line, #b-delivery, #b-discount').forEach(el =>
    el.addEventListener('input', refreshBidTotals));
  refreshBidTotals();

  document.getElementById('bid-submit').addEventListener('click', async () => {
    const err = document.getElementById('bid-err');
    err.hidden = true;
    const draft = readBidDraft();
    const cov = bidCoverage(T, draft);
    if (!cov.priced) {
      err.textContent = tr('bid.err.noline');
      err.hidden = false;
      return;
    }
    const who = document.getElementById('b-name').value.trim();
    if (!who) {
      err.textContent = tr('bid.err.who');
      err.hidden = false;
      return;
    }
    // In an auction you go down, never up: a "revision" that raises your own
    // standing price would just be noise on the board.
    if (existing) {
      const now = bidTotals(T, draft).total;
      const before = bidTotals(T, existing).total;
      if (now >= before) {
        err.textContent = tr('bid.errHigher', { p: money(before) });
        err.hidden = false;
        return;
      }
    }
    const btn = document.getElementById('bid-submit');
    btn.disabled = true;
    btn.textContent = tr('bid.sending');

    mzSaveMe({ name: who, company: who, phone: document.getElementById('b-phone').value.trim() });
    await mzCreateBid({
      tenderId: T.id, ...draft,
      supplierName: who, supplierCompany: who,
      supplierPhone: document.getElementById('b-phone').value.trim(),
      notes: document.getElementById('b-notes').value.trim()
    });
    BID_FORM_OPEN = false;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function myStandingHtml(bid, bids) {
  const ranked = rankBids(T, bids);
  const pos = ranked.findIndex(r => r.bid.id === bid.id) + 1;
  const best = leadingBid(T, bids);
  const iLead = best && best.bid.id === bid.id;
  const tot = bidTotals(T, bid);
  return `<div class="card mystanding">
    <h2>${iLead ? tr('live.youLead') : tr('live.youAre', { n: pos, p: money(best ? best.totals.total : 0) })}</h2>
    <div class="totals">
      <div><span>${tr('live.myPrice')}</span><span>${money(tot.total)}</span></div>
      <div><span>${tr('my.lead')}</span><span>${tr('my.leadVal', { n: dayWord(Number(bid.leadDays) || 1), t: esc(termsLabel(bid.terms)) })}</span></div>
    </div>
    <div class="btn-row"><button class="btn" id="revise">${tr('live.lowerBtn')}</button></div>
  </div>`;
}

// ---- line-by-line + split award (information, either way) -------------------

function splitHtml(bids) {
  const s = splitAward(T, bids);
  // Only worth showing when it changes the decision: real savings, or no
  // single supplier covered everything. Otherwise it is just another table.
  if (!s || (s.savings != null && !s.worthIt)) return '';
  const picks = s.picks.map(p => {
    const m = materialOf(p.item.material);
    return `<tr>
      <td><b>${esc(matL(m))}</b><div class="spec">${qtyText(p.item.qty)} ${esc(unitShort(p.item.unit))}</div></td>
      <td><bdi>${esc(supplierName(p.bid))}</bdi></td>
      <td class="num">${money(p.unitPrice)}</td>
      <td class="num">${money(p.lineTotal)}</td>
    </tr>`;
  }).join('');

  const verdict = s.savings == null
    ? `<p class="hint">${tr('split.none')}</p>`
    : s.worthIt
      ? `<div class="save">${tr('split.save', { p: money(s.savings) })}</div>
         <p class="hint">${tr('split.save.d', { p: money(s.singleBest), n: esc(s.suppliers.length), d: money(s.delivery) })}</p>`
      : `<div class="save thin">${s.savings > 0 ? tr('split.thin.pos', { p: money(s.savings) }) : tr('split.thin.neg', { p: money(-s.savings) })}</div>
         <p class="hint">${tr('split.thin.d', { n: esc(s.suppliers.length) })}</p>`;

  return `<div class="split">
    <h3>${tr('split.h')}</h3>
    ${verdict}
    <div class="scroll-x" style="margin-top:10px"><table>
      <thead><tr><th>${tr('th.material')}</th><th>${tr('split.buyFrom')}</th><th class="num">${tr('split.unit')}</th><th class="num">${tr('split.lineTotal')}</th></tr></thead>
      <tbody>${picks}</tbody>
      <tfoot><tr>
        <td colspan="3"><b>${tr('split.total', { n: esc(s.suppliers.length) })}</b></td>
        <td class="num"><b>${money(s.total)}</b></td>
      </tr></tfoot>
    </table></div>
  </div>`;
}

// ---- the two screens --------------------------------------------------------

function renderAction() {
  const el = document.getElementById('action');
  const all = mzBidsFor(T.id);
  const bids = activeBids(T);
  const mine = mzIsMine(T);

  const slot = document.getElementById('ticker-slot');

  if (isLive(T)) {
    const my = mzMyBid(T.id);
    const showForm = !mine && (BID_FORM_OPEN || !my);
    slot.innerHTML = tickerHtml(bids);
    el.innerHTML =
      (!mine && my && !BID_FORM_OPEN ? myStandingHtml(my, bids) : '') +
      (showForm ? bidFormHtml(my, bids) : '') +
      (bids.length ? standingsHtml(bids) : '') +
      historyHtml(all) +
      (mine ? shareBlock(T) : '');

    if (showForm) wireBidForm(my);
    const revise = document.getElementById('revise');
    if (revise) revise.addEventListener('click', () => { BID_FORM_OPEN = true; renderAction(); });
    return;
  }

  // The clock stopped: the lowest complete price won, on its own. The winner
  // gets the same hero treatment the live price had — it is the same number,
  // one tick later.
  const winner = leadingBid(T, bids);
  const iWon = winner && winner.bid.bidderKey === mzMe().key;
  let banner;
  if (!winner) {
    banner = `<div class="empty">${tr('win.none')}</div>`;
  } else {
    const wa = winner.bid.supplierPhone
      ? `<div class="btn-row" style="justify-content:center"><a class="btn" href="https://wa.me/${esc(winner.bid.supplierPhone.replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener">${tr('aw.msg')}</a></div>`
      : '';
    banner = `<div class="ticker won">
      ${iWon ? `<div class="ticker-label" style="color:var(--accent)">${tr('win.youWon')}</div>` : ''}
      <div class="ticker-label">${tr('win.label')}</div>
      <div class="ticker-price">${moneyHtml(winner.totals.total)}</div>
      <div class="ticker-who"><b><bdi>${esc(supplierName(winner.bid))}</bdi></b> · ${tr('win.detail', { d: dayWord(Number(winner.bid.leadDays) || 1), t: esc(termsLabel(winner.bid.terms)) })}</div>
      ${wa}
    </div>`;
  }

  slot.innerHTML = banner;
  el.innerHTML =
    (bids.length ? standingsHtml(bids, { final: true }) : '') +
    (bids.length > 1 ? splitHtml(bids) : '') +
    historyHtml(all);
}

function renderDemoNote() {
  if (!T || !T.demo) return '';
  return `<p class="hint demo-note"><span class="demo-tag">${tr('demo.tag')}</span> ${tr('demo.note')}</p>`;
}

function renderPosted() {
  if (!JUST_POSTED || !mzIsMine(T)) return;
  document.getElementById('posted-panel').innerHTML =
    `<div class="awarded-note">${tr('posted.live', { ref: esc(T.ref), t: fmtDateTime(T.closesAt) })}</div>`;
}

function render() {
  LAST_LIVE = T ? isLive(T) : null;
  if (!T) {
    document.getElementById('head').innerHTML =
      `<div class="empty">${tr('notFound')}
       <br><br><a class="btn" href="index.html">${tr('notFound.back')}</a></div>`;
    return;
  }
  document.title = `${T.ref} — ${T.title} · ${mzIsAr() ? 'مناقصة' : 'Munaqasa'}`;
  renderPosted();
  renderHead();
  document.getElementById('head').insertAdjacentHTML('afterbegin', renderDemoNote());
  renderItems();
  renderAction();
}

// The language toggle re-renders; a half-typed price is snapshotted and put
// back, so switching language never costs a supplier their numbers.
window.onLangChange = () => {
  if (!T) { render(); return; }
  const hadForm = !!document.querySelector('.b-line');
  const snap = hadForm ? {
    draft: readBidDraft(),
    name: document.getElementById('b-name').value,
    phone: document.getElementById('b-phone').value,
    notes: document.getElementById('b-notes').value
  } : null;
  if (hadForm) BID_FORM_OPEN = true;
  render();
  if (snap && document.querySelector('.b-line')) restoreDraft(snap);
};

function restoreDraft(snap) {
  snap.draft.lines.forEach((v, i) => {
    const el = document.querySelector(`.b-line[data-i="${i}"]`);
    if (el) el.value = v == null ? '' : v;
  });
  document.getElementById('b-delivery').value = snap.draft.deliveryFee || '';
  document.getElementById('b-lead').value = snap.draft.leadDays;
  document.getElementById('b-terms').value = snap.draft.terms;
  document.getElementById('b-name').value = snap.name;
  document.getElementById('b-phone').value = snap.phone;
  document.getElementById('b-notes').value = snap.notes;
  refreshBidTotals();
}

document.addEventListener('click', e => {
  const btn = e.target.closest('#copy-link');
  if (!btn) return;
  navigator.clipboard.writeText(btn.dataset.url).then(() => {
    btn.textContent = tr('share.copied');
    setTimeout(() => { btn.textContent = tr('share.copy'); }, 1600);
  }).catch(() => { prompt(tr('share.copyPrompt'), btn.dataset.url); });
});

mzLoadBoard().then(() => {
  T = mzTender(TENDER_ID);
  render();
});

// A live auction has to move on its own: pull new prices every 20 seconds, and
// re-render the moment the clock runs out. A supplier mid-price keeps their
// typing — only the parts around the form are refreshed.
setInterval(async () => {
  if (!T) return;
  const typing = !!document.querySelector('.b-line');
  if (isLive(T)) await mzRefresh();
  T = mzTender(TENDER_ID) || T;
  if (isLive(T) !== LAST_LIVE) { render(); return; }
  if (typing) { renderHead(); return; }   // never blow away a half-entered price
  render();
}, 20000);
