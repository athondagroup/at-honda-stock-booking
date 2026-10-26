// ---------- แผนสั่งรถ (26/10, preview): open bookings against free stock and cars on the way, per spec and branch,
// to plan what to order. Managers and the executive only. Counts real waiting bookings (state "waiting").
const PLAN = { open: new Set(), itm: new Set() };
const planBy = () => S.filters.pBy || 'spec';
function planCalc(D) {
  const cells = new Map();
  const C = (sp, br) => { const k = sp + '#' + br; if (!cells.has(k)) cells.set(k, { sp, br, booked: 0, has: 0, wait: 0, free: 0, inc: 0, age: 0, bks: [], cars: [] }); return cells.get(k); };
  for (const b of D.bookings) {
    if (b.state === 'cancel' || !inBr(b) || !b.spec) continue;
    const car = b.vin ? D.cars.get(b.vin) : null, inv = b.vin ? D.invByVin.get(b.vin) : null;
    if ((inv && !inv.company) || (car && ['delivered', 'invoiced', 'sold'].includes(car.status))) continue;   // already handed over
    const c = C(b.spec, b.br); c.booked++;
    if (b.state === 'waiting') { c.wait++; c.bks.push(b); } else c.has++;
  }
  for (const car of D.cars.values()) {
    if ((car.status !== 'free' && car.status !== 'temp') || !inBr(car)) continue;
    const c = C(car.spec, car.br); c.free++; c.cars.push(car); if ((car.age ?? -1) > c.age) c.age = car.age;
  }
  for (const q of D.quota) if (q.open && inBr(q) && q.spec) C(q.spec, q.br).inc += q.qty || 1;
  const list = [...cells.values()];
  for (const c of list) {
    c.bks.sort((x, y) => (x.pos || 0) - (y.pos || 0) || String(x.date || '').localeCompare(String(y.date || '')));
    c.cars.sort((x, y) => (y.age ?? -1) - (x.age ?? -1));
    c.match = Math.min(c.wait, c.free); c.short = Math.max(0, c.wait - c.match - c.inc); c.spare = Math.max(0, c.free - c.wait);
    c.model = c.sp.split('|')[0]; c.grade = c.sp.split('|')[1];
    c.bks.forEach((b, i) => { b.planSt = i < c.match ? 'now' : i < c.match + c.inc ? 'inc' : 'order'; });
  }
  // suggestions: move cars between branches, offer another colour, old stock nobody waits for
  const left = new Map(list.map(c => [c, { short: c.short, spare: c.spare }]));
  const transfers = [], alts = [];
  for (const a of list.filter(c => c.short > 0)) for (const b of list.filter(c => c.sp === a.sp && c.br !== a.br && left.get(c).spare > 0)) {
    const n = Math.min(left.get(a).short, left.get(b).spare); if (n <= 0) continue;
    left.get(a).short -= n; left.get(b).spare -= n; transfers.push({ sp: a.sp, from: b, to: a, n });
  }
  for (const a of list.filter(c => left.get(c).short > 0)) for (const b of list.filter(c => c.br === a.br && c.model === a.model && c.grade === a.grade && c.sp !== a.sp && left.get(c).spare > 0)) {
    const n = Math.min(left.get(a).short, left.get(b).spare); if (n <= 0) continue;
    left.get(a).short -= n; left.get(b).spare -= n; alts.push({ want: a, have: b, n });
  }
  const oldBy = {};
  for (const c of list.filter(c => c.spare > 0)) { const o = (oldBy[c.sp] ||= { sp: c.sp, n: 0, age: 0, cells: [], wait: 0 }); o.n += c.spare; o.age = Math.max(o.age, c.age); o.cells.push(c); }
  list.forEach(c => { if (oldBy[c.sp]) oldBy[c.sp].wait += c.wait; });
  const olds = Object.values(oldBy).sort((x, y) => (y.age - x.age) || (y.n - x.n));
  // rows (per spec or per model)
  const by = planBy(), rows = {};
  for (const c of list) {
    const k = by === 'model' ? c.model : c.sp, r = (rows[k] ||= { k, label: by === 'model' ? c.model : specLabel(c.sp), cells: [], booked: 0, has: 0, wait: 0, match: 0, free: 0, inc: 0, short: 0, spare: 0, age: 0 });
    r.cells.push(c); for (const f of ['booked', 'has', 'wait', 'match', 'free', 'inc', 'short', 'spare']) r[f] += c[f]; r.age = Math.max(r.age, c.age);
  }
  const arr = Object.values(rows).filter(r => r.booked || r.free || r.inc).sort((x, y) => (y.short - x.short) || (y.wait - x.wait) || (y.free - x.free));
  const tot = arr.reduce((t, r) => { for (const f of ['booked', 'has', 'wait', 'match', 'free', 'inc', 'short', 'spare']) t[f] += r[f]; return t; }, { booked: 0, has: 0, wait: 0, match: 0, free: 0, inc: 0, short: 0, spare: 0 });
  return { list, rows: arr, tot, transfers, alts, olds };
}
const planSt = r => r.short > 0 ? chip('ต้องสั่ง', 'bad') : r.spare > 2 ? chip('stock เกิน', 'warn') : chip('พอดี', 'good');
const bkSt = { now: ['จับคู่ stock ได้ทันที', 'good'], inc: ['รอรถที่กำลังมา', 'warn'], order: ['ต้องสั่ง', 'bad'] };
const planBkTable = (bks, showSpec, tagFn) => bks.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>เลขที่ใบจอง</th><th>สาขา</th><th>ลูกค้า</th><th>เซลล์</th>${showSpec ? '<th>สเปก</th>' : ''}<th>วันที่จอง</th><th class="text-right">รอมา</th><th>สถานะ</th><th></th></tr></thead><tbody>
  ${bks.map(b => `<tr><td class="nowrap">${b.no ? esc(b.no) : '<span class="text-muted">ยังไม่มีเลขที่</span>'}</td><td>${b.br}</td><td>${esc(b.cust || '')}</td><td class="nowrap">${esc(b.owner || b.sales || '')}</td>${showSpec ? `<td class="nowrap">${specLabel(b.spec)}</td>` : ''}
  <td class="num nowrap">${fmtD(b.date)}</td><td class="num text-right nowrap">${b.date ? daysBetween(b.date, todayISO()) : '–'} วัน</td><td>${tagFn ? tagFn(b) : chip(...bkSt[b.planSt || 'order'])}</td>
  <td class="text-right">${b.app && (!isSales() || isMine(b.owner)) ? `<button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(b.app.id)}">เปิดใบจอง</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-sm text-muted">ไม่มี</p>';
const planCarTable = (cars, showSpec, tagFn) => cars.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>เลขตัวถัง</th><th>สาขา</th>${showSpec ? '<th>สเปก</th>' : ''}<th class="text-right">อายุรถ</th><th>สถานะ</th></tr></thead><tbody>
  ${cars.map(c => `<tr><td class="code nowrap">${esc(c.vin)}</td><td>${c.br}</td>${showSpec ? `<td class="nowrap">${specLabel(c.spec)}</td>` : ''}<td class="num text-right nowrap">${c.age ?? '–'} วัน</td><td>${tagFn ? tagFn(c) : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-sm text-muted">ไม่มี</p>';
function planDetail(r, by) {
  const bks = r.cells.flatMap(c => c.bks), cars = r.cells.flatMap(c => c.cars);
  const used = new Set(r.cells.flatMap(c => c.cars.slice(0, c.wait).map(x => x.vin)));
  const model = r.cells[0].model;
  return `<div class="p-3 flex flex-col gap-3" style="background:var(--surface-2)">
    <div><div class="font-medium mb-1">ใบจองที่รอรถจริง ${bks.length} ใบ <span class="text-xs text-muted">เรียงตามคิว (วันที่จอง)</span></div>${planBkTable(bks, by === 'model')}</div>
    <div><div class="font-medium mb-1">รถว่างตรงสเปกใน stock ${cars.length} คัน</div>${planCarTable(cars, by === 'model', c => used.has(c.vin) ? chip('มีใบจองรอ', 'good') : chip('ไม่มีใบจองรอ', 'warn'))}</div>
    <div><button class="btn btn-ghost btn-sm" data-act="plan-queue" data-model="${esc(model)}">ดูคิวทั้งหมดของรุ่นนี้ในหน้าคิวรอรถ</button></div></div>`;
}
function planItem(key, head, body) {
  const on = PLAN.itm.has(key);
  return `<div class="border-b border-line last:border-0"><button class="w-full text-left flex items-start gap-3 px-3 py-2 hover:bg-surface2" data-act="plan-itm" data-k="${esc(key)}" aria-expanded="${on}"><span class="flex-1 min-w-0 text-sm">${head}</span><span class="text-muted">${on ? '▾' : '▸'}</span></button>${on ? `<div class="p-3 flex flex-col gap-3" style="background:var(--surface-2)">${body}</div>` : ''}</div>`;
}
function planView(D) {
  const P = planCalc(D), t = P.tot, pct = t.booked ? Math.round(t.has / t.booked * 100) : 0, by = planBy(), open = PLAN.open;
  const tiles5 = tiles([tile('ใบจองค้างส่งมอบ', fmtN(t.booked)), tile('มีรถแล้ว (match stock)', fmtN(t.has), { tone: 'good', sub2: `${pct}% ของใบจองค้าง` }), tile('ยังรอรถ', fmtN(t.wait), { tone: t.wait ? 'warn' : '', sub2: 'ใบจองรอจริง' }),
    tile('รถว่างใน stock', fmtN(t.free), { sub2: `จับคู่ใบจองรอได้ทันที ${fmtN(t.match)} คัน` }), tile('รถที่กำลังมา', fmtN(t.inc), { sub2: 'Quota ที่ยังว่าง' }), tile('ควรสั่งเพิ่ม', fmtN(t.short), { tone: t.short ? 'bad' : 'good', sub2: 'หลังหักรถว่างและรถกำลังมา' })], 'lg:grid-cols-6');
  const row = r => { const p = r.booked ? Math.round(r.has / r.booked * 100) : 0, on = open.has(r.k);
    return `<tr class="cursor-pointer hover:bg-surface2" data-act="plan-row" data-k="${esc(r.k)}" tabindex="0" aria-expanded="${on}"><td class="font-medium" style="min-width:170px">${on ? '▾' : '▸'} ${r.label}</td><td class="num text-right">${r.booked}</td><td class="num text-right">${r.has}</td>
      <td class="text-right nowrap"><span class="inline-block align-middle mr-1" style="width:60px;height:7px;background:var(--line);border-radius:9px;overflow:hidden"><span style="display:block;height:100%;width:${p}%;background:var(--good)"></span></span><span class="num">${p}%</span></td>
      <td class="num text-right">${r.wait || '–'}</td><td class="num text-right">${r.match || '–'}</td><td class="num text-right">${r.free || '–'}</td><td class="num text-right">${r.inc || '–'}</td>
      <td class="num text-right font-semibold" style="${r.short ? 'color:var(--bad)' : ''}">${r.short || '–'}</td><td class="num text-right nowrap">${r.age ? r.age + ' วัน' : '–'}</td><td>${planSt(r)}</td></tr>${on ? `<tr><td colspan="11" style="padding:0">${planDetail(r, by)}</td></tr>` : ''}`; };
  const trf = P.transfers.map((x, i) => planItem('t' + i + x.sp + x.from.br + x.to.br,
    `<b>${specLabel(x.sp)}</b> · <b>${x.from.br}</b> → <b>${x.to.br}</b> · โอน <b>${x.n}</b> คัน <span class="text-muted">(รถ ${x.from.br} อายุ ${x.from.age || '–'} วัน)</span>`,
    `<div><div class="font-medium mb-1">รถที่ ${x.from.br} โอนให้ได้</div>${planCarTable(x.from.cars.slice(x.from.wait, x.from.wait + x.n), false, () => chip('ว่างเกินใบจองรอ', 'warn'))}</div>
     <div><div class="font-medium mb-1">ใบจองที่ ${x.to.br} ที่จะได้รถ</div>${planBkTable(x.to.bks.filter(b => b.planSt === 'order').slice(0, x.n), false, () => chip('ได้รถจากการโอน', 'good'))}</div>
     <p class="text-xs text-muted">โอนแล้วสาขา ${x.to.br} ไม่ต้องสั่งเพิ่มในจำนวนนี้ · ผู้จัดการทั้งสองสาขาต้องยืนยันก่อนโอนรถ</p>`)).join('');
  const alts = P.alts.map((x, i) => planItem('a' + i + x.want.sp + x.have.sp + x.want.br,
    `<b>${specLabel(x.want.sp)}</b> รอ ${x.want.wait} คัน (${x.want.br}) · มีสีอื่นว่าง ${x.n} คัน <span style="color:var(--red)">→</span> เสนอเปลี่ยนเป็น <b>${esc(x.have.sp.split('|')[2] || '')}</b>`,
    `<div><div class="font-medium mb-1">ใบจองที่รออยู่ (เสนอเปลี่ยนสีได้ ${x.n} ใบแรกที่ต้องสั่ง)</div>${planBkTable(x.want.bks.filter(b => b.planSt === 'order').slice(0, Math.max(x.n, 1)), false, () => chip('เสนอเปลี่ยนสี', 'warn'))}</div>
     <div><div class="font-medium mb-1">รถสีอื่นที่ว่าง (รุ่นและเกรดเดียวกัน)</div>${planCarTable(x.have.cars.slice(x.have.wait, x.have.wait + x.n), true, () => chip('เสนอให้ลูกค้า', 'good'))}</div>`)).join('');
  const olds = P.olds.slice(0, 12).map((o, i) => planItem('o' + i + o.sp,
    `<b>${specLabel(o.sp)}</b> · ว่างเกินใบจองรอ ${o.n} คัน · อายุสูงสุด ${o.age || '–'} วัน${o.wait ? '' : ' · <span style="color:var(--warn)">ไม่มีใบจองรอเลย</span>'}`,
    `${planCarTable(o.cells.flatMap(c => c.cars.slice(c.wait)), false, () => chip('ไม่มีใบจองรอ', 'warn'))}<p class="text-xs text-muted">${o.wait ? 'มีใบจองรอบางส่วน แต่ stock มากกว่า' : 'ไม่มีใบจองรอสเปกนี้'} · ควรเร่งขายหรืองดสั่งเพิ่ม</p>`)).join('');
  const card = (title, sub, body, empty) => `<section class="bg-surface border border-line rounded-lg mb-4 min-w-0"><div class="px-3 pt-3"><h2 class="font-head text-lg font-semibold">${title}</h2><p class="text-sm text-muted mb-2">${sub}</p></div>${body || `<p class="px-3 pb-3 text-sm text-muted">${empty}</p>`}</section>`;
  return `<div class="flex flex-wrap gap-3 items-end mb-3"><div class="field"><label for="p-by">จัดกลุ่ม</label><select id="p-by" data-filter="pBy"><option value="spec" ${by === 'spec' ? 'selected' : ''}>ตามรุ่น / เกรด / สี</option><option value="model" ${by === 'model' ? 'selected' : ''}>ตามรุ่น</option></select></div>
    <button class="btn btn-ghost" data-act="plan-xlsx">ดาวน์โหลด Excel</button></div>
  ${tiles5}
  <section class="min-w-0 mb-6"><h2 class="font-head text-lg font-semibold">รถแต่ละ${by === 'model' ? 'รุ่น' : 'สเปก'}</h2><p class="text-sm text-muted mb-2">เรียงจากที่ต้องสั่งเพิ่มมากที่สุด · สั่งเพิ่ม = ใบจองที่รอรถจริง − รถว่างตรงสเปก (สาขาเดียวกัน) − รถที่กำลังมา · กดที่แถวเพื่อดูรายชื่อใบจองและรถ</p>
  ${P.rows.length ? `<div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl"><thead><tr><th>${by === 'model' ? 'รุ่น' : 'รุ่น / เกรด / สี'}</th><th class="text-right">ใบจองค้าง</th><th class="text-right">มีรถแล้ว</th><th class="text-right">% มีรถ</th><th class="text-right">รอรถ</th><th class="text-right">จับคู่ได้ทันที</th><th class="text-right">stock ว่าง</th><th class="text-right">กำลังมา</th><th class="text-right">สั่งเพิ่ม</th><th class="text-right">อายุ stock สูงสุด</th><th>สถานะ</th></tr></thead>
  <tbody>${P.rows.map(row).join('')}<tr style="font-weight:600"><td>รวม</td><td class="num text-right">${t.booked}</td><td class="num text-right">${t.has}</td><td class="num text-right">${pct}%</td><td class="num text-right">${t.wait}</td><td class="num text-right">${t.match}</td><td class="num text-right">${t.free}</td><td class="num text-right">${t.inc}</td><td class="num text-right" style="color:var(--bad)">${t.short}</td><td></td><td></td></tr></tbody></table></div>`
    : `<div class="bg-surface border border-line rounded-lg">${emptyBox('ยังไม่มีข้อมูล', 'ลองเปลี่ยนสาขา')}</div>`}</section>
  ${card('แนะนำโอนรถข้ามสาขา', 'สาขาหนึ่งขาด แต่อีกสาขามีรถว่างสเปกเดียวกัน โอนแล้วไม่ต้องสั่งเพิ่ม · กดดูรายละเอียด', trf, 'ไม่มีรถที่ต้องโอนข้ามสาขา')}
  <div class="grid lg:grid-cols-2 gap-x-4">${card('รอรถสีนี้ แต่มี stock สีอื่นของรุ่นเดียวกัน', 'ถ้าลูกค้ายอมเปลี่ยนสี จะส่งมอบได้เร็วขึ้นและไม่ต้องสั่งเพิ่ม', alts, 'ไม่มีกรณีที่เปลี่ยนสีแล้วช่วยได้')}
  ${card('stock ที่ไม่มีใบจองรอ', 'รถว่างเกินใบจองที่รอ เรียงตามอายุรถ ควรเร่งขายหรืองดสั่งสเปกนี้', olds, 'ไม่มีรถว่างเกินใบจอง')}</div>
  <p class="text-xs text-muted">นับใบจองที่ยังไม่ส่งมอบ ไม่รวมรอยกเลิก · "มีรถแล้ว" = IDS จัดสรร ล็อก จับคู่ Quota แล้ว · รถว่าง = ว่างหรือจองชั่วคราว คิดแยกรายสาขา</p>`;
}
// Excel: 4 sheets, the same numbers as the page
async function planXlsx() {
  let X; try { X = await loadXLSX(); } catch (e) { toast('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ ลองอีกครั้ง', 'bad'); return; }
  const D = derive(), P = planCalc(D), today = todayISO();
  const cells = P.list.filter(c => c.booked || c.free || c.inc).sort((a, b) => a.br.localeCompare(b.br) || a.sp.localeCompare(b.sp));
  const H1 = ['สาขา', 'รุ่น', 'เกรด', 'สี', 'ใบจองค้างส่งมอบ', 'มีรถแล้ว', '% มีรถ', 'รอรถ (ใบจองรอจริง)', 'จับคู่ stock ได้ทันที', 'stock ว่าง', 'รถกำลังมา', 'ควรสั่งเพิ่ม', 'stock เกินใบจอง', 'อายุ stock สูงสุด (วัน)', 'สถานะ'];
  const a1 = [['แผนสั่งรถ AT Honda · ' + fmtD(today)], [], H1];
  cells.forEach(c => { const [m, g, col] = c.sp.split('|'); a1.push([c.br, m, gradeShort(m, g) || g, col, c.booked, c.has, c.booked ? c.has / c.booked : 0, c.wait, c.match, c.free, c.inc, c.short, c.spare, c.age || '', c.short > 0 ? 'ต้องสั่ง' : c.spare > 2 ? 'stock เกิน' : 'พอดี']); });
  const n1 = a1.length;
  a1.push(['รวม', '', '', '', ...[4, 5].map(i => a1.slice(3).reduce((s, r) => s + (r[i] || 0), 0)), '', ...[7, 8, 9, 10, 11, 12].map(i => a1.slice(3, n1).reduce((s, r) => s + (r[i] || 0), 0))]);
  const tr = a1[a1.length - 1]; tr[6] = tr[4] ? tr[5] / tr[4] : 0;
  const bks = P.list.flatMap(c => c.bks).sort((a, b) => a.br.localeCompare(b.br) || String(a.date || '').localeCompare(String(b.date || '')));
  const a2 = [['เลขที่ใบจอง', 'สาขา', 'ลูกค้า', 'เซลล์', 'รุ่น', 'เกรด', 'สี', 'วันที่จอง', 'รอมา (วัน)', 'คิวที่', 'สถานะการจับคู่']];
  bks.forEach(b => { const [m, g, col] = b.spec.split('|'); a2.push([b.no || '', b.br, b.cust || '', b.owner || b.sales || '', m, gradeShort(m, g) || g, col, b.date || '', b.date ? daysBetween(b.date, today) : '', b.pos || '', bkSt[b.planSt || 'order'][0]]); });
  const a3 = [['เลขตัวถัง', 'สาขา', 'รุ่น', 'เกรด', 'สี', 'อายุรถ (วัน)', 'สถานะ']];
  P.list.forEach(c => c.cars.forEach((car, i) => { const [m, g, col] = c.sp.split('|'); a3.push([car.vin, c.br, m, gradeShort(m, g) || g, col, car.age ?? '', i < c.wait ? 'มีใบจองรอ' : 'ไม่มีใบจองรอ']); }));
  const a4 = [['ประเภท', 'สเปก', 'จาก', 'ไป', 'จำนวน (คัน)', 'หมายเหตุ']];
  P.transfers.forEach(x => a4.push(['โอนรถข้ามสาขา', specLabelText(x.sp), x.from.br, x.to.br, x.n, `${x.from.br} ว่างเกินใบจอง (อายุ ${x.from.age || '–'} วัน) · ${x.to.br} ขาด`]));
  P.alts.forEach(x => a4.push(['เสนอเปลี่ยนสี', `${specLabelText(x.want.sp)} → สี ${x.have.sp.split('|')[2]}`, x.have.br, x.want.br, x.n, `รอสีเดิม ${x.want.wait} คัน แต่มีสีอื่นของรุ่นและเกรดเดียวกันว่าง`]));
  P.olds.forEach(o => a4.push(['stock ที่ไม่มีใบจองรอ', specLabelText(o.sp), o.cells.map(c => c.br).join('/'), '', o.n, `อายุสูงสุด ${o.age || '–'} วัน${o.wait ? '' : ' · ไม่มีใบจองรอเลย ควรงดสั่ง'}`]));
  const wb = X.utils.book_new();
  [['สรุปแผนสั่งรถ', a1, 2], ['ใบจองรอรถ', a2, 0], ['รถว่างใน stock', a3, 0], ['คำแนะนำ', a4, 0]].forEach(([nm, aoa, hr]) => {
    const ws = X.utils.aoa_to_sheet(aoa); const h = aoa[hr] || [];
    ws['!cols'] = h.map((x, i) => ({ wch: Math.min(34, Math.max(String(x).length + 3, ...aoa.slice(hr + 1, 120).map(r => String(r[i] ?? '').length + 1))) }));
    if (nm === 'สรุปแผนสั่งรถ') {   // computed columns as formulas so the sheet stays live when numbers are edited
      for (let r = 3; r < n1; r++) { const x = r + 1; const set = (c, f, v) => { ws[c + x] = { t: typeof v === 'number' ? 'n' : 's', v, f }; };
        set('G', `IF(E${x}=0,0,F${x}/E${x})`, aoa[r][6]); set('I', `MIN(H${x},J${x})`, aoa[r][8]); set('L', `MAX(0,H${x}-I${x}-K${x})`, aoa[r][11]); set('M', `MAX(0,J${x}-H${x})`, aoa[r][12]); ws['G' + x].z = '0%'; }
      const x = n1 + 1; ['E', 'F', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(c => { ws[c + x] = { t: 'n', v: aoa[n1][c.charCodeAt(0) - 65], f: `SUM(${c}4:${c}${n1})` }; }); ws['G' + x] = { t: 'n', v: aoa[n1][6], f: `IF(E${x}=0,0,F${x}/E${x})`, z: '0%' };
    }
    X.utils.book_append_sheet(wb, ws, nm);
  });
  const buf = X.write(wb, { type: 'array', bookType: 'xlsx' });
  await docSave(docName('แผนสั่งรถ', S.br || 'ทุกสาขา', today) + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
Object.assign(ACTIONS, {
  'plan-row'(el) { const k = el.dataset.k; PLAN.open.has(k) ? PLAN.open.delete(k) : PLAN.open.add(k); render(); },
  'plan-itm'(el) { const k = el.dataset.k; PLAN.itm.has(k) ? PLAN.itm.delete(k) : PLAN.itm.add(k); render(); },
  'plan-xlsx'() { planXlsx(); },
  'plan-queue'(el) { S.filters.qModel = el.dataset.model; S.sub.book = 'queue'; render(); }
});
