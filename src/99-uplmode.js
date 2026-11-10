// ------------------------------------------------------------------ Stock / Booking file: all of the branch, or only some rows (ตกลง 10/11)
// "ไฟล์ทั้งหมดของสาขา" (the default): what the file lacks stays, as "รอตรวจ" for the admin to answer.
// "เฉพาะบางคัน": new rows are added, rows already stored are updated, nothing else is touched (no "รอตรวจ", no alerts).
// "ไฟล์ทั้งหมด" with fewer than half of what the web has asks first. A whole Google Sheet tab is always the whole branch.
// Only function declarations here: the first render runs before this part of the file.
function uplModeOn(r) { return !!(r && (r.src === 'stock' || r.src === 'booking') && r.diff && !r.error && r.file !== 'Google Sheet'); }
function uplPartial(r) { return uplModeOn(r) && r.mode === 'partial'; }
function uplModeAsk(r) { return uplModeOn(r) && r.mode !== 'partial' && !r.fullOk && r.diff.prevN > 4 && r.rows.length * 2 < r.diff.prevN; }
function uplModeCell(r, i) {
  if (!uplModeOn(r)) return '';
  const part = r.mode === 'partial', key = x => r.src === 'stock' ? x.vin : String(x.no);
  const old = new Set((r.src === 'stock' ? derive().X.cars : derive().X.bookings).filter(x => x.br === r.br).map(key));
  const upd = r.rows.filter(x => old.has(key(x))).length, add = r.rows.length - upd, unit = r.src === 'stock' ? 'คัน' : 'ใบ';
  const lost = Math.max(0, r.diff.prevN - upd);
  return `<div class="mt-1 p-2 rounded" style="background:var(--surface-2)">
    <label class="flex items-center gap-1"><input type="radio" name="um-${i}" value="full" data-upl-mode="${i}" ${part ? '' : 'checked'}> <b>ไฟล์ทั้งหมดของสาขา</b></label>
    <label class="flex items-center gap-1"><input type="radio" name="um-${i}" value="partial" data-upl-mode="${i}" ${part ? 'checked' : ''}> <b>เฉพาะบางคัน</b> <span class="text-muted">(${r.src === 'stock' ? 'รถเข้าใหม่ / แก้บางคัน' : 'ใบจองใหม่ / แก้บางใบ'})</span></label>
    <div class="text-muted mt-1">${part ? `เพิ่มใหม่ <b>${add}</b> ${unit} · อัปเดต <b>${upd}</b> ${unit} · ${unit === 'คัน' ? 'คัน' : 'ใบ'}อื่นในเว็บไม่แตะ <b>${Math.max(0, r.diff.prevN - upd)}</b>`
      : `${unit === 'คัน' ? 'คัน' : 'ใบ'}ที่ไม่อยู่ในไฟล์ <b>${lost}</b> ${unit} ไม่หาย แต่ขึ้น "รอตรวจ" ให้ตอบว่าไปไหน`}</div>
    ${uplModeAsk(r) ? `<div class="mt-1 p-2 rounded" style="background:var(--warn-soft)"><b style="color:var(--warn)">ไฟล์มี ${r.rows.length} ${unit} แต่ในเว็บมี ${r.diff.prevN} ${unit}</b>
      <div>ถ้าเป็นไฟล์ทั้งหมดจริง อีก ${lost} ${unit}จะขึ้น "รอตรวจ" · ใช่ไฟล์ทั้งหมดจริงไหม?</div>
      <div class="flex flex-wrap gap-2 mt-1"><button class="btn btn-dark btn-sm" data-act="upl-mode" data-i="${i}" data-v="partial">เปลี่ยนเป็น "เฉพาะบางคัน"</button><button class="btn btn-red btn-sm" data-act="upl-mode" data-i="${i}" data-v="fullok">ใช่ ไฟล์ทั้งหมด</button></div></div>` : ''}</div>`;
}
Object.assign(ACTIONS, {
  'upl-mode'(el) { const r = S.upl.results[Number(el.dataset.i)]; if (!r) return; if (el.dataset.v === 'partial') { r.mode = 'partial'; r.fullOk = false; } else r.fullOk = true; render(); }
});
