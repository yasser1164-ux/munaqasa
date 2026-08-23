// ---- ONE REQUEST ------------------------------------------------------------
// Three screens in one, decided by who is looking and what the clock says:
//   · the buyer, while bidding is open  → how many sealed bids are in, and the
//     link to send suppliers;
//   · a supplier, while bidding is open → the bid form (and their own bid back);
//   · everyone, after the closing time  → every bid opened at once, ranked on
//     landed cost, with the line-by-line split award underneath.
// All text renders through tr() (i18n.js); the language toggle re-renders the
// page, preserving anything half-typed into the bid form.

const TENDER_ID = new URLSearchParams(location.search).get('id');
const JUST_POSTED = new URLSearchParams(location.search).get('posted') === '1';

let T = null;
let WEIGHT = 0.75;          // price vs speed in the value score
let BID_DRAFT_SHOWN = false;
let LAST_SEALED = null;     // last rendered sealed/open state, for the ticker below

// A supplier may revise their price before the close; only their latest bid
// counts, so earlier drafts never inflate the count or the comparison.
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

// The message that actually gets pasted into a supplier WhatsApp group.
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
  const bidFact = T.awardedBidId ? tr('fact.awarded')
    : isSealed(T) ? tr('fact.sealed', { n: mzSealedCount(T) })
    : tr('fact.opened', { n: bids.length });

  document.getElementById('head').innerHTML = `
    <div class="head-row">
      <h1>${esc(T.title)}</h1>
      <span class="badge ${st.kind}">${esc(st.label)}</span>
      ${mzIsMine(T) ? `<span class="badge mine">${tr('badge.yourReq')}</span>` : ''}
    </div>
    <p class="sub">${esc(T.ref)} · ${esc(cityLabel(T.city))}${T.buyerCompany ? ` · ${tr('postedBy', { c: esc(T.buyerCompany) })}` : ''}</p>
    <div class="facts">
      <div class="fact"><b>${tr('fact.needed')}</b><span>${fmtDate(T.neededBy)}</span></div>
      <div class="fact"><b>${tr('fact.closes')}</b><span>${fmtDateTime(T.closesAt)}</span></div>
      <div class="fact"><b>${tr('fact.bids')}</b><span>${esc(bidFact)}</span></div>
      ${T.site ? `<div class="fact"><b>${tr('fact.site')}</b><span style="font-size:13px;font-weight:600">${esc(T.site)}</span></div>` : ''}
    </div>
    ${T.notes ? `<div class="card"><h2>${tr('cond.h')}</h2><p style="margin:0">${esc(T.notes)}</p></div>` : ''}`;
}

function renderItems() {
  const rows = T.items.map((i, n) => {
    const m = materialOf(i.material);
    const mk = marketMedian(i.material, i.unit, MZ_BOARD.tenders, MZ_BOARD.bids);
    return `<tr>
      <td>
        <b>${m.emoji} ${esc(matL(m))}</b> <span style="color:var(--muted)">${esc(matL2(m))}</span>
        ${i.spec ? `<div class="spec">${esc(i.spec)}</div>` : ''}
        ${mk ? `<div class="market">${tr('market', { p: money(mk.median), u: esc(unitShort(i.unit)), bids: bidsWord(mk.samples) })}</div>` : ''}
      </td>
      <td class="num">${qtyText(i.qty)}</td>
      <td>${esc(unitLong(i.unit))}</td>
    </tr>`;
  }).join('');

  document.getElementById('items').innerHTML = `<div class="card">
    <h2>${tr('buy.h')}</h2>
    <p>${tr('buy.d', { lines: linesWord(T.items.length) })}</p>
    <div class="scroll-x"><table>
      <thead><tr><th>${tr('th.material')}</th><th class="num">${tr('th.qty')}</th><th>${tr('th.unit')}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

// ---- supplier: the bid form -------------------------------------------------

function bidFormHtml(existing) {
  const me = mzMe();
  const lines = T.items.map((i, n) => {
    const m = materialOf(i.material);
    const val = existing && existing.lines[n] != null ? existing.lines[n] : '';
    return `<div class="bidline">
      <div class="what">
        <b>${m.emoji} ${esc(matL(m))}</b>
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
    <h2>${existing ? tr('bid.h.rev') : tr('bid.h.new')}</h2>
    <p>${tr('bid.d')}</p>
    ${lines}
    <div class="grid2" style="margin-top:16px">
      <label class="field"><span>${tr('bid.delivery')}</span>
        <input id="b-delivery" type="number" min="0" step="any" inputmode="decimal" value="${existing ? esc(existing.deliveryFee || 0) : ''}" placeholder="0" /></label>
      <label class="field"><span>${tr('bid.discount')}</span>
        <input id="b-discount" type="number" min="0" step="any" inputmode="decimal" value="${existing ? esc(existing.discount || 0) : ''}" placeholder="0" /></label>
    </div>
    <div class="grid3">
      <label class="field"><span>${tr('bid.lead')}</span>
        <input id="b-lead" type="number" min="1" step="1" inputmode="numeric" value="${existing ? esc(existing.leadDays) : '3'}" /></label>
      <label class="field"><span>${tr('bid.valid')}</span>
        <input id="b-validity" type="number" min="1" step="1" inputmode="numeric" value="${existing ? esc(existing.validityDays) : '14'}" /></label>
      <label class="field"><span>${tr('bid.terms')}</span>
        <select id="b-terms">${PAYMENT_TERMS.map(k =>
          `<option value="${k}" ${existing && existing.terms === k ? 'selected' : ''}>${esc(termsLabel(k))}</option>`).join('')}</select></label>
    </div>
    <div class="totals" id="b-totals"></div>
    <div class="grid3" style="margin-top:16px">
      <label class="field"><span>${tr('bid.name')}</span><input id="b-name" maxlength="60" value="${esc(me.name)}" placeholder="${esc(tr('bid.name.ph'))}" /></label>
      <label class="field"><span>${tr('bid.company')}</span><input id="b-company" maxlength="80" value="${esc(me.company)}" placeholder="${esc(tr('bid.company.ph'))}" /></label>
      <label class="field"><span>${tr('bid.phone')}</span><input id="b-phone" type="tel" maxlength="24" value="${esc(me.phone)}" placeholder="05xxxxxxxx" /></label>
    </div>
    <label class="field"><span>${tr('bid.notes')}</span>
      <textarea id="b-notes" maxlength="400" placeholder="${esc(tr('bid.notes.ph'))}">${existing ? esc(existing.notes || '') : ''}</textarea></label>
    <p class="err" id="bid-err" hidden></p>
    <div class="btn-row" style="margin-top:6px">
      <button class="btn btn-lg" id="bid-submit">${existing ? tr('bid.sendRev') : tr('bid.send')}</button>
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
    discount: Number(document.getElementById('b-discount').value) || 0,
    leadDays: Number(document.getElementById('b-lead').value) || 1,
    validityDays: Number(document.getElementById('b-validity').value) || 14,
    terms: document.getElementById('b-terms').value
  };
}

// Live landed cost while typing — the supplier sees the number the buyer will
// rank them on, not just their own unit prices.
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
    ${tot.discount ? `<div><span>${tr('tot.discount')}</span><span>− ${money(tot.discount)}</span></div>` : ''}
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
    const company = document.getElementById('b-company').value.trim();
    const name = document.getElementById('b-name').value.trim();
    if (!company && !name) {
      err.textContent = tr('bid.err.who');
      err.hidden = false;
      return;
    }
    const btn = document.getElementById('bid-submit');
    btn.disabled = true;
    btn.textContent = tr('bid.sending');

    mzSaveMe({ name, company, phone: document.getElementById('b-phone').value.trim() });
    await mzCreateBid({
      tenderId: T.id, ...draft,
      supplierName: name, supplierCompany: company,
      supplierPhone: document.getElementById('b-phone').value.trim(),
      notes: document.getElementById('b-notes').value.trim()
    });
    BID_DRAFT_SHOWN = false;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function myBidSummary(bid) {
  const tot = bidTotals(T, bid);
  const cov = bidCoverage(T, bid);
  return `<div class="card">
    <h2>${tr('my.h')}</h2>
    <p>${tr('my.d', { a: fmtDateTime(bid.createdAt), b: fmtDateTime(T.closesAt) })}</p>
    <div class="totals">
      <div><span>${tr('tot.goods', { a: cov.priced, b: cov.total })}</span><span>${money(tot.goods)}</span></div>
      <div><span>${tr('tot.delivery')}</span><span>${money(tot.delivery)}</span></div>
      <div><span>${tr('my.lead')}</span><span>${tr('my.leadVal', { n: dayWord(Number(bid.leadDays) || 1), t: esc(termsLabel(bid.terms)) })}</span></div>
      <div class="grand"><span>${tr('tot.landed')}</span><span>${money(tot.total)}</span></div>
    </div>
    <div class="btn-row"><button class="btn btn-ghost" id="revise">${tr('my.revise')}</button></div>
  </div>`;
}

// ---- comparison -------------------------------------------------------------

function comparisonHtml(bids) {
  const ranked = scoreBids(T, bids, WEIGHT);
  const canAward = mzIsMine(T) && !T.awardedBidId;

  const rows = ranked.map((r, n) => {
    const b = r.bid;
    const first = n === 0 && r.coverage.complete;
    const won = T.awardedBidId === b.id;
    const delta = r.deltaVsBest == null ? '—'
      : r.deltaVsBest === 0 ? `<span class="best">${tr('cmp.cheapest')}</span>`
      : `<span class="delta">+${money(r.deltaVsBest)}</span>`;
    return `<tr class="${won || first ? 'winner' : ''} ${r.coverage.complete ? '' : 'partial'}">
      <td><span class="rank ${first ? 'first' : ''}">${n + 1}</span></td>
      <td class="who">
        <b>${esc(supplierName(b))}${won ? ' 🏆' : ''}</b>
        <span>${r.coverage.complete ? tr('cmp.allLines') : tr('cmp.someLines', { a: r.coverage.priced, b: r.coverage.total })}${b.notes ? ` · ${tr('cmp.seeNote')}` : ''}</span>
      </td>
      <td class="num">${tr('d.short', { n: esc(r.lead) })}</td>
      <td>${esc(termsLabel(b.terms))}</td>
      <td class="num">${money(r.totals.delivery)}</td>
      <td class="num"><b>${money(r.totals.total)}</b></td>
      <td class="num">${delta}</td>
      <td class="num">${r.score == null ? `<span class="delta">${tr('cmp.notRanked')}</span>` : r.score}</td>
      ${canAward ? `<td><button class="btn" data-award="${esc(b.id)}">${tr('cmp.award')}</button></td>` : ''}
    </tr>`;
  }).join('');

  const notes = ranked.filter(r => r.bid.notes).map(r =>
    `<p class="hint"><b>${esc(supplierName(r.bid))}:</b> ${esc(r.bid.notes)}</p>`).join('');

  return `<div class="card">
    <h2>${tr('cmp.h')}</h2>
    <p>${tr('cmp.d', { p: Math.round(VAT_RATE * 100) })}</p>
    <div class="weight">
      <label for="w">${tr('cmp.weight', { p: Math.round(WEIGHT * 100), q: Math.round((1 - WEIGHT) * 100) })}</label>
      <input id="w" type="range" min="50" max="100" step="5" value="${Math.round(WEIGHT * 100)}" />
    </div>
    <p class="hint swipe">${tr('cmp.swipe')}</p>
    <div class="scroll-x"><table class="cmp">
      <thead><tr>
        <th>#</th><th>${tr('th.supplier')}</th><th class="num">${tr('th.lead')}</th><th>${tr('th.terms')}</th>
        <th class="num">${tr('th.delivery')}</th><th class="num">${tr('th.landed')}</th>
        <th class="num">${tr('th.vsbest')}</th><th class="num">${tr('th.score')}</th>${canAward ? '<th></th>' : ''}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    ${notes}
  </div>`;
}

function lineMatrixHtml(bids) {
  const head = bids.map(b => `<th class="num">${esc(supplierName(b))}</th>`).join('');
  const rows = T.items.map((item, i) => {
    const prices = bids.map(b => lineUnitPrice(b, i));
    const valid = prices.filter(p => p != null);
    const best = valid.length ? Math.min(...valid) : null;
    const cells = prices.map(p => p == null
      ? '<td class="num" style="color:var(--muted)">—</td>'
      : `<td class="num ${p === best ? 'best' : ''}">${money(p)}</td>`).join('');
    const m = materialOf(item.material);
    return `<tr>
      <td><b>${m.emoji} ${esc(matL(m))}</b><div class="spec">${qtyText(item.qty)} ${esc(unitShort(item.unit))}</div></td>
      ${cells}
    </tr>`;
  }).join('');

  return `<div class="card">
    <h2>${tr('lbl.h')}</h2>
    <p>${tr('lbl.d')}</p>
    <p class="hint swipe">${tr('lbl.swipe')}</p>
    <div class="scroll-x"><table>
      <thead><tr><th>${tr('th.material')}</th>${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

function splitHtml(bids) {
  const s = splitAward(T, bids);
  if (!s) return '';
  const picks = s.picks.map(p => {
    const m = materialOf(p.item.material);
    return `<tr>
      <td><b>${m.emoji} ${esc(matL(m))}</b><div class="spec">${qtyText(p.item.qty)} ${esc(unitShort(p.item.unit))}</div></td>
      <td>${esc(supplierName(p.bid))}</td>
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

function awardedBanner(bids) {
  const won = bids.find(b => b.id === T.awardedBidId) ||
              MZ_BOARD.bids.find(b => b.id === T.awardedBidId);
  if (!won) return '';
  const tot = bidTotals(T, won);
  const wa = won.supplierPhone
    ? ` <a class="btn" style="margin:0 8px" href="https://wa.me/${esc(won.supplierPhone.replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener">${tr('aw.msg')}</a>`
    : '';
  return `<div class="awarded-note">
    ${tr('aw.banner', { s: esc(supplierName(won)), p: money(tot.total), d: dayWord(Number(won.leadDays) || 1), t: esc(termsLabel(won.terms)) })}
    ${T.awardedAt ? tr('aw.at', { t: fmtDateTime(T.awardedAt) }) : ''}${wa}
  </div>`;
}

// ---- the three screens ------------------------------------------------------

function renderAction() {
  const el = document.getElementById('action');
  const bids = activeBids(T);
  const mine = mzIsMine(T);

  if (isSealed(T)) {
    if (mine) {
      el.innerHTML = `
        <div class="sealed">
          <div style="font-size:26px">🔒</div>
          <div class="big">${sealedBidsWord(mzSealedCount(T))}</div>
          <p>${tr('sealed.p', { t: fmtDateTime(T.closesAt), cd: countdown(T.closesAt) })}</p>
        </div>
        ${shareBlock(T)}`;
    } else {
      const my = mzMyBid(T.id);
      el.innerHTML = (my && !BID_DRAFT_SHOWN) ? myBidSummary(my) : bidFormHtml(my);
      if (my && !BID_DRAFT_SHOWN) {
        document.getElementById('revise').addEventListener('click', () => {
          BID_DRAFT_SHOWN = true;
          renderAction();
        });
      } else {
        wireBidForm(my);
      }
    }
    return;
  }

  // Closed: everything opens for everyone.
  if (!bids.length) {
    el.innerHTML = `<div class="empty">${tr('closedEmpty', { t: fmtDateTime(T.closesAt) })}
      ${mine ? tr('closedEmpty.mine') : ''}</div>`;
    return;
  }

  // Both tables read in the same order as the ranking, so the columns line up
  // with the rows above them.
  const ordered = scoreBids(T, bids, WEIGHT).map(r => r.bid);
  el.innerHTML =
    (T.awardedBidId ? awardedBanner(bids) : '') +
    comparisonHtml(bids) +
    (bids.length > 1 ? lineMatrixHtml(ordered) + splitHtml(bids) : '');

  // Dragging updates the label live; the table is rebuilt on release so the
  // slider does not lose the finger mid-drag on a phone.
  const w = document.getElementById('w');
  if (w) {
    const label = w.previousElementSibling;
    w.addEventListener('input', e => {
      const p = Number(e.target.value);
      label.textContent = tr('cmp.weight', { p, q: 100 - p });
    });
    w.addEventListener('change', e => {
      WEIGHT = Number(e.target.value) / 100;
      renderAction();
      const el2 = document.getElementById('w');
      if (el2) el2.focus();
    });
  }

  el.querySelectorAll('[data-award]').forEach(btn => btn.addEventListener('click', async () => {
    const b = bids.find(x => x.id === btn.dataset.award);
    // Awarding a partial bid is allowed — sometimes one line is all you need —
    // but never by accident: say what it leaves unbought.
    const cov = bidCoverage(T, b);
    const gap = cov.complete ? '' : `\n\n${tr('aw.confirm.gap', { a: cov.priced, b: cov.total })}`;
    if (!confirm(`${tr('aw.confirm', { s: supplierName(b), p: money(bidTotals(T, b).total) })}${gap}\n\n${tr('aw.confirm.final')}`)) return;
    btn.disabled = true;
    await mzAward(T.id, b.id);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
}

function renderPosted() {
  if (!JUST_POSTED || !mzIsMine(T)) return;
  document.getElementById('posted-panel').innerHTML =
    `<div class="awarded-note">${tr('posted.live', { ref: esc(T.ref), t: fmtDateTime(T.closesAt) })}</div>`;
}

function render() {
  LAST_SEALED = T ? isSealed(T) : null;
  if (!T) {
    document.getElementById('head').innerHTML =
      `<div class="empty">${tr('notFound')}
       <br><br><a class="btn" href="index.html">${tr('notFound.back')}</a></div>`;
    return;
  }
  document.title = `${T.ref} — ${T.title} · ${mzIsAr() ? 'مناقصة' : 'Munaqasa'}`;
  renderPosted();
  renderHead();
  renderItems();
  renderAction();
}

// The language toggle re-renders the page; a half-typed bid form is snapshotted
// and restored so flipping languages never costs the supplier their numbers.
window.onLangChange = () => {
  if (!T) { render(); return; }
  const hadForm = !!document.querySelector('.b-line');
  const snap = hadForm ? {
    draft: readBidDraft(),
    name: document.getElementById('b-name').value,
    company: document.getElementById('b-company').value,
    phone: document.getElementById('b-phone').value,
    notes: document.getElementById('b-notes').value
  } : null;
  render();
  if (snap && document.querySelector('.b-line')) {
    snap.draft.lines.forEach((v, i) => {
      const el = document.querySelector(`.b-line[data-i="${i}"]`);
      if (el) el.value = v == null ? '' : v;
    });
    document.getElementById('b-delivery').value = snap.draft.deliveryFee || '';
    document.getElementById('b-discount').value = snap.draft.discount || '';
    document.getElementById('b-lead').value = snap.draft.leadDays;
    document.getElementById('b-validity').value = snap.draft.validityDays;
    document.getElementById('b-terms').value = snap.draft.terms;
    document.getElementById('b-name').value = snap.name;
    document.getElementById('b-company').value = snap.company;
    document.getElementById('b-phone').value = snap.phone;
    document.getElementById('b-notes').value = snap.notes;
    refreshBidTotals();
  }
};

// Copy-link works from anywhere on the page.
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

// A tender closing while the page is open should open its bids by itself. Only
// the crossing triggers a full re-render — otherwise just the header is
// refreshed, so a half-typed bid is never wiped by a countdown tick.
setInterval(() => {
  if (!T) return;
  if (isSealed(T) !== LAST_SEALED) render(); else renderHead();
}, 30000);
