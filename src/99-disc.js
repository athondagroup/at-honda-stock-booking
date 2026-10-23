// ------------------------------------------------------------------ ใบสำคัญรับส่วนลด (23/10)
// The customer signs that they received the discount: printed from the delivery step on one A4 page, with the branch
// letterhead and an official font (Sarabun). The figures come from the booking and can be corrected before printing;
// what was printed is kept on the booking (rec.disc_doc). Only function declarations here.
function brLetter(br) {
  const L = {
    PSC: ['บริษัท เอที ฮอนด้า ออโตโมบิล (ภาษีเจริญ) จำกัด สำนักงานใหญ่', 'ที่อยู่ 689/1 ถนนเพชรเกษม แขวงบางหว้า เขตภาษีเจริญ กทม. 10160', 'เลขประจำตัวผู้เสียภาษี 0105548089331', 'โทร 02-455-8888 · แฟกซ์ 02-455-8559, 02-455-8584'],
    ATE: ['บริษัท เอที ฮอนด้า ออโตโมบิล (เอกชัย-บางบอน) จำกัด', 'ที่อยู่ 1283/1 ถนนเอกชัย แขวงบางบอนใต้ เขตบางบอน กทม. 10150', 'เลขประจำตัวผู้เสียภาษี 0735555003378', 'โทร 02-453-8888 · แฟกซ์ 02-453-8889'],
    SPH: ['บริษัท เอที ฮอนด้า ออโตโมบิล (สามพราน) จำกัด สำนักงานใหญ่', 'ที่อยู่ 25/444 หมู่ที่ 4 ตำบลอ้อมใหญ่ อำเภอสามพราน จังหวัดนครปฐม 73160', 'เลขประจำตัวผู้เสียภาษี 0735553000517', 'โทร 02-420-6666 · แฟกซ์ 02-420-6346'],
    KPA: ['บริษัท เอที ฮอนด้า ออโตโมบิล (กำแพงแสน) จำกัด', 'ที่อยู่ 124 หมู่ 1 ตำบลทุ่งกระพังโหม อำเภอกำแพงแสน จังหวัดนครปฐม 73140', 'เลขประจำตัวผู้เสียภาษี 0735555003386', 'โทร 034-900888 · แฟกซ์ 034-900889']
  };
  return L[br] || L.PSC;
}
function brCompanyName(br) { return brLetter(br)[0].replace(/ สำนักงานใหญ่$/, ''); }
function thDateLong(d) {
  const M = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  if (!d) return ['', '', '']; const [y, m, dd] = d.split('-').map(Number); return [String(dd), M[m - 1], String(y + 543)];
}
// the black Honda logo from the Honda VI guideline the company sent (23/10), for the letterhead
function hondaLogo() { return 'data:image/png;base64,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'; }
// full finance company names for the form
function finFull(f) {
  const k = String(f || '').trim().toUpperCase();
  const M = { HLTC: 'บริษัท ฮอนด้า ลีสซิ่ง (ประเทศไทย) จำกัด', BAY: 'ธนาคารกรุงศรีอยุธยา จำกัด (มหาชน)', KRUNGSRI: 'ธนาคารกรุงศรีอยุธยา จำกัด (มหาชน)', SCB: 'ธนาคารไทยพาณิชย์ จำกัด (มหาชน)', TTB: 'ธนาคารทหารไทยธนชาต จำกัด (มหาชน)', TMB: 'ธนาคารทหารไทยธนชาต จำกัด (มหาชน)', KKP: 'ธนาคารเกียรตินาคินภัทร จำกัด (มหาชน)', KNK: 'ธนาคารเกียรตินาคินภัทร จำกัด (มหาชน)', KBANK: 'ธนาคารกสิกรไทย จำกัด (มหาชน)', KTB: 'ธนาคารกรุงไทย จำกัด (มหาชน)', BBL: 'ธนาคารกรุงเทพ จำกัด (มหาชน)', TISCO: 'ธนาคารทิสโก้ จำกัด (มหาชน)', LH: 'ธนาคารแลนด์ แอนด์ เฮ้าส์ จำกัด (มหาชน)' };
  return M[k] || f || '';
}
// what goes on the form: saved values first, then the booking / delivery / commission data
function discPre(a, D) {
  const r = a.rec, f = r.flow || {}, cm = r.comm || {}, vin = atVin(a) || '';
  // the numbers come from the finance step (deal); a receipt printed before the deal was last changed does not override it
  const dl = r.deal || {}, s0 = r.disc_doc || {}, fresh = dl.at && (!s0.at || dl.at > s0.at);
  const s = fresh ? Object.fromEntries(Object.entries(s0).filter(([k]) => !['price', 'body', 'downDisc', 'cashDisc', 'down'].includes(k))) : s0;
  const has = k => dl[k] !== null && dl[k] !== undefined && dl[k] !== '';
  const c = vin ? (D.cars.get(vin) || carAny(vin, D) || {}) : {};
  const cash = isCash(r), fin = (f.fin && f.fin.company) || r.finance || '';
  const total = num(cm.discount) || num(r.discount) || 0;
  return {
    date: s.date || (f.delivered && f.delivered.date) || todayISO(), cust: s.cust || a.cust || '', model: s.model || a.model || '', grade: s.grade || gradeShort(a.model, a.grade) || a.grade || '', color: s.color || a.color || '',
    vin: s.vin || vin, engine: s.engine || c.engine || '', cash: s.cash ?? cash, fin: s.fin ?? finFull(fin), down: s.down ?? (has('down') ? dl.down : (num(cm.down) || num(r.down) || '')), price: s.price ?? (has('price') ? dl.price : (num(cm.price) || num(r.price) || '')),
    body: s.body ?? (cash ? '' : has('disc') ? dl.disc : total || ''), downDisc: s.downDisc ?? (has('down_disc') ? dl.down_disc : ''), cashDisc: s.cashDisc ?? (cash ? (has('disc') ? dl.disc : total || '') : ''), tel: s.tel || '', mobile: s.mobile || r.phone || ''
  };
}
function discTotal(v) { return v.cash ? num(v.cashDisc) : num(v.body) + num(v.downDisc); }
// the button: next to "พิมพ์ใบแต่งรถ" (po) or in the delivery step (deliv); the form opens where it was pressed
function discBtn(a, at) { return perms().write && canEditBooking(a) && !a.cancelled ? `<button class="btn btn-ghost btn-sm" data-act="disc-open" data-at="${at}" data-id="${esc(a.id)}">พิมพ์ใบสำคัญรับส่วนลด</button>` : ''; }
function discBox(a, m, D, at = 'deliv') {
  if (!perms().write || !canEditBooking(a) || a.cancelled) return '';
  const here = m.disc && (m.discAt || 'deliv') === at;
  if (!here) return at === 'po' ? '' : (m.disc ? '' : `<div class="mt-2">${discBtn(a, 'deliv')}${a.rec.disc_doc && a.rec.disc_doc.at ? ` <span class="text-xs text-muted">พิมพ์ล่าสุด ${fmtDT(a.rec.disc_doc.at)}</span>` : ''}</div>`);
  const v = m.disc, F = (k, label, type = 'text', extra = '') => `<div class="field"><label for="ds-${k}">${label}</label><input id="ds-${k}" type="${type}" ${type === 'number' ? 'min="0" step="100"' : 'autocomplete="off"'} data-modal="disc.${k}" value="${esc(v[k] ?? '')}" ${extra}></div>`;
  return `<div class="mt-2 p-3 rounded-lg border border-line" style="background:var(--surface-2)"><div class="font-medium mb-2">ใบสำคัญรับส่วนลด · ตรวจข้อมูลก่อนพิมพ์</div>
    <div class="grid sm:grid-cols-3 gap-3">${F('date', 'วันที่', 'date')}${F('cust', 'ชื่อลูกค้า')}${F('mobile', 'มือถือ')}
      ${F('model', 'รุ่น')}${F('grade', 'แบบ')}${F('color', 'สี')}${F('vin', 'หมายเลขตัวถัง')}${F('engine', 'หมายเลขเครื่องยนต์')}${F('tel', 'โทรศัพท์บ้าน / ที่ทำงาน')}
      ${F('price', 'ราคารถยนต์ (ราคาเต็ม)', 'number')}
      <div class="field"><label for="ds-cash">การซื้อ</label><select id="ds-cash" data-modal="disc.cashSel"><option value="cash" ${v.cash ? 'selected' : ''}>ซื้อสด</option><option value="fin" ${v.cash ? '' : 'selected'}>เช่าซื้อ (ไฟแนนซ์)</option></select></div>
      ${v.cash ? F('cashDisc', 'ส่วนลดเงินสด (บาท)', 'number') : F('fin', 'บริษัทไฟแนนซ์ (ชื่อเต็ม)') + F('down', 'เงินดาวน์ (บาท)', 'number') + F('body', 'ส่วนลดในตัวรถ (บาท)', 'number') + F('downDisc', 'ส่วนลดเงินดาวน์ (บาท)', 'number')}</div>
    <div class="text-sm mt-2">รวมส่วนลด <b>${money(discTotal(v))}</b> บาท (${bahtText(discTotal(v))})${num(a.rec.discount) && num(a.rec.discount) !== discTotal(v) ? ` <span style="color:var(--warn)">· ส่วนลดในใบจอง ${money(a.rec.discount)} บาท ไม่เท่ากัน ตรวจอีกครั้ง</span>` : ''}</div>
    <div class="flex flex-wrap gap-2 mt-3"><button class="btn btn-red btn-sm" data-act="disc-print" data-id="${esc(a.id)}">บันทึกและพิมพ์ (A4)</button><button class="btn btn-ghost btn-sm" data-act="disc-close">กลับ</button></div></div>`;
}
function printDisc(a, v) {
  const [dd, mm, yy] = thDateLong(v.date), comp = brCompanyName(a.br), tot = discTotal(v), M = n => n ? money(n) : '';
  const price = num(v.price), body = v.cash ? num(v.cashDisc) : num(v.body), net = price ? price - body : 0;
  const down = num(v.down), dDisc = v.cash ? 0 : num(v.downDisc), downNet = down ? down - dDisc : 0;
  const blocks = [
    { lines: [Object.assign([{ t: 'วันที่', v: dd, w: 0.07 }, { t: 'เดือน', v: mm, w: 0.17 }, { t: 'พ.ศ.', v: yy, w: 0.09 }], { indent: 290, gap: 52 })] },
    { para: `ตามที่ ${comp} ได้อนุมัติให้ออกหนังสือฉบับนี้เพื่อแสดงว่า`, indent: 30, after: 14 },
    { lines: [
      [{ t: 'ข้าพเจ้า', v: v.cust, left: true }],
      [{ t: 'ซื้อรถ HONDA รุ่น', v: v.model, w: 0.3 }, { t: 'แบบ', v: v.grade, w: 0.16 }, { t: 'สี', v: v.color }],
      [{ t: 'หมายเลขตัวถัง', v: v.vin, w: 0.36 }, { t: 'หมายเลขเครื่องยนต์', v: v.engine }],
      [{ t: 'ราคารถยนต์ (ราคาเต็ม)', v: M(price), w: 0.24 }, { t: 'บาท' }],
      [{ box: !!v.cash, t: 'ซื้อสด' }, { box: !v.cash, t: 'เช่าซื้อ กับ', v: v.cash ? '' : finFull(v.fin), left: true }],
      Object.assign([{ t: 'ส่วนลดราคารถ', v: M(body), w: 0.19 }, { t: 'บาท   คงเหลือราคารถ', v: M(net), w: 0.19 }, { t: 'บาท' }], { indent: 20 }),
      ...(v.cash ? [] : [Object.assign([{ t: 'เงินดาวน์', v: M(down), w: 0.15 }, { t: 'บาท  ส่วนลดเงินดาวน์', v: M(dDisc), w: 0.13 }, { t: 'บาท  คงเหลือ', v: M(downNet), w: 0.13 }, { t: 'บาท' }], { indent: 20 })]),
      [{ t: 'รวมส่วนลดทั้งสิ้น', v: M(tot), w: 0.22 }, { t: 'บาท (', v: tot ? bahtText(tot) : '', w: 0.42 }, { t: ')' }],
      [{ t: 'โทรศัพท์บ้าน/ที่ทำงาน', v: v.tel, w: 0.3 }, { t: 'มือถือ', v: v.mobile }]
    ] },
    { space: 10 },
    { para: 'ข้าพเจ้าได้รับเงื่อนไขตามข้อตกลงการขาย ตามที่ได้ตกลงไว้เป็นที่เรียบร้อย จึงขอลงนามหนังสือสำคัญไว้เพื่อเป็นหลักฐาน', indent: 30, after: 4 },
    { para: 'จึงขอรับรองว่าเป็นความจริง', indent: 80 },
    { space: 40 },
    { sign3: [{ t: 'ลูกค้า (ผู้รับส่วนลด)', name: v.cust }, { t: 'พนักงานขาย', name: a.sales || '' }] },
    { space: 30 },
    { sign3: [{ t: 'ผู้จัดการฝ่ายขาย', name: '' }, { t: 'ผู้อนุมัติ', name: '' }] }
  ];
  const spec = { title: 'ใบสำคัญรับส่วนลด', font: '"Sarabun"', fs: 15, rowGap: 50, onePage: true, letter: { lines: brLetter(a.br), logo: hondaLogo(), logoH: 26 }, blocks };
  openDoc(spec, docName('ใบสำคัญรับส่วนลด', a.cust, v.date || todayISO()), { kind: 'at', id: a.id });
}
Object.assign(ACTIONS, {
  'disc-open'(el) { const a = atById(el.dataset.id); if (!a) return; if (!S.modal || S.modal.id !== a.id) S.modal = { kind: 'at', id: a.id }; S.modal.disc = discPre(a, derive()); S.modal.discAt = el.dataset.at || 'deliv'; render(); },
  'disc-close'() { if (S.modal) { S.modal.disc = null; render(); } },
  async 'disc-print'(el) {
    const a = atById(el.dataset.id), v = S.modal && S.modal.disc; if (!a || !v || !canEditBooking(a)) return;
    if (!String(v.cust || '').trim()) { toast('ใส่ชื่อลูกค้า', 'bad'); return; }
    if (!discTotal(v)) { toast('ใส่ยอดส่วนลด', 'bad'); return; }
    const keep = { ...v, total: discTotal(v), ...actor() };
    const r = await saveBk(a.id, 'พิมพ์ใบสำคัญรับส่วนลด', `รวม ${money(keep.total)} บาท`, x => { x.disc_doc = keep; });
    if (!r) return;
    S.modal.disc = null; printDisc(atById(a.id) || a, keep);
  }
});
document.addEventListener('change', ev => { const t = ev.target; if (t && t.dataset && t.dataset.modal === 'disc.cashSel' && S.modal && S.modal.disc) { S.modal.disc.cash = t.value === 'cash'; render(); } });
