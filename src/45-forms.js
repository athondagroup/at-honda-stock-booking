// ---------- AT Honda booking: photos of the booking form and slip, AI reading, review, save
function newBookingDraft() {
  return {
    booking_no: '', booking_date: todayISO(), br: '', sales: '', customer: '', source: 'Walk-in', model: '', grade: '', color: '', model_text: '',
    purchase: 'ไฟแนนซ์', finance: 'HLTC', deposit: '', insurance: 'Honda แถม', price: '', discount: '', foc_items: '', down: '', fin_amount: '',
    rate: '', term: '', campaign: '', trade_in: '', lead_id: '', note: '', foc_total: '', delivery_plan: '', ids_claim: '', receipt_no: '', multi_reason: '', multi_note: '', multi_old: '', ai: null, aiFields: [], slip_ai: null, unreadable: []
  };
}
S.draft.booking = newBookingDraft();
const opt = (list, cur, ph) => (ph ? `<option value="">${ph}</option>` : '') + list.map(v => `<option ${v === cur ? 'selected' : ''}>${esc(v)}</option>`).join('');
const aiReady = () => !!(S.cap.sample && S.cap.images);
function photoDrop(kind, label, hint, files, max) {
  const p = perms();
  return `<div class="flex flex-col gap-2">
    <div class="font-medium req">${label}</div>
    <label class="drop relative ${p.write ? '' : 'opacity-50'}">
      <input type="file" accept="image/*" ${max > 1 ? 'multiple' : ''} data-file="${kind}" ${p.write ? '' : 'disabled'} aria-label="${label}">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="color:var(--muted)">${ICON.receive}</svg>
      <span class="text-sm">ถ่ายรูปหรือเลือกไฟล์ ${max > 1 ? `(ได้ถึง ${max} รูป)` : ''}</span><span class="text-xs text-muted">${hint}</span>${ANDROID_NOTE}
    </label>
    ${files.length ? `<div class="flex flex-wrap gap-2">${files.map((f, i) => `<div class="relative"><img class="thumb" src="${f.url}" alt="${label} รูปที่ ${i + 1}">
      <button class="absolute -top-2 -right-2 btn btn-ghost btn-sm" style="min-height:24px;padding:0 7px;border-radius:999px" data-act="file-remove" data-kind="${kind}" data-i="${i}" aria-label="ลบรูปที่ ${i + 1}">×</button></div>`).join('')}</div>` : ''}
  </div>`;
}
function bookingChecks(d, D) {
  const out = [];
  const s = d.slip_ai;
  if (s && s.amount != null && d.deposit) {
    const ok = Math.abs(Number(s.amount) - Number(d.deposit)) < 1;
    out.push({ t: ok ? `ยอดในสลิป ${money(s.amount)} บาท ตรงกับยอดมัดจำ` : `ยอดในสลิป ${money(s.amount)} บาท ไม่ตรงกับยอดมัดจำ ${money(d.deposit)} บาท`, bad: !ok });
  }
  if (s && s.date && d.booking_date) {
    const gap = daysBetween(d.booking_date, s.date);
    if (gap > 7 || gap < -30) out.push({ t: `วันที่ในสลิป ${fmtD(s.date)} ห่างจากวันที่ใบจอง ${Math.abs(gap)} วัน`, bad: true });
    else out.push({ t: `วันที่ในสลิป ${fmtD(s.date)} ใกล้กับวันที่ใบจอง`, bad: false });
  }
  if (s && s.payee_name) {
    const ok = /เอที|ฮอนด้า|a\.?t\.?\s*honda|honda/i.test(s.payee_name);
    out.push({ t: ok ? `ผู้รับเงิน: ${s.payee_name}` : `ผู้รับเงินในสลิป "${s.payee_name}" ไม่ใช่ AT Honda`, bad: !ok });
  }
  if (d.ai && !s && S.files.slip.length) out.push({ t: 'AI อ่านสลิปไม่ได้ ตรวจยอดเองก่อนบันทึก', bad: true });
  const no = (d.booking_no || '').trim();
  if (no) {
    const ib = D.idsB.find(b => b.no === no);
    const dup = D.at.find(a => !a.cancelled && a.no === no);
    if (dup) out.push({ t: `เลขที่ใบจอง ${no} ถูกบันทึกใน AT Honda แล้ว`, bad: true, block: true });
    if (ib) {
      const same = ib.model === d.model && ib.grade === d.grade && (ib.color || '') === (d.color || '');
      out.push({ t: same ? `พบเลขที่ใบจองนี้ใน IDS (${ib.br}) สเปกตรงกัน` : `พบเลขที่ใบจองนี้ใน IDS แต่สเปกใน IDS คือ ${ib.model} ${ib.grade} ${ib.color}`, bad: !same });
    } else out.push({ t: 'ยังไม่พบเลขที่ใบจองนี้ในไฟล์ Booking IDS ล่าสุด จะจับคู่เองเมื่ออัปโหลดไฟล์รอบถัดไป', bad: false });
  }
  if ((d.unreadable || []).length) out.push({ t: `AI อ่านไม่ออก: ${d.unreadable.join(', ')}`, bad: true });
  const dups = dupBookings(d, D);
  if (dups.length) {
    const why = d.multi_reason;
    const miss = !why ? 'ลูกค้าชื่อนี้มีใบจองอยู่แล้ว เลือกเหตุผลที่ลงใบจองนี้ก่อนบันทึก'
      : why === 'อื่น ๆ' && !(d.multi_note || '').trim() ? 'เขียนรายละเอียดเมื่อเลือก "อื่น ๆ"'
      : why.startsWith('เปลี่ยนรุ่น') && !d.multi_old ? 'เลือกใบเดิมที่จะขอยกเลิก' : null;
    out.push(miss ? { t: miss, bad: true, block: true } : { t: `ลูกค้าชื่อนี้มีใบจองอยู่แล้ว ${dups.length} ใบ · ${why}`, bad: false });
  }
  return out;
}
function bookingForm(D) {
  const d = S.draft.booking, p = perms(), f = S.files, ai = S.ai.booking;
  if (!d.br) d.br = myBranch() || (S.role.role === 'sales' ? (salesBranch(S.role.sales) || 'PSC') : 'PSC');
  if (S.role.role === 'sales') d.sales = S.role.sales;
  // current-year list; a value AI read that is not in it stays selectable so nothing is silently dropped
  const keep = (list, v) => v && !list.includes(v) ? [...list, v] : list;
  const models = keep(Object.keys(BOOK_CATALOG), d.model);
  const grades = d.model ? keep(Object.keys(BOOK_CATALOG[d.model] || {}), d.grade) : [];
  const colors = d.model && d.grade ? keep(BOOK_CATALOG[d.model]?.[d.grade] || [], d.color) : [];
  const myOf = m => MODEL_YEAR[m] || catYearOf(m) || null;
  const modelOpts = `<option value="">เลือกรุ่น</option>` + models.map(v => `<option value="${esc(v)}" ${v === d.model ? 'selected' : ''}>${esc(v)}${myOf(v) ? ` ('${String(myOf(v)).slice(2)})` : ''}</option>`).join('');
  const specK = d.model && d.grade && d.color ? specKey(d.model, d.grade, d.color) : null;
  const spec = specK ? D.specs[specK] || { free: 0, freeBy: {}, waiting: 0, incoming: 0, none: true } : null;
  const yrs = specK ? specYears(D, specK) : [];
  // with model and grade picked: what each colour has right now, so the sales can pick one that is in stock
  const colorAvail = d.model && d.grade && !d.color ? colors.map(c => { const s = D.specs[specKey(d.model, d.grade, c)]; return `${esc(c)} ว่าง ${s ? s.free : 0}${s && s.incoming ? ` + Quota ${s.incoming}` : ''}`; }).join(' · ') : '';
  const isAi = k => d.aiFields.includes(k) ? 'ai-field' : '';
  const F = (id, label, inner, req, hint) => `<div class="field"><label for="b-${id}" class="${req ? 'req' : ''}">${label}</label>${inner}${hint ? `<span class="text-xs">${hint}</span>` : ''}</div>`;
  const inp = (id, type = 'text', extra = '') => `<input id="b-${id}" type="${type}" data-draft="booking.${id}" value="${esc(d[id])}" class="${isAi(id)}" ${extra}>`;
  const sel = (id, list, ph, extra = '') => `<select id="b-${id}" data-draft="booking.${id}" class="${isAi(id)}" ${extra}>${opt(list, d[id], ph)}</select>`;
  const checks = bookingChecks(d, D);
  const running = ai && ai.state === 'running';
  return `
  <form id="booking-form" class="flex flex-col gap-5" novalidate>
    <section class="bg-surface border border-line rounded-lg p-4 md:p-6">
      <h2 class="font-head text-lg font-semibold mb-1">1. แนบใบจองและหลักฐานมัดจำ</h2>
      <p class="text-sm text-muted mb-4">ต้องมีรูปหน้าใบจองทุกใบ (เหมือนช่อง "หน้าใบจอง" ใน Google Form) · สลิปหรือใบเสร็จมัดจำแนบได้ถ้ามี · AI อ่านข้อมูลมากรอกให้ได้</p>
      <div class="grid md:grid-cols-2 gap-5">
        ${photoDrop('bk', 'รูปใบจอง', 'ถ่ายให้เห็นทั้งใบ ตัวหนังสือชัด', f.bk, 3)}
        ${photoDrop('slip', 'สลิปโอนหรือใบเสร็จมัดจำ', 'สลิปจากแอปธนาคารหรือใบเสร็จรับเงิน', f.slip, 2)}
      </div>
      <div class="flex flex-wrap items-center gap-3 mt-4">
        ${aiReady() ? `<button type="button" class="btn btn-dark" data-act="ai-booking" ${!f.bk.length || running || !p.write ? 'disabled' : ''}>${running ? '<span class="spin"></span> AI กำลังอ่าน…' : 'ให้ AI อ่านใบจองและสลิป'}</button>
          ${running ? '<button type="button" class="btn btn-ghost btn-sm" data-act="ai-stop" data-kind="booking">หยุด</button>' : ''}`
          : `<span class="text-sm" style="color:var(--warn)">${S.mode === 'local' ? 'AI อ่านรูปใช้ได้เมื่อเปิดหน้านี้บน claude.ai ตอนนี้กรอกข้อมูลเองได้' : 'มุมมองนี้ใช้ AI อ่านรูปไม่ได้ กรอกข้อมูลเองได้'}</span>`}
        <span class="text-sm" role="status">${ai ? (ai.state === 'running' ? 'ใช้เวลาประมาณ 10–60 วินาที' : ai.state === 'done' ? `<span style="color:var(--good)">อ่านแล้ว ช่องที่ AI กรอกมีแถบสีเขียว ตรวจกับรูปก่อนบันทึก</span>` : `<span style="color:var(--bad)">${esc(ai.msg)}</span>`) : ''}</span>
      </div>
    </section>

    <section class="bg-surface border border-line rounded-lg p-4 md:p-6 flex flex-col gap-6">
      <div><h2 class="font-head text-lg font-semibold">2. ตรวจและแก้ข้อมูลใบจอง</h2>
        <p class="text-sm text-muted">หัวข้อใช้ชื่อเดียวกับรายงานใน IDS เพื่อจับคู่กับไฟล์ IDS ได้ตรง</p></div>
      <fieldset class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"><legend class="font-head font-semibold mb-1">ข้อมูลใบจอง (เรียงตาม Google Form)</legend>
        ${F('br', 'สาขา', `<select id="b-br" data-draft="booking.br" ${myBranch() ? 'disabled' : ''}>${BRS.map(b => `<option value="${b}" ${d.br === b ? 'selected' : ''}>${BR[b].name} (${b})</option>`).join('')}</select>`, true)}
        ${F('sales', 'ชื่อเซลล์', sel('sales', salesNames(), 'เลือกชื่อเซลล์', S.role.role === 'sales' ? 'disabled' : ''), true)}
        ${F('customer', 'ชื่อ-นามสกุลลูกค้า', inp('customer', 'text', 'autocomplete="off" placeholder="ชื่อ นามสกุล"'), true)}
        ${d.model_text ? `<div class="sm:col-span-2 lg:col-span-3 text-sm">AI อ่านรุ่นจากใบจองได้ว่า <b>${esc(d.model_text)}</b></div>` : ''}
        ${F('model', 'รุ่นรถที่จอง', `<select id="b-model" data-draft="booking.model" class="${isAi('model')}">${modelOpts}</select>`, true, 'แสดงเฉพาะรุ่นปีล่าสุดที่มีในสต็อก Quota หรือใบราคา')}
        ${F('grade', 'เกรด', `<select id="b-grade" data-draft="booking.grade" class="${isAi('grade')}" ${d.model ? '' : 'disabled'}>${opt(grades, d.grade, 'เลือกเกรด')}</select>`, true)}
        ${F('color', 'สี', `<select id="b-color" data-draft="booking.color" class="${isAi('color')}" ${d.grade ? '' : 'disabled'}>${opt(colors, d.color, 'เลือกสี')}</select>`, true)}
        <div class="sm:col-span-2 lg:col-span-3 text-sm">${spec ? `${myOf(d.model) ? `<span class="chip" style="background:var(--surface-2)">รุ่นปี '${String(myOf(d.model)).slice(2)}</span> ` : ''}สเปกนี้ตอนนี้: ${spec.free ? `<span style="color:var(--good)">มีรถว่าง</span> <b class="num">${spec.free}</b> คัน${Object.keys(spec.freeBy).length ? ` (${Object.entries(spec.freeBy).map(([b, n]) => `${b} ${n}`).join(', ')})` : ''}${yrs.length ? ` · ${yrs.map(([y, n]) => `${y} ${n} คัน`).join(' · ')}` : ''}` : '<b style="color:var(--bad)">ยังไม่มีรถว่าง</b>'} · ใบจองรอรถ <b class="num">${spec.waiting}</b> ใบ · Quota รอเข้า <b class="num">${spec.incoming}</b> คัน
          ${spec.none ? '<div class="text-muted">ยังไม่เคยมีรถหรือ Quota สเปกนี้ในไฟล์ IDS ถ้าจองต้องรอ Honda จัดสรร Quota ใหม่</div>' : ''}
          ${spec.waiting >= spec.free + spec.incoming ? `<div style="color:var(--bad)">ถ้าจองตอนนี้จะอยู่คิวที่ ${spec.waiting + 1} และรถยังไม่พอ</div>` : ''}` : (colorAvail ? `<span>รถว่างตามสี: ${colorAvail}</span>` : '<span class="text-muted">เลือกรุ่น เกรด สี แล้วจะเห็นจำนวนรถว่างและคิว</span>')}</div>
        ${bookFormPrice(d)}
        ${F('purchase', 'เงื่อนไข', sel('purchase', ['ไฟแนนซ์', 'ซื้อสด']), true)}
        ${F('insurance', 'ประกันภัย', sel('insurance', d.insurance && !['Honda แถม', 'AT แถม', 'ไฟแนนซ์แถม'].includes(d.insurance) ? [d.insurance, 'Honda แถม', 'AT แถม', 'ไฟแนนซ์แถม'] : ['Honda แถม', 'AT แถม', 'ไฟแนนซ์แถม']), true)}
        ${F('discount', 'ส่วนลด ระบุจำนวน ไม่มี ใส่ 0 บาท', inp('discount', 'number', 'min="0" step="100" inputmode="numeric" placeholder="0"'), true)}
        ${F('foc_total', 'FOC ที่ใช้ทั้งหมด', inp('foc_total', 'number', 'min="0" step="100" inputmode="numeric" placeholder="0"'), true)}
        <div class="field"><label for="b-note">หมายเหตุ</label>${inp('note', 'text', 'placeholder="เช่น Trade in"')}</div>
        ${F('booking_date', 'วันที่จอง', inp('booking_date', 'date', `max="${todayISO()}"`), true)}
        <div class="field"><span class="text-sm font-medium">หน้าใบจอง</span><span class="text-sm ${f.bk.length ? '' : ''}" style="color:var(--${f.bk.length ? 'good' : 'bad'})">${f.bk.length ? `แนบแล้ว ${f.bk.length} รูป (ข้อ 1 ด้านบน)` : 'ยังไม่ได้แนบ แนบที่ข้อ 1 ด้านบน'}</span></div>
        ${F('source', 'แหล่งที่มาของการจอง', sel('source', [...SOURCES, 'อื่น ๆ'], 'เลือกแหล่งที่มา'))}
        ${d.source === 'อื่น ๆ' ? F('source_other', 'แหล่งที่มาอื่น (พิมพ์)', inp('source_other', 'text', 'placeholder="เช่น TikTok, งานบูธ, ป้ายหน้าโชว์รูม" maxlength="60"'), true) : ''}
        ${F('lead_id', 'Lead ID จาก BOT (ถ้ามี)', inp('lead_id', 'text', 'placeholder="ถ้ามี"'))}
      </fieldset>
      <fieldset class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-lg" style="background:var(--surface-2)"><legend class="font-head font-semibold px-1">ข้อมูลเพิ่ม (ไม่อยู่ใน Google Form · ไม่บังคับ ใส่ทีหลังได้)</legend>
        ${F('booking_no', 'เลขที่ใบจอง IDS', inp('booking_no', 'text', 'inputmode="numeric" maxlength="12" placeholder="10 หลักจาก IDS"'), false, 'ยังไม่ได้ลง IDS เว้นไว้ก่อนได้ ระบบจะเตือนจนกว่าจะใส่')}
        ${d.purchase === 'ไฟแนนซ์' ? F('finance', 'บริษัทไฟแนนซ์ที่ยื่น', sel('finance', FINANCE)) : ''}
        ${F('deposit', 'ยอดมัดจำ (บาท)', inp('deposit', 'number', 'min="0" step="100" inputmode="numeric"'))}
        ${F('receipt_no', 'เลขที่ใบเสร็จมัดจำ', inp('receipt_no', 'text', 'autocomplete="off"'), false, 'ต้องใส่ก่อนไปขั้นไฟแนนซ์ ใส่ทีหลังในใบจองได้')}
        ${F('delivery_plan', 'วันนัดรับรถ (ถ้ามี)', inp('delivery_plan', 'date', `min="${todayISO()}"`), false, 'ใส่แล้วล็อกรถจะถือไว้จนส่งมอบ ไม่ต้องปลดล็อกทุก 15 วัน')}
      </fieldset>
      ${multiBlock(d, D)}
      ${checks.length ? `<div class="p-3 rounded-lg text-sm flex flex-col gap-1" style="background:var(--surface-2)"><b>ผลตรวจ</b>${checks.map(c => `<div style="color:var(--${c.bad ? 'warn' : 'good'})">${c.bad ? '⚠' : '✓'} ${esc(c.t)}</div>`).join('')}</div>` : ''}
      <p class="text-xs text-muted">ราคา ดาวน์ ยอดจัด ดอกเบี้ย และของแถมรายชิ้นสำหรับคิดค่าคอม กรอกทีหลังตอนส่งมอบ</p>
      <div class="flex flex-wrap gap-3 items-center">
        <button type="submit" class="btn btn-red" ${p.write && !running && !S.saving ? '' : 'disabled'}>${S.saving ? '<span class="spin"></span> กำลังบันทึก…' : 'บันทึกใบจองเข้าคิว'}</button>
        <button type="button" class="btn btn-ghost" data-act="booking-reset">ล้างฟอร์ม</button>
        <span class="text-sm text-muted" id="booking-msg"></span>
      </div>
    </section>
  </form>`;
}
const BOOKING_PROMPT = (nBk, nSlip) => `You are reading photos for AT Honda, a Honda car dealer group in Thailand.
Images 1-${nBk} are the pages of one customer's vehicle booking form (ใบจอง / ใบสั่งจอง).
${nSlip ? `Images ${nBk + 1}-${nBk + nSlip} are evidence that the customer paid the deposit (a bank transfer slip or a receipt).` : 'There is no slip image; return "slip": null.'}

Copy values as printed. Use null when a field is absent or you cannot read it with confidence, and list those field names in "unreadable". Do not guess.
Dates: output YYYY-MM-DD in the Gregorian calendar (subtract 543 from Buddhist-era years).
Money: plain numbers in baht without commas.
Do NOT output national ID numbers, phone numbers, e-mail or home addresses even if they are on the form.
For model, grade and color pick from this list of the dealer's model | grade | color codes when the form clearly matches one, otherwise null:
${catalogHint()}

Reply with only this JSON:
{"booking":{"booking_no":string|null,"booking_date":string|null,"customer_name":string|null,"sales_name":string|null,"branch":string|null,
"model_text":string|null,"model":string|null,"grade":string|null,"color":string|null,
"price":number|null,"discount":number|null,"deposit":number|null,"purchase_type":"ไฟแนนซ์"|"ซื้อสด"|null,"finance_company":string|null,
"down_payment":number|null,"finance_amount":number|null,"interest_rate":number|null,"term_months":number|null,
"insurance":string|null,"campaign":string|null,"foc_items":[{"item":string,"amount":number|null}],"trade_in":string|null,"remarks":string|null},
"slip":{"amount":number|null,"date":string|null,"time":string|null,"payer_name":string|null,"payee_name":string|null,"bank":string|null,"reference":string|null},
"unreadable":[string]}`;
function applyBookingAi(res) {
  const d = S.draft.booking, b = (res && res.booking) || {}, filled = [];
  const set = (k, v) => { if (v !== null && v !== undefined && v !== '') { d[k] = String(v); filled.push(k); } };
  const no = String(b.booking_no || '').replace(/\D/g, '');
  if (/^\d{8,12}$/.test(no)) set('booking_no', no);
  if (b.booking_date && /^\d{4}-\d{2}-\d{2}$/.test(b.booking_date)) set('booking_date', b.booking_date);
  set('customer', b.customer_name);
  if (S.role.role !== 'sales') set('sales', fitSales(b.sales_name));
  if (!myBranch()) { const br = BRS.find(x => String(b.branch || '').toUpperCase().includes(x) || String(b.branch || '').includes(BR[x].name)); if (br) set('br', br); }
  const sp = fitSpec({ model: b.model, grade: b.grade, color: b.color, text: b.model_text });
  d.model_text = b.model_text || '';
  set('model', sp.model); set('grade', sp.grade); set('color', sp.color);
  if (b.purchase_type === 'ซื้อสด' || b.purchase_type === 'ไฟแนนซ์') set('purchase', b.purchase_type);
  if (b.finance_company) set('finance', FINANCE.find(x => String(b.finance_company).toUpperCase().includes(x)) || 'อื่น ๆ');
  ['deposit', 'price', 'discount'].forEach(k => set(k, b[k]));
  set('down', b.down_payment); set('fin_amount', b.finance_amount); set('rate', b.interest_rate); set('term', b.term_months);
  if (b.insurance) set('insurance', INSURANCE.find(x => String(b.insurance).includes(x.split(' ')[0])) || d.insurance);
  set('campaign', b.campaign); set('trade_in', b.trade_in); set('note', b.remarks);
  if (Array.isArray(b.foc_items) && b.foc_items.length) set('foc_items', b.foc_items.map(x => `${x.item || ''}${x.amount != null ? ' = ' + x.amount : ''}`).join('\n'));
  d.aiFields = filled;
  d.slip_ai = res && res.slip && Object.values(res.slip).some(v => v !== null) ? res.slip : null;
  d.unreadable = Array.isArray(res && res.unreadable) ? res.unreadable.slice(0, 12).map(String) : [];
  d.ai = res ? { booking: b, slip: res.slip || null } : null;
}

// ---------- receiving cars from a New Cars Delivery Note photo
const RECEIVE_PROMPT = () => `This photo is a Honda Thailand "NEW CARS DELIVERY NOTE" received by AT Honda, a dealer group.
Read it and reply with only this JSON:
{"doc_no":string|null,"doc_date":"YYYY-MM-DD"|null,"ship_to":string|null,"dealer_code":string|null,"ref_no":string|null,"transporter":string|null,"truck_plate":string|null,"dealer_sign_date":"YYYY-MM-DD"|null,
"cars":[{"model_text":string,"vin":string|null,"engine_no":string|null,"type":string|null,"color":string|null}],"unreadable":[string]}
Rules:
- doc_no is "เลขที่เอกสาร" (like D202610050236); doc_date is "วันที่เอกสาร" (printed dd.mm.yyyy).
- dealer_code is the number after "D" at the start of "ส่งถึง (Ship To)", e.g. "D1350 - บริษัท ..." gives "1350".
- ref_no is "REF NO."; truck_plate is "หมายเลขรถ"; dealer_sign_date is the DATE under the DEALER signature box.
- One delivery note can list up to 6 cars in the MODEL / FRAME NO. / ENGINE NO. / TYPE / COLOR table: return every car listed.
- model_text is the full MODEL text, e.g. "CITY e:HEV'27 e:HEV RS (RB(Z)) PMW". vin is the 17-character FRAME NO. (it never contains the letters I, O or Q).
- Dates in the Gregorian calendar. Copy exactly what is printed; use null and add the field name to "unreadable" when a value cannot be read with confidence. Do not guess.
- Do not output the driver's name.`;
function receiveCarFromAi(c, br) {
  const vin = String(c.vin || '').toUpperCase().replace(/\s/g, '');
  const m = IDS.mto(c.model_text || '');
  const sp = fitSpec({ model: m.model, grade: m.grade, color: c.color, text: `${c.model_text || ''} ${c.color || ''}` });
  return { vin, model_text: c.model_text || '', engine: c.engine_no || '', type: c.type || '', color_raw: c.color || '', year: m.year, ...sp, br };
}
function vinFix(v) { return String(v || '').toUpperCase().replace(/O/g, '0').replace(/[IQ]/g, m => (m === 'I' ? '1' : '0')); }
function receiptRow(r, D, o = {}) {
  const p = perms();
  const canConfirm = p.confirmReceive && p.write && r.status === 'pending' && branchOk(r.br);
  const st = r.status === 'pending' ? chip('รอแอดมินยืนยัน', 'warn') : r.status === 'confirmed' ? chip('ยืนยันแล้ว', 'good') : r.review && r.review.dup ? chip('ซ้ำ ไม่รับเข้า', 'muted') : chip('ไม่ผ่าน', 'muted');
  const dup = r.status === 'pending' ? recvDupsOf(r, D) : [];
  return `<div class="p-3 md:px-4 flex flex-wrap gap-x-4 gap-y-2 items-center">
    <button class="flex gap-4 items-center text-left" data-act="recv-open" data-id="${esc(r.id)}" title="ดูใบนี้">${r.img ? `<img class="thumb" style="width:52px;height:68px" src="${imgSrc(r.img)}" alt="ใบ New Car ${esc(r.doc_no || '')}" loading="lazy">` : '<div class="thumb grid place-items-center text-xs text-muted" style="width:52px;height:68px">ไม่มีรูป</div>'}
    <div class="min-w-[140px]"><div class="font-medium code underline decoration-dotted">${esc(r.doc_no || 'ไม่มีเลขที่เอกสาร')}</div><div class="text-xs text-muted">${fmtD(r.doc_date)} · ${esc(r.br || '?')}</div></div></button>
    <div class="flex-1 min-w-[200px] text-sm">${(r.cars || []).map(c => `<div>${D && c.vin && (D.cars.get(String(c.vin).toUpperCase()) || D.deliveredOut.find(x => x.vin === String(c.vin).toUpperCase())) ? vinLink({ vin: String(c.vin).toUpperCase() }) : `<span class="code">${esc(c.vin || '?')}</span>`} <span class="text-muted">${c.model ? specLabel(specKey(c.model, c.grade, c.color)) : esc(c.model_text || '')}</span></div>`).join('') || '<span class="text-muted">ยังไม่มีข้อมูลรถ</span>'}
      ${r.ai_msg ? `<div class="text-xs flex flex-wrap items-center gap-2" style="color:var(--warn)">${esc(r.ai_msg)} ${recvRetryBtn(r.id, r, true)}</div>` : ''}${dup.length ? `<div class="text-xs font-medium" style="color:var(--bad)">ซ้ำกับ ${dup.map(esc).join(' · ')}</div>` : ''}</div>
    <div class="text-xs text-muted w-40">${st}<div class="mt-1">ส่งโดย ${who(r)} ${fmtDT(r.created_at)}</div>${r.review ? `<div>${r.status === 'confirmed' ? 'ยืนยัน' : r.review.dup ? 'บันทึกว่าซ้ำ' : 'ตีกลับ'}โดย ${who(r.review)}</div>` : ''}</div>
    ${o.compact ? '' : `<div class="ml-auto flex gap-2">${canConfirm ? `<button class="btn btn-ghost btn-sm" data-act="recv-dup" data-id="${esc(r.id)}" title="ใบนี้ซ้ำ ไม่ต้องรับรถเข้าระบบ">ซ้ำ</button>` : ''}${canConfirm ? `<button class="btn btn-red btn-sm" data-act="recv-open" data-id="${esc(r.id)}">ตรวจและยืนยัน</button>` : `<button class="btn btn-ghost btn-sm" data-act="recv-open" data-id="${esc(r.id)}">ดู</button>`}</div>`}
  </div>`;
}
function viewReceive(D) {
  const p = perms(), ai = S.ai.receive;
  const list = D.receipts.filter(r => !S.br || r.br === S.br);
  const by = st => list.filter(r => r.status === st);
  const sub = S.sub.receive;
  const shown = by(sub === 'done' ? 'confirmed' : sub === 'rejected' ? 'rejected' : 'pending');
  const running = ai && ai.state === 'running';
  return `
  ${pageHead('รับรถเข้า', 'ถ่ายรูปใบ NEW CARS DELIVERY NOTE ส่งเข้าระบบ AI จะอ่านเลขตัวถัง รุ่น สี และเลขที่เอกสาร จากนั้นแอดมินสาขาตรวจกับรูปแล้วกดยืนยัน รถจะขึ้นเป็นรถว่างในสต็อกทันที')}
  <section class="bg-surface border border-line rounded-lg p-4 md:p-5 mb-5">
    <div class="drop" style="cursor:default">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="color:var(--red)">${ICON.receive}</svg>
      <span class="font-medium">ส่งรูปใบ New Cars Delivery Note</span>
      <span class="text-xs text-muted">${aiReady() ? 'ถ่ายให้เห็นทั้งใบ AI จะอ่านข้อมูลให้แอดมินตรวจ' : S.mode === 'local' ? 'AI อ่านรูปใช้ได้เมื่อเปิดหน้านี้บน claude.ai ตอนนี้ส่งรูปแล้วให้แอดมินกรอกเองได้' : 'มุมมองนี้ใช้ AI อ่านรูปไม่ได้ แอดมินจะกรอกข้อมูลจากรูปเอง'}</span>
      <div class="flex flex-wrap justify-center gap-2 mt-2">
        <label class="btn btn-red relative ${p.write && !running ? '' : 'opacity-50'}"><input type="file" accept="image/*" capture="environment" data-file="recv" class="absolute w-px h-px opacity-0" ${p.write && !running ? '' : 'disabled'}>ถ่ายรูป</label>
        <label class="btn btn-ghost relative ${p.write && !running ? '' : 'opacity-50'}"><input type="file" accept="image/*" multiple data-file="recv" class="absolute w-px h-px opacity-0" ${p.write && !running ? '' : 'disabled'}>อัปโหลดรูปจากเครื่อง (เลือกได้หลายใบ)</label>
        ${p.write && p.confirmReceive ? `<button class="btn btn-ghost" data-act="recv-manual" ${running ? 'disabled' : ''}>คีย์ข้อมูลเอง (ไม่มีรูป)</button>` : ''}
      </div>
      ${ANDROID_NOTE}
    </div>
    ${ai ? `<div class="mt-3 text-sm flex items-center gap-3" role="status">${ai.state === 'running' ? `<span class="spin"></span> ${esc(ai.msg)} <button class="btn btn-ghost btn-sm" data-act="ai-stop" data-kind="receive">หยุด</button>` : ai.state === 'done' ? `<span style="color:var(--good)">${esc(ai.msg)}</span>` : `<span style="color:var(--bad)">${esc(ai.msg)}</span>`}</div>` : ''}
  </section>
  ${brSeg()}
  ${tabs('receive', [['pending', 'รอแอดมินยืนยัน', by('pending').length], ['done', 'ยืนยันแล้ว', String(by('confirmed').length)], ['rejected', 'ไม่ผ่าน']])}
  <div class="bg-surface border border-line rounded-lg divide-y divide-line">${shown.map(r => receiptRow(r, D)).join('') || emptyBox(sub === 'pending' ? 'ไม่มีรถที่รอยืนยัน' : 'ยังไม่มีรายการ', 'ส่งรูปใบ New Cars Delivery Note ด้านบน')}</div>
  ${p.confirmReceive ? '' : `<p class="text-sm text-muted mt-3">บทบาท ${esc(roleLabel())} ส่งรูปได้ แต่ต้องให้แอดมินสาขาหรือผู้จัดการเป็นคนยืนยัน</p>`}`;
}
function receiveModal(m, D) {
  const r = m.r, p = perms();
  const canConfirm = p.confirmReceive && p.write && m.status === 'pending' && branchOk(r.br);
  const dis = canConfirm ? '' : 'disabled';
  const carBlock = (c, i) => {
    const grades = c.model ? Object.keys(CATALOG[c.model] || {}) : [], colors = c.model && c.grade ? CATALOG[c.model]?.[c.grade] || [] : [];
    const vin = (c.vin || '').toUpperCase(), errs = [], notes = [];
    if (!VIN_RE.test(vin)) errs.push(VIN_RE.test(vinFix(vin)) ? `เลขตัวถังมีตัว I, O หรือ Q ซึ่งไม่มีในเลขตัวถัง น่าจะเป็น ${vinFix(vin)}` : 'เลขตัวถังต้องมี 17 ตัว ไม่มี I, O, Q');
    const inStock = D.cars.get(vin);
    if (inStock && inStock.src !== 'IDS') errs.push('คันนี้ถูกรับเข้าในระบบนี้แล้ว');
    const qv = VIN_RE.test(vin) ? D.quota.find(q => q.vin === vin) : null;
    // Ref still free for this car: same spec and branch, no frame number yet (or this one), not picked for another car on this note
    const taken = new Set((r.cars || []).filter((x, j) => j !== i && x.ref).map(x => x.ref));
    const qCands = qv ? [qv] : D.quota.filter(q => q.br === r.br && q.spec === specKey(c.model, c.grade, c.color) && (q.st === 'waiting' || q.st === 'vin') && (!q.vin || q.vin === vin) && !taken.has(q.ref));
    const qPick = recvRefPick(qCands);
    // the system picks a Ref (one with a lock or a booking first, then the oldest month); the admin can change it
    if (canConfirm && c.ref === undefined && !(inStock && inStock.src === 'IDS' && inStock.ref)) c.ref = qv ? qv.ref : qPick ? qPick.ref : '';
    const st = inStock && inStock.src === 'IDS' ? { t: 'good', h: `อยู่ใน Stock IDS แล้ว (${inStock.br}${inStock.ref ? ` · Ref ${inStock.ref}` : ''})`, d: 'ไม่สร้างคันซ้ำ กดยืนยันเพื่อบันทึกวันที่รถถึงสาขา' }
      : qv ? { t: 'good', h: `อยู่ใน Quota ${qv.ref} (${fmtM(qv.m)}) และเลขเฟรมขึ้นแล้ว`, d: 'ระบบผูก Ref ให้เอง' }
      : qCands.length ? { t: 'warn', h: 'อยู่ใน Quota แต่เลขเฟรมยังไม่ขึ้นใน IDS', d: `ระบบเลือก Ref ให้แล้ว${qPick ? ` (${qPick.ref})` : ''} เปลี่ยนได้ในช่อง "จับคู่ Quota" · ยืนยันแล้วล็อกที่อยู่บน Quota นี้ย้ายมาเป็นล็อกของ VIN` }
      : VIN_RE.test(vin) && c.model ? { t: 'bad', h: 'ไม่พบทั้งใน Stock และ Quota IDS', d: 'รับเข้าได้ ตรวจรุ่น สี และสาขาให้ถูก หรืออัปเดตไฟล์ Quota ก่อน' } : null;
    const qLab = q => `${q.ref} · ${fmtM(q.m)}${q.week ? ' W' + q.week : ''}${q.lock ? ` · ล็อก ${q.lock.owner || q.lock.dealer_name || ''}${q.lock.status === 'pending' ? ' (รออนุมัติ)' : ''}` : ''}${q.booking ? ` · ใบจอง ${q.booking.owner || q.bk || ''}` : q.bk ? ` · ใบจอง ${q.bk}` : ''}${q.temps && q.temps.length ? ` · ล็อกชั่วคราว ${q.temps.length}` : ''}`;
    return `<div class="border border-line rounded-lg p-3 flex flex-col gap-3">
      <div class="flex items-center justify-between"><b>คันที่ ${i + 1}</b>${canConfirm && r.cars.length > 1 ? `<button class="btn btn-ghost btn-sm" data-act="recv-car-del" data-i="${i}">ลบคันนี้</button>` : ''}</div>
      ${c.model_text ? `<div class="text-xs text-muted">อ่านจากใบ: ${esc(c.model_text)} ${esc(c.color_raw || '')}</div>` : ''}
      ${st ? `<div class="p-2 px-3 rounded-lg text-sm" style="background:var(--${st.t}-soft);color:var(--${st.t})"><div class="flex flex-wrap items-start justify-between gap-2"><div><b>${esc(st.h)}</b><div class="text-xs">${esc(st.d)}</div></div>${inStock ? `<button class="btn btn-ghost btn-sm" data-act="car-open" data-vin="${esc(vin)}">ดูข้อมูลรถคันนี้</button>` : ''}</div></div>` : ''}
      <div class="grid sm:grid-cols-2 gap-3">
        <div class="field sm:col-span-2"><label for="rv-vin-${i}" class="req">หมายเลขตัวถัง (Frame No.)</label><input id="rv-vin-${i}" class="code" maxlength="17" data-modal="r.cars.${i}.vin" value="${esc(c.vin || '')}" ${dis}></div>
        <div class="field"><label for="rv-m-${i}" class="req">Model</label><select id="rv-m-${i}" data-modal="r.cars.${i}.model" ${dis}>${opt(Object.keys(CATALOG), c.model, 'เลือกรุ่น')}</select></div>
        <div class="field"><label for="rv-g-${i}" class="req">Grade</label><select id="rv-g-${i}" data-modal="r.cars.${i}.grade" ${c.model ? dis : 'disabled'}>${opt(grades, c.grade, 'เลือกเกรด')}</select></div>
        <div class="field"><label for="rv-c-${i}" class="req">รหัสสี</label><select id="rv-c-${i}" data-modal="r.cars.${i}.color" ${c.grade ? dis : 'disabled'}>${opt(colors, c.color, 'เลือกสี')}</select></div>
        <div class="field"><label for="rv-e-${i}">หมายเลขตัวเครื่อง</label><input id="rv-e-${i}" class="code" data-modal="r.cars.${i}.engine" value="${esc(c.engine || '')}" ${dis}></div>
        <div class="sm:col-span-2 flex flex-col gap-2">${prodField({ id: `rv-p-${i}`, path: `r.cars.${i}.prod`, val: c.prod, max: r.doc_date && r.doc_date < todayISO() ? r.doc_date : todayISO(), img: c.prod_img,
          slot: (m.pimg || [])[i] || {}, i, required: !(inStock && inStock.prodIds), dis,
          note: inStock && inStock.prodIds ? `ไฟล์ IDS มีวันผลิตแล้ว ${fmtD(inStock.prodIds)} ไม่ต้องใส่ก็ได้` : 'ดูจากป้ายที่ตัวรถ (ไม่ใช่ใบ New Car) ถ่ายรูปป้ายเพิ่มได้ AI จะอ่านวันที่ให้' })}</div>
        <div class="field sm:col-span-2"><label for="rv-q-${i}">จับคู่ Quota (Ref)</label><select id="rv-q-${i}" data-modal="r.cars.${i}.ref" ${dis}>
          <option value="" ${c.ref === '' ? 'selected' : ''}>ไม่จับคู่</option>${qCands.map(q => `<option value="${esc(q.ref)}" ${c.ref === q.ref ? 'selected' : ''}>${esc(qLab(q))}</option>`).join('')}</select></div>
      </div>
      ${errs.map(e => `<div class="text-sm" style="color:var(--bad)">✗ ${esc(e)}</div>`).join('')}${notes.map(e => `<div class="text-sm" style="color:var(--good)">✓ ${esc(e)}</div>`).join('')}
    </div>`;
  };
  return `<div class="flex items-start justify-between gap-3 mb-3"><h2 class="font-head text-xl font-semibold">${canConfirm ? 'ตรวจและยืนยันรับรถเข้า' : 'ใบรับรถเข้า'}</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="grid md:grid-cols-2 gap-5">
    <div>${r.img ? `<div class="photo-pane"><img src="${imgSrc(r.img)}" alt="ใบ New Cars Delivery Note"></div><p class="text-xs text-muted mt-1">เลื่อนดูรูปเพื่อเทียบกับข้อมูลด้านขวา</p>` : `<div class="p-4 rounded-lg text-sm text-muted" style="background:var(--surface-2)">${r.manual ? 'คีย์ข้อมูลเองโดยไม่มีรูปใบ New Car · ตรวจเลขตัวถังกับตัวรถหรือเอกสารให้ถูกก่อนยืนยัน' : 'ไม่มีรูป'}</div>`}
      ${(r.extra_imgs || []).map((id, i) => `<div class="text-xs text-muted mt-3 mb-1">รูปที่ส่งซ้ำ ${i + 1}</div><div class="photo-pane" style="max-height:40vh"><img src="${imgSrc(id)}" alt="รูปใบ New Car ที่ส่งซ้ำ ${i + 1}" loading="lazy"></div>`).join('')}</div>
    <div class="flex flex-col gap-3">
      ${r.ai_ok ? '<p class="text-sm" style="color:var(--good)">ข้อมูลด้านล่าง AI อ่านจากรูป ตรวจทุกช่องก่อนยืนยัน</p>' : `<p class="text-sm" style="color:var(--warn)">${esc(r.ai_msg || 'กรอกข้อมูลจากรูป')}</p>`}
      ${recvRetryBtn(m.id, S.receipts.get(m.id) || r)}
      ${(r.unreadable || []).length ? `<p class="text-sm" style="color:var(--warn)">AI อ่านไม่ออก: ${r.unreadable.map(esc).join(', ')}</p>` : ''}
      <div class="grid sm:grid-cols-2 gap-3">
        <div class="field"><label for="rv-doc">เลขที่เอกสาร</label><input id="rv-doc" class="code" data-modal="r.doc_no" value="${esc(r.doc_no || '')}" ${dis}></div>
        <div class="field"><label for="rv-date" class="req">วันที่เอกสาร (ใช้เป็นวันที่รถฝากศูนย์)</label><input id="rv-date" type="date" data-modal="r.doc_date" value="${esc(r.doc_date || '')}" max="${todayISO()}" ${dis}></div>
        <div class="field"><label for="rv-br" class="req">ส่งถึงสาขา</label><select id="rv-br" data-modal="r.br" ${myBranch() || !canConfirm ? 'disabled' : ''}>${BRS.map(b => `<option value="${b}" ${r.br === b ? 'selected' : ''}>${BR[b].code} ${b} ${BR[b].name}</option>`).join('')}</select></div>
        <div class="field"><label for="rv-ref">REF NO.</label><input id="rv-ref" class="code" data-modal="r.ref_no" value="${esc(r.ref_no || '')}" ${dis}></div>
      </div>
      ${(r.cars || []).map(carBlock).join('')}
      ${canConfirm ? `<button class="btn btn-ghost btn-sm self-start" data-act="recv-car-add">+ เพิ่มรถอีกคันในใบนี้</button>` : ''}
      ${canConfirm ? `<div class="field"><label for="rv-note">หมายเหตุ (ถ้าตีกลับต้องใส่)</label><input id="rv-note" data-modal="note" value="${esc(m.note || '')}"></div>
      ${(() => { const d = recvDupsOf({ ...r, id: m.id }, D); return d.length ? `<div class="p-3 rounded-lg text-sm" style="background:var(--bad-soft);color:var(--bad)"><b>ใบนี้น่าจะซ้ำ</b> ${d.map(esc).join(' · ')} · ถ้าซ้ำจริง กด "ซ้ำ ไม่ต้องรับเข้า"</div>` : ''; })()}
      <div class="flex flex-wrap justify-end gap-2"><button class="btn btn-ghost" data-act="recv-dup" data-id="${esc(m.id)}">ซ้ำ ไม่ต้องรับเข้า</button><button class="btn btn-ghost" data-act="recv-reject">ไม่ผ่าน ตีกลับ</button><button class="btn btn-red" data-act="recv-confirm">ยืนยันรับรถเข้าสต็อก</button></div>`
      : m.status === 'pending' ? `<p class="text-sm text-muted">ต้องให้แอดมินสาขา ${esc(r.br || '')} หรือผู้จัดการเป็นคนยืนยัน</p>` : (r.review?.note ? `<p class="text-sm">หมายเหตุ: ${esc(r.review.note)}</p>` : '')}
      ${recvCanDelete(m) ? `<div class="flex justify-start pt-2 mt-1 border-t border-line"><button class="btn btn-ghost btn-sm" style="color:var(--bad)" data-act="recv-del" data-id="${esc(m.id)}">ลบรายการนี้ (ลงผิด ไม่เก็บเข้าระบบ)</button></div>` : ''}
    </div>
  </div>`;
}

// ---------- IDS upload
function viewUploadBase(D) {
  const p = perms(), X = D.X, U = S.upl;
  const cell = m => m ? `<div class="num">${fmtD(m.asof)}</div><div class="text-xs text-muted">${m.n ?? ''} แถว · ${fmtDT(m.at)}</div>` : '<span class="text-xs" style="color:var(--warn)">ข้อมูลตัวอย่าง</span>';
  const hist = [...S.uploads.entries()].map(([id, u]) => ({ id, ...u })).filter(u => !S.br || u.br === S.br).sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  const sel = U.results.filter(r => r.on);
  return `
  ${pageHead('อัปเดตข้อมูล IDS', 'อัปโหลดไฟล์ Excel ที่ export จาก IDS หรือ Google Sheets ที่ดาวน์โหลดเป็น .xlsx ได้หลายไฟล์พร้อมกัน ระบบอ่านทุกชีตและแยกเองว่าเป็น Stock, Booking, Quota หรือ Invoice/DL ของสาขาไหน')}
  <section class="mb-5">
    <h2 class="font-head text-lg font-semibold mb-2">ข้อมูลที่ใช้อยู่ตอนนี้ <span class="text-sm font-normal text-muted">กดช่องเพื่อดูข้อมูลเป็นตาราง</span></h2>
    <div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl">
      <thead><tr><th>สาขา</th><th>Stock</th><th>Booking</th><th>Quota</th><th>Invoice/DL</th></tr></thead>
      <tbody>${BRS.map(b => { const s = X.src[b]; return `<tr><td class="nowrap"><b>${b}</b> <span class="text-xs text-muted">${BR[b].name}</span></td>
        <td>${idsViewBtn('stock', b, cell(s.stock), !!s.stock)}</td><td>${idsViewBtn('booking', b, cell(s.booking), !!s.booking)}</td>
        <td>${idsViewBtn('quota', b, s.quota.length ? s.quota.map(q => `<div class="text-sm nowrap">${fmtM(q.m)} · ${q.n ?? ''} แถว</div>`).join('') + `<div class="text-xs text-muted">${fmtDT(s.quota.at(-1).at)}</div>` : cell(null), !!s.quota.length)}</td>
        <td>${s.invoice ? idsViewBtn('invoice', b, cell(s.invoice), true) : '<span class="text-xs text-muted">ยังไม่มี</span>'}</td></tr>`; }).join('')}</tbody></table></div>
  </section>
  ${idsPasteBox()}
  <section class="bg-surface border border-line rounded-lg p-4 md:p-5 mb-5">
    <label class="drop relative ${p.upload && p.write && !U.busy ? '' : 'opacity-50'}">
      <input type="file" multiple accept=".xlsx,.xls,.csv,.htm,.html,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" data-file="ids" ${p.upload && p.write && !U.busy ? '' : 'disabled'} aria-label="ไฟล์จาก IDS">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="color:var(--red)">${ICON.upload}</svg>
      <span class="font-medium">${U.busy ? '<span class="spin"></span> กำลังอ่านไฟล์…' : 'เลือกไฟล์ IDS (.xlsx .xls .csv)'}</span>
      <span class="text-xs text-muted">${p.upload ? (myBranch() ? `แอดมินอัปโหลดได้เฉพาะสาขา ${myBranch()}` : 'อ่านในเครื่องก่อน ยังไม่บันทึกจนกว่าจะกดยืนยัน') : 'บทบาทนี้อัปโหลดไม่ได้ ลองสลับเป็นแอดมินหรือผู้จัดการ'}</span>
    </label>
    ${U.msg ? `<p class="mt-3 text-sm" style="color:var(--bad)">${esc(U.msg)}</p>` : ''}
    ${U.results.length ? `<div class="mt-4">
      <h3 class="font-head font-semibold mb-2">ตารางที่พบในไฟล์</h3>
      <div class="border border-line rounded-lg scroll-x"><table class="tbl text-sm">
        <thead><tr><th></th><th>ไฟล์ / ชีต</th><th>ชนิด</th><th>สาขา</th><th>ข้อมูล ณ วันที่</th><th class="text-right">แถว</th><th>เทียบกับข้อมูลเดิม</th><th>หมายเหตุ</th></tr></thead>
        <tbody>${U.results.map((r, i) => `<tr>
          <td><input type="checkbox" class="w-5 h-5" data-upl-on="${i}" ${r.on ? 'checked' : ''} ${r.error || r.block ? 'disabled' : ''} aria-label="บันทึกตารางนี้"></td>
          <td><div class="font-medium">${esc(r.file)}</div><div class="text-xs text-muted">ชีต ${esc(r.sheet)}</div></td>
          <td class="nowrap">${SRC_LABEL[r.src] || '–'}${r.months.length ? `<div class="text-xs text-muted">${r.months.map(fmtM).join(', ')}</div>` : ''}</td>
          <td><b>${esc(r.br || '?')}</b></td>
          <td>${r.error ? '–' : `<input type="date" data-upl-date="${i}" value="${esc(r.asof || '')}" max="${todayISO()}" style="background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:4px 6px">`}</td>
          <td class="num text-right">${r.rows.length}</td>
          <td class="text-xs">${r.src === 'invoice' && r.diff && !r.error ? uplInvCell(r, i) : r.diff ? `เดิม ${r.diff.prevN} → ใหม่ ${r.rows.length}${r.src === 'stock' ? `<div>ออก <b>${r.diff.out.length}</b> · เข้าใหม่ <b>${r.diff.inN}</b>${r.diff.out.filter(o => o.flag).length ? ` · <span style="color:var(--bad)">ไม่พบข้อมูล ${r.diff.out.filter(o => o.flag).length}</span>` : ''}</div>` : ''}${r.diff.baseSample ? '<div class="text-muted">(เทียบกับข้อมูลตัวอย่าง)</div>' : ''}` : '–'}</td>
          <td class="text-xs">${r.error ? `<span style="color:var(--bad)">${esc(r.error)}</span>` : ''}${r.block ? `<div style="color:var(--bad)">${esc(r.block)}</div>` : ''}${r.older ? `<div style="color:var(--warn)">${esc(r.older)}</div>` : ''}${r.note ? `<div class="text-muted">${esc(r.note)}</div>` : ''}${r.warn.slice(0, 3).map(w => `<div style="color:var(--warn)">${esc(w)}</div>`).join('')}${r.warn.length > 3 ? `<div class="text-muted">และอีก ${r.warn.length - 3} ข้อ</div>` : ''}</td></tr>`).join('')}</tbody></table></div>
      <div class="flex flex-wrap gap-3 items-center mt-3">
        <button class="btn btn-red" data-act="upl-save" ${sel.length && !U.busy && !sel.some(uplNeedsChoice) ? '' : 'disabled'}>${U.busy ? '<span class="spin"></span> กำลังบันทึก…' : `บันทึก ${sel.length} ตาราง`}</button>
        <button class="btn btn-ghost" data-act="upl-clear">ล้าง</button>
        <span class="text-xs text-muted">${sel.some(uplNeedsChoice) ? '<span style="color:var(--bad)">ตาราง DL: เลือกก่อนว่าจะใช้ชื่อเดิมหรือข้อมูลใหม่</span>' : 'ตาราง Stock ที่บันทึกจะเก็บประวัติรถที่ออกและเข้าไว้ด้านล่าง'}</span></div>
    </div>` : ''}
  </section>
  ${brSeg()}
  <section><h2 class="font-head text-lg font-semibold mb-2">ประวัติการอัปโหลด</h2>
    <div class="bg-surface border border-line rounded-lg divide-y divide-line">${hist.slice(0, 40).map(u => {
      const open = S.filters.uplOpen === u.id, flagged = (u.out || []).filter(o => o.flag && !o.res).length;
      return `<div class="p-3 md:px-4">
        <div class="flex flex-wrap gap-x-5 gap-y-1 items-center text-sm">
          <span class="w-32 num text-muted">${fmtDT(u.at)}</span><span class="w-36 font-medium">${SRC_LABEL[u.src]} ${esc(u.br)}${u.m ? ' ' + fmtM(u.m) : ''}</span>
          <span>ข้อมูล ณ ${fmtD(u.asof)} · ${u.prevN ?? '?'} → <b>${u.n}</b> แถว</span>
          ${u.src === 'stock' ? `<span>ออก ${(u.out || []).length} · เข้า ${u.inN || 0}${flagged ? ` · <b style="color:var(--bad)">ไม่พบข้อมูล ${flagged} คัน</b>` : ''}</span>` : ''}
          ${u.src === 'booking' && (u.out || []).length ? `<span>หายจาก IDS ${(u.out || []).length} ใบ${flagged ? ` · <b style="color:var(--bad)">ต้องตรวจ ${flagged} ใบ</b>` : ''}</span>` : ''}
          <span class="text-muted">${who(u)}</span>
          ${(u.out || []).length ? `<button class="ml-auto text-sm underline" data-act="upl-open" data-id="${esc(u.id)}" aria-expanded="${open}">${open ? 'ซ่อน' : u.src === 'booking' ? (flagged ? 'ดูและจัดการใบจองที่หาย' : 'ดูใบจองที่หาย') : flagged ? 'ดูและระบุรถที่ออก' : 'ดูรถที่ออก'}</button>` : ''}
        </div>
        ${open ? (u.src === 'booking' ? bkOutList(u, D) : outFixList(u)) : ''}
      </div>`;
    }).join('') || emptyBox('ยังไม่มีการอัปโหลด', 'เมื่ออัปโหลดไฟล์ Stock ระบบจะบอกว่ารถคันไหนออกไปเพราะส่งมอบ ย้ายสาขา หรือหายไปโดยไม่มีข้อมูล')}</div>
  </section>`;
}

// what makes a waiting receipt a repeat: another receipt with the same document number or frame number,
// or a frame number this system already received
function recvDupsOf(r, D) {
  const out = [];
  receiptDups(r).filter(x => x.id !== r.id).forEach(x => out.push(`ใบ ${x.doc_no || 'ไม่มีเลขที่'} (${x.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอยืนยัน'} ${fmtD((x.created_at || '').slice(0, 10))})`));
  (r.cars || []).forEach(c => { const v = String(c.vin || '').toUpperCase(), o = S.vehicles.get(v); if (VIN_RE.test(v) && o && o.added && o.added.receipt !== r.id) out.push(`${v} รับเข้าแล้ว`); });
  return [...new Set(out)];
}

// the Ref the system suggests for a received car: one already locked or booked first (that customer is waiting for it), then the oldest delivery month
function recvRefPick(qs) {
  return [...qs].sort((a, b) => (!!b.lock - !!a.lock) || (!!(b.booking || b.bk) - !!(a.booking || a.bk)) || (b.temps?.length || 0) - (a.temps?.length || 0) || (a.m || '').localeCompare(b.m || '') || (a.week || 0) - (b.week || 0))[0] || null;
}
