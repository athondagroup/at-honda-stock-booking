// ------------------------------------------------------------------ per person, per month; per-car invoice / delivery lists (ตกลง 14/10)
// Sales see their own months: bookings, cancellations, deliveries, trade-ins (no invoices).
// Managers (own branches) and the executive see every sales person, with invoices too, and can open one person.
// ยอดขายและเป้า gets a per-car list of invoices or deliveries for the chosen period, with an Excel download.
// Only function declarations here: the first render runs before this part of the file.
function pmYear(D) { const y = Number(S.filters.pmYear) || Number(D.today.slice(0, 4)); return y; }
function pmYears(D) { const ys = new Set([Number(D.today.slice(0, 4))]); D.at.forEach(a => { if (a.date) ys.add(Number(a.date.slice(0, 4))); }); D.X.inv.forEach(i => { if (i.idate) ys.add(Number(i.idate.slice(0, 4))); }); return [...ys].filter(y => y > 2000).sort((a, b) => b - a); }
// the dated events of one booking: booked / cancelled (booking date), delivered, invoiced, trade-in
function pmEvents(a, D) {
  const ev = [];
  if (a.date) ev.push([a.cancelled ? 'cx' : 'bk', a.date]);
  if (a.cancelled) return ev;
  if (a.flow && a.flow.deliveredDate) ev.push(['dv', a.flow.deliveredDate]);
  const v = atVin(a), i = v && D.invByVin.get(v); if (i && !i.company && i.idate) ev.push(['inv', i.idate]);
  const f = a.rec.flow || {}, t = f.down && f.down.tradein;
  if (t && t.has) { const d = (f.delivered && f.delivered.date) || (a.match && a.match.ddate) || f.down.date; if (d) ev.push(['tr', d]); }
  return ev;
}
// {month: {bk:[a], cx:[], dv:[], inv:[], tr:[]}} for one year, for the bookings that pass keep(a)
function pmStats(D, keep, y) {
  const out = {}; for (let m = 1; m <= 12; m++) out[`${y}-${String(m).padStart(2, '0')}`] = { bk: [], cx: [], dv: [], inv: [], tr: [] };
  D.at.forEach(a => { if (a.demo || !keep(a)) return; pmEvents(a, D).forEach(([c, d]) => { const k = d.slice(0, 7); if (out[k]) out[k][c].push(a); }); });
  return out;
}
function pmCols(showInv) { return [['bk', 'จอง'], ['cx', 'ยกเลิก'], ['dv', 'ส่งมอบ'], ...(showInv ? [['inv', 'ใบกำกับ']] : []), ['tr', 'รถเก่า (เทิร์น)']]; }
function pmBtn(n, data) { return n ? `<button class="num underline decoration-dotted" data-act="pm-cell" ${Object.entries(data).map(([k, v]) => `data-${k}="${esc(String(v))}"`).join(' ')} title="กดเพื่อดูรายการ">${n}</button>` : '<span class="text-muted">–</span>'; }
// one person's months (who = sales name), or everyone in scope when who is '*'
function pmMonthTable(D, who, y, showInv) {
  const keep = a => inBr(a) && (who === '*' || a.sales === who), st = pmStats(D, keep, y), cols = pmCols(showInv);
  const nowM = D.today.slice(0, 7), months = Object.keys(st).filter(m => m <= nowM || Object.values(st[m]).some(l => l.length));
  const tot = {}; cols.forEach(([c]) => { tot[c] = months.reduce((n, m) => n + st[m][c].length, 0); });
  return `<div class="scroll-x"><table class="tbl text-sm"><thead><tr><th>เดือน</th>${cols.map(([, t]) => `<th class="text-right">${t}</th>`).join('')}</tr></thead><tbody>
    ${months.map(m => `<tr><td class="nowrap">${fmtM(m)}</td>${cols.map(([c]) => `<td class="num text-right ${c === 'dv' ? 'font-semibold' : ''}">${pmBtn(st[m][c].length, { who, y, m, c })}</td>`).join('')}</tr>`).join('')}
    <tr style="font-weight:600"><td>รวม ${y}</td>${cols.map(([c]) => `<td class="num text-right">${pmBtn(tot[c], { who, y, m: '', c })}</td>`).join('')}</tr></tbody></table></div>`;
}
function pmYearSel(D) { return `<div class="field"><label for="pm-y">ปี</label><select id="pm-y" data-filter="pmYear">${pmYears(D).map(y => `<option value="${y}" ${pmYear(D) === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>`; }
// sales role: my own months on the dashboard
function salesMonthly(D) {
  const me = S.role.sales; if (!me) return '';
  return `<section class="bg-surface border border-line rounded-lg p-4 mb-6"><div class="flex flex-wrap items-end justify-between gap-3 mb-2"><h2 class="font-head text-lg font-semibold">ยอดของฉันรายเดือน</h2>${pmYearSel(D)}</div>
    ${pmMonthTable(D, me, pmYear(D), false)}
    <p class="text-xs text-muted mt-2">จอง / ยกเลิก นับตามวันที่จอง · ส่งมอบ นับตามวันที่ส่งมอบ · รถเก่า นับใบจองที่ลูกค้ามีรถเก่าเทิร์น (ตามเดือนที่ส่งมอบ) · กดตัวเลขเพื่อดูรายคัน</p></section>`;
}
// managers / executive: everyone (in their branches), then one person
function dashPerson(D) {
  const y = pmYear(D), mo = S.filters.pmMonth || '', who = S.filters.pmSales || '';
  const head = `${pageHead('รายบุคคล', 'ยอดจอง ส่งมอบ ใบกำกับ และรถเก่าเทิร์น ของเซลล์แต่ละคน ดูย้อนหลังได้ทุกปีที่มีข้อมูล')}${dashTabs()}${brSeg()}`;
  if (who) return `${head}<div class="flex flex-wrap items-end gap-3 mb-3"><button class="btn btn-ghost btn-sm" data-act="pm-who" data-n="">← ทุกคน</button><h2 class="font-head text-lg font-semibold">${salesName(who)}</h2>${pmYearSel(D)}</div>
    ${dCard('รายเดือน', pmMonthTable(D, who, y, true), 'กดตัวเลขเพื่อดูรายคัน · ใบกำกับนับจากไฟล์ DL ของรถที่ผูกกับใบจองของเซลล์คนนี้')}`;
  const keep = a => inBr(a), st = pmStats(D, keep, y), cols = pmCols(true);
  const months = mo ? [mo] : Object.keys(st);
  const ppl = {};
  months.forEach(m => cols.forEach(([c]) => st[m][c].forEach(a => { const p = (ppl[a.sales || 'ไม่ระบุ'] ||= { n: a.sales || 'ไม่ระบุ', bk: 0, cx: 0, dv: 0, inv: 0, tr: 0 }); p[c]++; })));
  const rows = Object.values(ppl).sort((a, b) => b.dv - a.dv || b.bk - a.bk);
  const mSel = `<div class="field"><label for="pm-m">เดือน</label><select id="pm-m" data-filter="pmMonth"><option value="">ทั้งปี</option>${Object.keys(st).map(m => `<option value="${m}" ${mo === m ? 'selected' : ''}>${fmtM(m)}</option>`).join('')}</select></div>`;
  return `${head}<div class="flex flex-wrap items-end gap-3 mb-3">${pmYearSel(D)}${mSel}</div>
    ${dCard(`เซลล์ ${mo ? fmtM(mo) : 'ปี ' + y}`, `<div class="scroll-x"><table class="tbl text-sm"><thead><tr><th>เซลล์</th>${cols.map(([, t]) => `<th class="text-right">${t}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(p => `<tr><td class="nowrap"><button class="underline decoration-dotted text-left" data-act="pm-who" data-n="${esc(p.n)}">${salesName(p.n)}</button></td>${cols.map(([c]) => `<td class="num text-right ${c === 'dv' ? 'font-semibold' : ''}">${pmBtn(p[c], { who: p.n, y, m: mo, c })}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length + 1}" class="text-muted">ไม่มีข้อมูล</td></tr>`}
      </tbody></table></div>`, 'กดชื่อเพื่อดูรายเดือนของคนนั้น · กดตัวเลขเพื่อดูรายคัน')}
    ${personModelCard(D)}
    ${dCard(`ทุกคนรายเดือน ${y}`, pmMonthTable(D, '*', y, true))}`;
}
function pmModal(m, D) {
  const own = MGR_OF[S.role.role], prev = S.brScope; if (own) S.brScope = own;
  try { return pmModalBody(m, D); } finally { S.brScope = prev; }
}
function pmModalBody(m, D) {
  const y = Number(m.y), keep = a => inBr(a) && (m.who === '*' || a.sales === m.who), st = pmStats(D, keep, y);
  const list = (m.m ? st[m.m][m.c] : Object.values(st).flatMap(x => x[m.c])).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const col = Object.fromEntries(pmCols(true))[m.c] || m.c, mineAll = !isSales();
  const dOf = a => { const e = pmEvents(a, D).find(([c]) => c === m.c); return e ? e[1] : a.date; };
  return `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">${col} · ${m.who === '*' ? 'ทุกคน' : esc(m.who)}</h2><p class="text-sm text-muted">${m.m ? fmtM(m.m) : 'ทั้งปี ' + y} · ${fmtN(list.length)} คัน · กดแถวเพื่อเปิดใบจอง</p></div><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="scroll-x max-h-[70vh] overflow-auto"><table class="tbl text-sm"><thead><tr><th>วันที่${col}</th><th>วันที่จอง</th><th>สาขา</th>${m.who === '*' ? '<th>เซลล์</th>' : ''}<th>ลูกค้า</th><th>รุ่น เกรด สี</th><th>VIN</th>${m.c === 'tr' ? '<th>รถเก่า</th>' : ''}</tr></thead><tbody>
  ${list.map(a => { const t = ((a.rec.flow || {}).down || {}).tradein; return `<tr class="cursor-pointer" data-act="at-open" data-id="${esc(a.id)}"><td class="nowrap">${fmtD(dOf(a))}</td><td class="nowrap">${fmtD(a.date)}</td><td>${esc(a.delivBr || a.br || '')}</td>${m.who === '*' ? `<td class="nowrap">${salesName(a.sales)}</td>` : ''}<td>${mineAll || isMine(a.sales) ? esc(a.cust || '') : '<span class="text-muted">ลูกค้าเซลล์อื่น</span>'}</td><td class="nowrap">${esc(a.model || '')} ${esc(gradeShort(a.model, a.grade) || a.grade || '')} ${esc(a.color || '')}</td><td class="code text-xs">${esc(atVin(a) || '')}</td>${m.c === 'tr' ? `<td class="text-xs">${t ? `${esc(t.brand || '')} ${esc(t.model || '')} ${t.year || ''}${t.price ? ' · ' + money(t.price) : ''}` : ''}</td>` : ''}</tr>`; }).join('') || '<tr><td colspan="8" class="text-muted">ไม่มี</td></tr>'}</tbody></table></div>`;
}

// ---- per-car list for ยอดขายและเป้า: invoices (by invoice date) or deliveries (by delivery date) in the period
function carListRows(D, E, kind) {
  const inR = d => !!d && d >= E.from && d <= E.to, rows = [];
  if (kind === 'inv') {
    D.X.inv.forEach(i => { if (!i.company && inBr(i) && inR(i.idate) && (!i.vin || D.invByVin.get(i.vin) === i || !D.invByVin.get(i.vin))) rows.push({ date: i.idate, idate: i.idate, ddate: i.ddate, br: i.br, vin: i.vin, model: i.model, grade: i.grade, color: i.color, cust: i.cust, sales: i.sales, fin: i.fin, inv: i.inv, src: 'DL' }); });
  } else {
    const seen = new Set();
    D.X.inv.forEach(i => { if (i.company || !inBr(i) || !inR(i.ddate)) return; seen.add(i.vin); rows.push({ date: i.ddate, idate: i.idate, ddate: i.ddate, br: i.br, vin: i.vin, model: i.model, grade: i.grade, color: i.color, cust: i.cust, sales: i.sales, fin: i.fin, inv: i.inv, src: 'DL' }); });
    // deliveries recorded here that the DL file does not have yet
    D.at.forEach(a => { if (a.cancelled || a.demo || !inBr(a)) return; const dv = a.rec.flow && a.rec.flow.delivered, v = atVin(a); if (!dv || !inR(dv.date) || (v && seen.has(v))) return; rows.push({ date: dv.date, idate: null, ddate: dv.date, br: a.delivBr || a.br, vin: v, model: a.model, grade: a.grade, color: a.color, cust: a.cust, sales: a.sales, fin: isCash(a.rec) ? 'ซื้อสด' : (a.rec.finance || ''), inv: '', src: 'บันทึกในระบบ', id: a.id }); });
  }
  return rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
function carListCard(D, E) {
  const kind = S.filters.carList === 'dv' ? 'dv' : 'inv', rows = carListRows(D, E, kind);
  const seg = `<div class="seg mb-3" role="group" aria-label="รายการ">${[['inv', 'ใบกำกับภาษี'], ['dv', 'ส่งมอบ']].map(([k, t]) => `<button data-act="car-list" data-k="${k}" aria-pressed="${kind === k}">${t}</button>`).join('')}</div>`;
  return dCard(`รายการรายคัน <span class="text-muted text-sm font-normal">${kind === 'inv' ? 'ออกใบกำกับ' : 'ส่งมอบ'} ${fmtN(rows.length)} คัน · ${fmtD(E.from)} – ${fmtD(E.to)}</span>`, `<div class="flex flex-wrap items-center justify-between gap-2">${seg}<button class="btn btn-ghost btn-sm mb-3" data-act="car-list-xlsx" ${rows.length ? '' : 'disabled'}>ดาวน์โหลด Excel</button></div>
    <div class="scroll-x max-h-96 overflow-auto"><table class="tbl text-sm"><thead><tr><th>${kind === 'inv' ? 'วันที่ใบกำกับ' : 'วันที่ส่งมอบ'}</th><th>${kind === 'inv' ? 'ส่งมอบ' : 'ใบกำกับ'}</th><th>สาขา</th><th>รุ่น เกรด สี</th><th>VIN</th><th>ลูกค้า</th><th>เซลล์</th><th>ไฟแนนซ์</th><th>เลขที่ใบกำกับ</th></tr></thead><tbody>
    ${rows.slice(0, 500).map(r => `<tr><td class="nowrap">${fmtD(r.date)}</td><td class="nowrap">${fmtD(kind === 'inv' ? r.ddate : r.idate) || '–'}</td><td>${esc(r.br || '')}</td><td class="nowrap">${esc(r.model || '')} ${esc(gradeShort(r.model, r.grade) || r.grade || '')} ${esc(r.color || '')}</td><td>${r.vin ? vinLink({ vin: r.vin }) : ''}</td><td>${esc(r.cust || '')}</td><td class="nowrap">${esc(r.sales || '')}</td><td>${esc(r.fin || '')}</td><td class="code text-xs">${esc(r.inv || '')}${r.src !== 'DL' ? ` <span class="text-xs text-muted">(${esc(r.src)})</span>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="text-muted">ไม่มีในช่วงนี้</td></tr>'}</tbody></table></div>`,
    'เลือกช่วงเวลาได้ที่แถบด้านบน (เดือนก่อน / เลือกช่วงวันที่) · ใบกำกับและส่งมอบมาจากไฟล์ DL ที่อัปโหลด ข้อมูลเก่าเก็บไว้ไม่หายเมื่ออัปโหลดไฟล์ใหม่ · ส่งมอบรวมรถที่บันทึกส่งมอบในระบบแต่ยังไม่มีใน DL');
}
async function carListXlsx() {
  let X; try { X = await loadXLSX(); } catch (e) { toast('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ', 'bad'); return; }
  const D = derive(), E = execData(D), kind = S.filters.carList === 'dv' ? 'dv' : 'inv';
  const prev = S.brScope; if (MGR_OF[S.role.role]) S.brScope = MGR_OF[S.role.role];
  let rows; try { rows = carListRows(D, E, kind); } finally { S.brScope = prev; }
  const aoa = [['วันที่ใบกำกับ', 'วันที่ส่งมอบ', 'สาขา', 'รุ่น', 'เกรด', 'สี', 'VIN', 'ลูกค้า', 'เซลล์', 'ไฟแนนซ์', 'เลขที่ใบกำกับ', 'ที่มา'], ...rows.map(r => [r.idate || '', r.ddate || '', r.br || '', r.model || '', r.grade || '', r.color || '', r.vin || '', r.cust || '', r.sales || '', r.fin || '', r.inv || '', r.src])];
  const wb = X.utils.book_new(), ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 6 }, { wch: 22 }, { wch: 14 }, { wch: 6 }, { wch: 20 }, { wch: 28 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  X.utils.book_append_sheet(wb, ws, kind === 'inv' ? 'ใบกำกับ' : 'ส่งมอบ');
  const buf = X.write(wb, { type: 'array', bookType: 'xlsx' });
  await docSave(docName(kind === 'inv' ? 'ใบกำกับรายคัน' : 'ส่งมอบรายคัน', S.br || 'ทุกสาขา', `${E.from}_${E.to}`) + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

// ---- invoice history: rows an upload no longer carries are kept in yearly archive docs (ids/invold_<br>_<year>)
// A new DL file covers only its own date range (and very large files were trimmed), so older invoices would
// otherwise disappear. Rows the new file has (same invoice no.) are never kept twice.
function invArchiveDocs(br) { return [...S.ids.entries()].filter(([k]) => k.startsWith(`invold_${br}_`)).map(([, d]) => d); }
function invArchiveRows(br, liveKeys) { return invArchiveDocs(br).flatMap(d => unpack({ cols: PACK.invoice, rows: d.rows || [] })).filter(r => !liveKeys.has(invKey(r))); }
function invKey(r) { return String(r.inv || '') + '|' + String(r.vin || ''); }
// called before an invoice table is saved: what the old doc had and the new one lacks goes to the archive
async function invArchive(br, newRows, cutRows = []) {
  const cur = S.ids.get('invoice_' + br);
  const keep = new Set(newRows.map(invKey)), minNew = newRows.map(r => r.idate).filter(Boolean).sort()[0] || null;
  // only rows older than the new file's first invoice date: inside its range a missing row means a cancelled invoice
  const old = [...(cur ? unpack(cur).filter(r => !keep.has(invKey(r)) && r.idate && (!minNew || r.idate < minNew)) : []), ...cutRows.filter(r => r.idate && !keep.has(invKey(r)))];
  if (!old.length) return true;
  const byY = {}; old.forEach(r => { (byY[r.idate.slice(0, 4)] ||= []).push(r); });
  for (const [y, rs] of Object.entries(byY)) {
    const id = `invold_${br}_${y}`, prev = S.ids.get(id), have = prev ? unpack({ cols: PACK.invoice, rows: prev.rows || [] }) : [];
    const m = new Map(have.map(r => [invKey(r), r])); rs.forEach(r => m.set(invKey(r), r));
    const all = [...m.values()].sort((a, b) => (a.idate || '').localeCompare(b.idate || ''));
    const doc = { src: 'invold', br, y: Number(y), n: all.length, cols: PACK.invoice, rows: all.map(r => PACK.invoice.map(c => r[c] ?? null)), ...actor() };
    if (!await write('ids', id, doc)) return false;
  }
  return true;
}
Object.assign(ACTIONS, {
  'pm-cell'(el) { S.modal = { kind: 'pm', who: el.dataset.who, y: el.dataset.y, m: el.dataset.m || '', c: el.dataset.c }; render(); },
  'pm-who'(el) { S.filters.pmSales = el.dataset.n || ''; render(); },
  'car-list'(el) { S.filters.carList = el.dataset.k; render(); },
  'car-list-xlsx'() { carListXlsx(); }
});
