// ---------- keep what the new IDS file lost (ตกลง 3/11)
// A Booking / Stock / Quota upload replaces the whole table. When the same row (booking no. / VIN / Ref) is in the new file but a field the old
// row had is now empty (VIN, W/S Order, Quota Ref ...), the old value is kept, and the check list says how many rows were kept.
//   Booking: vin, ref, ws · Quota: vin, ws · Stock: ref, and the booking link (bkno, cust, bkdate, alloc)
// Not kept: the booking is cancelled in IDS or in the web (the car lets go), the same VIN is now on another row, the booking is resolved
//   (delivered / in DL). A Stock car that lost its booking link while that booking is gone from IDS is only "ask": it stays booked until
//   the admin ticks "ถอนรถเป็นว่าง" in the check list (nothing is released without that tick).
// Only function declarations and ACTIONS here.
function uplKeepOld(r) {
  if (r.src === 'quota') return (r.months || []).flatMap(m => unpack(S.ids.get(idsDocId('quota', r.br, m))));
  return unpack(S.ids.get(idsDocId(r.src, r.br)));
}
function uplKeepCalc(r, D, results) {
  const items = [], old = uplKeepOld(r); if (!old.length) return { items, dropped: 0 };
  const key = x => r.src === 'stock' ? x.vin : r.src === 'booking' ? x.no : x.ref, oldBy = new Map(old.map(x => [key(x), x]));
  const webCx = new Set(D.at.filter(a => a.cancelled && !a.demo).flatMap(a => [a.rec.booking_no, a.ids && a.ids.no, a.idsLeft && a.idsLeft.no].filter(Boolean).map(String)));
  const webDone = new Set(D.at.filter(a => !a.cancelled && a.flow && a.flow.done && a.flow.done.delivered).flatMap(a => [a.rec.booking_no, a.ids && a.ids.no].filter(Boolean).map(String)));
  const dlNo = new Set(D.X.inv.filter(i => i.no && !i.company).map(i => String(i.no)));
  const bkB = results.find(x => x.src === 'booking' && x.br === r.br && x.on && !x.error), bkNow = new Set((bkB ? bkB.rows : D.X.bookings.filter(b => b.br === r.br)).map(b => String(b.no)));
  const vins = new Map(); r.rows.forEach(x => { if (x.vin) vins.set(x.vin, (vins.get(x.vin) || 0) + 1); });
  let dropped = 0;
  for (const n of r.rows) {
    const o = oldBy.get(key(n)); if (!o) continue;
    const f = {}; let kind = 'keep';
    const take = (k, v) => { if ((n[k] === null || n[k] === undefined || n[k] === '') && v) f[k] = v; };
    if (r.src === 'booking') {
      if (n.ids === CANCEL || webCx.has(String(n.no))) { if (o.vin || o.ref || o.ws) dropped++; continue; }
      take('vin', o.vin && !vins.has(o.vin) ? o.vin : null); if (!n.vin && !f.vin) take('ref', o.ref); take('ws', o.ws);
    } else if (r.src === 'quota') {
      take('vin', o.vin && !vins.has(o.vin) ? o.vin : null); take('ws', o.ws);
    } else {
      take('ref', o.ref);
      if (!n.bkno && o.bkno) {
        const no = String(o.bkno);
        if (webCx.has(no) || webDone.has(no) || dlNo.has(no)) dropped++;
        else { ['bkno', 'cust', 'bkdate', 'alloc'].forEach(k => take(k, o[k])); if (!bkNow.has(no)) kind = 'ask'; }
      }
    }
    if (Object.keys(f).length) items.push({ k: String(key(n)), kind, f, label: n.cust || o.cust || '', model: n.model || o.model || '' });
  }
  return { items, dropped };
}
const UPL_KEEP_T = { vin: 'VIN', ref: 'Quota Ref', ws: 'W/S Order', bkno: 'ใบจอง', cust: 'ลูกค้า', bkdate: 'วันที่จอง', alloc: 'จัดสรร' };
function uplKeepRows(r, rows) {
  const k = r.keep; if (!k || !k.items.length) return rows;
  const by = new Map(k.items.filter(x => !(x.kind === 'ask' && r.rel && r.rel.has(x.k))).map(x => [x.k, x.f]));
  const key = x => r.src === 'stock' ? x.vin : r.src === 'booking' ? x.no : x.ref;
  return rows.map(x => by.has(String(key(x))) ? { ...x, ...by.get(String(key(x))) } : x);
}
function uplKeepCell(r, i) {
  const k = r.keep; if (!k || r.error || r.block) return '';
  const keep = k.items.filter(x => x.kind === 'keep'), ask = k.items.filter(x => x.kind === 'ask');
  if (!keep.length && !ask.length && !k.dropped) return '';
  const fl = x => Object.keys(x.f).map(c => UPL_KEEP_T[c] || c).join('+');
  const rel = ask.filter(x => r.rel && r.rel.has(x.k)).length;
  return `<div class="mt-1 p-2 rounded" style="background:var(--surface-2)">
    ${keep.length ? `<div><b>คงค่าเดิมไว้ ${fmtN(keep.length)} ${r.src === 'stock' ? 'คัน' : 'ใบ'}</b> <span class="text-muted">(แถวใหม่ไม่มีค่า แต่ของเดิมมี)</span>
      <details><summary class="cursor-pointer">ดูรายการ</summary>${keep.slice(0, 40).map(x => `<div class="code">${esc(x.k)} · ${esc(x.label || '–')} · ${esc(fl(x))}</div>`).join('')}${keep.length > 40 ? `<div>และอีก ${keep.length - 40}</div>` : ''}</details></div>` : ''}
    ${k.dropped ? `<div class="text-muted">ไม่คงค่าเดิม ${fmtN(k.dropped)} รายการ (ใบจองยกเลิกแล้ว ส่งมอบแล้ว หรืออยู่ใน DL)</div>` : ''}
    ${ask.length ? `<div class="mt-1 p-2 rounded" style="background:var(--warn-soft)"><b style="color:var(--warn)">${fmtN(ask.length)} คันที่ IDS ไม่มีใบจองนี้แล้ว</b> ตอนนี้ยังคงเป็นรถจองไว้ ติ๊กเพื่อ <b>ถอนรถเป็นว่าง</b> (${fmtN(rel)} ที่ติ๊ก)
      ${ask.slice(0, 40).map(x => `<label class="flex flex-wrap gap-x-2 items-center"><input type="checkbox" data-upl-rel="${i}" data-k="${esc(x.k)}" ${r.rel && r.rel.has(x.k) ? 'checked' : ''}><span class="code">${esc(x.k)}</span><span>${esc(x.label || '–')}</span><span class="text-muted">ใบจอง ${esc(x.f.bkno || '')}</span></label>`).join('')}</div>` : ''}</div>`;
}
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset || t.dataset.uplRel === undefined) return;
  const r = S.upl.results[Number(t.dataset.uplRel)]; if (!r) return;
  r.rel = r.rel || new Set(); t.checked ? r.rel.add(t.dataset.k) : r.rel.delete(t.dataset.k); render();
});
