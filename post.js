// ---- POST A REQUEST ---------------------------------------------------------
// The buyer's form. Line items are the whole point: a request priced line by
// line can be awarded line by line, which is where the savings on the
// comparison screen come from.
//
// Language: static labels carry data-i18n attributes (retranslated in place by
// i18n.js when the toggle flips — typed values survive), and the selects show
// both languages at once, so nothing here needs re-rendering on a toggle.

const linesEl = document.getElementById('lines');
const errEl = document.getElementById('post-err');

// Cities the parent map covers first, then the rest of the country. The stored
// value is the English name; the label shows both.
document.getElementById('f-city').innerHTML =
  [...CITIES, 'Other'].map(c =>
    `<option value="${esc(c)}">${esc(CITY_AR[c] || c)} · ${esc(c)}</option>`).join('');

// A material's own units come first — nobody buys cement by the square metre —
// but the full list stays available for the odd job that needs it.
// Only the units that material is actually sold in — a shorter list is one
// less thing to think about.
function unitOptions(materialKey, selected) {
  const m = materialOf(materialKey);
  return m.units.map(u =>
    `<option value="${u}" ${u === selected ? 'selected' : ''}>${esc(UNITS[u].ar)} · ${esc(UNITS[u].en)}</option>`
  ).join('');
}

function lineHtml(i, line = {}) {
  const mat = line.material || 'cement';
  return `<div class="line" data-i="${i}">
    ${i > 0 ? '<button type="button" class="rm" title="✕">✕</button>' : ''}
    <label class="field">
      <span data-i18n="p.mat">${tr('p.mat')}</span>
      <select class="l-mat">
        ${MATERIALS.map(m => `<option value="${m.key}" ${m.key === mat ? 'selected' : ''}>${m.emoji} ${esc(m.ar)} · ${esc(m.en)}</option>`).join('')}
      </select>
    </label>
    <label class="field">
      <span data-i18n-html="p.spec">${tr('p.spec')}</span>
      <input class="l-spec" maxlength="140" value="${esc(line.spec || '')}" data-i18n-ph="p.spec.ph" placeholder="${esc(tr('p.spec.ph'))}" />
    </label>
    <div class="qty-row">
      <label class="field">
        <span data-i18n="p.qty">${tr('p.qty')}</span>
        <input class="l-qty" type="number" min="0" step="any" inputmode="decimal" value="${line.qty != null ? esc(line.qty) : ''}" placeholder="400" />
      </label>
      <label class="field">
        <span data-i18n="p.unit">${tr('p.unit')}</span>
        <select class="l-unit">${unitOptions(mat, line.unit)}</select>
      </label>
    </div>
  </div>`;
}

let lineCount = 0;

function addLine(line) {
  linesEl.insertAdjacentHTML('beforeend', lineHtml(lineCount++, line));
}

addLine();

document.getElementById('add-line').addEventListener('click', () => addLine());

linesEl.addEventListener('click', e => {
  const rm = e.target.closest('.rm');
  if (!rm) return;
  rm.closest('.line').remove();
});

// Changing the material re-orders the unit list to that material's own units
// and selects its default, unless the buyer already picked one deliberately.
linesEl.addEventListener('change', e => {
  if (!e.target.classList.contains('l-mat')) return;
  const line = e.target.closest('.line');
  const unitSel = line.querySelector('.l-unit');
  unitSel.innerHTML = unitOptions(e.target.value, materialOf(e.target.value).units[0]);
});

// ---- defaults ---------------------------------------------------------------

// The auction length is a choice of three, not a datetime picker.
let CLOSE_HOURS = 72;

function closesAtDate() {
  const d = new Date(Date.now() + CLOSE_HOURS * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  return d;
}

function updateClosesNote() {
  document.getElementById('closes-note').textContent =
    tr('p.closes', { t: fmtDateTime(closesAtDate().toISOString()) });
}

document.querySelectorAll('[data-close-in]').forEach(b =>
  b.addEventListener('click', () => {
    CLOSE_HOURS = Number(b.dataset.closeIn);
    document.querySelectorAll('[data-close-in]').forEach(x =>
      x.classList.toggle('active', x === b));
    updateClosesNote();
  }));

updateClosesNote();
window.onLangChange = updateClosesNote;

const needed = new Date();
needed.setDate(needed.getDate() + 10);
document.getElementById('f-needed').value = needed.toISOString().slice(0, 10);

const me = mzMe();
document.getElementById('f-name').value = me.name || '';
document.getElementById('f-phone').value = me.phone || '';

// ---- submit -----------------------------------------------------------------

function readLines() {
  return [...linesEl.querySelectorAll('.line')].map(el => ({
    material: el.querySelector('.l-mat').value,
    spec: el.querySelector('.l-spec').value.trim(),
    qty: Number(el.querySelector('.l-qty').value),
    unit: el.querySelector('.l-unit').value
  })).filter(l => l.qty > 0);
}

function fail(msg) {
  errEl.textContent = msg;
  errEl.hidden = false;
  errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('post-form').addEventListener('submit', async e => {
  e.preventDefault();
  errEl.hidden = true;

  const title = document.getElementById('f-title').value.trim();
  const items = readLines();
  const closesAt = closesAtDate();

  if (!title) return fail(tr('p.err.title'));
  if (!items.length) return fail(tr('p.err.lines'));

  const btn = document.getElementById('post-submit');
  btn.disabled = true;
  btn.textContent = tr('p.posting');

  mzSaveMe({
    name: document.getElementById('f-name').value.trim(),
    phone: document.getElementById('f-phone').value.trim()
  });
  const who = mzMe();

  const tender = await mzCreateTender({
    title,
    city: document.getElementById('f-city').value,
    site: '',
    neededBy: document.getElementById('f-needed').value,
    closesAt: closesAt.toISOString(),
    items,
    notes: document.getElementById('f-notes').value.trim(),
    buyerName: who.name, buyerCompany: who.company, buyerPhone: who.phone
  });

  location.href = `tender.html?id=${encodeURIComponent(tender.id)}&posted=1`;
});
