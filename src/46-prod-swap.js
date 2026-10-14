// ---------- production date (วันที่ผลิต). IDS is the reference; when the IDS file has none, the admin keys it from the label
// on the car (a photo of the label can be attached and read by AI). Car age counts from this date.
const PROD_MIN = '2015-01-01';
const PROD_PROMPT = `This photo shows a label on a new Honda car in Thailand (for example the VIN / certification plate on the door pillar, or a label under the hood) that states when the car was manufactured.
Reply with only this JSON:
{"date":"YYYY-MM-DD"|null,"month":"YYYY-MM"|null,"vin":string|null,"text":string|null}
Rules:
- date is the date of manufacture when the label prints day, month and year. If it prints only month and year, set date to null and fill month.
- Thai labels may use the Buddhist Era (for example 2569); convert to the Gregorian year by subtracting 543.
- vin is the 17-character frame number when it is visible on the label (it never contains the letters I, O or Q).
- text is the manufacture date exactly as printed on the label (for example "09/2026" or "MFD 2026.09.15").
- Use null when a value cannot be read with confidence. Do not guess.`;
// the branch admin, or the manager of the car's branch (the executive: every branch)
const canProd = c => !!c && perms().write && canAllocBr(c.br);
const prodPlain = c => c && c.prod ? `ผลิต ${fmtD(c.prod)}` : 'ไม่มีวันผลิต';
function prodText(c) {
  if (!c) return '';
  if (!c.prod) return '<span style="color:var(--warn)">ยังไม่มีวันผลิต</span>';
  return `ผลิต <span class="num">${fmtD(c.prod)}</span>${c.prodSrc === 'key' ? ' <span class="text-muted">(คีย์จากป้าย)</span>' : ''}${c.prodDiff ? ` <span style="color:var(--warn)">· ที่คีย์ไว้ ${fmtD(c.prodKey)} ไม่ตรงกับ IDS</span>` : ''}`;
}
const ageFromNote = c => !c || c.age === null || c.age === undefined || c.ageFrom === 'prod' ? '' : c.ageFrom === 'consign' ? 'นับจากวันที่รถฝากศูนย์ (ยังไม่มีวันผลิต)' : 'นับจากวันที่ stock in (ยังไม่มีวันผลิต)';
const prodBtn = c => canProd(c) && !c.prodIds ? `<button class="underline text-xs" data-act="prod-open" data-vin="${esc(c.vin)}">${c.prodKey ? 'แก้วันผลิต' : 'ใส่วันผลิต'}</button>` : '';
// where the label photo and the AI read live: the production-date window itself, or one car of a delivery note
const prodSlot = i => (i === '' || i === undefined || i === null) ? S.modal : ((S.modal.pimg ||= [])[Number(i)] ||= {});
// date field + label photo + AI read; o = { id, path, val, max, img, i, required, dis, note }
function prodField(o) {
  const slot = o.slot || {}, pic = slot.pic, ai = slot.ai, img = o.img;
  const aiLine = ai ? (ai.state === 'running' ? '<span class="spin"></span> AI กำลังอ่านวันผลิตจากป้าย…'
    : `<span style="color:var(--${ai.state === 'error' ? 'bad' : ai.tone === 'warn' ? 'warn' : 'good'})">${esc(ai.msg)}</span>${pic && aiReady() ? ` <button class="underline" data-act="prod-ai" data-i="${o.i ?? ''}">อ่านอีกครั้ง</button>` : ''}`)
    : pic && aiReady() ? `<button class="btn btn-ghost btn-sm" data-act="prod-ai" data-i="${o.i ?? ''}">ให้ AI อ่านวันผลิต</button>` : '<span class="text-muted">ตรวจวันที่ในช่องกับรูปป้ายก่อนบันทึก</span>';
  return `<div class="grid grid-cols-[1fr_auto] gap-2 items-end">
      <div class="field"><label for="${o.id}" class="${o.required ? 'req' : ''}">วันที่ผลิต (วัน/เดือน/ปี จากป้ายที่รถ)</label><input id="${o.id}" type="date" data-modal="${o.path}" value="${esc(o.val || '')}" min="${PROD_MIN}" max="${o.max || todayISO()}" ${o.dis || ''}></div>
      <label class="btn btn-ghost btn-sm relative ${o.dis ? 'opacity-50' : ''}">${pic || img ? 'เปลี่ยนรูปป้าย' : 'ถ่ายรูปป้ายที่รถ'}<input type="file" accept="image/*" capture="environment" data-prodfile="${o.i ?? ''}" class="absolute w-px h-px opacity-0" ${o.dis || ''} aria-label="รูปป้ายวันผลิตที่รถ"></label>
    </div>
    ${o.note ? `<div class="text-xs text-muted">${o.note}</div>` : ''}
    ${pic || img ? `<div class="flex items-start gap-3"><img class="thumb" style="width:72px;height:72px;object-fit:cover" src="${pic ? pic.url : imgSrc(img)}" alt="รูปป้ายวันผลิตที่รถ"><div class="text-xs flex-1 min-w-0">${aiLine}</div></div>` : ''}`;
}
function prodModal(m, D) {
  const c = D.cars.get(m.vin);
  if (!c) return `<p>ไม่พบรถคันนี้ในสต็อก</p><button class="btn btn-ghost" data-act="close">ปิด</button>`;
  const can = canProd(c) && !c.prodIds;
  const pi = c.prodInfo || {};
  return `<div class="flex items-start justify-between gap-3 mb-1"><h2 class="font-head text-xl font-semibold">วันที่ผลิต</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <p class="text-sm mb-3"><span class="code font-medium">${esc(c.vin)}</span> ${specLabel(c.spec)} · ${esc(c.br)}</p>
  <div class="flex flex-col gap-3">
    <table class="tbl text-sm"><tbody>
      <tr><td class="text-muted nowrap">จากไฟล์ IDS</td><td>${c.prodIds ? fmtD(c.prodIds) : 'ยังไม่มีในไฟล์ IDS'}</td></tr>
      <tr><td class="text-muted nowrap">คีย์จากป้ายที่รถ</td><td>${c.prodKey ? `${fmtD(c.prodKey)} · ${who(pi)} ${pi.at ? fmtDT(pi.at) : ''}` : '–'}</td></tr>
      <tr><td class="text-muted nowrap">ระบบใช้</td><td>${c.prod ? `${fmtD(c.prod)} (${c.prodSrc === 'IDS' ? 'IDS' : 'คีย์'})` : '–'} · อายุรถ ${c.age ?? '–'} วัน${ageFromNote(c) ? ` <span class="text-muted">${ageFromNote(c)}</span>` : ''}</td></tr>
    </tbody></table>
    ${c.prodIds ? `<p class="text-sm ${c.prodDiff ? '' : 'text-muted'}" ${c.prodDiff ? 'style="color:var(--warn)"' : ''}>IDS มีวันผลิตแล้ว ระบบใช้ค่าจาก IDS${c.prodDiff ? ' · ค่าที่คีย์ไว้ไม่ตรงกับ IDS ตรวจป้ายที่รถอีกครั้ง' : ''}</p>${pi.img ? `<img class="thumb" style="width:120px;height:120px;object-fit:cover" src="${imgSrc(pi.img)}" alt="รูปป้ายวันผลิตที่คีย์ไว้">` : ''}` : ''}
    ${can ? prodField({ id: 'pd-date', path: 'date', val: m.date ?? c.prodKey ?? '', max: c.consign && c.consign < todayISO() ? c.consign : todayISO(), img: pi.img, slot: m, i: '', required: true,
      note: c.consign ? `ต้องไม่หลังวันที่รถฝากศูนย์ ${fmtD(c.consign)}` : '' })
      : !c.prodIds ? `<p class="text-sm text-muted">ใส่วันผลิตได้เฉพาะแอดมินสาขา ${esc(c.br)} หรือ${MGR_NAME[c.br] || 'ผู้จัดการ'}</p>` : ''}
    <div class="flex justify-end gap-2"><button class="btn btn-ghost" data-act="close">ปิด</button>${can ? '<button class="btn btn-red" data-act="prod-save">บันทึกวันผลิต</button>' : ''}</div>
  </div>`;
}

// ---------- changing the car of a booking (เปลี่ยนคัน / เปลี่ยนเฟรม): managers only, same spec only.
// A car from another branch can be taken straight away (no request); that branch's manager is told.
const SWAP_REASONS = ['ลูกค้าขอเปลี่ยนคัน', 'รถมีตำหนิ/เสียหาย', 'สลับให้ลูกค้าที่รับรถก่อน', 'เลขตัวถังเดิมผิด', 'อื่น ๆ'];
// the booking's current car: its live booking lock (approved or allocated), otherwise the car assigned in the delivery step
function swapCtx(D, o) {
  let lock = o.lockId ? D.locks.find(x => x.id === o.lockId) || null : null;
  const a = lock ? (lock.booking && lock.booking.app) || null : D.at.find(x => x.id === o.atId) || null;
  if (!lock && a) lock = D.locks.find(x => x.live && x.type === 'booking' && ['approved', 'allocated'].includes(x.status) && (x.bkref === a.key || (a.row && x.bkref === a.row.key))) || null;
  if (lock && !(['approved', 'allocated'].includes(lock.status) && lock.type === 'booking' && lock.vin)) lock = null;
  const assigned = a && a.rec.flow && a.rec.flow.assign ? a.rec.flow.assign.vin : null;
  const fromVin = (lock && lock.vin) || assigned || null;
  const fromCar = fromVin ? D.cars.get(fromVin) || null : null;
  const row = a ? a.row : lock ? lock.booking : null;
  const spec = a ? a.spec : row ? row.spec : lock ? lock.spec : null;
  const bkBr = a ? a.br : (lock && lock.bk_br) || (row && row.br) || null;
  const fromBr = fromCar ? fromCar.br : lock ? lock.car_br : null;
  return { lock, a, row, fromVin, fromCar, fromBr, spec, bkBr, assigned };
}
const swapOpen = x => !!x && !!x.fromVin && (x.a ? !x.a.cancelled && !x.a.flow.done.delivered : !!x.lock);
const canSwap = x => swapOpen(x) && perms().write && (canApproveBr(x.bkBr) || canApproveBr(x.fromBr));
// free cars of the same spec in every branch, oldest production first
const swapCands = (D, x) => [...D.cars.values()].filter(c => c.vin !== x.fromVin && c.spec === x.spec && carLockOpen(c))
  .sort((p, q) => (q.age ?? -1) - (p.age ?? -1));
function swapModal(m, D) {
  const x = swapCtx(D, m);
  if (!swapOpen(x)) return `<p>ใบจองนี้ไม่มีรถที่ล็อกหรือจัดสรรไว้ หรือส่งมอบแล้ว</p><button class="btn btn-ghost" data-act="close">ปิด</button>`;
  const cands = swapCands(D, x), pick = m.to ? D.cars.get(m.to) : null;
  const cust = x.a ? x.a.cust : x.row ? x.row.cust || '' : '';
  const owner = x.a ? x.a.sales : x.lock ? x.lock.owner || '' : '';
  const po = x.a && x.a.flow.done.po;
  const pickCar = c => `<button class="pick text-left ${m.to === c.vin ? 'on' : ''}" data-act="swap-pick" data-vin="${esc(c.vin)}" aria-pressed="${m.to === c.vin}">
      <span class="flex-1 min-w-0"><span class="code font-medium">${esc(c.vin)}</span> ${c.br !== x.bkBr ? chip(`สาขา ${c.br}`, 'neutral') : ''} ${c.temps.length ? chip(`ล็อกชั่วคราว ${c.temps.length}`, 'warn') : ''}
      <span class="block text-xs text-muted">${c.br} ${BR[c.br].name} · ${prodPlain(c)} · อายุ ${c.age ?? '–'} วัน${c.ref ? ' · Ref ' + esc(c.ref) : ''}</span></span></button>`;
  const steps = [
    `ปล่อยรถคันเดิม <span class="code">${esc(x.fromVin)}</span> ${x.lock ? 'กลับเป็นรถว่าง' : ''}`,
    `ล็อกคันใหม่ให้ใบจองนี้ทันที ไม่ต้องขออนุมัติ${x.lock && x.lock.end ? ` วันหมดล็อกเท่าเดิม (${fmtD(x.lock.end)})` : ''}`,
    x.assigned ? 'เปลี่ยนรถที่จัดสรรในขั้นตอนส่งมอบเป็นคันใหม่' : '',
    po ? 'ใบแต่งรถ (PO) จะพิมพ์ด้วยเลขตัวถังใหม่ ถ้าฝ่ายอะไหล่เริ่มติดตั้งแล้ว แจ้งฝ่ายอะไหล่ด้วย' : '',
    (x.lock && x.lock.status === 'allocated') || (!x.lock && x.assigned) ? `แอดมินสาขา ${esc(x.fromBr || '')} ยกเลิกการจัดสรรคันเดิมใน IDS · แอดมินสาขาของคันใหม่จัดสรรคันใหม่ใน IDS` : 'แอดมินสาขาของคันใหม่จัดสรรคันใหม่ใน IDS',
    pick && mgrRoleOf(pick.br) !== S.role.role ? `รถอยู่สาขา ${pick.br} ระบบแจ้ง${MGR_NAME[pick.br]}ให้ทราบ` : '',
    owner ? `แจ้งเซลล์ ${esc(owner)}` : ''
  ].filter(Boolean);
  return `<div class="flex items-start justify-between gap-3 mb-1"><h2 class="font-head text-xl font-semibold">เปลี่ยนคัน</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <p class="text-sm mb-3">${cust ? esc(cust) + ' · ' : ''}${specLabel(x.spec)} · ใบจองสาขา ${esc(x.bkBr || '')}${owner ? ` · เซลล์ ${esc(owner)}` : ''}</p>
  <div class="flex flex-col gap-4">
    <div class="p-3 rounded-lg text-sm" style="background:var(--surface-2)">คันปัจจุบัน <span class="code font-medium">${esc(x.fromVin)}</span> · ${esc(x.fromBr || '')}${x.fromCar ? ` · ${prodPlain(x.fromCar)} · อายุ ${x.fromCar.age ?? '–'} วัน` : ''}${x.lock ? ` · ${x.lock.status === 'allocated' ? 'แจ้งจัดสรรแล้ว รอไฟล์ IDS' : 'ล็อกแล้ว'}` : ' · จัดสรรในขั้นตอนส่งมอบ'}</div>
    <div><div class="text-sm font-medium mb-1">เลือกคันใหม่ (สเปกเดียวกันเท่านั้น เรียงวันผลิตเก่าก่อน)</div>
      <div class="flex flex-col gap-2 max-h-64 overflow-auto pr-1">${cands.map(pickCar).join('') || `<div class="text-sm" style="color:var(--bad)">ไม่มีรถว่างสเปกนี้ในทุกสาขา</div>`}</div>
      <p class="text-xs text-muted mt-2">ถ้าลูกค้าจะเปลี่ยนรุ่น เกรด หรือสี ต้องแก้ไขใบจองก่อน แล้วจึงล็อกรถคันใหม่${x.a && canEditBooking(x.a) ? ` <button class="underline" data-act="edit-open" data-id="${esc(x.a.id)}">แก้ไขใบจอง</button>` : ''}</p></div>
    <div class="grid sm:grid-cols-2 gap-3">
      <div class="field"><label for="sw-reason" class="req">เหตุผลที่เปลี่ยนคัน</label><select id="sw-reason" data-modal="reason">${opt(SWAP_REASONS, m.reason, 'เลือกเหตุผล')}</select></div>
      <div class="field"><label for="sw-note" class="${m.reason === 'อื่น ๆ' ? 'req' : ''}">รายละเอียด</label><input id="sw-note" data-modal="note" value="${esc(m.note || '')}"></div>
    </div>
    ${pick ? `<div class="p-3 rounded-lg text-sm" style="background:var(--warn-soft)"><b>เมื่อกดเปลี่ยนคัน</b><ul class="list-disc pl-5">${steps.map(s => `<li>${s}</li>`).join('')}</ul></div>` : ''}
    <div class="flex justify-end gap-2"><button class="btn btn-ghost" data-act="close">ยกเลิก</button><button class="btn btn-red" data-act="swap-submit" ${pick && canSwap(x) ? '' : 'disabled'}>เปลี่ยนคัน</button></div>
  </div>`;
}
// past swaps of one booking, shown in the delivery steps
const swapHist = a => (a.rec.swaps || []).length ? `<div class="text-xs text-muted mt-1">${a.rec.swaps.map(s => `เปลี่ยนคัน <span class="code">${esc(s.from_vin)}</span> → <span class="code">${esc(s.to_vin)}</span> · ${esc(s.reason)}${s.note ? ' ' + esc(s.note) : ''} · ${who(s)} ${fmtDT(s.at)}`).join('<br>')}</div>` : '';
