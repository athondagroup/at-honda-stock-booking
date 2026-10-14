// ------------------------------------------------------------------ สรุปจอง: click a number to see the bookings behind it (ตกลง 14/10)
// Only function declarations here: the first render runs before this part of the file.
function sumBtn(k, c, n, br) {
  if (!n) return '–';
  return `<button class="num underline decoration-dotted" data-act="sum-cell" data-k="${esc(k)}" data-c="${c}" data-br="${esc(br || '')}" title="กดเพื่อดูรายการ">${n}</button>`;
}
function sumColName(c) { return { total: 'จอง', delivered: 'ส่งมอบแล้ว', inIds: 'อยู่ใน IDS รอรถ', noIds: 'ยังไม่อยู่ใน IDS', cancel: 'ยกเลิก', idsOnly: 'มีใน IDS แต่ไม่มีใบจอง AT', idsDiff: 'ชื่อเซลล์ใน IDS ไม่ตรง', cross: 'ขายข้ามสาขา' }[c] || c; }
// the same rules summaryView uses to count
function sumInCol(a, c) {
  if (c === 'cancel') return a.cancelled;
  if (a.cancelled) return false;
  if (c === 'total') return true;
  if (c === 'delivered') return !!a.done;
  if (c === 'inIds') return !a.done && !!a.match;
  if (c === 'noIds') return !a.done && !a.match;
  if (c === 'idsDiff') return !!(a.match && a.idsSales && !sameName(a.idsSales, a.sales));
  if (c === 'cross') return !!a.cross;
  return false;
}
function sumCellModal(m, D) {
  const sc = sumScope(D), keyHit = x => m.k === '*' || sc.keyOf(x) === m.k;
  const lbl = m.k === '*' ? 'ทุกรายการ' : sc.by === 'sales' ? esc(m.k) : sc.by === 'model' ? esc(m.k) : sc.by === 'grade' ? esc(m.k.split('|').join(' ')) : specLabel(m.k);
  const head = `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">${sumColName(m.c)} <span class="num">· ${lbl}</span></h2>
    <p class="text-sm text-muted">ใบจองวันที่ ${fmtD(sc.from)} – ${fmtD(sc.to)}${m.br ? ` · สาขาที่ออกรถ ${esc(m.br)}` : S.br ? ` · สาขา ${esc(S.br)}` : ''}</p></div><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>`;
  if (m.c === 'idsOnly') {
    const l = sc.idsOnly.filter(b => keyHit({ sales: b.owner, model: b.model, grade: b.grade, color: b.color }));
    return head + `<div class="scroll-x max-h-[70vh] overflow-auto"><table class="tbl text-sm"><thead><tr><th>วันที่จอง</th><th>เลขที่ใบจอง IDS</th><th>สาขา</th><th>เซลล์ (IDS)</th>${isSales() ? '' : '<th>ลูกค้า</th>'}<th>รุ่น เกรด สี</th></tr></thead><tbody>
      ${l.map(b => `<tr><td class="nowrap">${fmtD(b.date)}</td><td class="code">${esc(b.no || '')}</td><td>${esc(b.br || '')}</td><td class="nowrap">${esc(b.owner || b.sales || '')}</td>${isSales() ? '' : `<td>${esc(b.cust || '')}</td>`}<td class="nowrap">${esc(b.model || '')} ${esc(gradeShort(b.model, b.grade) || b.grade || '')} ${esc(b.color || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="text-muted">ไม่มี</td></tr>'}</tbody></table></div>
      <p class="text-xs text-muted mt-2">ใบจองที่มีในไฟล์ IDS แต่ยังไม่มีใบจองในระบบนี้ ให้เซลล์ลงใบจองหรือผูกกับใบที่มี</p>`;
  }
  const l = sc.list.filter(a => keyHit(a) && sumInCol(a, m.c) && (!m.br || (a.delivBr || a.br) === m.br)).sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const st = a => a.cancelled ? chip('ยกเลิก', 'muted') : a.done ? chip('ส่งมอบแล้ว', 'good') : a.match ? chip('อยู่ใน IDS รอรถ', 'neutral') : chip('ยังไม่อยู่ใน IDS', 'bad');
  return head + `<p class="text-sm mb-2">${fmtN(l.length)} ใบ · กดแถวเพื่อเปิดใบจอง</p><div class="scroll-x max-h-[70vh] overflow-auto"><table class="tbl text-sm"><thead><tr><th>วันที่จอง</th><th>สาขา</th><th>เซลล์</th><th>ลูกค้า</th><th>รุ่น เกรด สี</th><th>VIN</th><th>สถานะ</th></tr></thead><tbody>
    ${l.map(a => { const mine = !isSales() || isMine(a.sales), v = atVin(a); return `<tr class="cursor-pointer" data-act="at-open" data-id="${esc(a.id)}"><td class="nowrap">${fmtD(a.date)}</td><td>${esc(a.delivBr || a.br || '')}</td><td class="nowrap">${salesName(a.sales)}</td><td>${mine ? esc(a.cust || '') : '<span class="text-muted">ลูกค้าเซลล์อื่น</span>'}</td><td class="nowrap">${esc(a.model || '')} ${esc(gradeShort(a.model, a.grade) || a.grade || '')} ${esc(a.color || '')}</td><td class="code text-xs">${esc(v || '')}</td><td class="nowrap">${st(a)}</td></tr>`; }).join('') || '<tr><td colspan="7" class="text-muted">ไม่มี</td></tr>'}</tbody></table></div>`;
}
Object.assign(ACTIONS, {
  'sum-cell'(el) { S.modal = { kind: 'sumcell', k: el.dataset.k, c: el.dataset.c, br: el.dataset.br || '' }; render(); }
});
