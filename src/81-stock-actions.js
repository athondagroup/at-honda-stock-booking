// ------------------------------------------------------------------ stock page: ล็อก · จัดสรร · ส่งมอบ · นำออก on every car (ตกลง 14/10)
// ล็อก   hold a car: executive / managers at once, the branch admin asks (a manager approves), sales only look
// จัดสรร give the car to a booking so the accessories can start — no lock needed first. Executive / managers: any booking;
//        the branch admin: only a booking with a deposit receipt no. and finance passed (or cash). A car already given
//        to another booking (or invoiced) can be moved: the old booking goes back to waiting and its sales is told.
// ส่งมอบ allocated or invoiced cars — executive, managers, branch admin
// นำออก  executive and managers
// Only function declarations here: the first render runs before this part of the file.
function stockActions(c, p, D) {
  if (isSales() || !p.write) return '';
  const r = S.role.role, mgrLike = r === 'exec' || !!MGR_OF[r];
  const brOk = canApproveBr(c.br) || (r === 'admin' && myBranch() === c.br);
  const btn = (act, label, ok, title, cls = 'btn-ghost') => `<button class="btn ${cls} btn-sm" data-act="${act}" data-vin="${esc(c.vin)}" ${ok ? '' : 'disabled'} title="${esc(title || '')}">${label}</button>`;
  const nLocks = carLocks(c, D).length, pendMine = carLocks(c, D).some(canDecideLock);
  const lockB = nLocks ? `<button class="btn ${pendMine ? 'btn-red' : 'btn-ghost'} btn-sm" data-act="carlock-open" data-vin="${esc(c.vin)}">ล็อก${nLocks > 1 ? ` (${nLocks})` : ''} ▾</button>`
    : btn('lock-open', 'ล็อก', p.request && carLockable(c), carLockable(c) ? '' : 'สถานะนี้ล็อกไม่ได้');
  const deliv = delivBtn(c, D) || btn('cdeliv-open', 'ส่งมอบ', false, 'ต้องจัดสรรหรือออกใบกำกับก่อน');
  return `${lockB}${btn('st-assign', c.assignedTo ? 'จัดสรร ▾' : 'จัดสรร', (brOk || mgrLike) && c.status !== 'company', brOk || mgrLike ? (brOk ? '' : 'รถสาขาอื่น: จัดสรรได้เฉพาะใบจองของสาขาที่ตัวเองดูแล') : 'ไม่ใช่สาขาที่ดูแล')}${deliv}${mgrLike ? btn('remove-open', '− นำออก', p.remove && !c.lock && brOk, c.lock ? 'ยกเลิกล็อกก่อน' : '') : ''}`;
}
// can this person give a car to this booking?
function stAssignWhy(a) {
  const r = S.role.role;
  if (r === 'exec' || MGR_OF[r]) return canApproveBr(a.br) || canApproveBr(a.delivBr) ? '' : 'ใบจองของสาขาที่ไม่ได้ดูแล';
  if (r !== 'admin') return 'บทบาทนี้จัดสรรรถไม่ได้';
  const miss = [];
  if (!String(a.rec.receipt_no || '').trim()) miss.push('เลขที่ใบเสร็จมัดจำ');
  if (!(isCash(a.rec) || (a.rec.flow && a.rec.flow.fin && a.rec.flow.fin.ok))) miss.push('ไฟแนนซ์ผ่าน');
  return miss.length ? 'ยังขาด ' + miss.join(', ') : '';
}
function stAssignModal(m, D) {
  const c = D.cars.get(m.vin); if (!c) return '<p>ไม่พบรถ</p><button class="btn btn-ghost" data-act="close">ปิด</button>';
  const cur = c.assignedTo || carBookingOf(c.vin, D), q = searchKey(m.q || '');
  const list = D.at.filter(a => !a.cancelled && !a.demo && !a.done && (!cur || a.id !== cur.id) && (!q || [a.cust, a.sales, a.no].some(x => x && searchKey(x).includes(q))))
    .map(a => ({ a, why: stAssignWhy(a), same: a.spec === c.spec, model: a.model === c.model, has: !!(a.rec.flow && a.rec.flow.assign && a.rec.flow.assign.vin) }))
    .filter(x => q || x.model)
    .sort((x, y) => (y.same - x.same) || (!!x.why - !!y.why) || (x.has - y.has) || (x.a.date || '').localeCompare(y.a.date || ''))
    .slice(0, 60);
  const row = x => { const a = x.a, f = a.rec.flow || {};
    return `<button class="pick text-left ${m.id === a.id ? 'on' : ''} ${x.why ? 'opacity-60' : ''}" data-act="st-assign-pick" data-id="${esc(a.id)}" ${x.why ? 'aria-disabled="true"' : ''} aria-pressed="${m.id === a.id}">
      <span class="flex-1 min-w-0"><b>${esc(a.cust || '')}</b> ${x.same ? chip('สเปกตรง', 'good') : chip(`สเปกไม่ตรง: ${gradeShort(a.model, a.grade)} ${a.color || ''}`, 'warn')} ${x.has ? chip('มีรถจัดสรรแล้ว', 'neutral') : ''}
      <span class="block text-xs text-muted">${esc(a.br || '')} · ${salesName(a.sales)} · จอง ${fmtD(a.date)} · ${isCash(a.rec) ? 'ซื้อสด' : (f.fin && f.fin.ok ? 'ไฟแนนซ์ผ่าน' : 'ไฟแนนซ์รอผล')} · ${a.rec.receipt_no ? 'ใบเสร็จ ' + esc(a.rec.receipt_no) : 'ยังไม่มีใบเสร็จมัดจำ'}${x.why ? ` · <span style="color:var(--bad)">${esc(x.why)}</span>` : ''}</span></span></button>`; };
  return `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">จัดสรรรถให้ใบจอง</h2>
      <p class="text-sm text-muted"><span class="code">${esc(c.vin)}</span> · ${esc(c.model || '')} ${esc(gradeShort(c.model, c.grade) || '')} ${esc(c.color || '')} · ${esc(c.br)} · ${statusChip(CAR_STATUS, c.status)}</p></div><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
    ${cur ? `<div class="p-3 rounded-lg text-sm mb-3" style="background:var(--warn-soft)">ตอนนี้รถคันนี้อยู่กับใบจอง <b>${esc(cur.cust || '')}</b> (${salesName(cur.sales)}) · ถ้าจัดสรรให้ใบจองอื่น ใบจองเดิมจะกลับไปรอรถ และแจ้งเซลล์เจ้าของ${cur.match && cur.match.vin === c.vin ? ' · <b>IDS จัดสรรคันนี้ให้ใบจองเดิมไว้ ต้องแก้ใน IDS ด้วย</b>' : ''}
      ${cur.rec.flow && cur.rec.flow.assign && cur.rec.flow.assign.vin === c.vin && (canApproveBr(c.br) || S.role.role === 'exec') ? `<div class="mt-2"><button class="btn btn-ghost btn-sm" data-act="st-unassign" data-vin="${esc(c.vin)}">ยกเลิกการจัดสรร (ใบจองเดิมกลับไปรอรถ)</button></div>` : ''}</div>` : ''}
    ${c.st === 'invoiced' ? '<p class="text-sm mb-2" style="color:var(--warn)">IDS ออกใบกำกับคันนี้แล้ว (เช่น advanced invoice) จัดสรรได้ ตรวจชื่อในใบกำกับก่อนส่งมอบ</p>' : ''}
    <div class="field mb-2"><label for="sa-q">ค้นหาใบจอง (ชื่อลูกค้า / เซลล์ / เลขที่ใบจอง) — ไม่ค้นจะแสดงรุ่นเดียวกัน สเปกตรงก่อน</label><input id="sa-q" type="search" data-modal="q" value="${esc(m.q || '')}" autocomplete="off"></div>
    <div class="flex flex-col gap-2 max-h-[50vh] overflow-auto mb-3">${list.map(row).join('') || '<p class="text-sm text-muted">ไม่พบใบจองที่ยังไม่ส่งมอบ</p>'}</div>
    ${S.role.role === 'admin' ? '<p class="text-xs text-muted mb-2">แอดมินจัดสรรได้เมื่อใบจองมีเลขที่ใบเสร็จมัดจำ และไฟแนนซ์ผ่าน (หรือซื้อสด)</p>' : ''}
    <div class="flex justify-end gap-2"><button class="btn btn-ghost" data-act="close">ยกเลิก</button><button class="btn btn-red" data-act="st-assign-save" ${m.id ? '' : 'disabled'}>จัดสรรรถคันนี้</button></div>`;
}
// give the car to booking a; the booking that had it goes back to waiting (its lock on this car is released)
async function stAssignSave(vin, a, D) {
  const c = D.cars.get(vin); if (!c || !a) return false;
  const cur = c.assignedTo || carBookingOf(vin, D), now = new Date().toISOString();
  if (cur && cur.id !== a.id && cur.rec.flow && cur.rec.flow.assign && cur.rec.flow.assign.vin === vin) {
    const r = S.bookings.get(cur.id);
    if (r) { const flow = { ...(r.flow || {}) }; delete flow.assign;
      if (!await write('bookings', cur.id, { ...r, flow, reassigned_out: { vin, to: a.cust || null, to_id: a.id, ...actor() }, log: [...(r.log || []), { ...actor(), act: 'รถที่จัดสรรถูกเปลี่ยนไปให้ใบจองอื่น', note: `${vin} → ${a.cust || ''}` }].slice(-60) })) return false; }
  }
  // locks on this car for other bookings / temporary holds are released
  for (const l of D.locks.filter(l => l.vin === vin && ['pending', 'approved', 'allocated'].includes(l.status) && l.bkref !== a.key)) {
    const L = S.locks.get(l.id); if (!L) continue;
    await saveLock(l.id, { ...L, status: 'released', released_at: now }, 'ปล่อยล็อก (จัดสรรรถให้ใบจองอื่น)', a.cust || '');
  }
  // the booking keeps the car through a lock (so the car shows as taken everywhere) and the allocation step
  if (!D.locks.some(l => l.vin === vin && l.bkref === a.key && ['pending', 'approved', 'allocated'].includes(l.status))) {
    const id = newId('locks'), days = LOCK_DAYS_BY.booking || 15;
    await saveLock(id, { vin, ref: c.ref || null, car_br: c.br, spec: c.spec, type: 'booking', bkref: a.key, bk_br: a.br, sales: a.sales || null, prospect: null, dealer_name: null,
      reason: 'จัดสรรรถ', note: '', warnings: [], status: 'approved', requested_at: now, requested_by: S.me.id || null, approved_at: now, start: todayISO(), end: addDays(todayISO(), days),
      ext: 0, history: [], requested_role: roleLabel(), via_assign: true }, 'จัดสรรรถ', a.cust || '');
  }
  const r = S.bookings.get(a.id); if (!r) return false;
  return write('bookings', a.id, { ...r, reassigned_out: r.reassigned_out && r.reassigned_out.vin === vin ? null : (r.reassigned_out || null), flow: { ...(r.flow || {}), assign: { ...actor(), vin, sales: a.sales, spec_differs: c.spec !== a.spec || null, from_stock: true } } });
}
Object.assign(ACTIONS, {
  'st-assign'(el) { S.modal = { kind: 'stassign', vin: el.dataset.vin, id: null, q: '' }; render(); },
  'st-assign-pick'(el) { const D = derive(), a = D.at.find(x => x.id === el.dataset.id); if (!a) return; const w = stAssignWhy(a); if (w) { toast(w, 'bad'); return; } S.modal.id = a.id; render(); },
  async 'st-assign-save'() {
    const m = S.modal, D = derive(), a = D.at.find(x => x.id === m.id); if (!a) return;
    const w = stAssignWhy(a); if (w) { toast(w, 'bad'); return; }
    if (await stAssignSave(m.vin, a, D)) { S.modal = null; toast(`จัดสรร ${m.vin} ให้ ${a.cust || 'ใบจอง'} แล้ว`); render(); }
  },
  async 'st-unassign'(el) {
    const D = derive(), c = D.cars.get(el.dataset.vin), cur = c && (c.assignedTo || carBookingOf(c.vin, D)); if (!cur) return;
    if (!confirm('ยกเลิกการจัดสรร? ใบจองเดิมจะกลับไปรอรถ')) return;
    const r = S.bookings.get(cur.id); if (!r) return;
    const flow = { ...(r.flow || {}) }; delete flow.assign;
    await write('bookings', cur.id, { ...r, flow, log: [...(r.log || []), { ...actor(), act: 'ยกเลิกการจัดสรรรถ', note: c.vin }].slice(-60) });
    for (const l of D.locks.filter(l => l.vin === c.vin && l.bkref === cur.key && ['pending', 'approved', 'allocated'].includes(l.status))) { const L = S.locks.get(l.id); if (L) await saveLock(l.id, { ...L, status: 'released', released_at: new Date().toISOString() }, 'ปล่อยล็อก (ยกเลิกการจัดสรร)', ''); }
    S.modal = null; toast('ยกเลิกการจัดสรรแล้ว'); render();
  }
});
