// ---------- a lock moved to another car (decided 21/10)
// The sheet (or a request) puts a booking that already has an approved lock on another car: the request is a move.
// The manager must approve it and chooses: the new car (the lock moves: same dates; the old car is released and its
// sheet text can become a request of its own) or the old car (this request is closed).
// Only function declarations at the top level: the first render runs before this file.
function lockMoveFrom(l, D) {
  if (!l || l.status !== 'pending' || l.type === 'dealer') return null;
  const t = sheetNorm(sheetTextOf(l) || '');
  return D.locks.find(x => x.id !== l.id && ['approved', 'allocated'].includes(x.status) && !x.expired && !x.autoReleased && x.type !== 'dealer'
    && !sameUnit(x, l, D)
    && ((l.bkref && x.bkref === l.bkref) || (t.includes('/') && sheetNorm(sheetTextOf(x) || '') === t))) || null;
}
function lockMoveBox(l, mv, D) {
  const old = mv.vin ? `<span class="code">${esc(mv.vin)}</span>` : `Quota ${esc(mv.ref || '')}`;
  return `<div class="w-full rounded-lg p-3 text-sm" style="background:var(--warn-soft)">
    <b>ย้ายจากล็อกเดิม:</b> ใบจองนี้ล็อกคัน ${old} (${esc(mv.car_br || '')}) ไว้แล้ว ${mv.start ? `ตั้งแต่ ${fmtD(mv.start)}` : ''}${mv.end && !mv.hold ? ` ถึง ${fmtD(mv.end)}` : mv.hold ? ' ถือไว้จนส่งมอบ' : ''}${mv.status === 'allocated' ? ' · แจ้งจัดสรรใน IDS แล้ว' : ''}
    <div class="text-xs mt-1">"ใช้คันใหม่" = อนุมัติคำขอนี้ ล็อกย้ายมาคันนี้ วันหมดอายุเดิม และปลดล็อกคันเดิม (คันเดิมว่าง) · "ใช้คันเดิม" = ไม่อนุมัติคำขอนี้ คงล็อกคันเดิม</div></div>`;
}
Object.assign(ACTIONS, {
  async 'lockmove-new'(el) {
    const id = el.dataset.id, oldId = el.dataset.old, D0 = derive();
    const L = D0.locks.find(x => x.id === id), O = D0.locks.find(x => x.id === oldId);
    if (!L || !O) { toast('ไม่พบล็อก ลองโหลดหน้าใหม่', 'bad'); return; }
    if (!(L.type === 'dealer' ? perms().approveDealer : canApproveBr(L.car_br))) { toast(`อนุมัติได้เฉพาะ${MGR_NAME[L.car_br] || 'ผู้จัดการสาขาของรถ'}`, 'bad'); return; }
    if (L.idsTook && !L.idsTook.same) { toast('IDS จัดสรรรถคันใหม่ให้ใบจองอื่นแล้ว ย้ายไม่ได้', 'bad'); return; }
    if (!confirm(`ย้ายล็อกไปคัน ${L.vin || L.ref} และปลดล็อกคัน ${O.vin || O.ref}?`)) return;
    const hard = D0.locks.find(x => x.id !== id && x.id !== oldId && x.live && x.type !== 'temp' && x.status !== 'pending' && sameUnit(x, L, D0));
    if (hard) { toast(`คันใหม่ล็อกให้ ${hard.owner || hard.dealer_name || 'ใบจองอื่น'} แล้ว`, 'bad'); return; }
    // release the old car first, then move the lock (dates carried over)
    const o = await claimFresh('locks', oldId, x => ['approved', 'allocated'].includes(x.status));
    if (!o) return;
    const oFrom = o.status;
    markUndo(o, 'ปล่อยล็อก', oFrom); o.status = 'released';
    if (!await saveLock(oldId, o, 'ปล่อยล็อก', `ย้ายไปคัน ${L.vin || L.ref} (ผู้จัดการเลือกคันใหม่)`)) return;
    const l = await claimFresh('locks', id, x => x.status === 'pending');
    if (!l) return;
    const days = LOCK_DAYS_BY[l.type === 'customer' ? 'booking' : l.type] || 15;
    l.status = 'approved'; l.start = o.start || todayISO(); l.end = o.end || addDays(todayISO(), days); l.ext = o.ext || 0;
    if (o.fin_ext) l.fin_ext = o.fin_ext;
    l.approved_at = new Date().toISOString();
    l.moved_from = { id: oldId, vin: o.vin || null, ref: o.ref || null, at: l.approved_at };
    markUndo(l, 'อนุมัติ', 'pending');
    if (!await saveLock(id, l, 'อนุมัติล็อก (ย้ายจากคันเดิม)', `จากคัน ${o.vin || o.ref} · หมด ${fmtD(l.end)}`)) return;
    if (l.type !== 'temp') { const side = await settleUnit(derive(), l, id); if (side.length) { const cur = findLock(id); cur.undo = { ...cur.undo, side }; await write('locks', id, cur); } }
    // the old car's sheet may already name someone else: that becomes a request now
    let made = 0;
    if (o.vin && perms().upload && typeof syncSheetLocks === 'function') { try { made = (await syncSheetLocks(u => u.vin === o.vin)).made || 0; } catch (e) { made = 0; } }
    toast(`ย้ายล็อกแล้ว ล็อกถึง ${fmtD(l.end)} · คัน ${o.vin || o.ref} ว่างแล้ว${made ? ' · สร้างคำขอตามชื่อใหม่ในชีตของคันเดิมแล้ว' : ''}`);
    render();
  },
  async 'lockmove-keep'(el) {
    const id = el.dataset.id, O = derive().locks.find(x => x.id === el.dataset.old);
    const l = await claimFresh('locks', id, x => x.status === 'pending');
    if (!l) return;
    l.status = 'rejected'; l.reject_reason = `ใช้คันเดิม ${O ? O.vin || O.ref : ''}`.trim();
    markUndo(l, 'ไม่อนุมัติ', 'pending');
    if (await saveLock(id, l, 'ไม่อนุมัติ', l.reject_reason)) toast('คงล็อกคันเดิมไว้ ปิดคำขอนี้แล้ว');
  }
});
