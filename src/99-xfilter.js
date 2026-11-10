// ------------------------------------------------------------------ every table: Excel-like column menus (ตกลง 11/11)
// Each header cell of a table (class tbl) gets a ▾ button: sort small → large / large → small, search the values, tick the values
// to show. Works on what is drawn (no change to the data): rows are hidden / reordered on the page. The choice is kept per page and
// table, and put back after every redraw. Tables with their own menus (the accounts tab) are left alone.
// Only function declarations / document listeners here: the first render runs before this part of the file.
const XF = { st: {}, pop: null };
function xfLabel(th) { return th.dataset.xfLabel ?? th.textContent.trim(); }
function xfKey(t, i) {
  const h = t.tHead.rows[t.tHead.rows.length - 1];
  return [S.view || '', (S.sub && S.sub[S.view]) || '', (S.modal && S.modal.kind) || '', i, [...h.cells].map(xfLabel).join('|')].join('/');
}
function xfText(row, ci) { const c = row.cells[ci]; return c ? String(c.innerText || c.textContent || '').trim().split('\n')[0].trim() : ''; }
function xfSortVal(v) {
  const d = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (d) { let y = Number(d[3]); if (y < 100) y += 2000; if (y > 2400) y -= 543; return y * 10000 + Number(d[2]) * 100 + Number(d[1]); }
  const n = v.replace(/[,\s]|บาท|คัน|ใบ|วัน/g, '').replace(/^[−–-]$/, '').match(/^[−-]?\d+(\.\d+)?%?$/);
  if (n) return Number(n[0].replace('−', '-').replace('%', ''));
  return null;
}
function xfCmp(a, b) { const x = xfSortVal(a), y = xfSortVal(b); if (x !== null && y !== null) return x - y; if (x !== null) return -1; if (y !== null) return 1; return a.localeCompare(b, 'th', { numeric: true }); }
function xfRows(t) { const h = t.tHead.rows[t.tHead.rows.length - 1], n = h.cells.length; return [...(t.tBodies[0] ? t.tBodies[0].rows : [])].filter(r => r.cells.length === n); }
function xfApply(t) {
  const st = XF.st[t.dataset.xfKey]; if (!st) return;
  const rows = xfRows(t), body = t.tBodies[0];
  rows.forEach(r => { r.style.display = Object.entries(st.sel || {}).every(([ci, set]) => !set || set.includes(xfText(r, Number(ci)))) ? '' : 'none'; });
  if (st.sort) { const ci = st.sort.ci, d = st.sort.dir === 'desc' ? -1 : 1; rows.slice().sort((a, b) => xfCmp(xfText(a, ci), xfText(b, ci)) * d).forEach(r => body.appendChild(r)); }
  const h = t.tHead.rows[t.tHead.rows.length - 1];
  [...h.cells].forEach((th, ci) => { const b = th.querySelector('.xf-btn'); if (!b) return; const on = !!(st.sel && st.sel[ci]), so = st.sort && st.sort.ci === ci ? (st.sort.dir === 'desc' ? '↓' : '↑') : ''; b.textContent = so + (on ? '⧩' : '▾'); b.classList.toggle('on', !!(on || so)); });
}
function xfEnhance() {
  document.querySelectorAll('table.tbl').forEach((t, i) => {
    if (t.dataset.xf || !t.tHead || !t.tHead.rows.length || t.querySelector('.acx-btn')) return;
    t.dataset.xf = '1';
    if (xfRows(t).length < 2) return;
    t.dataset.xfKey = xfKey(t, i);
    const h = t.tHead.rows[t.tHead.rows.length - 1];
    [...h.cells].forEach((th, ci) => {
      if (th.colSpan > 1) return;
      th.dataset.xfLabel = th.textContent.trim();
      if (!th.dataset.xfLabel && !xfRows(t).some(r => xfText(r, ci))) return;   // an empty column (buttons)
      const b = document.createElement('button'); b.type = 'button'; b.className = 'xf-btn'; b.dataset.xfCi = ci; b.textContent = '▾'; b.title = 'เรียง / กรอง';
      th.appendChild(b);
    });
    xfApply(t);
  });
}
function xfClose() { if (XF.pop) { XF.pop.remove(); XF.pop = null; } }
function xfOpen(btn) {
  const t = btn.closest('table'), ci = Number(btn.dataset.xfCi), key = t.dataset.xfKey; xfClose();
  const st = XF.st[key] = XF.st[key] || { sel: {}, sort: null };
  const vals = [...new Set(xfRows(t).map(r => xfText(r, ci)))].sort(xfCmp);
  const draft = new Set(st.sel[ci] || vals);
  const p = document.createElement('div'); p.className = 'acx-pop xf-pop';
  const draw = q => {
    const k = searchKey(q || ''), shown = vals.filter(v => !k || searchKey(v).includes(k)).slice(0, 500);
    p.innerHTML = `<button class="acx-it" data-xf="asc">↑ เรียงน้อย → มาก (A→Z)</button><button class="acx-it" data-xf="desc">↓ เรียงมาก → น้อย (Z→A)</button>
      ${st.sel[ci] || (st.sort && st.sort.ci === ci) ? '<button class="acx-it" data-xf="clear">✕ ล้างการเรียง / ตัวกรองคอลัมน์นี้</button>' : ''}
      <input class="xf-q w-full my-1 p-1 text-xs rounded border border-line" style="background:var(--surface)" placeholder="ค้นหา" value="${esc(q || '')}" autocomplete="off">
      <label class="acx-row"><input type="checkbox" data-xfall="1" ${shown.every(v => draft.has(v)) ? 'checked' : ''}> <b>(เลือกทั้งหมด${k ? 'ที่ค้นเจอ' : ''})</b></label>
      <div class="acx-list">${shown.map((v, j) => `<label class="acx-row"><input type="checkbox" data-xfv="${j}" ${draft.has(v) ? 'checked' : ''}> ${esc(v || '(ว่าง)')}</label>`).join('')}</div>
      <div class="flex justify-end gap-2 mt-2"><button class="btn btn-ghost btn-sm" data-xf="close">ยกเลิก</button><button class="btn btn-dark btn-sm" data-xf="ok">ตกลง</button></div>`;
    p._shown = shown;
  };
  draw('');
  p.addEventListener('click', e => {
    e.stopPropagation();
    const a = e.target.closest('[data-xf]'); if (!a) return;
    const v = a.dataset.xf;
    if (v === 'asc' || v === 'desc') st.sort = { ci, dir: v };
    else if (v === 'clear') { delete st.sel[ci]; if (st.sort && st.sort.ci === ci) st.sort = null; }
    else if (v === 'ok') { if (draft.size < vals.length) st.sel[ci] = [...draft]; else delete st.sel[ci]; }
    xfClose(); const tt = document.querySelector(`table[data-xf-key="${CSS.escape(key)}"]`); if (tt) xfApply(tt);
  });
  p.addEventListener('change', e => {
    const c = e.target;
    if (c.dataset.xfv !== undefined) { const v = p._shown[Number(c.dataset.xfv)]; c.checked ? draft.add(v) : draft.delete(v); }
    if (c.dataset.xfall) { p._shown.forEach(v => c.checked ? draft.add(v) : draft.delete(v)); p.querySelectorAll('[data-xfv]').forEach(x => { x.checked = c.checked; }); }
  });
  p.addEventListener('input', e => { if (e.target.classList.contains('xf-q')) { const q = e.target.value; draw(q); const i = p.querySelector('.xf-q'); i.focus(); i.setSelectionRange(q.length, q.length); } });
  document.body.appendChild(p); XF.pop = p; XF.popBtn = btn;
  const r = btn.getBoundingClientRect(), w = Math.min(280, window.innerWidth - 16);
  p.style.position = 'fixed'; p.style.width = w + 'px'; p.style.top = Math.min(r.bottom + 4, window.innerHeight - 340) + 'px'; p.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
}
document.addEventListener('click', e => {
  const b = e.target && e.target.closest ? e.target.closest('.xf-btn') : null;
  if (b) { e.preventDefault(); e.stopPropagation(); if (XF.pop && XF.popBtn === b) xfClose(); else xfOpen(b); return; }
  if (XF.pop && !XF.pop.contains(e.target)) xfClose();
}, true);
new MutationObserver(() => { if (!document.querySelector('table.tbl:not([data-xf])')) return; xfEnhance(); }).observe(document.documentElement, { childList: true, subtree: true });
