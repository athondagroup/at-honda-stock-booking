// ------------------------------------------------------------------ lock requests from the Stock / Quota sheet
const hash36 = s => { let h = 5381; for (const ch of String(s)) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0; return h.toString(36); };
async function syncSheetLocks(only) {
  const D = derive(), plan = sheetPlan(D).filter(x => !only || only(x.u));
  let made = 0, updated = 0;
  for (const { u, update } of plan) {
    const f = sheetLockFields(u, D);
    if (update) {
      const cur = findLock(update.id); if (!cur || cur.status !== 'pending') continue;
      const old = sheetTextOf(cur);
      Object.assign(cur, f);
      if (await saveLock(update.id, cur, 'อัปเดตจากชีต Stock', `"${old || ''}" → "${u.text}"`)) updated++;
      continue;
    }
    // one id per unit and text, so two people saving the same file at once do not make two requests
    const id = 'H_' + (u.vin || u.ref) + '_' + hash36(sheetNorm(u.text));
    if (S.locks.has(id)) continue;
    const l = { ...f, status: 'pending', requested_at: new Date().toISOString(), requested_by: S.me.id || null, requested_role: null, ext: 0, history: [], convert_from: null };
    if (await saveLock(id, l, 'ขอล็อก (จากชีต Stock)', `"${u.text}"`)) made++;
  }
  return { made, updated };
}

Object.assign(ACTIONS, {
  'aq-clear'() { S.filters.aq = ''; render(); },
  'lockbk-open'(el) { S.modal = { kind: 'lockbk', id: el.dataset.id, pick: null, dealer: null }; render(); },
  'lockbk-pick'(el) { S.modal.pick = el.dataset.v; render(); },
  async 'lockbk-save'(el) {
    const m = S.modal, D = derive(), L = D.locks.find(x => x.id === m.id);
    if (!L) return;
    if (!(perms().write && perms().approve && (canApproveBr(L.car_br) || perms().approveDealer))) { toast('เลือกใบจองได้เฉพาะผู้จัดการ', 'bad'); return; }
    const pick = m.pick ?? (L.type === 'booking' ? L.bkref : L.type);
    const p = parseSheetText(sheetTextOf(L) || '');
    let set, label;
    if (pick === 'temp') { set = { type: 'temp', bkref: null, bk_br: null, dealer_name: null, prospect: L.prospect || p.cust || null, sales: L.sales || p.sales || null }; label = `ล็อกชั่วคราว ${LOCK_DAYS_BY.temp} วัน`; }
    else if (pick === 'dealer') {
      const dn = String(m.dealer ?? L.dealer_name ?? p.dealer ?? '').trim();
      if (!dn) { toast('ใส่ชื่อดีลเลอร์', 'bad'); $('#lb-dealer')?.focus(); return; }
      set = { type: 'dealer', bkref: null, bk_br: null, dealer_name: dn, prospect: null }; label = `ดีลเลอร์ ${dn}`;
    } else {
      const c = sheetCands(L, D).find(x => x.key === pick) || null;
      const b = c ? c.b : D.bookingByKey.get(pick);
      if (!b) { toast('ไม่พบใบจองนี้แล้ว', 'bad'); return; }
      if (c && c.hasCar) { toast('ใบจองนี้มีรถคันอื่นแล้ว เลือกใบอื่น', 'bad'); return; }
      const a = c ? c.a : b.app;
      set = { type: 'booking', bkref: pick, bk_br: (a && a.br) || b.br || null, sales: (a && a.sales) || b.owner || L.sales || null, dealer_name: null };
      label = `ใบจอง ${b.no || ''} ${(a && a.cust) || b.cust || ''}`.trim();
    }
    const cur = await claimFresh('locks', m.id, x => x.status === 'pending');
    if (!cur) return;
    Object.assign(cur, set, { matched: { pick, ...actor() } });
    if (!await saveLock(m.id, cur, 'เลือกใบจองให้คำขอ (ผู้จัดการ)', label)) return;
    S.modal = null; render();
    if (el.dataset.approve) await ACTIONS.approve({ dataset: { id: m.id } });
    else toast(`บันทึกแล้ว: ${label} กดอนุมัติเมื่อพร้อม`);
  },
  'carlock-open'(el) { S.modal = { kind: 'carlock', vin: el.dataset.vin }; render(); },
  async 'sheet-sync-one'(el) {
    const vin = el.dataset.vin, r = await syncSheetLocks(u => u.vin === vin);
    toast(r.made ? 'สร้างคำขอล็อกจากชีตแล้ว รอผู้จัดการอนุมัติ' : r.updated ? 'อัปเดตคำขอตามข้อความในชีตแล้ว' : 'ไม่มีอะไรต้องสร้าง');
    render();
  },
  async 'sheet-sync'() {
    const r = await syncSheetLocks();
    toast(r.made || r.updated ? `สร้างคำขอล็อกจากชีต ${r.made} รายการ${r.updated ? ` · อัปเดต ${r.updated}` : ''} รอผู้จัดการอนุมัติ` : 'ไม่มีข้อความใหม่ในชีต');
    render();
  }
});
