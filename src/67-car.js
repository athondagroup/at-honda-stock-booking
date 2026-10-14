// ------------------------------------------------------------------ one car: everything known about it, in one window (13/10)
// Opened by clicking the frame number anywhere in สต็อก. Locks can be handled here as in "จัดการล็อก".
// Only function declarations here: the first render runs before this part of the file.
function carHist(vin, D) {
  const ev = [];
  D.locks.filter(l => l.vin === vin).forEach(l => (l.history || []).forEach(h => ev.push({ ...h, what: (LOCK_TYPE[l.type] || [l.type])[0] })));
  const o = S.vehicles.get(vin);
  if (o) {
    if (o.added) ev.push({ ...o.added, act: o.added.receipt ? 'รับรถเข้า (ยืนยันจากรูป)' : 'รับรถเข้า', what: 'รถ' });
    if (o.moved) ev.push({ ...o.moved, act: `ย้ายไป ${o.branch}`, what: 'รถ' });
    if (o.removed) ev.push({ ...o.removed, act: 'นำรถออก', note: o.removed.dealer || o.removed.note, what: 'รถ' });
    if (o.prod_info) ev.push({ ...o.prod_info, act: 'ใส่วันผลิต', note: fmtD(o.prod_info.date), what: 'รถ' });
  }
  return ev.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
}
// any car the system knows: in stock, delivered, taken out, or only in the DL file (invoiced cars IDS has dropped from Stock)
function carAny(vin, D) {
  const c = D.cars.get(vin) || D.deliveredOut.find(x => x.vin === vin) || D.removed.find(x => x.vin === vin);
  if (c) return c;
  const i = D.invByVin.get(vin); if (!i) return null;
  const q = D.quota.find(x => x.vin === vin);
  return { vin, br: i.br, model: i.model, grade: i.grade, color: i.color, spec: specKey(i.model, i.grade, i.color), ref: q ? q.ref : null, status: i.company ? 'company' : i.ddate ? 'delivered' : 'invoiced',
    src: 'DL (ไม่อยู่ในไฟล์ Stock IDS)', age: null, lock: null, temps: [], cust: i.cust, bkno: i.no, fromInv: true };
}
function carModal(m, D) {
  const c = carAny(m.vin, D);
  if (!c) return `<p>ไม่พบรถคันนี้แล้ว</p><div class="flex justify-end mt-3"><button class="btn btn-ghost" data-act="close">ปิด</button></div>`;
  const p = perms(), inv = D.invByVin.get(c.vin), hideCust = isSales() && !(c.lock && isMine(c.lock.owner));
  const q = c.ref ? D.quota.find(x => x.ref === c.ref) : null;
  const bk = D.at.find(a => !a.cancelled && ((a.match && a.match.vin === c.vin) || (a.rec.flow && a.rec.flow.assign && a.rec.flow.assign.vin === c.vin)));
  const row = (k, v) => v === null || v === undefined || v === '' ? '' : `<tr><td class="text-muted nowrap">${k}</td><td>${v}</td></tr>`;
  const ls = carLocks(c, D), hist = carHist(c.vin, D);
  return `<div class="flex items-start justify-between gap-3 mb-2"><div><h2 class="font-head text-xl font-semibold"><span class="code">${esc(c.vin)}</span></h2>
      <div class="mt-1 flex flex-wrap gap-2">${c.status === 'temp' ? chip('ว่าง', 'good') : statusChip(CAR_STATUS, c.status)} ${c.fromInv ? '' : tempChip(c)} ${chip(`${c.br} ${BR[c.br]?.name || ''}`, 'neutral')}</div>${c.fromInv ? '<p class="text-xs text-muted mt-1">รถคันนี้ไม่อยู่ในไฟล์ Stock IDS แล้ว (ออกใบกำกับแล้ว) แสดงข้อมูลจากไฟล์ DL</p>' : ''}</div>
    ${m.back ? '<button class="btn btn-dark btn-sm" data-act="car-back">← กลับ</button>' : '<button class="btn btn-ghost btn-sm" data-act="close">ปิด</button>'}</div>
  <div class="grid md:grid-cols-2 gap-5">
    <div><table class="tbl text-sm"><tbody>
      ${row('รุ่น เกรด สี', specLabel(c.spec))}
      ${row('ปีรุ่น', c.year ? `MY'${String(c.year).slice(-2)} (${c.year})` : '')}
      ${c.fromInv ? '' : row('วันผลิต', `${prodPlain(c)} ${prodBtn(c)}`)}
      ${row('อายุรถ', c.age !== null && c.age !== undefined ? `${c.age} วัน ${c.ageFrom === 'consign' ? '<span class="text-xs text-muted">(นับจากวันฝากศูนย์ ยังไม่มีวันผลิต)</span>' : ''}` : '')}
      ${row('วันที่ฝากศูนย์', c.consign ? fmtD(c.consign) : '')}
      ${row('วันที่เข้าสต็อก', c.stockin ? fmtD(c.stockin) : '')}
      ${row('เลขเครื่อง', c.engine ? `<span class="code">${esc(c.engine)}</span>` : '')}
      ${row('Quota (Ref)', c.ref ? `<span class="code">${esc(c.ref)}</span>${q ? ` · ส่ง ${fmtM(q.m)}${q.week ? ' W' + q.week : ''}` : ''}` : '')}
      ${row('ที่มาข้อมูล', esc(c.src || 'IDS'))}
      ${row('หมายเหตุใน IDS', esc(c.note || ''))}
      ${!isSales() ? row('ข้อความในชีต', c.bknote ? `"${esc(c.bknote)}"` : '') : ''}
      ${row('ใบจองใน IDS', c.bkno ? `<span class="code">${esc(c.bkno)}</span>${c.bkdate ? ` · จอง ${fmtD(c.bkdate)}` : ''}${c.cust && !hideCust ? ` · ${esc(c.cust)}` : c.cust ? ' · ลูกค้าของเซลล์อื่น' : ''}` : '')}
      ${row('วันที่จัดสรร', c.alloc ? fmtD(c.alloc) : '')}
      ${inv ? row('ใบกำกับ (DL)', `${esc(inv.inv || '')} · ${fmtD(inv.idate)}${inv.ddate ? ` · ส่งมอบ ${fmtD(inv.ddate)}` : ' · ยังไม่ส่งมอบ'}${inv.company ? ' · รถบริษัท' : ''}${inv.sales && !isSales() ? ` · ${esc(inv.sales)}` : ''}`) : ''}
    </tbody></table>
    ${bk && (!isSales() || isMine(bk.sales)) ? `<div class="mt-3 p-3 rounded-lg text-sm" style="background:var(--surface-2)">ใบจอง AT Honda ที่ได้รถคันนี้: <b>${esc(bk.cust || '')}</b> · ${esc(bk.sales || '')} · ${bk.flow && bk.flow.next ? `ขั้นถัดไป ${FLOW_LABEL[bk.flow.next]}` : 'ส่งมอบแล้ว'} <button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(bk.id)}">เปิดใบจอง</button></div>` : ''}</div>
    <div class="flex flex-col gap-3 min-w-0">
      <section><h3 class="font-head font-semibold mb-2">ล็อก / คำขอ</h3>
        <div class="border border-line rounded-lg divide-y divide-line">${ls.map(l => lockRow(l, D)).join('') || `<div class="p-3 text-sm text-muted">ยังไม่มีคำขอล็อก</div>`}</div></section>
      <section><h3 class="font-head font-semibold mb-2">ประวัติ</h3>
        <div class="border border-line rounded-lg divide-y divide-line max-h-60 overflow-auto">${hist.slice(0, 40).map(e => `<div class="p-2 px-3 text-sm flex flex-wrap gap-x-3"><span class="num text-muted">${fmtDT(e.at)}</span><span class="font-medium">${esc(e.act)}</span><span class="text-muted">${esc(e.what || '')}${e.note ? ' · ' + esc(e.note) : ''}</span><span class="ml-auto text-xs">${who(e)}</span></div>`).join('') || '<div class="p-3 text-sm text-muted">ยังไม่มีประวัติในระบบนี้</div>'}</div></section>
    </div>
  </div>
  <div class="flex flex-wrap justify-end gap-2 mt-4">
    ${delivBtn(c, D, true)}
    ${carLockable(c) && p.write && p.request ? `<button class="btn btn-red" data-act="lock-open" data-vin="${esc(c.vin)}">${c.status === 'pending' ? 'ขอคิวต่อ' : 'ขอล็อกรถคันนี้'}</button>` : ''}
    ${p.remove && p.write && !c.lock && D.cars.has(c.vin) ? `<button class="btn btn-ghost" data-act="remove-open" data-vin="${esc(c.vin)}">นำรถออก / ย้ายสาขา</button>` : ''}
    ${m.back ? '<button class="btn btn-dark" data-act="car-back">← กลับไปหน้าก่อน</button>' : '<button class="btn btn-ghost" data-act="close">ปิด</button>'}</div>`;
}
// the frame number in a list, clickable
function vinLink(c) { return `<button class="code font-medium underline decoration-dotted text-left" data-act="car-open" data-vin="${esc(c.vin)}" title="ดูรายละเอียดรถ">${esc(c.vin)}</button>`; }
// the bookings waiting for one spec, in queue order (from the "รอรถ" number in สต็อก)
function specQueueModal(m, D) {
  const s = D.specs[m.key] || { waiting: 0, free: 0, incoming: 0 };
  const list = D.bookings.filter(b => b.spec === m.key && b.state === 'waiting').sort((a, b) => (a.pos || 0) - (b.pos || 0) || (a.date || '').localeCompare(b.date || ''));
  return `<div class="flex items-start justify-between gap-3 mb-2"><div><h2 class="font-head text-xl font-semibold">คิวรอรถ · ${specLabel(m.key)}</h2>
    <p class="text-sm text-muted">รอรถ <b class="num">${list.length}</b> ใบ · ว่าง <b class="num">${s.free}</b> คัน · Quota ว่าง <b class="num">${s.incoming}</b> · เรียงตามคิว (วันที่จอง)${isSales() ? ' · เซลล์เห็นชื่อลูกค้าเฉพาะของตัวเอง' : ''}</p></div>
    <button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="border border-line rounded-lg divide-y divide-line max-h-[60vh] overflow-auto">${list.map(b => queueCard(b, D)).join('') || '<div class="p-3 text-sm text-muted">ไม่มีใบจองรอรถสเปกนี้</div>'}</div>
  <div class="flex justify-end gap-2 mt-3"><button class="btn btn-ghost" data-act="close">ปิด</button></div>`;
}
Object.assign(ACTIONS, {
  'specq-open'(el) { S.modal = { kind: 'specq', key: el.dataset.key }; render(); },
  // opened from another window (e.g. checking a delivery note): keep that window to go back to
  'car-open'(el) { const back = S.modal && S.modal.kind !== 'car' ? S.modal : null; S.modal = { kind: 'car', vin: el.dataset.vin, back }; render(); },
  'car-back'() { S.modal = (S.modal && S.modal.back) || null; render(); }
});
