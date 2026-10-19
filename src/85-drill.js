// ------------------------------------------------------------------ every number on the dashboards opens its cars (ตกลง 19/10)
// A tile, a bar in a chart, a row in a bar list or a number in a table carries a "drill" spec: what it counts (m),
// the dates (from, to) and any filter (br, model, fin, who). Clicking it opens the list behind the number, car by car
// or booking by booking, worked out the same way the number was, with a download to Excel.
//   m: sales = ยอดขาย (ส่งมอบ) as on สรุปผู้บริหาร · invoiced = ใบกำกับ as on สรุปผู้บริหาร · trades = รถเก่าเทิร์น
//      dv / inv = ส่งมอบ / ใบกำกับ as on ยอดขาย and the branch comparison · bk = ยอดจองสุทธิ · cx = ยกเลิก · bkall = จองทั้งหมด
//      finbk = ใบจองไฟแนนซ์ · tr = รถเก่าเทิร์นตามสาขา · wait = ใบจองรอรถตอนนี้ · free = รถว่างตอนนี้
// Only function declarations here: the first render runs before this part of the file.
function drillAttr(spec, noStyle) { return spec ? `data-act="drill" data-drill="${esc(JSON.stringify(spec))}"${noStyle ? '' : ' style="cursor:pointer"'}` : ''; }
function drillNum(n, spec, cls = '') { return spec && n ? `<button class="num underline decoration-dotted underline-offset-2 hover:text-red ${cls}" ${drillAttr(spec)} title="ดูรายคัน">${typeof n === 'number' ? fmtN(n) : n}</button>` : (typeof n === 'number' ? fmtN(n) : n); }
// the dates of a chart column: its own from/to, or the month it stands for, kept inside the page's range
function drillRange(b, range) {
  if (b.from && b.to) return [b.from, b.to];
  if (!/^\d{4}-\d{2}$/.test(String(b.k))) return range || null;
  const [y, m] = b.k.split('-').map(Number), s = `${b.k}-01`, e = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return [range && range[0] > s ? range[0] : s, range && range[1] < e ? range[1] : e];
}
function drillSpecOf(base, b, i, range) {
  if (!base) return null;
  if (typeof base === 'function') return base(b, i);
  const r = drillRange(b, range); if (!r) return null;
  return { ...base, from: r[0], to: r[1], label: b.label };
}
const DRILL_M = { sales: 'ยอดขาย (ส่งมอบ)', invoiced: 'ยอดขาย (ใบกำกับภาษี)', trades: 'รถเก่าเทิร์น', dv: 'ส่งมอบ', inv: 'ใบกำกับภาษี', bk: 'ยอดจองสุทธิ', cx: 'ยกเลิก', bkall: 'ใบจองทั้งหมด',
  finbk: 'ใบจองไฟแนนซ์', tr: 'รถเก่าเทิร์น', wait: 'ใบจองรอรถตอนนี้', free: 'รถว่างขายได้ตอนนี้', target: 'เป้า' };
// the rows behind one spec, in one shape: date, branch, model, grade, colour, VIN, customer, sales, finance, invoice, source, booking id
function drillRows(D, sp) {
  const own = MGR_OF[S.role.role], prev = S.brScope;
  S.brScope = sp.br ? [sp.br] : own || null;
  try {
    const f = sp.from, t = sp.to, inR = d => !!d && (!f || d >= f) && (!t || d <= t);
    const bkRow = a => ({ date: a.date, br: a.br, model: a.model, grade: a.grade, color: a.color, vin: atVin(a) || '', cust: a.cust, sales: a.sales, fin: isCash(a.rec) ? 'ซื้อสด' : a.rec.finance || '', inv: '', src: 'ใบจอง', id: a.id, extra: a.cancelled ? (a.rec.cancel && a.rec.cancel.reason) || 'ยกเลิก' : '' });
    const bks = () => D.at.filter(a => !a.demo && inBr(a) && inR(a.date));
    let rows;
    if (sp.m === 'sales' || sp.m === 'invoiced' || sp.m === 'trades') {
      const E = execData(D, [f, t]);
      rows = sp.m === 'trades' ? E.trades.map(x => ({ date: x.date, br: x.br, model: x.newModel, vin: '', cust: x.cust, sales: x.sales, fin: '', inv: '', src: `${x.brand || ''} ${x.model || ''} ${x.year || ''}`.trim(), id: x.id, extra: x.price ? money(x.price) + ' บาท' : '' }))
        : E[sp.m].map(x => ({ ...x, src: x.src || 'DL' }));
    } else if (sp.m === 'dv' || sp.m === 'inv') rows = carListRows(D, { from: f || '2000-01-01', to: t || '2999-12-31' }, sp.m).map(r => ({ ...r, src: r.src || 'DL' }));
    else if (sp.m === 'bk') rows = bks().filter(a => !a.cancelled).map(bkRow);
    else if (sp.m === 'cx') rows = bks().filter(a => a.cancelled).map(bkRow);
    else if (sp.m === 'bkall') rows = bks().map(bkRow);
    else if (sp.m === 'finbk') rows = bks().filter(a => !a.cancelled && !isCash(a.rec)).map(bkRow);
    else if (sp.m === 'tr') rows = D.at.filter(a => !a.demo && !a.cancelled && inBr({ br: a.delivBr || a.br }) && pmEvents(a, D).some(([c, d]) => c === 'tr' && inR(d)))
      .map(a => { const x = (a.rec.flow.down || {}).tradein || {}; return { ...bkRow(a), br: a.delivBr || a.br, date: (pmEvents(a, D).find(e => e[0] === 'tr') || [])[1], src: `${x.brand || ''} ${x.model || ''} ${x.year || ''}`.trim(), extra: x.price ? money(x.price) + ' บาท' : '' }; });
    else if (sp.m === 'wait') rows = D.bookings.filter(b => b.state === 'waiting' && inBr(b)).map(b => ({ date: b.qdate || b.date, br: b.br, model: b.model, grade: b.grade, color: b.color, vin: '', cust: b.cust, sales: b.owner || b.sales, fin: '', inv: '', src: b.src === 'IDS' ? 'IDS' : 'ฟอร์ม AT', id: b.app ? b.app.id : null, extra: b.pos ? 'คิวที่ ' + b.pos : '' }));
    else if (sp.m === 'free') rows = [...D.cars.values()].filter(c => inBr(c) && (c.status === 'free' || c.status === 'temp')).map(c => ({ date: c.stockin, br: c.br, model: c.model, grade: c.grade, color: c.color, vin: c.vin, cust: '', sales: '', fin: '', inv: '', src: c.status === 'temp' ? 'ล็อกชั่วคราว' : 'ว่าง', extra: c.stockin ? daysBetween(c.stockin, D.today) + ' วัน' : '' }));
    else rows = [];
    const up = v => String(v || '').toUpperCase();
    if (sp.br) rows = rows.filter(r => r.br === sp.br);
    if (sp.model) rows = rows.filter(r => (r.model || 'ไม่ระบุ') === sp.model);
    if (sp.who) rows = rows.filter(r => (r.sales || 'ไม่ระบุ') === sp.who);
    if (sp.fin === 'cash') rows = rows.filter(r => !r.fin || r.fin === 'ซื้อสด');
    else if (sp.fin === 'fin') rows = rows.filter(r => r.fin && r.fin !== 'ซื้อสด');
    else if (sp.fin) rows = rows.filter(r => up(r.fin) === up(sp.fin));
    return rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  } finally { S.brScope = prev; }
}
function drillTitle(sp) { return [DRILL_M[sp.m] || sp.m, sp.label, sp.br, sp.model, sp.who, sp.fin === 'cash' ? 'ซื้อสด' : sp.fin === 'fin' ? 'ไฟแนนซ์' : sp.fin].filter(Boolean).join(' · '); }
function drillModal(m, D) {
  const sp = m.spec, rows = drillRows(D, sp), q = searchKey(m.q || '');
  const list = q ? rows.filter(r => [r.vin, r.cust, r.sales, r.model, r.inv, r.fin].some(x => x && searchKey(x).includes(q))) : rows;
  const showName = r => S.role.role === 'sales' && r.sales !== S.role.sales ? '<span class="text-muted">ลูกค้าของเซลล์อื่น</span>' : esc(r.cust || '');
  return `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">${esc(drillTitle(sp))}</h2>
      <div class="text-sm text-muted">${fmtN(rows.length)} รายการ${sp.from || sp.to ? ` · ${fmtD(sp.from)} – ${fmtD(sp.to)}` : ''}</div></div>
    <div class="flex gap-2"><button class="btn btn-dark btn-sm" data-act="drill-xlsx">Excel</button><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div></div>
  ${rows.length > 8 ? `<div class="field mb-2" style="max-width:20rem"><label for="dr-q">ค้นหา</label><input id="dr-q" type="search" data-modal="q" value="${esc(m.q || '')}"></div>` : ''}
  <div class="border border-line rounded-lg overflow-auto" style="max-height:65vh"><table class="tbl text-sm"><thead><tr><th>วันที่</th><th>สาขา</th><th>รุ่น / เกรด / สี</th><th>VIN</th><th>ลูกค้า</th><th>เซลล์</th><th>ไฟแนนซ์</th><th>ใบกำกับ / ที่มา</th><th></th></tr></thead><tbody>
    ${list.slice(0, 500).map(r => `<tr><td class="num nowrap">${fmtD(r.date)}</td><td>${esc(r.br || '')}</td><td class="nowrap">${esc(r.model || '')} ${esc(gradeShort(r.model, r.grade) || r.grade || '')} ${esc(r.color || '')}</td>
      <td>${r.vin ? vinLink({ vin: r.vin }) : ''}</td><td>${showName(r)}</td><td class="nowrap">${esc(r.sales || '')}</td><td>${esc(r.fin || '')}</td>
      <td class="text-xs">${esc(r.inv || '')}${r.inv && r.src ? ' · ' : ''}${esc(r.src || '')}${r.extra ? `<div class="text-muted">${esc(r.extra)}</div>` : ''}</td>
      <td>${r.id && S.bookings.get(r.id) ? `<button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(r.id)}">ใบจอง</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="text-muted">ไม่มีรายการ</td></tr>'}
  </tbody></table></div>${list.length > 500 ? '<p class="text-xs text-muted mt-1">แสดง 500 รายการแรก กด Excel เพื่อดูทั้งหมด</p>' : ''}`;
}
async function drillXlsx() {
  const m = S.modal; if (!m || m.kind !== 'drill') return;
  let X; try { X = await loadXLSX(); } catch (e) { toast('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ', 'bad'); return; }
  const rows = drillRows(derive(), m.spec);
  const aoa = [['วันที่', 'สาขา', 'รุ่น', 'เกรด', 'สี', 'VIN', 'ลูกค้า', 'เซลล์', 'ไฟแนนซ์', 'เลขที่ใบกำกับ', 'ที่มา', 'หมายเหตุ'],
    ...rows.map(r => [r.date || '', r.br || '', r.model || '', r.grade || '', r.color || '', r.vin || '', S.role.role === 'sales' && r.sales !== S.role.sales ? '' : r.cust || '', r.sales || '', r.fin || '', r.inv || '', r.src || '', r.extra || ''])];
  const wb = X.utils.book_new(), ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = aoa[0].map(() => ({ wch: 16 })); X.utils.book_append_sheet(wb, ws, 'รายการ');
  const buf = X.write(wb, { type: 'array', bookType: 'xlsx' });
  await docSave(docName(drillTitle(m.spec), m.spec.from || '', m.spec.to || '') + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
Object.assign(ACTIONS, {
  drill(el) { let sp = null; try { sp = JSON.parse(el.dataset.drill); } catch (e) { sp = null; } if (!sp) return; S.modal = { kind: 'drill', spec: sp, q: '' }; render(); },
  async 'drill-xlsx'() { await drillXlsx(); }
});
