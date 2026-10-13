// ---------- approval inbox: everything waiting for this person's decision, in one place
// (managers: own branches; the executive: every branch). Sales and admins see the requests they sent.
function inboxItems(D) {
  const p = perms(), out = [];
  if (!p.approve) return out;
  for (const a of D.at) {
    if (a.demo) continue;
    if (a.change && canDecideBooking(a)) out.push({ kind: a.change.type === 'cancel' ? 'cancel' : 'edit', a, at: a.change.at });
    if (a.ownerCheck === 'disputed' && canApproveBr(a.br)) out.push({ kind: 'owner', a, at: a.rec.owner_dispute.at });
    if (!a.cancelled && a.flow.next === 'confirmed' && canApproveBr(a.br)) out.push({ kind: 'confirm', a, at: (a.rec.flow && a.rec.flow.delivered && a.rec.flow.delivered.at) || a.date });
  }
  for (const l of D.locks) {
    if (l.status === 'pending' && (l.type === 'dealer' ? p.approveDealer : canApproveBr(l.car_br))) out.push({ kind: 'lock', l, at: l.requested_at });
    else if (l.needExt && canApproveBr(l.car_br)) out.push({ kind: 'ext', l, at: l.end });
  }
  return out.sort((x, y) => (x.at || '').localeCompare(y.at || ''));
}
function myRequests(D) {
  const out = [];
  for (const a of D.at) {
    if (a.change && (isRequester(a.change) || isMine(a.sales))) out.push({ a, ch: a.change, pending: true });
    const done = (a.rec.changes || []).filter(c => c.decided && c.status !== 'withdrawn' && (c.role === roleLabel() || isMine(a.sales)) && daysBetween(c.decided.at.slice(0, 10), D.today) <= 7);
    if (done.length) out.push({ a, ch: done[done.length - 1], pending: false });
  }
  const locks = D.locks.filter(l => l.status === 'pending' && (isMine(l.owner) || (!isSales() && l.requested_role === roleLabel())));
  return { bookings: out.sort((x, y) => (y.ch.at || '').localeCompare(x.ch.at || '')), locks };
}
const INBOX_KIND = {
  cancel: 'ขอยกเลิกใบจอง', edit: 'ขอแก้ไขใบจอง', lock: 'คำขอล็อกรถ', ext: 'ครบ 15 วัน ต่อล็อกหรือปล่อย (ไม่ต่อ ระบบปล่อยคิวเอง)',
  owner: 'เซลล์แจ้งว่าไม่ใช่เคสของตัวเอง เลือกเจ้าของเคส', confirm: 'ส่งมอบแล้ว รอยืนยันเพื่อทำค่าคอม'
};
function inboxRow(a, title, detail, by, btn) {
  return `<div class="p-3 md:px-4 flex flex-wrap gap-x-5 gap-y-2 items-center">
    <div class="min-w-[170px] flex-1"><div class="font-medium">${custCell(a.cust, a.sales)}</div><div class="text-sm">${specLabel(a.spec)}</div></div>
    <div class="min-w-[170px] text-sm">${esc(a.sales || '')} · สาขา ${esc(a.br || '')}${a.cross ? ` · ${chip(`ขายข้ามสาขา → ${a.delivBr}`, 'neutral')}` : ''}<div class="text-xs text-muted">จอง ${fmtD(a.date)}${a.no ? ` · ${esc(a.no)}` : ''}</div></div>
    <div class="min-w-[200px] flex-1 text-sm">${title ? `<div class="font-medium">${title}</div>` : ''}${detail ? `<div class="text-muted">${detail}</div>` : ''}${by ? `<div class="text-xs text-muted">${by}</div>` : ''}</div>
    <div class="ml-auto"><button class="btn ${btn ? 'btn-dark' : 'btn-ghost'} btn-sm" data-act="at-open" data-id="${esc(a.id)}">${btn || 'เปิด'}</button></div></div>`;
}
function viewInbox(D) {
  const p = perms();
  if (!p.approve) {
    const r = myRequests(D);
    const rows = r.bookings.map(({ a, ch, pending }) => inboxRow(a,
      `${ch.type === 'cancel' ? 'ขอยกเลิก' : 'ขอแก้ไข'} · ${pending ? chip(`รอ${MGR_NAME[a.br] || 'ผู้จัดการ'}อนุมัติ`, 'warn') : ch.status === 'approved' ? chip('อนุมัติแล้ว', 'good') : chip('ไม่อนุมัติ', 'bad')}`,
      esc(ch.type === 'cancel' ? `${ch.reason}${ch.note ? ' · ' + ch.note : ''}` : changeText(ch)) + (!pending && ch.decided && ch.decided.note ? `<div>ผู้จัดการ: ${esc(ch.decided.note)}</div>` : ''),
      `ส่ง ${fmtDT(ch.at)}${!pending && ch.decided ? ` · ตัดสิน ${fmtDT(ch.decided.at)} ${who(ch.decided)}` : ''}`)).join('');
    return `${pageHead('คำขอของฉัน', 'คำขอแก้ไข ยกเลิก และล็อกรถที่ส่งไป พร้อมผลอนุมัติ 7 วันล่าสุด · พี่อั้มอนุมัติสาขา PSC, ATE · นุชอนุมัติสาขา SPH, KPA')}
      <h2 class="font-head text-lg font-semibold mb-2">ใบจอง <span class="text-muted text-base">${r.bookings.length}</span></h2>
      <div class="bg-surface border border-line rounded-lg divide-y divide-line mb-5">${rows || emptyBox('ยังไม่มีคำขอ', 'ขอแก้ไขหรือขอยกเลิกได้จากปุ่มในใบจอง')}</div>
      <h2 class="font-head text-lg font-semibold mb-2">คำขอล็อกที่รออนุมัติ <span class="text-muted text-base">${r.locks.length}</span></h2>
      <div class="bg-surface border border-line rounded-lg divide-y divide-line">${r.locks.map(l => lockRow(l, D)).join('') || emptyBox('ไม่มีคำขอล็อกค้าง', 'ขอล็อกได้จากหน้าสต็อก Quota หรือใบจอง')}</div>`;
  }
  return viewInboxMgr(D);
}
