
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
  const extra = rows.filter(r => !inv.has(r.vin)).map(r => { const a = at.get(r.vin), money = rptMoneyCheck(r, a, D, false); return { vin: r.vin, br: r.br, row: r, a, inv: D.invByVin.get(r.vin), st: 'extra', money, tone: money.tone, todo: money.tone === 'warn' || money.tone === 'bad' }; });
  [...list, ...extra].forEach(x => { if (!x.row) return; const d = x.a && x.a.rec && x.a.rec.deal; x.nochoose = !!x.a && (!d || !d.at || !d.campaign_id || d.campaign_id === 'pending'); x.mism = /เว็บไม่ตรงไฟล์|เว็บ [\d,]+/.test(String(x.money && x.money.html).replace(/<[^>]+>/g, ' ')); if (x.nochoose || x.mism) x.todo = true; });
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
// summary: tiles + per-branch table (the per-car list is ccCars)
function ccSummary(D, rep, B) {
  const ym = rptMonth(rep), L = B.list;
  const cnt = f => L.filter(f).length, miss = cnt(x => x.st === 'missing'), wait = cnt(x => x.st === 'wait');
  const all = [...L, ...B.extra], tiles = [
    ['ใบกำกับเดือนนี้', L.length, 'จ่ายเงินตามเดือนที่ออกใบกำกับ', ''],
    ['อยู่ในไฟล์ Honda', cnt(x => x.row), `Delivered ${cnt(x => x.st === 'ok')} · Allocated ${cnt(x => x.st === 'alloc')}`, 'inf'],
    ['ใบกำกับแต่ไม่อยู่ในไฟล์', miss + wait, miss ? `${miss} คันต้องใส่เหตุผล` + (wait ? ` · รอไฟล์ ${wait}` : '') : wait ? `รอไฟล์ครบ ${wait} คัน (ยังไม่เตือน)` : 'ครบ', 'missing'],
    ['มีในไฟล์ ไม่มีใบกำกับเดือนนี้', B.extra.length, 'ตรวจว่าเป็นใบกำกับเดือนอื่นหรือไม่', 'extra'],
    ['ต้องเลือก/แก้แคมเปญ', all.filter(x => x.todo && x.row).length, 'ยังไม่เลือก หรือเว็บไม่ตรงไฟล์', 'todo']
  ];
  return `<div class="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">${tiles.map(([t, n, sub, go]) => `<button type="button" class="p-3 rounded-lg border border-line bg-surface text-left hover:bg-surface2" data-act="cc-f" data-f="${go}" data-t="rpt-s2"><div class="text-xs text-muted">${esc(t)}</div><div class="text-2xl font-head font-semibold">${n}</div><div class="text-xs text-muted">${esc(sub)}</div></button>`).join('')}</div>
  <p class="text-xs text-muted mb-3">สาขาที่แอดมินยังไม่กด "ยืนยันไฟล์ครบ" จะแสดง "รอไฟล์" และไม่เตือนคันที่ไม่อยู่ในไฟล์ · คันที่ออกใบกำกับปลายเดือนแล้วส่งมอบเดือนถัดไป ไฟล์ระบุเป็น Allocated จะไม่เตือน</p>
  ${ccBranchTable(D, ym, B)}`;
}
// the one per-car table: invoiced cars + cars only in Honda's file; choose campaign, reason and money in the same row
function ccCars(D, rep, B) {
  const F = S.filters.ccF || '', all = [...B.list, ...B.extra], pick = f => all.filter(f).length;
  const chips = [['', 'ทั้งหมด', all.length], ['todo', 'ต้องทำ', pick(x => x.todo)], ['nochoose', 'ยังไม่เลือกแคมเปญ', pick(x => x.nochoose)], ['mism', 'เว็บไม่ตรงไฟล์', pick(x => x.mism)], ['missing', 'ไม่อยู่ในไฟล์', pick(x => ['missing', 'wait', 'explained'].includes(x.st))], ['alloc', 'Allocated', pick(x => x.st === 'alloc')], ['extra', 'มีในไฟล์ ไม่มีใบกำกับ', B.extra.length], ['ok', 'ปกติ', pick(x => x.st === 'ok' && !x.todo)]];
  const flt = x => !F || F === 'inf' ? (F === 'inf' ? !!x.row : true) : F === 'todo' ? x.todo : F === 'nochoose' ? x.nochoose : F === 'mism' ? x.mism : F === 'missing' ? ['missing', 'wait', 'explained'].includes(x.st) : F === 'ok' ? x.st === 'ok' && !x.todo : x.st === F;
  const show = all.filter(flt).sort((a, b) => (b.todo ? 1 : 0) - (a.todo ? 1 : 0) || String(a.br).localeCompare(String(b.br)));
  const stChip = x => ({ ok: chip('Delivered', 'good'), alloc: chip('Allocated – รอส่งมอบ', 'muted'), wait: chip('รอไฟล์', 'muted'), missing: chip('ไม่อยู่ในไฟล์', 'bad'), explained: chip('ไม่อยู่ในไฟล์ · มีเหตุผล', 'warn'), extra: chip(x.row && rptKind(x.row.st) === 'adv' ? 'Allocated · ไม่มีใบกำกับเดือนนี้' : 'ไม่มีใบกำกับเดือนนี้', 'warn') }[x.st] || '');
  const body = show.map(x => {
    const r = x.row, nm = x.a ? x.a.cust : x.inv ? x.inv.cust || '' : '', idt = x.inv && x.inv.idate ? fmtD(String(x.inv.idate).slice(0, 10)) : '–';
    return `<tr><td><span class="vin-auto font-mono text-xs">${esc(x.vin)}</span><div class="text-xs text-muted">${esc(x.br || '')} ${esc(nm)}${r && r.name ? ' · ' + esc(r.name) : ''}</div></td>
      <td class="text-xs nowrap">${esc(idt)}</td><td>${stChip(x)}</td>
      <td>${r ? optTip(r.opt, false) : '–'}</td><td class="text-right num">${r ? (r.pay ? money(r.pay) : rptPickMoney(r, x.a, D, false)) : '–'}</td>
      <td class="text-xs">${r && r.acts.length ? r.acts.map(y => esc(String(y.name).replace(/^SP\d+\/\d+ ?: ?/, '').slice(0, 40)) + ' ' + money(y.amt)).join('<br>') : '–'}</td>
      <td class="text-right num"><b>${r && r.tot ? money(r.tot) : '–'}</b></td>
      <td class="text-xs">${x.money ? x.money.html : ''}${r ? rptEditBtn(r, x.a) : ''}</td><td class="text-xs">${ccWhyCell(x)}</td></tr>`;
  }).join('');
  const shown = show.filter(x => x.row);
  return `<div class="flex flex-wrap gap-1 mb-2" role="group" aria-label="กรอง">${chips.map(([v, t, n]) => `<button type="button" class="btn btn-sm ${F === v ? 'btn-dark' : 'btn-ghost'}" data-act="cc-f" data-f="${v}">${esc(t)} ${n}</button>`).join('')}</div>
  <div class="bg-surface border border-line rounded-lg overflow-x-auto"><table class="tbl"><thead><tr><th>VIN / ลูกค้า</th><th>ใบกำกับ</th><th>ตามไฟล์ Honda</th><th>ทางเลือก</th><th class="text-right">เงินทางเลือก</th><th>แคมเปญพิเศษ</th><th class="text-right">รวมเงิน</th><th>แคมเปญ / เทียบเว็บ</th><th>เหตุผล (เมื่อไม่อยู่ในไฟล์)</th></tr></thead><tbody>${body || '<tr><td colspan="9" class="text-muted text-sm">ไม่มีรายการ</td></tr>'}<tr class="rpt-tot"><td colspan="4"><b>รวม ${shown.length} คันที่อยู่ในไฟล์</b></td><td class="text-right num"><b>${money(sumBy(shown, x => x.row.pay + x.row.est))}</b></td><td></td><td class="text-right num"><b>${money(sumBy(shown, x => x.row.tot))}</b></td><td colspan="2"></td></tr></tbody></table></div>`;
}
async function ccSave(patch) { const cur = ccRef(); return write('ref', 'honda_pay', { ...cur, ...patch }); }
Object.assign(ACTIONS, {
  'cc-f'(el) { S.filters.ccF = el.dataset.f || ''; render(); if (el.dataset.t) { const e = document.getElementById(el.dataset.t); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
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
