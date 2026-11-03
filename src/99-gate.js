// ---------- rows that are not complete are not imported (ตกลง 3/11)
// A Booking row needs model, grade, colour and booking date; a Stock row needs model, grade, colour and a date (stock-in or production).
// If the same booking no. / VIN is in the table already used, the missing fields are first taken from that old row; a row still incomplete
// is left out of the web and listed in the check list (what is missing), so it can be fixed in IDS and uploaded again.
// Only function declarations here.
function uplGateNeed(src) { return src === 'booking' ? [['model', 'รุ่น'], ['grade', 'เกรด'], ['color', 'สี'], ['date', 'วันที่จอง']] : [['model', 'รุ่น'], ['grade', 'เกรด'], ['color', 'สี'], ['stockin|prod', 'วันที่เข้า/ผลิต']]; }
function uplGateMiss(src, x) { return uplGateNeed(src).filter(([k]) => !k.split('|').some(c => x[c])).map(([, t]) => t); }
function uplGate(r) {
  r.gate = null; if (!['booking', 'stock'].includes(r.src) || r.error || !r.rows) return;
  const key = x => r.src === 'stock' ? x.vin : x.no, oldBy = new Map(unpack(S.ids.get(idsDocId(r.src, r.br))).map(x => [String(key(x)), x]));
  const ok = [], bad = []; let filled = 0;
  for (const x of r.rows) {
    let row = x, miss = uplGateMiss(r.src, row);
    if (miss.length) {
      const o = oldBy.get(String(key(x)));
      if (o) { row = { ...x }; ['model', 'grade', 'color', 'date', 'stockin', 'prod'].forEach(c => { if (!row[c] && o[c]) row[c] = o[c]; }); miss = uplGateMiss(r.src, row); if (!miss.length) filled++; }
    }
    if (miss.length) bad.push({ k: String(key(x)) || '–', label: x.cust || x.model || '', miss }); else ok.push(row);
  }
  if (bad.length || filled) { r.rows = ok; r.gate = { bad, filled, total: ok.length + bad.length }; }
}
function uplGateCell(r) {
  const g = r.gate; if (!g || r.error || r.block) return '';
  return `<div class="mt-1 p-2 rounded" style="background:var(--warn-soft)">${g.bad.length ? `<b style="color:var(--warn)">ไม่นำเข้า ${fmtN(g.bad.length)} ${r.src === 'stock' ? 'คัน' : 'ใบ'}</b> <span class="text-muted">(ข้อมูลไม่ครบ ไปแก้ใน IDS แล้วอัปโหลดใหม่)</span>
    <details><summary class="cursor-pointer">ดูรายการ</summary>${g.bad.slice(0, 60).map(x => `<div class="code">${esc(x.k)} · ${esc(x.label)} · ขาด ${esc(x.miss.join(', '))}</div>`).join('')}${g.bad.length > 60 ? `<div>และอีก ${fmtN(g.bad.length - 60)}</div>` : ''}</details>` : ''}
    ${g.filled ? `<div class="text-muted">เติมข้อมูลที่ขาดจากตารางเดิม ${fmtN(g.filled)} ${r.src === 'stock' ? 'คัน' : 'ใบ'}</div>` : ''}</div>`;
}
