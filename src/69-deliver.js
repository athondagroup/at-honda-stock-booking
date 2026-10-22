// ------------------------------------------------------------------ deliver a car that has its invoice (13/10)
// A car with an invoice (DL) but no delivery date is waiting to be handed over. "ส่งมอบ" opens one window:
// the steps of its booking that are still missing (receipt, finance, PO, down payment) and the delivery itself, saved together.
// Only function declarations here: the first render runs before this part of the file.
function invWaiting(c, D) { const i = c && D.invByVin.get(c.vin); return i && !i.company && !i.ddate ? i : null; }
// a car waits for delivery once it has its invoice, or once it is allocated to a booking that is not delivered yet (13/10)
function delivReady(c, D) { if (!c) return false; const i = D.invByVin.get(c.vin); if (i && (i.company || i.ddate)) return false; if (invWaiting(c, D)) return true; const a = carBookingOf(c.vin, D); return !!(a && !a.done && !a.flow.done.delivered); }
function carBookingOf(vin, D) { return D.at.find(a => !a.cancelled && !a.demo && ((a.match && a.match.vin === vin) || (a.rec.flow && a.rec.flow.assign && a.rec.flow.assign.vin === vin))) || null; }
// no booking holds this car yet: open bookings of the same spec the person may update, the invoice customer first
function delivCands(c, inv, D) {
  const nm = norm(inv && inv.cust || '');
  return D.at.filter(a => !a.cancelled && !a.demo && !a.done && canEditBooking(a) && a.spec === c.spec && !(a.rec.flow && a.rec.flow.assign && a.rec.flow.assign.vin) && !(a.match && a.match.vin))
    .map(a => ({ a, hit: nm && (norm(a.cust).includes(nm) || nm.includes(norm(a.cust))) }))
    .sort((x, y) => (y.hit - x.hit) || (x.a.date || '').localeCompare(y.a.date || ''));
}
function delivBtn(c, D, big) {
  if (!perms().write || !delivReady(c, D)) return '';
  const a = carBookingOf(c.vin, D);
  if (a && !stepAllowed(a, 'delivered')) return '';
  if (!a && isSales()) return '';
  return `<button class="btn btn-red ${big ? '' : 'btn-sm'}" data-act="cdeliv-open" data-vin="${esc(c.vin)}">ส่งมอบ</button>`;
}
function cdelivModal(m, D) {
  const c = carAny(m.vin, D), inv = c && D.invByVin.get(c.vin);
  const head = `<div class="flex items-start justify-between gap-3 mb-2"><div><h2 class="font-head text-xl font-semibold">ส่งมอบรถ <span class="code">${esc(m.vin)}</span></h2>
    ${c ? `<p class="text-sm text-muted">${specLabel(c.spec)} · ${esc(c.br)}${inv ? ` · ใบกำกับ ${esc(inv.inv || '')} ${fmtD(inv.idate)}${inv.cust && !isSales() ? ` · ${esc(inv.cust)}` : ''}` : ''}</p>` : ''}</div>
    ${m.back ? '<button class="btn btn-dark btn-sm" data-act="car-back">← กลับ</button>' : '<button class="btn btn-ghost btn-sm" data-act="close">ปิด</button>'}</div>`;
  if (!c || !delivReady(c, D)) return head + `<p class="text-sm">รถคันนี้ส่งมอบแล้ว หรือยังไม่ได้จัดสรรให้ใบจองและยังไม่ได้ออกใบกำกับ</p>`;
  let a = carBookingOf(c.vin, D), linked = !!a;
  if (!a && m.aid) a = D.at.find(x => x.id === m.aid) || null;
  if (!a) {
    const cs = delivCands(c, inv, D);
    return head + `<div class="p-3 rounded-lg text-sm mb-3" style="background:var(--warn-soft, var(--surface-2))">ยังไม่มีใบจอง AT ที่ได้รถคันนี้ เลือกใบจองของลูกค้าคนนี้ ระบบจะบันทึกการจัดสรรรถให้ใบนั้นพร้อมการส่งมอบ</div>
      <div class="border border-line rounded-lg divide-y divide-line max-h-[50vh] overflow-auto">${cs.map(({ a: x, hit }) => `<div class="p-3 flex flex-wrap items-center gap-3 text-sm"><div class="flex-1 min-w-[200px]"><b>${esc(x.cust || '')}</b>${hit ? ' ' + chip('ชื่อตรงกับใบกำกับ', 'good') : ''}<div class="text-xs text-muted">จอง ${fmtD(x.date)} · ${esc(x.br || '')} · เซลล์ ${esc(x.sales || '')}${x.no ? ` · IDS ${esc(x.no)}` : ''}</div></div>
        <button class="btn btn-dark btn-sm" data-act="cdeliv-pick" data-id="${esc(x.id)}">ใช้ใบจองนี้</button></div>`).join('') || '<div class="p-3 text-sm text-muted">ไม่มีใบจองสเปกนี้ที่ยังไม่ส่งมอบ ให้ลงใบจองก่อน แล้วกลับมากดส่งมอบ</div>'}</div>`;
  }
  const r = a.rec, f = r.flow || {}, fl = a.flow, v = (m.v = m.v || tradePre(r));
  if (!stepAllowed(a, 'delivered')) return head + `<p class="text-sm">บันทึกส่งมอบได้เฉพาะเซลล์เจ้าของใบจอง แอดมินสาขา หรือผู้จัดการ</p>`;
  const done = (t) => `<div class="text-sm text-muted">✓ ${t}</div>`;
  const sec = (k, ok, body) => `<div class="flex gap-3 py-2 border-b border-line"><span class="w-6 h-6 rounded-full grid place-items-center text-xs font-bold shrink-0" style="background:${ok ? 'var(--good)' : 'var(--warn)'};color:#fff">${ok ? '✓' : FLOW.indexOf(k) + 1}</span><div class="flex-1 min-w-0"><div class="font-medium">${FLOW_LABEL[k]}</div>${body}</div></div>`;
  const F = (id, label, path, val, extra = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" data-modal="v.${path}" value="${esc(v[path] ?? val ?? '')}" autocomplete="off" ${extra}></div>`;
  const parts = [
    sec('booked', fl.done.booked, fl.done.booked ? done(`ใบเสร็จมัดจำ ${esc(r.receipt_no)}`) : `<div class="grid sm:grid-cols-2 gap-3 mt-1">${F('cd-rc', 'เลขที่ใบเสร็จมัดจำ', 'receipt_no', '')}</div>`),
    sec('fin', fl.done.fin, isCash(r) ? done('ซื้อสด') : fl.done.fin ? done(`${esc((f.fin && f.fin.company) || r.finance || '')} อนุมัติ`) : `<div class="grid sm:grid-cols-2 gap-3 mt-1 items-end"><div class="field"><label for="cd-fc">บริษัทไฟแนนซ์ที่อนุมัติ</label><select id="cd-fc" data-modal="v.fin_company">${opt(FINANCE, v.fin_company ?? (f.fin && f.fin.company) ?? r.finance ?? '', 'เลือก')}</select></div>
      <label class="btn btn-ghost btn-sm relative">${S.files.fin.length ? `แนบแล้ว ${S.files.fin.length} รูป` : 'แนบใบอนุมัติ (ถ้ามี)'}<input type="file" accept="image/*" multiple data-file="fin" class="absolute w-px h-px opacity-0"></label></div>
      <div class="text-xs text-muted mt-1">ออกใบกำกับแล้ว ถือว่าไฟแนนซ์ผ่าน ใบอนุมัติแนบภายหลังได้</div>`),
    sec('assign', true, done(`รถ <span class="code">${esc(c.vin)}</span>${linked ? '' : ' · จะบันทึกการจัดสรรให้ใบจองนี้'}`)),
    sec('po', fl.done.po, fl.done.po ? done(`สั่งแต่ง ${(f.po.items || []).length} รายการ`) : `<label class="flex items-center gap-2 text-sm mt-1"><input type="checkbox" data-modal="v.po_none" ${v.po_none ? 'checked' : ''}> ไม่มีแต่งรถ (บันทึกเป็น "ไม่มีรายการแต่ง")</label>
      <button class="btn btn-ghost btn-sm mt-1" data-act="cdeliv-po" data-id="${esc(a.id)}">ทำใบสั่งแต่ง (PO)</button>`),
    sec('down', fl.done.down, fl.done.down ? done(`ใบเสร็จ ${esc(f.down.receipt_no)}`) : `<div class="grid sm:grid-cols-3 gap-3 mt-1">${F('cd-dn', `เลขที่ใบเสร็จ${isCash(r) ? 'ชำระครบ' : 'เงินดาวน์'}`, 'down_no', '')}${F('cd-da', 'ยอดเงิน (บาท)', 'down_amount', '', 'type="number" min="0" inputmode="numeric"')}${F('cd-dd2', 'วันที่ชำระ', 'down_date', todayISO(), `type="date" max="${todayISO()}"`)}</div>`),
    sec('delivered', false, `<div class="grid sm:grid-cols-3 gap-3 mt-1">${F('cd-dd', 'วันที่ส่งมอบรถ', 'date', todayISO(), `type="date" max="${todayISO()}"`)}${F('cd-pl', 'เลขทะเบียนป้ายแดง', 'plate', (f.delivered && f.delivered.plate) || '', 'placeholder="เช่น ป-1234 นครปฐม"')}
      <div class="field"><label for="cd-in">บริษัทประกันที่ทำ</label><input id="cd-in" list="cd-ins" data-modal="v.insurer" value="${esc(v.insurer ?? (f.delivered && f.delivered.insurer) ?? '')}" placeholder="เลือกหรือพิมพ์"><datalist id="cd-ins">${INSURERS.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div></div>
      <div class="text-xs text-muted mt-1">ประกันในใบจอง: ${esc(r.insurance || '–')}</div>${tradeDelivFields('v', v, 'cd', tradeCur(r), true)}`)
  ];
  return head + `<div class="p-3 rounded-lg text-sm mb-2" style="background:var(--surface-2)">ใบจอง: <b>${esc(a.cust || '')}</b> · จอง ${fmtD(a.date)} · เซลล์ ${esc(a.sales || '')} ${linked ? '' : '<button class="btn btn-ghost btn-sm" data-act="cdeliv-pick" data-id="">เปลี่ยนใบจอง</button>'} <button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(a.id)}">เปิดใบจอง</button></div>
    <p class="text-sm mb-1">ใส่ข้อมูลที่ยังขาด แล้วกดบันทึกส่งมอบครั้งเดียว หลังจากนั้นกรอกข้อมูลค่าคอมในใบจองและรอผู้จัดการยืนยัน</p>
    ${parts.join('')}
    <div class="flex flex-wrap justify-end gap-2 mt-3">${m.back ? '<button class="btn btn-ghost" data-act="car-back">← กลับ</button>' : '<button class="btn btn-ghost" data-act="close">ยกเลิก</button>'}<button class="btn btn-red" data-act="cdeliv-save" data-id="${esc(a.id)}">บันทึกส่งมอบ</button></div>`;
}
Object.assign(ACTIONS, {
  'cdeliv-open'(el) { const back = S.modal && S.modal.kind !== 'cdeliv' ? S.modal : null; S.files.fin = []; S.modal = { kind: 'cdeliv', vin: el.dataset.vin, v: {}, back }; render(); },
  'cdeliv-pick'(el) { S.modal.aid = el.dataset.id || null; S.modal.v = {}; render(); },
  // the PO editor opens inside the booking; coming back returns to this window
  'cdeliv-po'(el) { const a = atById(el.dataset.id); if (!a) return; S.modal = { kind: 'at', id: a.id, po: poDraft(a), poq: '', ret: { ...S.modal } }; render(); },
  async 'cdeliv-save'(el) {
    const D = derive(), m = S.modal, a = D.at.find(x => x.id === el.dataset.id), c = carAny(m.vin, D);
    if (!a || !c || !delivReady(c, D) || !stepAllowed(a, 'delivered')) { toast('บันทึกส่งมอบไม่ได้', 'bad'); return; }
    const r = a.rec, f = r.flow || {}, fl = a.flow, v = m.v || {}, patch = { flow: {} }, t = todayISO();
    const bad = (msg, id) => { toast(msg, 'bad'); if (id) $('#' + id)?.focus(); };
    if (!fl.done.booked) {
      const no = String(v.receipt_no || '').trim(); if (!no) return bad('ใส่เลขที่ใบเสร็จมัดจำ', 'cd-rc');
      const dup = D.at.find(x => x.id !== a.id && !x.cancelled && String(x.rec.receipt_no || '').trim() === no && x.br === a.br);
      if (dup) return bad(`เลขที่ใบเสร็จนี้ใช้กับใบจองของ ${dup.cust} แล้ว`, 'cd-rc');
      patch.receipt_no = no; patch.receipt_by = actor();
    }
    if (!fl.done.fin) {
      const company = v.fin_company ?? (f.fin && f.fin.company) ?? r.finance ?? '';
      if (!company) return bad('เลือกบริษัทไฟแนนซ์ที่อนุมัติ', 'cd-fc');
      const docs = [...((f.fin && f.fin.docs) || [])];
      for (const x of S.files.fin) { const id = await storeImage(x.blob); if (id) docs.push(id); }
      patch.fin_status = 'ผ่าน'; patch.finance = company;
      patch.flow.fin = { ...actor(), ok: true, date: t, docs, status: 'ผ่าน', company, via: 'invoice' };
    }
    const linked = !!carBookingOf(c.vin, D);
    if (!linked) {
      if (c.lock && !(c.lock.bkref === a.key || c.lock.bkref === (a.row && a.row.key))) return bad(`รถคันนี้ล็อกให้ ${c.lock.owner || 'ใบจองอื่น'} อยู่ ปล่อยล็อกก่อน`);
      patch.flow.assign = { ...actor(), vin: c.vin, sales: a.sales, spec_differs: c.spec !== a.spec || null, via: 'invoice' };
    }
    if (!fl.done.po) {
      if (!v.po_none) return bad('ทำใบสั่งแต่ง (PO) หรือติ๊ก "ไม่มีแต่งรถ"');
      patch.flow.po = { ...actor(), items: [{ name: 'ไม่มีรายการแต่ง', qty: 1, cost: 0, sale: 0, custom: true }], date: t, by_name: a.sales, none: true };
    }
    if (!fl.done.down) {
      const no = String(v.down_no || '').trim(), date = v.down_date || t;
      if (!no) return bad('ใส่เลขที่ใบเสร็จ' + (isCash(r) ? 'ชำระครบ' : 'เงินดาวน์'), 'cd-dn');
      if (!validDate(date) || date > t) return bad('วันที่ชำระต้องไม่เกินวันนี้', 'cd-dd2');
      patch.flow.down = { ...actor(), receipt_no: no, amount: num(v.down_amount), date };
    }
    const date = v.date || t, plate = String(v.plate ?? (f.delivered && f.delivered.plate) ?? '').trim(), insurer = String(v.insurer ?? (f.delivered && f.delivered.insurer) ?? '').trim();
    if (!plate) return bad('ใส่เลขทะเบียนป้ายแดง', 'cd-pl');
    if (!insurer) return bad('เลือกบริษัทประกันที่ทำ', 'cd-in');
    if (!validDate(date) || date > t) return bad('วันที่ส่งมอบต้องไม่เกินวันนี้', 'cd-dd');
    if (a.date && date < a.date) return bad('วันที่ส่งมอบต้องไม่ก่อนวันจอง', 'cd-dd');
    const tr = await tradeDelivOf(v, tradeCur(r), 'cd', true); if (tr.err) return bad(tr.err, tr.id);
    tradeFilesClear(); patch.trade = tr.rec;
    patch.flow.delivered = { ...actor(), date, plate, insurer, vin: c.vin, inv: (invWaiting(c, D) || {}).inv || null, from: 'stock' };
    if (!await saveFlow(a, patch, `บันทึกส่งมอบ ${c.vin} แล้ว กรอกข้อมูลค่าคอมในใบจอง แล้วรอผู้จัดการยืนยัน`)) return;
    for (const l of derive().locks.filter(x => x.live && x.type === 'booking' && (x.bkref === a.key || x.bkref === a.row?.key))) {
      const cur = findLock(l.id); if (!cur) continue;
      cur.status = 'done'; await saveLock(l.id, cur, 'ส่งมอบแล้ว', fmtD(date));
    }
    S.files.fin = []; S.modal = { kind: 'at', id: a.id }; render();
  }
});

// สต็อก: cars invoiced in IDS but not handed over yet, to record the delivery here before the next IDS file (13/10)
function delivWaitBox(D) {
  const W = invWaitingList(D); if (!W.length) return '';
  const late = W.filter(w => w.age > 14).length;
  return `<details class="bg-surface border border-line rounded-lg mb-4" ${S.delivOpen ? 'open' : ''} data-deliv-box><summary class="p-3 px-4 cursor-pointer flex flex-wrap items-center gap-2"><b>ออกใบกำกับแล้ว ยังไม่ส่งมอบ</b> ${chip(`${fmtN(W.length)} คัน`, 'neutral')}${late ? chip(`เกิน 14 วัน ${fmtN(late)}`, 'warn') : ''}<span class="text-sm text-muted">กด "ส่งมอบ" เพื่อบันทึกการส่งมอบเองได้เลย ไม่ต้องรอไฟล์ IDS</span></summary>
    <div class="border-t border-line divide-y divide-line max-h-96 overflow-auto">${W.map(w => { const c = carAny(w.vin, D) || { vin: w.vin }; return `<div class="p-2 px-4 text-sm flex flex-wrap gap-x-3 gap-y-1 items-center">
      ${w.vin ? vinLink({ vin: w.vin }) : '<span class="text-muted">ไม่มีเลขตัวถัง</span>'}<span>${esc(w.model || '')} ${esc(gradeShort(w.model, w.grade) || '')} ${esc(w.color || '')}</span>
      <span class="text-muted">${esc(w.br)} · ใบกำกับ ${esc(w.inv || '')} ${fmtD(w.idate)} · ${esc(w.cust || '')} · ${esc(w.sales || '')}</span>
      <span class="ml-auto flex items-center gap-2"><span class="num ${w.age > 14 ? 'font-semibold' : 'text-muted'}" ${w.age > 14 ? 'style="color:var(--warn)"' : ''}>${w.age} วัน</span>${w.vin ? delivBtn(c, D) : ''}</span></div>`; }).join('')}</div></details>`;
}
document.addEventListener('toggle', ev => { const t = ev.target; if (t && t.dataset && t.dataset.delivBox !== undefined) S.delivOpen = t.open; }, true);
