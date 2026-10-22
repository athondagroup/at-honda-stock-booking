// ------------------------------------------------------------------ cancel form like the paper "เอกสารขอถอนจอง" (ตกลง 22/10)
// The cancel box also asks: the date the customer asked, the branch booking no. / receipt no. / deposit when the
// booking lacks them, the finance companies tried (finance not approved), and ticks for the papers attached
// (copies are checked on paper, nothing is uploaded). The printed form adds the conditions, the ticks and an
// accounting part. Only function declarations here: the first render runs before this part of the file.
function cxDocList(c) {
  return [['idcard', 'สำเนาบัตรประชาชนพร้อมลายเซ็น และข้อความ "ขอยกเลิกจองรถรุ่น/แบบ/สี และขอรับเงินจองคืน"', true],
    ['passbook', 'หน้าสมุดบัญชี (ชื่อเดียวกับใบจองเท่านั้น · กรณีคืนเงิน)', false],
    ['finreject', 'ใบไม่ผ่านอนุมัติสินเชื่อ (ถ้ามี)', false]];
}
function cxDocTicks(c) {
  const d = c.docs || {};
  return `<div class="text-sm"><div class="font-medium mb-1">เอกสารแนบ (ตรวจจากกระดาษ ไม่ต้องอัปโหลด)</div>${cxDocList(c).map(([k, t, req]) => `<label class="flex items-start gap-2 mb-1"><input type="checkbox" class="w-5 h-5 mt-0.5" data-modal="cancel.docs.${k}" ${d[k] ? 'checked' : ''}><span class="${req ? 'req' : ''}">${esc(t)}</span></label>`).join('')}</div>`;
}
function cxFinTried(c) {
  const on = new Set(c.fin_tried || []);
  return `<div class="field sm:col-span-2"><label>ยื่นไฟแนนซ์ไหนแล้วไม่ผ่าน (เลือกได้หลายบริษัท)</label><div class="flex flex-wrap gap-3 text-sm">${FINANCE.filter(f => f !== 'อื่น ๆ').map(f => `<label class="flex items-center gap-1"><input type="checkbox" class="w-4 h-4" data-cxfin="${esc(f)}" ${on.has(f) ? 'checked' : ''}> ${esc(f)}</label>`).join('')}</div></div>`;
}
// booking numbers the paper form has and the booking may lack
function cxBkFields(c, a) {
  const r = a.rec, f = (k, label, type = 'text') => `<div class="field"><label for="cn-${k}">${label}${r[k] ? '' : ' <span class="text-xs" style="color:var(--warn)">ยังไม่มีในใบจอง</span>'}</label><input id="cn-${k}" type="${type}" ${type === 'number' ? 'min="0" step="100"' : 'autocomplete="off"'} data-modal="cancel.bk_${k}" value="${esc(c['bk_' + k] ?? r[k] ?? '')}"></div>`;
  return f('paper_no', 'เลขที่ใบจองสาขา') + f('receipt_no', 'เลขที่ใบเสร็จมัดจำ') + f('deposit', 'จำนวนเงินจอง (บาท)', 'number');
}
function cxCheck(c, a) {
  const note = (c.note || '').trim();
  if (c.reason === 'ไฟแนนซ์ไม่ผ่าน' && !note) return ['ใส่เหตุผลแบบเต็ม (ไม่ผ่านเพราะอะไร)', '#cn-n'];
  if (!c.req_date) return ['ใส่วันที่ลูกค้าขอถอนจอง', '#cn-dt'];
  const miss = cxDocList(c).filter(([k, , req]) => req && !(c.docs || {})[k]);
  if (miss.length) return [`ติ๊กเอกสารแนบ: ${miss.map(x => x[1].split(' (')[0].split(' และ')[0]).join(', ')}`, null];
  return null;
}
// what the cancel keeps, and what goes back on the booking (numbers that were missing)
function cxExtra(c) { return { req_date: c.req_date || todayISO(), fin_tried: c.reason === 'ไฟแนนซ์ไม่ผ่าน' ? (c.fin_tried || []) : [], docs: { ...(c.docs || {}) } }; }
function cxBkPatch(c, x) {
  ['paper_no', 'receipt_no'].forEach(k => { const v = String(c['bk_' + k] ?? '').trim(); if (v && v !== String(x[k] || '')) x[k] = v; });
  const d = num(c.bk_deposit); if (d > 0 && d !== num(x.deposit)) x.deposit = d;
}
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.cxfin || !S.modal || !S.modal.cancel) return;
  const set = new Set(S.modal.cancel.fin_tried || []); if (t.checked) set.add(t.dataset.cxfin); else set.delete(t.dataset.cxfin);
  S.modal.cancel.fin_tried = [...set];
});
