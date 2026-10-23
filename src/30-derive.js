// ------------------------------------------------------------------ derived model
const LOCK_DAYS_BY = { booking: 15, temp: 7, dealer: 15 };
const UNDO_HOURS = 24;          // a mis-pressed lock action can be reversed for this long
const FIN_GRACE = 1;          // days after the 15th day before a finance lock goes to the manager
const MGR_GRACE = 1;          // days after a 15-day lock ends that the manager has to extend it; then the queue is released
const AT_TO_IDS_DAYS = 3;     // AT form not in IDS this many days after booking → alert
const MGR_BR = { aum: MGR_OF.aum, nuch: MGR_OF.nuch, exec: BRS };
// "บริษัท เอที ฮอนด้า ออโตโมบิล (สามพราน) จำกัด" → SPH; anything else → null
function atBranchOf(name) {
  const t = String(name || '').replace(/\s+/g, ' ');
  if (!/เอที ?ฮอนด้า/.test(t)) return null;
  const w = [['ภาษีเจริญ', 'PSC'], ['เอกชัย', 'ATE'], ['บางบอน', 'ATE'], ['สามพราน', 'SPH'], ['กำแพงแสน', 'KPA']].find(([k]) => t.includes(k));
  return w ? w[1] : null;
}
function specCat(st) { return st === 'free' || st === 'temp' ? 'free' : st === 'company' ? 'company' : ['locked', 'pending', 'allocated', 'noted'].includes(st) ? 'lock' : 'held'; }
function carStatus(c, inv, bkByVin) {
  if (inv && !inv.company) return inv.ddate ? 'delivered' : 'invoiced';
  if (c.company) return 'company';
  if (c.sold) return 'sold';
  const bv = bkByVin.get(c.vin);
  if (c.bkno || (bv && (!c.fromBr || !bv.br || bv.br === c.br))) return 'booked';
  if (c.bknote) return 'noted';
  return 'free';
}
const FLOW = ['booked', 'fin', 'assign', 'po', 'down', 'delivered', 'confirmed'];
const FLOW_LABEL = { booked: 'จอง (เลขที่ใบเสร็จมัดจำ)', fin: 'ไฟแนนซ์ผ่าน', assign: 'จัดสรรรถ', po: 'PO สั่งแต่ง', down: 'ชำระดาวน์ / ชำระครบ (หลังแต่งรถ)', delivered: 'ส่งมอบ (ป้ายแดง + ประกัน)', confirmed: 'ผู้จัดการยืนยัน' };
const isCash = r => r.purchase === 'ซื้อสด';
function flowOf(a, today) {
  const f = a.rec.flow || {}, m = a.match;
  const done = {
    booked: !!String(a.rec.receipt_no || '').trim(),
    fin: isCash(a.rec) || !!(f.fin && f.fin.ok),
    // IDS allocating a car to this booking (VIN in Stock / DL) counts as the allocation, so nobody presses it twice
    assign: !!(f.assign && f.assign.vin) || !!(m && m.vin),
    po: !!(f.po && f.po.at),
    down: !!(f.down && f.down.receipt_no),
    delivered: !!(f.delivered && f.delivered.date && ((f.delivered.plate && f.delivered.insurer) || f.delivered.src === 'IDS')),
    confirmed: !!(f.confirm && f.confirm.at)
  };
  const idsDate = (m && m.ddate) || null;
  const idsDelivered = !!(idsDate || a.rec.delivered_flag);
  const monthStart = today.slice(0, 8) + '01';
  // delivered before this month according to IDS / the old form: history, nothing left to do here
  const history = idsDelivered && !done.delivered && !(idsDate && idsDate >= monthStart);
  let stage = 'booked';
  for (const k of FLOW) if (done[k]) stage = k;
  if (idsDelivered && FLOW.indexOf(stage) < FLOW.indexOf('delivered') && history) stage = 'delivered';
  // IDS shows delivered this month but the sales has not updated AT yet: only the delivery step is left
  const lateUpdate = idsDelivered && !done.delivered && !history;
  // delivered in the IDS file this month: the delivery counts; the red plate and insurer can be added later
  // the sales may skip the PO for now (24/10): the flow moves on, the PO stays missing until made (before delivery)
  const poSkip = !done.po && !!(f.po_skip && f.po_skip.at);
  const next = history ? null : lateUpdate ? (done.confirmed ? null : 'confirmed') : (FLOW.find(k => !done[k] && !(k === 'po' && poSkip)) || null);
  return { done, stage, next, poSkip, idsDelivered, history, lateUpdate, deliveredDate: (f.delivered && f.delivered.date) || idsDate || null };
}
const r0 = a => a.rec || {};
const sameName = (x, y) => norm(x) === norm(y);
// IDS keyed the booking under another sales ID (a borrowed or old ID): the AT sales confirms once that the case is theirs
function ownerCheckOf(a) {
  if (a.cancelled || a.demo || !a.match || a.match.status === 'possible' && !a.match.manual) return null;
  if (!a.idsSales || !a.sales || sameName(a.idsSales, a.sales)) return null;
  const oc = a.rec.owner_confirm, od = a.rec.owner_dispute;
  if (oc && sameName(oc.ids_name, a.idsSales)) return 'confirmed';
  if (a.done) return 'auto';
  if (od && sameName(od.ids_name, a.idsSales)) return 'disputed';
  return 'pending';
}
let deriveCache = null;
function derive() {
  const key = `${S.dataV}|${S.idsV}|${todayISO()}`;
  if (deriveCache && deriveCache.key === key) return deriveCache.D;
  const D = deriveNow();
  deriveCache = { key, D };
  return D;
}
function deriveNow() {
  const today = todayISO(), X = idsData();
  const invByVin = new Map();
  // latest invoice per car; on the same date the sale to a customer wins over the sale between AT Honda branches
  // (PSC sells to SPH on 31/03 and SPH sells to the customer the same day: the car is SPH's customer's)
  X.inv.forEach(i => { const p = invByVin.get(i.vin), a = i.idate || '', b = p ? p.idate || '' : '';
    if (!p || a > b || (a === b && p.company && !i.company) || (a === b && !!p.company === !!i.company && !p.ddate && i.ddate)) invByVin.set(i.vin, i); });

  // IDS bookings
  // web changes to IDS bookings (ids/bkfix) go on top of each upload
  const idsB = X.bookings.map(idsFixApply).map(b => ({
    ...b, key: 'ids:' + b.no, src: 'IDS', spec: specKey(b.model, b.grade, b.color),
    match: b.match || (b.ids === CANCEL ? 'cancel' : b.vin ? 'car' : (b.ref || b.ws) ? 'quota' : 'waiting')
  }));
  const bkByVin = new Map(), bkByNo = new Map();
  idsB.forEach(b => { if (b.match !== 'cancel' && b.vin) bkByVin.set(b.vin, b); bkByNo.set(b.no, b); });

  // cars: IDS stock + cars received here, minus removed, with transfers applied
  const cars = new Map();
  // a car invoiced to another AT Honda branch has moved there: it is that branch's stock from now on
  // (the old branch's file may still list it). If the new branch's file has it too, its own row is used.
  const stockBrs = new Map(); X.cars.forEach(c => { if (!stockBrs.has(c.vin)) stockBrs.set(c.vin, new Set()); stockBrs.get(c.vin).add(c.br); });
  X.cars.forEach(c0 => {
    const to = c0.company ? atBranchOf(c0.cust) : null;
    let c = c0;
    if (to && to !== c0.br) {
      if (stockBrs.get(c0.vin).has(to)) return;
      c = { ...c0, br: to, fromBr: c0.br, company: false, sold: false, bkno: null, bknote: null, cust: null, note: [c0.note, `โอนจาก ${c0.br}`].filter(Boolean).join(' · ') };
    }
    const car = { ...c, src: 'IDS', prodIds: c.prod || null };
    if (!car.st) car.st = carStatus(car, invByVin.get(car.vin), bkByVin);
    // invoiced but not handed over (advance invoice, ตกลง 22/10): what the branch said about it
    const inv0 = invByVin.get(car.vin), adv = ['invoiced', 'sold'].includes(car.st) && !(inv0 && (inv0.company || inv0.ddate)) ? advOf(car.vin, inv0) : null;
    if (adv) {
      car.advance = { ...adv, cust: (inv0 && inv0.cust) || car.cust || null };
      if (adv.kind === 'fake') { car.advFake = true; car.st = 'free'; car.advCust = car.advance.cust; car.cust = null; car.bkno = null; car.bk = null; }
    }
    let b = car.advFake ? null : bkByVin.get(car.vin) || ((car.bkno || car.bk) ? bkByNo.get(car.bkno || car.bk) : null);
    if (b && car.fromBr && b.br && b.br !== car.br) b = null;
    car.bk = car.bk || car.bkno || b?.no || null;
    car.cust = car.cust || b?.cust || null;
    car.sales = b?.sales || null;
    cars.set(car.vin, car);
  });
  const removed = [];
  for (const [vin, o] of S.vehicles) {
    const car0 = cars.get(vin);
    if (o.added && !car0) cars.set(vin, { ...o.added, vin, st: 'free', src: 'รับเข้าในระบบนี้ รอไฟล์ IDS' });
    else if (o.added && car0) car0.received = o.added;
    const car = cars.get(vin);
    if (!car) continue;
    if (o.branch) car.br = o.branch;
    // production date keyed here (from the label on the car), kept even after IDS later has its own value
    car.prodKey = (o.prod_info && o.prod_info.date) || (o.added && o.added.prod) || null;
    car.prodInfo = o.prod_info || null;
    if (o.removed) { removed.push({ ...car, removed: o.removed }); cars.delete(vin); }
  }
  // IDS is the reference; the keyed date is used only while IDS has none. Car age counts from the production date.
  for (const car of cars.values()) {
    car.prodIds = car.src === 'IDS' ? car.prodIds || null : null;
    car.prodKey = car.prodKey || null;
    car.prod = car.prodIds || car.prodKey || null;
    car.prodSrc = car.prodIds ? 'IDS' : car.prodKey ? 'key' : null;
    car.prodDiff = !!(car.prodIds && car.prodKey && car.prodIds !== car.prodKey);
  }
  // invoiced and handed over (DL has a delivery date): the car has left, so it is no longer stock.
  // Company cars invoiced to AT Honda itself stay (they are still at the branch).
  const deliveredOut = [];
  for (const [vin, car] of cars) { const i = invByVin.get(vin); if (i && !i.company && i.ddate) { deliveredOut.push({ ...car, inv: i }); cars.delete(vin); } }

  // AT Honda bookings: the reference for who owns the customer
  const at = [];
  for (const [id, r] of S.bookings) {
    at.push({
      key: 'app:' + id, id, src: 'AT', rec: r, no: r.booking_no || null, date: r.booking_date, br: r.br, sales: salesCanon(r.sales),
      cust: r.customer, model: r.model, grade: r.grade, color: r.color, spec: specKey(r.model, r.grade, r.color),
      deposit: (Number(r.deposit) || 0) + (r.deposit_from ? Number(r.deposit_from.amount) || 0 : 0), slip: (r.slip_imgs || []).length > 0 || r.slip === true || !!r.doc_url || !!r.deposit_from,
      cancelled: r.status === 'cancelled', demo: !!r.demo || !!r.hidden, created_at: r.created_at,
      // a model change approved later puts the booking at the back of the queue
      qdate: r.queue_date || r.booking_date
    });
  }
  const M = matchForms(at, idsB, [...cars.values()], X.inv);
  const idsByKey = new Map(idsB.map(b => [b.key, b]));
  for (const [k, a] of M.idsCx) a.idsLeftKey = k;
  for (const a of at) {
    a.match = M.result.get(a.key) || null;
    a.near = M.near.get(a.key) || null;
    a.idsLeft = a.idsLeftKey ? idsByKey.get(a.idsLeftKey) || null : null;
    const bk = a.match && a.match.recs.find(r => r.kind === 'booking');
    a.ids = bk ? idsByKey.get(bk.key) : null;
    // matched to an IDS booking whose name is spelt differently: IDS is the reference, the form's spelling is kept beside it
    if (a.ids && a.ids.cust && normName(a.ids.cust) !== normName(a.cust)) { a.custForm = a.cust; a.cust = a.ids.cust; }
    if (!a.no && a.match) a.no = a.match.no;
    a.idsSales = a.match ? a.match.idsSales : a.idsLeft ? a.idsLeft.sales || null : null;
    // IDS is the reference for model / grade / colour; the booking keeps its place in the queue and nobody retypes it.
    // Any difference in model / grade / colour is shown side by side for a person to confirm first (still in progress);
    // delivered bookings take the IDS values straight away.
    const mm = a.match;
    const ic = mm && mm.idsColor ? String(mm.idsColor).toUpperCase() : (a.color || '');
    a.specDiff = !!(mm && mm.idsModel && mm.idsGrade && (mm.idsModel !== a.model || mm.idsGrade !== a.grade || ic !== String(a.color || '').toUpperCase()));
    const stillOpen = !a.cancelled && !a.demo && !(a.flow0 = flowOf(a, today)).history && !(a.flow0.done.delivered || a.flow0.lateUpdate);
    if (mm && a.specDiff && (mm.manual || (!stillOpen && mm.status === 'matched'))) {
      a.atSpec = { model: a.model, grade: a.grade, color: a.color };
      a.model = mm.idsModel; a.grade = mm.idsGrade; a.color = ic;
      a.spec = specKey(a.model, a.grade, a.color);
      a.specFromIds = true;
    }
    a.flow = flowOf(a, today);
    a.done = a.flow.history || a.flow.done.delivered || a.flow.lateUpdate;
    a.active = !a.cancelled && !a.demo && !a.done;
    a.ageDays = a.date ? daysBetween(a.date, today) : null;
    // same customer name but a different model in IDS: a person confirms it is the same deal, or a second car
    a.matchAsk = !!(a.match && !a.match.manual && a.active && (a.match.status === 'possible' || a.specDiff));
    a.ownerCheck = ownerCheckOf(a);
    a.change = r0(a).change && r0(a).change.status === 'pending' ? r0(a).change : null;
    a.multi = r0(a).multi || null;
    // cross-branch: commission follows the sales who owns the case, sales volume goes to the branch that delivers
    a.salesBr = salesBranch(a.sales);
    const dlRec = a.match && a.match.recs.find(x => x.kind === 'dl');
    // the invoice (DL) branch once delivered, otherwise the branch on the booking; a car moved in from another branch's stock does not change it
    a.delivBr = (dlRec && dlRec.br) || a.br;
    a.cross = !!(a.salesBr && a.delivBr && a.salesBr !== a.delivBr);
  }
  // a car handed over in the delivery step here (date + red plate) also leaves stock, before DL catches up
  for (const a of at) {
    const f = a.rec.flow || {}, vin = f.assign && f.assign.vin;
    if (!a.cancelled && vin && f.delivered && f.delivered.date && cars.has(vin)) { deliveredOut.push({ ...cars.get(vin), handed: f.delivered }); cars.delete(vin); }
  }
  const atByKey = new Map(at.map(a => [a.key, a]));
  const atByIdM = new Map(at.map(a => [a.id, a]));
  at.forEach(a => { const mw = a.rec.multi; if (mw && mw.with) mw.with.forEach(id => { const o = atByIdM.get(id); if (o) o.multiOf = a.id; }); });
  at.forEach(a => { if (a.near) a.near.forEach(h => { h.other = h.usedBy ? atByKey.get(h.usedBy) || null : null; }); });
  const atByIds = new Map(at.filter(a => a.ids && !a.cancelled).map(a => [a.ids.key, a]));

  // queue rows: IDS bookings (linked to their AT form when found) + AT bookings not yet in IDS
  const bookings = [];
  idsB.forEach(b => { b.app = atByIds.get(b.key) || null; b.owner = b.app ? b.app.sales : b.sales; b.qdate = b.app && b.app.rec.queue_date ? b.app.rec.queue_date : b.date; bookings.push(b); });
  at.filter(a => !a.ids && a.active).forEach(a => {
    const kind = a.match ? a.match.kind : null;
    bookings.push({ ...a, app: a, owner: a.sales, match: kind === 'stock' ? 'car' : kind === 'dl' ? 'car' : 'waiting', vin: a.match ? a.match.vin : null });
  });
  const bookingByKey = new Map();
  bookings.forEach(b => { bookingByKey.set(b.key, b); if (b.app) bookingByKey.set(b.app.key, b); });
  at.forEach(a => { a.row = bookingByKey.get(a.key) || null; });

  // locks: a unit is a car (VIN) or a quota slot (Ref); several temporary locks may queue on one unit
  const locks = [...S.locks.entries()].filter(([, l]) => !l.hidden).map(([id, l]) => ({ id, ...l }));
  const unitKeys = l => [l.vin ? 'V:' + l.vin : null, l.ref ? 'R:' + l.ref : null].filter(Boolean);
  // Only a car that is already handed over cannot be locked. IDS allocation, invoices and company cars can be
  // advanced invoices made for the sales target (not really sold), so those requests stay open to approve, with a note.
  // When IDS allocates the car to this lock's own booking, the lock is done.
  const idsRefBk = new Map();
  idsB.forEach(b => { if (b.match !== 'cancel') { if (b.ref) idsRefBk.set(b.ref, b); if (b.ws) idsRefBk.set(b.ws, b); } });
  X.quota.forEach(q => { if (q.bk && !idsRefBk.has(q.ref)) idsRefBk.set(q.ref, bkByNo.get(q.bk) || { no: q.bk }); });
  const outByVin = new Map(deliveredOut.map(c => [c.vin, c]));
  for (const l of locks) {
    l.type = l.type === 'customer' ? 'booking' : (l.type || 'booking');
    // a request read from the Stock sheet before the nickname was known: match the nickname again with today's list
    // (or the sales came from the matched booking): the old "ยังไม่รู้ว่า … คือเซลล์คนไหน" warning no longer applies
    if (l.sales_nick || (l.warnings || []).length) {
      const s = !l.sales && l.sales_nick ? salesOfNick(l.sales_nick) : null; if (s) l.sales = s;
      if (l.sales || (l.sales_nick && salesOfNick(l.sales_nick))) l.warnings = (l.warnings || []).filter(w => !/^ยังไม่รู้ว่า/.test(w));
    }
    l.days = LOCK_DAYS_BY[l.type] || 15;
    const bk = l.bkref ? bookingByKey.get(l.bkref) : null;
    const rec = bk && bk.app ? bk.app.rec : null;
    l.booking = bk;
    l.owner = l.sales || (bk ? bk.owner : null);
    // finance approved (or cash) and the delivery date confirmed: the queue stays locked, no release, no more asking (ตกลง 19/10)
    const finOk = !!(bk && bk.app && bk.app.flow && bk.app.flow.done && bk.app.flow.done.fin) || !!(rec && rec.fin_status === 'ผ่าน');
    l.hold = !!(l.type === 'booking' && rec && rec.delivery_plan && finOk && l.status === 'approved');
    l.holdUntil = l.hold ? rec.delivery_plan : null;
    l.daysLeft = l.status === 'approved' && l.end ? daysBetween(today, l.end) : null;
    l.finWait = !!(l.type === 'booking' && rec && rec.purchase === 'ไฟแนนซ์' && rec.fin_status !== 'ผ่าน');
    const due = l.status === 'approved' && !l.hold && l.daysLeft !== null;
    // 15-day locks (booking, dealer): on the last day the manager is alerted to extend or release;
    // with no update from the manager by MGR_GRACE days after that, the queue is released by itself.
    // Temporary locks (7 days) simply end.
    l.mgrDue = due && l.type !== 'temp' && l.daysLeft <= 0 && l.daysLeft >= -MGR_GRACE;
    l.autoReleased = due && l.type !== 'temp' && l.daysLeft < -MGR_GRACE;
    l.expired = due && l.type === 'temp' && l.daysLeft < 0;
    l.finDue = l.mgrDue && l.finWait;
    l.needExt = l.mgrDue;
    l.releaseOn = due && l.type !== 'temp' ? addDays(l.end, MGR_GRACE + 1) : null;
    l.live = l.status === 'pending' || l.status === 'allocated' || (l.status === 'approved' && !l.autoReleased && !l.expired);
    // IDS has allocated this car / slot: our lock steps aside (the same deal = done, another deal = a manager closes it)
    if (['pending', 'approved', 'allocated'].includes(l.status)) {
      const gone = l.vin ? outByVin.get(l.vin) : null;
      const car = l.vin && !gone ? cars.get(l.vin) : null;
      const qb = !l.vin && l.ref ? idsRefBk.get(l.ref) : null;
      // an invoice in the customer's name (not the company's) counts too: the same name closes the lock, another name asks
      if (gone || (car && !car.advFake && (car.st === 'booked' || (['invoiced', 'sold'].includes(car.st) && car.cust))) || qb) {
        const a = bk ? bk.app : null, idsNo = gone ? gone.bk || null : car ? car.bk : qb.no;
        const handedHere = gone && gone.handed && a && a.rec.flow && a.rec.flow.assign && a.rec.flow.assign.vin === l.vin;
        const same = (l.type === 'dealer' && !!gone) || !!handedHere
          || !!(bk && ((a && a.match && (a.match.vin === l.vin || a.match.recs.some(x => (l.vin && x.vin === l.vin) || (idsNo && x.no === idsNo))))
            || (idsNo && (bk.no === idsNo || (a && a.no === idsNo))) || (bk.src === 'IDS' && l.vin && bk.vin === l.vin)));
        const src = gone || car, info = { same, st: gone ? 'delivered' : 'booked', no: idsNo || null, cust: src ? (gone && gone.inv && gone.inv.cust) || src.cust || null : (qb && qb.cust) || null };
        // the customer IDS gave the car to has the lock's customer name (a temporary lock has no booking to compare): done (ตกลง 19/10)
        const lc = (bk && bk.cust) || l.prospect || '';
        const byName = !same && !!(lc && info.cust && keyScore(nameKey(lc), nameKey(info.cust)) >= 2);
        if (byName) { info.same = true; info.byName = true; }
        if (gone || same || byName) { l.idsTook = info; l.live = false; } else { l.idsInfo = info; l.idsAsk = !l.ids_keep; }
      }
    }
  }
  const pendByUnit = new Map();
  locks.filter(l => l.status === 'pending').sort((a, b) => (a.requested_at || '').localeCompare(b.requested_at || ''))
    .forEach(l => { const k = l.vin ? 'V:' + l.vin : 'R:' + l.ref; (pendByUnit.get(k) || pendByUnit.set(k, []).get(k)).push(l); });
  for (const arr of pendByUnit.values()) arr.forEach((l, i) => { l.queuePos = i + 1; l.queueN = arr.length; });
  const unitLocks = new Map();
  locks.filter(l => l.live).forEach(l => unitKeys(l).forEach(k => (unitLocks.get(k) || unitLocks.set(k, []).get(k)).push(l)));
  const lockStateOf = (keys) => {
    const ls = [...new Set(keys.flatMap(k => unitLocks.get(k) || []))];
    const hard = ls.find(l => l.type !== 'temp' && l.status !== 'pending') || ls.find(l => l.type !== 'temp');
    const temps = ls.filter(l => l.type === 'temp');
    // a confirmed booking lock bumps the temporary queue on that unit
    if (hard && hard.status !== 'pending') temps.forEach(t => { t.bumped = hard; });
    else if (hard) temps.forEach(t => { t.challenged = hard; });
    return { hard: hard || null, temps, all: ls };
  };
  // a car given to a booking in the delivery steps (จัดสรร) and not handed over yet
  const assignedBy = new Map();
  at.forEach(a => { const f = a.rec.flow || {}; if (!a.cancelled && !a.demo && f.assign && f.assign.vin && !(f.delivered && f.delivered.date)) assignedBy.set(f.assign.vin, a); });
  for (const car of cars.values()) {
    const basis = car.prod || car.consign || car.stockin;
    car.age = basis ? daysBetween(basis, today) : null;
    car.ageFrom = car.prod ? 'prod' : car.consign ? 'consign' : car.stockin ? 'stockin' : null;
    // two ages shown apart (บทวิเคราะห์ 19/10): days in stock, and days since production (none = รอระบุ)
    const inS = car.consign || car.stockin; car.stockAge = inS ? daysBetween(inS, today) : null; car.prodAge = car.prod ? daysBetween(car.prod, today) : null;
    car.spec = specKey(car.model, car.grade, car.color);
    const ls = lockStateOf(['V:' + car.vin, car.ref ? 'R:' + car.ref : null].filter(Boolean));
    car.lock = ls.hard; car.temps = ls.temps;
    car.status = ls.hard ? (ls.hard.status === 'pending' ? 'pending' : ls.hard.status === 'allocated' ? 'allocated' : 'locked')
      : (car.st === 'free' && ls.temps.length ? 'temp' : car.st);
    car.assignedTo = assignedBy.get(car.vin) || null;
    if (car.assignedTo && ['free', 'temp', 'noted', 'locked', 'pending'].includes(car.status)) car.status = 'assigned';
  }
  for (const b of bookings) {
    const l = locks.find(x => x.live && x.type === 'booking' && (x.bkref === b.key || (b.app && x.bkref === b.app.key)));
    b.lock = l || null;
    if (l) b.state = l.status === 'pending' ? 'pending' : l.status === 'allocated' ? 'allocated' : 'locked';
    else if (b.match === 'cancel') b.state = 'cancel';
    else if (b.match === 'car') b.state = 'idscar';
    else if (b.match === 'quota') b.state = 'idsquota';
    else b.state = 'waiting';
  }
  // FIFO queue per spec
  const bySpec = {};
  bookings.filter(b => b.state === 'waiting').sort((a, b) => (a.qdate || a.date || '').localeCompare(b.qdate || b.date || '') || a.key.localeCompare(b.key))
    .forEach(b => { (bySpec[b.spec] ||= []).push(b); b.pos = bySpec[b.spec].length; });

  // quota
  const stockByRef = new Map();
  for (const c of cars.values()) if (c.ref) stockByRef.set(c.ref, c);
  const bkByRef = new Map();
  bookings.forEach(b => { if (b.ref) bkByRef.set(b.ref, b); if (b.ws) bkByRef.set(b.ws, b); });
  const quota = X.quota.map(q => {
    const car = (q.vin && cars.get(q.vin)) || stockByRef.get(q.ref) || null;
    const vin = q.vin || car?.vin || null;
    const st0 = q.st || (invByVin.get(vin) ? 'sold' : car ? 'arrived' : vin ? 'vin' : 'waiting');
    // received into this system (or in the IDS stock) counts as arrived even if the quota file is older (13/10)
    const st = car && (st0 === 'waiting' || st0 === 'vin') ? (invByVin.get(car.vin) ? 'sold' : 'arrived') : st0;
    const b = (q.bk && bkByNo.get(q.bk)) || bkByRef.get(q.ref) || (vin ? bkByVin.get(vin) : null) || null;
    const ls = lockStateOf(['R:' + q.ref, vin ? 'V:' + vin : null].filter(Boolean));
    const branchHold = q.vnote && BR[q.vnote.toUpperCase()] ? q.vnote.toUpperCase() : null;
    return { ...q, vin, st, car, booking: b, bk: q.bk || b?.no || null, spec: specKey(q.model, q.grade, q.color), lock: ls.hard, temps: ls.temps, branchHold,
      open: (st === 'waiting' || st === 'vin') && !(q.bk || b) && !ls.hard };
  });

  // per spec summary
  const specs = {};
  const sp = k => (specs[k] ||= { key: k, total: 0, free: 0, temp: 0, locked: 0, pending: 0, held: 0, waiting: 0, incoming: 0, freeBy: {}, totalBy: {} });
  for (const car of cars.values()) {
    const s = sp(car.spec);
    s.total++; s.totalBy[car.br] = (s.totalBy[car.br] || 0) + 1;
    if (car.status === 'free' || car.status === 'temp') { s.free++; s.freeBy[car.br] = (s.freeBy[car.br] || 0) + 1; }
    if (car.status === 'temp') s.temp++;
    if (car.status === 'locked' || car.status === 'allocated') s.locked++;
    if (car.status === 'pending') s.pending++;
    // taken for a customer (booked, typed name, locked, sold) but not company cars
    if (car.status !== 'free' && car.status !== 'temp' && car.status !== 'company') s.held++;
    // the spec table's columns, each car in one only (ตกลง 22/10): ว่าง · ติดจอง (IDS / sold) · ล็อก (this web, sheet name) · รถบริษัท
    const cat = specCat(car.status); s.cat = s.cat || { free: 0, held: 0, lock: 0, company: 0 }; s.cat[cat]++;
    if ((car.age ?? -1) > (s.maxAge ?? -1)) s.maxAge = car.age;
  }
  bookings.filter(b => b.state === 'waiting').forEach(b => sp(b.spec).waiting++);
  quota.forEach(q => { if (q.open) sp(q.spec).incoming += q.qty || 1; });
  for (const s of Object.values(specs)) {
    s.short = s.waiting > s.free + s.incoming;
    s.low = s.short;
  }

  // per branch summary
  const sum = {};
  BRS.forEach(b => { sum[b] = { stock: 0, free: 0, held: 0, locked: 0, ids: 0, waiting: 0, at: 0, atNoIds: 0, quotaIn: 0, quota: 0 }; });
  for (const c of cars.values()) {
    const s = sum[c.br]; if (!s) continue;
    s.stock++;
    if (c.status === 'free' || c.status === 'temp') s.free++;
    else if (['locked', 'pending', 'allocated'].includes(c.status)) s.locked++;
    else s.held++;
  }
  idsB.forEach(b => { if (b.match !== 'cancel' && sum[b.br]) sum[b.br].ids++; });
  bookings.forEach(b => { if (b.state === 'waiting' && sum[b.br]) sum[b.br].waiting++; });
  at.forEach(a => { if (a.active && sum[a.br]) { sum[a.br].at++; if (!a.match) sum[a.br].atNoIds++; } });
  quota.forEach(q => { const s = sum[q.br]; if (!s) return; s.quota += q.qty || 1; if (q.open) s.quotaIn += q.qty || 1; });

  const receipts = [...S.receipts.entries()].filter(([, r]) => !r.hidden).map(([id, r]) => ({ id, ...r })).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const D = { today, X, cars, removed, deliveredOut, locks, idsB, at, bookings, bookingByKey, bySpec, quota, specs, sum, receipts, invByVin, idsOnly: M.idsOnly };
  D.alerts = buildAlerts(D);
  return D;
}

// ------------------------------------------------------------------ alerts: who needs to do what
// to: { sales?, br?, roles: ['sales'|'admin'|'manager'] }
function buildAlerts(D) {
  const out = [], today = D.today;
  const add = (id, to, tone, title, text, act) => out.push({ id, to, tone, title, text, act });
  const asof = br => D.X.src[br] && D.X.src[br].booking ? D.X.src[br].booking.asof : null;
  for (const a of D.at) {
    if (!a.active || a.match) continue;
    const ref = asof(a.br);
    const age = ref && a.date ? daysBetween(a.date, ref) : null;
    if (age === null || age < AT_TO_IDS_DAYS) continue;
    add('atids:' + a.id, { sales: a.sales, br: a.br, roles: ['sales', 'admin', 'manager'] }, 'bad', 'ใบจองยังไม่อยู่ใน IDS',
      `${a.cust} · ${a.model} ${gradeShort(a.model, a.grade)} ${a.color || ''} · จอง ${fmtD(a.date)} ผ่านมา ${age} วันแล้วยังไม่พบใน IDS (Booking / Stock / DL) ณ ${fmtD(ref)} เซลล์คีย์ลง IDS / แอดมินอัปเดตไฟล์ IDS${a.near && a.near.some(h => h.other) ? ' · พบชื่อลูกค้านี้ในใบจองอื่นที่ส่งมอบแล้ว ตรวจว่าซ้ำหรือไม่' : ''}`, { act: 'at-open', id: a.id });
  }
  for (const a of D.at) {
    const car = `${a.cust} · ${a.model} ${gradeShort(a.model, a.grade)} ${a.color || ''}`, go = { act: 'at-open', id: a.id };
    const ro = a.rec.reassigned_out;
    if (ro && !a.cancelled && ro.at && daysBetween(ro.at.slice(0, 10), today) <= 7) add('reas:' + a.id + ':' + ro.vin, { sales: a.sales, br: a.br, roles: ['sales', 'admin', 'manager'] }, 'warn', 'รถที่จัดสรรให้ใบจองนี้ ถูกเปลี่ยนไปให้ใบจองอื่น',
      `${car} · รถ ${ro.vin} ไปให้ ${ro.to || 'ใบจองอื่น'} (${ro.role || ''} ${fmtD(ro.at.slice(0, 10))}) · ใบจองนี้กลับไปรอรถ`, go);
    if (a.matchAsk) add('matchq:' + a.id, { sales: a.sales, br: a.br, roles: ['sales', 'admin'] }, 'warn', a.match.status === 'possible' ? 'ชื่อลูกค้าตรงกับ IDS แต่รุ่นไม่ตรง ยืนยันการจับคู่' : 'เกรดหรือสีในฟอร์มไม่ตรงกับ IDS ยืนยันการจับคู่',
      `${car} · ใน IDS เป็น ${a.match.idsModel} ${gradeShort(a.match.idsModel, a.match.idsGrade)} ${a.match.idsColor || ''} ใช่ใบเดียวกันหรือเป็นการจองเพิ่มอีกคัน`, go);
    if (a.ownerCheck === 'pending') add('owner:' + a.id, { sales: a.sales, br: a.br, roles: ['sales', 'admin'] }, 'warn', 'ยืนยันเจ้าของเคส (ชื่อเซลล์ใน IDS ไม่ตรง)',
      `${car} · IDS คีย์ด้วย ID ${a.idsSales} · ฟอร์ม AT เป็นของ ${a.sales} กด "เคสของฉัน" ครั้งเดียว แล้วจะไม่เตือนอีก`, go);
    if (a.ownerCheck === 'disputed') add('ownerd:' + a.id, { br: a.br, roles: ['manager'] }, 'bad', 'เซลล์แจ้งว่าไม่ใช่เคสของตัวเอง เลือกเจ้าของเคส',
      `${car} · ฟอร์ม AT: ${a.sales} · IDS: ${a.idsSales}${a.rec.owner_dispute.note ? ' · ' + a.rec.owner_dispute.note : ''}`, go);
    if (a.change) add('chg:' + a.id, { br: a.br, roles: ['manager'] }, a.change.type === 'cancel' ? 'bad' : 'warn', a.change.type === 'cancel' ? 'ขอยกเลิกใบจอง รออนุมัติ' : 'ขอแก้ไขใบจอง รออนุมัติ',
      `${car} · เซลล์ ${a.sales} · ${a.change.type === 'cancel' ? a.change.reason : changeText(a.change)}`, go);
    const last = (a.rec.changes || []).slice(-1)[0];
    if (last && last.decided && ['approved', 'rejected'].includes(last.status) && daysBetween(last.decided.at.slice(0, 10), today) <= 3)
      add('chgd:' + a.id + ':' + last.id, { sales: a.sales, br: a.br, roles: ['sales'] }, last.status === 'approved' ? 'muted' : 'bad',
        `${last.type === 'cancel' ? 'คำขอยกเลิก' : 'คำขอแก้ไข'}${last.status === 'approved' ? 'ได้รับอนุมัติแล้ว' : 'ไม่ได้รับอนุมัติ'}`, `${car}${last.decided.note ? ' · ' + last.decided.note : ''}`, go);
    if (a.cancelled && a.rec.cancel && a.rec.cancel.refund === 'refund' && !(a.rec.refund && a.rec.refund.at) && daysBetween((a.rec.cancel.at || '').slice(0, 10) || today, today) <= 30)
      add('refund:' + a.id, { sales: a.sales, br: a.br, roles: ['sales', 'admin'] }, 'warn', 'ยกเลิกแล้ว กรอกบัญชีคืนเงิน แล้วพิมพ์เอกสารให้เซ็น', `${car} · คืน ${money(a.rec.cancel.amount)} บาท แนบเลขที่บัญชีและรูปหน้าสมุดบัญชี`, go);
    // the paper form: the executive presses once it is signed; the sales hears back
    const cx = a.cancelled && a.rec.cancel && a.rec.cancel.at ? a.rec.cancel : null;
    if (cx && !cx.exec_ok && (cx.refund !== 'refund' || (a.rec.refund && a.rec.refund.at)) && daysBetween(cx.at.slice(0, 10), today) <= 60)
      add('cxexec:' + a.id, { br: a.br, roles: ['exec'] }, 'warn', cx.refund === 'refund' ? 'รอผู้บริหารอนุมัติจ่ายคืนเงินจอง' : 'รอผู้บริหารอนุมัติเอกสารยกเลิก', `${car} · เซลล์ ${a.sales}${cx.refund === 'refund' ? ` · คืน ${money(cx.amount)} บาท` : ''} · กดเมื่อเอกสารเซ็นครบ`, go);
    if (cx && cx.exec_ok && daysBetween(cx.exec_ok.at.slice(0, 10), today) <= 3)
      add('cxok:' + a.id, { sales: a.sales, br: a.br, roles: ['sales', 'admin'] }, 'muted', cx.refund === 'refund' ? 'ผู้บริหารอนุมัติจ่ายคืนเงินจองแล้ว' : 'ผู้บริหารอนุมัติเอกสารยกเลิกแล้ว', `${car}${cx.doc_no ? ' · ' + cx.doc_no : ''}`, go);
  }
  const gf = gformCfg();
  if (gf) for (const a of D.at) if (gformDue(a) && (a.rec.created_at || '') >= (gf.at || ''))
    add('gform:' + a.id, { sales: a.sales, br: a.br, roles: ['sales'] }, 'warn', 'ยังไม่ได้ส่งใบจองเข้า Google Form (ช่วงทดลอง)', `${a.cust} · ${a.model} ${gradeShort(a.model, a.grade)} ${a.color || ''} · เปิดใบจองแล้วกด "เปิด Google Form ที่กรอกให้แล้ว"`, { act: 'at-open', id: a.id });
  for (const a of D.at) if (a.cancelled && !a.demo && a.rec.cancel && a.rec.cancel.refund === 'transfer' && !a.rec.cancel.to)
    add('trheld:' + a.id, { sales: a.sales, br: a.br, roles: ['sales', 'admin', 'manager'] }, 'warn', 'มัดจำรอโอนไปใบจองใหม่',
      `${a.cust} · ${specLabelText(a.spec)} · ${money((a.rec.cancel.transfer || {}).amount ?? a.deposit)} บาท · ลงใบจองใหม่ของลูกค้าแล้วกดผูก`, { act: 'tr-open', id: a.id, label: 'ผูกกับใบจองใหม่' });
  for (const b of D.idsOnly) {
    add('idsat:' + b.no, { sales: b.sales, br: b.br, roles: ['sales', 'admin', 'manager'] }, 'bad', 'มีใน IDS แต่ยังไม่ลงฟอร์ม AT Honda',
      `ใบจอง ${b.no} · ${b.cust || ''} · ${b.model} ${gradeShort(b.model, b.grade)} ${b.color || ''} · ชื่อใน IDS: ${b.sales || '–'} กรุณาลงใบจอง AT Honda พร้อมแนบใบจอง หรือจับคู่กับฟอร์มที่ลงไว้แล้ว (ถ้าไม่ใช่ลูกค้าของคุณ แจ้งผู้จัดการ)`, { act: 'ids-claim', id: b.no, more: [{ act: 'idspair-open', id: b.key, label: 'จับคู่กับฟอร์มที่มี' }, { act: 'idsfix-open', id: b.no, label: 'แก้ไข / ไม่ต้องมีฟอร์ม' }, { act: 'go', view: 'book', label: 'ดูใบจอง', q: b.no }] });
  }
  for (const l of D.locks) {
    const br = l.car_br, who = l.owner;
    const unit = l.vin ? l.vin : `Quota ${l.ref}`;
    const cust = l.booking ? l.booking.cust || '' : l.type === 'temp' ? l.prospect || '' : l.dealer_name || '';
    if (l.idsAsk && ['pending', 'approved', 'allocated'].includes(l.status)) add('idsask:' + l.id, { sales: who, br, roles: ['sales', 'manager'] }, 'bad', 'IDS จัดสรรรถที่มีล็อกให้ลูกค้าชื่ออื่น',
      `${unit} · ล็อกให้ ${cust || '–'} (${who || ''}) · IDS จัดสรรให้ ${l.idsInfo.cust || '–'}${l.idsInfo.no ? ' ใบจอง ' + l.idsInfo.no : ''} · ผู้จัดการเลือกใบจองที่ตรง`, { act: 'go', view: 'lock', sub: 'active' });
    // IDS allocated this car to another deal (or it is sold / invoiced): the request or lock here must be closed
    if (l.idsTook && !l.idsTook.same && ['pending', 'approved'].includes(l.status)) {
      const t = l.idsTook, why = t.st === 'booked' ? `IDS จัดสรรให้ใบจอง ${t.no || ''}${t.cust ? ' ' + t.cust : ''} แล้ว` : `ส่งมอบแล้ว${t.cust ? ' ให้ ' + t.cust : ''}`;
      add('idstook:' + l.id, { sales: who, br, roles: ['sales', 'manager'] }, 'bad', `${l.status === 'pending' ? 'คำขอล็อก' : 'ล็อก'}ใช้ไม่ได้แล้ว: ${why}`,
        `${unit} · ${specLabelText(l.spec)} · ${cust} · เซลล์ ${who || l.sales_nick || ''} · ผู้จัดการกด${l.status === 'pending' ? 'ไม่อนุมัติ' : 'ปล่อยล็อก'}เพื่อปิดรายการ`, { act: 'go', view: 'lock', sub: l.status === 'pending' ? 'approve' : 'active' });
      continue;
    }
    if (l.status === 'pending' && !l.idsTook) add('lockp:' + l.id, { br, roles: ['manager'] }, 'warn', l.type === 'temp' ? 'ขอล็อกชั่วคราว รออนุมัติ' : l.type === 'dealer' ? 'ขอล็อกแลก/ขายดีลเลอร์ รออนุมัติ' : 'ขอล็อกให้ใบจอง รออนุมัติ', `${unit} · ${specLabelText(l.spec)} · ${who || l.sales_nick || ''}${l.sheet_text || l.imported ? ' · จากชีต Stock' : ''}`, { act: 'go', view: 'lock', sub: 'approve' });
    // the last day of a 15-day lock: the manager extends or releases; no update = the queue is released on releaseOn
    if (l.mgrDue) add('lockx:' + l.id, { br, roles: ['manager'] }, 'warn', `ครบ ${l.days} วันแล้ว${l.finWait ? ' ไฟแนนซ์ยังไม่ผ่าน' : ''} ต่อล็อกหรือปล่อย`,
      `${unit} · ${cust} · เซลล์ ${who || ''} · ถ้าไม่ต่อ ระบบปล่อยคิววันที่ ${fmtD(l.releaseOn)}`, { act: 'go', view: 'lock', sub: 'active' });
    if (l.finDue) add('lockf:' + l.id, { sales: who, br, roles: ['sales'] }, 'warn', 'ครบ 15 วัน อัปเดตสถานะไฟแนนซ์', `${unit} · ${cust} · ผู้จัดการต้องต่อล็อกภายใน ${fmtD(addDays(l.releaseOn, -1))} ไม่งั้นระบบปล่อยคิว`, l.booking && l.booking.app ? { act: 'at-open', id: l.booking.app.id } : null);
    else if (!l.mgrDue && l.status === 'approved' && !l.hold && l.live && l.daysLeft !== null && l.daysLeft <= 2 && l.daysLeft >= 0) add('locke:' + l.id, { sales: who, br, roles: ['sales', 'manager'] }, 'warn', `ล็อกจะหมดใน ${l.daysLeft} วัน`, `${unit} · ${l.type === 'temp' ? 'ลูกค้าที่จะมาจอง ' + (l.prospect || '') : cust}`, { act: 'go', view: 'lock', sub: 'active' });
    if (l.autoReleased && daysBetween(l.releaseOn, today) <= 3) add('lockr:' + l.id, { sales: who, br, roles: ['sales', 'manager'] }, 'muted', `ปล่อยคิวแล้ว: ครบ ${l.days} วัน ผู้จัดการไม่ได้ต่อ`, `${unit} · ${cust} · รถกลับเป็นว่าง ต้องการรถคันนี้ให้ขอล็อกใหม่`, { act: 'go', view: 'lock', sub: 'active' });
    if (l.type === 'temp' && l.status === 'bumped' && l.bumped_at && daysBetween(l.bumped_at.slice(0, 10), today) <= 3)
      add('lockb:' + l.id, { sales: who, br, roles: ['sales', 'manager'] }, 'bad', 'มีคนจองรถคันนี้ไปก่อนแล้ว',
        `${unit} ที่${l.prospect ? ` ${l.owner || ''} ล็อกชั่วคราวไว้ให้ ${l.prospect}` : 'ล็อกชั่วคราวไว้'} ถูกล็อกให้ใบจองของ ${l.bumped_by || ''} ล็อกชั่วคราวถูกปล่อยแล้ว`, { act: 'go', view: 'lock', sub: 'history' });
    if (l.type === 'temp' && (l.status === 'pending' || l.status === 'approved') && (l.bumped || l.challenged)) {
      const h = l.bumped || l.challenged;
      add('lockb:' + l.id, { sales: who, br, roles: ['sales', 'manager'] }, 'bad', l.bumped ? 'มีคนจองรถคันนี้ไปก่อนแล้ว' : 'มีคนแนบใบจองขอรถคันนี้ก่อน',
        `${unit} ที่คุณล็อกชั่วคราวไว้ให้ ${l.prospect || 'ลูกค้า'} ตอนนี้${l.bumped ? 'ถูกล็อกให้ใบจองของ' : 'มีคำขอล็อกจากใบจองของ'} ${h.owner || ''} ${l.bumped ? 'ล็อกชั่วคราวของคุณถูกปล่อย' : 'รอผู้จัดการอนุมัติ'}`, { act: 'go', view: 'lock', sub: 'active' });
    }
  }
  // a manager swapped the car of a booking (same spec): the other branch's manager is told, the sales sees the new frame,
  // and the admins update the allocation in IDS
  for (const l of D.locks) {
    const sw = l.swap;
    if (!sw || !sw.at || daysBetween(sw.at.slice(0, 10), today) > 3) continue;
    const cust = l.booking ? l.booking.cust || '' : '';
    const txt = `${cust ? cust + ' · ' : ''}${specLabelText(l.spec)} · ${sw.from_vin} (${sw.from_br || '?'}) → ${sw.to_vin} (${sw.to_br}) · ${sw.reason}${sw.note ? ' ' + sw.note : ''} · โดย ${sw.role}`;
    const go = { act: 'go', view: 'lock', sub: 'active' };
    if (mgrRoleOf(sw.to_br) !== sw.rk) add('swap:' + l.id, { br: sw.to_br, roles: ['manager'] }, 'warn', `เปลี่ยนคัน: ใช้รถสาขา ${sw.to_br} ให้ใบจองแล้ว (แจ้งให้ทราบ)`, txt, go);
    if (l.owner) add('swaps:' + l.id, { sales: l.owner, br: sw.bk_br, roles: ['sales'] }, 'warn', 'ผู้จัดการเปลี่ยนคันรถของลูกค้าแล้ว', txt, l.booking && l.booking.app ? { act: 'at-open', id: l.booking.app.id } : go);
    if (l.status === 'approved') add('swapa:' + l.id, { br: sw.to_br, roles: ['admin'] }, 'warn', 'เปลี่ยนคันแล้ว จัดสรรคันใหม่ใน IDS', txt, go);
    if (['allocated', 'assigned'].includes(sw.was) && sw.from_br) add('swapo:' + l.id, { br: sw.from_br, roles: ['admin'] }, 'warn', 'เปลี่ยนคันแล้ว ยกเลิกการจัดสรรคันเดิมใน IDS', txt, go);
  }
  for (const r of D.receipts) if (r.status === 'pending') add('recv:' + r.id, { br: r.br, roles: ['admin', 'manager'] }, 'warn', 'รับรถเข้า รอยืนยัน', `${r.doc_no || ''} · ${(r.cars || []).length} คัน`, { act: 'recv-open', id: r.id });
  for (const a of D.at) {
    if (a.cancelled || a.demo) continue;
    if ((a.flow.done.delivered || a.flow.lateUpdate) && !a.flow.done.confirmed) add('conf:' + a.id, { br: a.br, roles: ['manager'] }, 'warn', 'ส่งมอบแล้ว รอผู้จัดการยืนยัน', `${a.cust} · ${a.model} · เซลล์ ${a.sales}`, { act: 'at-open', id: a.id });
  }
  for (const br of BRS) {
    const m = D.X.src[br];
    const d = m && m.stock ? daysBetween(m.stock.asof, today) : null;
    if (d !== null && d > 3) add('stale:' + br, { br, roles: ['admin'] }, 'muted', `ไฟล์ Stock IDS สาขา ${br} เก่า ${d} วัน`, 'อัปโหลดไฟล์ล่าสุดเพื่อให้การจับคู่และการแจ้งเตือนถูกต้อง', { act: 'go', view: 'upload' });
  }
  return out;
}
const specLabelText = k => { const [m, g, c] = String(k || '?|?|?').split('|'); return `${m} ${gradeShort(m, g)} ${c}`; };
function myAlerts(D) {
  const r = S.role.role, mine = [];
  for (const a of D.alerts) {
    const t = a.to;
    if (r === 'sales') { if (t.roles.includes('sales') && t.sales && t.sales === S.role.sales) mine.push(a); }
    else if (r === 'admin') { if (t.roles.includes('admin') && t.br === S.role.branch) mine.push(a); }
    else if (r === 'aum' || r === 'nuch') { if (t.roles.includes('manager') && (!t.br || MGR_BR[r].includes(t.br))) mine.push(a); }
    else if (r === 'exec') { if (t.roles.includes('manager') || t.roles.includes('exec')) mine.push(a); }
  }
  // requests waiting for a decision come first, so they are not buried under the "not in IDS" list
  const PRI = ['chg:', 'idstook:', 'lockp:', 'lockx:', 'ownerd:', 'conf:', 'swapa:', 'swapo:', 'swap:', 'swaps:', 'chgd:', 'refund:', 'gform:', 'owner:', 'matchq:'];
  const pri = a => { const i = PRI.findIndex(k => a.id.startsWith(k)); return i < 0 ? 99 : i; };
  return mine.sort((x, y) => pri(x) - pri(y));
}
// S.brScope: the branches a manager looks after, set while drawing their sales / analysis tabs (13/10)
const inBr = x => S.br ? x.br === S.br : (!S.brScope || S.brScope.includes(x.br));
// the person who did it, or the branch manager, can reverse the last lock action within UNDO_HOURS
// the person who pressed it can undo within 24 hours; the manager of the car's branch (พี่อั้ม for dealer trades) at any time (ตกลง 13/10)
const lockMgr = l => l.type === 'dealer' ? perms().approveDealer || canApproveBr(l.car_br) : canApproveBr(l.car_br);
const canUndo = l => !!(l.undo && l.undo.at && ['pending', 'approved', 'allocated', 'rejected', 'released', 'withdrawn'].includes(l.status) && (lockMgr(l) || (l.undo.role === roleLabel() && Date.now() - Date.parse(l.undo.at) < UNDO_HOURS * 3600e3)));
// the managers are equal, so the screen says which of them acted
const decidedBy = l => { const h = [...(l.history || [])].reverse().find(x => /อนุมัติ|ไม่อนุมัติ|ผู้จัดการ|ปล่อยล็อก|จัดสรร/.test(x.act || '')); return h || null; };

// ------------------------------------------------------------------ store: shared db when available, in-page otherwise
let DB = null, USER = null;
const COLS = ['bookings', 'locks', 'vehicles', 'receipts', 'ids', 'uploads', 'ref'];
async function write(col, id, data) {
  if (S.mode === 'readonly') { toast('บัญชีนี้ดูได้อย่างเดียว บันทึกไม่ได้', 'bad'); return false; }
  const body = plain(data);
  if (DB) {
    try { await DB.collection(col).doc(id).set(body); }
    catch (e) {
      const canW = e && e.code === 'invalid_argument' && USER ? await USER.can('data.write').catch(() => null) : null;
      if (e && (e.code === 'not_granted' || canW === false)) { S.mode = 'readonly'; renderChrome(); toast('บัญชีนี้ไม่มีสิทธิ์บันทึก ขอสิทธิ์ Editor จากเจ้าของหน้า', 'bad'); }
      else if (e && e.code === 'invalid_argument') toast('บันทึกไม่ได้ ข้อมูลใหญ่เกินหรือรูปแบบไม่ถูกต้อง', 'bad');
      else if (e && e.code === 'quota_exceeded') toast('พื้นที่เก็บข้อมูลเต็ม', 'bad');
      else toast('บันทึกไม่สำเร็จ ลองอีกครั้ง', 'bad');
      return false;
    }
  }
  // apply locally at once; the shared snapshot that follows carries the same data
  S[col].set(id, body);
  if (col === 'ids') S.idsV++;
  S.dataV++;
  render();
  return true;
}
const newId = col => DB ? DB.collection(col).doc().id : col[0].toUpperCase() + rid();
// First action wins: both managers can have the same request open. Before a decision, hold a short lease on the record,
// read it fresh, and stop with "who already did it" when the request is no longer in the state the button was drawn for.
const lastStep = d => { const h = (d && d.history || []).slice(-1)[0]; return h ? `${h.act} โดย ${(h.by && S.profiles[h.by]) || h.role || ''} เมื่อ ${fmtDT(h.at)}` : ''; };
async function claimFresh(col, id, ok, stepOf = lastStep) {
  let cur = S[col].get(id) || null;
  if (DB) {
    try {
      const ref = DB.collection(col).doc(id);
      if (typeof ref.acquire === 'function') {
        const lease = await ref.acquire({ holder: S.me.id || 'tab-' + TAB_ID, ttlMs: 8000 });
        if (lease && !lease.acquired) { toast('มีคนกำลังทำรายการนี้อยู่ รอสักครู่แล้วลองอีกครั้ง', 'bad'); return null; }
      }
      if (typeof ref.get === 'function') {
        const snap = await ref.get();
        cur = snap.exists ? snap.data() : null;
        if (cur) { S[col].set(id, cur); S.dataV++; }
      }
    } catch (e) { /* fall back to what this view already has */ }
  }
  if (!cur) { toast('ไม่พบรายการนี้แล้ว', 'bad'); render(); return null; }
  if (!ok(cur)) { const w = stepOf(cur); toast(`มีคนดำเนินการรายการนี้ไปก่อนแล้ว${w ? ': ' + w : ''}`, 'bad'); render(); return null; }
  return JSON.parse(JSON.stringify(cur));
}
async function connect() {
  const cl = window.claude;
  if (!cl || typeof cl.use !== 'function') { S.mode = 'local'; render(); return; }
  try {
    const [db, user, sample, assets, downloads] = await Promise.all([cl.use('db'), cl.use('user'), cl.use('sample'), cl.use('assets'), cl.use('downloads')]);
    S.cap.downloads = downloads || null;
    USER = user;
    S.cap.sample = sample || null;
    S.cap.assets = assets || null;
    if (sample) { try { const lim = await sample.limits(); S.cap.images = lim && lim.images ? lim.images : null; } catch (e) { S.cap.images = null; } }
    if (user) {
      S.me = await user.me();
      if (await user.can('data.write') === false) S.mode = 'readonly';
    }
    if (!db) { S.mode = 'local'; render(); return; }
    DB = db;
    if (S.mode !== 'readonly') S.mode = 'shared';
    COLS.forEach(col => db.collection(col).onSnapshot(snap => {
      S[col] = new Map(snap.docs.map(d => [d.id, d.data()]));
      if (col === 'ids') S.idsV++;
      S.dataV++;
      if (col === 'ids' && !S.seedTried && typeof carlogSeed === 'function') { S.seedTried = true; setTimeout(() => carlogSeed().catch(e => console.error('carlog seed', e)).then(() => perms().approve && perms().write && typeof lockIdsSync === 'function' ? lockIdsSync() : null).then(r => { if (r && (r.done || r.ask)) { toast(`ล็อกที่ IDS จัดสรรแล้ว: สำเร็จ ${r.done} · รอเลือกใบจอง ${r.ask}`); render(); } }).catch(e => console.error('lockids', e)), 6000); }
      scheduleRender();
    }, () => { toast('การเชื่อมต่อข้อมูลขาดหาย กรุณาโหลดหน้าใหม่', 'bad'); }));
    render();
  } catch (e) {
    S.mode = 'local'; render();
  }
}
function scheduleRender() {
  // a phone photo picker is open: redrawing now would replace the file input and its choice would be lost
  if (S.picking && Date.now() - S.picking < 180000) { S.pendingRender = true; return; }
  const a = document.activeElement;
  if (a && /INPUT|SELECT|TEXTAREA/.test(a.tagName) && a.type !== 'file' && ($('#main').contains(a) || $('#modal-root').contains(a))) { S.pendingRender = true; return; }
  render();
}
document.addEventListener('focusout', () => setTimeout(() => {
  if (S.picking) return;
  if (S.pendingRender && !(document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))) { S.pendingRender = false; render(); }
}, 0));

function actor() { return { by: S.me.id || null, role: roleLabel(), at: new Date().toISOString() }; }
async function names(ids) {
  const want = [...new Set(ids.filter(Boolean))].filter(id => !(id in S.profiles));
  if (!USER || !want.length) return;
  want.forEach(id => { S.profiles[id] = ''; });
  try { const ps = await USER.profiles(want); want.forEach(id => { S.profiles[id] = ps[id]?.name || ''; }); render(); } catch (e) { /* names are optional */ }
}
const who = h => {
  const n = h && h.by ? S.profiles[h.by] : '';
  return n ? `${esc(n)} <span class="text-muted">· ${esc(h?.role || '')}</span>` : `<span class="text-muted">${esc(h?.role || '')}</span>`;
};

// ------------------------------------------------------------------ photos and AI reading
async function shrink(file, max = 2000, q = 0.85) {
  // decode with createImageBitmap, falling back to an <img> element (iPhone gallery photos are often HEIC,
  // which some phones only decode that way); always hand back a JPEG so storage and AI accept it
  let src = null, w = 0, h = 0, url = null;
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); w = src.width; h = src.height; } catch (e) { src = null; }
  if (!src) {
    try {
      url = URL.createObjectURL(file);
      src = await new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = bad; im.src = url; });
      w = src.naturalWidth; h = src.naturalHeight;
    } catch (e) { src = null; }
  }
  try {
    if (!src || !w || !h) throw new Error('decode');
    const s = Math.min(1, max / Math.max(w, h));
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * s); cv.height = Math.round(h * s);
    cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(b => r(b), 'image/jpeg', q));
    if (blob) return blob;
    throw new Error('encode');
  } catch (e) {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return file;
    const err = new Error('เปิดรูปนี้ไม่ได้ ลองเลือกรูป JPG/PNG หรือกดถ่ายรูปแทน'); err.code = 'decode'; throw err;
  } finally { if (url) try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }
}
// Keeps the photo with the record. Returns an asset id, or null when this view cannot store files.
async function storeImage(blob) {
  if (S.cap.assets) {
    try {
      const r = await S.cap.assets.upload(blob, { type: blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg' });
      S.assetUrls[r.id] = r.url;
      return r.id;
    } catch (e) { toast(e && e.code === 'too_large' ? 'รูปใหญ่เกินไป' : 'เก็บรูปไม่สำเร็จ', 'bad'); return null; }
  }
  if (DB) return null;
  const id = 'local-' + rid();
  S.assetUrls[id] = URL.createObjectURL(blob);
  return id;
}
// on the AT Honda website (Supabase) photos come from private storage; in claude.ai from the artifact's store
const imgSrc = id => S.assetUrls[id] || (window.__assetUrl ? window.__assetUrl(id) : '/_blob/' + id);
const AI_ERR = {
  unavailable: 'หน้านี้ใช้ AI อ่านรูปไม่ได้ในมุมมองนี้ กรอกข้อมูลเองได้',
  not_granted: 'ยังไม่ได้อนุญาตให้หน้านี้ใช้ Claude อ่านรูป กรอกข้อมูลเองได้',
  sampling_disabled: 'บัญชีนี้ใช้ Claude อ่านรูปไม่ได้ กรอกข้อมูลเองได้',
  images_unavailable: 'มุมมองนี้ส่งรูปให้ AI ไม่ได้ กรอกข้อมูลเองได้',
  image_rejected: 'อ่านรูปนี้ไม่ได้ ลองถ่ายใหม่เป็น JPG หรือ PNG',
  rate_limited: 'ใช้ AI ถี่เกินไป รอสักครู่แล้วลองใหม่',
  invalid_json: 'AI ตอบไม่ครบ ลองกดอ่านอีกครั้ง',
  refused: 'AI ไม่อ่านรูปนี้ ลองรูปอื่นหรือกรอกเอง',
  session_expired: 'ต้องเข้าสู่ระบบ claude.ai ใหม่'
};
const aiMsg = e => AI_ERR[e && e.code] || 'AI อ่านไม่สำเร็จ ลองอีกครั้งหรือกรอกเอง';
async function aiRead(prompt, images, signal) {
  const sample = S.cap.sample;
  if (!sample || !S.cap.images) throw { code: sample ? 'images_unavailable' : 'unavailable' };
  return sample.json(prompt, { images, signal, modelTier: 'default', cache: false });
}
const catalogHint = () => Object.entries(CATALOG).map(([m, gs]) => Object.entries(gs).map(([g, cs]) => `${m} | ${g} | ${cs.join(' ')}`).join('\n')).join('\n');
