// ---------- dashboards by role: sales (own work), branch admin (operations), managers (approvals and queue),
// executive (sales vs bookings with charts and an AI read-out)
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const monLabel = m => { const [y, mo] = m.split('-'); return `${TH_MON[Number(mo) - 1]} ${String(Number(y) + 543).slice(2)}`; };
const fmtN = n => Number(n || 0).toLocaleString('th-TH');
function tile(label, value, o = {}) {
  const attrs = o.drill ? drillAttr(o.drill) + ' title="ดูรายคัน"' : o.st ? `data-act="book-filter" data-st="${o.st}" data-br=""` : o.view ? `data-act="go" data-view="${o.view}" ${o.sub ? `data-sub="${o.sub}"` : ''} data-br=""` : '';
  const tag = attrs ? 'button' : 'div';
  return `<${tag} ${attrs} class="block w-full text-left p-4 min-w-0 ${attrs ? 'hover:bg-surface2' : ''}">
    <div class="text-muted text-sm">${label}</div>
    <div class="font-head font-semibold ${o.hero ? 'text-5xl' : 'text-3xl'}" ${o.tone ? `style="color:var(--${o.tone})"` : ''}>${value}</div>
    ${o.sub2 ? `<div class="text-xs text-muted mt-0.5">${o.sub2}</div>` : ''}</${tag}>`;
}
const tiles = (list, cols = 'lg:grid-cols-4') => `<div class="grid grid-cols-2 sm:grid-cols-3 ${cols} bg-surface border border-line rounded-lg divide-x divide-y divide-line overflow-hidden mb-6">${list.join('')}</div>`;
const sectionBox = (title, link, body) => `<section class="min-w-0 mb-6"><div class="flex items-center justify-between gap-3 mb-2"><h2 class="font-head text-lg font-semibold">${title}</h2>${link || ''}</div>${body}</section>`;
const listBox = (rows, empty) => `<div class="bg-surface border border-line rounded-lg divide-y divide-line">${rows || emptyBox(empty[0], empty[1])}</div>`;
function viewDash(D) {
  const r = S.role.role;
  if (r === 'sales') return dashSales(D) + salesMonthly(D);
  const sub = dashSub();
  if (sub === 'camp' && campCan()) return dashTabs() + viewCampSum(D);
  if (r === 'admin') return (campCan() ? dashTabs() : '') + dashAdmin(D);
  if ((sub === 'sales' || sub === 'book' || sub === 'acct' || sub === 'person' || sub === 'cars') && (r === 'exec' || MGR_OF[r])) return (sub === 'sales' ? dataFreshBox(D) : '') + dashScoped(D, sub);
  if (r === 'exec' && sub === 'exec') return dataFreshBox(D) + dashExec(D);
  return dataFreshBox(D) + dashManager(D);
}
const execSeg = () => dashTabs();
const totFree = D => [...D.cars.values()].filter(c => c.status === 'free' || c.status === 'temp').length;

// ---- sales: free cars in every branch, then only my own work
function dashSales(D) {
  const ms = monthStartISO();
  const mine = D.at.filter(a => !a.demo && isMine(a.sales));
  const active = mine.filter(a => a.active);
  const hasCar = active.filter(a => ['idscar', 'locked', 'allocated'].includes(a.row?.state) || a.flow.done.assign);
  const waiting = active.filter(a => a.row?.state === 'waiting');
  const noIds = active.filter(a => !a.match);
  const noForm = D.idsOnly.filter(b => isMine(b.owner));
  const req = myRequests(D);
  const reqN = req.bookings.filter(x => x.pending).length + req.locks.length;
  const alerts = myAlerts(D).filter(a => a.tone !== 'muted');
  const free = [...D.cars.values()].filter(c => c.status === 'free' || c.status === 'temp');
  const bySpec = {};
  free.forEach(c => { const s = (bySpec[c.spec] ||= { spec: c.spec, n: 0, br: {} }); s.n++; s.br[c.br] = (s.br[c.br] || 0) + 1; });
  const specs = Object.values(bySpec).sort((x, y) => y.n - x.n).slice(0, 10);
  const next = active.slice().sort((x, y) => (x.date || '').localeCompare(y.date || '')).slice(0, 8);
  const myLocks = D.locks.filter(l => l.live && isMine(l.owner));
  return `${pageHead(`สวัสดี ${esc(S.role.sales)}`, `งานของฉัน ณ ${fmtD(D.today)}`, perms().book ? `<button class="btn btn-red" data-act="go" data-view="book" data-sub="new">+ ใบจอง AT Honda</button>` : '')}
  ${tiles([
    tile('รถว่างขายได้ (ทุกสาขา)', fmtN(free.length), { view: 'stock', tone: 'good' }),
    tile('ฉันจองเดือนนี้', fmtN(mine.filter(a => !a.cancelled && (a.date || '') >= ms).length), { st: 'active' }),
    tile('ฉันส่งมอบเดือนนี้', fmtN(mine.filter(a => !a.cancelled && (a.flow.deliveredDate || '') >= ms).length), { st: 'done' }),
    tile('คำขอของฉันที่รออนุมัติ', fmtN(reqN), { view: 'inbox', tone: reqN ? 'warn' : '' })
  ])}
  ${tiles([
    tile('ใบจองของฉันที่ยังไม่ส่งมอบ', fmtN(active.length), { st: 'active' }),
    tile('มีรถแล้ว', fmtN(hasCar.length), { st: 'idscar', tone: 'good', sub2: 'IDS จัดสรร ล็อก หรือจัดสรรแล้ว' }),
    tile('รอรถ', fmtN(waiting.length), { st: 'waiting', tone: waiting.length ? 'warn' : '' }),
    tile('ฟอร์มยังไม่อยู่ใน IDS', fmtN(noIds.length), { st: 'noids', tone: noIds.length ? 'bad' : '' }),
    tile('มีใน IDS แต่ไม่มีฟอร์ม', fmtN(noForm.length), { st: 'noat', tone: noForm.length ? 'bad' : '' })
  ], 'lg:grid-cols-5')}
  <div class="grid lg:grid-cols-2 gap-x-5">
    ${sectionBox(`งานที่ต้องทำ <span class="text-muted text-base">${alerts.length}</span>`, go('alerts', '', undefined, 'ดูทั้งหมด', 'text-sm text-red'), listBox(alerts.slice(0, 5).map(alertRow).join(''), ['ไม่มีงานค้าง', 'เมื่อมีเรื่องต้องทำ รายการจะขึ้นที่นี่']))}
    ${sectionBox(`ล็อกของฉัน <span class="text-muted text-base">${myLocks.length}</span>`, go('lock', 'active', undefined, 'ดูทั้งหมด', 'text-sm text-red'), listBox(myLocks.slice(0, 5).map(l => lockRow(l, D, { compact: true })).join(''), ['ยังไม่มีล็อก', 'ขอล็อกได้จากรถว่างหรือจากใบจอง']))}
  </div>
  ${sectionBox('ใบจองของฉัน และขั้นถัดไป', `<button class="text-sm text-red" data-act="book-filter" data-st="active" data-br="">ดูทั้งหมด</button>`, next.length ? `<div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl"><thead><tr><th>วันที่จอง</th><th>ลูกค้า</th><th>รุ่น / เกรด / สี</th><th>สถานะ</th><th>ขั้นถัดไป</th><th></th></tr></thead><tbody>
    ${next.map(a => `<tr><td class="num nowrap">${fmtD(a.date)}</td><td>${esc(a.cust)}</td><td class="nowrap">${specLabel(a.spec)}</td><td class="nowrap">${statusChip(BOOK_STATE, a.row?.state || 'waiting')}${a.row?.state === 'waiting' && a.row.pos ? ` <span class="text-xs text-muted">คิวที่ ${a.row.pos}</span>` : ''}</td>
      <td class="text-sm">${a.flow.next ? esc(FLOW_LABEL[a.flow.next]) : '–'}</td><td class="text-right"><button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(a.id)}">เปิด</button></td></tr>`).join('')}</tbody></table></div>` : listBox('', ['ยังไม่มีใบจองที่รอส่งมอบ', 'กด "+ ใบจอง AT Honda" เพื่อลงใบจองใหม่']))}
  ${sectionBox('รถว่างพร้อมขาย (ทุกสาขา)', go('stock', 'list', '', 'ไปหน้าสต็อก', 'text-sm text-red'), specs.length ? `<div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl"><thead><tr><th>รุ่น / เกรด / สี</th>${BRS.map(b => `<th class="text-right">${b}</th>`).join('')}<th class="text-right">รวม</th></tr></thead><tbody>
    ${specs.map(s => `<tr><td class="nowrap">${specLabel(s.spec)}</td>${BRS.map(b => `<td class="num text-right">${s.br[b] || '<span class="text-muted">–</span>'}</td>`).join('')}<td class="num text-right font-semibold">${s.n}</td></tr>`).join('')}</tbody></table></div>` : listBox('', ['ยังไม่มีรถว่าง', 'รอรถเข้าหรือดู Quota']))}`;
}

// ---- branch admin: operations first
function dashAdmin(D) {
  const br = S.role.branch, src = D.X.src[br] || {};
  const age = m => m && m.asof ? daysBetween(m.asof, D.today) : null;
  const fileRow = (label, m) => { const d = age(m); return `<tr><td>${label}</td><td class="num">${m ? fmtD(m.asof) : '<span style="color:var(--warn)">ยังไม่มีไฟล์</span>'}</td><td class="num">${d === null ? '–' : d > 3 ? `<span style="color:var(--bad)">${d} วัน</span>` : `${d} วัน`}</td></tr>`; };
  const noIds = D.at.filter(a => a.active && !a.match && a.br === br).sort((x, y) => (x.date || '').localeCompare(y.date || ''));
  const noForm = D.idsOnly.filter(b => b.br === br);
  const recv = D.receipts.filter(r => r.status === 'pending' && r.br === br);
  const assign = D.at.filter(a => a.active && a.br === br && a.flow.next === 'assign');
  const toAlloc = D.locks.filter(l => l.status === 'approved' && l.type !== 'temp' && l.car_br === br);
  const noReceipt = D.at.filter(a => a.active && a.br === br && flowTab(a) === 'booked');
  const alerts = myAlerts(D).filter(a => a.tone !== 'muted');
  const lastQ = (src.quota || []).slice(-1)[0];
  return `${pageHead(`งานแอดมินสาขา ${br} ${BR[br]?.name || ''}`, `สิ่งที่ต้องทำวันนี้ ${fmtD(D.today)}`,
    `<button class="btn btn-ghost" data-act="go" data-view="upload">อัปเดตข้อมูล IDS</button><button class="btn btn-red" data-act="go" data-view="receive">+ รับรถเข้า</button>`)}
  ${tiles([
    tile('ใบจองรอจับคู่ IDS', fmtN(noIds.length), { st: 'noids', tone: noIds.length ? 'bad' : '' }),
    tile('มีใน IDS แต่ไม่มีฟอร์ม', fmtN(noForm.length), { st: 'noat', tone: noForm.length ? 'bad' : '' }),
    tile('รับรถเข้า รอยืนยัน', fmtN(recv.length), { view: 'receive', tone: recv.length ? 'warn' : '' }),
    tile('รอจัดสรรรถ', fmtN(assign.length), { st: 'assign', tone: assign.length ? 'warn' : '' }),
    tile('ล็อกอนุมัติแล้ว รอจัดสรรใน IDS', fmtN(toAlloc.length), { view: 'lock', sub: 'active', tone: toAlloc.length ? 'warn' : '' }),
    tile('ยังไม่มีเลขที่ใบเสร็จจอง', fmtN(noReceipt.length), { view: 'flow', sub: 'booked' })
  ], 'lg:grid-cols-6')}
  <div class="grid lg:grid-cols-2 gap-x-5">
    ${sectionBox('ไฟล์ IDS ของสาขา', `<button class="text-sm text-red" data-act="go" data-view="upload">อัปโหลด</button>`, `<div class="bg-surface border border-line rounded-lg"><table class="tbl"><thead><tr><th>ไฟล์</th><th>ข้อมูล ณ</th><th>เก่า</th></tr></thead><tbody>
      ${fileRow('Stock', src.stock)}${fileRow('Booking', src.booking)}${fileRow('DL (ส่งมอบ)', src.invoice)}${fileRow('Quota ล่าสุด', lastQ)}</tbody></table></div><p class="text-xs text-muted mt-1">ไฟล์เก่าเกิน 3 วัน การจับคู่และแจ้งเตือนอาจไม่ตรง</p>
      ${(() => { const n = [...D.cars.values()].filter(c => c.br === br && !c.prod).length; return n ? `<p class="text-sm mt-2" style="color:var(--warn)">รถในสต็อกยังไม่มีวันผลิต ${fmtN(n)} คัน (ไฟล์ IDS ไม่มีค่า) <button class="underline" data-act="noprod" data-on="1">ใส่วันผลิตจากป้ายที่รถ</button></p>` : ''; })()}`)}
    ${sectionBox(`งานที่ต้องทำ <span class="text-muted text-base">${alerts.length}</span>`, go('alerts', '', undefined, 'ดูทั้งหมด', 'text-sm text-red'), listBox(alerts.slice(0, 5).map(alertRow).join(''), ['ไม่มีงานค้าง', 'เมื่อมีเรื่องต้องทำ รายการจะขึ้นที่นี่']))}
  </div>
  ${sectionBox(`ล็อกที่อนุมัติแล้ว รอจัดสรรใน IDS <span class="text-muted text-base">${toAlloc.length}</span>`, go('lock', 'active', undefined, 'ดูทั้งหมด', 'text-sm text-red'), listBox(toAlloc.slice(0, 6).map(l => lockRow(l, D)).join(''), ['ไม่มีล็อกที่รอจัดสรร', 'เมื่อผู้จัดการอนุมัติล็อก รายการจะขึ้นที่นี่']))}
  ${sectionBox(`ใบจองรอจับคู่ IDS (เก่าสุดก่อน) <span class="text-muted text-base">${noIds.length}</span>`, `<button class="text-sm text-red" data-act="book-filter" data-st="noids" data-br="">ดูทั้งหมด</button>`, noIds.length ? `<div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl"><thead><tr><th>วันที่จอง</th><th>ลูกค้า</th><th>เซลล์</th><th>รุ่น / เกรด / สี</th><th>ผ่านมา</th><th></th></tr></thead><tbody>
    ${noIds.slice(0, 8).map(a => `<tr><td class="num nowrap">${fmtD(a.date)}</td><td>${esc(a.cust)}</td><td class="nowrap">${salesName(a.sales)}</td><td class="nowrap">${specLabel(a.spec)}</td><td class="num">${a.ageDays ?? '–'} วัน</td><td class="text-right"><button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(a.id)}">เปิด</button></td></tr>`).join('')}</tbody></table></div>` : listBox('', ['ใบจองทุกใบพบใน IDS แล้ว', '']))}`;
}

// ---- managers (and the executive's operations view): approvals, car queue, the four-branch picture
function dashManager(D) {
  const own = mgrBranches(), inOwn = x => own.includes(x.br);
  const tot = BRS.reduce((t, b) => { Object.keys(D.sum[b]).forEach(k => { t[k] = (t[k] || 0) + D.sum[b][k]; }); return t; }, {});
  const low = Object.values(D.specs).filter(s => s.low).sort((a, b) => (a.free + a.incoming - a.waiting) - (b.free + b.incoming - b.waiting));
  const waiting = D.bookings.filter(b => b.state === 'waiting' && inOwn(b)).length;
  const expiring = D.locks.filter(l => l.status === 'approved' && !l.hold && l.daysLeft !== null && l.daysLeft <= 2 && own.includes(l.car_br));
  const noIds = D.at.filter(a => a.active && !a.match && inOwn(a) && a.ageDays >= AT_TO_IDS_DAYS).length;
  const row = (b, s, label) => `<tr ${b ? (own.includes(b) && S.role.role !== 'exec' ? 'style="background:var(--surface-2)"' : '') : 'style="font-weight:600"'}>
    <td class="nowrap">${b ? `<b>${b}</b> <span class="text-muted text-xs">${BR[b].name}</span>` : label}</td>
    <td class="num text-right">${go('stock', 'list', b || '', s.stock)}</td><td class="num text-right">${s.free}</td><td class="num text-right">${s.held}</td><td class="num text-right">${s.locked || '–'}</td>
    <td class="num text-right">${s.ids}</td><td class="num text-right">${s.waiting}</td><td class="num text-right">${s.at}${s.atNoIds ? ` <span class="text-xs text-muted">(${s.atNoIds} ยังไม่พบใน IDS)</span>` : ''}</td>
    <td class="num text-right">${s.quotaIn}<span class="text-muted text-xs"> / ${s.quota}</span></td></tr>`;
  return `${pageHead(S.role.role === 'exec' ? 'คิวรถและภาพรวมสาขา' : `${MGR_NAME[own[0]] || 'ผู้จัดการ'} · สาขา ${own.join(', ')}`, `ณ ${fmtD(D.today)} · งานรออนุมัติอยู่ที่ "งานวันนี้ → รอฉันอนุมัติ"`)}
  ${execSeg()}
  ${tiles([
    tile('ใบจองรอรถ (สาขาฉัน)', fmtN(waiting), { view: 'book', sub: 'queue' }),
    tile('สเปกรถไม่พอคิว', fmtN(low.length), { view: 'stock', sub: 'spec', tone: low.length ? 'bad' : '' }),
    tile('ล็อกจะหมดใน 2 วัน', fmtN(expiring.length), { view: 'lock', sub: 'active', tone: expiring.length ? 'warn' : '' }),
    tile('ยังไม่อยู่ใน IDS เกิน 3 วัน', fmtN(noIds), { st: 'noids', tone: noIds ? 'bad' : '' }),
    tile('รถว่าง ขายได้ (ทุกสาขา)', fmtN(tot.free), { view: 'stock', tone: 'good' })
  ], 'lg:grid-cols-5')}
  ${brSeg()}
  ${sectionBox('แผนสั่งรถ', '', planView(D))}
  ${sectionBox('ภาพรวม Stock และ Booking ทุกสาขา (สำหรับรายงานผู้บริหาร)', '', `<div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl"><thead><tr><th>สาขา</th><th class="text-right">Stock</th><th class="text-right">ว่าง</th><th class="text-right">ติดจอง/ขาย</th><th class="text-right">ล็อก</th><th class="text-right">Booking IDS</th><th class="text-right">รอรถ</th><th class="text-right">ใบจอง AT ยังไม่ส่งมอบ</th><th class="text-right">Quota ว่าง / ทั้งหมด</th></tr></thead>
    <tbody>${BRS.map(b => row(b, D.sum[b])).join('')}${row(null, tot, 'รวม 4 สาขา')}</tbody></table></div>`)}`;
}

// ---- executive: sales (deliveries) vs bookings, cash vs finance, finance companies, with an AI read-out
const EXEC_PERIODS = [['ytd', 'ปีนี้ (ม.ค.–ปัจจุบัน)'], ['q', 'ไตรมาสนี้'], ['m', 'เดือนนี้'], ['pm', 'เดือนก่อน'], ['custom', 'เลือกช่วงวันที่']];
function execRange(today, key) { return periodRange(today); }
function execData(D, rng) {
  // rng: worked out for other dates (a click on a column opens its cars, 85-drill.js)
  const key = rng ? 'custom' : pState().kind;
  const [from, to] = rng ? [rng[0] || '2000-01-01', rng[1] || D.today] : execRange(D.today, key);
  const inR = d => !!d && d >= from && d <= to;
  // sales = deliveries: the IDS delivery list (DL) plus deliveries recorded here that are not in DL yet
  const sales = [];
  const dlKeys = new Set();
  // sales by invoice date: every invoice in the DL file (a car invoiced but not handed over yet counts here first)
  const invoiced = [];
  const det = i => ({ grade: i.grade, color: i.color, vin: i.vin, cust: i.cust, sales: i.sales, inv: i.inv, idate: i.idate, ddate: i.ddate });
  // advance invoices (no real customer, 23/10): counted on their own branch and month from what the branch set in the
  // Advance box; a later invoice for that car is a re-issue, not counted again as an invoice (its delivery counts below)
  const advs = new Map(); for (const [vin] of S.vehicles) { const a = advRec(vin); if (a) advs.set(vin, a); }
  D.X.inv.forEach(i => { if (!i.company && i.idate && inBr(i) && inR(i.idate) && !(i.vin && advs.has(i.vin))) invoiced.push({ date: i.idate, br: i.br, model: i.model, fin: i.fin || null, ...det(i) }); });
  for (const [vin, a] of advs) {
    const br = advBr(vin, a, D), c = carAny(vin, D) || {};
    if (br && inBr({ br }) && inR(a.idate)) invoiced.push({ date: a.idate, br, model: c.model, grade: c.grade, color: c.color, vin, cust: a.cust, sales: null, inv: a.inv, idate: a.idate, ddate: null, fin: null, adv: true, src: 'ใบ Advance', extra: 'ADV' });
  }
  D.X.inv.forEach(i => {
    if (i.company || !i.ddate || !inBr(i)) return;
    dlKeys.add('inv:' + i.br + ':' + i.inv);
    if (inR(i.ddate)) { const a = i.vin && advs.get(i.vin); sales.push({ date: i.ddate, br: i.br, model: i.model, fin: i.fin || null, src: 'DL', ...det(i), ...(a ? { advFrom: advBr(i.vin, a, D), extra: 'จากรถ ADV' } : {}) }); }
  });
  D.at.forEach(a => {
    if (a.cancelled || a.demo || !inBr(a)) return;
    const dv = a.rec.flow && a.rec.flow.delivered;
    if (!dv || !dv.date || (a.match && a.match.recs.some(r => r.kind === 'dl'))) return;
    if (inR(dv.date)) sales.push({ ...(advs.has(atVin(a)) ? { advFrom: advBr(atVin(a), advs.get(atVin(a)), D), extra: 'จากรถ ADV' } : {}), date: dv.date, br: a.delivBr || a.br, model: a.model, fin: isCash(a.rec) ? null : ((a.rec.flow.fin && a.rec.flow.fin.company) || a.rec.finance || 'ไฟแนนซ์'), src: 'บันทึกในระบบ', grade: a.grade, color: a.color, vin: atVin(a), cust: a.cust, sales: a.sales, id: a.id, ddate: dv.date });
  });
  // trade-ins recorded at the down payment step, counted in the month the car was delivered (or paid, if not delivered yet)
  const trades = [];
  D.at.forEach(a => {
    if (a.cancelled || a.demo || !inBr(a)) return;
    const f = a.rec.flow || {}, t = f.down && f.down.tradein; if (!t || !t.has) return;
    const date = (f.delivered && f.delivered.date) || (a.match && a.match.ddate) || f.down.date;
    if (inR(date)) trades.push({ date, br: a.delivBr || a.br, ...t, cust: a.cust, sales: a.sales, newModel: a.model, id: a.id });
  });
  const books = D.at.filter(a => !a.demo && inBr(a) && inR(a.date));
  const booked = books.filter(a => !a.cancelled), cancelled = books.filter(a => a.cancelled);
  const span = daysBetween(from, to);
  const buckets = [];
  if (span > 45 || from.slice(0, 7) !== to.slice(0, 7)) { let d = from.slice(0, 7); while (d <= to.slice(0, 7)) { const k = d; buckets.push({ k, label: monLabel(k), test: x => x.slice(0, 7) === k }); const [yy, mm] = d.split('-').map(Number); d = mm === 12 ? `${yy + 1}-01` : `${yy}-${String(mm + 1).padStart(2, '0')}`; } }
  else [[1, 7], [8, 14], [15, 21], [22, 28], [29, 31]].forEach(([s, e], i) => { if (Number(to.slice(8)) >= s || from.slice(0, 7) !== to.slice(0, 7)) buckets.push({ k: 'w' + i, from: (x => x < from ? from : x)(from.slice(0, 8) + String(s).padStart(2, '0')), to: (x => x > to ? to : x)(from.slice(0, 8) + String(Math.min(e, 31)).padStart(2, '0')), label: `${s}–${Math.min(e, 31)} ${TH_MON[Number(from.slice(5, 7)) - 1]}`, test: x => x.slice(0, 7) === from.slice(0, 7) && Number(x.slice(8)) >= s && Number(x.slice(8)) <= e }); });
  const count = (list, b, f = () => true) => list.filter(x => b.test(x.date || '') && f(x)).length;
  const fin = {};
  sales.forEach(s => { const k = s.fin ? String(s.fin).toUpperCase() : null; if (k) fin[k] = (fin[k] || 0) + 1; });
  const models = {};
  sales.forEach(s => { models[s.model || '?'] = (models[s.model || '?'] || 0) + 1; });
  const byBr = BRS.filter(b => inBr({ br: b })).map(b => ({ br: b, sales: sales.filter(s => s.br === b).length, inv: invoiced.filter(s => s.br === b).length, cash: sales.filter(s => s.br === b && !s.fin).length,
    booked: booked.filter(a => a.br === b).length, cancel: cancelled.filter(a => a.br === b).length, waiting: D.bookings.filter(x => x.state === 'waiting' && x.br === b).length, free: D.sum[b].free }));
  const dlAsof = BRS.map(b => D.X.src[b].invoice && D.X.src[b].invoice.asof).filter(Boolean).sort()[0] || null;
  return { key, from, to, sales, booked, cancelled, buckets, count, fin, models, byBr, dlAsof, trades, invoiced };
}
// grouped or stacked columns; values never painted on every bar: legend + hover + table carry them
function colChart(id, buckets, series, o = {}) {
  const W = 640, H = 220, padL = 36, padB = 26, padT = 12, plotW = W - padL - 8, plotH = H - padB - padT;
  const totals = buckets.map((_, i) => o.stacked ? series.reduce((t, s) => t + s.values[i], 0) : Math.max(...series.map(s => s.values[i])));
  const max = Math.max(1, ...totals);
  const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : max <= 100 ? 20 : Math.ceil(max / 5 / 10) * 10;
  const top = Math.ceil(max / step) * step;
  const y = v => padT + plotH - (v / top) * plotH;
  const band = plotW / buckets.length;
  const n = o.stacked ? 1 : series.length;
  const bw = Math.min(24, (band * 0.7 - (n - 1) * 2) / n);
  const groupW = n * bw + (n - 1) * 2;
  const rr = (x, y0, w, h, round) => { if (h <= 0) return ''; const r = Math.min(4, h, w / 2); return round ? `M${x},${y0 + h}V${y0 + r}Q${x},${y0} ${x + r},${y0}H${x + w - r}Q${x + w},${y0} ${x + w},${y0 + r}V${y0 + h}Z` : `M${x},${y0}H${x + w}V${y0 + h}H${x}Z`; };
  let marks = '';
  buckets.forEach((b, i) => {
    const gx = padL + i * band + (band - groupW) / 2;
    if (o.stacked) {
      let acc = 0;
      series.forEach((s, si) => {
        const v = s.values[i]; if (!v) return;
        const y1 = y(acc + v), y0 = y(acc), h = Math.max(0, y0 - y1 - (acc > 0 ? 2 : 0));
        const isTop = series.slice(si + 1).every(t => !t.values[i]);
        marks += `<path d="${rr(gx, y1, bw, h, isTop)}" fill="var(${s.color})" class="viz-mark" tabindex="0" ${drillAttr(drillSpecOf(s.drill, b, i, o.range))} data-tip="${esc(`${b.label} · ${s.name} ${fmtN(v)} คัน (รวม ${fmtN(totals[i])})${s.drill ? ' · กดดูรายคัน' : ''}`)}"></path>`;
        acc += v;
      });
    } else series.forEach((s, si) => {
      const v = s.values[i], x = gx + si * (bw + 2);
      marks += `<path d="${rr(x, y(v), bw, Math.max(0, y(0) - y(v)), true)}" fill="var(${s.color})" class="viz-mark" tabindex="0" ${v ? drillAttr(drillSpecOf(s.drill, b, i, o.range)) : ''} data-tip="${esc(`${b.label} · ${s.name} ${fmtN(v)}${o.unit || ''}${s.drill && v ? ' · กดดูรายคัน' : ''}`)}"></path>`;
      if (!v) marks += `<rect x="${x}" y="${y(0) - 1}" width="${bw}" height="1" fill="var(--line)"></rect>`;
    });
  });
  let grid = '';
  for (let v = 0; v <= top; v += step) grid += `<line x1="${padL}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"></line><text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end" class="viz-ax">${fmtN(v)}</text>`;
  const labels = buckets.map((b, i) => `<text x="${padL + i * band + band / 2}" y="${H - 8}" text-anchor="middle" class="viz-ax">${esc(b.label)}</text>`).join('');
  const legend = series.length > 1 ? `<div class="flex flex-wrap gap-4 text-sm mb-1">${series.map(s => `<span class="inline-flex items-center gap-2"><i class="inline-block w-3 h-3 rounded-sm" style="background:var(${s.color})"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
  const table = o.noTable ? '' : `<details class="mt-1"><summary class="text-xs text-muted cursor-pointer">ดูเป็นตาราง</summary><div class="scroll-x"><table class="tbl text-sm mt-1"><thead><tr><th></th>${buckets.map(b => `<th class="text-right">${esc(b.label)}</th>`).join('')}<th class="text-right">รวม</th></tr></thead><tbody>
    ${series.map(s => `<tr><td class="nowrap">${esc(s.name)}</td>${s.values.map((v, i) => `<td class="num text-right">${drillNum(v, s.drill && v ? drillSpecOf(s.drill, buckets[i], i, o.range) : null)}</td>`).join('')}<td class="num text-right font-semibold">${fmtN(s.values.reduce((a, b) => a + b, 0))}</td></tr>`).join('')}</tbody></table></div></details>`;
  return `${legend}<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(o.label || '')}" class="viz">${grid}<line x1="${padL}" x2="${W - 8}" y1="${y(0)}" y2="${y(0)}" stroke="var(--muted)" stroke-width="1"></line>${marks}${labels}</svg>${table}`;
}
// one series, sorted, value at the tip
function barList(rows, color, unit = 'คัน') {
  const max = Math.max(1, ...rows.map(r => r.v));
  return rows.length ? `<div class="flex flex-col gap-2">${rows.map(r => `<div class="grid grid-cols-[110px_1fr] sm:grid-cols-[150px_1fr] gap-3 items-center text-sm ${r.drill ? 'rounded hover:bg-surface-2' : ''}" ${drillAttr(r.drill)} ${r.drill ? 'title="ดูรายคัน"' : ''}>
    <div class="truncate">${esc(r.k)}</div>
    <div class="flex items-center gap-2 min-w-0"><span class="viz-mark block h-3 rounded-r" tabindex="0" data-tip="${esc(`${r.k} ${fmtN(r.v)} ${unit}${r.pct !== undefined ? ` (${r.pct}%)` : ''}`)}" style="width:${Math.max(2, r.v / max * 100)}%;max-width:calc(100% - 64px);background:var(${color})"></span><span class="num text-xs whitespace-nowrap">${fmtN(r.v)}${r.pct !== undefined ? ` · ${r.pct}%` : ''}</span></div></div>`).join('')}</div>` : '<p class="text-sm text-muted">ไม่มีข้อมูลในช่วงนี้</p>';
}
function dashExec(D) {
  const E = execData(D), f = S.filters;
  const salesN = E.sales.length, cashN = E.sales.filter(s => !s.fin).length, finN = salesN - cashN;
  const advInv = E.invoiced.filter(s => s.adv), advSoldN = E.sales.filter(s => s.advFrom).length;
  const advLeft = advInv.filter(s => { const x = advList(D).find(y => y.vin === s.vin); return x && !x.sold; }).length;
  const waitN = invWaitingList(D).length;
  const bookN = E.booked.length, cancelN = E.cancelled.length;
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const series2 = [{ name: 'ไฟแนนซ์', color: '--viz-1', drill: { m: 'sales', fin: 'fin' }, values: E.buckets.map(b => E.count(E.sales, b, s => !!s.fin)) }, { name: 'ซื้อสด', color: '--viz-2', drill: { m: 'sales', fin: 'cash' }, values: E.buckets.map(b => E.count(E.sales, b, s => !s.fin)) }];
  const finRows = Object.entries(E.fin).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v, pct: pct(v, finN), drill: { m: 'sales', fin: k, from: E.from, to: E.to } }));
  const modelRows = Object.entries(E.models).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ k, v, drill: { m: 'sales', model: k === '?' ? 'ไม่ระบุ' : k, from: E.from, to: E.to } }));
  const ai = S.ai.exec && S.ai.exec.key === aiKey(E) ? S.ai.exec : null;
  const card = (title, body, note) => `<section class="bg-surface border border-line rounded-lg p-4 min-w-0"><h2 class="font-head font-semibold mb-2">${title}</h2>${body}${note ? `<p class="text-xs text-muted mt-2">${note}</p>` : ''}</section>`;
  return `${pageHead('สรุปผู้บริหาร', `ยอดขายนับจากการส่งมอบ (ใบกำกับใน DL และที่บันทึกส่งมอบในระบบนี้) แยกจากยอดจอง · ${fmtD(E.from)} – ${fmtD(E.to)}`)}
  ${execSeg()}
  <div class="flex flex-wrap gap-3 items-end mb-4">
    ${periodPicker()}
  </div>
  ${brSeg()}
  ${tiles([
    tile('ยอดขาย (ส่งมอบ)', fmtN(salesN), { drill: { m: 'sales', from: E.from, to: E.to }, hero: true, sub2: `ไฟแนนซ์ ${fmtN(finN)} · สด ${fmtN(cashN)}${advSoldN ? `<span class="block" style="color:var(--warn)">รวมรถ Advance ที่ขายออก ${fmtN(advSoldN)}</span>` : ''}` }),
    tile('ยอดขาย (ใบกำกับภาษี)', fmtN(E.invoiced.length), { drill: { m: 'invoiced', from: E.from, to: E.to }, sub2: (() => { const t = monthsIn(E.from, E.to).reduce((n, m) => n + tgtOf(m), 0); const it = E.invoiced.filter(s => tgtOf(s.date.slice(0, 7)) > 0).length; return t ? `เป้า ${fmtN(t)} · ทำได้ ${pctOf(it, t)}% (เดือนที่มีเป้า)` : 'ยังไม่ได้ใส่เป้า'; })() + (advInv.length ? `<span class="block" style="color:var(--warn)">รวมใบ Advance ${fmtN(advInv.length)} (ยังไม่มีลูกค้า ${fmtN(advLeft)})</span>` : '') }),
    tile('ยอดจอง', fmtN(bookN), { drill: { m: 'bk', from: E.from, to: E.to }, sub2: `ยกเลิก ${fmtN(cancelN)} ใบ (${pct(cancelN, bookN + cancelN)}%)` }),
    tile('สัดส่วนไฟแนนซ์', `${pct(finN, salesN)}%`, { drill: { m: 'sales', fin: 'fin', from: E.from, to: E.to }, sub2: `${finRows[0] ? `มากสุด ${esc(finRows[0].k)} ${finRows[0].pct}%` : '–'}` }),
    tile('ใบจองรอรถตอนนี้', fmtN(D.bookings.filter(b => b.state === 'waiting' && inBr(b)).length), { drill: { m: 'wait' } }),
    tile('รถว่างขายได้ตอนนี้', fmtN([...D.cars.values()].filter(c => inBr(c) && (c.status === 'free' || c.status === 'temp')).length), { drill: { m: 'free' }, tone: 'good' })
  ], 'lg:grid-cols-6')}
  ${waitN || advInv.length ? `<div class="-mt-2 mb-5 text-sm"><button class="underline decoration-dotted" data-act="adv-sum">ดูรถออกใบกำกับแล้ว ยังไม่ส่งมอบ ${fmtN(waitN)} คัน และสรุปรถ Advance ›</button></div>` : ''}
  <div class="grid lg:grid-cols-2 gap-5 mb-5">
    <div class="lg:col-span-2">${card('เป้า เทียบ ยอดขาย (ใบกำกับภาษี)', tgtChart(E, 'c1t'), 'ใบกำกับภาษี = ยอดที่แจ้งขายกับฮอนด้า นับตามวันที่ออกใบกำกับใน DL (ไม่รวมรถบริษัท) · เป้าใส่ที่แท็บ ยอดขายและเป้า')}</div>
    ${card('ยอดจอง เทียบ ยอดขาย (ส่งมอบ)', bookDelivChart(E, 'c1'), `ส่งมอบ = รถที่ปล่อยให้ลูกค้าจริง นับตามวันที่ส่งมอบ${E.dlAsof ? ` · ข้อมูล DL ถึง ${fmtD(E.dlAsof)} หลังจากนั้นนับจากที่เซลล์บันทึกในระบบนี้` : ''}`)}
    ${card('ยอดขาย แยกไฟแนนซ์ / สด', colChart('c2', E.buckets, series2, { range: [E.from, E.to], stacked: true, label: 'ยอดขายแยกไฟแนนซ์และสด' }))}
    ${card(`แยกบริษัทไฟแนนซ์ <span class="text-muted text-sm font-normal">${fmtN(finN)} คัน</span>`, barList(finRows, '--viz-1'))}
    ${card('รุ่นที่ขายมากสุด', barList(modelRows, '--viz-1'))}
  </div>
  <div class="mb-5">${tradeCard(E, card, pct)}</div>
  <div class="flex flex-col gap-5 mb-5">${branchCompare(D, E, 'exec', 'inv')}</div>
  ${card('แยกตามสาขาที่ออกรถ', `<div class="scroll-x"><table class="tbl"><thead><tr><th>สาขา</th><th class="text-right">ใบกำกับภาษี</th><th class="text-right">ยอดขาย (ส่งมอบ)</th><th class="text-right">ไฟแนนซ์</th><th class="text-right">สด</th><th class="text-right">ยอดจอง</th><th class="text-right">ยกเลิก</th><th class="text-right">รอรถตอนนี้</th><th class="text-right">รถว่างตอนนี้</th></tr></thead><tbody>
    ${E.byBr.map(r => `<tr><td><b>${r.br}</b> <span class="text-xs text-muted">${BR[r.br].name}</span></td><td class="num text-right">${drillNum(r.inv, { m: 'invoiced', br: r.br, from: E.from, to: E.to })}</td><td class="num text-right font-semibold">${drillNum(r.sales, { m: 'sales', br: r.br, from: E.from, to: E.to })}</td><td class="num text-right">${drillNum(r.sales - r.cash, { m: 'sales', fin: 'fin', br: r.br, from: E.from, to: E.to })}</td><td class="num text-right">${drillNum(r.cash, { m: 'sales', fin: 'cash', br: r.br, from: E.from, to: E.to })}</td><td class="num text-right">${drillNum(r.booked, { m: 'bk', br: r.br, from: E.from, to: E.to })}</td><td class="num text-right">${drillNum(r.cancel, { m: 'cx', br: r.br, from: E.from, to: E.to })}</td><td class="num text-right">${drillNum(r.waiting, { m: 'wait', br: r.br })}</td><td class="num text-right">${drillNum(r.free, { m: 'free', br: r.br })}</td></tr>`).join('')}</tbody></table></div>`,
    'ยอดขายนับให้สาขาที่ออกรถ ค่าคอมนับตามเซลล์เจ้าของเคส · ยอดจองนับจากฟอร์ม AT Honda ตามวันที่จอง')}
  <div class="mt-5">${card('AI วิเคราะห์', `${ai && ai.state === 'done' ? `<div class="text-sm" style="white-space:pre-line">${esc(ai.text)}</div>` : ai && ai.state === 'error' ? `<p class="text-sm" style="color:var(--bad)">${esc(ai.msg)}</p>` : '<p class="text-sm text-muted">ให้ Claude อ่านตัวเลขในหน้านี้ แล้วสรุปแนวโน้ม จุดที่ควรระวัง และสิ่งที่ควรทำต่อ</p>'}
    <div class="mt-3"><button class="btn btn-dark btn-sm" data-act="exec-ai" ${ai && ai.state === 'running' ? 'disabled' : ''}>${ai && ai.state === 'running' ? '<span class="spin"></span> กำลังวิเคราะห์…' : ai && ai.state === 'done' ? 'วิเคราะห์ใหม่' : 'ให้ AI วิเคราะห์'}</button></div>`,
    'AI อ่านเฉพาะตัวเลขสรุปในหน้านี้ ไม่ส่งชื่อลูกค้า ตรวจตัวเลขกับตารางก่อนใช้ในรายงาน')}</div>`;
}
function tradeCard(E, card, pct) {
  const sv = E.buckets.map(b => E.count(E.sales, b)), tv = E.buckets.map(b => E.count(E.trades, b));
  const chart = colChart('c3', E.buckets, [{ name: 'ยอดขาย (ส่งมอบ)', color: '--viz-2', values: sv, drill: { m: 'sales' } }, { name: 'มีรถเก่าเทิร์น', color: '--viz-1', values: tv, drill: { m: 'trades' } }], { range: [E.from, E.to], label: 'ยอดขายเทียบรถเก่าเทิร์น' });
  const pr = `<div class="scroll-x"><table class="tbl text-sm mt-2"><thead><tr><th></th>${E.buckets.map(b => `<th class="text-right">${esc(b.label)}</th>`).join('')}<th class="text-right">รวม</th></tr></thead><tbody>
    <tr><td class="nowrap">% มีรถเก่า</td>${sv.map((s, i) => `<td class="num text-right">${s ? pct(tv[i], s) + '%' : '–'}</td>`).join('')}<td class="num text-right font-semibold">${E.sales.length ? pct(E.trades.length, E.sales.length) + '%' : '–'}</td></tr></tbody></table></div>`;
  const tot = E.trades.reduce((n, t) => n + (Number(t.price) || 0), 0);
  const list = E.trades.length ? `<details class="mt-2"><summary class="text-sm cursor-pointer">รายการรถเก่า ${fmtN(E.trades.length)} คัน · ตีราคารวม ${money(tot)} บาท</summary><div class="scroll-x"><table class="tbl text-sm mt-1"><thead><tr><th>วันที่</th><th>สาขา</th><th>รถเก่า</th><th class="text-right">ราคารับซื้อ</th><th>รถใหม่</th><th>เซลล์</th><th></th></tr></thead><tbody>
    ${E.trades.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(t => `<tr><td class="num nowrap">${fmtD(t.date)}</td><td>${esc(t.br || '')}</td><td>${esc(t.brand)} ${esc(t.model)} ${t.year || ''}</td><td class="num text-right">${money(t.price)}</td><td>${esc(t.newModel || '')}</td><td>${esc(t.sales || '')}</td><td><button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(t.id)}">เปิด</button></td></tr>`).join('')}</tbody></table></div></details>` : '';
  return card(`ยอดขาย เทียบ ลูกค้ามีรถเก่าเทิร์น <span class="text-muted text-sm font-normal">${fmtN(E.trades.length)} คัน · ${E.sales.length ? pct(E.trades.length, E.sales.length) : 0}%</span>`, chart + pr + list, 'รถเก่าบันทึกตอนชำระดาวน์ในขั้นตอนส่งมอบ นับในเดือนที่ส่งมอบ · ยอดขายรวม DL ซึ่งไม่มีข้อมูลรถเก่า % จึงนับเฉพาะที่บันทึกในระบบนี้');
}
const aiKey = E => `${E.key}|${E.from}|${E.to}|${S.br || 'all'}|${E.sales.length}|${E.booked.length}`;
function execSummary(D, E) {
  return {
    ช่วงเวลา: `${E.from} ถึง ${E.to}`, สาขา: S.br || 'ทุกสาขา', ข้อมูลDLถึง: E.dlAsof,
    รายช่วง: E.buckets.map(b => ({ ช่วง: b.label, ยอดจอง: E.count(E.booked, b), ยอดขายใบกำกับภาษี: E.count(E.invoiced, b), ยอดขาย: E.count(E.sales, b), ไฟแนนซ์: E.count(E.sales, b, s => !!s.fin), สด: E.count(E.sales, b, s => !s.fin) })),
    ยอดขายรวม: E.sales.length, ยอดขายใบกำกับภาษีรวม: E.invoiced.length, ยอดจองรวม: E.booked.length, ยกเลิก: E.cancelled.length,
    บริษัทไฟแนนซ์: E.fin, รุ่นขายดี: Object.fromEntries(Object.entries(E.models).sort((a, b) => b[1] - a[1]).slice(0, 8)),
    แยกสาขา: E.byBr,
    สเปกรถไม่พอคิว: Object.values(D.specs).filter(s => s.low).slice(0, 8).map(s => ({ สเปก: specLabelText(s.key), รอรถ: s.waiting, ว่าง: s.free, quotaว่าง: s.incoming }))
  };
}
const EXEC_PROMPT = data => `You are a sales analyst for AT Honda, a Honda dealer group in Thailand with 4 branches (PSC ภาษีเจริญ, ATE เอกชัย-บางบอน, SPH สามพราน, KPA กำแพงแสน).
"ยอดขาย" means cars delivered (by delivery date); "ยอดขายใบกำกับภาษี" means tax invoices issued (by invoice date, may be before delivery); "ยอดจอง" means bookings by booking date. Delivery data from the DL file may stop before the end of the period (see ข้อมูลDLถึง); say so if the last period looks low because of it.
Use ONLY the numbers in the data below. Do not invent figures, names or causes you cannot see in the data.
Write in Thai, short and practical, for the company executive, in this plain-text format:
สรุป:
(2-3 sentences)
จุดที่น่าสนใจ:
- (3-5 bullets with numbers)
สิ่งที่ควรระวัง:
- (2-3 bullets)
ข้อเสนอสิ่งที่ควรทำ:
- (3 bullets, concrete)

DATA (JSON):
${JSON.stringify(data)}`;
// one tooltip for every chart mark: follows the pointer, also shows on keyboard focus
(function vizTip() {
  let tip = null;
  const show = (el, x, y) => {
    if (!tip) { tip = document.createElement('div'); tip.id = 'viz-tip'; tip.setAttribute('role', 'status'); document.body.appendChild(tip); }
    tip.textContent = el.dataset.tip; tip.style.display = 'block';
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + 'px';
    tip.style.top = Math.max(8, y - h - 12) + 'px';
  };
  const hide = () => { if (tip) tip.style.display = 'none'; };
  document.addEventListener('pointermove', ev => { const el = ev.target.closest && ev.target.closest('.viz-mark[data-tip]'); if (el) show(el, ev.clientX, ev.clientY); else hide(); });
  document.addEventListener('focusin', ev => { const el = ev.target.closest && ev.target.closest('.viz-mark[data-tip]'); if (el) { const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.top); } });
  document.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, true);
  // touch: the first tap on a bar shows its numbers, the second tap on the same bar opens the list
  // (a mouse already sees the numbers on hover, so one click opens the list)
  let pType = 'mouse', armed = null;
  document.addEventListener('pointerdown', ev => { pType = ev.pointerType || 'mouse'; }, true);
  document.addEventListener('click', ev => {
    const mark = ev.target.closest && ev.target.closest('.viz-mark[data-tip]');
    const drillEl = ev.target.closest && ev.target.closest('[data-act="drill"]');
    if (!mark || !drillEl || pType === 'mouse') { armed = null; return; }
    if (armed === drillEl) { armed = null; hide(); return; }
    ev.preventDefault(); ev.stopImmediatePropagation();
    armed = drillEl;
    const r = mark.getBoundingClientRect();
    show(mark, r.left + r.width / 2, r.top);
    tip.textContent = mark.dataset.tip.replace(/ · กดดูรายคัน$/, '') + ' · แตะอีกครั้งเพื่อดูรายละเอียด';
  }, true);
})();
