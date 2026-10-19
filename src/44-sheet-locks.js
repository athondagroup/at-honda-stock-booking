// ---------- holds typed into the Stock / Quota sheet, turned into lock requests that a manager approves (decided 12/10):
// - booking number + name in IDS = allocated by IDS ("จัดสรรแล้ว (IDS)"), not free, nothing to approve
// - nickname only ("จอห์น /")          = temporary lock request, 7 days from approval
// - nickname / customer ("มด/เปิ้ล")    = matched to an AT form booking → booking lock request, 15 days from approval;
//   the manager can pick another booking, from the AT form or from IDS (one customer may book 2 cars)
// - not matched                        = bookings of that sales / same model offered to pick (15 days); none picked = 7 days
// - text with no nickname ("ขาย สายสี่") = lock request to sell / trade with that dealer
const sheetTextOf = l => l.sheet_text || ((String(l.note || '').match(/^ข้อความเดิม: "([\s\S]*)"$/) || [])[1]) || null;
const sheetNorm = s => String(s || '').replace(/\s+/g, '');
const nickNorm = s => String(s || '').toLowerCase().replace(TONES, '').replace(/[^ก-๙a-z]/g, '');
function salesOfNick(who) {
  const nk = (S.ref.get('sales') && S.ref.get('sales').nick) || {}, names = salesNames(true);
  const look = k => {
    if (!k) return null;
    for (const [n, full] of Object.entries(nk)) if (nickNorm(n) === k) return full;
    return names.find(n => nickNorm(n) === k || nickNorm(n.split(' ')[0]) === k) || null;
  };
  const w = nickNorm(who);
  return look(w) || look(w.replace(/^(นอง|พี)/, '')) || null;
}
function parseSheetText(text) {
  const t = String(text || '').trim(), i = t.indexOf('/');
  const who = (i >= 0 ? t.slice(0, i) : t).trim(), cust = i >= 0 ? t.slice(i + 1).trim() : '';
  const sales = salesOfNick(who);
  if (cust) return { kind: 'named', who, sales, cust, text: t };
  if (sales || i >= 0) return { kind: 'nick', who, sales, cust: '', text: t };
  return { kind: 'dealer', who: '', sales: null, cust: '', dealer: t.replace(/^(ขายให้|ขาย|แลกให้|แลก)\s*/, '').trim() || t, text: t };
}
// the customer typed in the sheet is usually short (a first name or nickname): it is found inside the booking's name
const sheetNameHit = (full, cust) => { const k = normName(String(cust || '').split(/\s+/)[0]); return k.length >= 2 && normName(full || '').includes(k); };
// the system's own pick: an open AT form booking, same model, the customer's name in it (same sales first, then grade / colour)
function sheetAutoMatch(spec, p, D) {
  if (!p.cust) return null;
  const [model, grade, color] = spec.split('|');
  let c = D.at.filter(a => a.active && a.model === model && sheetNameHit(a.cust, p.cust));
  if (p.sales) c = c.filter(a => a.sales === p.sales).length ? c.filter(a => a.sales === p.sales) : c;
  c.sort((x, y) => (x.grade !== grade) - (y.grade !== grade) || (String(x.color).toUpperCase() !== color) - (String(y.color).toUpperCase() !== color));
  return c[0] || null;
}
// bookings a manager may pick for a request from the sheet: same customer name (AT form or IDS, any model: a 2nd car),
// and that sales' bookings of the same model
// q: the manager's own search (customer / booking no. / sales), for names spelt differently in the sheet; with no match
// by name or sales, bookings of the same spec from any sales are offered too
function sheetCands(l, D, q) {
  const p = parseSheetText(sheetTextOf(l) || '');
  const [model] = String(l.spec || '').split('|');
  const sales = l.sales || p.sales;
  const out = [], seen = new Set();
  for (const b of D.bookings) {
    if (b.state === 'cancel') continue;
    const a = b.app;
    if (a && !a.active) continue;
    const key = a ? a.key : b.key;
    if (seen.has(key)) continue;
    const name = !!p.cust && (sheetNameHit(b.cust, p.cust) || (a && sheetNameHit(a.cust, p.cust)));
    const sameModel = b.model === model || (a && a.model === model);
    const sameSpec = b.spec === l.spec || (a && a.spec === l.spec);
    const mine = !!sales && (b.owner === sales || (a && a.sales === sales));
    // the sheet may have it the other way round (customer / sales): the first part as the customer's name
    const name2 = !p.sales && !!p.who && (sheetNameHit(b.cust, p.who) || (a && sheetNameHit(a.cust, p.who)));
    const qk = q ? searchKey(q) : '';
    const qHit = !!qk && [b.cust, b.no, b.owner, b.sales, a && a.cust, a && a.sales, a && a.rec.booking_no].some(x => x && searchKey(x).includes(qk));
    const anySpec = !qk && sameSpec && b.state !== 'idscar';
    if (qk ? !qHit : !(name || name2 || (mine && sameModel) || anySpec)) continue;
    seen.add(key);
    const other = b.lock && b.lock.id !== l.id ? b.lock : null;
    // the car this booking already has: IDS allocation, another lock, or the car given in the delivery steps
    const fa = a && a.rec.flow && a.rec.flow.assign;
    const carVin = (b.state === 'idscar' && b.vin) || (other && other.status !== 'pending' && other.vin) || (fa && fa.vin) || (b.state === 'idscar' ? b.vin || null : null);
    const sameCar = !!(l.vin && carVin && carVin === l.vin);
    const carRef = !carVin && b.state === 'idscar' ? (b.ref || b.ws || null) : null;
    out.push({ key, b, a, name, sameModel, sameSpec, mine, other, carVin, carRef, sameCar, hasCar: !sameCar && (b.state === 'idscar' || (other && other.status !== 'pending') || !!(fa && fa.vin)),
      name: name || name2, qHit, score: qHit * 16 + (name || name2) * 8 + sameSpec * 4 + sameModel * 2 + mine * 1 - (b.state === 'idscar' ? 6 : 0) });
  }
  return out.sort((x, y) => (y.key === l.bkref) - (x.key === l.bkref) || y.score - x.score || (x.b.date || '').localeCompare(y.b.date || '')).slice(0, q ? 20 : 12);
}
function lockBkModal(m, D) {
  const l = D.locks.find(x => x.id === m.id);
  if (!l || l.status !== 'pending') return `<p>คำขอนี้ไม่ได้รออนุมัติแล้ว</p><button class="btn btn-ghost" data-act="close">ปิด</button>`;
  const p = parseSheetText(sheetTextOf(l) || ''), cands = sheetCands(l, D, m.q);
  const cur = m.pick ?? (l.type === 'booking' ? l.bkref : l.type);
  const sales = l.sales || p.sales;
  const canApprove = perms().write && (cur === 'dealer' ? perms().approveDealer : canApproveBr(l.car_br));
  const pickBtn = (v, body, on) => `<button class="pick text-left ${on ? 'on' : ''}" data-act="lockbk-pick" data-v="${esc(v)}" aria-pressed="${on}"><span class="flex-1 min-w-0">${body}</span></button>`;
  const tags = c => [c.name ? chip('ชื่อตรง', 'good') : c.qHit ? chip('ตรงกับที่ค้นหา', 'neutral') : '', c.sameSpec ? chip('สเปกตรง', 'good') : c.sameModel ? chip('รุ่นตรง', 'neutral') : chip('รุ่นอื่น', 'warn'), c.mine ? chip('เซลล์เดียวกัน', 'neutral') : '',
    c.key === l.bkref ? chip('ระบบจับคู่ให้', 'ink') : '', c.sameCar ? chip('IDS จัดสรรคันนี้ให้ใบจองนี้แล้ว', 'good') : c.hasCar ? chip('ใบจองนี้มีรถคันอื่นแล้ว', 'bad') : c.other ? chip('มีคำขอล็อกอื่นค้าง', 'warn') : ''].join(' ');
  const row = c => { const b = c.b, a = c.a;
    return pickBtn(c.key, `<span class="font-medium">${esc((a && a.cust) || b.cust || '–')}</span> ${tags(c)}
      <span class="block text-xs text-muted">${a ? 'ฟอร์ม AT' : 'IDS (ยังไม่มีฟอร์ม AT)'}${b.no ? ` · ใบจอง ${esc(b.no)}` : ''} · ${esc(b.br || '')} · ${esc((a && a.sales) || b.owner || '–')} · ${specLabelText((a && a.spec) || b.spec)} · จอง ${fmtD((a && a.date) || b.date)}${b.state === 'waiting' && b.pos ? ` · คิวที่ ${b.pos}` : ''}</span>${c.carVin || c.carRef ? `<span class="block text-xs" style="color:var(--${c.sameCar ? 'good' : 'bad'})">${c.sameCar ? 'เลขเฟรมเดียวกับคันนี้' : 'มีรถแล้ว'}: <span class="code">${esc(c.carVin || 'Quota ' + c.carRef)}</span>${c.other && c.other.vin === c.carVin ? ` (ล็อก${c.other.status === 'allocated' ? ' แจ้งจัดสรรแล้ว' : 'อยู่'})` : c.b.state === 'idscar' ? ' (IDS จัดสรร)' : ' (จัดสรรในขั้นตอนส่งมอบ)'}</span>` : ''}`, cur === c.key); };
  return `<div class="flex items-start justify-between gap-3 mb-1"><h2 class="font-head text-xl font-semibold">เลือกใบจองให้คำขอล็อก</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <p class="text-sm mb-1"><span class="code font-medium">${esc(l.vin || 'Quota ' + l.ref)}</span> · ${esc(l.car_br || '')} · ${specLabel(l.spec)}</p>
  <p class="text-sm mb-3">ข้อความในชีต: <b>"${esc(sheetTextOf(l) || '')}"</b> · เซลล์ ${sales ? esc(sales) : `<span style="color:var(--warn)">ยังไม่รู้ว่า "${esc(p.who)}" คือใคร</span>`}${p.cust ? ` · ลูกค้า ${esc(p.cust)}` : ''}</p>
  <div class="field mb-2"><label for="lb-q">ชื่อในชีตสะกดไม่ตรง? ค้นหาใบจอง (ชื่อลูกค้า / เลขใบจอง / เซลล์) ทุกสาขา</label><input id="lb-q" type="search" data-modal="q" value="${esc(m.q || '')}" placeholder="เช่น อนุศร หรือ 5101139295"></div>
  <div class="flex flex-col gap-2 max-h-[50vh] overflow-auto pr-1">
    ${cands.map(row).join('') || `<div class="text-sm text-muted p-2">${m.q ? `ไม่พบใบจองที่ตรงกับ "${esc(m.q)}"` : `ไม่พบใบจองที่ชื่อตรง${sales ? ` หรือใบจองรุ่นเดียวกันของ ${esc(sales)}` : ''} ลองค้นหาด้านบน`}</div>`}
    ${pickBtn('temp', `<span class="font-medium">ยังไม่มีใบจอง: ล็อกชั่วคราว ${LOCK_DAYS_BY.temp} วัน</span><span class="block text-xs text-muted">ให้ ${esc(sales || p.who || 'เซลล์')}${p.cust ? ` · ลูกค้า ${esc(p.cust)}` : ''} · เมื่อลูกค้ามาจอง เซลล์กด "ลูกค้ามาจองแล้ว"</span>`, cur === 'temp')}
    ${pickBtn('dealer', `<span class="font-medium">แลก/ขายดีลเลอร์อื่น</span><span class="block text-xs text-muted">พี่อั้มอนุมัติ</span>`, cur === 'dealer')}
  </div>
  ${cur === 'dealer' ? `<div class="field mt-3"><label for="lb-dealer" class="req">ชื่อดีลเลอร์</label><input id="lb-dealer" data-modal="dealer" value="${esc(m.dealer ?? l.dealer_name ?? p.dealer ?? '')}"></div>` : ''}
  <p class="text-xs text-muted mt-3">เลือกใบจองแล้ว อนุมัติได้ ${LOCK_DAYS_BY.booking} วัน · ไม่มีใบจอง ${LOCK_DAYS_BY.temp} วัน · นับจากวันอนุมัติ${cands.some(c => c.a === null) ? ' · ใบจองที่มีแต่ใน IDS เซลล์ต้องลงฟอร์ม AT ตามมา' : ''}</p>
  <div class="flex flex-wrap justify-end gap-2 mt-3"><button class="btn btn-ghost" data-act="close">ยกเลิก</button>
    <button class="btn btn-dark" data-act="lockbk-save" data-id="${esc(l.id)}">บันทึก</button>
    ${canApprove ? `<button class="btn btn-red" data-act="lockbk-save" data-id="${esc(l.id)}" data-approve="1">บันทึกและอนุมัติ</button>` : ''}</div>`;
}
// what the sheet holds that this system does not have yet: new text becomes a request, a changed text updates a waiting request.
// IDS allocation wins (cars IDS has taken are skipped); a lock already made in this system stays as it is.
function sheetPlan(D) {
  const units = [];
  // cars IDS has given to a booking are skipped; invoiced-not-delivered (advanced invoice) cars still count
  for (const c of D.cars.values()) if (c.src === 'IDS' && c.bknote && c.st !== 'booked' && branchOk(c.br)) units.push({ vin: c.vin, ref: c.ref || null, br: c.br, spec: c.spec, text: c.bknote });
  for (const q of D.quota) if (q.vnote && q.vnote.includes('/') && !q.vin && !q.bk && !q.booking && branchOk(q.br)) units.push({ vin: null, ref: q.ref, br: q.br, spec: q.spec, text: q.vnote });
  const plan = [];
  for (const u of units) {
    const on = D.locks.filter(l => (u.vin ? l.vin === u.vin : !l.vin && l.ref === u.ref));
    if (on.some(l => sheetNorm(sheetTextOf(l)) === sheetNorm(u.text))) continue;
    const wait = on.find(l => l.status === 'pending' && sheetTextOf(l));
    if (!wait && on.some(l => l.live)) continue;
    plan.push({ u, update: wait || null });
  }
  return plan;
}
function sheetLockFields(u, D) {
  const p = parseSheetText(u.text);
  const base = { vin: u.vin, ref: u.ref, car_br: u.br, spec: u.spec, reason: 'นำเข้าจากชื่อที่พิมพ์ไว้ในชีต Stock', note: `ข้อความเดิม: "${u.text}"`, sheet_text: u.text, imported: true,
    dealer_name: null, prospect: null, sales: null, sales_nick: null, bkref: null, bk_br: null, warnings: [] };
  if (p.kind === 'dealer') return { ...base, type: 'dealer', dealer_name: p.dealer };
  const warn = p.sales ? [] : [`ยังไม่รู้ว่า "${p.who}" คือเซลล์คนไหน`];
  const a = p.kind === 'named' ? sheetAutoMatch(u.spec, p, D) : null;
  const common = { sales: p.sales || (a && a.sales) || null, sales_nick: p.sales ? null : p.who || null, prospect: p.cust || null, warnings: warn };
  if (a) return { ...base, ...common, type: 'booking', bkref: a.key, bk_br: a.br };
  return { ...base, ...common, type: 'temp' };
}
function sheetSyncBox(D) {
  const plan = sheetPlan(D), add = plan.filter(x => !x.update).length, upd = plan.length - add;
  return `<section class="mb-5"><h2 class="font-head text-lg font-semibold mb-1">ล็อกจากชีต Stock</h2>
    <div class="bg-surface border border-line rounded-lg p-4 text-sm">
      <p>ทุกครั้งที่บันทึกไฟล์ Stock หรือ Quota ระบบดึงชื่อที่พิมพ์ไว้ในช่องเลขที่ใบจอง (เช่น "มด/เปิ้ล") มาเป็นคำขอล็อกให้ผู้จัดการอนุมัติ รถที่ IDS จัดสรรแล้ว (มีเลขที่ใบจอง) ใช้การจัดสรรจาก IDS</p>
      <p class="mt-2">${plan.length ? `ข้อมูลตอนนี้มีข้อความที่ยังไม่มีคำขอ <b>${add}</b> รายการ${upd ? ` · ข้อความเปลี่ยน ต้องอัปเดตคำขอเดิม <b>${upd}</b> รายการ` : ''}` : '<span class="text-muted">ข้อความในชีตมีคำขอล็อกครบแล้ว</span>'}</p>
      ${plan.length ? `<ul class="text-xs text-muted list-disc pl-5 mt-1">${plan.slice(0, 8).map(x => `<li><span class="code">${esc(x.u.vin || 'Quota ' + x.u.ref)}</span> ${esc(x.u.br)} · "${esc(x.u.text)}"${x.update ? ` (เดิม "${esc(sheetTextOf(x.update))}")` : ''}</li>`).join('')}</ul>
        <button class="btn btn-dark btn-sm mt-3" data-act="sheet-sync" ${perms().write ? '' : 'disabled'}>สร้างคำขอล็อกจากชีต</button>` : ''}
    </div></section>`;
}
// a request this person can decide: the manager of the car's branch (dealer trades: พี่อั้ม), the executive
const canDecideLock = l => l.status === 'pending' && perms().write && !(l.idsTook && !l.idsTook.same) && (l.type === 'dealer' ? perms().approveDealer : canApproveBr(l.car_br));
// ---------- the locks of one car, handled right from the stock page (approve, pick the booking, extend, release …)
const carLocks = (c, D) => D.locks.filter(l => (l.vin === c.vin || (!l.vin && c.ref && l.ref === c.ref))
  && (l.live || l.status === 'pending' || (l.idsTook && !l.idsTook.same && l.status === 'approved'))).filter(lockVisible)
  .sort((a, b) => (a.status === 'pending') - (b.status === 'pending') || (a.queuePos || 0) - (b.queuePos || 0));
function carLockBtn(c, D) {
  if (!D) return '';
  const n = carLocks(c, D).length;
  const sheetOnly = !n && c.bknote && c.st !== 'booked' && perms().upload && branchOk(c.br);
  if (!n && !sheetOnly) return '';
  const pend = carLocks(c, D).some(canDecideLock);
  return `<button class="btn ${pend ? 'btn-red' : 'btn-ghost'} btn-sm" data-act="carlock-open" data-vin="${esc(c.vin)}">${n ? `จัดการล็อก${n > 1 ? ` (${n})` : ''}` : 'สร้างคำขอจากชีต'}</button>`;
}
function carLockModal(m, D) {
  const c = D.cars.get(m.vin);
  if (!c) return `<p>ไม่พบรถคันนี้ในสต็อกแล้ว</p><button class="btn btn-ghost" data-act="close">ปิด</button>`;
  const ls = carLocks(c, D), p = perms();
  const plan = c.bknote ? sheetPlan(D).find(x => x.u.vin === c.vin) : null;
  return `<div class="flex items-start justify-between gap-3 mb-1"><h2 class="font-head text-xl font-semibold">ล็อกของรถคันนี้</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <p class="text-sm mb-1"><span class="code font-medium">${esc(c.vin)}</span> · ${esc(c.br)} · ${specLabel(c.spec)} · ${c.status === 'temp' ? chip('ว่าง', 'good') : statusChip(CAR_STATUS, c.status)} · ${prodPlain(c)} · อายุ ${c.age ?? '–'} วัน</p>
  ${c.bknote ? `<p class="text-sm mb-3">ข้อความในชีต: <b>"${esc(c.bknote)}"</b>${c.cust ? ` · ชื่อลูกค้าใน IDS ${esc(c.cust)}` : ''}</p>` : '<div class="mb-3"></div>'}
  <div class="border border-line rounded-lg divide-y divide-line">${ls.map(l => lockRow(l, D)).join('') || emptyBox('ยังไม่มีคำขอล็อกในระบบ', plan ? 'สร้างคำขอจากข้อความในชีตได้ตามกฎเดียวกับตอนอัปโหลด' : 'ขอล็อกได้จากปุ่มด้านล่าง')}</div>
  <div class="flex flex-wrap justify-end gap-2 mt-4">
    ${plan && p.upload && p.write ? `<button class="btn btn-dark" data-act="sheet-sync-one" data-vin="${esc(c.vin)}">${plan.update ? 'อัปเดตคำขอตามข้อความในชีต' : 'สร้างคำขอล็อกจากข้อความในชีต'}</button>` : ''}
    ${carLockable(c) && p.write && p.request ? `<button class="btn btn-ghost" data-act="lock-open" data-vin="${esc(c.vin)}">${c.status === 'pending' ? 'ขอคิวต่อ' : 'ขอล็อกใหม่'}</button>` : ''}
    <button class="btn btn-ghost" data-act="close">ปิด</button></div>`;
}
// the status itself opens the car's locks, so a pending request is approved or changed where it is seen
function carStatusCell(c, D) {
  const chips = `${c.status === 'temp' ? chip('ว่าง', 'good') : statusChip(CAR_STATUS, c.status)} ${tempChip(c)}`;
  if (!D || !carLocks(c, D).length) return chips;
  const pend = carLocks(c, D).some(canDecideLock);
  return `<button class="text-left inline-flex flex-wrap items-center gap-1" data-act="carlock-open" data-vin="${esc(c.vin)}" title="กดเพื่ออนุมัติหรือแก้ไขล็อก">${chips}<span class="text-xs underline ${pend ? '' : 'text-muted'}" ${pend ? 'style="color:var(--red)"' : ''}>${pend ? 'อนุมัติ/แก้' : 'ดูล็อก'}</span></button>`;
}
