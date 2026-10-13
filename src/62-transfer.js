// ------------------------------------------------------------------ deposit moved to another booking (ตกลง 13/10)
// Full amount only. The manager picks the receiving booking when approving the cancel, or leaves it "held" until the
// new booking is keyed. The receiving booking counts the amount as its deposit (instead of a slip) and can ask for a car.
// Only function declarations here: the first render runs before this part of the file.
function trReasons() {
  return ['เปลี่ยนรุ่น/เกรด/สี หลังเข้า IDS แล้ว ต้องเปิดใบจองใหม่', 'เปลี่ยนชื่อผู้จอง/ผู้ซื้อ (ญาติ หรือนิติบุคคล)', 'ย้ายสาขาที่ออกรถ',
    'จองหลายคัน ย้ายเงินไปใบที่มีอยู่แล้ว', 'เปลี่ยนแคมเปญ/โปรโมชัน หรือรุ่นปีใหม่', 'ใบเดิมลงผิด/ซ้ำใน IDS ต้องเปิดใหม่', 'อื่น ๆ'];
}
// the full deposit of a booking: its own deposit plus anything moved into it
function trAmount(a) { return (Number(a.rec.deposit) || 0) + (a.rec.deposit_from ? Number(a.rec.deposit_from.amount) || 0 : 0); }
// bookings that already receive a deposit, so one cancelled booking cannot be moved into two
function trTaken(D) { const s = new Set(); D.at.forEach(x => { if (x.rec.deposit_from) s.add(x.id); }); return s; }
// receiving bookings: the same customer (any model), then the same sales' bookings around the same time
function trCands(a, D) {
  const taken = trTaken(D), ak = nameKey(a.cust || '');
  return D.at.filter(x => x.id !== a.id && !x.cancelled && !x.demo && !taken.has(x.id) && !x.done)
    .map(x => ({ x, ns: keyScore(nameKey(x.cust || ''), ak), mine: sameName(x.sales || '', a.sales || '') }))
    .filter(o => o.ns >= 2 || (o.mine && Math.abs(daysBetween(a.date || o.x.date, o.x.date || a.date)) <= 120))
    .sort((p, q) => q.ns - p.ns || (q.x.date || '').localeCompare(p.x.date || ''))
    .slice(0, 20).map(o => o.x);
}
// the transfer part of a cancel form (prefix: 'cancel' for a direct cancel, 'cx' when approving a request)
function trFields(prefix, c, a, D) {
  const cands = trCands(a, D), amt = trAmount(a), to = c.tto ?? c.to ?? '';
  return `<div class="sm:col-span-2 grid sm:grid-cols-2 gap-3 p-3 rounded-lg" style="background:var(--surface-2)">
    <div class="field"><label for="${prefix}-tr" class="req">เหตุผลที่โอนมัดจำ</label><select id="${prefix}-tr" data-modal="${prefix}.treason">${opt(trReasons(), c.treason || '', 'เลือกเหตุผล')}</select></div>
    <div class="field"><label for="${prefix}-tto">โอนไปใบจอง</label><select id="${prefix}-tto" data-modal="${prefix}.tto"><option value="">ค้างไว้ รอใบจองใหม่</option>
      ${cands.map(x => `<option value="${esc(x.id)}" ${to === x.id ? 'selected' : ''}>${esc(x.cust || '')} · ${esc(specLabelText(x.spec))} · จอง ${fmtD(x.date)} · ${esc(x.sales || '')}</option>`).join('')}</select></div>
    ${c.treason === 'อื่น ๆ' ? `<div class="field sm:col-span-2"><label for="${prefix}-trn" class="req">รายละเอียด</label><input id="${prefix}-trn" data-modal="${prefix}.tnote" value="${esc(c.tnote || '')}"></div>` : ''}
    ${amt > 0 ? '' : `<div class="field"><label for="${prefix}-tam" class="req">ยอดมัดจำทั้งหมด (บาท)</label><input id="${prefix}-tam" type="number" min="0" step="100" data-modal="${prefix}.tamount" value="${esc(c.tamount || '')}"></div><p class="text-xs self-end" style="color:var(--warn)">ใบนี้ยังไม่มียอดมัดจำในระบบ ใส่ยอดตามใบเสร็จมัดจำ</p>`}
    <p class="sm:col-span-2 text-sm">${amt > 0 ? `โอนเต็มจำนวน <b class="num">${money(amt)}</b> บาท` : 'โอนเต็มจำนวนตามยอดที่ใส่'} · ใบที่รับโอนนับยอดนี้เป็นมัดจำ ขอล็อกรถได้${to ? '' : ' · ค้างไว้: ระบบเตือนเซลล์จนกว่าจะผูกกับใบจองใหม่'}</p></div>`;
}
function trCheck(c, a) {
  if (!c.treason) return 'เลือกเหตุผลที่โอนมัดจำ';
  if (a && !(trAmount(a) > 0) && !(num(c.tamount) > 0)) return 'ใส่ยอดมัดจำทั้งหมดที่จะโอน';
  if (c.treason === 'อื่น ๆ' && !(c.tnote || '').trim()) return 'เขียนรายละเอียดเมื่อเลือก "อื่น ๆ"';
  return null;
}
function trRecord(c, a) { return { reason: c.treason, note: (c.tnote || '').trim() || null, amount: trAmount(a) || num(c.tamount) || 0, to: c.tto || c.to || null }; }
// write the receiving side; the cancelled booking already holds cancel.to
async function trLinkTo(from, toId) {
  const amt = (from.rec.cancel && from.rec.cancel.transfer && from.rec.cancel.transfer.amount) || trAmount(from) || 0;
  return saveBk(toId, 'รับโอนมัดจำ', `จาก ${from.cust || ''} ${from.no || ''} ${money(amt)} บาท`, x => {
    if (x.deposit_from && x.deposit_from.id !== from.id) return false;
    x.deposit_from = { id: from.id, amount: amt, no: from.no || null, cust: from.cust || '', ...actor() };
  });
}
// shown on a cancelled booking whose deposit is moved
function trOutBox(a, D) {
  const c = a.rec.cancel || {}; if (c.refund !== 'transfer') return '';
  const t = c.transfer || {}, to = c.to ? D.at.find(x => x.id === c.to) : null, can = canEditBooking(a) && perms().write;
  return `<div class="mt-2 text-sm">${t.reason ? `เหตุผลที่โอน: ${esc(t.reason)}${t.note ? ' · ' + esc(t.note) : ''} · ` : ''}ยอด <b class="num">${money(t.amount ?? trAmount(a))}</b> บาท ·
    ${to ? `โอนไปใบจอง <b>${esc(to.cust || '')}</b> ${esc(specLabelText(to.spec))} จอง ${fmtD(to.date)} <button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(to.id)}">เปิดใบที่รับโอน</button>`
      : `${chip('มัดจำรอโอน', 'warn')} ${can ? `<button class="btn btn-dark btn-sm" data-act="tr-open" data-id="${esc(a.id)}">ผูกกับใบจองใหม่</button>` : ''}`}</div>`;
}
// shown on the receiving booking, or an offer when a held deposit of the same customer is waiting
function trInBox(a, D) {
  if (a.cancelled) return '';
  const f = a.rec.deposit_from;
  if (f) { const from = D.at.find(x => x.id === f.id); return box('surface', `มัดจำโอนมาจากใบจอง <b>${esc(f.cust || (from && from.cust) || '')}</b> ${esc(f.no || '')} ยอด <b class="num">${money(f.amount)}</b> บาท · ${who(f)} ${fmtDT(f.at)}${from ? ` <button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(from.id)}">เปิดใบเดิม</button>` : ''}`); }
  const held = trHeld(D).filter(x => keyScore(nameKey(x.cust || ''), nameKey(a.cust || '')) >= 2);
  if (!held.length || !(canEditBooking(a) && perms().write)) return '';
  return box('warn', `<b>ลูกค้านี้มีมัดจำรอโอน</b>${held.map(x => `<div class="flex flex-wrap gap-2 items-center mt-1 text-sm">${esc(x.cust)} · ${esc(specLabelText(x.spec))} · ยกเลิก ${fmtD(((x.rec.cancel || {}).at || '').slice(0, 10))} · ${money((x.rec.cancel.transfer || {}).amount ?? trAmount(x))} บาท
    <button class="btn btn-red btn-sm" data-act="tr-link" data-from="${esc(x.id)}" data-to="${esc(a.id)}">ใช้มัดจำนี้กับใบจองนี้</button></div>`).join('')}`);
}
function trHeld(D) { return D.at.filter(x => x.cancelled && x.rec.cancel && x.rec.cancel.refund === 'transfer' && !x.rec.cancel.to && !x.demo); }
function trModal(m, D) {
  const a = D.at.find(x => x.id === m.id); if (!a) return '<p>ไม่พบใบจอง</p>';
  const cands = trCands(a, D);
  return `<div class="flex items-start justify-between gap-3 mb-2"><h2 class="font-head text-xl font-semibold">ผูกมัดจำรอโอนกับใบจองใหม่</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <p class="text-sm mb-3">จากใบจอง <b>${esc(a.cust)}</b> ${esc(specLabelText(a.spec))} · ยอด <b class="num">${money((a.rec.cancel.transfer || {}).amount ?? trAmount(a))}</b> บาท (โอนเต็มจำนวน)</p>
  <div class="border border-line rounded-lg divide-y divide-line max-h-80 overflow-auto">${cands.map(x => `<div class="p-3 flex flex-wrap gap-3 items-center text-sm"><div class="flex-1 min-w-[180px]"><div class="font-medium">${esc(x.cust)}</div><div class="text-xs text-muted">${esc(specLabelText(x.spec))} · จอง ${fmtD(x.date)} · ${esc(x.br)} · ${esc(x.sales || '')}</div></div>
    <button class="btn btn-ghost btn-sm" data-act="tr-link" data-from="${esc(a.id)}" data-to="${esc(x.id)}">โอนไปใบนี้</button></div>`).join('') || `<div class="p-3">${emptyBox('ยังไม่มีใบจองใหม่ของลูกค้านี้', 'ลงใบจอง AT Honda ใบใหม่ก่อน แล้วกลับมาผูก หรือเปิดใบใหม่แล้วกด "ใช้มัดจำนี้กับใบจองนี้"')}</div>`}</div>
  <div class="flex justify-end mt-3"><button class="btn btn-ghost" data-act="go" data-view="book" data-sub="new">+ ลงใบจองใหม่</button></div>`;
}
Object.assign(ACTIONS, {
  'tr-open'(el) { S.modal = { kind: 'tr', id: el.dataset.id }; render(); },
  async 'tr-link'(el) {
    const D = derive(), from = D.at.find(x => x.id === el.dataset.from), to = D.at.find(x => x.id === el.dataset.to);
    if (!from || !to || !(canEditBooking(from) || canEditBooking(to))) return;
    if (from.rec.cancel && from.rec.cancel.to && from.rec.cancel.to !== to.id) { toast('มัดจำนี้โอนไปใบอื่นแล้ว', 'bad'); return; }
    if (to.rec.deposit_from && to.rec.deposit_from.id !== from.id) { toast('ใบนี้รับโอนมัดจำจากใบอื่นแล้ว', 'bad'); return; }
    const r1 = await saveBk(from.id, 'ผูกมัดจำรอโอน', `โอนไป ${to.cust} ${specLabelText(to.spec)}`, x => { if (!x.cancel || (x.cancel.to && x.cancel.to !== to.id)) return false; x.cancel.to = to.id; x.cancel.transfer = { ...(x.cancel.transfer || { amount: trAmount(from) }), to: to.id }; });
    if (!r1) return;
    const r2 = await trLinkTo(from, to.id);
    if (r2) { if (S.modal && S.modal.kind === 'tr') S.modal = null; toast(`โอนมัดจำ ${money((r1.cancel.transfer || {}).amount || trAmount(from))} บาท ไปใบจอง ${to.cust} แล้ว`); render(); }
  }
});
