// ------------------------------------------------------------------ modals
function renderModal(D) {
  const m = S.modal, root = $('#modal-root');
  if (!m) { root.innerHTML = ''; return; }
  let body = '', wide = false;
  if (m.kind === 'lock') body = lockModal(m, D);
  else if (m.kind === 'remove') body = removeModal(m, D);
  else if (m.kind === 'note') body = noteModal(m);
  else if (m.kind === 'at') { body = atModal(m, D); wide = true; }
  else if (m.kind === 'receive') { body = receiveModal(m, D); wide = true; }
  else if (m.kind === 'prod') body = prodModal(m, D);
  else if (m.kind === 'swap') body = swapModal(m, D);
  else if (m.kind === 'lockbk') { body = lockBkModal(m, D); wide = true; }
  else if (m.kind === 'carlock') { body = carLockModal(m, D); wide = true; }
  else if (m.kind === 'doc') { body = docModal(m); wide = true; }
  else if (m.kind === 'export') body = exportModal(m, D);
  else if (m.kind === 'recvdup') body = recvDupModal(m);
  else if (m.kind === 'idspair') { body = idsPairModal(m, D); wide = true; }
  else if (m.kind === 'tr') { body = trModal(m, D); wide = true; }
  else if (m.kind === 'car') { body = carModal(m, D); wide = true; }
  else if (m.kind === 'tgt') { body = tgtModal(m); wide = true; }
  else if (m.kind === 'cdeliv') { body = cdelivModal(m, D); wide = true; }
  else if (m.kind === 'specq') { body = specQueueModal(m, D); wide = true; }
  else if (m.kind === 'sumcell') { body = sumCellModal(m, D); wide = true; }
  else if (m.kind === 'pm') { body = pmModal(m, D); wide = true; }
  else if (m.kind === 'catedit') { body = catEditModal(m); wide = true; }
  else if (m.kind === 'stassign') { body = stAssignModal(m, D); wide = true; }
  else if (m.kind === 'dio') { body = dioModal(m); wide = true; }
  else if (m.kind === 'idsview') { body = idsViewModal(m); wide = true; }
  else if (m.kind === 'adsales') body = adminSalesModal(m);
  else if (m.kind === 'adbk') { body = adminBkModal(m); wide = true; }
  else if (m.kind === 'adlk') body = adminLkModal(m);
  else if (m.kind === 'menu') body = `<div class="flex items-start justify-between gap-3 mb-1"><h2 class="font-head text-xl font-semibold">เมนู</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
    <nav class="sheet-menu mb-4">${groupsFor().filter(g => !bottomIds().includes(g.id)).map(g => `<a href="#${groupEntry(g)}" data-act="nav" data-view="${groupEntry(g)}">${svg(g.icon || g.views[0])}${g.label}</a>`).join('')}</nav>
    <div class="flex flex-col gap-3">${roleControls('menu')}</div>`;
  else if (m.kind === 'role') body = `<h2 class="font-head text-xl font-semibold mb-3">สลับบทบาททดลอง</h2><div class="flex flex-col gap-3">${roleControls('modal')}</div>
    <div class="flex justify-end mt-4"><button class="btn btn-red" data-act="close">เสร็จ</button></div>`;
  const ae = document.activeElement, keepFocus = ae && root.contains(ae) ? ae.id : null;
  let caret = null; try { caret = keepFocus && typeof ae.selectionStart === 'number' ? ae.selectionStart : null; } catch (e) { caret = null; }
  const scroll = root.querySelector('.modal')?.scrollTop || 0;
  root.innerHTML = `<div class="modal-back" data-act="backdrop"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${body}</div></div>`;
  if (scroll) root.querySelector('.modal').scrollTop = scroll;
  const fe = keepFocus && document.getElementById(keepFocus);
  if (fe) { fe.focus(); if (caret !== null) { try { fe.setSelectionRange(caret, caret); } catch (e) { /* not a text input */ } } }
}
// units a lock can hold: a car in stock (VIN) or a quota slot that has no booking yet (Ref)
function unitOf(m, D) {
  if (m.vin) { const c = D.cars.get(m.vin); return c ? { kind: 'car', key: c.vin, br: c.br, spec: c.spec, age: c.age, label: c.vin, car: c, lock: c.lock, temps: c.temps, ok: carLockOpen(c) } : null; }
  if (m.ref) { const q = D.quota.find(x => x.ref === m.ref); return q ? { kind: 'quota', key: q.ref, br: q.br, spec: q.spec, age: null, label: `Quota ${q.ref} (${fmtM(q.m)})`, q, lock: q.lock, temps: q.temps, ok: q.open || (!q.lock && !q.bk && (q.st === 'waiting' || q.st === 'vin')) } : null; }
  return null;
}
function candidates(spec, D) {
  // free cars first, then invoiced-not-delivered (advanced invoice), then cars with a request waiting
  const open = c => c.status === 'free' || c.status === 'temp', rank = c => open(c) ? 2 : carLockOpen(c) ? 1 : 0;
  const cars = [...D.cars.values()].filter(c => c.spec === spec && carLockable(c)).sort((a, b) => rank(b) - rank(a) || (b.age ?? -1) - (a.age ?? -1));
  const qs = D.quota.filter(q => q.spec === spec && (q.open || quotaQueue(q)) && !q.vin).sort((a, b) => (b.open - a.open) || (a.m || '').localeCompare(b.m || ''));
  return { cars, qs };
}
function recommend(spec, homeBr, D) {
  const all = candidates(spec, D), cars = all.cars.filter(c => c.status !== 'pending'), qs = all.qs.filter(q => q.open);
  if (cars.length) { const oldest = cars[0], own = cars.find(c => c.br === homeBr); return { vin: (own && (oldest.age ?? 0) - (own.age ?? 0) <= AGE_GAP ? own : oldest).vin }; }
  const q = qs.find(x => x.br === homeBr) || qs[0];
  return q ? { ref: q.ref } : {};
}
function lockChecks(m, D) {
  const warn = [], block = [], p = perms();
  const u = unitOf(m, D);
  const b = m.bkref ? D.bookingByKey.get(m.bkref) : null;
  if (m.type === 'booking') {
    if (!b) block.push('เลือกใบจองที่จะล็อกรถให้');
    if (b && b.src === 'IDS' && !b.app) block.push('ใบจองนี้ยังไม่มีในฟอร์ม AT Honda ต้องลงฟอร์มพร้อมแนบใบจองก่อน');
    if (b && b.app && !b.app.rec.imported && !(b.app.deposit > 0 && b.app.slip)) block.push('ใบจองนี้ยังไม่มีมัดจำหรือสลิป');
    if (b && isSales() && !isMine(b.owner)) block.push('ล็อกได้เฉพาะใบจองของตัวเอง');
    if (b && b.state === 'waiting' && b.pos > 1) warn.push(`ใบจองนี้อยู่คิวที่ ${b.pos} มีใบจองสเปกเดียวกันที่จองก่อน ${b.pos - 1} ใบ`);
    if (b && !b.no) warn.push('ใบจองยังไม่อยู่ใน IDS');
  } else if (m.type === 'temp') {
    if (!(m.prospect || '').trim()) block.push('ใส่ชื่อลูกค้าที่จะมาจอง');
    if (!isSales() && !m.sales) block.push('เลือกเซลล์ที่ขอล็อก');
  } else {
    if (!p.mgr) block.push('แลก/ขายดีลเลอร์ ทำได้เฉพาะผู้จัดการ');
    if (!(m.dealer_name || '').trim()) block.push('ใส่ชื่อดีลเลอร์ที่แลกหรือขายรถให้');
  }
  if (!u) { block.push('เลือกรถหรือ Quota 1 คัน'); return { warn, block, u }; }
  if (u.car && (u.car.st === 'invoiced' || u.car.st === 'sold')) warn.push(`IDS ${u.car.st === 'invoiced' ? 'ออกใบกำกับ' : 'แจ้งขาย'}คันนี้แล้ว แต่ยังไม่ส่งมอบ (เช่น advanced invoice ใบจองไม่มีลูกค้าจริง) ล็อกได้ ผู้จัดการตรวจก่อนอนุมัติ`);
  const whose = o => isSales() && !isMine(o) ? 'เซลล์อื่น' : (o || '');
  if (u.lock && u.lock.status !== 'pending') block.push(`คันนี้ล็อกให้ใบจองของ ${whose(u.lock.owner)} แล้ว`);
  else if (u.lock && m.type !== 'temp') {
    const ahead = D.locks.filter(x => x.status === 'pending' && x.type !== 'temp' && (u.kind === 'car' ? x.vin === u.key : x.ref === u.key)).length;
    warn.push(`มีคำขอล็อกให้ใบจองของ ${whose(u.lock.owner)} รออนุมัติอยู่ ${ahead} คำขอ คำขอนี้จะเป็นคิวที่ ${ahead + 1} ผู้จัดการพิจารณาตามลำดับ`);
  }
  if (!u.ok && !u.lock) block.push('คันนี้ไม่ว่างแล้ว');
  if (m.type === 'temp' && u.lock && u.lock.status === 'pending') warn.push(`มีคำขอล็อกให้ใบจองของ ${whose(u.lock.owner)} รออนุมัติอยู่ ถ้าผู้จัดการอนุมัติคำขอนั้น ล็อกชั่วคราวนี้จะถูกปล่อย`);
  if (m.type === 'temp' && u.temps.length) warn.push(`มีคนล็อกชั่วคราวคันนี้อยู่ ${u.temps.length} คน ใครแนบใบจองก่อนได้ก่อน`);
  if (m.type === 'booking' && u.temps.filter(t => !m.convertFrom || t.id !== m.convertFrom).length) warn.push(`ล็อกนี้จะปล่อยล็อกชั่วคราวของ ${u.temps.filter(t => t.id !== m.convertFrom).map(t => whose(t.owner || t.sales_nick)).join(', ')} เมื่อผู้จัดการอนุมัติ`);
  if (b && u.spec !== b.spec) warn.push(`รถคันนี้ ${specLabelText(u.spec)} ไม่ตรงกับใบจอง (${specLabelText(b.spec)}) ผู้จัดการต้องตรวจก่อนอนุมัติ และควรขอเปลี่ยนรุ่น/เกรด/สีในใบจองให้ตรง`);
  if (u.kind === 'car' && b) {
    const pool = candidates(u.spec, D).cars.filter(c => c.vin !== u.key);
    const older = pool.filter(c => c.br === u.br && (c.age ?? 0) > (u.age ?? 0));
    if (older.length) warn.push(`สาขา ${u.br} มีรถสเปกเดียวกันที่เก่ากว่า ${older.length} คัน (FIFO)`);
    if (u.br !== b.br) { const near = pool.filter(c => c.br === b.br && Math.abs((c.age ?? 0) - (u.age ?? 0)) <= AGE_GAP); if (near.length) warn.push(`เลือกรถข้ามสาขา ทั้งที่สาขา ${b.br} มีรถอายุห่างไม่เกิน ${AGE_GAP} วัน ${near.length} คัน`); }
  }
  return { warn, block, u };
}
function lockModal(m, D) {
  const p = perms();
  const b = m.bkref ? D.bookingByKey.get(m.bkref) : null;
  const u = unitOf(m, D);
  const spec = b ? b.spec : u ? u.spec : null;
  const cand = spec ? candidates(spec, D) : { cars: [], qs: [] };
  const rec = b && spec ? recommend(spec, b.br, D) : {};
  const wSpec = u ? u.spec : b ? b.spec : null;
  const myWaiting = wSpec ? D.bookings.filter(x => x.state === 'waiting' && (x.spec === wSpec || (b && x.key === b.key)) && (!isSales() || isMine(x.owner)) && branchOk(x.br)) : [];
  // "every car": all cars of the model, any grade or colour, with the ones that cannot be locked shown but not pickable
  const model = spec ? String(spec).split('|')[0] : null;
  const allCars = m.all && model ? [...D.cars.values()].filter(c => c.model === model && carVisible(c)).sort((x, y) => (y.spec === spec) - (x.spec === spec) || (carLockable(y) - carLockable(x)) || (y.age ?? -1) - (x.age ?? -1)) : [];
  const offCar = c => `<div class="pick opacity-60" aria-disabled="true"><span class="flex-1 min-w-0"><span class="code font-medium">${esc(c.vin)}</span> ${statusChip(CAR_STATUS, c.status)}${c.spec !== spec ? ' ' + chip('สเปกไม่ตรง', 'warn') : ''}
      <span class="block text-xs text-muted">${c.br} ${BR[c.br]?.name || ''} · ${esc(gradeShort(c.model, c.grade))} ${esc(c.color || '')} · อายุ ${c.age ?? '–'} วัน · ล็อกไม่ได้</span></span></div>`;
  const chk = lockChecks(m, D);
  const days = LOCK_DAYS_BY[m.type] || 15;
  const direct = m.type !== 'dealer' ? canApproveBr(u ? u.br : null) : (p.approveDealer);
  const custTxt = x => (!isSales() || isMine(x.owner)) && x.cust ? ' · ' + x.cust : '';
  const pickCar = c => `<button class="pick text-left ${m.vin === c.vin ? 'on' : ''}" data-act="pick" data-vin="${esc(c.vin)}" aria-pressed="${m.vin === c.vin}">
      <span class="flex-1 min-w-0"><span class="code font-medium">${esc(c.vin)}</span> ${rec.vin === c.vin ? chip('แนะนำ', 'good') : ''} ${spec && c.spec !== spec ? chip(`สเปกไม่ตรง: ${gradeShort(c.model, c.grade)} ${c.color || ''}`, 'warn') : ''} ${c.temps.length ? chip(`ล็อกชั่วคราว ${c.temps.length}`, 'warn') : ''} ${c.status === 'pending' ? chip('มีคำขอรออนุมัติ ขอคิวต่อ', 'warn') : ''} ${c.status === 'invoiced' || c.status === 'sold' ? chip(c.status === 'invoiced' ? 'ออกใบกำกับแล้ว ยังไม่ส่งมอบ' : 'แจ้งขายแล้ว ยังไม่ส่งมอบ', 'warn') : ''}
      <span class="block text-xs text-muted">${c.br} ${BR[c.br].name} · ${prodPlain(c)} · อายุ ${c.age ?? '–'} วัน ${c.ref ? '· Ref ' + esc(c.ref) : ''}</span></span></button>`;
  const pickQ = q => `<button class="pick text-left ${m.ref === q.ref && !m.vin ? 'on' : ''}" data-act="pick" data-ref="${esc(q.ref)}" aria-pressed="${m.ref === q.ref && !m.vin}">
      <span class="flex-1 min-w-0"><span class="code font-medium">Quota ${esc(q.ref)}</span> ${rec.ref === q.ref ? chip('แนะนำ', 'good') : ''} ${statusChip(QUOTA_STATUS, q.st)}
      <span class="block text-xs text-muted">${q.br} · ส่ง ${fmtM(q.m)}${q.week ? ' W' + q.week : ''}</span></span></button>`;
  return `<div class="flex items-start justify-between gap-3 mb-3"><h2 class="font-head text-xl font-semibold">${m.convertFrom ? 'ลูกค้ามาจองแล้ว: ขอล็อกให้ใบจอง' : 'ล็อกรถ'}</h2><button class="btn btn-ghost btn-sm" data-act="close" aria-label="ปิด">ปิด</button></div>
  <div class="flex flex-col gap-4">
    ${m.convertFrom ? '' : `<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="ประเภทการล็อก">
      <button class="btn btn-sm ${m.type === 'booking' ? 'btn-dark' : 'btn-ghost'}" data-act="lock-type" data-type="booking">ลูกค้าจองแล้ว (${LOCK_DAYS_BY.booking} วัน)</button>
      <button class="btn btn-sm ${m.type === 'temp' ? 'btn-dark' : 'btn-ghost'}" data-act="lock-type" data-type="temp">ลูกค้ากำลังจะมาจอง (${LOCK_DAYS_BY.temp} วัน)</button>
      ${p.mgr ? `<button class="btn btn-sm ${m.type === 'dealer' ? 'btn-dark' : 'btn-ghost'}" data-act="lock-type" data-type="dealer">แลก/ขายดีลเลอร์อื่น</button>` : ''}
    </div>`}
    ${m.type === 'booking' ? (b && (!m.fixedUnit || m.convertFrom) && m.bkFixed ? `<div class="text-sm p-3 rounded-lg" style="background:var(--surface-2)"><div class="font-medium">ใบจอง ${esc(b.no || '(ยังไม่อยู่ใน IDS)')} · ${b.br} · ${esc(b.owner || '')}${esc(custTxt(b))}</div>
        <div>${specLabel(b.spec)} · จอง ${fmtD(b.date)} ${b.pos ? `· คิวที่ ${b.pos}` : ''}</div>${m.convertFrom ? '' : '<button class="btn btn-ghost btn-sm mt-2" data-act="lock-edit" data-what="bk">เปลี่ยนใบจอง</button>'}</div>`
      : `<div class="field"><label for="m-bk" class="req">ใบจองที่จะได้รถคันนี้ (ต้องมีใบจองแนบในฟอร์ม AT Honda)</label><select id="m-bk" data-modal="bkref"><option value="">เลือกใบจอง</option>
        ${myWaiting.map(x => `<option value="${esc(x.key)}" ${m.bkref === x.key ? 'selected' : ''}>คิว ${x.pos} · ${esc(x.no || 'ยังไม่อยู่ใน IDS')} · ${x.br} · ${esc(x.owner || '')}${esc(custTxt(x))} · ${fmtD(x.date)}${x.app ? '' : ' · ยังไม่มีฟอร์ม'}</option>`).join('')}</select>
        ${myWaiting.length ? '' : m.convertFrom ? `<span class="text-xs">ยังไม่มีใบจองสเปกนี้ในระบบ ลงใบจอง AT Honda พร้อมแนบรูปใบจองก่อน แล้วกลับมากด "ลูกค้ามาจองแล้ว" อีกครั้ง</span>
          <button class="btn btn-ghost btn-sm self-start" data-act="go" data-view="book" data-sub="new">+ ลงใบจอง AT Honda</button>`
          : `<span class="text-xs">ยังไม่มีใบจองสเปกนี้ที่รอรถ${isSales() ? 'ของคุณ' : ''} ถ้าลูกค้ายังไม่ได้จอง ใช้ "ลูกค้ากำลังจะมาจอง"</span>`}</div>`)
      : m.type === 'temp' ? `<div class="grid sm:grid-cols-2 gap-3">
        <div class="field"><label for="m-prospect" class="req">ชื่อลูกค้าที่จะมาจอง</label><input id="m-prospect" data-modal="prospect" value="${esc(m.prospect || '')}" placeholder="ชื่อ หรือชื่อเล่น + เบอร์ท้าย"></div>
        ${isSales() ? '' : `<div class="field"><label for="m-sales" class="req">เซลล์ที่ขอล็อก</label><select id="m-sales" data-modal="sales">${opt(salesNames(), m.sales, 'เลือกเซลล์')}</select></div>`}
        <p class="sm:col-span-2 text-xs text-muted">ล็อกชั่วคราวซ้อนกันได้หลายคน ใครแนบใบจองแล้วกด "ลูกค้ามาจองแล้ว" ก่อน ได้รถก่อน คนที่เหลือและผู้จัดการจะได้รับแจ้งเตือน</p></div>`
      : `<div class="field"><label for="m-dealer" class="req">ชื่อดีลเลอร์</label><input id="m-dealer" data-modal="dealer_name" value="${esc(m.dealer_name || '')}" placeholder="เช่น ฮอนด้า ... (พี่อั้มเป็นผู้อนุมัติ)"></div>`}
    <div><div class="flex flex-wrap items-center gap-2 mb-2"><span class="text-sm font-medium">${m.fixedUnit ? 'รถ / Quota' : m.all ? `ทุกคันของรุ่น ${esc(model || '')} (สเปกตรงขึ้นก่อน)` : 'เลือกรถ (เรียงคันเก่าก่อน) หรือ Quota ที่ยังว่าง'}</span>
        ${m.fixedUnit && !m.convertFrom ? '<button class="btn btn-ghost btn-sm" data-act="lock-edit" data-what="unit">เปลี่ยนคัน</button>' : ''}
        ${!m.fixedUnit && spec ? `<button class="btn btn-ghost btn-sm" data-act="lock-edit" data-what="all" aria-pressed="${!!m.all}">${m.all ? 'เฉพาะสเปกตรงที่ว่าง' : 'แสดงทุกคัน'}</button>` : ''}</div>
      <div class="flex flex-col gap-2 max-h-72 overflow-auto pr-1">
      ${m.fixedUnit ? (u ? `<div class="pick on"><span class="code font-medium">${esc(u.label)}</span> <span class="text-xs text-muted">${u.br} · ${specLabel(u.spec)}${u.car ? ` · ${prodPlain(u.car)}` : ''}${u.age !== null ? ` · อายุ ${u.age} วัน` : ''}</span></div>` : '')
        : !spec ? '<div class="text-sm text-muted">เลือกใบจองก่อน</div>'
        : m.all ? (allCars.map(c => carLockable(c) ? pickCar(c) : offCar(c)).join('') + cand.qs.map(pickQ).join('') || '<div class="text-sm text-muted">ไม่มีรถรุ่นนี้ในสต็อก</div>')
        : (cand.cars.map(pickCar).join('') + cand.qs.map(pickQ).join('') || `<div class="text-sm" style="color:var(--bad)">ไม่มีรถว่างหรือ Quota ว่างสเปกนี้ กด "แสดงทุกคัน" เพื่อดูเกรดหรือสีอื่น</div>`)}
      </div></div>
    <div class="grid sm:grid-cols-2 gap-3">
      <div class="field"><label for="m-reason" class="req">เหตุผลที่ล็อก</label><select id="m-reason" data-modal="reason">${opt(LOCK_REASONS, m.reason)}</select></div>
      <div class="field"><span>ระยะเวลาล็อก</span><div class="min-h-[40px] flex items-center text-sm">${days} วันนับจากวันอนุมัติ${m.type === 'booking' ? ' · มีวันนัดรับรถแล้วถือไว้จนส่งมอบ · ไฟแนนซ์ครบ 15 วันยังไม่ผ่านต้องให้ผู้จัดการอนุมัติต่อ' : ''}</div></div>
    </div>
    ${chk.warn.length ? `<div class="p-3 rounded-lg text-sm" style="background:var(--warn-soft);color:var(--warn)"><b>คำเตือน</b><ul class="list-disc pl-5">${chk.warn.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
    ${chk.block.length ? `<div class="p-3 rounded-lg text-sm" style="background:var(--bad-soft);color:var(--bad)"><ul class="list-disc pl-5">${chk.block.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
    <div class="field"><label for="m-note" class="${m.type === 'temp' || m.reason === 'อื่น ๆ' ? 'req' : ''}">${m.type === 'temp' ? 'เหตุผลที่ขอล็อกก่อนมีใบจอง (ผู้จัดการจะเห็น)' : 'หมายเหตุ (ถ้ามี)'}</label><textarea id="m-note" rows="2" data-modal="note">${esc(m.note || '')}</textarea></div>
    <div class="flex justify-end gap-2"><button class="btn btn-ghost" data-act="close">ยกเลิก</button>
      <button class="btn btn-red" data-act="lock-submit" ${p.write ? '' : 'disabled'}>${direct ? 'ล็อกเลย (ผู้จัดการ)' : 'ส่งขออนุมัติ'}</button></div>
  </div>`;
}
function removeModal(m, D) {
  const car = D.cars.get(m.vin);
  if (!car) return `<p>ไม่พบรถ</p><button class="btn btn-ghost" data-act="close">ปิด</button>`;
  return `<div class="flex items-start justify-between gap-3 mb-1"><h2 class="font-head text-xl font-semibold">นำรถออกจากสต็อก</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <p class="text-sm mb-4"><span class="code font-medium">${esc(car.vin)}</span> ${specLabel(car.spec)} · ${car.br}</p>
  <div class="flex flex-col gap-4">
    <div class="field"><label for="x-reason" class="req">เหตุผล</label><select id="x-reason" data-modal="reason">
      <option value="dealer" ${m.reason === 'dealer' ? 'selected' : ''}>ขาย/แลกให้ดีลเลอร์อื่น</option>
      <option value="move" ${m.reason === 'move' ? 'selected' : ''}>ย้ายไปสาขาอื่นของเรา</option>
      <option value="other" ${m.reason === 'other' ? 'selected' : ''}>อื่น ๆ</option></select></div>
    ${m.reason === 'dealer' ? `<div class="field"><label for="x-dealer" class="req">ชื่อดีลเลอร์</label><input id="x-dealer" data-modal="dealer" value="${esc(m.dealer || '')}"></div>` : ''}
    ${m.reason === 'move' ? `<div class="field"><label for="x-to" class="req">ย้ายไปสาขา</label><select id="x-to" data-modal="to">${BRS.filter(b => b !== car.br).map(b => `<option value="${b}" ${m.to === b ? 'selected' : ''}>${b} ${BR[b].name}</option>`).join('')}</select></div>` : ''}
    <div class="field"><label for="x-note" class="${m.reason === 'other' ? 'req' : ''}">หมายเหตุ</label><input id="x-note" data-modal="note" value="${esc(m.note || '')}"></div>
    <p class="text-xs text-muted">ข้อมูลการขาย/แลกกับดีลเลอร์อื่นไม่มีในไฟล์ IDS การบันทึกที่นี่ครั้งเดียวจึงไม่ใช่การลงซ้ำ และทำให้รถคันนี้ไม่ถูกแจ้งว่า "ไม่พบข้อมูล" ตอนอัปโหลด Stock รอบถัดไป</p>
    <div class="flex justify-end gap-2"><button class="btn btn-ghost" data-act="close">ยกเลิก</button><button class="btn btn-red" data-act="remove-submit">${m.reason === 'move' ? 'ย้ายสาขา' : 'นำออก'}</button></div>
  </div>`;
}
function noteModal(m) {
  return `<h2 class="font-head text-xl font-semibold mb-3">${esc(m.title)}</h2>
  <div class="flex flex-col gap-3">
    ${m.options ? `<div class="field"><label for="n-opt" class="req">เหตุผล</label><select id="n-opt" data-modal="opt">${opt(m.options, m.opt)}</select></div>` : ''}
    <div class="field"><label for="n-note" class="${m.required ? 'req' : ''}">${esc(m.label || 'หมายเหตุ')}</label><textarea id="n-note" rows="3" data-modal="note">${esc(m.note || '')}</textarea></div>
    <div class="flex justify-end gap-2"><button class="btn btn-ghost" data-act="close">ยกเลิก</button><button class="btn btn-red" data-act="note-submit">${esc(m.button)}</button></div>
  </div>`;
}

// ------------------------------------------------------------------ toast
let toastTimer = null;
function toast(msg, tone = 'good') { S.toast = { msg, tone }; renderToast(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = null; renderToast(); }, 3600); }
function renderToast() {
  const t = S.toast;
  $('#toast-root').innerHTML = t ? `<div class="toast px-4 py-2 rounded-lg shadow-lg text-sm font-medium" role="status" style="background:${t.tone === 'bad' ? 'var(--bad)' : 'var(--fg)'};color:${t.tone === 'bad' ? 'var(--on-red)' : 'var(--bg)'}">${esc(t.msg)}</div>` : '';
}

// ------------------------------------------------------------------ IDS upload
const utf8len = o => new TextEncoder().encode(JSON.stringify(o)).length;
async function handleIdsFiles(files) {
  const U = S.upl;
  U.busy = true; U.msg = ''; render();
  try { await loadXLSX(); } catch (e) { U.busy = false; U.msg = 'โหลดตัวอ่านไฟล์ Excel ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่'; render(); return; }
  const results = [];
  const blank = (file, error) => ({ file, sheet: '–', src: null, br: null, rows: [], warn: [], months: [], error });
  for (const f of files) {
    try {
      const rs = IDS.parseWorkbook(await f.arrayBuffer(), f.name);
      if (rs.length) results.push(...rs); else results.push(blank(f.name, 'ไม่พบตาราง Stock / Booking / Quota / Invoice-DL ของ IDS ในไฟล์นี้ ตรวจว่ายังไม่ได้แก้หัวคอลัมน์'));
    } catch (e) { results.push(blank(f.name, 'เปิดไฟล์นี้ไม่ได้ ใช้ไฟล์ .xlsx, .xls หรือ .csv ที่ export จาก IDS')); }
  }
  prepareUploads(results);
  U.results = results; U.busy = false; render();
}
function prepareUploads(results) {
  const D = derive(), X = D.X, seen = new Set();
  const batchInv = new Map(), batchStock = new Map();
  results.filter(r => r.src === 'invoice' && !r.error).forEach(r => r.rows.forEach(i => batchInv.set(i.vin, i)));
  results.filter(r => r.src === 'stock' && !r.error).forEach(r => r.rows.forEach(c => batchStock.set(c.vin, r.br)));
  for (const r of results) {
    r.on = !r.error;
    if (r.error) continue;
    if (myBranch() && r.br !== myBranch()) { r.block = `แอดมินอัปโหลดได้เฉพาะสาขา ${myBranch()}`; r.on = false; continue; }
    if (r.src === 'invoice' && !r.kind) r.kind = r.noCust ? 'other' : 'mine';
    const keys = r.src === 'quota' ? r.months.map(m => idsDocId('quota', r.br, m)) : r.src === 'invoice' ? [idsDocId(r.src, r.br) + ':' + r.kind] : [idsDocId(r.src, r.br)];
    if (keys.some(k => seen.has(k))) { r.block = 'ซ้ำกับตารางก่อนหน้าในชุดนี้ ระบบใช้ตารางแรก'; r.on = false; continue; }
    keys.forEach(k => seen.add(k));
    const cur = r.src === 'quota' ? null : S.ids.get(keys[0]);
    if (cur && r.src !== 'invoice' && r.asof && cur.asof && r.asof < cur.asof) { r.older = `ไฟล์นี้เก่ากว่าข้อมูลที่ใช้อยู่ (ณ ${fmtD(cur.asof)}) จึงไม่ได้เลือกไว้`; r.on = false; }
    if (!r.asof) r.asof = todayISO();
    if (r.src === 'stock') {
      const prev = X.cars.filter(c => c.br === r.br), now = new Set(r.rows.map(c => c.vin)), prevSet = new Set(prev.map(c => c.vin));
      const out = prev.filter(c => !now.has(c.vin)).map(c => {
        const inv = batchInv.get(c.vin) || D.invByVin.get(c.vin);
        const moved = batchStock.get(c.vin) || X.cars.find(x => x.vin === c.vin && x.br !== r.br)?.br;
        const veh = S.vehicles.get(c.vin);
        let why, flag = false;
        if (inv && inv.ddate) why = `ส่งมอบแล้ว ${fmtD(inv.ddate)}`;
        else if (inv) why = `ออกใบกำกับแล้ว ${fmtD(inv.idate)} รอส่งมอบ`;
        else if (moved && moved !== r.br) why = `ย้ายไปสาขา ${moved}`;
        else if (veh && veh.removed) why = veh.removed.reason === 'dealer' ? `ขาย/แลกดีลเลอร์ ${veh.removed.dealer || ''}` : veh.removed.reason === 'other_br' ? `ขายให้สาขาอื่น ${veh.removed.note || ''}` : `นำออก: ${veh.removed.note || ''}`;
        else if (c.st === 'invoiced' || c.st === 'delivered') why = 'ออกใบกำกับแล้วตามข้อมูลเดิม';
        else { why = 'ไม่พบข้อมูลว่าไปไหน (ไม่มีใบกำกับ ไม่ได้ย้ายสาขา ไม่ได้บันทึกขายดีลเลอร์) ต้องตรวจสอบ'; flag = true; }
        return { vin: c.vin, spec: specKey(c.model, c.grade, c.color), why, flag };
      });
      r.diff = { prevN: prev.length, out, inN: r.rows.filter(c => !prevSet.has(c.vin)).length, baseSample: !X.src[r.br].stock };
    } else if (r.src === 'booking') r.diff = { prevN: X.bookings.filter(b => b.br === r.br).length, baseSample: !X.src[r.br].booking };
    else if (r.src === 'quota') r.diff = { prevN: X.quota.filter(q => q.br === r.br && r.months.includes(q.m)).length, baseSample: !X.src[r.br].quota.length };
    else { r.diff = invDiff(r); r.nameChoice = r.diff.lost.length ? (r.nameChoice || null) : null; }
  }
}
function uplNeedsChoice(r) { return r.src === 'invoice' && r.diff && r.diff.lost && r.diff.lost.length && !r.nameChoice; }
async function saveUploads() {
  const U = S.upl, sel = U.results.filter(r => r.on && !r.error && !r.block);
  if (!sel.length) return;
  if (sel.some(uplNeedsChoice)) { toast('เลือกก่อนว่าจะใช้ชื่อลูกค้า/เซลล์เดิม หรือข้อมูลใหม่ (ตาราง DL)', 'bad'); render(); return; }
  U.busy = true; render();
  let ok = 0;
  // invoices first so stock statuses are right the moment stock lands
  const order = { invoice: 0, quota: 1, booking: 2, stock: 3 };
  for (const r of sel.sort((a, b) => order[a.src] - order[b.src])) {
    if (r.src === 'invoice') {
      // merged car by car into what is stored (see invMergeSave)
      if (!await invMergeSave(r)) { U.busy = false; render(); return; }
      await write('uploads', newId('uploads'), { src: r.src, br: r.br, m: null, asof: r.asof, file: r.file, sheet: r.sheet, n: r.rows.length, kind: r.kind,
        prevN: r.diff ? r.diff.prevN : null, add: r.diff ? r.diff.add : 0, upd: r.diff ? r.diff.upd : 0, names: r.diff && r.diff.lost.length ? r.nameChoice : null, out: [], inN: 0, ...actor() });
      ok++; continue;
    }
    const parts = r.src === 'quota' ? r.months.map(m => ({ id: idsDocId('quota', r.br, m), m, rows: r.rows.filter(x => x.m === m) })) : [{ id: idsDocId(r.src, r.br), m: null, rows: r.rows }];
    for (const part of parts) {
      let rows = part.rows;
      const mk = () => ({ src: r.src, br: r.br, m: part.m, asof: r.asof, file: r.file, sheet: r.sheet, n: rows.length, ...pack(r.src, rows), warn: r.warn.slice(0, 20), ...actor() });
      let doc = mk();
      if (utf8len(doc) > 250000) { toast(`ตาราง ${SRC_LABEL[r.src]} ${r.br} ใหญ่เกินที่ต้นแบบเก็บได้`, 'bad'); continue; }
      if (!await write('ids', part.id, doc)) { U.busy = false; render(); return; }
      await write('uploads', newId('uploads'), { src: r.src, br: r.br, m: part.m, asof: r.asof, file: r.file, sheet: r.sheet, n: rows.length,
        prevN: r.diff ? r.diff.prevN : null, out: r.src === 'stock' ? (r.diff?.out || []).slice(0, 300) : [], inN: r.diff?.inN || 0, ...actor() });
      ok++;
    }
  }
  U.busy = false; U.results = [];
  // names typed in the sheet become lock requests (IDS allocation wins; locks made here stay)
  const sh = sel.some(r => r.src === 'stock' || r.src === 'quota') ? await syncSheetLocks() : { made: 0, updated: 0 };
  const dv = sel.some(r => r.src === 'invoice') ? await syncDelivered() : 0;
  toast(`บันทึก ${ok} ตารางแล้ว${sh.made || sh.updated ? ` · คำขอล็อกจากชีตใหม่ ${sh.made}${sh.updated ? ` อัปเดต ${sh.updated}` : ''} รอผู้จัดการอนุมัติ` : ''}${dv ? ` · บันทึกส่งมอบจาก DL ${dv} ใบ` : ''}`);
  render();
}

// ------------------------------------------------------------------ receiving from a photo
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : null;
// several delivery notes picked at once: read and save them one after another; a note already sent is skipped
async function handleReceiveFiles(files) {
  if (!perms().write || !files.length) return;
  const ctl = new AbortController(), sum = { ok: 0, cars: 0, dup: 0, noai: 0, bad: 0 };
  S.ctl.receive = ctl;
  for (const [i, f] of files.entries()) {
    if (ctl.signal.aborted) break;
    const r = await handleReceiveFile(f, { ctl, tag: `ใบที่ ${i + 1}/${files.length}: ` });
    if (!r) { if (ctl.signal.aborted) break; sum.bad++; continue; }
    if (r.dup) sum.dup++; else { sum.ok++; sum.cars += r.cars; if (!r.ai) sum.noai++; }
  }
  S.modal = null; S.sub.receive = 'pending';
  const stop = ctl.signal.aborted ? ' · หยุดก่อนครบ' : '';
  S.ai.receive = { state: sum.ok ? 'done' : 'error', msg: `ส่งแล้ว ${sum.ok} ใบ รวม ${sum.cars} คัน รอแอดมินตรวจและยืนยัน${sum.noai ? ` · AI อ่านไม่ได้ ${sum.noai} ใบ (เก็บรูปไว้ให้แอดมินกรอก)` : ''}${sum.dup ? ` · ซ้ำกับใบที่ส่งแล้ว ${sum.dup} ใบ ไม่ได้บันทึก` : ''}${sum.bad ? ` · เปิดรูปไม่ได้ ${sum.bad} ใบ` : ''}${stop}` };
  render();
}
async function handleReceiveFile(file, batch) {
  if (!perms().write || !file) return null;
  const ctl = batch ? batch.ctl : new AbortController(), tag = batch ? batch.tag : '';
  if (!batch) S.ctl.receive = ctl;
  S.ai.receive = { state: 'running', msg: tag + 'กำลังเตรียมรูป…' }; render();
  let blob;
  try { blob = await shrink(file); } catch (e) { if (!batch) { S.ai.receive = { state: 'error', msg: e.message || 'เปิดรูปนี้ไม่ได้' }; render(); } return null; }
  S.ai.receive.msg = tag + 'กำลังเก็บรูป…'; render();
  const img = await storeImage(blob);
  if (ctl.signal.aborted) { S.ai.receive = null; render(); return null; }
  let res = null, why = '';
  if (aiReady()) {
    S.ai.receive.msg = tag + 'AI กำลังอ่านใบ New Car ใช้เวลาประมาณ 10–60 วินาที'; render();
    try { res = await aiRead(RECEIVE_PROMPT(), [blob], ctl.signal); if (!res || typeof res !== 'object') { res = null; why = 'AI ตอบไม่ครบ'; } }
    catch (e) { if (e && e.code === 'cancelled') { S.ai.receive = null; render(); return null; } why = aiMsg(e); }
  } else why = 'AI ไม่ได้อ่านรูปนี้ แอดมินต้องกรอกข้อมูลจากรูป';
  const br = myBranch() || IDS.dealerBr(res?.dealer_code || '') || IDS.dealerBr((String(res?.ship_to || '').match(/D\s*(\d{3,4})/) || [])[1] || '')
    || (S.role.role === 'sales' ? salesBranch(S.role.sales) : null) || S.br || 'PSC';
  const cars = Array.isArray(res?.cars) && res.cars.length ? res.cars.slice(0, 6).map(c => receiveCarFromAi(c, br)) : [{ vin: '', model: '', grade: '', color: '', engine: '', br }];
  const doc = {
    img, img_missing: !img, doc_no: res?.doc_no || '', doc_date: validDate(res?.doc_date) || todayISO(), dealer_code: res?.dealer_code || '', br,
    ref_no: res?.ref_no || '', transporter: res?.transporter || '', plate: res?.truck_plate || '', sign_date: validDate(res?.dealer_sign_date),
    cars, unreadable: (Array.isArray(res?.unreadable) ? res.unreadable : []).slice(0, 10).map(String), ai_ok: !!res, ai_msg: res ? '' : why,
    status: 'pending', created_at: new Date().toISOString(), by: S.me.id || null, role: roleLabel()
  };
  // the same delivery note sent again (same document number, or the same frame numbers): warn instead of a second receipt
  const dups = receiptDups(doc);
  if (dups.length) {
    if (batch) return { dup: true };
    S.ai.receive = { state: 'error', msg: 'ใบนี้ส่งเข้ามาแล้ว ยังไม่ได้บันทึกซ้ำ' }; S.modal = { kind: 'recvdup', doc, dups: dups.map(r => r.id) }; render(); return { dup: true };
  }
  const ok = await saveReceipt(doc, !!batch);
  return ok ? { cars: doc.cars.length, ai: doc.ai_ok } : null;
}
// receipts already holding this delivery note: same document number, or any of the same frame numbers (rejected ones skipped)
function receiptDups(doc) {
  const no = String(doc.doc_no || '').trim().toUpperCase(), vins = new Set((doc.cars || []).map(c => c.vin).filter(v => VIN_RE.test(v || '')));
  return [...S.receipts.entries()].map(([id, r]) => ({ id, ...r })).filter(r => !r.hidden && r.status !== 'rejected'
    && ((no && String(r.doc_no || '').trim().toUpperCase() === no) || (r.cars || []).some(c => vins.has(String(c.vin || '').toUpperCase()))));
}
async function saveReceipt(doc, quiet) {
  const res = doc.ai_ok, cars = doc.cars, br = doc.br, why = doc.ai_msg;
  const id = newId('receipts');
  const saved = await write('receipts', id, doc);
  if (saved && quiet) return true;
  if (saved) {
    S.ai.receive = res ? { state: 'done', msg: `อ่านแล้ว ${cars.length} คัน (${cars.map(c => c.vin || '?').join(', ')}) รอแอดมินตรวจและยืนยัน` } : { state: 'error', msg: `${why} เก็บรูปไว้ให้แอดมินแล้ว` };
    S.sub.receive = 'pending';
    if (perms().confirmReceive && branchOk(br)) S.modal = { kind: 'receive', id, r: JSON.parse(JSON.stringify(doc)), status: 'pending', note: '' };
  } else S.ai.receive = null;
  render();
  return saved;
}

// ------------------------------------------------------------------ AT Honda booking
const num = v => v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v);
async function runBookingAi() {
  const f = S.files;
  if (!f.bk.length) return;
  const ctl = new AbortController();
  S.ctl.booking = ctl;
  S.ai.booking = { state: 'running' }; render();
  const max = S.cap.images?.maxCount || 5;
  const bk = f.bk.slice(0, Math.max(1, max - Math.min(f.slip.length, 2)));
  const slip = f.slip.slice(0, Math.max(0, max - bk.length));
  try {
    const res = await aiRead(BOOKING_PROMPT(bk.length, slip.length), [...bk, ...slip].map(x => x.blob), ctl.signal);
    if (!res || typeof res !== 'object') throw { code: 'invalid_json' };
    applyBookingAi(res);
    S.ai.booking = { state: 'done' };
  } catch (e) { S.ai.booking = e && e.code === 'cancelled' ? null : { state: 'error', msg: aiMsg(e) }; }
  render();
}
async function saveBooking() {
  const d = S.draft.booking, D = derive(), msg = $('#booking-msg');
  const missing = [];
  if (!S.files.bk.length) missing.push('หน้าใบจอง (รูป)');
  if (!d.booking_date) missing.push('วันที่จอง');
  if (!d.sales) missing.push('ชื่อเซลล์');
  if (d.source === 'อื่น ๆ' && !String(d.source_other || '').trim()) missing.push('แหล่งที่มาอื่น (พิมพ์)');
  if (!d.customer.trim()) missing.push('ชื่อ-นามสกุลลูกค้า');
  if (!d.model || !d.grade || !d.color) missing.push('รุ่นรถ / เกรด / สี');
  if (!d.purchase) missing.push('เงื่อนไข');
  if (!d.insurance) missing.push('ประกันภัย');
  if (d.discount === '' || d.discount === null || d.discount === undefined) missing.push('ส่วนลด (ไม่มีใส่ 0)');
  if (d.foc_total === '' || d.foc_total === null || d.foc_total === undefined) missing.push('FOC (ไม่มีใส่ 0)');
  if (d.booking_no && !/^\d{8,12}$/.test(d.booking_no.trim())) missing.push('เลขที่ใบจองต้องเป็นตัวเลข 8–12 หลัก');
  const checks = bookingChecks(d, D);
  const block = checks.find(c => c.block);
  if (missing.length || block) { if (msg) msg.innerHTML = `<span style="color:var(--bad)">${missing.length ? 'ยังขาด: ' + missing.map(esc).join(', ') : esc(block.t)}</span>`; return; }
  S.saving = true; render();
  const doc_imgs = [], slip_imgs = [];
  let imgMissing = false;
  for (const x of S.files.bk) { const id = await storeImage(x.blob); if (id) doc_imgs.push(id); else imgMissing = true; }
  for (const x of S.files.slip) { const id = await storeImage(x.blob); if (id) slip_imgs.push(id); else imgMissing = true; }
  const id = newId('bookings');
  const fin = d.purchase === 'ไฟแนนซ์';
  const rec = {
    booking_no: d.booking_no.trim() || null, booking_date: d.booking_date, br: myBranch() || d.br || salesBranch(d.sales), sales: d.sales, customer: d.customer.trim(), source: d.source === 'อื่น ๆ' ? `อื่น ๆ: ${String(d.source_other || '').trim()}` : d.source,
    model: d.model, grade: d.grade, color: d.color, model_text: d.model_text || null, purchase: d.purchase, finance: fin ? d.finance : null,
    fin_status: fin ? 'รอผล' : null, deposit: num(d.deposit) || 0, receipt_no: (d.receipt_no || '').trim() || null, discount: num(d.discount), foc_total: num(d.foc_total), insurance: d.insurance,
    ...bookPriceSnap(d),
    delivery_plan: validDate(d.delivery_plan), lead_id: d.lead_id || null, note: d.note || null, ids_claim: d.ids_claim || null,
    doc_imgs, slip_imgs, img_missing: imgMissing, slip: S.files.slip.length > 0, flow: {},
    ai: d.ai, ai_ok: !!d.ai, ai_fields: d.aiFields, checks: checks.map(({ t, bad }) => ({ t, bad: !!bad })),
    status: 'active', created_at: new Date().toISOString(), created_by: S.me.id || null, created_role: roleLabel()
  };
  const dups = dupBookings(d, D);
  if (dups.length) rec.multi = { reason: d.multi_reason, note: (d.multi_note || '').trim() || null, with: dups.map(x => x.id), old: d.multi_old || null, ...actor() };
  const saved = await write('bookings', id, rec);
  S.saving = false;
  if (saved && rec.multi && d.multi_old && d.multi_reason.startsWith('เปลี่ยนรุ่น')) {
    const old = D.at.find(x => x.id === d.multi_old);
    if (old && !old.cancelled && canEditBooking(old)) {
      const note = `ลงใบจองใหม่ ${rec.model} ${gradeShort(rec.model, rec.grade)} ${rec.color} แล้ว`;
      if (canApproveBr(old.br)) {
        await saveBk(old.id, 'ยกเลิกใบจอง (ผู้จัดการ)', `เปลี่ยนรุ่น · ${note}`, x => { x.status = 'cancelled'; x.cancelled_at = new Date().toISOString(); x.cancel = { reason: 'เปลี่ยนรุ่น ลงใบจองใหม่แล้ว', req_note: note, req: null, note, refund: 'transfer', amount: trAmount(old), transfer: { reason: trReasons()[0], note, amount: trAmount(old), to: id }, to: id, ...actor() }; }, x => x.status !== 'cancelled' && pendingFree(x));
        await trLinkTo(old, id);
        await releaseFor(old, 'เปลี่ยนรุ่น ลงใบจองใหม่แล้ว');
      } else await saveBk(old.id, 'ขอยกเลิกใบจอง', `เปลี่ยนรุ่น · ${note}`, x => { x.change = { id: rid(), type: 'cancel', reason: 'เปลี่ยนรุ่น ลงใบจองใหม่แล้ว', note, refund: 'transfer', to: id, status: 'pending', ...actor() }; }, x => x.status !== 'cancelled' && pendingFree(x));
    }
  }
  if (saved) {
    resetBooking();
    S.sub.book = 'list'; S.filters.aq = ''; S.filters.aState = 'active';
    // trial period: open the new booking so the "send to Google Form" step is right there
    S.modal = { kind: 'at', id };
    toast(imgMissing ? 'บันทึกใบจองแล้ว แต่มุมมองนี้เก็บรูปไม่ได้' : 'บันทึกใบจองเข้าคิวแล้ว');
  }
  render();
}
function resetBooking() {
  S.files.bk.concat(S.files.slip).forEach(x => { try { URL.revokeObjectURL(x.url); } catch (e) { /* ignore */ } });
  S.files.bk = []; S.files.slip = [];
  S.draft.booking = newBookingDraft();
  S.ai.booking = null;
}

// ------------------------------------------------------------------ actions
function findLock(id) { const l = S.locks.get(id); return l ? { ...l, history: [...(l.history || [])] } : null; }
async function saveLock(id, l, act, note) {
  l.history = [...(l.history || []), { ...actor(), act, note: note || '' }].slice(-40);
  return write('locks', id, l);
}
// a car and the quota slot it came from are the same unit
function unitKeysOf(l, D) {
  const ks = new Set();
  if (l.vin) { ks.add('V:' + l.vin); const c = D.cars.get(l.vin); if (c && c.ref) ks.add('R:' + c.ref); }
  if (l.ref) { ks.add('R:' + l.ref); const q = D.quota.find(x => x.ref === l.ref); if (q && q.vin) ks.add('V:' + q.vin); }
  return ks;
}
const sameUnit = (a, b, D) => { const A = unitKeysOf(a, D); return [...unitKeysOf(b, D)].some(k => A.has(k)); };
// once a booking lock is in force: temporary locks on that unit are bumped (and alerted), other pending booking requests are declined.
// Returns what it changed so an approval pressed by mistake can be reversed.
async function settleUnit(D, l, id) {
  const others = D.locks.filter(x => x.id !== id && x.id !== l.convert_from && x.live && sameUnit(x, l, D));
  const side = [];
  for (const o of others) {
    const cur = findLock(o.id); if (!cur) continue;
    const from = cur.status;
    if (o.type === 'temp') {
      cur.status = 'bumped'; cur.bumped_by = l.sales || null; cur.bumped_at = new Date().toISOString();
      if (await saveLock(o.id, cur, 'ปล่อยล็อกชั่วคราว', `ใบจองของ ${l.sales || ''} ได้รถคันนี้`)) side.push({ id: o.id, from, to: 'bumped' });
    } else if (o.status === 'pending') {
      cur.status = 'rejected';
      if (await saveLock(o.id, cur, 'ไม่อนุมัติ', `รถคันนี้ล็อกให้ใบจองของ ${l.sales || ''} แล้ว`)) side.push({ id: o.id, from, to: 'rejected' });
    }
  }
  return side;
}
const markUndo = (l, act, from, side) => { l.undo = { act, from, side: side || [], at: new Date().toISOString(), role: roleLabel(), by: S.me.id || null }; };
function setHash() { const s = S.sub[S.view]; const h = '#' + S.view + (s && S.view !== 'stock' ? '/' + s : ''); if (location.hash !== h) history.replaceState(null, '', h); }
function setBr(b) { S.br = BR[b] ? b : ''; lsSet('ath-br', S.br); }
const atById = id => derive().at.find(x => x.id === id);
async function saveFlow(a, patch, msg) {
  const r = S.bookings.get(a.id); if (!r) return false;
  const rec = { ...r, ...patch, flow: { ...(r.flow || {}), ...(patch.flow || {}) } };
  const ok = await write('bookings', a.id, rec);
  if (ok && msg) toast(msg);
  return ok;
}
function assignDefault(a, D) {
  const lockCar = [...D.cars.values()].find(c => c.lock && c.lock.bkref && (c.lock.bkref === a.key || c.lock.bkref === a.row?.key));
  return lockCar ? lockCar.vin : (a.match && a.match.vin) || '';
}
const ACTIONS = {
  nav(el) { S.view = el.dataset.view; if (el.dataset.sub) S.sub[S.view] = el.dataset.sub; S.modal = null; setHash(); render(); window.scrollTo(0, 0); },
  go(el) {
    S.view = el.dataset.view;
    if (el.dataset.sub) S.sub[S.view] = el.dataset.sub;
    if (el.dataset.br !== undefined) setBr(el.dataset.br);
    if (el.dataset.q !== undefined && S.view === 'book') { S.filters.aq = el.dataset.q; S.filters.aState = 'all'; S.sub.book = 'list'; }
    S.modal = null; setHash(); render(); window.scrollTo(0, 0);
  },
  sub(el) { S.sub[el.dataset.key] = el.dataset.sub; setHash(); render(); },
  // jump to the booking list with one status filter (from the dashboard or the quick chips)
  'book-filter'(el) { S.filters.aState = el.dataset.st; S.view = 'book'; S.sub.book = 'list'; if (el.dataset.br !== undefined) setBr(el.dataset.br); S.modal = null; setHash(); render(); window.scrollTo(0, 0); },
  br(el) { setBr(el.dataset.br); render(); },
  menu() { S.modal = { kind: 'menu' }; render(); },
  spec(el) { S.filters.specOpen = S.filters.specOpen === el.dataset.key ? null : el.dataset.key; render(); },
  close() { S.modal = null; render(); },
  'render-reset'() { const keep = { specOpen: null }; Object.keys(S.filters).forEach(k => { S.filters[k] = typeof S.filters[k] === 'boolean' ? false : ''; }); Object.assign(S.filters, keep); S.modal = null; render(); },
  backdrop(el, ev) { if (ev.target === el) { S.modal = null; render(); } },
  'open-role'() { S.modal = { kind: 'role' }; render(); },
  'booking-reset'() { resetBooking(); render(); },
  'file-remove'(el) { const a = S.files[el.dataset.kind]; const [x] = a.splice(Number(el.dataset.i), 1); if (x) URL.revokeObjectURL(x.url); render(); },
  'ai-booking'() { runBookingAi(); },
  'ai-stop'(el) { S.ctl[el.dataset.kind]?.abort(); },
  'at-open'(el) {
    S.files.fin.forEach(x => { try { URL.revokeObjectURL(x.url); } catch (e) { /* ignore */ } });
    S.files.fin = [];
    S.modal = { kind: 'at', id: el.dataset.id }; render();
  },
  'sum-reset'() { ['sFrom', 'sTo', 'sModel', 'sGrade', 'sColor', 'sSales'].forEach(k => { S.filters[k] = ''; }); render(); },
  // an IDS booking with no AT form: open the AT form already filled from IDS
  'ids-claim'(el) {
    const D = derive(), b = D.idsB.find(x => x.no === el.dataset.id);
    if (!b) return;
    resetBooking();
    const d = S.draft.booking, fit = fitSpec({ model: b.model, grade: b.grade, color: b.color });
    Object.assign(d, { booking_no: b.no, booking_date: b.date || todayISO(), br: b.br, sales: isSales() ? S.role.sales : (fitSales(b.sales) || ''),
      customer: b.cust || '', model: fit.model, grade: fit.grade, color: fit.color, ids_claim: b.no });
    S.view = 'book'; S.sub.book = 'new'; S.modal = null; setHash(); render(); window.scrollTo(0, 0);
    toast('ดึงข้อมูลจาก IDS แล้ว แนบรูปใบจองและสลิปแล้วบันทึก');
  },

  // ---- locks
  'lock-open'(el) {
    const D = derive();
    const m = { kind: 'lock', vin: null, ref: null, fixedUnit: false, bkFixed: false, type: 'booking', bkref: '', prospect: '', sales: isSales() ? S.role.sales : '',
      dealer_name: '', reason: LOCK_REASONS[0], note: '', convertFrom: null };
    if (el.dataset.bk) {
      const b = D.bookingByKey.get(el.dataset.bk);
      m.bkref = b ? b.key : el.dataset.bk; m.bkFixed = true;
      if (b) Object.assign(m, recommend(b.spec, b.br, D));
      // nothing free in this exact spec: open on every car of the model so another grade or colour can be picked
      if (b && !m.vin && !m.ref) m.all = true;
    } else {
      if (el.dataset.vin) m.vin = el.dataset.vin; else m.ref = el.dataset.ref;
      m.fixedUnit = true;
      const u = unitOf(m, D);
      const waiting = u ? D.bookings.filter(x => x.state === 'waiting' && x.spec === u.spec && x.app && (!isSales() || isMine(x.owner)) && branchOk(x.br)) : [];
      m.type = waiting.length ? 'booking' : 'temp';
    }
    S.modal = m; render();
  },
  'lock-type'(el) { S.modal.type = el.dataset.type; render(); },
  // the request stays editable: another booking, another car, or every car of the model
  'lock-edit'(el) {
    const m = S.modal, w = el.dataset.what; if (!m) return;
    if (w === 'bk') { m.bkFixed = false; }
    if (w === 'unit') { const u = unitOf(m, derive()); m.fixedUnit = false; m.all = false; if (u && !m.bkref) m.spec0 = u.spec; }
    if (w === 'all') m.all = !m.all;
    render();
  },
  pick(el) {
    if (el.dataset.vin) { S.modal.vin = el.dataset.vin; S.modal.ref = null; } else { S.modal.ref = el.dataset.ref; S.modal.vin = null; }
    render();
  },
  // the customer behind a temporary lock has booked: ask for a booking lock on the same unit
  'lock-convert'(el) {
    const D = derive(), t = D.locks.find(x => x.id === el.dataset.id);
    if (!t) return;
    const mine = D.bookings.filter(x => x.state === 'waiting' && x.spec === t.spec && x.app && isMine(x.owner)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    S.modal = { kind: 'lock', type: 'booking', vin: t.vin || null, ref: t.vin ? null : t.ref, fixedUnit: true, bkFixed: false, bkref: mine[0] ? mine[0].key : '',
      prospect: t.prospect || '', sales: t.owner || '', dealer_name: '', reason: LOCK_REASONS[0], note: '', convertFrom: t.id };
    render();
  },
  async 'lock-submit'() {
    const m = S.modal, D = derive(), p = perms();
    const chk = lockChecks(m, D);
    if (chk.block.length) { toast(chk.block[0], 'bad'); return; }
    // a reason is needed only when there is no booking yet (temporary lock), or "other" was picked
    if ((m.type === 'temp' || m.reason === 'อื่น ๆ') && !(m.note || '').trim()) { toast('ใส่เหตุผลก่อนส่ง (ยังไม่มีใบจอง)', 'bad'); $('#m-note')?.focus(); return; }
    const u = chk.u;
    const b = m.type === 'booking' && m.bkref ? D.bookingByKey.get(m.bkref) : null;
    const direct = m.type === 'dealer' ? p.approveDealer : canApproveBr(u.br);
    const days = LOCK_DAYS_BY[m.type] || 15;
    const owner = m.type === 'booking' ? (b ? b.owner : null) : m.type === 'temp' ? (isSales() ? S.role.sales : m.sales) : null;
    const id = newId('locks'), now = new Date().toISOString();
    const l = {
      vin: u.kind === 'car' ? u.key : null, ref: u.kind === 'quota' ? u.key : null, car_br: u.br, spec: u.spec, type: m.type,
      bkref: b ? (b.app ? b.app.key : b.key) : null, bk_br: b ? b.br : null, sales: owner || null,
      prospect: m.type === 'temp' ? m.prospect.trim() : null, dealer_name: m.type === 'dealer' ? m.dealer_name.trim() : null,
      reason: m.reason, note: (m.note || '').trim(), warnings: chk.warn, status: 'pending', requested_at: now, requested_by: S.me.id || null,
      ext: 0, history: [], convert_from: m.convertFrom || null, requested_role: roleLabel()
    };
    const conv = m.convertFrom ? findLock(m.convertFrom) : null;
    if (direct) { l.status = 'approved'; l.start = todayISO(); l.end = addDays(l.start, days); l.approved_at = now; }
    const act = direct ? (m.type === 'temp' ? 'ล็อกชั่วคราว (ผู้จัดการ)' : 'ล็อก (ผู้จัดการ)') : (m.type === 'temp' ? 'ขอล็อกชั่วคราว' : 'ขอล็อก');
    if (!await saveLock(id, l, act, direct ? `หมด ${fmtD(l.end)}` : (l.note || l.reason))) return;
    if (conv) { conv.status = 'converted'; conv.converted_to = id; await saveLock(m.convertFrom, conv, 'ลูกค้ามาจองแล้ว', `เปลี่ยนเป็นล็อกให้ใบจอง${direct ? '' : ' รอผู้จัดการอนุมัติ'}`); }
    if (direct && m.type !== 'temp') await settleUnit(derive(), l, id);
    S.modal = null; S.view = 'lock'; S.sub.lock = direct ? 'active' : 'approve'; setHash();
    toast(direct ? `ล็อกแล้วถึง ${fmtD(l.end)}` : 'ส่งให้ผู้จัดการอนุมัติแล้ว'); render();
  },
  async approve(el) {
    const cur0 = S.locks.get(el.dataset.id);
    const L0 = derive().locks.find(x => x.id === el.dataset.id);
    if (L0 && L0.idsTook && !L0.idsTook.same) { toast(L0.idsTook.st === 'delivered' ? 'รถคันนี้ส่งมอบแล้ว อนุมัติไม่ได้ กดไม่อนุมัติเพื่อปิดคำขอ' : 'IDS จัดสรรรถคันนี้ให้ใบจองอื่นแล้ว อนุมัติไม่ได้ กดไม่อนุมัติเพื่อปิดคำขอ', 'bad'); return; }
    if (cur0 && !(cur0.type === 'dealer' ? perms().approveDealer : canApproveBr(cur0.car_br))) { toast(`อนุมัติได้เฉพาะ${cur0.type === 'dealer' ? 'พี่อั้ม' : MGR_NAME[cur0.car_br] || 'ผู้จัดการสาขานั้น'}`, 'bad'); return; }
    const id = el.dataset.id, l = await claimFresh('locks', id, x => x.status === 'pending');
    if (!l) return;
    const D = derive();
    const hard = D.locks.find(x => x.id !== id && x.live && x.type !== 'temp' && x.status !== 'pending' && sameUnit(x, l, D));
    if (hard) { toast(`หน่วยนี้ล็อกให้ ${hard.owner || hard.dealer_name || 'ใบจองอื่น'} แล้ว`, 'bad'); return; }
    const days = LOCK_DAYS_BY[l.type === 'customer' ? 'booking' : l.type] || 15;
    l.status = 'approved'; l.start = todayISO(); l.end = addDays(l.start, days); l.approved_at = new Date().toISOString();
    markUndo(l, 'อนุมัติ', 'pending');
    if (!await saveLock(id, l, 'อนุมัติล็อก', `หมด ${fmtD(l.end)}`)) return;
    if (l.type !== 'temp') {
      const side = await settleUnit(derive(), l, id);
      if (side.length) { const cur = findLock(id); cur.undo = { ...cur.undo, side }; await write('locks', id, cur); }
    }
    toast(`อนุมัติแล้ว ล็อกถึง ${fmtD(l.end)}`);
  },
  // put a lock back to where it was before the last action (pressed by mistake)
  async undo(el) {
    const id = el.dataset.id, l = await claimFresh('locks', id, x => canUndo(x)), D = derive();
    if (!l || !canUndo(l)) { toast('ย้อนกลับไม่ได้แล้ว (เกิน 24 ชั่วโมง) ให้ผู้จัดการสาขาของรถเป็นคนย้อนกลับ', 'bad'); return; }
    const u = l.undo, holds = ['pending', 'approved', 'allocated'].includes(u.from) && u.from !== 'pending' && l.type !== 'temp';
    if (holds) {
      const other = D.locks.find(x => x.id !== id && x.live && x.type !== 'temp' && x.status !== 'pending' && sameUnit(x, l, D));
      if (other) { toast(`ย้อนกลับไม่ได้ ตอนนี้คันนี้ล็อกให้ ${other.owner || 'ใบจองอื่น'} แล้ว`, 'bad'); return; }
    }
    l.status = u.from; delete l.undo;
    if (u.from === 'pending') { delete l.start; delete l.end; delete l.approved_at; }
    if (!await saveLock(id, l, `ย้อนกลับ: ${u.act}`, 'กดผิด')) return;
    // reverse what an approval did to other requests on the same unit
    for (const sd of u.side || []) {
      const o = findLock(sd.id); if (!o || o.status !== sd.to) continue;
      o.status = sd.from; delete o.bumped_by; delete o.bumped_at;
      await saveLock(sd.id, o, `ย้อนกลับ: ${u.act} ของคำขออื่น`, 'กดผิด');
    }
    toast(`ย้อนกลับแล้ว สถานะกลับเป็น "${{ pending: 'รออนุมัติ', approved: 'ล็อก', allocated: 'แจ้งจัดสรรแล้ว รอไฟล์ IDS' }[u.from] || u.from}"`);
  },
  'reject-open'(el) { S.modal = { kind: 'note', act: 'reject', id: el.dataset.id, title: 'ไม่อนุมัติการล็อก', label: 'เหตุผล (ผู้ขอจะเห็น)', required: true, button: 'ไม่อนุมัติ' }; render(); },
  'bd-clear'() { Object.assign(S.filters, { bDFrom: '', bDTo: '', qModel: '', bGrade: '', bColor: '', bSales: '', aState: 'active' }); render(); },
  'hist-type'(el) { S.filters.histType = el.dataset.k; render(); },
  'dealer-sold'(el) { const l = S.locks.get(el.dataset.id); if (!l) return; S.modal = { kind: 'note', act: 'dealer-sold', id: el.dataset.id, title: `ขายให้ ${l.dealer_name || 'ดีลเลอร์'} สำเร็จ · นำรถออกจากสต็อก`, label: 'หมายเหตุ (เช่น เลขที่เอกสาร วันที่ส่งรถ)', note: '', button: 'ยืนยันขายสำเร็จ' }; render(); },
  'dealer-edit'(el) { const l = S.locks.get(el.dataset.id); if (!l) return; S.modal = { kind: 'note', act: 'dealer-edit', id: el.dataset.id, title: 'แก้ไขการแลก/ขายดีลเลอร์', label: 'ชื่อดีลเลอร์', note: l.dealer_name || '', required: true, button: 'บันทึก' }; render(); },
  'release-open'(el) {
    const l = S.locks.get(el.dataset.id);
    if (l && l.type === 'dealer') { S.modal = { kind: 'note', act: 'release', id: el.dataset.id, title: 'ยกเลิกการแลก/ขายดีลเลอร์ คืนรถเป็นว่าง', options: ['ดีลเลอร์ยกเลิก', 'ไม่แลก/ไม่ขายแล้ว', 'เปลี่ยนไปใช้รถคันอื่น', 'อื่น ๆ'], opt: 'ดีลเลอร์ยกเลิก', label: 'หมายเหตุ', button: 'ยกเลิกการแลก/ขาย' }; render(); return; }
    S.modal = { kind: 'note', act: 'release', id: el.dataset.id, title: 'ปล่อยล็อก คืนรถเป็นว่าง', options: ['ไฟแนนซ์ไม่ผ่าน', 'ลูกค้ายกเลิก', 'ล็อกหมดอายุ', 'เปลี่ยนไปใช้รถคันอื่น', 'อื่น ๆ'], opt: 'ไฟแนนซ์ไม่ผ่าน', label: 'หมายเหตุ', button: 'ปล่อยล็อก' }; render();
  },
  async withdraw(el) { const l = await claimFresh('locks', el.dataset.id, x => x.status === 'pending'); if (!l) return; l.status = 'withdrawn'; markUndo(l, 'ถอนคำขอ', 'pending'); if (await saveLock(el.dataset.id, l, 'ถอนคำขอ')) toast('ถอนคำขอแล้ว ถ้ากดผิด กด "ย้อนกลับ" ได้ภายใน 24 ชั่วโมง'); },
  async extend(el) {
    const id = el.dataset.id, was = (S.locks.get(id) || {}).end;
    const L0 = derive().locks.find(x => x.id === id);
    if (L0 && (L0.autoReleased || L0.expired)) { toast('ล็อกนี้ปล่อยคิวไปแล้ว ถ้าต้องการรถคันนี้ให้ขอล็อกใหม่', 'bad'); return; }
    if (L0 && L0.idsTook && !L0.idsTook.same) { toast(L0.idsTook.st === 'delivered' ? 'รถคันนี้ส่งมอบแล้ว ต่อล็อกไม่ได้' : 'IDS จัดสรรรถคันนี้ให้ใบจองอื่นแล้ว ต่อล็อกไม่ได้', 'bad'); return; }
    if (L0 && !canApproveBr(L0.car_br)) { toast(`ต่อล็อกได้เฉพาะ${MGR_NAME[L0.car_br] || 'ผู้จัดการสาขาของรถ'}`, 'bad'); return; }
    const l = await claimFresh('locks', id, x => x.status === 'approved' && x.end === was);
    if (!l) return;
    const L = derive().locks.find(x => x.id === id), days = LOCK_DAYS_BY[l.type] || 15;
    if (L && L.mgrDue && L.finWait) {
      l.end = addDays(todayISO(), days); l.fin_ext = (l.fin_ext || 0) + 1;
      if (await saveLock(id, l, 'อนุมัติต่อล็อก (ไฟแนนซ์ยังไม่ผ่าน)', `ครั้งที่ ${l.fin_ext} หมด ${fmtD(l.end)}`)) toast(`อนุมัติต่อแล้ว หมด ${fmtD(l.end)}`);
      return;
    }
    if ((l.ext || 0) >= MAX_EXT) { toast(`ต่ออายุครบ ${MAX_EXT} ครั้งแล้ว`, 'bad'); return; }
    const base = l.end < todayISO() ? todayISO() : l.end;
    l.end = addDays(base, days); l.ext = (l.ext || 0) + 1;
    if (await saveLock(id, l, `ต่ออายุครั้งที่ ${l.ext}`, `หมด ${fmtD(l.end)}`)) toast(`ต่ออายุแล้ว หมด ${fmtD(l.end)}`);
  },
  async allocate(el) { const l0 = S.locks.get(el.dataset.id); if (l0 && !canAllocBr(l0.car_br)) { toast('จัดสรรได้เฉพาะแอดมินหรือผู้จัดการสาขาของรถ', 'bad'); return; } const l = await claimFresh('locks', el.dataset.id, x => x.status === 'approved'); if (!l) return; l.status = 'allocated'; markUndo(l, 'จัดสรรใน IDS', 'approved'); if (!await saveLock(el.dataset.id, l, 'จัดสรรใน IDS แล้ว')) return;
    // the same press fills the booking's "จัดสรรรถ" step: one action, not two
    const aid = l.vin && String(l.bkref || '').startsWith('app:') ? l.bkref.slice(4) : null, r = aid ? S.bookings.get(aid) : null;
    if (r && !(r.flow && r.flow.assign && r.flow.assign.vin)) await saveFlow({ id: aid }, { flow: { assign: { vin: l.vin, from_lock: el.dataset.id, ...actor() } } });
    toast(r ? 'บันทึกว่าจัดสรรใน IDS แล้ว และจัดสรรรถในใบจองให้แล้ว' : 'บันทึกว่าจัดสรรใน IDS แล้ว'); },
  async 'note-submit'() {
    const m = S.modal, note = (m.note || '').trim();
    if (m.required && !note) { toast('ใส่เหตุผลก่อน', 'bad'); return; }
    if (m.opt === 'อื่น ๆ' && !note) { toast('เขียนหมายเหตุเมื่อเลือก "อื่น ๆ"', 'bad'); return; }
    const l = await claimFresh('locks', m.id, x => m.act === 'reject' ? x.status === 'pending' : m.act === 'dealer-edit' ? ['pending', 'approved', 'allocated'].includes(x.status) : m.act === 'dealer-sold' ? x.type === 'dealer' && ['approved', 'allocated'].includes(x.status) : ['approved', 'allocated'].includes(x.status));
    if (!l) { S.modal = null; render(); return; }
    if (m.act === 'reject') { l.status = 'rejected'; markUndo(l, 'ไม่อนุมัติ', 'pending'); if (await saveLock(m.id, l, 'ไม่อนุมัติ', note)) { S.modal = null; toast('บันทึกว่าไม่อนุมัติ รถยังว่าง'); render(); } }
    if (m.act === 'dealer-sold') {
      l.status = 'done'; l.done_at = new Date().toISOString();
      if (!await saveLock(m.id, l, 'ขายให้ดีลเลอร์สำเร็จ', [l.dealer_name, note].filter(Boolean).join(' · '))) return;
      if (l.vin) { const cur = S.vehicles.get(l.vin) || { added: null, removed: null, branch: null }; if (!cur.removed) await write('vehicles', l.vin, { ...cur, removed: { reason: 'dealer', dealer: l.dealer_name || null, note: note || null, lock: m.id, ...actor() } }); }
      S.modal = null; toast('บันทึกขายสำเร็จ นำรถออกจากสต็อกแล้ว (คืนรถเข้าสต็อกได้ที่ "รถที่นำออก")'); render(); return;
    }
    if (m.act === 'dealer-edit') { const was = l.dealer_name || ''; if (note === was) { S.modal = null; render(); return; } l.dealer_name = note; if (await saveLock(m.id, l, 'แก้ชื่อดีลเลอร์', `${was} → ${note}`)) { S.modal = null; toast('แก้ไขแล้ว'); render(); } return; }
    if (m.act === 'release') { markUndo(l, 'ปล่อยล็อก', l.status); l.status = 'released'; if (await saveLock(m.id, l, 'ปล่อยล็อก', [m.opt, note].filter(Boolean).join(': '))) { S.modal = null; toast('ปล่อยล็อกแล้ว รถกลับเป็นว่าง'); render(); } }
  },

  // ---- delivery steps, in order: จอง → ไฟแนนซ์ผ่าน → จัดสรรรถ → PO → ส่งมอบ → ผู้จัดการยืนยัน
  async 'plan-save'(el) {
    const a = atById(el.dataset.id); if (!a || !canEditBooking(a)) return;
    const v = S.modal.plan ?? a.rec.delivery_plan ?? '';
    if (v && a.date && v < a.date) { toast('วันนัดรับรถต้องไม่ก่อนวันจอง', 'bad'); return; }
    await saveFlow(a, { delivery_plan: v || null }, v ? `บันทึกวันนัดรับรถ ${fmtD(v)} แล้ว ล็อกจะถือไว้จนส่งมอบ` : 'ลบวันนัดรับรถแล้ว');
  },
  async 'flow-booked'(el) {
    const a = atById(el.dataset.id); if (!a || !canEditBooking(a) || a.flow.done.booked) return;
    const no = String(S.modal.receipt_no || '').trim();
    if (!no) { toast('ใส่เลขที่ใบเสร็จมัดจำ', 'bad'); $('#fl-rc')?.focus(); return; }
    const dup = derive().at.find(x => x.id !== a.id && !x.cancelled && String(x.rec.receipt_no || '').trim() === no && x.br === a.br);
    if (dup) { toast(`เลขที่ใบเสร็จนี้ใช้กับใบจองของ ${dup.cust} แล้ว`, 'bad'); return; }
    if (await saveFlow(a, { receipt_no: no, receipt_by: actor() }, 'บันทึกเลขที่ใบเสร็จมัดจำแล้ว')) { delete S.modal.receipt_no; render(); }
  },
  async 'flow-down'(el) {
    const a = atById(el.dataset.id);
    if (!a || a.flow.next !== 'down' || !stepAllowed(a, 'down')) { toast('บันทึกการชำระได้หลังทำ PO สั่งแต่งแล้ว', 'bad'); return; }
    const d = S.modal.down || {}, no = String(d.receipt_no || '').trim(), date = d.date || todayISO();
    if (!no) { toast('ใส่เลขที่ใบเสร็จ', 'bad'); $('#fl-dn')?.focus(); return; }
    if (!validDate(date) || date > todayISO()) { toast('วันที่ชำระต้องไม่เกินวันนี้', 'bad'); return; }
    const tr = tradeOf(d, 'fl'); if (tr.err) { toast(tr.err, 'bad'); if (tr.id) $('#' + tr.id)?.focus(); return; }
    if (await saveFlow(a, { flow: { down: { ...actor(), receipt_no: no, amount: num(d.amount), date, tradein: tr.rec } } }, isCash(a.rec) ? 'บันทึกชำระครบแล้ว' : 'บันทึกชำระดาวน์แล้ว')) { S.modal.down = null; render(); }
  },
  async 'flow-fin'(el) {
    const a = atById(el.dataset.id); if (!a || a.flow.next !== 'fin' || !stepAllowed(a, 'fin')) { toast('ทำขั้นนี้ไม่ได้ตอนนี้', 'bad'); return; }
    const r = a.rec, prev = (r.flow && r.flow.fin) || {};
    const status = S.modal.fin_status ?? r.fin_status ?? 'รอผล';
    const company = S.modal.fin_company ?? prev.company ?? r.finance ?? '';
    const pass = status === 'ผ่าน';
    const have = (prev.docs || []).length + S.files.fin.length;
    if (pass && !company) { toast('เลือกบริษัทไฟแนนซ์ที่อนุมัติ', 'bad'); $('#fl-fc')?.focus(); return; }
    if (pass && !have) { toast('แนบใบอนุมัติไฟแนนซ์ก่อน', 'bad'); return; }
    const docs = [...(prev.docs || [])];
    for (const x of S.files.fin) { const id = await storeImage(x.blob); if (id) docs.push(id); }
    if (pass && !docs.length) { toast('เก็บรูปเอกสารไม่สำเร็จ ลองอีกครั้ง', 'bad'); return; }
    const fin = { ...actor(), ok: pass, date: pass ? todayISO() : null, docs, status, company: company || null };
    const msg = pass ? `ไฟแนนซ์ ${company} ผ่านแล้ว ไปขั้นจัดสรรรถ` : status === 'ไม่ผ่าน' ? 'บันทึกว่าไฟแนนซ์ไม่ผ่าน ถ้าลูกค้าไม่ไปต่อ ให้ปล่อยล็อก' : `บันทึกสถานะ "${status}" แล้ว`;
    if (await saveFlow(a, { fin_status: status, finance: company || r.finance || null, flow: { fin } }, msg)) {
      S.files.fin = []; delete S.modal.fin_status; delete S.modal.fin_company; render();
    }
  },
  async 'flow-assign'(el) {
    const D = derive(), a = D.at.find(x => x.id === el.dataset.id);
    if (!a || !((a.flow.next === 'assign' && stepAllowed(a, 'assign')) || mgrAssign(a))) { toast('ทำขั้นนี้ไม่ได้ตอนนี้', 'bad'); return; }
    const vin = String(S.modal.assign_vin ?? assignDefault(a, D)).toUpperCase().trim();
    if (!VIN_RE.test(vin)) { toast('เลขตัวถังไม่ถูกต้อง', 'bad'); $('#fl-vin')?.focus(); return; }
    const car = D.cars.get(vin), own = car && car.lock && (car.lock.bkref === a.key || car.lock.bkref === a.row?.key);
    if (!car && vin !== (a.match && a.match.vin)) { toast('ไม่พบ VIN นี้ในสต็อก', 'bad'); return; }
    if (car && car.lock && !own) { toast(`รถคันนี้ล็อกให้ ${car.lock.owner || 'ใบจองอื่น'} อยู่`, 'bad'); return; }
    if (car && !own && !['free', 'temp'].includes(car.status) && vin !== (a.match && a.match.vin)) { toast('รถคันนี้ไม่ว่าง', 'bad'); return; }
    const off = car && car.spec !== a.spec;
    if (await saveFlow(a, { flow: { assign: { ...actor(), vin, sales: a.sales, spec_differs: off || null } } }, off ? `จัดสรร ${vin} แล้ว (สเปกไม่ตรงใบจอง ตรวจอีกครั้ง)` : `จัดสรร ${vin} ให้ ${a.sales} แล้ว`)) {
      delete S.modal.assign_vin; render();
    }
  },
  'po-open'(el) { const a = atById(el.dataset.id); if (!a) return; S.modal = { kind: 'at', id: a.id, po: poDraft(a), poq: '' }; render(); },
  'po-back'() { if (S.modal.ret) { S.modal = S.modal.ret; render(); return; } S.modal.po = null; render(); },
  'po-add'(el) {
    const m = S.modal, a = atById(m.id); if (!a || !m.po) return;
    const codes = [...(MODEL_CODES[a.model] || []), 'OT', 'ALL'];
    const x = focCatalog().find(i => i.name === el.dataset.name && codes.includes(i.model)) || focCatalog().find(i => i.name === el.dataset.name);
    if (!x) return;
    const same = m.po.items.find(i => i.name === x.name);
    if (same) same.qty = (Number(same.qty) || 1) + 1;
    else m.po.items.push({ name: x.name, part: x.part || '', vendor: x.vendor || '', cat: x.cat || '', cost: Number(x.cost) || 0, sale: Number(x.sale) || 0, qty: 1 });
    render();
  },
  'po-del'(el) { S.modal.po.items.splice(Number(el.dataset.i), 1); render(); },
  'po-custom'() { S.modal.po.items.push({ name: '', part: '', vendor: '', cat: 'เพิ่มเอง', cost: 0, sale: 0, qty: 1, custom: true }); render(); },
  async 'po-save'(el) {
    const a = atById(el.dataset.id), po = S.modal.po;
    if (!a || !po) return;
    if (!stepAllowed(a, 'po') || a.flow.done.delivered || !(a.flow.next === 'po' || a.flow.done.po || S.modal.ret)) { toast('ทำ PO ได้หลังจัดสรรรถ และก่อนส่งมอบ', 'bad'); return; }
    const items = po.items.map(x => ({ ...x, name: String(x.name || '').trim(), qty: Math.max(1, parseInt(x.qty, 10) || 1) })).filter(x => x.name);
    if (!items.length) { toast('ใส่รายการแต่งอย่างน้อย 1 รายการ (ถ้าไม่มีแต่ง ใส่ "ไม่มีรายการแต่ง")', 'bad'); return; }
    const rec = { ...actor(), items, date: po.date || todayISO(), ddate: po.ddate || null, dtime: po.dtime || null, by_name: po.by || a.sales, note: (po.note || '').trim() || null };
    if (await saveFlow(a, { flow: { po: rec } }, 'บันทึก PO แล้ว')) { if (S.modal.ret) S.modal = S.modal.ret; else S.modal.po = null; render(); }
  },
  'po-print'(el) { const a = atById(el.dataset.id); if (a) printPO(a); },
  async 'flow-deliver'(el) {
    const D = derive(), a = D.at.find(x => x.id === el.dataset.id);
    const idsDv = a && a.rec.flow && a.rec.flow.delivered && a.rec.flow.delivered.src === 'IDS';
    if (!a || !(a.flow.next === 'delivered' || a.flow.lateUpdate || idsDv) || !stepAllowed(a, 'delivered')) { toast('ส่งมอบได้หลังบันทึกการชำระดาวน์แล้ว', 'bad'); return; }
    const v = S.modal.deliv || {}, prev = (a.rec.flow && a.rec.flow.delivered) || {};
    const date = v.date ?? (a.flow.deliveredDate || todayISO());
    const plate = String(v.plate ?? prev.plate ?? '').trim(), insurer = String(v.insurer ?? prev.insurer ?? '').trim();
    if (!plate) { toast('ใส่เลขทะเบียนป้ายแดง', 'bad'); $('#fl-pl')?.focus(); return; }
    if (!insurer) { toast('เลือกบริษัทประกันที่ทำ', 'bad'); $('#fl-in')?.focus(); return; }
    if (!validDate(date) || date > todayISO()) { toast('วันที่ส่งมอบต้องไม่เกินวันนี้', 'bad'); return; }
    if (a.date && date < a.date) { toast('วันที่ส่งมอบต้องไม่ก่อนวันจอง', 'bad'); return; }
    if (!await saveFlow(a, { flow: { delivered: { ...actor(), date, plate, insurer } } }, 'บันทึกส่งมอบแล้ว กรอกข้อมูลค่าคอมแล้วรอผู้จัดการยืนยัน')) return;
    for (const l of derive().locks.filter(x => x.live && x.type === 'booking' && (x.bkref === a.key || x.bkref === a.row?.key))) {
      const cur = findLock(l.id); if (!cur) continue;
      cur.status = 'done'; await saveLock(l.id, cur, 'ส่งมอบแล้ว', fmtD(date));
    }
    S.modal.deliv = null; render();
  },
  async 'comm-save'(el) {
    const a = atById(el.dataset.id); if (!a || !canEditBooking(a) || a.flow.done.confirmed) return;
    const c = { ...(a.rec.comm || {}), ...(S.modal.comm || {}) };
    ['price', 'discount', 'down', 'fin_amount', 'rate', 'term', 'margin'].forEach(k => { if (k in c) c[k] = num(c[k]); });
    if (await saveFlow(a, { comm: { ...c, ...actor() } }, 'บันทึกข้อมูลค่าคอมแล้ว')) { S.modal.comm = null; render(); }
  },
  async 'flow-confirm'(el) {
    const a = atById(el.dataset.id);
    if (!a || a.flow.next !== 'confirmed' || !canApproveBr(a.br)) { toast('ยืนยันได้เฉพาะผู้จัดการสาขานี้ หลังเซลล์บันทึกส่งมอบ', 'bad'); return; }
    const c = { ...(a.rec.comm || {}), ...(S.modal.comm || {}) };
    if (!['price', 'down', 'fin_amount', 'margin', 'campaign'].some(k => c[k] !== undefined && c[k] !== null && c[k] !== '')) { toast('ให้เซลล์กรอกข้อมูลสำหรับค่าคอมก่อน', 'bad'); return; }
    await saveFlow(a, { flow: { confirm: { ...actor() } } }, 'ยืนยันแล้ว ใบจองนี้พร้อมเข้าขั้นตอนจ่ายค่าคอม');
  },

  // ---- stock, receiving, uploads
  'remove-open'(el) { S.modal = { kind: 'remove', vin: el.dataset.vin, reason: 'dealer', dealer: '', to: '', note: '' }; render(); },
  async 'remove-submit'() {
    const m = S.modal, D = derive(), car = D.cars.get(m.vin); if (!car) return;
    const cur = S.vehicles.get(m.vin) || { added: null, removed: null, branch: null };
    if (m.reason === 'dealer' && !(m.dealer || '').trim()) { toast('ใส่ชื่อดีลเลอร์', 'bad'); return; }
    if (m.reason === 'other' && !(m.note || '').trim()) { toast('เขียนหมายเหตุว่ารถไปไหน', 'bad'); return; }
    let doc;
    if (m.reason === 'move') { const to = m.to || BRS.find(b => b !== car.br); doc = { ...cur, branch: to, moved: { ...actor(), from: car.br } }; }
    else doc = { ...cur, removed: { reason: m.reason, dealer: (m.dealer || '').trim() || null, note: (m.note || '').trim() || null, ...actor() } };
    if (await write('vehicles', m.vin, doc)) { S.modal = null; toast(m.reason === 'move' ? `ย้ายไปสาขา ${doc.branch} แล้ว` : 'นำรถออกแล้ว'); render(); }
  },
  async restore(el) { const cur = S.vehicles.get(el.dataset.vin); if (!cur) return; if (await write('vehicles', el.dataset.vin, { ...cur, removed: null })) toast('คืนรถเข้าสต็อกแล้ว'); },
  'recv-open'(el) { const r = S.receipts.get(el.dataset.id); if (!r) return; S.modal = { kind: 'receive', id: el.dataset.id, r: JSON.parse(JSON.stringify(r)), status: r.status, note: '' }; render(); },
  // receive a car without a photo of the delivery note (ขอ 13/10): the same check-and-confirm window, empty
  'recv-manual'() {
    if (!perms().write || !perms().confirmReceive) return;
    const br = myBranch() || S.br || 'PSC';
    const r = { img: null, img_missing: true, manual: true, doc_no: '', doc_date: todayISO(), dealer_code: '', br, ref_no: '', transporter: '', plate: '', sign_date: null,
      cars: [{ vin: '', model: '', grade: '', color: '', engine: '', br }], unreadable: [], ai_ok: false, ai_msg: 'คีย์ข้อมูลเองโดยไม่มีรูป', status: 'pending',
      created_at: new Date().toISOString(), by: S.me.id || null, role: roleLabel() };
    S.modal = { kind: 'receive', id: null, r, status: 'pending', note: '' }; render();
  },
  'recv-car-add'() { const r = S.modal.r; if ((r.cars || []).length >= 6) return; r.cars = [...(r.cars || []), { vin: '', model: '', grade: '', color: '', engine: '', br: r.br }]; render(); },
  'recv-car-del'(el) { const r = S.modal.r, i = Number(el.dataset.i); r.cars.splice(i, 1); if (S.modal.pimg) S.modal.pimg.splice(i, 1); render(); },
  async 'recv-confirm'() {
    const m = S.modal, r = m.r, D = derive();
    if (!r.doc_date) { toast('ใส่วันที่เอกสาร', 'bad'); return; }
    const vins = new Set();
    for (const [i, c] of (r.cars || []).entries()) {
      c.vin = String(c.vin || '').toUpperCase().trim();
      if (!VIN_RE.test(c.vin)) { toast(`คันที่ ${i + 1}: เลขตัวถังไม่ถูกต้อง`, 'bad'); return; }
      if (!c.model || !c.grade || !c.color) { toast(`คันที่ ${i + 1}: เลือกรุ่น เกรด และสี`, 'bad'); return; }
      if (vins.has(c.vin)) { toast(`คันที่ ${i + 1}: เลขตัวถังซ้ำในใบนี้`, 'bad'); return; }
      const ex = D.cars.get(c.vin);
      if (ex && ex.src !== 'IDS') { toast(`คันที่ ${i + 1}: รถคันนี้ถูกรับเข้าแล้ว`, 'bad'); return; }
      // production date from the label on the car: required unless the IDS file already has it
      if (!(ex && ex.prodIds) || c.prod) {
        const err = prodDateOk(c.prod, r.doc_date);
        if (err) { toast(`คันที่ ${i + 1}: ${err}`, 'bad'); $(`#rv-p-${i}`)?.focus(); return; }
      }
      vins.add(c.vin);
    }
    if (!(r.cars || []).length) { toast('ใบนี้ยังไม่มีรถ', 'bad'); return; }
    // keyed in by hand (no photo): the receipt is created only now, after checking it is not already in the system
    if (!m.id) {
      const dups = receiptDups(r);
      if (dups.length) { toast(`ใบนี้หรือเลขตัวถังนี้รับเข้าแล้ว (${dups.map(x => x.doc_no || x.id).join(', ')})`, 'bad'); return; }
      m.id = newId('receipts');
    }
    let moved = 0, queued = 0;
    for (const [i, c] of r.cars.entries()) {
      const q = D.quota.find(x => x.vin === c.vin);
      const slot = (m.pimg || [])[i] || {};
      if (slot.pic && slot.pic.blob) { const pid = await storeImage(slot.pic.blob); if (pid) c.prod_img = pid; }
      const added = { br: r.br, model: c.model, grade: c.grade, color: c.color, year: c.year || null, consign: r.doc_date, stockin: todayISO(),
        prod: c.prod || null, ref: c.ref || q?.ref || null, dn: r.doc_no || null, engine: c.engine || null, receipt: m.id, ...actor() };
      const cur = S.vehicles.get(c.vin) || { removed: null, branch: null };
      const doc = { ...cur, added };
      if (c.prod) doc.prod_info = { date: c.prod, img: c.prod_img || null, read: slot.read || null, via: 'receive', ...actor() };
      if (!await write('vehicles', c.vin, doc)) return;
      const mv = await recvMoveLocks(c.vin, added.ref || (D.cars.get(c.vin) || {}).ref || null);
      moved += mv.moved; queued += mv.queued;
    }
    const orig = S.receipts.get(m.id) || {};
    if (await write('receipts', m.id, { ...orig, ...r, status: 'confirmed', review: { ...actor(), note: (m.note || '').trim() || null } })) {
      S.modal = null; S.ai.receive = null; toast(`รับรถเข้าสต็อกแล้ว ${r.cars.length} คัน${moved ? ` · ย้ายล็อกจาก Quota ${moved} รายการ` : ''}${queued ? ` · ล็อกซ้ำเป็นคิวต่อ ${queued}` : ''}`, queued ? 'bad' : 'good'); render();
    }
  },
  // the same delivery note sent twice: close this one without adding any car (ขอ 13/10)
  async 'recv-dup'(el) {
    const id = el.dataset.id || (S.modal && S.modal.id), r0 = S.receipts.get(id); if (!r0 || r0.status !== 'pending') return;
    if (!(perms().confirmReceive && perms().write && branchOk(r0.br))) { toast('ทำได้เฉพาะแอดมินสาขาหรือผู้จัดการ', 'bad'); return; }
    const d = recvDupsOf({ ...r0, id }, derive());
    const base = S.modal && S.modal.kind === 'receive' && S.modal.id === id ? { ...r0, ...S.modal.r } : r0;
    if (await write('receipts', id, { ...base, status: 'rejected', review: { ...actor(), dup: true, note: 'ซ้ำ ไม่รับเข้าระบบ' + (d.length ? ` · ${d.join(' · ')}` : '') } })) {
      if (S.modal && S.modal.id === id) S.modal = null; S.ai.receive = null; toast('บันทึกว่าซ้ำแล้ว ไม่ได้รับรถเข้าระบบ'); render();
    }
  },
  async 'recv-reject'() {
    const m = S.modal, note = (m.note || '').trim();
    if (!note) { toast('ใส่หมายเหตุว่าทำไมไม่ผ่าน', 'bad'); $('#rv-note')?.focus(); return; }
    const orig = S.receipts.get(m.id) || {};
    if (await write('receipts', m.id, { ...orig, ...m.r, status: 'rejected', review: { ...actor(), note } })) { S.modal = null; S.ai.receive = null; toast('ตีกลับแล้ว'); render(); }
  },
  'upl-save'() { saveUploads(); },
  'upl-clear'() { S.upl = { results: [], busy: false, msg: '' }; render(); },
  'upl-open'(el) { S.filters.uplOpen = S.filters.uplOpen === el.dataset.id ? null : el.dataset.id; render(); }
};

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'A' || el.tagName === 'BUTTON') ev.preventDefault();
  if (el.dataset.act === 'backdrop' && ev.target !== el) return;
  if (el.disabled) return;
  fn(el, ev);
});
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach(k => { if (o[k] === undefined || o[k] === null) o[k] = {}; o = o[k]; }); o[ks.at(-1)] = val; }
const RERENDER_FIELDS = new Set(['booking.model', 'booking.grade', 'booking.color', 'booking.purchase', 'booking.source', 'booking.br', 'booking.sales', 'booking.multi_reason', 'booking.multi_old']);
let poqTimer = null, searchTimer = null;
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.dataset.draft) {
    setPath(S.draft, t.dataset.draft, t.type === 'checkbox' ? t.checked : t.value);
    if (t.dataset.draft === 'booking.model') { S.draft.booking.grade = ''; S.draft.booking.color = ''; }
    if (t.dataset.draft === 'booking.grade') S.draft.booking.color = '';
    if (RERENDER_FIELDS.has(t.dataset.draft) && t.tagName === 'SELECT') render();
  } else if (t.dataset.modal && S.modal) {
    const path = t.dataset.modal, val = t.type === 'checkbox' ? t.checked : t.value;
    setPath(S.modal, path, val);
    if (path === 'd.model') { S.modal.d.grade = ''; S.modal.d.color = ''; }
    if (path === 'edit.model') { S.modal.edit.grade = ''; S.modal.edit.color = ''; }
    if (path === 'edit.grade') S.modal.edit.color = '';
    if (path.endsWith('.model') && path.startsWith('r.cars')) { const c = S.modal.r.cars[Number(path.split('.')[2])]; c.grade = ''; c.color = ''; }
    if (path.endsWith('.grade') && path.startsWith('r.cars')) { const c = S.modal.r.cars[Number(path.split('.')[2])]; c.color = ''; }
    if (path === 'poq' || (path === 'q' && (S.modal.kind === 'idspair' || S.modal.kind === 'stassign' || S.modal.kind === 'idsview'))) { clearTimeout(poqTimer); poqTimer = setTimeout(render, 250); return; }
    if (t.tagName === 'SELECT' || t.type === 'radio' || (path.endsWith('.vin') && val.length === 17)) render();
  } else if (t.dataset.filter) {
    S.filters[t.dataset.filter] = t.type === 'checkbox' ? t.checked : t.value;
    if (t.dataset.filter === 'qModel') { S.filters.bGrade = ''; S.filters.bColor = ''; }
    if (t.dataset.filter === 'bGrade') S.filters.bColor = '';
    // a picker that redraws itself while its own drop-down is still open can crash a phone browser: let it close first
    if (t.tagName === 'SELECT') { try { t.blur(); } catch (e) { /* ignore */ } setTimeout(render, 30); } else if (t.type === 'checkbox') render();
    // search boxes update while typing (after a short pause), not only on Enter
    else if (RERENDER_ON_CHANGE.has(t.dataset.filter) && t.type === 'search') { clearTimeout(searchTimer); searchTimer = setTimeout(render, 300); }
  }
});
const RERENDER_ON_CHANGE = new Set(['q', 'bq', 'aq', 'rq', 'sFrom', 'sTo', 'bDFrom', 'bDTo', 'adq', 'alq', 'eFrom', 'eTo']);
// a field's change event fires on mousedown of the next click; redrawing then would swallow that click, so wait for the click to land
let ptrDown = false, ptrRender = false;
document.addEventListener('pointerdown', () => { ptrDown = true; }, true);
const ptrUp = () => setTimeout(() => { ptrDown = false; if (ptrRender) { ptrRender = false; render(); } }, 0);
document.addEventListener('pointerup', ptrUp, true);
document.addEventListener('pointercancel', ptrUp, true);
const softRender = () => { if (ptrDown) ptrRender = true; else setTimeout(render, 0); };
// Android: while the gallery is open, live data or a redraw can replace the page and detach the file input,
// so its change event never reaches the page's handlers. Hold redraws while picking, and if the input was
// detached anyway, put it back briefly and replay the change so the chosen photo is still handled.
const pickDone = () => { if (!S.picking) return; S.picking = 0; if (S.pendingRender) { S.pendingRender = false; setTimeout(render, 0); } };
document.addEventListener('click', ev => {
  const t = ev.target && ev.target.closest ? ev.target.closest('input[type=file]') : null;
  if (!t || t.disabled || t._pickHooked) return;
  t._pickHooked = true;
  S.picking = Date.now();
  t.addEventListener('change', () => {
    if (t.isConnected) { setTimeout(pickDone, 0); return; }
    S.picking = 0;
    const box = document.createElement('div'); box.hidden = true; document.body.appendChild(box); box.appendChild(t);
    try { t.dispatchEvent(new Event('change', { bubbles: true })); } finally { setTimeout(() => { box.remove(); pickDone(); }, 0); }
  });
  t.addEventListener('cancel', () => pickDone());
}, true);
// picker closed without a choice (no cancel event on some phones): release held redraws once the page is back
window.addEventListener('focus', () => setTimeout(() => { if (S.picking && Date.now() - S.picking > 800) pickDone(); }, 1500));
document.addEventListener('change', async ev => {
  const t = ev.target;
  if (t.dataset.roleField) {
    if (window.__WEB && !window.__WEB.canSwitch) return;
    S.role[t.dataset.roleField] = t.value;
    if (t.dataset.roleField === 'role' && t.value === 'sales' && !S.role.sales) S.role.sales = salesNames()[0] || '';
    if (S.role.role === 'admin') setBr(S.role.branch);
    lsSet('ath-role', S.role);
    S.draft.booking.br = ''; render(); return;
  }
  if (t.dataset.file) {
    const files = [...(t.files || [])];
    t.value = '';
    if (!files.length) return;
    const kind = t.dataset.file;
    if (kind === 'ids') { handleIdsFiles(files); return; }
    if (kind === 'recv') { if (files.length > 1) handleReceiveFiles(files); else handleReceiveFile(files[0]); return; }
    if (kind === 'passbook') { S.files.passbook.forEach(x => { try { URL.revokeObjectURL(x.url); } catch (e) { /* ignore */ } }); S.files.passbook = []; S.ai.refund = null; }
    const max = kind === 'bk' ? 3 : kind === 'fin' ? 4 : kind === 'passbook' ? 1 : 2, room = max - S.files[kind].length;
    if (files.length > room) toast(`แนบได้สูงสุด ${max} รูป`, 'bad');
    for (const f of files.slice(0, Math.max(0, room))) {
      let blob;
      try { blob = await shrink(f); } catch (e) { toast(e.message || 'เปิดรูปนี้ไม่ได้', 'bad'); continue; }
      S.files[kind].push({ blob, url: URL.createObjectURL(blob), name: f.name });
    }
    render(); return;
  }
  if (t.dataset.uplOn !== undefined) { const r = S.upl.results[Number(t.dataset.uplOn)]; if (r) r.on = t.checked; render(); return; }
  if (t.dataset.uplKind !== undefined) { const r = S.upl.results[Number(t.dataset.uplKind)]; if (r) { r.kind = t.value; r.nameChoice = null; r.diff = invDiff(r); } render(); return; }
  if (t.dataset.uplName !== undefined) { const r = S.upl.results[Number(t.dataset.uplName)]; if (r) r.nameChoice = t.value; render(); return; }
  if (t.dataset.uplDate !== undefined) { const r = S.upl.results[Number(t.dataset.uplDate)]; if (r && t.value) r.asof = t.value; return; }
  if (t.dataset.filter && RERENDER_ON_CHANGE.has(t.dataset.filter)) { S.filters[t.dataset.filter] = t.value; softRender(); return; }
  // let focus move to the next field first, then redraw and keep it there
  if (['booking.booking_no', 'booking.deposit', 'booking.booking_date', 'booking.customer', 'booking.multi_note'].includes(t.dataset.draft)) { softRender(); return; }
  if (t.dataset.modal && S.modal && (t.dataset.modal.endsWith('.vin') || t.dataset.modal.startsWith('po.') || t.dataset.modal === 'refund.account_name' || t.dataset.modal.startsWith('edit.'))) { softRender(); return; }
});
document.addEventListener('submit', ev => {
  if (ev.target.id !== 'booking-form') return;
  ev.preventDefault();
  saveBooking();
});
window.addEventListener('hashchange', () => {
  const [v, sub] = location.hash.replace('#', '').split('/');
  if (VIEWS.includes(v) && (v !== S.view || (sub && sub !== S.sub[v]))) { S.view = v; if (sub && S.sub[v] !== undefined) S.sub[v] = sub; S.modal = null; render(); }
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && S.modal) { if (S.modal.kind === 'doc') { ACTIONS['doc-close'](); return; } if (S.modal.po) { S.modal.po = null; render(); return; } S.modal = null; render(); } });
window.addEventListener('dragover', ev => { if (ev.target.closest && ev.target.closest('.drop')) ev.preventDefault(); });
window.addEventListener('drop', ev => {
  const z = ev.target.closest && ev.target.closest('.drop');
  if (!z) return;
  ev.preventDefault();
  const input = z.querySelector('input[type=file]');
  if (!input || input.disabled || !ev.dataTransfer?.files?.length) return;
  try { input.files = ev.dataTransfer.files; input.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { /* drop not supported */ }
});

if (S.role.role === 'admin' && !S.br) setBr(S.role.branch);
render();
connect();
// an error inside a button or a save is shown, not swallowed: the person sees it and can send it on
let lastErrAt = 0;
function reportErr(e) {
  const now = Date.now(); if (now - lastErrAt < 3000) return; lastErrAt = now;
  const m = String((e && (e.message || e.reason?.message || e.reason)) || e || '').slice(0, 160);
  if (!m || /ResizeObserver/.test(m)) return;
  try { toast('เกิดข้อผิดพลาด: ' + m, 'bad'); } catch (x) { /* ignore */ }
}
window.addEventListener('error', ev => reportErr(ev.error || ev.message));
window.addEventListener('unhandledrejection', ev => reportErr(ev.reason));
