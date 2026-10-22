// ---------- finance paper and DSP (ตกลง 22/10)
// Finance can be marked passed without the approval paper; the paper must be attached before delivery.
// HLTC bookings say whether it is DSP (Double Smile Plus); reports split HLTC into DSP and the rest.
// Only function declarations at the top level: the first render runs before this file.
function finDocsN(r) { return ((r.flow && r.flow.fin && r.flow.fin.docs) || []).length; }
function finDocsLater(a) {
  if (!(perms().write && stepAllowed(a, 'fin'))) return '<div class="text-xs" style="color:var(--warn)">ยังไม่แนบใบอนุมัติไฟแนนซ์ (ต้องแนบก่อนส่งมอบ)</div>';
  return `<div class="flex flex-wrap gap-2 items-center mt-1"><span class="text-xs" style="color:var(--warn)">ยังไม่แนบใบอนุมัติไฟแนนซ์ ต้องแนบก่อนส่งมอบ</span>
    <label class="btn btn-ghost btn-sm relative">${S.files.fin.length ? `เลือกแล้ว ${S.files.fin.length} รูป` : 'แนบใบอนุมัติ'}<input type="file" accept="image/*" multiple data-file="fin" class="absolute w-px h-px opacity-0"></label>
    ${S.files.fin.length ? `<button class="btn btn-dark btn-sm" data-act="fin-docs" data-id="${esc(a.id)}">บันทึกเอกสาร</button>` : ''}</div>`;
}
// finance of a car sold (Invoice / DL): the DL's finance company, none = cash; HLTC split by the booking's DSP tick
function finOfSale(r, D) {
  const f = String(r.fin || '').trim().toUpperCase();
  if (!f) return 'ซื้อสด';
  if (f.includes('HLTC') || f.includes('HONDA LEASING')) { const a = r.vin ? carBookingOf(r.vin, D) : null; return a && a.rec.dsp ? 'HLTC · DSP' : 'HLTC'; }
  return f;
}
function dspNote(rows, key) {
  const h = rows.filter(x => /^HLTC/.test(key(x))), d = h.filter(x => key(x) === 'HLTC · DSP').length;
  return h.length ? `<p class="text-sm mt-2">HLTC ${fmtN(h.length)} คัน · <b>DSP ${fmtN(d)} คัน (${pctOf(d, h.length)}% ของ HLTC</b> · ${pctOf(d, rows.length)}% ของทั้งหมด)</p>` : '';
}
Object.assign(ACTIONS, {
  async 'fin-docs'(el) {
    const a = atById(el.dataset.id); if (!a || !S.files.fin.length) return;
    const docs = [...((a.rec.flow && a.rec.flow.fin && a.rec.flow.fin.docs) || [])];
    for (const x of S.files.fin) { const id = await storeImage(x.blob); if (id) docs.push(id); }
    if (await saveFlow(a, { flow: { fin: { ...(a.rec.flow.fin || {}), docs } } }, 'แนบใบอนุมัติไฟแนนซ์แล้ว')) { S.files.fin = []; render(); }
  }
});
