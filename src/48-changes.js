// ---------- one booking: owner confirmation, match confirmation, edit / cancel requests, refund form
// Key fields change only after a manager approves; the rest take effect at once.
const CHANGE_KEYS = { customer: 'ชื่อลูกค้า', model: 'Model', grade: 'Grade', color: 'รหัสสี', sales: 'เซลล์เจ้าของเคส', purchase: 'เงื่อนไขการซื้อ', finance: 'บริษัทไฟแนนซ์', discount: 'ส่วนลด', foc_total: 'FOC ที่ใช้ทั้งหมด',
  booking_date: 'วันที่จอง', deposit: 'ยอดมัดจำ', receipt_no: 'เลขที่ใบเสร็จมัดจำ', paper_no: 'เลขที่ใบจองสาขา' };
// money and document fields: only the branch admin (or the manager) changes them, the manager confirms
const ADMIN_KEYS = ['booking_date', 'deposit', 'receipt_no', 'paper_no'];
// the manager keeps the old queue place only with a reason
const QUEUE_KEEP_REASONS = ['ลงรุ่น/เกรด/สีผิดตั้งแต่แรก ลูกค้าไม่ได้เปลี่ยน', 'ลูกค้าเปลี่ยนก่อนมีรถให้จัดสรร ไม่กระทบคิวคนอื่น', 'สเปกใหม่มีรถว่าง ไม่ต้องแย่งคิว', 'ผู้บริหารอนุมัติเป็นกรณีพิเศษ', 'อื่น ๆ'];
const canAdminEdit = a => (S.role.role === 'admin' && a.br === S.role.branch) || canApproveBr(a.br);
// model / grade / colour can be typed only before the booking is in IDS; after that the system follows IDS
const specLocked = a => !!a.match;
function queuePick(path, q, a) {
  q = q || {};
  return `<div class="mt-3 p-3 rounded-lg" style="background:var(--surface-2)"><div class="text-sm font-medium mb-2">ลำดับคิวหลังเปลี่ยนรุ่น เกรด หรือสี</div>
    <div class="flex flex-wrap gap-4 text-sm"><label class="inline-flex items-center gap-2"><input type="radio" name="${path}-q" data-modal="${path}.queue" value="new" ${q.queue !== 'keep' ? 'checked' : ''}> ต่อคิวใหม่ (นับจากวันที่อนุมัติ)</label>
      <label class="inline-flex items-center gap-2"><input type="radio" name="${path}-q" data-modal="${path}.queue" value="keep" ${q.queue === 'keep' ? 'checked' : ''}> ใช้คิวเดิม (จอง ${fmtD(a.qdate || a.date)})</label></div>
    ${q.queue === 'keep' ? `<div class="grid sm:grid-cols-2 gap-3 mt-2"><div class="field"><label for="${path}-kr" class="req">ทำไมให้คิวเดิม</label><select id="${path}-kr" data-modal="${path}.keep_reason">${opt(QUEUE_KEEP_REASONS, q.keep_reason, 'เลือกเหตุผล')}</select></div>
      <div class="field"><label for="${path}-kn" class="${q.keep_reason === 'อื่น ๆ' ? 'req' : ''}">รายละเอียด</label><input id="${path}-kn" data-modal="${path}.keep_note" value="${esc(q.keep_note || '')}"></div></div>` : ''}</div>`;
}
const INSTANT_KEYS = { booking_no: 'เลขที่ใบจอง IDS', insurance: 'ประกันภัย', source: 'แหล่งที่มา', lead_id: 'Lead ID', delivery_plan: 'วันนัดรับรถ', note: 'หมายเหตุ' };
const SPEC_KEYS = ['model', 'grade', 'color'];
const CANCEL_REASONS = ['ลูกค้ายกเลิก', 'ไฟแนนซ์ไม่ผ่าน', 'เปลี่ยนรุ่น ลงใบจองใหม่แล้ว', 'ลงฟอร์มซ้ำ', 'อื่น ๆ'];
const REFUND = { refund: 'คืนเงินมัดจำ', forfeit: 'ไม่คืน (ริบมัดจำ)', transfer: 'โอนไปใช้กับใบจองใหม่' };
const MULTI_REASONS = ['ซื้อเพิ่มอีกคัน (จอง 2 คัน)', 'เปลี่ยนรุ่น (ขอยกเลิกใบเดิม)', 'คนละคน ชื่อซ้ำ', 'อื่น ๆ'];
const THAI_BANKS = ['กสิกรไทย (KBANK)', 'ไทยพาณิชย์ (SCB)', 'กรุงเทพ (BBL)', 'กรุงไทย (KTB)', 'กรุงศรีอยุธยา (BAY)', 'ทหารไทยธนชาต (ttb)', 'ออมสิน (GSB)', 'ธ.ก.ส. (BAAC)', 'ยูโอบี (UOB)', 'ซีไอเอ็มบี ไทย (CIMBT)', 'เกียรตินาคินภัทร (KKP)', 'แลนด์ แอนด์ เฮ้าส์ (LH Bank)', 'ทิสโก้ (TISCO)', 'อาคารสงเคราะห์ (GHB)', 'อื่น ๆ'];
const fieldVal = (k, v) => v === null || v === undefined || v === '' ? '–' : (k === 'discount' || k === 'foc_total' || k === 'deposit') ? money(v) : (k === 'delivery_plan' || k === 'booking_date') ? fmtD(v) : String(v);
const changeText = ch => ch && ch.type === 'merge' ? `ลงซ้ำ ขอรวมกับใบจอง ${ch.into_label || ''}` : Object.keys(ch.fields || {}).map(k => `${CHANGE_KEYS[k] || INSTANT_KEYS[k] || k}: ${fieldVal(k, (ch.old || {})[k])} → ${fieldVal(k, ch.fields[k])}`).join(' · ');
// the role that asked (one sales, or the branch admin desk) can withdraw its own request
const isRequester = ch => !!ch && ch.role === roleLabel();
const canOwnerConfirm = a => perms().write && (isMine(a.sales) || (S.role.role === 'admin' && a.br === S.role.branch) || canApproveBr(a.br));
const canDecideBooking = a => perms().write && canApproveBr(a.br);
const canRequestChange = a => perms().write && !canApproveBr(a.br) && (isMine(a.sales) || (S.role.role === 'admin' && a.br === S.role.branch));
const nameOk = (x, y) => keyScore(nameKey(x), nameKey(y)) >= 2;
const logLine = h => `<div class="text-xs text-muted">${fmtDT(h.at)} · ${esc(h.act)}${h.note ? ` · ${esc(h.note)}` : ''} · ${who(h)}</div>`;
const box = (tone, html) => `<div class="p-3 rounded-lg text-sm" style="background:var(--${tone}-soft, var(--surface-2));${tone === 'surface' ? '' : `color:var(--fg)`};border-left:3px solid var(--${tone === 'surface' ? 'line' : tone})">${html}</div>`;

// same customer name in IDS but the model differs: show both side by side and let a person decide
function matchAskBox(a) {
  const mm = a.match, r = mm.recs.find(x => x.kind === 'booking') || mm.recs[0];
  const can = canEditBooking(a) && perms().write;
  const row = (k, x, y) => `<tr><td class="text-muted nowrap">${k}</td><td>${esc(x || '–')}</td><td ${x !== y ? 'style="color:var(--warn);font-weight:600"' : ''}>${esc(y || '–')}</td></tr>`;
  return box('warn', `<b>${mm.status === 'possible' ? 'ชื่อลูกค้าตรงกับ IDS แต่รุ่นไม่ตรง' : 'รุ่น เกรด หรือสี ในฟอร์มไม่ตรงกับ IDS'}</b> ตรวจว่าเป็นใบจองเดียวกันหรือลูกค้าจองเพิ่มอีกคัน · ใบเดียวกันระบบจะใช้ข้อมูลตาม IDS และได้คิวเดิม
    <table class="tbl text-sm mt-2"><thead><tr><th></th><th>ฟอร์ม AT</th><th>IDS (${esc({ booking: 'Booking', stock: 'Stock', dl: 'DL' }[r.kind])})</th></tr></thead><tbody>
      ${row('ลูกค้า', a.cust, r.name)}${row('รุ่น', a.model, r.model)}${row('เกรด', gradeShort(a.model, a.grade), gradeShort(r.model, r.grade))}${row('สี', a.color, r.color)}
      ${row('สาขา', a.br, r.br)}${row('วันที่', fmtD(a.date), fmtD(r.date))}${row('เซลล์', a.sales, r.sales || '')}${row('เลขที่ใบจอง', a.rec.booking_no || '', r.no || '')}</tbody></table>
    ${can ? `<div class="flex flex-wrap gap-2 mt-2">
      <button class="btn btn-dark btn-sm" data-act="match-edit" data-id="${esc(a.id)}" data-key="${esc(r.key)}" title="แก้รุ่น เกรด สี และเลขที่ใบจองในเว็บและในชีตให้ตรงกับ IDS คิวเดิม">ใช่ ใบเดียวกัน → แก้ไขการจองตาม IDS</button>
      ${r.kind === 'booking' ? `<button class="btn btn-ghost btn-sm" data-act="match-more" data-id="${esc(a.id)}" data-key="${esc(r.key)}" data-no="${esc(r.no || '')}">ไม่ใช่ ลูกค้าจองเพิ่มอีกคัน → ลงใบจองคันที่ 2</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-act="match-no" data-id="${esc(a.id)}" data-key="${esc(r.key)}">ไม่ใช่ คนละคน ชื่อซ้ำ</button></div>` : '<div class="text-xs mt-2">เซลล์เจ้าของ แอดมินสาขา หรือผู้จัดการเป็นคนยืนยัน</div>'}`);
}
// unmatched booking with the same name elsewhere in IDS (other dates, branches or models)
function nearBox(a) {
  const can = canEditBooking(a) && perms().write;
  return box('warn', `<b>พบชื่อคล้ายใน IDS</b> (ไม่จับคู่ให้อัตโนมัติเพราะรุ่น สาขา หรือวันที่ไม่เข้ากัน)
    ${a.near.map(h => `<div class="mt-2 pt-2 border-t border-line"><div>${{ dl: 'DL', booking: 'Booking', stock: 'Stock' }[h.kind]} ${esc(h.br)} ${h.inv ? `ใบกำกับ ${esc(h.inv)}` : h.no ? `ใบจอง ${esc(h.no)}` : ''} ${fmtD(h.ddate || h.date)} · ${esc(h.name)} · ${esc(h.model || '')} ${esc(gradeShort(h.model, h.grade) || '')}</div>
      ${h.other ? `<div class="text-xs"><b>ใช้กับใบจอง AT ของ ${esc(h.other.sales || '')} (${esc(h.other.model)} จอง ${fmtD(h.other.date)}) แล้ว</b></div>` : ''}
      ${can ? `<div class="flex flex-wrap gap-2 mt-1">${h.other
        ? `<button class="btn btn-ghost btn-sm" data-act="merge-open" data-id="${esc(a.id)}" data-into="${esc(h.other.id)}">ลงซ้ำ → รวมกับใบจองนั้น (ไม่นับยกเลิก)</button>
           <button class="btn btn-ghost btn-sm" data-act="match-second" data-id="${esc(a.id)}" data-key="${esc(h.key)}" data-other="${esc(h.other.id)}">ไม่ซ้ำ เป็นคันที่ 2 (ยังไม่ลง IDS)</button>`
        : `<button class="btn btn-dark btn-sm" data-act="match-yes" data-id="${esc(a.id)}" data-key="${esc(h.key)}">ใช่ ใบนี้</button>
           <button class="btn btn-ghost btn-sm" data-act="match-no" data-id="${esc(a.id)}" data-key="${esc(h.key)}">ไม่ใช่</button>`}</div>` : ''}</div>`).join('')}`);
}
// IDS keyed the booking under another sales ID
function ownerBox(m, a) {
  const st = a.ownerCheck, oc = a.rec.owner_confirm, od = a.rec.owner_dispute;
  if (!st) return '';
  if (st === 'confirmed') return `<div class="text-xs text-muted">ใน IDS คีย์ด้วย ID ${esc(a.idsSales)} · ${oc.result === 'reassigned' ? `ผู้จัดการกำหนดเจ้าของเคสเป็น ${esc(a.sales)}` : `ยืนยันแล้วว่าเป็นเคสของ ${esc(a.sales)}`} · ${who(oc)} ${fmtDT(oc.at)}</div>`;
  if (st === 'auto') return `<div class="text-xs text-muted">ใน IDS คีย์ด้วย ID ${esc(a.idsSales)} · ส่งมอบแล้ว นับเป็นของ ${esc(a.sales)} ตามฟอร์ม AT</div>`;
  const pickOwner = canApproveBr(a.br) && perms().write ? `<div class="grid sm:grid-cols-[1fr_auto] gap-2 items-end mt-2"><div class="field"><label for="ow-pick">เจ้าของเคส</label><select id="ow-pick" data-modal="owner_pick">${opt(salesNames(), m.owner_pick ?? a.sales)}</select></div>
      <button class="btn btn-dark btn-sm" data-act="owner-set" data-id="${esc(a.id)}">ยืนยันเจ้าของเคส</button></div>` : '';
  if (st === 'disputed') return box('bad', `<b>${esc(a.sales)} แจ้งว่าไม่ใช่เคสของตัวเอง</b> · IDS คีย์ด้วย ID ${esc(a.idsSales)}${od.note ? `<div>${esc(od.note)}</div>` : ''}<div class="text-xs">${who(od)} ${fmtDT(od.at)}</div>
    ${pickOwner || '<div class="text-xs mt-1">รอผู้จัดการเลือกเจ้าของเคส</div>'}`);
  const can = canOwnerConfirm(a);
  return box('warn', `<b>ยืนยันเจ้าของเคส</b> ใน IDS คีย์ด้วย ID <b>${esc(a.idsSales)}</b> แต่ฟอร์ม AT เป็นของ <b>${esc(a.sales)}</b> (เช่น ใช้ ID เก่าหรือยืม ID) ยืนยันครั้งเดียว แล้วจะไม่เตือนอีก
    ${can ? `${m.owner_no ? `<div class="field mt-2"><label for="ow-note">ไม่ใช่เคสของ ${esc(a.sales)} เพราะ</label><input id="ow-note" data-modal="owner_note" value="${esc(m.owner_note || '')}" placeholder="เช่น เป็นลูกค้าของ…"></div>
        <div class="flex gap-2 mt-2"><button class="btn btn-dark btn-sm" data-act="owner-no" data-id="${esc(a.id)}">ส่งให้ผู้จัดการเลือกเจ้าของ</button><button class="btn btn-ghost btn-sm" data-act="owner-no-cancel">กลับ</button></div>`
      : `<div class="flex flex-wrap gap-2 mt-2"><button class="btn btn-dark btn-sm" data-act="owner-yes" data-id="${esc(a.id)}">เคสของ ${esc(a.sales)}</button><button class="btn btn-ghost btn-sm" data-act="owner-no-open">ไม่ใช่เคสของ ${esc(a.sales)}</button></div>`}` : ''}
    ${canApproveBr(a.br) && !m.owner_no ? pickOwner : ''}`);
}
// a pending edit or cancel request
function changeBox(m, a) {
  const ch = a.change;
  if (!ch) return '';
  if (ch.type === 'merge') return mergeChangeBox(a, ch);
  const dec = canDecideBooking(a), mine = isRequester(ch);
  const diff = ch.type === 'edit' ? `<table class="tbl text-sm mt-2"><thead><tr><th>ช่อง</th><th>เดิม</th><th>ขอเปลี่ยนเป็น</th></tr></thead><tbody>${Object.keys(ch.fields).map(k => `<tr><td class="nowrap">${CHANGE_KEYS[k] || k}</td><td>${esc(fieldVal(k, ch.old[k]))}</td><td style="font-weight:600">${esc(fieldVal(k, ch.fields[k]))}</td></tr>`).join('')}</tbody></table>
    ${SPEC_KEYS.some(k => k in ch.fields) ? '<div class="text-xs mt-1" style="color:var(--bad)">เปลี่ยนรุ่น เกรด หรือสี: ผู้จัดการเลือกต่อคิวใหม่หรือใช้คิวเดิม (ต้องมีเหตุผล) และระบบปล่อยล็อก/การจัดสรรรถเดิม</div>' : ''}` : '';
  const cx = m.cx || {};
  const decide = ch.type === 'cancel'
    ? `<div class="grid sm:grid-cols-3 gap-3 mt-3 items-end"><div class="field"><label for="cx-rf">เงินมัดจำ</label><select id="cx-rf" data-modal="cx.refund">${Object.entries(REFUND).map(([k, t]) => `<option value="${k}" ${(cx.refund || ch.refund || 'refund') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        ${(cx.refund || ch.refund || 'refund') === 'refund' ? `<div class="field"><label for="cx-am">ยอดคืน (บาท)</label><input id="cx-am" type="number" min="0" step="100" data-modal="cx.amount" value="${esc(cx.amount ?? a.deposit ?? '')}"></div>` : '<div></div>'}
        <div class="field"><label for="cx-nt" class="req">เหตุผลที่อนุมัติ</label><input id="cx-nt" data-modal="cx.note" value="${esc(cx.note || '')}"></div>
        ${(cx.refund || ch.refund || 'refund') === 'transfer' ? `<div class="sm:col-span-3">${trFields('cx', { ...cx, to: cx.tto ?? ch.to ?? '' }, a, derive())}</div>` : ''}</div>
      <div class="flex flex-wrap gap-2 mt-2"><button class="btn btn-red btn-sm" data-act="chg-approve" data-id="${esc(a.id)}">อนุมัติยกเลิก</button><button class="btn btn-ghost btn-sm" data-act="chg-reject" data-id="${esc(a.id)}">ไม่อนุมัติ</button></div>`
    : `${SPEC_KEYS.some(k => k in ch.fields) ? queuePick('cx', cx, a) : ''}<div class="field mt-3"><label for="cx-nt">หมายเหตุ (ต้องใส่เมื่อไม่อนุมัติ)</label><input id="cx-nt" data-modal="cx.note" value="${esc(cx.note || '')}"></div>
      <div class="flex flex-wrap gap-2 mt-2"><button class="btn btn-red btn-sm" data-act="chg-approve" data-id="${esc(a.id)}">อนุมัติการแก้ไข</button><button class="btn btn-ghost btn-sm" data-act="chg-reject" data-id="${esc(a.id)}">ไม่อนุมัติ</button></div>`;
  return box(ch.type === 'cancel' ? 'bad' : 'warn', `<b>${ch.type === 'cancel' ? 'ขอยกเลิกใบจอง' : 'ขอแก้ไขใบจอง'} รอผู้จัดการอนุมัติ</b>
    <div>${ch.type === 'cancel' ? `เหตุผล: ${esc(ch.reason)}${ch.note ? ` · ${esc(ch.note)}` : ''}` : `เหตุผล: ${esc(ch.reason || '–')}`}</div>${diff}
    <div class="text-xs mt-1">ขอโดย ${who(ch)} ${fmtDT(ch.at)}</div>
    ${dec ? decide : `<div class="text-xs mt-1">รอ${MGR_NAME[a.br] || 'ผู้จัดการ'}อนุมัติ (สาขา ${esc(a.br || '')})</div>`}
    ${mine && p_write() ? `<div class="mt-2"><button class="btn btn-ghost btn-sm" data-act="chg-withdraw" data-id="${esc(a.id)}">ถอนคำขอ</button></div>` : ''}`);
}
const p_write = () => perms().write;
// the edit form (opens inside the booking window)
function editPanel(m, a) {
  const e = m.edit, direct = canApproveBr(a.br), adm = canAdminEdit(a), locked = specLocked(a);
  const grades = e.model ? Object.keys(CATALOG[e.model] || {}) : [];
  const colors = e.model && e.grade ? CATALOG[e.model]?.[e.grade] || [] : [];
  const F = (k, label, inner) => `<div class="field"><label for="ed-${k}">${label}</label>${inner}</div>`;
  const inp = (k, type = 'text', extra = '') => `<input id="ed-${k}" type="${type}" data-modal="edit.${k}" value="${esc(e[k] ?? '')}" ${extra}>`;
  const sel = (k, list, ph) => `<select id="ed-${k}" data-modal="edit.${k}">${opt(list, e[k] ?? '', ph)}</select>`;
  const keyDiff = editKeyDiff(e, a);
  const specDiff = SPEC_KEYS.some(k => keyDiff.includes(k));
  return `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">แก้ไขใบจอง</h2>
      <p class="text-sm text-muted">${esc(a.cust)} · ${esc(a.model)} ${esc(gradeShort(a.model, a.grade))} ${esc(a.color)} · จอง ${fmtD(a.date)}</p></div><button class="btn btn-ghost btn-sm" data-act="edit-back">กลับ</button></div>
    <p class="text-sm mb-3">${direct ? `${esc(roleLabel())} แก้ได้ทันที ระบบเก็บประวัติว่าใครแก้อะไร` : `ช่องในกรอบ "ต้องให้ผู้จัดการอนุมัติ" จะเปลี่ยนหลัง${MGR_NAME[a.br] || 'ผู้จัดการ'}กดอนุมัติ ช่องอื่นมีผลทันที`}</p>
    <fieldset class="border border-line rounded-lg p-3 grid sm:grid-cols-3 gap-3"><legend class="text-sm font-semibold px-1">${direct ? 'ข้อมูลหลัก' : 'ต้องให้ผู้จัดการอนุมัติ'}</legend>
      ${F('customer', 'ชื่อลูกค้า', inp('customer', 'text', 'autocomplete="off"'))}
      ${F('sales', 'เซลล์เจ้าของเคส', sel('sales', salesNames().includes(e.sales) || !e.sales ? salesNames() : [e.sales, ...salesNames()]))}
      ${F('purchase', 'เงื่อนไขการซื้อ', sel('purchase', ['ไฟแนนซ์', 'ซื้อสด']))}
      ${locked ? `<div class="sm:col-span-3 text-sm p-2 rounded" style="background:var(--surface-2)">รุ่น เกรด สี: <b>${esc(a.model)} ${esc(gradeShort(a.model, a.grade))} ${esc(a.color)}</b> ${a.matchAsk ? '· ยืนยันการจับคู่กับ IDS ก่อน' : '· ตามข้อมูล IDS แก้ที่นี่ไม่ได้'}
          <div class="text-xs text-muted mt-1">ลูกค้าเปลี่ยนรุ่น: แก้ใน IDS แล้วอัปโหลดไฟล์ ระบบใช้รุ่นตาม IDS เอง คิวเดิม</div></div>`
        : `${F('model', 'Model', sel('model', Object.keys(CATALOG), 'เลือกรุ่น'))}
      ${F('grade', 'Grade', `<select id="ed-grade" data-modal="edit.grade" ${e.model ? '' : 'disabled'}>${opt(grades, e.grade, 'เลือกเกรด')}</select>`)}
      ${F('color', 'รหัสสี', `<select id="ed-color" data-modal="edit.color" ${e.grade ? '' : 'disabled'}>${opt(colors, e.color, 'เลือกสี')}</select>`)}`}
      ${e.purchase === 'ไฟแนนซ์' ? F('finance', 'บริษัทไฟแนนซ์', sel('finance', FINANCE)) : ''}
      ${F('discount', 'ส่วนลด (บาท)', inp('discount', 'number', 'min="0" step="100"'))}
      ${F('foc_total', 'FOC ที่ใช้ทั้งหมด (บาท)', inp('foc_total', 'number', 'min="0" step="100"'))}
      ${F('booking_date', 'วันที่จอง', inp('booking_date', 'date', `max="${todayISO()}" ${adm ? '' : 'disabled'}`))}
      ${F('deposit', 'ยอดมัดจำ (บาท)', inp('deposit', 'number', `min="0" step="100" ${adm ? '' : 'disabled'}`))}
      ${F('receipt_no', 'เลขที่ใบเสร็จมัดจำ', inp('receipt_no', 'text', `autocomplete="off" ${adm ? '' : 'disabled'}`))}
      ${F('paper_no', 'เลขที่ใบจองสาขา (เช่น SPH 60/21)', inp('paper_no', 'text', `autocomplete="off" ${adm ? '' : 'disabled'}`))}
      ${adm ? '' : '<div class="sm:col-span-3 text-xs text-muted">วันที่จอง ยอดมัดจำ และเลขที่ใบเสร็จมัดจำ แอดมินสาขาเป็นคนแก้ แล้วผู้จัดการยืนยัน</div>'}
      ${specDiff && direct ? `<div class="sm:col-span-3">${queuePick('eq', m.eq, a)}</div>` : specDiff ? '<div class="sm:col-span-3 text-xs" style="color:var(--bad)">เปลี่ยนรุ่น เกรด หรือสี: ผู้จัดการจะเลือกต่อคิวใหม่หรือใช้คิวเดิม และระบบปล่อยล็อก/การจัดสรรรถเดิม อย่าลืมแก้ใน IDS ด้วย</div>' : ''}
    </fieldset>
    <fieldset class="border border-line rounded-lg p-3 grid sm:grid-cols-3 gap-3 mt-3"><legend class="text-sm font-semibold px-1">มีผลทันที</legend>
      ${F('booking_no', 'เลขที่ใบจอง IDS', inp('booking_no', 'text', 'inputmode="numeric" maxlength="12"'))}
      ${F('insurance', 'ประกันภัย', sel('insurance', INSURANCE))}
      ${F('source', 'แหล่งที่มาของการจอง', sel('source', [...(e.source && !SOURCES.includes(e.source) && e.source !== 'อื่น ๆ' ? [e.source] : []), ...SOURCES, 'อื่น ๆ'], 'เลือกแหล่งที่มา'))}
      ${e.source === 'อื่น ๆ' ? F('source_x', 'แหล่งที่มาอื่น (พิมพ์)', `<input id="ed-source_x" data-modal="edit.source_x" value="${esc(e.source_x || '')}" maxlength="60" placeholder="เช่น TikTok, งานบูธ">`) : ''}
      ${F('lead_id', 'Lead ID', inp('lead_id'))}
      ${F('delivery_plan', 'วันนัดรับรถ', inp('delivery_plan', 'date'))}
      ${F('note', 'หมายเหตุ', inp('note'))}
    </fieldset>
    ${!direct && keyDiff.length ? `<div class="field mt-3"><label for="ed-reason" class="req">เหตุผลที่ขอแก้ (ผู้จัดการจะเห็น)</label><input id="ed-reason" data-modal="edit_reason" value="${esc(m.edit_reason || '')}"></div>` : ''}
    <div class="flex flex-wrap gap-2 mt-3 items-center"><button class="btn btn-red" data-act="edit-save" data-id="${esc(a.id)}">${direct ? 'บันทึก' : keyDiff.length ? 'บันทึก และส่งขออนุมัติ' : 'บันทึก'}</button><button class="btn btn-ghost" data-act="edit-back">ยกเลิก</button>
      ${keyDiff.length ? `<span class="text-sm text-muted">เปลี่ยน ${keyDiff.map(k => CHANGE_KEYS[k]).join(', ')}</span>` : ''}</div>`;
}
// key fields this person changed (spec only before IDS; deposit / date / receipt only for the admin or manager)
function editKeyDiff(e, a) {
  return Object.keys(CHANGE_KEYS).filter(k => !(SPEC_KEYS.includes(k) && specLocked(a)) && !(ADMIN_KEYS.includes(k) && !canAdminEdit(a))
    && String(cleanVal(k, e[k]) ?? '') !== String(a.rec[k] ?? ''));
}
// cancel: sales and admin ask, a manager approves with a reason and decides the deposit
function cancelPanel(m, a) {
  const c = m.cancel, direct = canApproveBr(a.br);
  return box('bad', `<b>${direct ? 'ยกเลิกใบจอง' : 'ขอยกเลิกใบจอง'}</b>${direct ? '' : ' ผู้จัดการเป็นคนอนุมัติ'}
    <div class="grid sm:grid-cols-2 gap-3 mt-2"><div class="field"><label for="cn-r">เหตุผล</label><select id="cn-r" data-modal="cancel.reason">${opt(CANCEL_REASONS, c.reason)}</select></div>
      <div class="field"><label for="cn-n" class="${c.reason === 'อื่น ๆ' || c.reason === 'ไฟแนนซ์ไม่ผ่าน' || direct ? 'req' : ''}">${direct ? 'เหตุผลแบบเต็ม (ตามใบถอนจอง)' : 'รายละเอียด (ตามใบถอนจอง)'}</label><textarea id="cn-n" rows="2" data-modal="cancel.note">${esc(c.note || '')}</textarea></div>
      <div class="field"><label for="cn-ph" class="req">เบอร์โทรลูกค้า (ให้ CR โทรตรวจสอบ)</label><input id="cn-ph" type="tel" inputmode="tel" data-modal="cancel.phone" value="${esc(c.phone || a.rec.phone || '')}" placeholder="08x-xxx-xxxx"></div>
      <div class="field"><label for="cn-dt" class="req">วันที่ลูกค้าขอถอนจอง</label><input id="cn-dt" type="date" max="${todayISO()}" data-modal="cancel.req_date" value="${esc(c.req_date || todayISO())}"></div>
      ${cxBkFields(c, a)}
      ${c.reason === 'ไฟแนนซ์ไม่ผ่าน' ? cxFinTried(c) : ''}
      <div class="sm:col-span-2">${cxDocTicks(c)}</div>
      ${direct ? `<div class="field"><label for="cn-rf">เงินมัดจำ</label><select id="cn-rf" data-modal="cancel.refund">${Object.entries(REFUND).map(([k, t]) => `<option value="${k}" ${(c.refund || 'refund') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        ${(c.refund || 'refund') === 'refund' ? `<div class="field"><label for="cn-am">ยอดคืน (บาท)</label><input id="cn-am" type="number" min="0" step="100" data-modal="cancel.amount" value="${esc(c.amount ?? a.deposit ?? '')}"></div>` : ''}
        ${c.refund === 'transfer' ? trFields('cancel', c, a, derive()) : ''}` : ''}</div>
    <div class="flex flex-wrap gap-2 mt-3"><button class="btn btn-red btn-sm" data-act="cancel-submit" data-id="${esc(a.id)}">${direct ? 'ยืนยันยกเลิกใบจอง' : 'ส่งคำขอยกเลิก'}</button><button class="btn btn-ghost btn-sm" data-act="cancel-close">กลับ</button></div>`);
}
// after a cancel is approved: what happened to the deposit, and the refund form for accounting
function cancelledBox(m, a) {
  const c = a.rec.cancel || {}, rf = a.rec.refund || null;
  const can = canEditBooking(a) && perms().write;
  return box('surface', `<b>ยกเลิกแล้ว</b> ${fmtDT(c.at || a.rec.cancelled_at)}${c.reason ? ` · ${esc(c.reason)}` : ''}${c.req_note ? ` · ${esc(c.req_note)}` : ''}
    ${c.at ? `<div class="text-xs mt-1">${c.req ? `ขอโดย ${who(c.req)} · ` : ''}อนุมัติโดย ${who(c)}${c.note ? ` · ${esc(c.note)}` : ''}</div>` : ''}
    ${c.refund ? `<div class="mt-1">เงินมัดจำ: <b>${esc(REFUND[c.refund] || c.refund)}</b>${c.refund === 'refund' ? ` ${money(c.amount)} บาท` : ''}</div>` : ''}
    ${trOutBox(a, derive())}
    ${c.refund === 'refund' ? (rf && rf.at ? `<div class="text-xs mt-1">บัญชีคืนเงิน: ${esc(rf.bank)} ${esc(rf.account_no)} ${esc(rf.account_name)} · ${who(rf)} ${fmtDT(rf.at)}</div>` : '<div class="text-xs mt-1" style="color:var(--warn)">ยังไม่ได้กรอกบัญชีคืนเงินลูกค้า</div>') : ''}
    ${c.doc_no ? `<div class="text-xs mt-1">เลขที่เอกสาร <span class="code">${esc(c.doc_no)}</span></div>` : ''}
    <div class="flex flex-wrap gap-2 mt-2">${c.refund === 'refund' && can ? `<button class="btn btn-dark btn-sm" data-act="refund-open" data-id="${esc(a.id)}">${rf && rf.at ? 'แก้ข้อมูลบัญชี' : 'กรอกบัญชีคืนเงิน แล้วพิมพ์เอกสาร'}</button>` : ''}
      ${c.at && (c.refund !== 'refund' || (rf && rf.at)) ? `<button class="btn btn-ghost btn-sm" data-act="cx-print" data-id="${esc(a.id)}">${c.refund === 'refund' ? 'พิมพ์ใบอนุมัติยกเลิก และขอคืนเงินจอง' : 'พิมพ์ใบอนุมัติยกเลิกการจอง'} (PDF / รูป)</button>` : ''}</div>
    ${c.at ? cxExecBox(a) : ''}
    <div class="text-xs mt-1 text-muted">ยกเลิกใบจองใน IDS ด้วย ถ้ายังไม่ได้ยกเลิก</div>`);
}
function refundPanel(m, a) {
  const f = m.refund, c = a.rec.cancel || {}, ai = S.ai.refund;
  const ok = f.account_name ? nameOk(f.account_name, a.cust) : null;
  const pic = S.files.passbook[0] ? S.files.passbook[0].url : f.img ? imgSrc(f.img) : null;
  return `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">บัญชีคืนเงินจองลูกค้า</h2>
      <p class="text-sm text-muted">${esc(a.cust)} · ${esc(a.model)} ${esc(gradeShort(a.model, a.grade))} · คืน ${money(c.amount)} บาท · ชื่อบัญชีต้องตรงกับชื่อผู้จอง</p></div><button class="btn btn-ghost btn-sm" data-act="refund-back">กลับ</button></div>
    <div class="grid md:grid-cols-2 gap-5">
      <div class="flex flex-col gap-2 text-sm"><div class="font-medium">ตรวจหน้าสมุดบัญชีจากเอกสารกระดาษ</div>
        <label class="flex items-start gap-2"><input type="checkbox" class="w-5 h-5 mt-0.5" data-modal="refund.passbook_ok" ${f.passbook_ok ? 'checked' : ''}><span class="req">แนบสำเนาหน้าสมุดบัญชี (กระดาษ) แล้ว และตรวจว่าเลขบัญชี ชื่อบัญชีตรงกับที่กรอก</span></label>
        <p class="text-xs text-muted">ไม่ต้องถ่ายรูปเก็บในเว็บ ฝ่ายบัญชีตรวจจากเอกสารที่แนบกับใบถอนจอง</p></div>
      <div class="flex flex-col gap-3">
        <div class="field"><label for="rf-bank" class="req">ธนาคาร</label><select id="rf-bank" data-modal="refund.bank">${opt(THAI_BANKS, f.bank, 'เลือกธนาคาร')}</select></div>
        ${f.bank === 'อื่น ๆ' ? `<div class="field"><label for="rf-bank2" class="req">ชื่อธนาคาร</label><input id="rf-bank2" data-modal="refund.bank_other" value="${esc(f.bank_other || '')}"></div>` : ''}
        <div class="field"><label for="rf-no" class="req">เลขที่บัญชี</label><input id="rf-no" class="code" inputmode="numeric" data-modal="refund.account_no" value="${esc(f.account_no || '')}" autocomplete="off"></div>
        <div class="field"><label for="rf-nm" class="req">ชื่อบัญชี</label><input id="rf-nm" data-modal="refund.account_name" value="${esc(f.account_name || '')}" autocomplete="off"></div>
        <div class="field"><label for="rf-ph" class="req">เบอร์โทรลูกค้า (ให้ CR โทรตรวจสอบ)</label><input id="rf-ph" type="tel" inputmode="tel" data-modal="refund.phone" value="${esc(f.phone || '')}"></div>
        ${ok === null ? '' : `<div class="text-sm" style="color:var(--${ok ? 'good' : 'bad'})">${ok ? `✓ ชื่อบัญชีตรงกับชื่อผู้จอง (${esc(a.cust)})` : `✕ ชื่อบัญชีไม่ตรงกับชื่อผู้จอง "${esc(a.cust)}" ต้องเป็นบัญชีชื่อผู้จองเท่านั้น`}</div>`}
        <div class="flex flex-wrap gap-2"><button class="btn btn-red" data-act="refund-save" data-id="${esc(a.id)}">บันทึกและพิมพ์</button><button class="btn btn-ghost" data-act="refund-back">กลับ</button></div>
      </div></div>`;
}
const REFUND_PROMPT = `This photo is the first page of a Thai bank savings passbook (หน้าสมุดบัญชี) or a bank account screen.
Copy exactly as printed. Return JSON only: {"bank": "<bank name in Thai or English as printed, or null>", "account_no": "<account number digits with dashes as printed, or null>", "account_name": "<account holder name as printed, or null>"}.
Use null for anything you cannot read with confidence. Do not output national ID numbers, addresses or balances.`;
// the refund request for accounting, saved as a PDF or a picture (printing is not available inside claude.ai)
function printRefund(a) {
  const c = a.rec.cancel || {}, rf = a.rec.refund || {}, req = c.req || {};
  const spec = { title: 'ใบขออนุมัติคืนเงินจอง', sub: `บริษัท เอที ฮอนด้า ออโตโมบิล จำกัด สาขา${BR[a.br]?.name || ''} · วันที่ ${fmtD(todayISO())}`, blocks: [
    { kv: [['เลขที่ใบจอง', a.no || a.rec.booking_no || '', 'วันที่จอง', fmtD(a.date)], ['ชื่อผู้จอง', a.cust || '', 'พนักงานขาย', a.sales || ''],
      ['รุ่นรถ', `${a.model || ''} ${a.grade || ''}`, 'สี', a.color || ''], ['เลขที่ใบเสร็จมัดจำ', a.rec.receipt_no || '', 'ยอดมัดจำ', a.rec.deposit ? money(a.rec.deposit) + ' บาท' : 'ไม่มีในฟอร์มเดิม']] },
    { h: 'การยกเลิก' },
    { kv: [['เหตุผล', `${c.reason || ''}${c.req_note ? ' · ' + c.req_note : ''}`], ['ผู้ขอยกเลิก', `${req.role || ''} ${(req.at || '') ? fmtD(req.at.slice(0, 10)) : ''}`, 'ผู้อนุมัติ', `${c.role || ''} ${(c.at || '') ? fmtD(c.at.slice(0, 10)) : ''}`], ['หมายเหตุผู้อนุมัติ', c.note || '']] },
    { h: 'ขอคืนเงินเข้าบัญชี' },
    { kv: [['ยอดเงินคืน', `${money(c.amount)} บาท`, 'ธนาคาร', rf.bank === 'อื่น ๆ' ? rf.bank_other || '' : rf.bank || ''], ['เลขที่บัญชี', rf.account_no || '', 'ชื่อบัญชี', rf.account_name || '']] },
    ...(rf.img ? [{ label: 'สำเนาหน้าสมุดบัญชี', img: docImg(rf.img) }] : []),
    { sign: ['พนักงานขาย', 'ผู้จัดการฝ่ายขาย (อนุมัติ)', 'ฝ่ายบัญชี', 'ลูกค้า (ผู้รับเงิน)'] }] };
  openDoc(spec, docName('ใบขออนุมัติคืนเงินจอง', a.cust, todayISO()), { kind: 'at', id: a.id });
}
// customer already has a booking: the person saving a new one says why
function dupBookings(d, D) {
  const n = (d.customer || '').trim();
  if (!n) return [];
  // the whole name must match (titles and spacing ignored, or one typo); a first name alone never warns (ตกลง 21/10)
  return D.at.filter(x => !x.cancelled && !x.demo && (x.active || (x.date && daysBetween(x.date, D.today) <= 90)) && (bkDupSame(n, x.cust) || bkDupSame(n, x.rec.customer)));
}
function multiBlock(d, D) {
  const dups = dupBookings(d, D);
  if (!dups.length) return '';
  const mine = x => !isSales() || isMine(x.sales);
  const editable = dups.filter(x => canEditBooking(x) && x.active);
  return `<fieldset class="p-3 rounded-lg flex flex-col gap-3" style="background:var(--warn-soft)"><legend class="font-head font-semibold">ชื่อนี้เคยคีย์จองแล้ว ${dups.length} ใบ</legend>
    <p class="text-sm">ถ้าเป็นใบเดิม (คีย์ซ้ำ หรือจะแก้ข้อมูล เช่น ส่วนลด) ให้กด <b>ยกเลิก ใช้ใบจองเดิม</b> แล้วแก้ในใบเดิม · ลูกค้าจองอีกคันจริง เลือกเหตุผล "ซื้อเพิ่มอีกคัน" แล้วบันทึก</p>
    ${dups.map(x => `<div class="text-sm">· ${fmtD(x.date)} · ${esc(x.model)} ${esc(gradeShort(x.model, x.grade))} ${esc(x.color)} · สาขา ${esc(x.br)} · ${mine(x) ? `เซลล์ ${esc(x.sales)}` : 'ของเซลล์อื่น'} · ${x.done ? 'ส่งมอบแล้ว' : 'ยังไม่ส่งมอบ'}${x.active && (canEditBooking(x) || !isSales() || isMine(x.sales)) ? ` <button type="button" class="btn btn-ghost btn-sm ml-1" data-act="bkdup-old" data-id="${esc(x.id)}">ยกเลิก ใช้ใบจองเดิม</button>` : ''}</div>`).join('')}
    <div class="grid sm:grid-cols-2 gap-3"><div class="field"><label for="b-multi" class="req">เหตุผลที่ลงใบจองนี้</label><select id="b-multi" data-draft="booking.multi_reason">${opt(MULTI_REASONS, d.multi_reason, 'เลือกเหตุผล')}</select></div>
      ${d.multi_reason === 'เปลี่ยนรุ่น (ขอยกเลิกใบเดิม)' ? `<div class="field"><label for="b-mold" class="req">ใบเดิมที่จะขอยกเลิก</label><select id="b-mold" data-draft="booking.multi_old"><option value="">เลือกใบเดิม</option>${editable.map(x => `<option value="${esc(x.id)}" ${d.multi_old === x.id ? 'selected' : ''}>${fmtD(x.date)} ${esc(x.model)} ${esc(gradeShort(x.model, x.grade))} ${esc(x.color)}</option>`).join('')}</select>${editable.length ? '' : '<span class="text-xs" style="color:var(--bad)">ไม่มีใบเดิมที่คุณขอยกเลิกได้ ให้เจ้าของใบหรือผู้จัดการทำ</span>'}</div>` : ''}
      <div class="field ${d.multi_reason === 'เปลี่ยนรุ่น (ขอยกเลิกใบเดิม)' ? 'sm:col-span-2' : ''}"><label for="b-mnote" class="${d.multi_reason === 'อื่น ๆ' ? 'req' : ''}">รายละเอียด</label><input id="b-mnote" data-draft="booking.multi_note" value="${esc(d.multi_note || '')}"></div></div>
  </fieldset>`;
}

// the same customer + model + grade + colour twice (IDS re-issued the number, or a double entry, or two real cars): a person decides
function dupAskBox(a) {
  const can = canEditBooking(a) && perms().write, out = [];
  if (a.dupAsk) {
    const { bk, y } = a.dupAsk, st = r => (r.row && r.row.ids) || '', vn = r => (r.row && r.row.vin) || '–';
    const row = (r, tag) => `<tr><td class="text-muted nowrap">${tag}</td><td class="code">${esc(r.no || '')}</td><td class="nowrap">${fmtD(r.date)}</td><td>${esc(st(r) || '–')}</td><td class="code">${esc(vn(r))}</td></tr>`;
    out.push(box('warn', `<b>ใบจอง IDS ซ้ำ</b> ชื่อ รุ่น เกรด สี และสาขาตรงกัน 2 เลข · มักเป็นใบเดียวกันที่ IDS ออกเลขใหม่ (เช่น เลื่อนรับรถแล้วออกเลขใหม่ตอนรถมา)
      <table class="tbl text-sm mt-2"><thead><tr><th></th><th>เลขที่ใบจอง</th><th>วันที่</th><th>สถานะใน IDS</th><th>รถ</th></tr></thead><tbody>${row(bk, 'จับคู่อยู่')}${row(y, 'อีกใบ')}</tbody></table>
      ${can ? `<div class="flex flex-wrap gap-2 mt-2"><button class="btn btn-dark btn-sm" data-act="dup-same" data-id="${esc(a.id)}" data-a="${esc(bk.key)}" data-b="${esc(y.key)}">ใบเดียวกัน → ใช้เลขที่ยังใช้งาน เก็บอีกเลขเป็นเลขเดิม</button>
        <button class="btn btn-ghost btn-sm" data-act="dup-no" data-id="${esc(a.id)}" data-key="${esc(y.key)}">คนละใบ ไม่ซ้ำ</button></div>` : '<div class="text-xs mt-2">เซลล์เจ้าของ แอดมินสาขา หรือผู้จัดการเป็นคนยืนยัน</div>'}`));
  }
  if (a.dupAt && a.dupAt.length) out.push(box('warn', `<b>อาจซ้ำกับใบจองอื่นของลูกค้าคนนี้</b> ชื่อ รุ่น เกรด สี ตรงกัน · ตรวจว่าคีย์ซ้ำ (ยกเลิกใบที่เกิน) หรือลูกค้าจอง 2 คัน
    <div class="mt-2">${a.dupAt.map(o => `<div class="flex flex-wrap items-center gap-2 text-sm">· จอง ${fmtD(o.date)} · ${esc(o.sales || '')} · ${esc(o.no || 'ยังไม่มีเลข')}<button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(o.id)}">เปิดใบนั้น</button></div>`).join('')}</div>
    ${can ? `<div class="flex flex-wrap gap-2 mt-2"><button class="btn btn-ghost btn-sm" data-act="dup-at-no" data-id="${esc(a.id)}">ไม่ซ้ำ ลูกค้าจอง 2 คัน</button></div>` : ''}`));
  return out.join('');
}
