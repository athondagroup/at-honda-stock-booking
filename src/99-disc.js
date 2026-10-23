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
// what goes on the form: saved values first, then the booking / delivery / commission data
function discPre(a, D) {
  const r = a.rec, f = r.flow || {}, cm = r.comm || {}, s = r.disc_doc || {}, vin = atVin(a) || '';
  const c = vin ? (D.cars.get(vin) || carAny(vin, D) || {}) : {};
  const cash = isCash(r), fin = (f.fin && f.fin.company) || r.finance || '';
  const total = num(cm.discount) || num(r.discount) || 0;
  return {
    date: s.date || (f.delivered && f.delivered.date) || todayISO(), cust: s.cust || a.cust || '', model: s.model || a.model || '', grade: s.grade || gradeShort(a.model, a.grade) || a.grade || '', color: s.color || a.color || '',
    vin: s.vin || vin, engine: s.engine || c.engine || '', cash: s.cash ?? cash, fin: s.fin ?? fin, down: s.down ?? (num(cm.down) || num(r.down) || ''),
    body: s.body ?? (cash ? '' : total || ''), downDisc: s.downDisc ?? '', cashDisc: s.cashDisc ?? (cash ? total || '' : ''), tel: s.tel || '', mobile: s.mobile || r.phone || ''
  };
}
function discTotal(v) { return v.cash ? num(v.cashDisc) : num(v.body) + num(v.downDisc); }
function discBox(a, m, D) {
  if (!perms().write || !canEditBooking(a) || a.cancelled) return '';
  if (!m.disc) return `<div class="mt-2"><button class="btn btn-ghost btn-sm" data-act="disc-open" data-id="${esc(a.id)}">ใบสำคัญรับส่วนลด (พิมพ์ให้ลูกค้าเซ็น)</button>${a.rec.disc_doc && a.rec.disc_doc.at ? ` <span class="text-xs text-muted">พิมพ์ล่าสุด ${fmtDT(a.rec.disc_doc.at)}</span>` : ''}</div>`;
  const v = m.disc, F = (k, label, type = 'text', extra = '') => `<div class="field"><label for="ds-${k}">${label}</label><input id="ds-${k}" type="${type}" ${type === 'number' ? 'min="0" step="100"' : 'autocomplete="off"'} data-modal="disc.${k}" value="${esc(v[k] ?? '')}" ${extra}></div>`;
  return `<div class="mt-2 p-3 rounded-lg border border-line" style="background:var(--surface-2)"><div class="font-medium mb-2">ใบสำคัญรับส่วนลด · ตรวจข้อมูลก่อนพิมพ์</div>
    <div class="grid sm:grid-cols-3 gap-3">${F('date', 'วันที่', 'date')}${F('cust', 'ชื่อลูกค้า')}${F('mobile', 'มือถือ')}
      ${F('model', 'รุ่น')}${F('grade', 'แบบ')}${F('color', 'สี')}${F('vin', 'หมายเลขตัวถัง')}${F('engine', 'หมายเลขเครื่องยนต์')}${F('tel', 'โทรศัพท์บ้าน / ที่ทำงาน')}
      <div class="field"><label for="ds-cash">การซื้อ</label><select id="ds-cash" data-modal="disc.cashSel"><option value="cash" ${v.cash ? 'selected' : ''}>ซื้อสด</option><option value="fin" ${v.cash ? '' : 'selected'}>เช่าซื้อ (ไฟแนนซ์)</option></select></div>
      ${v.cash ? F('cashDisc', 'ส่วนลดเงินสด (บาท)', 'number') : F('fin', 'บริษัทไฟแนนซ์') + F('down', 'เงินดาวน์ (บาท)', 'number') + F('body', 'ส่วนลดในตัวรถ (บาท)', 'number') + F('downDisc', 'ส่วนลดเงินดาวน์ (บาท)', 'number')}</div>
    <div class="text-sm mt-2">รวมส่วนลด <b>${money(discTotal(v))}</b> บาท (${bahtText(discTotal(v))})${num(a.rec.discount) && num(a.rec.discount) !== discTotal(v) ? ` <span style="color:var(--warn)">· ส่วนลดในใบจอง ${money(a.rec.discount)} บาท ไม่เท่ากัน ตรวจอีกครั้ง</span>` : ''}</div>
    <div class="flex flex-wrap gap-2 mt-3"><button class="btn btn-red btn-sm" data-act="disc-print" data-id="${esc(a.id)}">บันทึกและพิมพ์ (A4)</button><button class="btn btn-ghost btn-sm" data-act="disc-close">กลับ</button></div></div>`;
}
function printDisc(a, v) {
  const [dd, mm, yy] = thDateLong(v.date), comp = brCompanyName(a.br), tot = discTotal(v), M = n => n ? money(n) : '';
  const blocks = [
    { lines: [[{ t: 'วันที่', v: dd, w: 0.07 }, { t: 'เดือน', v: mm, w: 0.17 }, { t: 'พ.ศ.', v: yy, w: 0.09 }]].map(r => Object.assign(r, { indent: 290, gap: 44 })) },
    { para: `ตามที่ ${comp} ได้อนุมัติให้ออกหนังสือฉบับนี้เพื่อแสดงว่า`, indent: 30 },
    { lines: [
      [{ t: 'ข้าพเจ้า', v: v.cust, left: true }],
      [{ t: 'ซื้อรถ HONDA รุ่น', v: v.model, w: 0.3 }, { t: 'แบบ', v: v.grade, w: 0.16 }, { t: 'สี', v: v.color }],
      [{ t: 'หมายเลขตัวถัง', v: v.vin, w: 0.36 }, { t: 'หมายเลขเครื่องยนต์', v: v.engine }],
      [{ box: !!v.cash, t: 'ซื้อสด ได้รับส่วนลดเงินสดจำนวนเงิน', v: v.cash ? M(num(v.cashDisc)) : '', w: 0.2 }, { t: 'บาท (', v: v.cash && num(v.cashDisc) ? bahtText(v.cashDisc) : '', w: 0.28 }, { t: ')' }],
      [{ box: !v.cash, t: 'เช่าซื้อ', v: v.cash ? '' : v.fin, w: 0.32 }, { t: 'เงินดาวน์', v: v.cash ? '' : M(num(v.down)), w: 0.3 }, { t: 'บาท' }],
      Object.assign([{ t: '(รายละเอียดส่วนลดในตัวรถ', v: v.cash ? '' : M(num(v.body)), w: 0.17 }, { t: 'บาท  ส่วนลดเงินดาวน์', v: v.cash ? '' : M(num(v.downDisc)), w: 0.17 }, { t: 'บาท)' }], { indent: 20 }),
      [{ t: 'รวมเป็นจำนวนเงินทั้งสิ้น', v: M(tot), w: 0.22 }, { t: 'บาท (', v: tot ? bahtText(tot) : '', w: 0.38 }, { t: ')' }],
      [{ t: 'โทรศัพท์บ้าน/ที่ทำงาน', v: v.tel, w: 0.3 }, { t: 'มือถือ', v: v.mobile }]
    ] },
    { para: 'ข้าพเจ้าได้รับเงื่อนไขตามข้อตกลงการขาย ตามที่ได้ตกลงไว้เป็นที่เรียบร้อย จึงขอลงนามหนังสือสำคัญไว้เพื่อเป็นหลักฐาน', indent: 40 },
    { para: 'จึงขอรับรองว่าเป็นความจริง', indent: 80 },
    { sign3: [{ t: 'ลูกค้า', name: v.cust }, { t: 'พนักงานขาย', name: a.sales || '' }] }
  ];
  const spec = { title: 'ใบสำคัญรับส่วนลด', font: '"Sarabun"', onePage: true, letter: { lines: brLetter(a.br) }, blocks };
  openDoc(spec, docName('ใบสำคัญรับส่วนลด', a.cust, v.date || todayISO()), { kind: 'at', id: a.id });
}
Object.assign(ACTIONS, {
  'disc-open'(el) { const a = atById(el.dataset.id); if (!a) return; if (!S.modal || S.modal.id !== a.id) S.modal = { kind: 'at', id: a.id }; S.modal.disc = discPre(a, derive()); render(); },
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
