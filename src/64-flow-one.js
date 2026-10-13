// ------------------------------------------------------------------ one booking, one window (ตกลง 13/10: แบบ ก)
// The booking's locks are handled inside its own delivery steps: approve, mark allocated in IDS, release, swap.
// Only function declarations here: the first render runs before this part of the file.
function bkLocks(a, D) {
  const ls = D.locks.filter(l => (l.bkref === a.key || (a.row && l.bkref === a.row.key)) && ['pending', 'approved', 'allocated'].includes(l.status) && !l.autoReleased);
  if (!ls.length) return '';
  return `<div class="border border-line rounded-lg divide-y divide-line mt-2">${ls.map(l => lockRow(l, D)).join('')}</div>`;
}

// the lock buttons of one lock, for a row in a list (Booking, ภาพรวม)
function rowLockActs(l, D) {
  const p = perms(), br = l.car_br, mine = isMine(l.owner), out = [], b = (x, act, t, dark) => `<button class="btn ${dark ? 'btn-red' : 'btn-ghost'} btn-sm" data-act="${act}" data-id="${esc(l.id)}">${t}</button>`;
  if (canDecideLock(l)) { out.push(b(l, 'approve', 'อนุมัติล็อก', true)); out.push(b(l, 'reject-open', 'ไม่อนุมัติ')); }
  if (l.status === 'approved' && l.type !== 'temp' && canAllocBr(br)) out.push(`<button class="btn btn-dark btn-sm" data-act="allocate" data-id="${esc(l.id)}">จัดสรรใน IDS แล้ว</button>`);
  if (l.status === 'approved' && l.live && canApproveBr(br) && (l.mgrDue ? (l.finWait || (l.ext || 0) < MAX_EXT) : ((l.ext || 0) < MAX_EXT && !l.hold))) out.push(b(l, 'extend', `ต่ออายุ ${l.days} วัน`, l.mgrDue));
  if (['approved', 'allocated'].includes(l.status) && (canAllocBr(br) || mine || (l.type === 'dealer' && p.approveDealer))) out.push(b(l, 'release-open', l.type === 'dealer' ? 'ยกเลิกการแลก/ขาย' : 'ยกเลิกล็อก'));
  if (l.type === 'booking' && l.vin && ['approved', 'allocated'].includes(l.status) && canSwap(swapCtx(D, { lockId: l.id }))) out.push(`<button class="btn btn-ghost btn-sm" data-act="swap-open" data-lock="${esc(l.id)}">เปลี่ยนคัน</button>`);
  if (canUndo(l)) out.push(b(l, 'undo', `↶ ย้อนกลับ: ${esc(l.undo.act)}`));
  return out;
}

// DL with a delivery date: write the delivery into the booking itself (ตกลง 13/10), so reports and the
// manager's confirmation see it even if nobody pressed "บันทึกส่งมอบ". The red plate and insurer can be added later.
function dueDelivered(D) { return D.at.filter(a => !a.cancelled && !a.demo && a.flow && a.flow.lateUpdate && a.match && a.match.ddate && !(a.rec.flow && a.rec.flow.delivered && a.rec.flow.delivered.date)); }
async function syncDelivered() {
  const D = derive(); let n = 0;
  for (const a of dueDelivered(D)) {
    const r = S.bookings.get(a.id); if (!r) continue;
    const dl = (a.match.recs || []).find(x => x.kind === 'dl');
    if (await saveFlow(a, { flow: { delivered: { date: a.match.ddate, src: 'IDS', inv: dl && dl.row ? dl.row.inv || null : null, vin: a.match.vin || null, plate: null, insurer: null, ...actor() } } })) n++;
  }
  return n;
}
Object.assign(ACTIONS, {
  async 'deliv-sync'() { const n = await syncDelivered(); toast(n ? `บันทึกส่งมอบจาก DL แล้ว ${n} ใบ` : 'ไม่มีใบที่ต้องบันทึกเพิ่ม'); render(); }
});
function delivSyncBox(D) {
  const n = dueDelivered(D).length; if (!n || !perms().upload) return '';
  return `<section class="mb-5"><div class="bg-surface border border-line rounded-lg p-4 flex flex-wrap gap-3 items-center"><div class="flex-1 min-w-[220px]"><b>DL แจ้งส่งมอบแล้ว ${n} ใบ</b> ที่ยังไม่ได้บันทึกส่งมอบในระบบ<div class="text-sm text-muted">ระบบบันทึกให้เองทุกครั้งที่อัปโหลด DL · กดเพื่อบันทึกรายการที่ค้างอยู่ตอนนี้</div></div>
    <button class="btn btn-dark btn-sm" data-act="deliv-sync">บันทึกส่งมอบจาก DL</button></div></section>`;
}
