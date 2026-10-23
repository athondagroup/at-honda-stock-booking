// ------------------------------------------------------------------ stock search also finds cars that left stock (23/10)
// A VIN / name typed in the stock search may belong to a car already invoiced and handed over, or taken out: those are
// not in the stock list, so they are listed under it with where they went. Sales do not see this box.
// Only function declarations here: the first render runs before this part of the file.
function stockOutHits(D, q) {
  const n = String(q || '').trim().toUpperCase(); if (n.length < 4 || isSales()) return [];
  const seen = new Set(), out = [];
  const add = (vin, row) => { if (!vin || seen.has(vin) || D.cars.has(vin)) return; seen.add(vin); out.push(row); };
  const hit = (...xs) => xs.some(x => x && String(x).toUpperCase().includes(n));
  D.deliveredOut.forEach(c => { const i = c.inv || D.invByVin.get(c.vin); if (inBr(c) && hit(c.vin, c.ref, c.cust, i && i.cust, i && i.inv)) add(c.vin, { c, i, why: 'ส่งมอบแล้ว' }); });
  D.removed.forEach(c => { if (inBr(c) && hit(c.vin, c.ref, c.cust)) add(c.vin, { c, i: D.invByVin.get(c.vin), why: 'นำออกในระบบนี้' }); });
  for (const [vin, i] of D.invByVin) {
    if (!vin || !inBr(i) || !hit(vin, i.cust, i.inv, i.no)) continue;
    add(vin, { c: carAny(vin, D) || { vin, br: i.br, model: i.model, grade: i.grade, color: i.color }, i, why: i.company ? 'ขายให้บริษัท / สาขาอื่น' : i.ddate ? 'ส่งมอบแล้ว' : 'ออกใบกำกับแล้ว (ไม่อยู่ในไฟล์ Stock)' });
  }
  return out.slice(0, 50);
}
function stockOutBox(D) {
  const L = stockOutHits(D, S.filters.q); if (!L.length) return '';
  return `<div class="bg-surface border border-line rounded-lg mb-3"><div class="p-3 px-4 border-b border-line"><b>พบนอกสต็อก ${L.length} คัน</b> <span class="text-sm text-muted">ออกใบกำกับ / ส่งมอบ / นำออกไปแล้ว · กดเลขตัวถังเพื่อดูประวัติรถ</span></div>
    <div class="divide-y divide-line">${L.map(({ c, i, why }) => `<div class="p-2 px-4 text-sm flex flex-wrap gap-x-3 gap-y-1 items-center">${vinLink(c)}
      <span>${esc(c.model || (i && i.model) || '')} ${esc(gradeShort(c.model || (i && i.model), c.grade || (i && i.grade)) || '')} ${esc(c.color || (i && i.color) || '')}</span>
      <span class="text-muted">${esc((i && i.br) || c.br || '')}${i ? ` · ใบกำกับ ${esc(i.inv || '')} ${fmtD(i.idate)}${i.ddate ? ` · ส่งมอบ ${fmtD(i.ddate)}` : ''} · ${esc(i.cust || '')}` : ''}${c.handed && c.handed.date ? ` · ส่งมอบในเว็บ ${fmtD(c.handed.date)}` : ''}</span>
      ${advRec(c.vin) ? (x => x ? advPath(x) : '')(advList(D).find(y => y.vin === c.vin)) : chip(why, why.startsWith('ส่งมอบ') ? 'good' : 'neutral')}</div>`).join('')}</div></div>`;
}
