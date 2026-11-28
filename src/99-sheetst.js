// ------------------------------------------------------------------ each car against the Stock sheet (19/11)
// ✓ ตรงกับชีต   the sheet's booking cell (as last read) says what the web holds (the lock's text / its customer, or the IDS allocation)
// ⏳ รอเขียน    the web has a lock the sheet does not show yet (written after the last read, or the write failed / is waiting)
// ⚠ ไม่ตรง     the two differ: keep the web's (write over the sheet) or take the sheet's (change the lock)
// Only function declarations / ACTIONS here.
function shN(v) { return String(v == null ? '' : v).replace(/\s+/g, '').toLowerCase(); }
// 20/11: a car not in the stock tab yet (received here, or the stock tab has no row) whose Ref is still a quota row in the sheet
// (Vin Number cell holding a name, no frame number): that row is the sheet's side. The quota lock follows the car.
function carQuotaRow(c, D) { return c && c.ref ? D.quota.find(q => q.ref === c.ref && !q.vin) || null : null; }
function carSheetSt(c, D) {
  if (!c || c.quota || c.gone) return null;
  const ids = c.src === 'IDS', qrow = carQuotaRow(c, D), l = typeof ltLockOf === 'function' ? ltLockOf(c, D) : null, sy0 = l && l.sheet_sync;
  // the stock tab is the sheet's side while the car has a stock row; otherwise the quota row (the web found no stock row, or it is not an IDS stock car)
  const useQ = !!qrow && (!ids || (!String(c.bknote || '').trim() && (!!qrow.vnote || (sy0 && sy0.error === 'not_found'))));
  const qdoc = useQ ? S.ids.get(`quota_${qrow.br}_${qrow.m}`) : null, doc = useQ ? qdoc : S.ids.get('stock_' + c.br), readAt = doc && doc.at ? String(doc.at) : '';
  const sheet = String((useQ ? qrow.vnote : c.bknote) || '').trim(), where = useQ ? 'Quota ' + qrow.ref : '';
  if (!ids && !useQ) {
    // 23/11: no sheet copy for this car yet, but the lock itself came from the sheet (a name typed there, moved with the car),
    // or the web wrote it / found it when writing: that is the sheet's side
    const sy1 = l && l.sheet_sync;
    if (l && sy1 && sy1.conflict && sy1.current != null) { const w = ltTextOf(l), cu = (l.booking && l.booking.cust) || l.prospect || '', f1 = shN(String(cu).split(/\s+/)[0] || '');
      return shN(sy1.current) === shN(w) || (f1.length >= 3 && shN(sy1.current).includes(f1)) ? { k: 'ok', why: String(sy1.current), l, readAt } : { k: 'bad', web: w, sheet: String(sy1.current), l, readAt }; }
    if (l && sy1 && sy1.at && !sy1.error) return { k: 'ok', why: `เขียนลงชีตแล้ว ${fmtDT(sy1.at)}`, l, readAt };
    if (l && (l.imported || l.sheet_text) && !l.typed) return { k: 'ok', why: `ล็อกนี้มาจากชื่อในชีต "${l.sheet_text || ltTextOf(l)}"`, l, readAt };
    // 26/11: the web's Stock copy (pasted IDS file) does not list this car (pulled back as special, received here, moved, Advance):
    // the real sheet, read for these cars (shLiveRead), is the sheet's side
    const lv = shLiveGet(c.vin), lat = SH_LIVE && SH_LIVE.at;
    if (lv) {
      const where2 = `ชีต ${lv.tab} แถว ${lv.row}`, k2 = lv.k;
      if (lv.dup) return { k: 'bad', web: l ? ltTextOf(l) : '', sheet: k2, where: where2 + ' (เลขตัวถังซ้ำในชีต ตรวจชีต)', l, readAt: lat };
      if (!l) return k2 ? { k: 'bad', web: '', sheet: k2, where: where2, readAt: lat } : { k: 'ok', why: `อยู่ใน${where2} · ช่องใบจองว่าง (อ่านชีตจริง ${fmtDT(lat)})`, readAt: lat };
      const w2 = ltTextOf(l), cu2 = (l.booking && l.booking.cust) || l.prospect || l.dealer_name || '', f2 = shN(String(cu2).split(/\s+/)[0] || '');
      if (k2 && (shN(k2) === shN(w2) || (f2.length >= 3 && shN(k2).includes(f2)))) return { k: 'ok', why: `${k2} (${where2})`, l, readAt: lat };
      return k2 ? { k: 'bad', web: w2, sheet: k2, where: where2, l, readAt: lat } : { k: 'wait', web: w2, why: `อยู่ใน${where2} แต่ช่องใบจองยังว่าง`, l, readAt: lat };
    }
    const pasted = S.ids.get('stock_' + c.br), pd = pasted && (pasted.asof || pasted.at) ? fmtD(String(pasted.asof || pasted.at).slice(0, 10)) : '';
    if (SH_LIVE && SH_LIVE.vins && !(SH_LIVE.bad || []).length) return { k: 'na', why: `ไม่พบเลขตัวถังนี้ในชีต Stock ทั้ง 4 สาขา (อ่านชีตจริง ${fmtDT(lat)})`, readAt: lat };
    return { k: 'na', why: `ไฟล์ Stock ${c.br || ''} ที่วางในเว็บ${pd ? ' (' + pd + ')' : ''} ไม่มีคันนี้${SH_LIVE && SH_LIVE.busy ? ' · กำลังตรวจชีตจริง…' : SH_LIVE && SH_LIVE.err ? ' · อ่านชีตจริงไม่ได้' : ''}`, readAt, live: true };
  }
  if (c.bkno || c.bk) return { k: 'ok', why: 'IDS จัดสรร ' + (c.bkno || c.bk), readAt };
  if (!l) return sheet ? { k: 'bad', web: '', sheet, where, readAt } : { k: 'ok', why: where ? `ว่างทั้งสองฝั่ง (${where})` : 'ว่างทั้งสองฝั่ง', readAt };
  const web = ltTextOf(l), sy = l.sheet_sync || null, cust = (l.booking && l.booking.cust) || l.prospect || l.dealer_name || '';
  const first = shN(String(cust).split(/\s+/)[0] || '');
  // the newest known sheet text: what a write found in the cell (conflict) if that is newer than the last read
  // 20/11: or whenever the copy shows the cell empty (the copy may not cover this car's row: a car keyed in another branch's tab)
  const now = sy && sy.conflict && sy.current != null && (!readAt || String(sy.at) > readAt || !sheet) ? String(sy.current) : sheet;
  // 19/11: the same customer (first name in the cell) or the same text counts as the same, nickname spelt any way
  const same = !!now && (shN(now) === shN(web) || (first.length >= 3 && shN(now).includes(first)));
  if (same) return { k: 'ok', why: now, l, readAt };
  if (sy && sy.conflict) return { k: 'bad', web, sheet: now, where, l, readAt };
  if (sy && sy.at && String(sy.at) > readAt && sy.value && !sy.error && !sy.conflict && shN(sy.value) !== shN(web)) return { k: 'wait', web, why: `ชีตมี "${sy.value}" ยังไม่ครบ · กำลังเขียนใหม่`, l, readAt };
  if (same) return { k: 'ok', why: sheet, l, readAt };
  if (sy && sy.at && !sy.error && String(sy.at) > readAt) return { k: 'ok', why: `เขียนลงชีตแล้ว ${fmtDT(sy.at)} (รออ่านชีตรอบหน้า)`, l, readAt };
  // 20/11: written OK (the cell was empty and now holds this text), but the sheet copy was pasted before / from an older file: still written
  if (!sheet && sy && sy.at && sy.value && !sy.error && !sy.conflict && shN(sy.value) === shN(web)) return { k: 'ok', why: `เขียนลงชีตแล้ว ${fmtDT(sy.at)}`, l, readAt };
  if (!sheet || (sy && sy.error)) return { k: 'wait', web, why: sy && sy.error ? ltSheetWhy(sy) : 'ยังไม่ได้เขียนลงชีต', l, readAt };
  return { k: 'bad', web, sheet, where, l, readAt };
}
var SHEET_ST = { ok: ['✓ ตรงกับชีต', 'good'], wait: ['⏳ รอเขียนลงชีต', 'neutral'], bad: ['⚠ ไม่ตรง', 'bad'], na: ['ยังไม่มีในชีต', 'muted'] };
function sheetStCell(c, D) {
  const s = carSheetSt(c, D); if (!s) return '<span class="text-xs text-muted">–</span>';
  const can = typeof ltCan === 'function' && ltCan(), q = x => `"${esc(x || '')}"`;
  const btn = (act, label, extra, red) => `<button class="btn ${red ? 'btn-red' : 'btn-ghost'} btn-sm" data-act="${act}" ${extra}>${label}</button>`;
  let body = '';
  if (s.k === 'ok' || s.k === 'na') body = s.why ? `<div class="text-xs text-muted">${esc(s.why)}</div>` : '';
  else if (s.k === 'wait') body = `<div class="text-xs text-muted">${esc(s.why)}</div>${can && s.l ? btn('lt-force', 'เขียนลงชีตตอนนี้', `data-id="${esc(s.l.id)}"`) : ''}`;
  else body = `<div class="text-xs">${s.where ? `<span class="text-muted">${esc(s.where)}</span><br>` : ''}เว็บ: <b>${s.web ? q(s.web) : '(ว่าง)'}</b><br>ชีต: <b>${s.sheet ? q(s.sheet) : '(ว่าง)'}</b></div>
    ${can ? `<div class="flex flex-wrap gap-1 mt-1">${s.l ? btn('lt-force', 'ใช้ของเว็บ (เขียนทับชีต)', `data-id="${esc(s.l.id)}"`, true) : ''}${s.sheet ? btn('sheet-use', s.l ? 'ใช้ของชีต (แก้ล็อก)' : 'ล็อกตามชีต', `data-vin="${esc(c.vin)}"`) : ''}</div>` : ''}`;
  return `${chip(SHEET_ST[s.k][0], SHEET_ST[s.k][1])}${body}`;
}
// 26/11: the four stock tabs of the real sheet, read once (and on the button) for the cars the pasted Stock copy does not list
var SH_LIVE = null;
function shLiveGet(vin) { return SH_LIVE && SH_LIVE.vins ? SH_LIVE.vins.get(String(vin || '').toUpperCase()) : undefined; }
async function shLiveRead(force) {
  if (SH_LIVE && SH_LIVE.busy) return;
  if (!force && SH_LIVE && SH_LIVE.t && Date.now() - SH_LIVE.t < 10 * 60e3) return;
  SH_LIVE = { ...(SH_LIVE || {}), busy: true, err: null }; render();
  const mcp = await gsUse().catch(() => null);
  if (!mcp) { SH_LIVE = { busy: false, err: 'nomcp', t: Date.now() }; render(); return; }
  const id = idsGsId(), vins = new Map(), bad = [];
  // the four tabs at the same time (about one call's wait); the page is already drawn, it redraws once when they are in
  await Promise.all(BRS.map(async t => {
    try {
      const p = idsGsPayload(await mcp.callTool('Google Sheets', 'get_values', { spreadsheetId: id, range: `'${t}'!A1:AD800` }, { cache: false }));
      const rows = p && Array.isArray(p.values) ? p.values : null; if (!rows) { bad.push(t); return; }
      const h = rows.findIndex(x => (x || []).some(v => String(v).includes('หมายเลขตัวถัง')) && (x || []).some(v => String(v).includes('เลขที่ใบสั่งจอง'))); if (h < 0) { bad.push(t); return; }
      const vi = rows[h].findIndex(v => String(v).includes('หมายเลขตัวถัง')), bi = rows[h].findIndex(v => String(v).includes('เลขที่ใบสั่งจอง'));
      rows.forEach((x, i) => { if (i <= h) return; const v = String((x || [])[vi] || '').toUpperCase().trim(); if (!/^[A-Z0-9]{17}$/.test(v)) return;
        const o = vins.get(v); if (o) o.dup = true; else vins.set(v, { tab: t, row: i + 1, k: String((x || [])[bi] == null ? '' : x[bi]).trim() }); });
    } catch (e) { bad.push(t); }
  }));
  SH_LIVE = { busy: false, at: new Date().toISOString(), t: Date.now(), vins, bad }; render();
}
function sheetStBar(cars, D) {
  if (typeof ltCan !== 'function' || !(ltCan() || S.role.role === 'admin')) return '';
  const n = { ok: 0, wait: 0, bad: 0 }; let read = '', na = 0;
  for (const c of cars) { const s = carSheetSt(c, D); if (!s) continue; if (s.live) na++; if (!(s.k in n)) continue; n[s.k]++; if (s.readAt > read) read = s.readAt; }
  if (na && !(SH_LIVE && (SH_LIVE.busy || SH_LIVE.t))) setTimeout(() => shLiveRead(), 0);
  const f = S.filters.shst || '', pill = (k) => `<button class="chip ${f === k ? 'ring-2' : ''}" style="cursor:pointer" data-act="sheet-filter" data-v="${k}" aria-pressed="${f === k}">${SHEET_ST[k][0]} ${n[k]}</button>`;
  return `<div class="bg-surface border border-line rounded-lg p-3 mb-3 flex flex-wrap gap-2 items-center text-sm"><b>เทียบกับชีต Stock</b>${read ? `<span class="text-xs text-muted">อ่านชีตล่าสุด ${fmtDT(read)}</span>` : ''}
    ${pill('ok')}${pill('wait')}${pill('bad')}${f ? '<button class="text-xs underline" data-act="sheet-filter" data-v="">ดูทั้งหมด</button>' : '<span class="text-xs text-muted">กดเพื่อกรอง</span>'}
    <button class="text-xs underline ml-auto" data-act="sheet-live" ${SH_LIVE && SH_LIVE.busy ? 'disabled' : ''}>${SH_LIVE && SH_LIVE.busy ? 'กำลังอ่านชีตจริง…' : 'อ่านชีตจริงอีกครั้ง'}</button>${SH_LIVE && SH_LIVE.at ? `<span class="text-xs text-muted">ชีตจริง ${fmtDT(SH_LIVE.at)}${(SH_LIVE.bad || []).length ? ' · อ่านไม่ได้: ' + esc(SH_LIVE.bad.join(', ')) : ''}</span>` : ''}</div>`;
}
Object.assign(ACTIONS, {
  'sheet-live'() { shLiveRead(true); },
  'sheet-filter'(el) { S.filters.shst = S.filters.shst === el.dataset.v ? '' : el.dataset.v; render(); },
  // take the sheet's text: the lock box opens with it typed in (the usual picker: booking / temporary / dealer)
  'sheet-use'(el) {
    const D = derive(), c = D.cars.get(el.dataset.vin), s = c && carSheetSt(c, D); if (!s || !s.sheet) return;
    S.lt = { vin: c.vin, q: s.sheet, mode: s.l ? 'edit' : 'new', old: s.l ? s.l.id : null }; render();
    setTimeout(() => { const i = document.getElementById('lt-in'); if (i) { i.focus(); i.scrollIntoView({ block: 'center' }); } }, 0);
  }
});
