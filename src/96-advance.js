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
  return a.kind === 'fake' ? `รถ Advance ไม่มีลูกค้าจริง${m ? ` (แจ้งขาย ${m})` : ''} · ปล่อยว่าง ขายได้` : `รถ Advance มีลูกค้าจริง${m ? ` แจ้งขาย ${m}` : ''} · ล็อกไว้ รอส่งมอบ`;
}
function advChip(w) {
  const a = w.vin ? advOf(w.vin, w) : null;
  return a ? chip(advLabel(a), a.kind === 'fake' ? 'good' : 'warn') : chip('ยังไม่ระบุว่าเป็น Advance แบบไหน', 'muted');
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
    <div class="flex flex-wrap gap-2"><button class="btn btn-dark btn-sm" data-act="adv-set" data-kind="real" ${n ? '' : 'disabled'}>Advance มีลูกค้าจริง · คงล็อก ไม่ว่าง</button>
      <button class="btn btn-red btn-sm" data-act="adv-set" data-kind="fake" ${n ? '' : 'disabled'}>Advance ไม่มีลูกค้าจริง · ปลดล็อก ปล่อยว่าง ขายได้</button>
      <button class="btn btn-ghost btn-sm" data-act="adv-set" data-kind="clear" ${n ? '' : 'disabled'}>ล้างที่ตั้งไว้</button></div>
    <p class="text-xs text-muted mt-1">ระบบจำไว้กับใบกำกับนั้น อัปโหลด IDS รอบหน้าไม่ต้องตั้งใหม่ · ไม่มีลูกค้าจริง = ปิดล็อกที่ค้างของรถคันนั้น และรถขึ้นเป็นว่างในสต็อก</p></div>`;
}
Object.assign(ACTIONS, {
  async 'adv-set'(el) {
    const kind = el.dataset.kind, vins = Object.entries(S.adv || {}).filter(([, v]) => v).map(([k]) => k);
    if (!vins.length) return;
    const D = derive(), W = invWaitingList(D);
    const txt = kind === 'fake' ? 'Advance ไม่มีลูกค้าจริง: ปลดล็อก ปล่อยว่าง ขายได้' : kind === 'real' ? 'Advance มีลูกค้าจริง: คงล็อก ไม่ว่าง' : 'ล้างที่ตั้งไว้';
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
    toast(`ตั้งแล้ว ${n} คัน${rel ? ` · ปิดล็อก ${rel} รายการ` : ''}`); render();
  }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.advsel) return;
  S.adv = { ...(S.adv || {}), [t.dataset.advsel]: t.checked }; render();
});
