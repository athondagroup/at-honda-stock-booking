// ------------------------------------------------------------------ export, duplicate delivery notes, cancellation history,
// booking history, and the approval inbox by topic with the manager's own priorities.
// Only function declarations here: the first render runs before this part of the file.

// ---------- export: an Excel file (sheets and filters picked by the person) or a one-page summary as PDF / picture.
// Everyone can export what their role can see on the screen; sales never get other sales' customer names.
function exportBtn() { return ['stock', 'book', 'quota', 'lock'].includes(S.view) ? `<button class="btn btn-ghost" data-act="export-open">ส่งออกหน้านี้ (Excel)</button>${typeof dioCan === 'function' && dioCan() ? '<button class="btn btn-ghost" data-act="dio-open">ข้อมูลทั้งหมด (Excel)</button>' : ''}` : ''; }
function exportSheets() { return [['stock', 'Stock รายคัน'], ['book', 'Booking (ฟอร์ม AT + IDS)'], ['quota', 'Quota'], ['lock', 'ล็อกรถ'], ['spec', 'สรุปสต็อกตามสเปก']]; }
function exportModal(m, D) {
  const ck = (k, t) => `<label class="flex items-center gap-2 text-sm"><input type="checkbox" class="w-5 h-5" data-modal="sheets.${k}" ${m.sheets[k] ? 'checked' : ''}>${t}</label>`;
  const models = [...new Set([...D.cars.values()].map(c => c.model).filter(Boolean))].sort();
  return `<div class="flex items-start justify-between gap-3 mb-3"><h2 class="font-head text-xl font-semibold">ส่งออกหน้านี้</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="flex flex-col gap-4">
    <div class="seg" role="group" aria-label="รูปแบบ"><button data-act="export-fmt" data-v="xlsx" aria-pressed="${m.fmt === 'xlsx'}">Excel (.xlsx)</button><button data-act="export-fmt" data-v="sum" aria-pressed="${m.fmt === 'sum'}">สรุป 1 หน้า (PDF / รูป)</button></div>
    ${m.fmt === 'xlsx' ? `<fieldset class="flex flex-col gap-2"><legend class="text-sm font-medium mb-1">ชีตที่ต้องการ</legend>${exportSheets().map(([k, t]) => ck(k, t)).join('')}</fieldset>` : '<p class="text-sm text-muted">สรุปรถว่าง/ทั้งหมดตามสเปกและสาขา ใบจองรอรถ และ Quota ที่ยังว่าง ใช้ส่งไลน์หรือรายงานผู้บริหาร</p>'}
    <div class="grid sm:grid-cols-3 gap-3">
      <div class="field"><label for="ex-br">สาขา</label><select id="ex-br" data-modal="br"><option value="">ทุกสาขา</option>${BRS.map(b => `<option value="${b}" ${m.br === b ? 'selected' : ''}>${b} ${BR[b].name}</option>`).join('')}</select></div>
      <div class="field"><label for="ex-md">รุ่น</label><select id="ex-md" data-modal="model"><option value="">ทุกรุ่น</option>${models.map(x => `<option ${m.model === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
      ${m.fmt === 'xlsx' ? `<div class="field"><label for="ex-cs">สถานะรถ (Stock)</label><select id="ex-cs" data-modal="carSt"><option value="">ทุกสถานะ</option>${Object.entries(CAR_STATUS).map(([k, v]) => `<option value="${k}" ${m.carSt === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
      <div class="field"><label for="ex-bs">ใบจอง (Booking)</label><select id="ex-bs" data-modal="bookSt">${BOOK_FILTERS.map(([k, t]) => `<option value="${k}" ${m.bookSt === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label for="ex-f">จองตั้งแต่</label><input id="ex-f" type="date" data-modal="from" value="${esc(m.from || '')}"></div>
      <div class="field"><label for="ex-t">ถึง</label><input id="ex-t" type="date" data-modal="to" value="${esc(m.to || '')}"></div>` : ''}
    </div>
    <p class="text-xs text-muted">ได้ข้อมูลตามสิทธิ์ที่เห็นในหน้าเว็บ${isSales() ? ' (เซลล์ไม่เห็นชื่อลูกค้าของเซลล์อื่น)' : ''} · ข้อมูล ณ ${fmtDT(new Date().toISOString())}</p>
    ${m.fmt === 'xlsx' && m.preview ? exportPreview(m, D) : ''}
    <div class="flex flex-wrap justify-end gap-2"><button class="btn btn-ghost" data-act="close">ยกเลิก</button>
      ${m.fmt === 'xlsx' ? `<button class="btn btn-ghost" data-act="export-preview" aria-pressed="${!!m.preview}">${m.preview ? 'ซ่อนตัวอย่าง' : 'แสดงตัวอย่าง'}</button>` : ''}
      ${m.fmt === 'xlsx' ? `<button class="btn btn-red" data-act="export-go" ${m.busy ? 'disabled' : ''}>${m.busy ? '<span class="spin"></span> กำลังสร้างไฟล์…' : 'สร้างไฟล์ Excel'}</button>` : '<button class="btn btn-red" data-act="export-sum">ดูสรุปและบันทึก</button>'}</div>
  </div>`;
}
// what the file will hold, sheet by sheet, before it is made: row counts and the first rows of the picked sheet
function exportPreview(m, D) {
  const rows = exportRows(m, D), keys = Object.keys(rows), names = Object.fromEntries(exportSheets());
  if (!keys.length) return '<p class="text-sm" style="color:var(--bad)">เลือกอย่างน้อย 1 ชีต</p>';
  const cur = keys.includes(m.pv) ? m.pv : keys[0], aoa = rows[cur], N = 20;
  return `<div class="border border-line rounded-lg p-3 min-w-0"><div class="flex flex-wrap gap-2 mb-2" role="tablist">${keys.map(k => `<button class="btn btn-sm ${k === cur ? 'btn-dark' : 'btn-ghost'}" role="tab" aria-selected="${k === cur}" data-act="export-pv" data-k="${k}">${esc(names[k])} <span class="num">${rows[k].length - 1}</span></button>`).join('')}</div>
    ${aoa.length > 1 ? `<div class="scroll-x max-h-72 overflow-auto"><table class="tbl text-xs"><thead><tr>${aoa[0].map(h => `<th class="nowrap">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${aoa.slice(1, N + 1).map(r => `<tr>${r.map(c => `<td class="nowrap">${esc(String(c ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="text-xs text-muted mt-1">${aoa.length - 1 > N ? `แสดง ${N} แถวแรกจาก ${aoa.length - 1} แถว` : `ทั้งหมด ${aoa.length - 1} แถว`} · ไฟล์จริงมีครบทุกแถว</p>` : '<p class="text-sm text-muted">ไม่มีข้อมูลตามตัวกรองนี้</p>'}</div>`;
}
// an IDS booking with no AT form: pair it with an AT form already keyed (name typed differently, another spelling)
function idsPairCands(b, D) {
  const bk = nameKey(b.cust || '');
  return D.at.filter(a => !a.cancelled && !a.demo && !a.match && atVisible(a) && canEditBooking(a))
    .map(a => ({ a, ns: keyScore(nameKey(a.cust || ''), bk), same: a.model === b.model, br: a.br === b.br, sales: b.sales && sameName(a.sales || '', b.sales) }))
    .filter(x => x.ns || x.same)
    .sort((x, y) => y.ns - x.ns || (y.same && y.br) - (x.same && x.br) || y.sales - x.sales || Math.abs(daysBetween(x.a.date || b.date, b.date)) - Math.abs(daysBetween(y.a.date || b.date, b.date)))
    .slice(0, 30);
}
function idsPairModal(m, D) {
  const b = D.idsB.find(x => x.key === m.key);
  if (!b) return '<p>ไม่พบใบจองนี้ใน IDS แล้ว</p><div class="flex justify-end mt-3"><button class="btn btn-ghost" data-act="close">ปิด</button></div>';
  const list = idsPairCands(b, D).filter(x => !m.q || searchKey(x.a.cust + ' ' + (x.a.sales || '')).includes(searchKey(m.q)));
  return `<div class="flex items-start justify-between gap-3 mb-2"><h2 class="font-head text-xl font-semibold">จับคู่ใบจอง IDS กับฟอร์ม AT ที่มีอยู่</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="p-3 rounded-lg text-sm mb-3" style="background:var(--surface-2)"><b>IDS ${esc(b.no || '')}</b> · ${esc(b.cust || '')} · ${esc(b.br || '')} · ${esc(specLabelText(b.spec))} · จอง ${fmtD(b.date)} · ชื่อเซลล์ใน IDS ${esc(b.sales || '–')}</div>
  <div class="field mb-2"><label for="ip-q">ค้นหาชื่อลูกค้าหรือเซลล์ในฟอร์ม AT</label><input id="ip-q" type="search" data-modal="q" value="${esc(m.q || '')}"></div>
  <p class="text-xs text-muted mb-2">แสดงฟอร์ม AT ที่ยังไม่ได้จับคู่กับ IDS ชื่อใกล้เคียงหรือรุ่นเดียวกันขึ้นก่อน เลือกแล้วระบบใช้ข้อมูล IDS ใบนี้กับฟอร์มนั้น</p>
  <div class="border border-line rounded-lg divide-y divide-line max-h-80 overflow-auto">${list.map(x => `<div class="p-3 flex flex-wrap gap-x-4 gap-y-1 items-center text-sm">
    <div class="flex-1 min-w-[180px]"><div class="font-medium">${esc(x.a.cust || '')} ${x.ns >= 2 ? chip('ชื่อใกล้เคียง', 'good') : ''}</div><div class="text-xs text-muted">${esc(specLabelText(x.a.spec))} ${x.same ? '' : chip('คนละรุ่น', 'warn')} · จอง ${fmtD(x.a.date)} · ${esc(x.a.br || '')} · ${esc(x.a.sales || '')}</div></div>
    <button class="btn btn-ghost btn-sm" data-act="idspair-pick" data-id="${esc(x.a.id)}">จับคู่ใบนี้</button></div>`).join('') || `<div class="p-3">${emptyBox('ไม่พบฟอร์ม AT ที่ยังไม่จับคู่', 'ถ้ายังไม่ได้ลงฟอร์ม กด "ลงฟอร์ม AT"')}</div>`}</div>
  <div class="flex flex-wrap justify-end gap-2 mt-3"><button class="btn btn-ghost" data-act="close">ยกเลิก</button><button class="btn btn-dark" data-act="ids-claim" data-id="${esc(b.no)}">ไม่มี ลงฟอร์ม AT ใหม่</button></div>`;
}
function exCust(name, owner) { return isSales() && owner !== S.role.sales ? (name ? 'ลูกค้าของเซลล์อื่น' : '') : (name || ''); }
function exportRows(m, D) {
  const brOk = x => !m.br || x.br === m.br, mdOk = x => !m.model || x.model === m.model;
  const out = {};
  if (m.sheets.stock) {
    const cars = [...D.cars.values()].filter(carVisible).filter(brOk).filter(mdOk).filter(c => !m.carSt || c.status === m.carSt)
      .sort((a, b) => (a.br || '').localeCompare(b.br || '') || a.spec.localeCompare(b.spec) || (b.age ?? -1) - (a.age ?? -1));
    out.stock = [['หมายเลขตัวถัง', 'สาขา', 'รุ่น', 'เกรด', 'สี', 'ปี', 'สถานะ', 'วันผลิต', 'วันผลิตจาก', 'อายุ (วัน)', 'วันฝากศูนย์', 'Ref', 'เลขที่ใบจอง', 'ลูกค้า', 'เซลล์', 'ล็อก', 'ล็อกหมด', 'ข้อความในชีต'],
      ...cars.map(c => { const l = c.lock; return [c.vin, c.br, c.model, gradeShort(c.model, c.grade), c.color, c.year || '', (CAR_STATUS[c.status] || [c.status])[0], c.prod || '', c.prodSrc === 'IDS' ? 'IDS' : c.prodSrc ? 'คีย์จากป้าย' : '',
        c.age ?? '', c.consign || '', c.ref || '', isSales() ? '' : c.bk || '', isSales() ? '' : exCust(c.cust, c.sales), isSales() ? '' : c.sales || '',
        l ? `${LOCK_TYPE[l.type]?.[0] || l.type}${l.status === 'pending' ? ' (รออนุมัติ)' : ''} ${isSales() && !isMine(l.owner) ? '' : l.owner || l.dealer_name || ''}`.trim() : c.temps.length ? `ล็อกชั่วคราว ${c.temps.length} คน` : '', l && l.end ? l.end : '', isSales() ? '' : c.bknote || '']; })];
  }
  if (m.sheets.book) {
    const rows = bookRows(D).filter(r => rowVisible(r) && brOk(r) && mdOk(r) && rowState(r, D, m.bookSt || 'active') && (!m.from || (r.date || '') >= m.from) && (!m.to || (r.date || '') <= m.to))
      .sort((x, y) => (y.date || '').localeCompare(x.date || ''));
    out.book = [['วันที่จอง', 'เลขที่ใบจอง IDS', 'ลูกค้า', 'เซลล์เจ้าของ (AT)', 'ชื่อเซลล์ใน IDS', 'สาขา', 'รุ่น', 'เกรด', 'สี', 'สถานะ', 'ขั้นต่อไป', 'เงื่อนไข', 'ไฟแนนซ์', 'สถานะไฟแนนซ์', 'มัดจำ', 'เลขที่ใบเสร็จ', 'VIN', 'อยู่ในระบบ', 'ยกเลิก'],
      ...rows.map(r => { const a = r.a, rec = a ? a.rec : {}, [mo, g, c] = String(r.spec || '').split('|');
        return [r.date || '', r.no || '', exCust(r.cust, r.owner), r.owner || '', r.idsSales || '', r.br || '', mo, gradeShort(mo, g), c,
          a && a.cancelled ? 'ยกเลิก' : a && a.done ? 'ส่งมอบแล้ว' : r.row ? (BOOK_STATE[r.row.state] || [r.row.state])[0] : '', a && a.flow && a.flow.next ? FLOW_LABEL[a.flow.next] : '',
          rec.purchase || '', rec.finance || '', rec.fin_status || '', rec.deposit || '', rec.receipt_no || '', r.vin || (rec.flow && rec.flow.assign && rec.flow.assign.vin) || '',
          a && r.b ? 'ฟอร์ม AT + IDS' : a ? 'ฟอร์ม AT' : 'IDS', a && a.cancelled ? `${(rec.cancel || {}).reason || ''}` : '']; })];
  }
  if (m.sheets.quota) {
    const qs = D.quota.filter(quotaVisible).filter(brOk).filter(mdOk).sort((a, b) => (a.m || '').localeCompare(b.m || '') || (a.br || '').localeCompare(b.br || ''));
    out.quota = [['Ref', 'เดือน', 'Week', 'สาขา', 'รุ่น', 'เกรด', 'สี', 'สถานะ', 'VIN', 'เลขที่ใบจอง', 'ลูกค้า', 'ล็อก'],
      ...qs.map(q => [q.ref, q.m || '', q.week || '', q.br, q.model, gradeShort(q.model, q.grade), q.color, (QUOTA_STATUS[q.st] || [q.st])[0], q.vin || '', isSales() ? '' : q.bk || '',
        q.booking ? exCust(q.booking.cust, q.booking.owner) : q.branchHold ? `กันไว้ให้สาขา ${q.branchHold}` : '', q.lock ? `${LOCK_TYPE[q.lock.type]?.[0] || ''} ${isSales() && !isMine(q.lock.owner) ? '' : q.lock.owner || ''}`.trim() : ''])];
  }
  if (m.sheets.lock) {
    const ls = D.locks.filter(lockVisible).filter(l => !m.br || l.car_br === m.br).filter(l => !m.model || String(l.spec || '').startsWith(m.model + '|'))
      .sort((a, b) => (b.requested_at || '').localeCompare(a.requested_at || ''));
    out.lock = [['รถ / Quota', 'สาขารถ', 'รุ่น เกรด สี', 'ประเภท', 'สถานะ', 'เซลล์', 'ลูกค้า / ดีลเลอร์', 'เริ่ม', 'หมด', 'ขอเมื่อ', 'ข้อความในชีต'],
      ...ls.map(l => [l.vin || `Quota ${l.ref}`, l.car_br || '', specLabelText(l.spec), LOCK_TYPE[l.type]?.[0] || l.type,
        l.status === 'approved' ? (l.autoReleased ? 'ปล่อยคิวแล้ว' : l.expired ? 'หมดอายุ' : 'ล็อก') : ({ pending: 'รออนุมัติ', allocated: 'แจ้งจัดสรรแล้ว รอไฟล์ IDS', rejected: 'ไม่อนุมัติ', released: 'ปล่อยแล้ว', withdrawn: 'ถอนคำขอ', done: 'ส่งมอบแล้ว', bumped: 'มีคนจองก่อน', converted: 'เปลี่ยนเป็นล็อกให้ใบจอง' }[l.status] || l.status),
        l.owner || l.sales_nick || '', l.type === 'dealer' ? l.dealer_name || '' : l.booking ? exCust(l.booking.cust, l.owner) : exCust(l.prospect, l.owner), l.start || '', l.end || '', (l.requested_at || '').slice(0, 10), sheetTextOf(l) || ''])];
  }
  if (m.sheets.spec) out.spec = exportSpecRows(m, D);
  return out;
}
function exportSpecRows(m, D) {
  const brs = m.br ? [m.br] : BRS;
  const keys = [...new Set([...D.cars.values()].filter(c => (!m.br || c.br === m.br) && (!m.model || c.model === m.model)).map(c => c.spec))].sort();
  return [['รุ่น เกรด สี', ...brs.map(b => `${b} ว่าง/มี`), 'ว่างรวม', 'ติดจอง', 'ล็อก', 'ใบจองรอรถ', 'Quota ว่าง'],
    ...keys.map(k => { const s = D.specs[k]; return [specLabelText(k), ...brs.map(b => `${s.freeBy[b] || 0}/${s.totalBy[b] || 0}`), m.br ? s.freeBy[m.br] || 0 : s.free, s.held, s.locked + s.pending, s.waiting, s.incoming]; })];
}
async function exportXlsx(m) {
  const D = derive(), rows = exportRows(m, D), names = { stock: 'Stock', book: 'Booking', quota: 'Quota', lock: 'ล็อกรถ', spec: 'สรุปตามสเปก' };
  if (!Object.keys(rows).length) { toast('เลือกอย่างน้อย 1 ชีต', 'bad'); return; }
  let X;
  try { X = await loadXLSX(); } catch (e) { toast('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ ลองอีกครั้ง', 'bad'); return; }
  const wb = X.utils.book_new();
  for (const [k, aoa] of Object.entries(rows)) {
    const ws = X.utils.aoa_to_sheet(aoa);
    ws['!cols'] = aoa[0].map((h, i) => ({ wch: Math.min(40, Math.max(String(h).length + 2, ...aoa.slice(1, 200).map(r => String(r[i] ?? '').length + 1))) }));
    X.utils.book_append_sheet(wb, ws, names[k]);
  }
  const buf = X.write(wb, { type: 'array', bookType: 'xlsx' });
  await docSave(docName('AT Honda', m.br || 'ทุกสาขา', todayISO()) + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
function exportSummary(m) {
  const D = derive(), spec = exportSpecRows(m, D), brs = m.br ? [m.br] : BRS;
  const sum = brs.map(b => { const s = D.sum[b]; return [`${b} ${BR[b].name}`, String(s.stock), String(s.free), String(s.locked), String(s.held), String(s.waiting), String(s.quotaIn)]; });
  const w = spec[0].length, first = 0.30, rest = (1 - first) / (w - 1);
  const docSpec = { title: 'สรุปสต็อก ใบจอง และ Quota', sub: `AT Honda · ${m.br ? `สาขา ${m.br} ${BR[m.br].name}` : 'ทุกสาขา'}${m.model ? ` · ${m.model}` : ''} · ข้อมูล ณ ${fmtDT(new Date().toISOString())}`, blocks: [
    { h: 'ภาพรวมตามสาขา' },
    { items: { cols: ['สาขา', 'รถทั้งหมด', 'ว่าง', 'ล็อก', 'ติดจอง/ขาย', 'ใบจองรอรถ', 'Quota ว่าง'], widths: [0.28, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12], rows: sum } },
    { h: 'รถตามสเปก (ว่าง/มี)' },
    { items: { cols: spec[0], widths: [first, ...Array(w - 1).fill(rest)], rows: spec.slice(1).map(r => r.map(String)) } }] };
  openDoc(docSpec, docName('สรุปสต็อก', m.br || 'ทุกสาขา', todayISO()), { ...m, busy: false });
}

// ---------- the same delivery note photographed twice: warned before a second receipt is made
function recvDupModal(m) {
  const ds = m.dups.map(id => ({ id, ...(S.receipts.get(id) || {}) }));
  const st = r => r.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอแอดมินยืนยัน';
  return `<div class="flex items-start justify-between gap-3 mb-2"><h2 class="font-head text-xl font-semibold">ใบนี้ส่งเข้ามาแล้ว</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <p class="text-sm mb-3">เลขที่เอกสาร <span class="code">${esc(m.doc.doc_no || '–')}</span> · ${(m.doc.cars || []).map(c => `<span class="code">${esc(c.vin || '?')}</span>`).join(', ')}</p>
  <div class="border border-line rounded-lg divide-y divide-line mb-4">${ds.map(r => `<div class="p-3 text-sm flex flex-wrap gap-x-4 gap-y-1 items-center">
    <span class="code font-medium">${esc(r.doc_no || 'ไม่มีเลขที่')}</span><span>${esc(r.br || '')}</span><span>${chip(st(r), r.status === 'confirmed' ? 'good' : 'warn')}</span>
    <span class="text-muted">ส่งโดย ${who(r)} ${fmtDT(r.created_at)}</span><span class="text-muted">${(r.cars || []).length} คัน</span></div>`).join('')}</div>
  <p class="text-sm text-muted mb-3">ยังไม่ได้บันทึกรูปนี้เป็นใบใหม่ เลือกว่าจะทำอย่างไร</p>
  <div class="flex flex-wrap justify-end gap-2">
    <button class="btn btn-ghost" data-act="close">ไม่บันทึก</button>
    <button class="btn btn-ghost" data-act="recvdup-new">เป็นคนละใบ บันทึกเป็นใบใหม่</button>
    <button class="btn btn-red" data-act="recvdup-attach">แนบรูปนี้เพิ่มในใบเดิม</button></div>`;
}

// ---------- every cancellation, with what happened to the deposit and the documents to print again
function cancelHistory(D) {
  const f = S.filters, months = [...new Set(D.at.filter(a => a.cancelled).map(a => ((a.rec.cancel && a.rec.cancel.at) || a.rec.cancelled_at || '').slice(0, 7)).filter(Boolean))].sort().reverse();
  let list = D.at.filter(a => a.cancelled && !a.demo && atVisible(a) && inBr(a));
  if (f.cxM) list = list.filter(a => ((a.rec.cancel && a.rec.cancel.at) || a.rec.cancelled_at || '').startsWith(f.cxM));
  if (f.cxR) list = list.filter(a => (a.rec.cancel || {}).refund === f.cxR);
  list.sort((x, y) => ((y.rec.cancel && y.rec.cancel.at) || y.rec.cancelled_at || '').localeCompare((x.rec.cancel && x.rec.cancel.at) || x.rec.cancelled_at || ''));
  const rows = list.map(a => { const c = a.rec.cancel || {}, rf = a.rec.refund;
    const dep = c.refund === 'transfer' ? `โอน ${money((c.transfer || {}).amount ?? c.amount)} บาท ${c.to ? chip('ผูกใบใหม่แล้ว', 'good') : chip('มัดจำรอโอน', 'warn')}` : c.refund === 'refund' ? `คืน ${money(c.amount)} บาท ${rf && rf.at ? chip('ทำใบคืนเงินแล้ว', 'good') : chip('ยังไม่ทำใบคืนเงิน', 'warn')}` : c.refund ? esc(REFUND[c.refund] || c.refund) : '<span class="text-muted">ไม่มีข้อมูล (ฟอร์มเดิม)</span>';
    return `<tr><td class="num nowrap">${fmtD(((c.at || a.rec.cancelled_at || '')).slice(0, 10))}</td><td>${custCell(a.cust, a.sales)}<div class="text-xs text-muted">${specLabelText(a.spec)} · จอง ${fmtD(a.date)}</div></td>
      <td class="nowrap">${esc(a.sales || '')}<div class="text-xs text-muted">${esc(a.br || '')}</div></td><td>${esc(c.reason || '–')}${c.req_note ? `<div class="text-xs text-muted">${esc(c.req_note)}</div>` : ''}</td>
      <td class="text-xs">${c.req ? `ขอ: ${who(c.req)}<br>` : ''}${c.at ? `อนุมัติ: ${who(c)}` : ''}</td><td class="text-sm">${dep}</td>
      <td class="nowrap text-right"><button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(a.id)}">เปิด</button>${c.at ? ` <button class="btn btn-ghost btn-sm" data-act="cancel-print" data-id="${esc(a.id)}">ใบอนุมัติยกเลิก</button>` : ''}${rf && rf.at ? ` <button class="btn btn-ghost btn-sm" data-act="refund-print" data-id="${esc(a.id)}">ใบคืนเงิน</button>` : ''}</td></tr>`; }).join('');
  return `<div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end mb-3">
    <div class="field"><label for="f-cxm">เดือนที่ยกเลิก</label><select id="f-cxm" data-filter="cxM"><option value="">ทุกเดือน</option>${months.map(x => `<option value="${x}" ${f.cxM === x ? 'selected' : ''}>${fmtM(x)}</option>`).join('')}</select></div>
    <div class="field"><label for="f-cxr">เงินมัดจำ</label><select id="f-cxr" data-filter="cxR"><option value="">ทั้งหมด</option>${Object.entries(REFUND).map(([k, t]) => `<option value="${k}" ${f.cxR === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
  </div><p class="text-sm mb-2">${list.length} ใบ</p>
  <div class="bg-surface border border-line rounded-lg scroll-x">${rows ? `<table class="tbl"><thead><tr><th>วันที่ยกเลิก</th><th>ลูกค้า</th><th>เซลล์</th><th>เหตุผล</th><th>ผู้ขอ / ผู้อนุมัติ</th><th>เงินมัดจำ</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : emptyBox('ยังไม่มีใบจองที่ยกเลิก', 'ใบจองที่ผู้จัดการอนุมัติยกเลิกจะอยู่ที่นี่ พิมพ์ใบอนุมัติยกเลิกและใบคืนเงินซ้ำได้')}</div>`;
}
// the approved cancellation as a signed form, whatever happened to the deposit
function printCancel(a) {
  const c = a.rec.cancel || {}, req = c.req || {}, rf = a.rec.refund || null;
  const dep = c.refund === 'refund' ? `คืนเงินมัดจำ ${money(c.amount)} บาท${rf && rf.at ? ` เข้าบัญชี ${rf.bank === 'อื่น ๆ' ? rf.bank_other || '' : rf.bank || ''} ${rf.account_no || ''}` : ''}` : REFUND[c.refund] || c.refund || '–';
  const to = c.to ? derive().at.find(x => x.id === c.to) : null;
  const spec = { title: 'ใบอนุมัติยกเลิกใบจอง', sub: `บริษัท เอที ฮอนด้า ออโตโมบิล จำกัด สาขา${BR[a.br]?.name || ''} · วันที่ ${fmtD(todayISO())}`, blocks: [
    { kv: [['เลขที่ใบจอง', a.no || a.rec.booking_no || '', 'วันที่จอง', fmtD(a.date)], ['ชื่อผู้จอง', a.cust || '', 'พนักงานขาย', a.sales || ''], ['รุ่นรถ', `${a.model || ''} ${a.grade || ''}`, 'สี', a.color || ''],
      ['เลขที่ใบเสร็จมัดจำ', a.rec.receipt_no || '', 'ยอดมัดจำ', a.rec.deposit ? money(a.rec.deposit) + ' บาท' : '–']] },
    { h: 'การยกเลิก' },
    { kv: [['เหตุผล', `${c.reason || ''}${c.req_note ? ' · ' + c.req_note : ''}`], ['ผู้ขอยกเลิก', `${req.role || c.role || ''} ${(req.at || c.at || '') ? fmtD((req.at || c.at).slice(0, 10)) : ''}`, 'ผู้อนุมัติ', `${c.role || ''} ${c.at ? fmtD(c.at.slice(0, 10)) : ''}`],
      ['เหตุผลที่อนุมัติ', c.note || ''], ['เงินมัดจำ', `${dep}${to ? ` · โอนไปใบจอง ${to.cust} ${to.model} ${fmtD(to.date)}` : ''}`]] },
    { sign: ['พนักงานขาย', 'ผู้จัดการฝ่ายขาย (อนุมัติ)', 'ฝ่ายบัญชี', 'ลูกค้า'] }] };
  openDoc(spec, docName('ใบอนุมัติยกเลิกใบจอง', a.cust, todayISO()), S.modal && S.modal.kind === 'at' ? { ...S.modal } : null);
}
// who did what on a booking: requests, decisions, edits, swaps
function bookingHistory(a) {
  const log = [...(a.rec.log || [])];
  for (const ch of a.rec.changes || []) if (ch.status === 'rejected' && !log.some(x => x.at === ch.decided?.at)) log.push({ ...ch.decided, act: `ไม่อนุมัติ${ch.type === 'cancel' ? 'ยกเลิก' : 'แก้ไข'}`, note: ch.decided?.note || '' });
  if (a.rec.created_at) log.push({ at: a.rec.created_at, by: a.rec.created_by, role: a.rec.created_role, act: 'ลงใบจอง', note: '' });
  log.sort((x, y) => (y.at || '').localeCompare(x.at || ''));
  if (log.length < 2) return '';
  return `<details class="text-sm"><summary class="cursor-pointer font-medium">ประวัติใบจอง (${log.length})</summary><div class="mt-2 flex flex-col gap-1">${log.slice(0, 40).map(h => `<div class="flex flex-wrap gap-x-3"><span class="num text-muted w-28">${fmtDT(h.at)}</span><span class="font-medium">${esc(h.act || '')}</span><span class="text-muted">${esc(h.note || '')}</span><span class="text-xs text-muted">${who(h)}</span></div>`).join('')}</div></details>`;
}

// ---------- approval inbox: a combined tab and one tab per topic (lock for a booking, cancel, model change, …), oldest first
function inboxTopics() { return [['lockbk', 'อนุมัติล็อกใบจอง'], ['locktemp', 'อนุมัติล็อกชั่วคราว'], ['lockdealer', 'อนุมัติแลก/ขายดีลเลอร์'], ['cancel', 'อนุมัติยกเลิก'], ['spec', 'อนุมัติเปลี่ยนรุ่น/เกรด/สี'],
  ['edit', 'อนุมัติแก้ไขอื่น'], ['ext', 'ต่อล็อก (ครบ 15 วัน)'], ['owner', 'เลือกเจ้าของเคส'], ['confirm', 'ยืนยันส่งมอบ']]; }
function inboxTopic(x) {
  if (x.kind === 'lock') return x.l.type === 'temp' ? 'locktemp' : x.l.type === 'dealer' ? 'lockdealer' : 'lockbk';
  if (x.kind === 'edit') return SPEC_KEYS.some(k => k in (x.a.change.fields || {})) ? 'spec' : 'edit';
  return x.kind;
}
function inboxRowFor(x, D) {
  if (x.l) return lockRow(x.l, D);
  const a = x.a, ch = a.change, k = x.kind;
  if (k === 'cancel') return inboxRow(a, '', esc(`${ch.reason}${ch.note ? ' · ' + ch.note : ''}`), `ขอโดย ${who(ch)} ${fmtDT(ch.at)}`, 'เปิดเพื่ออนุมัติ');
  if (k === 'edit') return inboxRow(a, '', esc(changeText(ch)) + (ch.reason ? `<div>เหตุผล: ${esc(ch.reason)}</div>` : ''), `ขอโดย ${who(ch)} ${fmtDT(ch.at)}`, 'เปิดเพื่ออนุมัติ');
  if (k === 'owner') return inboxRow(a, '', `IDS คีย์ด้วย ID ${esc(a.idsSales)}${a.rec.owner_dispute.note ? ' · ' + esc(a.rec.owner_dispute.note) : ''}`, `แจ้งโดย ${who(a.rec.owner_dispute)} ${fmtDT(a.rec.owner_dispute.at)}`, 'เลือกเจ้าของเคส');
  const dv = (a.rec.flow && a.rec.flow.delivered) || {};
  return inboxRow(a, '', `ส่งมอบ ${fmtD(dv.date)} · ป้ายแดง ${esc(dv.plate || '–')} · ประกัน ${esc(dv.insurer || '–')}`, dv.at ? `บันทึกโดย ${who(dv)} ${fmtDT(dv.at)}` : '', 'เปิดเพื่อยืนยัน');
}
function viewInboxMgr(D) {
  const items = inboxItems(D), topics = inboxTopics();
  const tab = topics.some(([k]) => k === S.sub.inbox) ? S.sub.inbox : 'all';
  const n = k => items.filter(x => inboxTopic(x) === k).length;
  const list = items.filter(x => tab === 'all' || inboxTopic(x) === tab).sort((x, y) => (x.at || '').localeCompare(y.at || ''));
  const label = k => topics.find(t => t[0] === k)[1];
  const row = x => tab === 'all' ? `<div><div class="px-3 md:px-4 pt-3 text-xs font-medium" style="color:var(--muted)">${label(inboxTopic(x))}</div>${inboxRowFor(x, D)}</div>` : inboxRowFor(x, D);
  return `${pageHead('รอฉันอนุมัติ', `${S.role.role === 'exec' ? 'ทุกสาขา' : `สาขา ${mgrBranches().join(', ')}`} · แยกแท็บตามหัวข้อ เรียงจากที่รอนานที่สุด`)}
    <div class="flex gap-1 border-b border-line mb-3 overflow-x-auto" role="tablist">
      <button role="tab" class="tab" aria-selected="${tab === 'all'}" data-act="sub" data-key="inbox" data-sub="all">รวม <span class="badge">${items.length}</span></button>
      ${topics.map(([k, t]) => `<button role="tab" class="tab ${n(k) ? '' : 'text-muted'}" aria-selected="${tab === k}" data-act="sub" data-key="inbox" data-sub="${k}">${t}${n(k) ? ` <span class="badge">${n(k)}</span>` : ''}</button>`).join('')}</div>
    <div class="bg-surface border border-line rounded-lg divide-y divide-line">${list.map(row).join('') || emptyBox(tab === 'all' ? 'ไม่มีอะไรรออนุมัติ' : `ไม่มีรายการ "${label(tab)}"`, 'เมื่อเซลล์หรือแอดมินส่งคำขอ รายการจะขึ้นที่นี่และในแจ้งเตือน')}</div>`;
}

Object.assign(ACTIONS, {
  'export-open'() {
    const v = S.view, sheets = { stock: v === 'stock', book: v === 'book', quota: v === 'quota', lock: v === 'lock', spec: v === 'stock' };
    S.modal = { kind: 'export', fmt: 'xlsx', sheets, br: S.br || '', model: '', carSt: '', bookSt: S.filters.aState || 'active', from: '', to: '' }; render();
  },
  'export-fmt'(el) { S.modal.fmt = el.dataset.v; render(); },
  async 'export-go'() { const m = S.modal; m.busy = true; render(); try { await exportXlsx(m); } finally { if (S.modal === m) { m.busy = false; render(); } } },
  'export-sum'() { exportSummary(S.modal); },
  async 'recvdup-attach'() {
    const m = S.modal, id = m.dups[0], cur = S.receipts.get(id);
    if (!cur) { toast('ไม่พบใบเดิมแล้ว', 'bad'); return; }
    const extra = [...(cur.extra_imgs || [])]; if (m.doc.img) extra.push(m.doc.img);
    if (await write('receipts', id, { ...cur, extra_imgs: extra })) { S.modal = null; S.ai.receive = { state: 'done', msg: 'แนบรูปเพิ่มในใบเดิมแล้ว ไม่ได้สร้างใบซ้ำ' }; toast('แนบรูปเพิ่มในใบเดิมแล้ว'); render(); }
  },
  async 'recvdup-new'() { const doc = S.modal.doc; S.modal = null; await saveReceipt(doc); },
  async 'cancel-print'(el) { const a = atById(el.dataset.id); if (a && a.cancelled) await printCancelDoc(a); },
  'export-preview'() { S.modal.preview = !S.modal.preview; render(); },
  'export-pv'(el) { S.modal.pv = el.dataset.k; render(); },
  'idspair-open'(el) { S.modal = { kind: 'idspair', key: el.dataset.id, q: '' }; render(); },
  async 'idspair-pick'(el) {
    const a = atById(el.dataset.id), key = S.modal && S.modal.key; if (!a || !key || !canEditBooking(a)) return;
    const b = derive().idsB.find(x => x.key === key);
    const r = await saveBk(a.id, 'จับคู่กับ IDS', b ? `IDS ${b.no || ''}` : key, x => { x.match_pick = { key, ...actor() }; x.match_skip = (x.match_skip || []).filter(k => k !== key); });
    if (r) { S.modal = null; toast(`จับคู่ ${a.cust} กับ IDS ${b ? b.no : ''} แล้ว`); render(); }
  }
});
