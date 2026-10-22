// ---------- advance invoices (ตกลง 22/10): a car invoiced (DL / แจ้งขาย) but not handed over
//   Advance มีลูกค้าจริง    = a real customer, delivered later: stays taken, its lock stays
//   Advance ไม่มีลูกค้าจริง  = a made-up name to reach the month's target: the car is free to sell, its locks released
// The choice is kept on the car (vehicles/<vin>.advance) for that invoice; a new invoice for the car asks again.
// Only function declarations at the top level: the first render runs before this file.
function advOf(vin, inv) {
  const v = S.vehicles.get(vin), a = v && v.advance;
  if (!a || !a.kind) return null;
  if (a.inv && inv && inv.inv && String(a.inv) !== String(inv.inv)) return null;
  return a;
}
function advLabel(a) {
  const m = a.idate ? monLabel(a.idate.slice(0, 7)) : '';
  return a.kind === 'fake' ? `รถ Advance ไม่มีลูกค้าจริง${m ? ` (แจ้งขาย ${m})` : ''} · ยกเลิกล็อกและปล่อยรถแล้ว` : `รถ Advance มีลูกค้าจริง${m ? ` แจ้งขาย ${m}` : ''} · ล็อกไว้ รอส่งมอบ`;
}
// the lock or booking a fake-advance car now holds (it was freed, then locked / allocated to a new booking)
function advNewOwner(c) {
  if (!c) return '';
  if (c.assignedTo) return `จัดสรรให้ ${esc(c.assignedTo.cust || '')}${c.assignedTo.no ? ` (ใบจอง ${esc(c.assignedTo.no)})` : ''}`;
  if (c.lock) return `${c.lock.status === 'pending' ? 'ขอล็อกให้' : 'ล็อกให้'} ${esc(c.lock.owner || c.lock.dealer_name || c.lock.prospect || '')}${c.lock.status === 'pending' ? ' · รออนุมัติ' : ''}`;
  const t = (c.temps || [])[0];
  if (t) return `ล็อกชั่วคราวให้ ${esc(t.prospect || t.owner || '')}${t.status === 'pending' ? ' · รออนุมัติ' : ''}`;
  return '';
}
function advChip(w, c) {
  const a = w.vin ? advOf(w.vin, w) : null;
  if (!a) return chip('ยังไม่ระบุว่าเป็น Advance แบบไหน', 'muted');
  if (a.kind === 'real') return chip('รถ Advance มีลูกค้าจริง · ล็อกไว้ รอกดส่งมอบ', 'warn');
  const nw = advNewOwner(c);
  return chip('รถ Advance ไม่มีลูกค้าจริง', 'good') + ' ' + (nw ? `<b class="text-xs" style="color:var(--good)">→ ${nw}</b>` : '<span class="text-xs text-muted">ว่าง ยังไม่มีใบจองใหม่ ล็อกหรือจัดสรรได้</span>');
}
// buttons on the row: fake = the same as any stock car (ล็อก · จัดสรร · ส่งมอบ · นำออก); real = ส่งมอบ only
function advActs(w, c, D) {
  if (!w.vin) return '';
  const a = advOf(w.vin, w);
  if (a && a.kind === 'fake' && D.cars.get(w.vin)) return stockActions(D.cars.get(w.vin), perms(), D);
  return delivBtn(c, D);
}
function advCheck(w) {
  if (!w.vin || !(perms().write && canAllocBr(w.br))) return '';
  const on = !!(S.adv && S.adv[w.vin]);
  return `<input type="checkbox" class="w-5 h-5" data-advsel="${esc(w.vin)}" ${on ? 'checked' : ''} aria-label="เลือก ${esc(w.vin)}">`;
}
function advBar(W) {
  const can = W.some(w => w.vin && perms().write && canAllocBr(w.br)); if (!can) return '';
  const n = Object.values(S.adv || {}).filter(Boolean).length;
  return `<div class="p-3 px-4 border-t border-line text-sm" style="background:var(--surface-2)">
    <div class="mb-2">ติ๊กเลือกรถแล้วระบุว่าเป็นรถ Advance แบบไหน · เลือกแล้ว <b>${n}</b> คัน</div>
    <div class="flex flex-wrap gap-2"><button class="btn btn-dark btn-sm" data-act="adv-set" data-kind="real" ${n ? '' : 'disabled'}>Advance มีลูกค้าจริง · คงล็อก รอส่งมอบ</button>
      <button class="btn btn-red btn-sm" data-act="adv-set" data-kind="fake" ${n ? '' : 'disabled'}>Advance ไม่มีลูกค้าจริง · ยกเลิกล็อกและปล่อยรถ</button>
      <button class="btn btn-ghost btn-sm" data-act="adv-set" data-kind="clear" ${n ? '' : 'disabled'}>ล้างที่ตั้งไว้</button></div>
    <p class="text-xs text-muted mt-1">ระบบจำไว้กับใบกำกับนั้น อัปโหลด IDS รอบหน้าไม่ต้องตั้งใหม่ · ไม่มีลูกค้าจริง = ยกเลิกล็อกเดิมของรถคันนั้น (ล็อกของชื่อที่ใช้แจ้งขาย) และปล่อยรถให้ว่าง แล้วล็อก / จัดสรรให้ใบจองใหม่ได้ตามปกติ · มีลูกค้าจริง = รอกดส่งมอบอย่างเดียว</p></div>`;
}
Object.assign(ACTIONS, {
  async 'adv-set'(el) {
    const kind = el.dataset.kind, vins = Object.entries(S.adv || {}).filter(([, v]) => v).map(([k]) => k);
    if (!vins.length) return;
    const D = derive(), W = invWaitingList(D);
    const txt = kind === 'fake' ? 'Advance ไม่มีลูกค้าจริง: ยกเลิกล็อกและปล่อยรถ' : kind === 'real' ? 'Advance มีลูกค้าจริง: คงล็อก รอส่งมอบ' : 'ล้างที่ตั้งไว้';
    if (!confirm(`${txt}\n${vins.length} คัน?`)) return;
    let n = 0, rel = 0;
    for (const vin of vins) {
      const w = W.find(x => x.vin === vin); if (!w || !canAllocBr(w.br)) continue;
      const cur = S.vehicles.get(vin) || { added: null, removed: null, branch: null };
      const advance = kind === 'clear' ? null : { kind, inv: w.inv || null, idate: w.idate || null, cust: w.cust || null, ...actor(), at: new Date().toISOString(), hist: [...((cur.advance && cur.advance.hist) || []), ...(cur.advance ? [{ kind: cur.advance.kind, at: cur.advance.at, role: cur.advance.role }] : [])].slice(-10) };
      if (!await write('vehicles', vin, { ...cur, advance })) continue;
      n++;
      if (kind === 'fake') for (const [id, l] of S.locks) {
        if (l.vin !== vin || l.hidden || !['pending', 'approved', 'allocated'].includes(l.status)) continue;
        const c2 = findLock(id); if (!c2) continue; c2.status = 'released'; await saveLock(id, c2, 'ปล่อยล็อก', `รถ Advance ไม่มีลูกค้าจริง (ใบกำกับ ${w.inv || ''}) ปล่อยว่าง`); rel++;
      }
    }
    S.adv = {};
    toast(`ตั้งแล้ว ${n} คัน${rel ? ` · ยกเลิกล็อกและปล่อยรถ ${rel} รายการ` : ''}`); render();
  }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.advsel) return;
  S.adv = { ...(S.adv || {}), [t.dataset.advsel]: t.checked }; render();
});
