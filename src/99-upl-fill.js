// ---------- เติมข้อมูลรถอย่างเดียว (ขอ 9/11): take the model code (and the engine number where missing) from a Stock file or sheet
// for the cars already in the web, without replacing the stock list. Cars missing from the file stay; cars only in the file are not added.
// Any Stock table read on the upload page is used, even one that is older than the data in use or blocked by the completeness check.
// Only function declarations at the top level.
function uplFillPlan() {
  const U = S.upl, src = new Map();
  U.results.filter(r => r.src === 'stock' && !r.error).forEach(r => r.rows.forEach(x => { if (x.vin && (x.mcode || x.engine)) src.set(x.vin, x); }));
  const docs = [], stat = { fill: 0, eng: 0, same: 0, webOnly: 0, fileOnly: 0 }, inWeb = new Set();
  for (const b of BRS) {
    const doc = S.ids.get('stock_' + b); if (!doc) continue;
    const rows = unpack(doc); let ch = 0;
    rows.forEach(x => {
      inWeb.add(x.vin); const f = src.get(x.vin);
      if (!f) { stat.webOnly++; return; }
      if (f.mcode && x.mcode !== f.mcode && !x.mcode) { x.mcode = f.mcode; stat.fill++; ch++; } else if (f.mcode) stat.same++;
      if (f.engine && !x.engine) { x.engine = f.engine; stat.eng++; ch++; }
    });
    if (ch) docs.push({ id: 'stock_' + b, doc, rows, n: ch });
  }
  for (const v of src.keys()) if (!inWeb.has(v)) stat.fileOnly++;
  return { docs, stat };
}
function uplFillBox(F) {
  const s = F.stat;
  return `<div class="mt-3 p-3 rounded-lg text-sm" style="background:var(--surface-2)"><b>เติมข้อมูลรถอย่างเดียว</b> (ไม่เปลี่ยนรายการรถ ไม่มีรถถูกเอาออก)
    <ul class="mt-1 list-disc pl-5"><li>เติม Model code ได้ <b>${fmtN(s.fill)}</b> คัน${s.eng ? ` · เติมเลขเครื่อง ${fmtN(s.eng)} คัน` : ''}${s.same ? ` · มีอยู่แล้ว ${fmtN(s.same)} คัน` : ''}</li>
    <li>อยู่ในเว็บแต่ไม่มีในไฟล์ <b>${fmtN(s.webOnly)}</b> คัน: คงไว้ตามเดิม</li><li>อยู่ในไฟล์แต่ไม่มีในเว็บ <b>${fmtN(s.fileOnly)}</b> คัน: ไม่นำเข้า</li></ul>
    <div class="mt-2 flex gap-2">${F.docs.length ? `<button class="btn btn-red btn-sm" data-act="upl-fill-save" ${F.busy ? 'disabled' : ''}>${F.busy ? '<span class="spin"></span> กำลังบันทึก…' : 'บันทึกการเติมข้อมูล'}</button>` : '<span class="text-muted">ไม่มีอะไรต้องเติม</span>'}<button class="btn btn-ghost btn-sm" data-act="upl-fill-close">ปิด</button></div></div>`;
}
Object.assign(ACTIONS, {
  'upl-fill'() { if (!perms().write) return; S.upl.fill = uplFillPlan(); render(); },
  'upl-fill-close'() { S.upl.fill = null; render(); },
  async 'upl-fill-save'() {
    const F = S.upl.fill; if (!F || F.busy || !perms().write) return;
    F.busy = true; render();
    let n = 0;
    for (const d of uplFillPlan().docs) {   // planned again on the latest stored tables
      const doc = { ...d.doc, ...pack('stock', d.rows), filled: { at: new Date().toISOString(), n: d.n, by: actor().by || null } };
      if (!await write('ids', d.id, doc)) { F.busy = false; render(); return; }
      n += d.n;
    }
    S.upl.fill = null; toast(`เติมข้อมูลรถแล้ว ${fmtN(n)} รายการ · รายการรถไม่เปลี่ยน`); render();
  }
});
