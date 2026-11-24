// ------------------------------------------------------------------ รอยกเลิกใบจอง (23/11)
// The customer said they will cancel, the paper (ใบขอถอนจอง + documents) is not in yet. The admin / manager / executive
// marks the booking "รอยกเลิก": it leaves the queue and the waiting-for-a-car lists, its lock / allocation is let go,
// and the branch admin + the sales (when the sales has not sent a cancel request) are reminded to bring the documents.
// The sales still sends "ขอยกเลิกใบจอง" as before; the manager's approval cancels it. "นำกลับเข้าคิว" undoes the mark.
function canCxWait(a) { return !!(a && a.active && perms().write && (canAdminEdit(a) || canApproveBr(a.br))); }
function cxWaitBox(m, a) {
  const w = a.rec.cancel_wait;
  if (w) {
    const asked = a.change && a.change.type === 'cancel';
    return box('bad', `<b>รอยกเลิกใบจอง · ไม่นับคิว</b> <span class="text-sm">${esc(w.reason || '')}${w.note ? ' · ' + esc(w.note) : ''}</span>
      <div class="text-xs text-muted mt-1">ตั้งโดย ${esc(w.role || '')} ${w.at ? fmtDT(w.at) : ''} · ${asked ? 'เซลล์ส่งคำขอยกเลิกแล้ว รอผู้จัดการอนุมัติ' : 'รอเซลล์ / แอดมินนำส่งเอกสารขอถอนจอง แล้วกด "ขอยกเลิกใบจอง"'}</div>
      ${canCxWait(a) ? `<div class="flex flex-wrap gap-2 mt-2"><button class="btn btn-ghost btn-sm" data-act="cxw-undo" data-id="${esc(a.id)}">นำกลับเข้าคิว (ลูกค้าไม่ยกเลิกแล้ว)</button></div>` : ''}`);
  }
  const f = m.cxw; if (!f || f.id !== a.id) return '';
  return box('bad', `<b>รอยกเลิกใบจอง</b> ใบจองออกจากคิวและรายการรอรถทันที ปล่อยล็อก / การจัดสรรรถของใบนี้ แล้วแจ้งแอดมินและเซลล์ให้นำส่งเอกสาร
    <div class="grid sm:grid-cols-2 gap-3 mt-2"><div class="field"><label for="cxw-r">เหตุผล</label><select id="cxw-r" data-modal="cxw.reason">${opt(CANCEL_REASONS, f.reason)}</select></div>
      <div class="field"><label for="cxw-n" class="${f.reason === 'อื่น ๆ' ? 'req' : ''}">รายละเอียด</label><input id="cxw-n" data-modal="cxw.note" value="${esc(f.note || '')}" maxlength="200"></div></div>
    <div class="flex flex-wrap gap-2 mt-3"><button class="btn btn-red btn-sm" data-act="cxw-save" data-id="${esc(a.id)}">ยืนยัน รอยกเลิก</button><button class="btn btn-ghost btn-sm" data-act="cxw-close">กลับ</button></div>`);
}
Object.assign(ACTIONS, {
  'cxw-open'(el) { S.modal.cxw = { id: el.dataset.id, reason: CANCEL_REASONS[0], note: '' }; render(); },
  'cxw-close'() { S.modal.cxw = null; render(); },
  async 'cxw-save'(el) {
    const a = atById(el.dataset.id), f = S.modal.cxw || {}; if (!a || !canCxWait(a)) return;
    const note = (f.note || '').trim(); if (f.reason === 'อื่น ๆ' && !note) { toast('ใส่รายละเอียด', 'bad'); return; }
    const r = await saveBk(a.id, 'รอยกเลิกใบจอง (เอาออกจากคิว)', `${f.reason}${note ? ' · ' + note : ''}`, x => { x.cancel_wait = { reason: f.reason, note, ...actor() }; }, x => x.status !== 'cancelled' && !x.cancel_wait);
    if (!r) return;
    await releaseFor(a, 'รอยกเลิกใบจอง');
    S.modal.cxw = null; toast('เอาออกจากคิวแล้ว แจ้งแอดมินและเซลล์ให้นำส่งเอกสาร'); render();
  },
  async 'cxw-undo'(el) {
    const a = atById(el.dataset.id); if (!a || !canCxWait(a)) return;
    const r = await saveBk(a.id, 'นำกลับเข้าคิว (ไม่ยกเลิกแล้ว)', '', x => { x.cancel_wait = null; }, x => !!x.cancel_wait);
    if (r) { toast('นำกลับเข้าคิวแล้ว (คิวเดิมตามวันที่จอง)'); render(); }
  }
});
