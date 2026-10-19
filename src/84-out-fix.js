// ------------------------------------------------------------------ cars that left stock with no reason found (ตกลง 19/10)
// After a Stock upload, a car the old stock had and the new file lacks, with no invoice, no other branch's stock and
// no removal on record, is flagged "ไม่พบข้อมูลว่าไปไหน". The executive or the branch manager says where each went
// (one by one or all at once): sold to another branch, sold/traded to a dealer, taken out, or still here (the file was
// incomplete). Locks still open on those cars can be closed at the same time. The answer is kept on the upload record,
// and on the car, so the next Stock upload gives the reason instead of flagging it again.
// Only function declarations here: the first render runs before this part of the file.
function outFixReasons() { return [['other_br', 'ขายให้สาขาอื่น'], ['dealer', 'ขาย/แลกดีลเลอร์'], ['other', 'นำออก (อื่น ๆ)'], ['still', 'ยังอยู่ (ไฟล์ Stock ไม่ครบ)']]; }
function outFixWhy(r) { const t = (outFixReasons().find(x => x[0] === r.reason) || [, r.reason])[1]; return t + (r.text ? ' · ' + r.text : ''); }
function outOpenLocks(vin) { return [...S.locks.entries()].filter(([, l]) => l.vin === vin && !l.hidden && ['pending', 'approved', 'allocated'].includes(l.status)); }
function outFixList(u) {
  const can = canApproveBr(u.br) && perms().write, F = S.outFix && S.outFix.id === u.id ? S.outFix : null;
  const todo = (u.out || []).filter(o => o.flag && !o.res), sel = F ? todo.filter(o => F.sel[o.vin]) : [];
  const row = o => {
    const lk = o.flag && !o.res ? outOpenLocks(o.vin).length : 0;
    return `<div class="flex flex-wrap gap-x-4 items-center">${can && o.flag && !o.res ? `<input type="checkbox" class="w-4 h-4" data-outfix="${esc(u.id)}" data-vin="${esc(o.vin)}" ${F && F.sel[o.vin] ? 'checked' : ''} aria-label="เลือก ${esc(o.vin)}">` : ''}<span class="code">${esc(o.vin)}</span><span class="text-muted">${specLabel(o.spec)}</span>
      ${o.res ? `<span style="color:var(--good)">ระบุแล้ว: ${esc(outFixWhy(o.res))}</span><span class="text-xs text-muted">${fmtDT(o.res.at)} ${esc(o.res.role || '')}</span><span class="text-xs text-muted line-through">${esc(o.why)}</span>`
        : `<span style="color:var(--${o.flag ? 'bad' : 'muted'})">${esc(o.why)}</span>${lk ? `<span class="text-xs" style="color:var(--warn)">ล็อกเปิดอยู่ ${lk}</span>` : ''}`}</div>`;
  };
  const bar = can && todo.length ? `<div class="p-3 rounded-lg mb-2" style="background:var(--warn-soft)">
      <div class="font-medium mb-2">ระบุว่ารถที่ "ไม่พบข้อมูล" ไปไหน · เลือกแล้ว ${sel.length} จาก ${todo.length} คัน</div>
      <div class="flex flex-wrap gap-2 mb-2"><button class="btn btn-ghost btn-sm" data-act="outfix-all" data-id="${esc(u.id)}" data-v="1">เลือกทั้งหมด</button><button class="btn btn-ghost btn-sm" data-act="outfix-all" data-id="${esc(u.id)}" data-v="">ไม่เลือกเลย</button></div>
      <div class="flex flex-wrap gap-3 items-end">
        <div class="field"><label for="of-r">ไปไหน</label><select id="of-r" data-outfixf="reason">${outFixReasons().map(([k, t]) => `<option value="${k}" ${(F && F.reason || 'other_br') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        ${(F && F.reason || 'other_br') === 'other_br' ? `<div class="field"><label for="of-b">สาขา / ดีลเลอร์ที่รับ</label><input id="of-b" data-outfixf="text" value="${esc(F && F.text || '')}" placeholder="เช่น ฮอนด้า …"></div>`
          : (F && F.reason) === 'dealer' ? `<div class="field"><label for="of-d" class="req">ชื่อดีลเลอร์</label><input id="of-d" data-outfixf="text" value="${esc(F.text || '')}"></div>`
          : `<div class="field"><label for="of-n">หมายเหตุ</label><input id="of-n" data-outfixf="text" value="${esc(F && F.text || '')}"></div>`}
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" class="w-4 h-4" data-outfixf="closeLocks" ${(F ? F.closeLocks : true) ? 'checked' : ''}> ปิดล็อกที่ยังเปิดของรถที่เลือก</label>
        <button class="btn btn-red btn-sm" data-act="outfix-save" data-id="${esc(u.id)}" ${sel.length && !(F && F.busy) ? '' : 'disabled'}>${F && F.busy ? '<span class="spin"></span> กำลังบันทึก…' : `บันทึก ${sel.length} คัน`}</button></div>
      <p class="text-xs text-muted mt-1">"ยังอยู่" ไม่เอารถออกจากระบบ ใช้เมื่อไฟล์ Stock ไม่ครบ ให้อัปโหลดไฟล์ที่ครบภายหลัง · ขายให้สาขาอื่น / ดีลเลอร์ / นำออก จะจำไว้ อัปโหลดครั้งหน้าจะไม่ขึ้นแดงอีก</p></div>` : '';
  return `<div class="mt-2 text-sm flex flex-col gap-1">${bar}${u.out.map(row).join('')}</div>`;
}
function outFixState(id) { if (!S.outFix || S.outFix.id !== id) S.outFix = { id, sel: {}, reason: 'other_br', text: '', closeLocks: true }; return S.outFix; }
async function outFixSave(id) {
  const F = S.outFix, u0 = S.uploads.get(id); if (!F || F.id !== id || !u0 || !canApproveBr(u0.br) || F.busy) return;
  const vins = (u0.out || []).filter(o => o.flag && !o.res && F.sel[o.vin]).map(o => o.vin); if (!vins.length) return;
  const text = (F.text || '').trim();
  if (F.reason === 'dealer' && !text) { toast('ใส่ชื่อดีลเลอร์', 'bad'); return; }
  F.busy = true; render();
  let closed = 0;
  try {
    for (const vin of vins) {
      if (F.reason !== 'still') {
        const cur = S.vehicles.get(vin) || { added: null, removed: null, branch: null };
        if (!cur.removed) await write('vehicles', vin, { ...cur, removed: { reason: F.reason, dealer: F.reason === 'dealer' ? text : null, note: F.reason === 'dealer' ? null : text || null, from_upload: id, ...actor() } });
      }
      if (F.closeLocks) for (const [lid] of outOpenLocks(vin)) { const l = findLock(lid); if (!l) continue; l.status = 'released'; if (await saveLock(lid, l, 'ปล่อยล็อก', `รถออกจากสต็อก: ${outFixWhy({ reason: F.reason, text })}`)) closed++; }
    }
    const u = await claimFresh('uploads', id, () => true);
    if (u) {
      const res = { reason: F.reason, text: text || null, ...actor() };
      u.out = (u.out || []).map(o => vins.includes(o.vin) ? { ...o, res } : o);
      await write('uploads', id, u);
    }
  } finally { F.busy = false; }
  S.outFix = { ...F, sel: {} };
  toast(`บันทึกแล้ว ${vins.length} คัน${closed ? ` · ปิดล็อก ${closed} รายการ` : ''}`); render();
}
Object.assign(ACTIONS, {
  'outfix-all'(el) { const F = outFixState(el.dataset.id), u = S.uploads.get(el.dataset.id); F.sel = {}; if (el.dataset.v && u) (u.out || []).filter(o => o.flag && !o.res).forEach(o => { F.sel[o.vin] = true; }); render(); },
  async 'outfix-save'(el) { await outFixSave(el.dataset.id); }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset) return;
  if (t.dataset.outfix) { const F = outFixState(t.dataset.outfix); F.sel[t.dataset.vin] = t.checked; render(); return; }
  if (t.dataset.outfixf && S.outFix) { const k = t.dataset.outfixf; S.outFix[k] = t.type === 'checkbox' ? t.checked : t.value; if (k === 'reason') { S.outFix.closeLocks = t.value !== 'still'; render(); } else if (k === 'closeLocks') render(); }
});
document.addEventListener('input', ev => { const t = ev.target; if (t && t.dataset && t.dataset.outfixf === 'text' && S.outFix) S.outFix.text = t.value; });
