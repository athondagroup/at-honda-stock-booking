// ---------- booking detail: this car's numbers on top (Margin, discount, FOC, left over / over), its dates,
// and buttons to the sale terms and the sale approval form for the commission (24/10, preview)
function saleDates(a, D) {
  const inv = soldInv(a, D), fl = a.flow || {};
  return { idate: inv ? inv.idate : null, adv: !!(inv && inv.adv), ddate: fl.deliveredDate || (inv && inv.ddate) || a.rec.delivered_date || null };
}
function saleFoc(a) {
  const po = (a.rec.flow && a.rec.flow.po) || {}, items = po.items || [];
  const cost = items.reduce((n, x) => n + (Number(x.cost) || 0) * (Number(x.qty) || 1), 0);
  if (po.at && cost) return { v: cost, src: 'ตาม PO' };
  const f = a.rec.foc_total;
  return f === null || f === undefined || f === '' ? { v: null, src: '' } : { v: Number(f) || 0, src: 'ตามใบจอง' };
}
function saleSum(a, D) {
  const d = a.rec.deal || {}, has = !!d.at;
  const disc = has ? num(d.disc) + num(d.down_disc) : bookDiscount(a);
  const foc = saleFoc(a), margin = has ? num(d.margin) : null;
  const bal = margin !== null ? margin - num(disc) - num(foc.v) : null;
  return { d, has, margin, disc, foc, bal, ...saleDates(a, D) };
}
function saleSumBox(a, D) {
  if (a.cancelled || a.demo) return '';
  const s = saleSum(a, D), mine = !isSales() || isMine(a.sales);
  if (!mine) return '';
  const cell = (k, v, sub, tone) => `<div class="min-w-0"><div class="text-xs text-muted">${k}</div><div class="num font-semibold" ${tone ? `style="color:var(--${tone})"` : ''}>${v}</div>${sub ? `<div class="text-xs text-muted">${sub}</div>` : ''}</div>`;
  const balTxt = s.bal === null ? '–' : `${s.bal < 0 ? 'เกิน' : 'เหลือ'} ${money(Math.abs(s.bal))}`;
  const sold = !!(s.idate || s.ddate || a.done);
  const canDate = a.done && !s.ddate && perms().write && canEditBooking(a);
  const dateIn = canDate ? `<div class="flex flex-wrap gap-2 items-end"><div class="field"><label for="sl-dd">วันส่งมอบ (ไม่มีในไฟล์ IDS)</label><input id="sl-dd" type="date" data-modal="sale_ddate" value="${esc((S.modal && S.modal.sale_ddate) || '')}"></div>
    <button class="btn btn-ghost btn-sm" data-act="sale-ddate" data-id="${esc(a.id)}">บันทึกวันส่งมอบ</button></div>` : '';
  return `<div class="pt-2 border-t border-line flex flex-col gap-2">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
      ${cell('Margin รวม', s.margin === null ? '–' : money(s.margin), s.has ? '' : 'ยังไม่ใส่เงื่อนไข')}
      ${cell('ส่วนลด', s.disc === null ? '–' : money(s.disc), s.has && num(s.d.down_disc) ? `รวมส่วนลดดาวน์ ${money(s.d.down_disc)}` : '')}
      ${cell('FOC รวม', s.foc.v === null ? '–' : money(s.foc.v), s.foc.src)}
      ${cell('เหลือ / เกิน', balTxt, 'Margin − ส่วนลด − FOC', s.bal === null ? '' : s.bal < 0 ? 'bad' : 'good')}
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      <div><div class="text-muted">ออกใบกำกับ</div><div class="num">${fmtD(s.idate)}${s.adv ? ' (Advance)' : ''}</div></div>
      <div><div class="text-muted">ส่งมอบ</div><div class="num">${s.ddate ? fmtD(s.ddate) : a.done ? '<span style="color:var(--warn)">ส่งมอบแล้ว ไม่มีวันที่</span>' : '–'}</div></div>
    </div>
    ${dateIn}
    <div class="flex flex-wrap gap-2">
      <button class="btn btn-ghost btn-sm" data-act="sale-terms">ดูเงื่อนไขการขาย</button>
      ${sold ? `<button class="btn btn-ghost btn-sm" data-act="sale-app" data-id="${esc(a.id)}">ใบอนุมัติการขาย (เบิกค่าคอม)</button>` : '<span class="text-xs text-muted self-center">ใบอนุมัติการขายพิมพ์ได้หลังออกใบกำกับ</span>'}
    </div></div>`;
}
function printSaleApp(a, D) {
  const s = saleSum(a, D), d = s.d, r = a.rec, vin = atVin(a) || '', c = vin ? (carAny(vin, D) || {}) : {}, cash = isCash(r);
  const M = v => v === null || v === undefined || v === '' ? '–' : money(v);
  const fin = (r.flow && r.flow.fin && r.flow.fin.company) || r.finance || '';
  const kv = [
    ['ลูกค้า', a.cust || '', 'เซลล์', `${a.sales || ''} (${a.br || ''})`],
    ['รุ่น / เกรด', `${a.model || ''} ${gradeShort(a.model, a.grade) || a.grade || ''}`, 'สี', a.color || ''],
    ['เลขตัวถัง', vin || '–', 'เลขเครื่อง', c.engine || '–'],
    ['เลขที่ใบจอง', a.no || '–', 'วันที่จอง', fmtD(a.date)],
    ['ออกใบกำกับ', fmtD(s.idate), 'ส่งมอบ', fmtD(s.ddate)],
    ['การซื้อ', cash ? 'ซื้อสด' : `ไฟแนนซ์ ${finFull(fin)}`, 'แคมเปญ', d.campaign || '–']
  ];
  const terms = [['ราคารถ (ราคาเต็ม)', M(d.price)], ['ส่วนลดราคารถ', M(d.disc)]];
  if (!cash) terms.push(['เงินดาวน์', M(d.down)], ['ส่วนลดดาวน์', M(d.down_disc)], ['ยอดจัด', M(d.fin_amount)], ['ดอกเบี้ย / งวด', `${d.rate ?? '–'} % · ${d.term || '–'} งวด`]);
  const mg = [['1. Margin รถ', M(d.margin_car)], ['2. AT แคมเปญ', M(d.margin_at)], ['3. Honda แคมเปญ', M(d.margin_honda)], [`4. สิทธิพิเศษ Honda${d.privileges ? ` (${d.privileges})` : ''}`, M(d.margin_priv)], ['Margin รวม', M(s.margin)],
    ['หัก ส่วนลดรวม', M(s.disc)], [`หัก FOC รวม (${s.foc.src || '–'})`, M(s.foc.v)], [s.bal !== null && s.bal < 0 ? 'เกิน Margin' : 'เหลือ', s.bal === null ? '–' : money(Math.abs(s.bal))]];
  const blocks = [
    { h: 'ข้อมูลรถและลูกค้า' }, { kv },
    { h: 'เงื่อนไขการขาย' }, { items: { cols: ['รายการ', 'บาท'], widths: [0.7, 0.3], rows: terms } },
    { h: 'Margin และยอดคงเหลือ' }, { items: { cols: ['รายการ', 'บาท'], widths: [0.7, 0.3], rows: mg } },
    ...(s.has ? [] : [{ note: 'หมายเหตุ: ใบจองนี้ยังไม่ได้ใส่เงื่อนไขการขาย ตัวเลขยังไม่ครบ' }]),
    { sign: ['พนักงานขาย', 'ผู้จัดการฝ่ายขาย', 'ฝ่ายบัญชี'] }
  ];
  const spec = { title: 'ใบอนุมัติการขาย (เบิกค่าคอม)', font: '"Sarabun"', fs: 14, onePage: true, letter: { lines: brLetter(a.br), logo: hondaLogo(), logoH: 26 },
    meta: [`พิมพ์ ${fmtD(todayISO())}`, a.flow && a.flow.done && a.flow.done.confirmed ? 'ผู้จัดการยืนยันในระบบแล้ว' : 'ยังไม่ได้ยืนยันในระบบ'], blocks };
  openDoc(spec, docName('ใบอนุมัติการขาย', a.cust, todayISO()), { kind: 'at', id: a.id });
}
Object.assign(ACTIONS, {
  'sale-terms'() { const t = document.querySelector('#modal-root [data-deal-box]') || document.querySelector('#modal-root [data-flow-steps]'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  'sale-app'(el) { const a = atById(el.dataset.id); if (a) printSaleApp(a, derive()); },
  async 'sale-ddate'(el) {
    const a = atById(el.dataset.id); if (!a || !canEditBooking(a)) return;
    const v = S.modal && S.modal.sale_ddate;
    if (!v) { toast('เลือกวันส่งมอบก่อน', 'bad'); return; }
    if (a.date && v < a.date) { toast('วันส่งมอบต้องไม่ก่อนวันจอง', 'bad'); return; }
    const ok = await saveBk(a.id, 'ใส่วันส่งมอบ', fmtD(v), x => { x.delivered_date = v; });
    if (ok && S.modal) { S.modal.sale_ddate = ''; render(); }
  }
});
