// ---------- แก้ไขรถที่ออกจาก Stock (ขอ 3/11): from the car history, fix where a car that left the stock really is.
// Admin of the branch / manager / executive: still here (back into this branch's stock), moved or sold to another branch,
// sold or traded to a dealer, or taken out. Writes the car's vehicles doc, so the next Stock upload follows it.
// Only function declarations and ACTIONS here.
function carFixCan(r) { return !!(r && r.state !== 'stock' && perms().write && (S.role.role === 'exec' || canAllocBr(r.br))); }
function carFixState(r) { if (!S.chFix || S.chFix.vin !== r.vin) S.chFix = { vin: r.vin, open: false, act: 'still', br: r.br || '', text: '' }; return S.chFix; }
function carFixBox(r) {
  if (!carFixCan(r)) return '';
  const F = carFixState(r);
  if (!F.open) return `<div class="mb-3"><button class="btn btn-ghost btn-sm" data-act="carfix-open">แก้ไขสถานะรถคันนี้ (ออกจาก Stock ไม่ถูกต้อง)</button></div>`;
  const brSel = (id, v, ex) => `<select id="${id}" data-carfix="br"><option value="">เลือกสาขา</option>${BRS.filter(b => b !== ex).map(b => `<option value="${b}" ${v === b ? 'selected' : ''}>${b} ${esc(BR[b].name)}</option>`).join('')}</select>`;
  return `<div class="p-3 rounded-lg mb-3" style="background:var(--warn-soft)"><div class="font-medium mb-2">รถคันนี้อยู่ที่ไหนจริง</div>
    <div class="flex flex-wrap gap-3 items-end">
      <div class="field"><label for="cf-a">สถานะ</label><select id="cf-a" data-carfix="act">${[['still', 'ยังอยู่ ดึงกลับเข้า Stock'], ['move', 'ย้าย / ส่งมอบที่สาขาอื่น (เข้า Stock สาขานั้น)'], ['dealer', 'ขาย/แลกดีลเลอร์'], ['other', 'นำออก (อื่น ๆ)']].map(([k, t]) => `<option value="${k}" ${F.act === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      ${F.act === 'still' ? `<div class="field"><label for="cf-b" class="req">เข้า Stock สาขา</label>${brSel('cf-b', F.br, '')}</div>`
        : F.act === 'move' ? `<div class="field"><label for="cf-b" class="req">สาขาที่รถอยู่</label>${brSel('cf-b', F.br === r.br ? '' : F.br, r.br)}</div>`
        : `<div class="field"><label for="cf-t" ${F.act === 'dealer' ? 'class="req"' : ''}>${F.act === 'dealer' ? 'ชื่อดีลเลอร์' : 'หมายเหตุ'}</label><input id="cf-t" data-carfix="text" value="${esc(F.text)}"></div>`}
      <button class="btn btn-red btn-sm" data-act="carfix-save" ${F.busy ? 'disabled' : ''}>${F.busy ? 'กำลังบันทึก…' : 'บันทึก'}</button><button class="btn btn-ghost btn-sm" data-act="carfix-close">ยกเลิก</button></div></div>`;
}
async function carFixSave(vin) {
  const F = S.chFix, r = carHistRows(derive()).find(x => x.vin === vin); if (!F || F.vin !== vin || !r || !carFixCan(r) || F.busy) return;
  const text = (F.text || '').trim();
  if ((F.act === 'still' || F.act === 'move') && !BRS.includes(F.br)) { toast('เลือกสาขา', 'bad'); return; }
  if (F.act === 'dealer' && !text) { toast('ใส่ชื่อดีลเลอร์', 'bad'); return; }
  F.busy = true; render();
  try {
    const cur = S.vehicles.get(vin) || { added: null, removed: null, branch: null }, spec = specKey(r.model, r.grade, r.color), q = v => (v && v !== '?' ? v : null);
    let doc;
    if (F.act === 'still') doc = { ...cur, removed: null, moved: null, added: { br: F.br, model: q(r.model), grade: q(r.grade), color: q(r.color), stockin: todayISO(), prod: r.prod || null, restore: true, manual: true, ...actor() } };
    else if (F.act === 'move') doc = { ...cur, removed: null, added: null, moved: { to: F.br, from: r.br || null, spec, manual: true, ...actor() } };
    else doc = { ...cur, moved: null, added: null, removed: { reason: F.act, dealer: F.act === 'dealer' ? text : null, note: F.act === 'dealer' ? null : text || null, manual: true, ...actor() } };
    await write('vehicles', vin, doc);
    S.dataV = (S.dataV || 0) + 1;
    toast(F.act === 'still' ? `ดึงรถกลับเข้า Stock ${F.br} แล้ว` : F.act === 'move' ? `ย้ายรถไป ${F.br} แล้ว` : 'บันทึกแล้ว');
  } finally { F.busy = false; F.open = false; }
  render();
}
Object.assign(ACTIONS, {
  'carfix-open'() { const m = S.modal; if (m && m.vin) { const r = carHistRows(derive()).find(x => x.vin === m.vin); if (r) { carFixState(r).open = true; render(); } } },
  'carfix-close'() { if (S.chFix) S.chFix.open = false; render(); },
  async 'carfix-save'() { if (S.chFix) await carFixSave(S.chFix.vin); }
});
document.addEventListener('change', ev => { const t = ev.target; if (!t || !t.dataset || !t.dataset.carfix || !S.chFix) return; S.chFix[t.dataset.carfix] = t.value; if (t.dataset.carfix === 'act') { S.chFix.text = ''; render(); } });
document.addEventListener('input', ev => { const t = ev.target; if (t && t.dataset && t.dataset.carfix === 'text' && S.chFix) S.chFix.text = t.value; });
