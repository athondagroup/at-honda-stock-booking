// ---------- rows that are not complete are not imported (ตกลง 3/11)
// A Booking row needs model, grade, colour and booking date; a Stock row needs model, grade, colour and a date (stock-in or production).
// If any row is incomplete the whole table is NOT imported (r.block); the check list names each row and what is missing, then the file is fixed and uploaded again.
// Only function declarations here.
function uplGateNeed(src) { return src === 'booking' ? [['model', 'รุ่น'], ['grade', 'เกรด'], ['color', 'สี'], ['date', 'วันที่จอง']] : [['model', 'รุ่น'], ['grade', 'เกรด'], ['color', 'สี']]; }   // a Stock row without a stock-in / production date is imported (9/11): new cars often have none yet
function uplGateMiss(src, x) { return uplGateNeed(src).filter(([k]) => !k.split('|').some(c => x[c])).map(([, t]) => t); }
function uplGate(r) {
  r.gate = null; if (!['booking', 'stock'].includes(r.src) || r.error || !r.rows) return;
  const key = x => r.src === 'stock' ? x.vin : x.no;
  const ok = [], bad = [];
  for (const x of r.rows) {
    const miss = uplGateMiss(r.src, x);
    if (miss.length) bad.push({ k: String(key(x)) || '–', label: x.cust || x.model || '', miss }); else ok.push(x);
  }
  if (r.src === 'stock') { const nd = r.rows.filter(x => !x.stockin && !x.prod && !x.consign).length; if (nd) r.warn.push(`${nd} คันยังไม่มีวันที่ Stock In / ฝากศูนย์ / ผลิต นำเข้าได้ อายุรถจะขึ้นเมื่อมีวันที่`); }
  if (bad.length) { r.gate = { bad, total: r.rows.length }; r.block = `ข้อมูลไม่ครบ ${bad.length} ${r.src === 'stock' ? 'คัน' : 'ใบ'} จึงไม่นำเข้าทั้งตาราง · ดูรายการด้านล่าง แล้วอัปโหลดข้อมูลใหม่`; r.on = false; }
}
function uplGateCell(r) {
  const g = r.gate; if (!g || r.error) return '';
  return `<div class="mt-1 p-2 rounded" style="background:var(--warn-soft)">${g.bad.length ? `<b style="color:var(--warn)">ไม่นำเข้าตารางนี้เลย: ข้อมูลไม่ครบ ${fmtN(g.bad.length)} ${r.src === 'stock' ? 'คัน' : 'ใบ'}</b> <span class="text-muted">(ไปแก้ใน IDS แล้วอัปโหลดข้อมูลใหม่)</span>
    <details><summary class="cursor-pointer">ดูรายการ</summary>${g.bad.slice(0, 60).map(x => `<div class="code">${esc(x.k)} · ${esc(x.label)} · ขาด ${esc(x.miss.join(', '))}</div>`).join('')}${g.bad.length > 60 ? `<div>และอีก ${fmtN(g.bad.length - 60)}</div>` : ''}</details>` : ''}
</div>`;
}
