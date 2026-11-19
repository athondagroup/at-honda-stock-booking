// ------------------------------------------------------------------ each car against the Stock sheet (19/11)
// ✓ ตรงกับชีต   the sheet's booking cell (as last read) says what the web holds (the lock's text / its customer, or the IDS allocation)
// ⏳ รอเขียน    the web has a lock the sheet does not show yet (written after the last read, or the write failed / is waiting)
// ⚠ ไม่ตรง     the two differ: keep the web's (write over the sheet) or take the sheet's (change the lock)
// Only function declarations / ACTIONS here.
function shN(v) { return String(v == null ? '' : v).replace(/\s+/g, '').toLowerCase(); }
function carSheetSt(c, D) {
  if (!c || c.src !== 'IDS' || c.quota) return null;
  const doc = S.ids.get('stock_' + c.br), readAt = doc && doc.at ? String(doc.at) : '';
  const sheet = String(c.bknote || '').trim();
  if (c.bkno || c.bk) return { k: 'ok', why: 'IDS จัดสรร ' + (c.bkno || c.bk), readAt };
  const l = typeof ltLockOf === 'function' ? ltLockOf(c, D) : null;
  if (!l) return sheet ? { k: 'bad', web: '', sheet, readAt } : { k: 'ok', why: 'ว่างทั้งสองฝั่ง', readAt };
  const web = ltTextOf(l), sy = l.sheet_sync || null, cust = (l.booking && l.booking.cust) || l.prospect || l.dealer_name || '';
  const first = shN(String(cust).split(/\s+/)[0] || '');
  // the newest known sheet text: what a write found in the cell (conflict) if that is newer than the last read
  const now = sy && sy.conflict && sy.current != null && (!readAt || String(sy.at) > readAt) ? String(sy.current) : sheet;
  // 19/11: the same customer (first name in the cell) or the same text counts as the same, nickname spelt any way
  const same = !!now && (shN(now) === shN(web) || (first.length >= 3 && shN(now).includes(first)));
  if (same) return { k: 'ok', why: now, l, readAt };
  if (sy && sy.conflict) return { k: 'bad', web, sheet: now, l, readAt };
  if (sy && sy.at && String(sy.at) > readAt && sy.value && !sy.error && !sy.conflict && shN(sy.value) !== shN(web)) return { k: 'wait', web, why: `ชีตมี "${sy.value}" ยังไม่ครบ · กำลังเขียนใหม่`, l, readAt };
  if (same) return { k: 'ok', why: sheet, l, readAt };
  if (sy && sy.at && !sy.error && String(sy.at) > readAt) return { k: 'ok', why: `เขียนลงชีตแล้ว ${fmtDT(sy.at)} (รออ่านชีตรอบหน้า)`, l, readAt };
  // 20/11: written OK (the cell was empty and now holds this text), but the sheet copy was pasted before / from an older file: still written
  if (!sheet && sy && sy.at && sy.value && !sy.error && !sy.conflict && shN(sy.value) === shN(web)) return { k: 'ok', why: `เขียนลงชีตแล้ว ${fmtDT(sy.at)}`, l, readAt };
  if (!sheet || (sy && sy.error)) return { k: 'wait', web, why: sy && sy.error ? 'เขียนไม่สำเร็จ · ลองใหม่อัตโนมัติ' : 'ยังไม่ได้เขียนลงชีต', l, readAt };
  return { k: 'bad', web, sheet, l, readAt };
}
var SHEET_ST = { ok: ['✓ ตรงกับชีต', 'good'], wait: ['⏳ รอเขียนลงชีต', 'neutral'], bad: ['⚠ ไม่ตรง', 'bad'] };
function sheetStCell(c, D) {
  const s = carSheetSt(c, D); if (!s) return '<span class="text-xs text-muted">–</span>';
  const can = typeof ltCan === 'function' && ltCan(), q = x => `"${esc(x || '')}"`;
  const btn = (act, label, extra, red) => `<button class="btn ${red ? 'btn-red' : 'btn-ghost'} btn-sm" data-act="${act}" ${extra}>${label}</button>`;
  let body = '';
  if (s.k === 'ok') body = s.why ? `<div class="text-xs text-muted">${esc(s.why)}</div>` : '';
  else if (s.k === 'wait') body = `<div class="text-xs text-muted">${esc(s.why)}</div>${can && s.l ? btn('lt-force', 'เขียนลงชีตตอนนี้', `data-id="${esc(s.l.id)}"`) : ''}`;
  else body = `<div class="text-xs">เว็บ: <b>${s.web ? q(s.web) : '(ว่าง)'}</b><br>ชีต: <b>${s.sheet ? q(s.sheet) : '(ว่าง)'}</b></div>
    ${can ? `<div class="flex flex-wrap gap-1 mt-1">${s.l ? btn('lt-force', 'ใช้ของเว็บ (เขียนทับชีต)', `data-id="${esc(s.l.id)}"`, true) : ''}${s.sheet ? btn('sheet-use', s.l ? 'ใช้ของชีต (แก้ล็อก)' : 'ล็อกตามชีต', `data-vin="${esc(c.vin)}"`) : ''}</div>` : ''}`;
  return `${chip(SHEET_ST[s.k][0], SHEET_ST[s.k][1])}${body}`;
}
function sheetStBar(cars, D) {
  if (typeof ltCan !== 'function' || !(ltCan() || S.role.role === 'admin')) return '';
  const n = { ok: 0, wait: 0, bad: 0 }; let read = '';
  for (const c of cars) { const s = carSheetSt(c, D); if (!s) continue; n[s.k]++; if (s.readAt > read) read = s.readAt; }
  const f = S.filters.shst || '', pill = (k) => `<button class="chip ${f === k ? 'ring-2' : ''}" style="cursor:pointer" data-act="sheet-filter" data-v="${k}" aria-pressed="${f === k}">${SHEET_ST[k][0]} ${n[k]}</button>`;
  return `<div class="bg-surface border border-line rounded-lg p-3 mb-3 flex flex-wrap gap-2 items-center text-sm"><b>เทียบกับชีต Stock</b>${read ? `<span class="text-xs text-muted">อ่านชีตล่าสุด ${fmtDT(read)}</span>` : ''}
    ${pill('ok')}${pill('wait')}${pill('bad')}${f ? '<button class="text-xs underline" data-act="sheet-filter" data-v="">ดูทั้งหมด</button>' : '<span class="text-xs text-muted">กดเพื่อกรอง</span>'}</div>`;
}
Object.assign(ACTIONS, {
  'sheet-filter'(el) { S.filters.shst = S.filters.shst === el.dataset.v ? '' : el.dataset.v; render(); },
  // take the sheet's text: the lock box opens with it typed in (the usual picker: booking / temporary / dealer)
  'sheet-use'(el) {
    const D = derive(), c = D.cars.get(el.dataset.vin), s = c && carSheetSt(c, D); if (!s || !s.sheet) return;
    S.lt = { vin: c.vin, q: s.sheet, mode: s.l ? 'edit' : 'new', old: s.l ? s.l.id : null }; render();
    setTimeout(() => { const i = document.getElementById('lt-in'); if (i) { i.focus(); i.scrollIntoView({ block: 'center' }); } }, 0);
  }
});
