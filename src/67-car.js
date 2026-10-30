// ------------------------------------------------------------------ one car: everything known about it, in one window (13/10)
// Opened by clicking the frame number anywhere in สต็อก. Locks can be handled here as in "จัดการล็อก".
// Only function declarations here: the first render runs before this part of the file.
function carHist(vin, D) {
  const ev = [];
  D.locks.filter(l => l.vin === vin).forEach(l => (l.history || []).forEach(h => ev.push({ ...h, what: (LOCK_TYPE[l.type] || [l.type])[0] })));
  const o = S.vehicles.get(vin);
  if (o) {
    if (o.added) ev.push({ ...o.added, act: o.added.receipt ? 'รับรถเข้า (ยืนยันจากรูป)' : 'รับรถเข้า', what: 'รถ' });
    if (o.moved) ev.push({ ...o.moved, act: `ย้ายไป ${o.moved.to || o.branch || '?'}`, note: o.moved.from ? `จาก ${o.moved.from}${o.moved.from_upload ? ' · ตามการอัปโหลด Stock' : ''}` : '', what: 'รถ' });
    if (o.removed) ev.push({ ...o.removed, act: 'นำรถออก', note: o.removed.dealer || o.removed.note, what: 'รถ' });
    (o.special && o.special.hist || []).forEach(h => ev.push({ ...h, what: 'Stock พิเศษ', note: [h.note, h.price ? 'ราคา ' + fmtN(h.price) : ''].filter(Boolean).join(' · ') }));
    (o.special_log || []).forEach(h => ev.push({ ...h, what: 'Stock พิเศษ' }));
    if (o.prod_info) ev.push({ ...o.prod_info, act: 'ใส่วันผลิต', note: fmtD(o.prod_info.date), what: 'รถ' });
  }
  return ev.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
}
// any car the system knows: in stock, delivered, taken out, or only in the DL file (invoiced cars IDS has dropped from Stock)
function carAny(vin, D) {
  const c = D.cars.get(vin) || D.deliveredOut.find(x => x.vin === vin) || D.removed.find(x => x.vin === vin);
  if (c) return c;
  const i = D.invByVin.get(vin); if (!i) return null;
  const q = D.quota.find(x => x.vin === vin);
  return { vin, br: i.br, model: i.model, grade: i.grade, color: i.color, spec: specKey(i.model, i.grade, i.color), ref: q ? q.ref : null, status: i.company ? 'company' : i.ddate ? 'delivered' : 'invoiced',
    src: 'DL (ไม่อยู่ในไฟล์ Stock IDS)', age: null, lock: null, temps: [], cust: i.cust, bkno: i.no, fromInv: true };
}
// the car window's own lookup (13/10 → 26/10): cars IDS has dropped (delivered, taken out) never went through the status/age pass in derive,
// so they are completed here; a VIN known only from a booking or a keyed record still gets a window instead of "not found"
function carFull(vin, D) {
  const kind = D.cars.has(vin) ? '' : D.deliveredOut.some(x => x.vin === vin) ? 'delivered' : D.removed.some(x => x.vin === vin) ? 'removed' : '';
  const c0 = carAny(vin, D);
  if (c0 && !kind) return c0;
  const inv = D.invByVin.get(vin);
  const fill = o => {
    o.spec = o.spec || (o.model ? specKey(o.model, o.grade, o.color) : '');
    o.temps = o.temps || []; o.lock = o.lock || null;
    const basis = o.prod || o.consign || o.stockin;
    if (o.age === undefined || o.age === null) { o.age = basis ? daysBetween(basis, D.today) : null; o.ageFrom = o.prod ? 'prod' : o.consign ? 'consign' : o.stockin ? 'stockin' : null; }
    return o;
  };
  if (c0) { const o = fill({ ...c0 }); o.status = kind === 'removed' ? 'removed' : (inv && inv.company ? 'company' : 'delivered'); o.out = kind; return o; }
  // not in stock, not in DL: look for any record that names the car
  const a = D.at.find(x => !x.cancelled && atVin(x) === vin), ib = D.idsB.find(b => b.vin === vin), o = S.vehicles.get(vin);
  if (!a && !ib && !o) return null;
  const src = a || ib || {};
  return fill({ vin, br: (o && (o.branch || (o.moved && o.moved.to))) || src.br || null, model: src.model || null, grade: src.grade || null, color: src.color || null,
    status: 'unknown', out: 'unknown', src: 'ไม่อยู่ในไฟล์ Stock และ DL · ข้อมูลจากใบจอง', cust: src.cust || null, bkno: ib ? ib.no : null, fromInv: true });
}
function carStChip(c) { return CAR_STATUS[c.status] ? statusChip(CAR_STATUS, c.status) : chip({ removed: 'นำออกจาก Stock', unknown: 'ไม่อยู่ใน Stock' }[c.status] || c.status || '–', 'muted'); }
// where the car went / came from: taken out, moved between branches, handed over (data kept in vehicles/<vin> and the DL file)
function carOutRows(c, D, row) {
  const o = S.vehicles.get(c.vin) || {}, r = o.removed, mv = o.moved, by = x => x && x.by && S.profiles && S.profiles[x.by] ? (S.profiles[x.by].name || '') : '';
  const who = x => [x && x.role, by(x)].filter(Boolean).join(' ');
  return [
    r ? row('นำออกจาก Stock', `${r.at ? fmtDT(r.at) + ' · ' : ''}${esc(r.reason && typeof outFixWhy === 'function' ? outFixWhy({ reason: r.reason, text: r.dealer || r.note }) : (r.dealer || r.note || ''))}${who(r) ? ' · โดย ' + esc(who(r)) : ''}`) : '',
    mv ? row('ย้ายสาขา', `${esc(mv.from || '?')} → ${esc(mv.to || o.branch || '?')}${mv.at ? ' · ' + fmtDT(mv.at) : ''}${mv.from_upload ? ' · จากการอัปโหลด Stock' : ''}${who(mv) ? ' · โดย ' + esc(who(mv)) : ''}`) : '',
    c.fromBr && !mv ? row('โอนจากสาขา', esc(c.fromBr)) : '',
    c.handed ? row('ส่งมอบ (บันทึกในเว็บ)', `${fmtD(c.handed.date)}${c.handed.note ? ' · ' + esc(c.handed.note) : ''}`) : ''
  ].join('');
}
function carModal(m, D) {
  const c = carFull(m.vin, D);
  // a car that left the Stock file is still in the car log: show its history instead of "not found"
  if (!c && !isSales() && typeof carlogAll === 'function' && carlogAll().has(m.vin)) return carHistModal(m, D);
  if (!c) return `<p>ไม่พบรถคันนี้แล้ว</p><div class="flex justify-end mt-3"><button class="btn btn-ghost" data-act="close">ปิด</button></div>`;
  const p = perms(), inv = D.invByVin.get(c.vin), hideCust = isSales() && !(c.lock && isMine(c.lock.owner));
  const q = c.ref ? D.quota.find(x => x.ref === c.ref) : null;
  const bk = D.at.find(a => !a.cancelled && ((a.match && a.match.vin === c.vin) || (a.rec.flow && a.rec.flow.assign && a.rec.flow.assign.vin === c.vin)));
  const row = (k, v) => v === null || v === undefined || v === '' ? '' : `<tr><td class="text-muted nowrap">${k}</td><td>${v}</td></tr>`;
  const ls = carLocks(c, D), hist = carHist(c.vin, D);
  return `<div class="flex items-start justify-between gap-3 mb-2"><div><h2 class="font-head text-xl font-semibold"><span class="code">${esc(c.vin)}</span></h2>
      <div class="mt-1 flex flex-wrap gap-2">${c.status === 'temp' ? chip('ว่าง', 'good') : carStChip(c)} ${c.fromInv ? '' : tempChip(c)} ${chip(`${c.br} ${BR[c.br]?.name || ''}`, 'neutral')}</div>${c.fromInv ? '<p class="text-xs text-muted mt-1">รถคันนี้ไม่อยู่ในไฟล์ Stock IDS แล้ว (ออกใบกำกับแล้ว) แสดงข้อมูลจากไฟล์ DL</p>' : ''}</div>
    ${m.back ? '<button class="btn btn-dark btn-sm" data-act="car-back">← กลับ</button>' : '<button class="btn btn-ghost btn-sm" data-act="close">ปิด</button>'}</div>
  ${carWhyBox(c, D, inv, bk, hideCust)}
  ${spBox(c, D)}${rptBox(c)}${carCampBox(c, bk)}
  <div class="grid md:grid-cols-2 gap-5">
    <div><table class="tbl text-sm"><tbody>
      ${row('รุ่น เกรด สี', specLabel(c.spec))}
      ${row('ปีรุ่น', c.year ? `MY'${String(c.year).slice(-2)} (${c.year})` : '')}
      ${c.fromInv ? '' : row('วันผลิต', `${prodPlain(c)} ${prodBtn(c)}`)}
      ${row('อายุรถ', c.age !== null && c.age !== undefined ? `${c.age} วัน ${c.ageFrom === 'consign' ? '<span class="text-xs text-muted">(นับจากวันฝากศูนย์ ยังไม่มีวันผลิต)</span>' : ''}` : '')}
      ${row('วันที่ฝากศูนย์', c.consign ? fmtD(c.consign) : '')}
      ${row('วันที่เข้าสต็อก', c.stockin ? fmtD(c.stockin) : '')}
      ${row('เลขเครื่อง', c.engine ? `<span class="code">${esc(c.engine)}</span>` : '')}
      ${row('Quota (Ref)', c.ref ? `<span class="code">${esc(c.ref)}</span>${q ? ` · ส่ง ${fmtM(q.m)}${q.week ? ' W' + q.week : ''}` : ''}` : '')}
      ${row('ที่มาข้อมูล', esc(c.src || 'IDS'))}
      ${row('หมายเหตุใน IDS', esc(c.note || ''))}
      ${!isSales() ? row('ข้อความในชีต', c.bknote ? `"${esc(c.bknote)}"` : '') : ''}
      ${row('ใบจองใน IDS', c.bkno ? `<span class="code">${esc(c.bkno)}</span>${c.bkdate ? ` · จอง ${fmtD(c.bkdate)}` : ''}${c.cust && !hideCust ? ` · ${esc(c.cust)}` : c.cust ? ' · ลูกค้าของเซลล์อื่น' : ''}` : '')}
      ${row('วันที่จัดสรร', c.alloc ? fmtD(c.alloc) : '')}
      ${carOutRows(c, D, row)}
      ${inv ? row('ใบกำกับ (DL)', `${esc(inv.inv || '')} · ${fmtD(inv.idate)}${inv.ddate ? ` · ส่งมอบ ${fmtD(inv.ddate)}` : ' · ยังไม่ส่งมอบ'}${inv.company ? ' · รถบริษัท' : ''}${inv.sales && !isSales() ? ` · ${esc(inv.sales)}` : ''}`) : ''}
    </tbody></table>
    ${bk && (!isSales() || isMine(bk.sales)) ? `<div class="mt-3 p-3 rounded-lg text-sm" style="background:var(--surface-2)">ใบจอง AT Honda ที่ได้รถคันนี้: <b>${esc(bk.cust || '')}</b> · ${esc(bk.sales || '')} · ${bk.flow && bk.flow.next ? `ขั้นถัดไป ${FLOW_LABEL[bk.flow.next]}` : 'ส่งมอบแล้ว'} <button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(bk.id)}">เปิดใบจอง</button></div>` : ''}</div>
    <div class="flex flex-col gap-3 min-w-0">
      <section><h3 class="font-head font-semibold mb-2">ล็อก / คำขอ</h3>
        <div class="border border-line rounded-lg divide-y divide-line">${ls.map(l => lockRow(l, D)).join('') || `<div class="p-3 text-sm text-muted">ยังไม่มีคำขอล็อก</div>`}</div></section>
      <section><h3 class="font-head font-semibold mb-2">ประวัติ</h3>
        <div class="border border-line rounded-lg divide-y divide-line max-h-60 overflow-auto">${hist.slice(0, 40).map(e => `<div class="p-2 px-3 text-sm flex flex-wrap gap-x-3"><span class="num text-muted">${fmtDT(e.at)}</span><span class="font-medium">${esc(e.act)}</span><span class="text-muted">${esc(e.what || '')}${e.note ? ' · ' + esc(e.note) : ''}</span><span class="ml-auto text-xs">${who(e)}</span></div>`).join('') || '<div class="p-3 text-sm text-muted">ยังไม่มีประวัติในระบบนี้</div>'}</div></section>
    </div>
  </div>
  <div class="flex flex-wrap justify-end gap-2 mt-4">
    ${delivBtn(c, D, true)}
    ${carLockable(c) && p.write && p.request ? `<button class="btn btn-red" data-act="lock-open" data-vin="${esc(c.vin)}">${c.status === 'pending' ? 'ขอคิวต่อ' : 'ขอล็อกรถคันนี้'}</button>` : ''}
    ${p.remove && p.write && !c.lock && D.cars.has(c.vin) ? `<button class="btn btn-ghost" data-act="remove-open" data-vin="${esc(c.vin)}">นำรถออก / ย้ายสาขา</button>` : ''}
    ${m.back ? '<button class="btn btn-dark" data-act="car-back">← กลับไปหน้าก่อน</button>' : '<button class="btn btn-ghost" data-act="close">ปิด</button>'}</div>`;
}
// the frame number in a list, clickable
// the campaign option chosen for this frame number (in the booking's terms, or picked in the campaign report)
function carCampBox(c, bk) {
  const vin = String(c.vin || '').toUpperCase(), d = bk && bk.rec && bk.rec.deal, adm = !isSales();
  const box = (name, by, money, note) => `<div class="p-3 rounded-lg border border-line text-sm" style="background:var(--surface-2)"><b>แคมเปญที่เลือก</b>: ${esc(name || '–')}<div class="text-xs text-muted">${esc(by)}${money ? ' · เงิน Honda ' + fmtN(money) : ''}${note || ''}</div></div>`;
  // the sales see only the campaign they chose themselves; the admin's choice and Honda's money are for admin and up
  if (!adm) return bk && isMine(bk.sales) && d && d.at && d.sales_camp_id ? box(d.sales_camp || d.sales_camp_id, 'ที่คุณเลือก') : '';
  const pk = (((S.ref.get('honda_pay') || {}).picks || {})[vin]) || null, dc = d && d.at && d.campaign_id && d.campaign_id !== 'pending' ? d : null;
  if (dc) return box(d.campaign || d.campaign_text || d.campaign_id, d.adm_mode === 'own' ? 'แอดมินเลือก' : 'ตามที่เซลล์เลือก', num(d.margin_honda), d.sales_camp_id && d.sales_camp_id !== d.campaign_id ? ` · เซลล์เลือก: ${esc(d.sales_camp || d.sales_camp_id)}` : '');
  return pk && pk.cid ? box(pk.name, pk.auto ? 'ระบบจับคู่ตามไฟล์ Honda' : 'เลือกในรายงานแคมเปญ', Number(pk.sup) || 0, ' · ยังไม่ได้ใส่ในใบจอง') : '';
}
function vinLink(c) { return `<button class="code font-medium underline decoration-dotted text-left" data-act="car-open" data-vin="${esc(c.vin)}" title="ดูรายละเอียดรถ">${esc(c.vin)}</button>`; }
// the bookings waiting for one spec, in queue order (from the "รอรถ" number in สต็อก)
const QCOLS = [['pos', 'คิว'], ['date', 'วันที่จอง'], ['cust', 'ลูกค้า'], ['sales', 'เซลล์'], ['br', 'สาขา'], ['no', 'เลขใบจอง'], ['dep', 'มัดจำ/ฟอร์ม']];
function qRowVals(b) {
  const p = !isSales() || isMine(b.owner);
  const dep = b.app ? (b.app.rec.imported ? 'มีใบจองในฟอร์ม' : (b.app.deposit > 0 && b.app.slip ? 'มัดจำ ' + money(b.app.deposit) : 'ยังไม่มีมัดจำ/สลิป')) : (b.src === 'IDS' ? 'ยังไม่มีฟอร์ม AT' : '');
  return { pos: b.state === 'waiting' ? b.pos || 0 : 0, date: b.date || '', cust: p ? (b.cust || '') : 'ลูกค้าของเซลล์อื่น', sales: (b.app ? b.app.sales : null) || (b.src === 'IDS' ? b.sales : b.idsSales) || '', br: b.br || '', no: b.no || '', dep };
}
function qTableBody(m, D) {
  const f = m.qf || {}, so = m.qs || { c: 'pos', d: 1 };
  let rows = D.bookings.filter(b => b.spec === m.key && b.state === 'waiting').map(b => ({ b, v: qRowVals(b) }));
  rows = rows.filter(r => QCOLS.every(([k]) => !f[k] || String(k === 'date' ? fmtD(r.v.date) : r.v[k]).toLowerCase().includes(f[k].toLowerCase())));
  rows.sort((x, y) => { const a = x.v[so.c], c = y.v[so.c]; return (typeof a === 'number' ? a - c : String(a).localeCompare(String(c))) * so.d || x.v.pos - y.v.pos; });
  return `<tbody id="q-tb">${rows.map(({ b, v }) => `<tr><td>${chip('คิวที่ ' + v.pos, 'warn')}</td><td class="num">${fmtD(v.date)}</td><td>${custCell(b.cust, b.owner, { seed: b.seed })}</td><td>${esc(v.sales)}</td><td>${esc(v.br)}</td><td class="code">${esc(v.no) || '<span style="color:var(--warn)">ยังไม่มี</span>'}</td><td>${esc(v.dep)}${b.app && (!isSales() || isMine(b.owner)) ? ` <button class="underline text-xs" data-act="at-open" data-id="${esc(b.app.id)}">เปิดใบจอง</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="text-muted p-3">ไม่พบตามตัวกรอง</td></tr>'}</tbody>`;
}
function qCount(m, D) { const n = D.bookings.filter(b => b.spec === m.key && b.state === 'waiting').length; const t = (qTableBody(m, D).match(/<tr>/g) || []).length; return (m.qf && Object.values(m.qf).some(Boolean)) ? `แสดง ${t} จาก ${n} ใบ` : `${n} ใบ`; }
function specQueueModal(m, D) {
  const s = D.specs[m.key] || { waiting: 0, free: 0, incoming: 0 }, so = m.qs || { c: 'pos', d: 1 }, f = m.qf || {};
  return `<div class="flex items-start justify-between gap-3 mb-2"><div><h2 class="font-head text-xl font-semibold">คิวรอรถ · ${specLabel(m.key)}</h2>
    <p class="text-sm text-muted">รอรถ <b class="num" id="q-cnt">${qCount(m, D)}</b> · ว่าง <b class="num">${s.free}</b> คัน · Quota ว่าง <b class="num">${s.incoming}</b> · กดหัวคอลัมน์เพื่อเรียง พิมพ์ในช่องใต้หัวคอลัมน์เพื่อกรอง${isSales() ? ' · เซลล์เห็นชื่อลูกค้าเฉพาะของตัวเอง' : ''}</p></div>
    <button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="border border-line rounded-lg max-h-[60vh] overflow-auto"><table id="q-tbl"><thead><tr>${QCOLS.map(([k, t]) => `<th><button data-act="qsort" data-c="${k}" class="font-semibold">${t}${so.c === k ? (so.d > 0 ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}</tr>
    <tr>${QCOLS.map(([k]) => `<th><input data-qf="${k}" value="${esc(f[k] || '')}" placeholder="กรอง" class="w-full text-xs" style="min-width:60px"></th>`).join('')}</tr></thead>
    ${qTableBody(m, D)}</table></div>
  <div class="flex justify-end gap-2 mt-3"><button class="btn btn-ghost" data-act="close">ปิด</button></div>`;
}
document.addEventListener('input', e => {
  const k = e.target && e.target.dataset && e.target.dataset.qf; if (!k || !S.modal || S.modal.kind !== 'specq') return;
  e.stopPropagation(); const m = S.modal; (m.qf ||= {})[k] = e.target.value;
  const D = derive(), tb = document.getElementById('q-tb'), c = document.getElementById('q-cnt');
  if (tb) tb.outerHTML = qTableBody(m, D);
  if (c) c.textContent = qCount(m, D);
}, true);
Object.assign(ACTIONS, {
  'qsort'(el) { const m = S.modal; if (!m) return; const c = el.dataset.c, o = m.qs || { c: 'pos', d: 1 }; m.qs = { c, d: o.c === c ? -o.d : 1 }; render(); },
  'specnet'(el) { S.modal = { kind: 'specnet', key: el.dataset.key }; render(); },
  'specq-open'(el) { S.modal = { kind: 'specq', key: el.dataset.key }; render(); },
  // opened from another window (e.g. checking a delivery note): keep that window to go back to
  'car-open'(el) { const back = S.modal && S.modal.kind !== 'car' ? S.modal : null; S.modal = { kind: 'car', vin: el.dataset.vin, back }; render(); },
  'car-back'() { S.modal = (S.modal && S.modal.back) || null; render(); }
});
Object.assign(ACTIONS, {
  'qt-sort'(el) { const t = S.qt || (S.qt = { f: {}, s: { c: 'spec', d: 1 } }), c = el.dataset.c; t.s = { c, d: t.s.c === c && c !== 'spec' ? -t.s.d : 1 }; render(); },
  'qt-clear'() { if (S.qt) S.qt.f = {}; S.filters.qModel = ''; render(); }
});
