
// ---------- ปิดเดือน (26/10): every car invoiced in a month against Honda's file for that month.
// Reward money is paid by INVOICE month. A car invoiced but missing from the file needs a reason - unless the admin has not yet
// confirmed that branch's file complete ("รอไฟล์"). ALLOCATED in the file = invoiced, waiting delivery: never a warning.
// Kept in ref/honda_pay: closed {"BR|YYYY-MM": {by,at}} (file confirmed complete), why {vin: {r,t,by,at}} (reason for a missing car).
const CC_WHY = { forgot: 'ลืมเบิก – จะเบิกเดือนหน้า', notrec: 'Honda ยังไม่รับรอง', noelig: 'ไม่เข้าเงื่อนไขแคมเปญ', other: 'อื่น ๆ (พิมพ์เอง)' };
const ccRef = () => S.ref.get('honda_pay') || { v: {} };
const ccKey = (br, ym) => br + '|' + ym;
function ccMonths(D) {
  const s = new Set();
  (D.X.inv || []).forEach(i => { if (i.vin && !i.company && i.idate) s.add(String(i.idate).slice(0, 7)); });
  Object.values(rptAll()).forEach(r => { const m = rptMonth(r.rep); if (m) s.add(m); });
  return [...s].filter(Boolean).sort().reverse();
}
function ccBuild(D, ym) {
  const br = rptBr(), ref = ccRef(), closed = ref.closed || {}, why = ref.why || {};
  const rep = Object.values(rptAll()).map(r => r.rep).find(x => rptMonth(x) === ym);
  const rows = rep ? rptRows(rep) : [], byVin = new Map(rows.map(r => [r.vin, r])), at = rptByVin(D);
  const inv = new Map();
  (D.X.inv || []).forEach(i => { if (i.vin && !i.company && i.idate && String(i.idate).slice(0, 7) === ym && (!br || i.br === br)) inv.set(String(i.vin).toUpperCase(), i); });
  const list = [];
  inv.forEach((i, vin) => {
    const f = byVin.get(vin), complete = !!closed[ccKey(i.br, ym)], a = at.get(vin);
    let st = f ? (rptKind(f.st) === 'adv' ? 'alloc' : 'ok') : complete ? (why[vin] ? 'explained' : 'missing') : 'wait', money = null, tone = '';
    if (f) { money = rptMoneyCheck(f, a, D, false); tone = money.tone; }
    list.push({ vin, br: i.br, inv: i, row: f, a, st, money, tone, todo: st === 'missing' || tone === 'warn' || tone === 'bad', why: why[vin] });
  });
  const extra = rows.filter(r => !inv.has(r.vin)).map(r => ({ vin: r.vin, br: r.br, row: r, inv: D.invByVin.get(r.vin), st: 'extra' }));
  return { rep, list, extra, closed, rows };
}
function ccBranchTable(D, ym, B) {
  const brs = (rptBr() ? [rptBr()] : BRS).filter(b => B.list.some(x => x.br === b) || B.extra.some(x => x.br === b));
  if (!brs.length) return '';
  const body = brs.map(b => {
    const L = B.list.filter(x => x.br === b), E = B.extra.filter(x => x.br === b), c = B.closed[ccKey(b, ym)], cnt = f => L.filter(f).length;
    const file = sumBy(L.filter(x => x.row), x => x.row.tot);
    const btn = rptEditCan(b) ? `<button type="button" class="btn ${c ? 'btn-ghost' : 'btn-dark'} btn-sm" data-act="cc-done" data-br="${b}" data-ym="${ym}">${c ? 'ยกเลิกยืนยัน' : 'ยืนยันไฟล์ครบ'}</button>` : '';
    return `<tr><td><b>${b}</b> <span class="text-xs text-muted">${esc(BR[b].name)}</span></td>
      <td class="num text-right">${L.length}</td><td class="num text-right">${cnt(x => x.row)}</td>
      <td class="num text-right">${cnt(x => x.st === 'missing') ? `<button type="button" class="font-semibold text-bad" data-act="cc-f" data-f="missing">${cnt(x => x.st === 'missing')}</button>` : cnt(x => x.st === 'wait') ? `<span class="text-muted">รอไฟล์ (${cnt(x => x.st === 'wait')})</span>` : '0'}</td>
      <td class="num text-right">${cnt(x => x.st === 'alloc')}</td><td class="num text-right">${cnt(x => x.todo && x.row)}</td><td class="num text-right">${E.length}</td>
      <td class="num text-right">${money(file)}</td><td>${c ? chip('ไฟล์ครบ', 'good') : chip('รอไฟล์', 'muted')} ${btn}</td></tr>`;
  }).join('');
  return `<div class="overflow-x-auto mb-4"><table class="tbl"><thead><tr><th>สาขา</th><th class="text-right">ใบกำกับ</th><th class="text-right">อยู่ในไฟล์</th><th class="text-right">ไม่อยู่ในไฟล์</th><th class="text-right">Allocated</th><th class="text-right">ต้องเลือก/แก้แคมเปญ</th><th class="text-right">มีในไฟล์ ไม่มีใบกำกับ</th><th class="text-right">เงินตามไฟล์</th><th>สถานะไฟล์</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
function ccWhyCell(x) {
  if (x.st !== 'missing' && x.st !== 'explained') return x.st === 'wait' ? '<span class="text-xs text-muted">รอไฟล์ครบก่อน</span>' : '';
  if (!rptEditCan(x.br)) return x.why ? esc(CC_WHY[x.why.r] || '') + (x.why.t ? ' · ' + esc(x.why.t) : '') : chip('ต้องใส่เหตุผล', 'bad');
  const w = x.why || {};
  return `<select data-cc-why="${esc(x.vin)}" aria-label="เหตุผล"><option value="">– เลือกเหตุผล –</option>${Object.entries(CC_WHY).map(([k, v]) => `<option value="${k}" ${w.r === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>${w.r === 'other' ? `<input class="mt-1 w-full" data-cc-whyt="${esc(x.vin)}" value="${esc(w.t || '')}" placeholder="พิมพ์เหตุผล" aria-label="เหตุผลอื่น ๆ">` : ''}`;
}
function ccSection(D, rep) {
  const ym = rptMonth(rep);
  const B = ccBuild(D, ym), F = S.filters.ccF || '', L = B.list;
  const cnt = f => L.filter(f).length, miss = cnt(x => x.st === 'missing'), wait = cnt(x => x.st === 'wait');
  const tiles = [
    ['ใบกำกับเดือนนี้', L.length, 'จ่ายเงินตามเดือนที่ออกใบกำกับ', ''],
    ['อยู่ในไฟล์ Honda', cnt(x => x.row), `Delivered ${cnt(x => x.st === 'ok')} · Allocated ${cnt(x => x.st === 'alloc')}`, ''],
    ['ใบกำกับแต่ไม่อยู่ในไฟล์', miss + wait, miss ? `${miss} คันต้องใส่เหตุผล` + (wait ? ` · รอไฟล์ ${wait}` : '') : wait ? `รอไฟล์ครบ ${wait} คัน (ยังไม่เตือน)` : 'ครบ', 'missing'],
    ['มีในไฟล์ ไม่มีใบกำกับเดือนนี้', B.extra.length, 'ตรวจว่าเป็นใบกำกับเดือนอื่นหรือไม่', 'extra'],
    ['ต้องเลือก/แก้แคมเปญ', cnt(x => x.todo && x.row), 'ยังไม่เลือก หรือเว็บไม่ตรงไฟล์', 'todo']
  ];
  const chips = [['', 'ทั้งหมด'], ['todo', 'ต้องทำ'], ['missing', 'ไม่อยู่ในไฟล์'], ['alloc', 'Allocated'], ['ok', 'ปกติ'], ['extra', 'มีในไฟล์ ไม่มีใบกำกับ']];
  const show = F === 'extra' ? B.extra : L.filter(x => !F || (F === 'todo' ? x.todo : F === 'missing' ? x.st === 'missing' || x.st === 'wait' || x.st === 'explained' : F === 'ok' ? x.st === 'ok' && !x.todo : x.st === F));
  const stChip = x => ({ ok: chip('Delivered ในไฟล์', 'good'), alloc: chip('Allocated – รอส่งมอบ', 'muted'), wait: chip('รอไฟล์', 'muted'), missing: chip('ไม่อยู่ในไฟล์', 'bad'), explained: chip('ไม่อยู่ในไฟล์ · มีเหตุผล', 'warn'), extra: chip('ไม่มีใบกำกับเดือนนี้', 'warn') }[x.st] || '');
  const rowsHtml = show.map(x => {
    const nm = x.inv ? x.inv.cust || '' : '', r = x.row;
    return `<tr><td><span class="vin-auto font-mono text-xs">${esc(x.vin)}</span><div class="text-xs text-muted">${esc(x.br || '')} ${esc(nm)}</div></td>
      <td class="text-xs">${x.inv && x.inv.idate ? esc(fmtD(String(x.inv.idate).slice(0, 10))) : '–'}</td><td>${stChip(x)}</td>
      <td class="text-right num">${r ? money(r.tot) : '–'}</td>
      <td class="text-xs">${x.money ? x.money.html : r ? '<span class="text-muted">ไม่พบใบจอง</span>' : ''}${x.st === 'extra' && x.inv ? `<span class="text-muted">ใบกำกับ ${esc(fmtD(String(x.inv.idate).slice(0, 10)))}</span>` : ''}</td>
      <td class="text-xs">${ccWhyCell(x)}</td></tr>`;
  }).join('');
  return `  <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">${tiles.map(([t, n, sub, go]) => `<button type="button" class="p-3 rounded-lg border border-line bg-surface text-left hover:bg-surface2" data-act="cc-f" data-f="${go}"><div class="text-xs text-muted">${esc(t)}</div><div class="text-2xl font-head font-semibold">${n}</div><div class="text-xs text-muted">${esc(sub)}</div></button>`).join('')}</div>
  <p class="text-xs text-muted mb-3">สาขาที่แอดมินยังไม่กด "ยืนยันไฟล์ครบ" จะแสดง "รอไฟล์" และไม่เตือนคันที่ไม่อยู่ในไฟล์ · คันที่ออกใบกำกับปลายเดือนแล้วส่งมอบเดือนถัดไป ไฟล์ระบุเป็น Allocated จะไม่เตือน</p>
  ${ccBranchTable(D, ym, B)}
  <div class="flex flex-wrap gap-1 mb-2" role="group" aria-label="กรอง">${chips.map(([v, t]) => `<button type="button" class="btn btn-sm ${F === v ? 'btn-dark' : 'btn-ghost'}" data-act="cc-f" data-f="${v}">${esc(t)}</button>`).join('')}</div>
  <div class="overflow-x-auto"><table class="tbl"><thead><tr><th>VIN</th><th>วันที่ใบกำกับ</th><th>ตามไฟล์ Honda</th><th class="text-right">เงินตามไฟล์</th><th>แคมเปญ / เทียบเว็บ</th><th>เหตุผล (เมื่อไม่อยู่ในไฟล์)</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="6" class="text-muted text-sm">ไม่มีรายการ</td></tr>'}</tbody></table></div>`;
}
async function ccSave(patch) { const cur = ccRef(); return write('ref', 'honda_pay', { ...cur, ...patch }); }
Object.assign(ACTIONS, {
  'cc-f'(el) { S.filters.ccF = el.dataset.f || ''; render(); },
  async 'cc-done'(el) {
    const br = el.dataset.br, ym = el.dataset.ym; if (!rptEditCan(br)) { toast('แก้ไม่ได้', 'bad'); return; }
    const closed = { ...(ccRef().closed || {}) }, k = ccKey(br, ym);
    if (closed[k]) delete closed[k]; else closed[k] = actor();
    if (await ccSave({ closed })) { toast(closed[k] ? `ยืนยันไฟล์ ${br} ครบแล้ว` : 'ยกเลิกการยืนยันแล้ว'); render(); }
  }
});
document.addEventListener('change', async ev => {
  const t = ev.target; if (!t || !t.dataset) return;
  if (t.dataset.ccWhy !== undefined || t.dataset.ccWhyt !== undefined) {
    const vin = String(t.dataset.ccWhy || t.dataset.ccWhyt).toUpperCase(), why = { ...(ccRef().why || {}) }, cur = why[vin] || {};
    if (t.dataset.ccWhy !== undefined) { if (!t.value) delete why[vin]; else why[vin] = { ...actor(), r: t.value, t: t.value === 'other' ? cur.t || '' : '' }; }
    else why[vin] = { ...cur, ...actor(), t: t.value.trim() };
    if (await ccSave({ why })) render();
  }
});
