// ---------- รถที่ลูกค้ารับไปแล้ว แต่ IDS ยังไม่มีใบกำกับ (ขอ 1/11): a car flagged "ไม่พบข้อมูลว่าไปไหน" that the customer already took.
// Admin and above pick the booking (the one it was locked to, or another: the old lock is released), the invoice date and the
// delivery date; the car is assigned to that booking, the booking opens with its steps as usual. The invoice date is kept on the
// booking (inv_man) and used until the DL file brings the real one, which wins. Only function declarations and ACTIONS at the end.
function outTakenLocks(vin) { return [...S.locks.entries()].filter(([, l]) => l.vin === vin && !l.hidden && l.type === 'booking' && ['pending', 'approved', 'allocated', 'done'].includes(l.status)); }
function outTakenLockBk(vin, D) {
  for (const [, l] of outTakenLocks(vin)) { const a = D.at.find(x => l.bkref === x.key || l.bkref === (x.row && x.row.key) || l.bkref === 'app:' + x.id); if (a) return a; }
  return null;
}
function outTakenFields(u, sel, F) {
  if (sel.length !== 1) return '<div class="text-sm sm:col-span-3" style="color:var(--warn)">เลือกรถทีละ 1 คัน (ต้องเลือกใบจองของคันนั้น)</div>';
  const D = derive(), o = sel[0], old = outTakenLockBk(o.vin, D), cur = F.bk || (old && old.id) || '';
  const cands = D.at.filter(a => !a.cancelled && !a.done && !(a.flow && a.flow.done && a.flow.done.delivered) && a.br === u.br)
    .sort((x, y) => (y.spec === o.spec) - (x.spec === o.spec) || String(x.cust).localeCompare(String(y.cust), 'th'));
  const lab = a => `${a.cust} · ${a.no || '–'} · ${a.model} ${a.grade} ${a.color || ''}${a.spec === o.spec ? '' : ' (สเปกไม่ตรง)'}`;
  return `<div class="field sm:col-span-3"><label for="of-bk" class="req">${old ? `คันนี้ล็อกกับใบจอง ${esc(old.cust)} ต้องการใช้ใบเดิม หรือเปลี่ยนเป็นใบจองอื่น` : 'ใบจองของลูกค้าที่รับรถ'}</label>
      <select id="of-bk" data-outfixf="bk"><option value="">เลือกใบจอง</option>${old ? `<option value="${esc(old.id)}" ${cur === old.id ? 'selected' : ''}>ใช้ใบเดิม: ${esc(lab(old))}</option>` : ''}${cands.filter(a => !old || a.id !== old.id).map(a => `<option value="${esc(a.id)}" ${cur === a.id ? 'selected' : ''}>${esc(lab(a))}</option>`).join('')}</select>
      ${old && cur && cur !== old.id ? '<span class="text-xs" style="color:var(--warn)">เลือกใบจองอื่น: ล็อกเดิมของคันนี้จะถูกปล่อย และคันนี้จะจัดสรรให้ใบจองที่เลือก</span>' : ''}</div>
    <div class="field"><label for="of-id" class="req">วันที่ออกใบกำกับ</label><input id="of-id" type="date" max="${todayISO()}" data-outfixf="idate" value="${esc(F.idate || '')}"></div>
    <div class="field"><label for="of-dd">วันที่ส่งมอบ (ลูกค้ารับรถ)</label><input id="of-dd" type="date" max="${todayISO()}" data-outfixf="ddate" value="${esc(F.ddate || '')}"></div>
    <div class="text-xs text-muted sm:col-span-3">ใช้วันที่นี้ไปก่อน เมื่อไฟล์ DL มีคันนี้ ระบบจับคู่และใช้วันที่จาก DL แทนเอง · กดบันทึกแล้วหน้าใบจองจะเปิดขึ้นให้ทำขั้นตอนต่อ</div>`;
}
async function outTakenSave(id) {
  const F = S.outFix, u0 = S.uploads.get(id); if (!F || !u0 || F.busy) return;
  const D = derive(), sel = (u0.out || []).filter(o => outOpen(u0, o) && F.sel[o.vin]); if (sel.length !== 1) { toast('เลือกรถทีละ 1 คัน', 'bad'); return; }
  const vin = sel[0].vin, old = outTakenLockBk(vin, D), bkId = F.bk || (old && old.id) || '', a = D.at.find(x => x.id === bkId);
  if (!a) { toast('เลือกใบจองของลูกค้าที่รับรถ', 'bad'); $('#of-bk')?.focus(); return; }
  if (!validDate(F.idate) || F.idate > todayISO()) { toast('ใส่วันที่ออกใบกำกับ (ไม่เกินวันนี้)', 'bad'); $('#of-id')?.focus(); return; }
  if (F.ddate && (!validDate(F.ddate) || F.ddate > todayISO() || F.ddate < F.idate)) { toast('วันที่ส่งมอบต้องไม่ก่อนวันที่ออกใบกำกับ และไม่เกินวันนี้', 'bad'); $('#of-dd')?.focus(); return; }
  F.busy = true; render();
  let ok = false, rel = 0;
  try {
    for (const [lid, l] of outTakenLocks(vin)) {
      if (l.bkref === a.key || l.bkref === (a.row && a.row.key) || l.bkref === 'app:' + a.id) continue;
      const x = findLock(lid); if (!x) continue; x.status = 'released';
      if (await saveLock(lid, x, 'ปล่อยล็อก', `ลูกค้ารับรถแล้ว จัดสรรให้ใบจอง ${a.cust}`)) rel++;
    }
    ok = await saveFlow(a, { inv_man: { idate: F.idate, ddate: F.ddate || null, vin, from_upload: id, ...actor() }, flow: { assign: { ...actor(), vin, sales: a.sales, from_outfix: id } } },
      `จัดสรร ${vin} ให้ ${a.cust} แล้ว${rel ? ` · ปล่อยล็อกเดิม ${rel} รายการ` : ''}`);
    if (ok) {
      const cur = S.vehicles.get(vin) || { added: null, removed: null, branch: null };
      if (!cur.removed) await write('vehicles', vin, { ...cur, removed: { reason: 'other', note: 'ลูกค้ารับรถแล้ว (รอใบกำกับ IDS)', from_upload: id, ...actor() } });
      const u = await claimFresh('uploads', id, () => true);
      if (u) { const res = { reason: 'taken', text: a.cust, bk: a.id, idate: F.idate, ddate: F.ddate || null, ...actor() }; u.out = (u.out || []).map(o => o.vin === vin ? { ...o, res } : o); await write('uploads', id, u); }
    }
  } finally { F.busy = false; }
  if (!ok) { render(); return; }
  S.outFix = { ...F, sel: {}, bk: '', idate: '', ddate: '' };
  S.modal = { kind: 'at', id: a.id }; render();
}
function invManBox(a, D) {
  const vin = atVin(a); if (!vin || !dealAdmin(a) || (a.flow && a.flow.done && a.flow.done.confirmed)) return '';
  const dl = D.invByVin.get(vin), m = a.rec.inv_man || {};
  if (dl && !dl.company && dl.idate) return `<p class="text-xs text-muted mb-2">ใบกำกับจาก DL ${fmtD(dl.idate)}${m.idate ? ` (วันที่ที่ใส่ไว้เอง ${fmtD(m.idate)} ไม่ใช้แล้ว)` : ''}</p>`;
  const v = S.modal && S.modal.invm !== undefined ? S.modal.invm : (m.idate || '');
  return `<div class="grid sm:grid-cols-[1fr_auto] gap-2 items-end mb-2"><div class="field"><label for="fl-im">วันที่ออกใบกำกับ <span class="text-xs text-muted">(ใส่ได้ทุกขั้นตอน ถ้ายังไม่มีในไฟล์ DL)</span></label><input id="fl-im" type="date" max="${todayISO()}" data-modal="invm" value="${esc(v)}"></div>
    <button class="btn btn-ghost btn-sm" data-act="invman-save" data-id="${esc(a.id)}">บันทึกวันออกใบกำกับ</button></div><p class="text-xs text-muted mb-2">เมื่อไฟล์ DL มีคันนี้ ระบบใช้วันที่จาก DL แทนเอง</p>`;
}
Object.assign(ACTIONS, {
  async 'invman-save'(el) {
    const a = atById(el.dataset.id); if (!a || !dealAdmin(a)) return;
    const v = S.modal.invm ?? (a.rec.inv_man && a.rec.inv_man.idate) ?? '';
    if (v && (!validDate(v) || v > todayISO())) { toast('วันที่ออกใบกำกับต้องไม่เกินวันนี้', 'bad'); return; }
    const prev = a.rec.inv_man || {};
    if (await saveFlow(a, { inv_man: v ? { ...prev, idate: v, vin: atVin(a), ...actor() } : null }, v ? `บันทึกวันออกใบกำกับ ${fmtD(v)} แล้ว` : 'ลบวันออกใบกำกับที่ใส่ไว้แล้ว')) { delete S.modal.invm; render(); }
  }
});
