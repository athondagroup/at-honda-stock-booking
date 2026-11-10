// ------------------------------------------------------------------ payments of a booking: many rows (ตกลง 2/11)
// Each row: method (cash / transfer / cheque / card), receipt no., amount, date (+ bank for a transfer, cheque no., card fee).
// A part can be paid on the 29th to issue the invoice and the rest when the car is collected. The step "ชำระ" is done when the
// total reaches what must be paid (cash: price - discount; finance: down payment - down discount, from the sale terms), and the
// delivery step opens only then. Old bookings keep their single receipt (shown as one row).
// Only function declarations / ACTIONS here: the first render runs before this part of the file.
function payMethods() { return [['cash', 'เงินสด'], ['transfer', 'โอน'], ['cheque', 'เช็ค'], ['card', 'บัตรเครดิต']]; }
function payMethodName(k) { return (payMethods().find(x => x[0] === k) || [, 'ไม่ระบุวิธี'])[1]; }
function payItems(a) {
  const d = (a.rec.flow || {}).down; if (!d) return [];
  if (Array.isArray(d.items)) return d.items;
  return d.receipt_no ? [{ method: '', receipt_no: d.receipt_no, amount: num(d.amount), date: d.date, by: d.by, role: d.role, at: d.at, legacy: true }] : [];
}
function payRequired(a) {
  const d = a.rec.deal; if (!(d && d.at)) return null;
  // what the customer pays = the net total of the day-of-collection costs (รวมจ่ายสุทธิ), not only the down / the price (10/11)
  const n = payCostVals(a, {}).net;
  return n > 0 ? n : null;
}
const payPaid = a => payItems(a).reduce((t, x) => t + num(x.amount), 0);
function payDone(a) {
  const it = payItems(a); if (!it.length) return false;
  if (it.some(x => x.legacy)) return true;
  if (a.rec.flow && a.rec.flow.delivered && a.rec.flow.delivered.date) return true;   // already handed over: the old rule stands
  const req = payRequired(a); return req === null || payPaid(a) >= req;
}
// the booking's flow.down after a change of the rows (receipt_no / amount / date mirror the rows for the places that read them)
function payDown(a, items, extra) {
  const prev = (a.rec.flow || {}).down || {}, last = items.slice().sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')))[0];
  const { receipt_no, amount, date, ...keep } = prev;
  return { ...keep, ...(extra || {}), items, receipt_no: items.map(x => x.receipt_no).filter(Boolean).join(', ') || null, amount: items.reduce((t, x) => t + num(x.amount), 0), date: last ? last.date : null };
}
// ---------- ค่าใช้จ่ายวันรับรถ (10/11): what the customer pays on collection, laid out like the sale confirmation form.
// Plus: the car (cash: net price) or the down (finance) · credit-protection insurance paid on the day · registration · red-plate deposit
// · insurance premium · accessories the customer pays (from the PO when there is one, typed otherwise) · other items (VAT …, typed).
// Minus: down discount · deposit · trade-in · other items. To see the amount only: it does not change when the step is complete.
const dmyFull = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s.split('-').reverse().join('/') : '';
function payCostAuto(a) {
  const d = a.rec.deal || {}, r = a.rec, cash = isCash(r), po = (r.flow || {}).po || null;
  const poRows = po && Array.isArray(po.items) ? po.items.filter(x => x.cpay && poCharge(x) > 0).map(x => ({ l: x.name || x.part || 'อุปกรณ์', v: poCharge(x) })) : null;
  const gift = by => by === 'AT แถม' || by === 'Honda แถม';
  return {
    cash, hasDeal: !!d.at,
    main: d.at ? (cash ? num(d.price) - num(d.disc) : num(d.down)) : null,
    insCredit: !cash && d.ins_credit_by === 'pay' ? num(d.ins_credit) : 0,
    regGift: gift(d.reg_by) ? d.reg_by : null, regDef: gift(d.reg_by) ? 0 : feeReg(a, d.reg_type),
    insGift: gift(d.ins1_by) ? d.ins1_by : null, insDef: d.ins1_by === 'ลูกค้าซื้อ' ? feeIns(a, 1, d) : 0,
    po: poRows,
    downDisc: cash ? 0 : num(d.down_disc), deposit: num(a.deposit), trade: r.trade && r.trade.has ? num(r.trade.sale_price) : 0, tradeHas: !!(r.trade && r.trade.has), tradeApp: r.trade && r.trade.has ? num(r.trade.price) : 0
  };
}
function payCostVals(a, m) {
  const sv = (a.rec.flow || {}).cost || {}, A = payCostAuto(a);
  // registration / insurance from the fee tables follow the sale terms (person / company, plan): a figure still at the table value it
  // had is replaced when the terms change; one typed by hand stays (10/11)
  const auto = { reg: A.regDef || '', ins: A.insDef || '' }, keep = k => sv[k] != null && !(sv[k + 'Auto'] != null && num(sv[k]) === num(sv[k + 'Auto']) && num(sv[k + 'Auto']) !== num(auto[k]));
  if (!m.cost || m.cost.id !== a.id) m.cost = { id: a.id, auto, reg: keep('reg') ? sv.reg : auto.reg, plate: sv.plate ?? 5000, ins: keep('ins') ? sv.ins : auto.ins, acc: sv.acc ?? '', dep: sv.dep ?? (A.deposit || ''), plus: (sv.plus || []).map(y => ({ ...y })), minus: (sv.minus || []).map(y => ({ ...y })) };
  const v = m.cost;
  for (const k of ['reg', 'ins']) if (v.auto && num(v.auto[k]) !== num(auto[k]) && num(v[k]) === num(v.auto[k])) v[k] = auto[k];
  v.auto = auto;
  const plus = [[A.cash ? 'ค่ารถยนต์ (ราคาสุทธิ)' : 'เงินดาวน์', A.main], ...(A.insCredit ? [['ค่าประกันคุ้มครองสินเชื่อ (ชำระวันรับรถ)', A.insCredit]] : []),
    ['ค่าจดทะเบียน', A.regGift ? 0 : num(v.reg)], ['ค่ามัดจำป้ายแดง', num(v.plate)], ['ค่าเบี้ยประกันภัย', A.insGift ? 0 : num(v.ins)],
    ...(A.po ? A.po.map(y => ['อุปกรณ์ · ' + y.l, y.v]) : [['ค่าอุปกรณ์ตกแต่ง', num(v.acc)]]), ...v.plus.map(y => ['อื่น ๆ · ' + (y.l || ''), num(y.v)])];
  const minus = [...(A.downDisc ? [['ส่วนลดเงินดาวน์', A.downDisc]] : []), ['เงินมัดจำ', num(v.dep)], ...(A.trade ? [['รถเก่าเทิร์น (ราคาขายให้เต็นท์)', A.trade]] : []), ...v.minus.map(y => ['อื่น ๆ · ' + (y.l || ''), num(y.v)])];
  const tp = plus.reduce((n, x) => n + num(x[1]), 0), tm = minus.reduce((n, x) => n + num(x[1]), 0);
  return { A, v, plus, minus, tp, tm, net: tp - tm };
}
function payCostBox(a, m) {
  const { A, v, tp, tm, net } = payCostVals(a, m), sv = (a.rec.flow || {}).cost, edit = canEditBooking(a) && perms().write;
  const dis = edit ? '' : 'disabled';
  const tag = (t, c) => `<span class="chip" style="background:var(--${c}-soft, var(--surface-2));color:var(--${c}, var(--muted))">${t}</span>`;
  const row = (label, val, src) => `<div class="flex items-center gap-2 py-1 border-b border-line text-sm"><span class="grow">${label}</span>${val}${src ? ' ' + src : ''}</div>`;
  const ro = (n, neg) => `<span class="num w-32 text-right p-1 px-2 rounded" style="background:var(--surface-2)${neg && n ? ';color:var(--good)' : ''}">${n ? (neg ? '− ' : '') + money(n) : '–'}</span>`;
  const inp = (k, id) => `<input id="pc-${id}" type="number" min="0" step="1" inputmode="decimal" class="num w-32 text-right p-1 px-2 rounded border border-line" style="background:var(--surface)" data-modal="cost.${k}" value="${esc(v[k] ?? '')}" ${dis}>`;
  const list = (k, sign) => v[k].map((y, i) => `<div class="flex items-center gap-2 py-1 border-b border-line text-sm"><input class="grow p-1 px-2 rounded border border-line" style="background:var(--surface)" data-modal="cost.${k}.${i}.l" value="${esc(y.l || '')}" placeholder="${sign === '+' ? 'เช่น VAT' : 'เช่น ส่วนลดเงินสด'}" ${dis} aria-label="รายการ"><input type="number" min="0" step="1" inputmode="decimal" class="num w-32 text-right p-1 px-2 rounded border border-line" style="background:var(--surface)" data-modal="cost.${k}.${i}.v" value="${esc(y.v ?? '')}" ${dis} aria-label="ยอด">${edit ? `<button class="btn btn-ghost btn-sm" data-act="pc-del" data-k="${k}" data-i="${i}">ลบ</button>` : ''}</div>`).join('')
    + (edit ? `<button class="text-sm mt-1" style="color:var(--red)" data-act="pc-add" data-k="${k}">+ เพิ่มรายการ${sign === '+' ? 'อื่น ๆ (บวก)' : 'หัก'}</button>` : '');
  if (!A.hasDeal) return `<div class="mb-3 p-3 rounded-lg text-sm" style="background:var(--surface-2)">ค่าใช้จ่ายวันรับรถ: ใส่เงื่อนไขการขายก่อน แล้วระบบจะคิดยอดให้</div>`;
  return `<div class="mb-3 p-3 rounded-lg border border-line"><div class="font-medium mb-1">ค่าใช้จ่ายวันรับรถ <span class="text-xs text-muted font-normal">ไว้ดูยอด · ไม่เปลี่ยนการชำระ</span></div>
    ${row(A.cash ? 'ค่ารถยนต์ (ราคาสุทธิ)' : 'เงินดาวน์', ro(A.main), tag('จากเงื่อนไข', 'good'))}
    ${A.insCredit ? row('ค่าประกันคุ้มครองสินเชื่อ (ชำระวันรับรถ)', ro(A.insCredit), tag('จากเงื่อนไข', 'good')) : ''}
    ${row('ค่าจดทะเบียน', A.regGift ? `<span class="w-32 text-right">${esc(A.regGift)}</span>` : inp('reg', 'reg'), A.regGift ? '' : tag('ตารางค่าจด', 'good'))}
    ${row('ค่ามัดจำป้ายแดง', inp('plate', 'plate'), tag('ค่าตั้งต้น', 'warn'))}
    ${row('ค่าเบี้ยประกันภัย', A.insGift ? `<span class="w-32 text-right">${esc(A.insGift)} 1 ปี</span>` : inp('ins', 'ins'), A.insGift ? '' : tag('จากเงื่อนไข', 'good'))}
    ${A.po ? (A.po.length ? A.po.map(y => row('อุปกรณ์ · ' + esc(y.l), ro(y.v), tag('จาก PO', 'good'))).join('') : row('ค่าอุปกรณ์ตกแต่ง', ro(0), tag('จาก PO', 'good'))) : row('ค่าอุปกรณ์ตกแต่ง (ยังไม่มีใบสั่งแต่ง)', inp('acc', 'acc'), '')}
    ${list('plus', '+')}
    <div class="flex justify-between font-semibold text-sm pt-2"><span>รวมค่าใช้จ่าย</span><span class="num">${money(tp)}</span></div>
    ${A.downDisc ? row('หัก ส่วนลดเงินดาวน์', ro(A.downDisc, 1), tag('จากเงื่อนไข', 'good')) : ''}
    ${row('หัก เงินมัดจำ', inp('dep', 'dep'), !A.deposit ? tag(num(v.dep) ? 'ใส่เอง · ใบจองไม่ระบุยอด' : 'ใบจองไม่ระบุยอด', 'warn') : num(v.dep) === A.deposit ? tag('จากใบจอง', 'good') : tag(`แก้เอง · ใบจอง ${money(A.deposit)}`, 'warn'))}
    ${A.tradeHas ? row('หัก รถเก่าเทิร์น', ro(A.trade, 1), A.trade ? `<span class="text-xs text-muted">ราคาขายให้เต็นท์ (เต็นท์จ่ายให้ศูนย์)${A.tradeApp ? ` · ราคาประเมิน ${money(A.tradeApp)}` : ''}</span>` : '<span class="text-xs" style="color:var(--warn)">ยังไม่ลงราคาขายรถเก่า · ไม่หัก</span>') : ''}
    ${list('minus', '−')}
    <div class="flex justify-between items-baseline pt-2 mt-1" style="border-top:2px solid var(--fg)"><span class="font-semibold">${A.cash ? 'รวมค่าใช้จ่ายทั้งสิ้น' : 'รวมจ่ายสุทธิ'}</span><b class="num text-xl" style="color:var(--red)">${money(net)}</b></div>
    ${edit ? `<div class="flex items-center gap-2 mt-2"><button class="btn btn-ghost btn-sm" data-act="pc-save" data-id="${esc(a.id)}">บันทึกค่าใช้จ่าย</button><span class="text-xs text-muted">${sv && sv.at ? `บันทึกล่าสุด ${fmtDT(sv.at)}` : 'ยังไม่ได้บันทึก (ตัวเลขข้างบนเป็นค่าตั้งต้น)'}</span></div>` : ''}</div>`;
}
function payBody(a, m, who, canAdd) {
  const it = payItems(a), req = payRequired(a), paid = payPaid(a), left = req === null ? null : Math.max(0, req - paid), full = payDone(a), p = (m.pay = m.pay || { method: 'cash', date: todayISO() });
  const edit = canEditBooking(a) && perms().write && (!a.flow.done.delivered || fixOn(a));
  const sum = `<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mb-1">${req === null ? '<span class="text-muted">ยังไม่มีเงื่อนไขการขาย จึงไม่ทราบยอดที่ต้องชำระ</span>'
    : `<span>${isCash(a.rec) ? 'รวมค่าใช้จ่ายทั้งสิ้น' : 'รวมจ่ายสุทธิ'} <b class="num">${money(req)}</b> บาท</span><span>ชำระแล้ว <b class="num">${money(paid)}</b></span><span>${left ? `คงเหลือ <b class="num" style="color:var(--warn)">${money(left)}</b>` : '<b style="color:var(--good)">ชำระครบ</b>'}</span>`}${it.length && !full ? chip('ยังไม่ครบ · ส่งมอบไม่ได้', 'warn') : ''}</div>`;
  const rows = it.length ? `<div class="border border-line rounded-lg divide-y divide-line text-sm mb-2">${it.map((x, i) => `<div class="p-2 px-3 flex flex-wrap items-center gap-x-3 gap-y-0.5"><span class="num text-muted">${dmyFull(x.date) || fmtD(x.date)}</span><span class="font-medium">${esc(payMethodName(x.method))}</span>
      <span>ใบเสร็จ <span class="code">${esc(x.receipt_no || '–')}</span></span>${x.bank ? `<span class="text-muted">${esc(x.bank)}</span>` : ''}${x.cheque_no ? `<span class="text-muted">เช็ค ${esc(x.cheque_no)}</span>` : ''}${num(x.fee) ? `<span class="text-muted">ค่าธรรมเนียม ${money(x.fee)}</span>` : ''}
      <span class="num font-medium ml-auto">${x.amount ? money(x.amount) + ' บาท' : '–'}</span><span class="text-xs text-muted">${esc(x.role || '')}</span>${edit ? `<button class="btn btn-ghost btn-sm" data-act="pay-del" data-id="${esc(a.id)}" data-i="${i}">ลบ</button>` : ''}</div>`).join('')}</div>` : '';
  const f = (id, label, key, type = 'text', extra = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" ${extra} data-modal="pay.${key}" value="${esc(p[key] ?? '')}" autocomplete="off"></div>`;
  const form = canAdd ? `<div class="grid sm:grid-cols-3 gap-3 items-end mt-1">
      <div class="field"><label for="pay-m">วิธีชำระ</label><select id="pay-m" data-modal="pay.method">${payMethods().map(([k, l]) => `<option value="${k}" ${p.method === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      ${f('pay-no', 'เลขที่ใบเสร็จ', 'receipt_no')}${f('pay-am', 'ยอดเงิน (บาท)', 'amount', 'number', 'min="0" step="100" inputmode="numeric"')}<div class="field"><label for="pay-dt">วันที่ชำระ (วัน/เดือน/ปี)</label><input id="pay-dt" type="date" max="${todayISO()}" data-modal="pay.date" value="${esc(p.date ?? '')}"><span class="text-xs text-muted">${p.date ? 'วันที่ ' + dmyFull(p.date) : ''}</span></div>
      ${p.method === 'transfer' ? `<div class="field"><label for="pay-bk">ธนาคาร</label><input id="pay-bk" list="pay-banks" data-modal="pay.bank" value="${esc(p.bank ?? '')}" autocomplete="off"><datalist id="pay-banks">${(typeof THAI_BANKS !== 'undefined' ? THAI_BANKS : []).map(b => `<option value="${esc(b)}">`).join('')}</datalist></div>` : ''}
      ${p.method === 'cheque' ? f('pay-ck', 'เลขที่เช็ค', 'cheque_no') : ''}
      ${p.method === 'card' ? f('pay-fee', 'ค่าธรรมเนียม (บาท ถ้ามี)', 'fee', 'number', 'min="0" step="1" inputmode="numeric"') : ''}</div>
      <button class="btn btn-dark btn-sm mt-2" data-act="flow-down" data-id="${esc(a.id)}">${it.length ? 'เพิ่มการชำระ' : 'บันทึกการชำระ'}</button>` : '';
  return payCostBox(a, m) + sum + rows + form;
}
Object.assign(ACTIONS, {
  'pc-add'(el) { const v = S.modal && S.modal.cost; if (!v) return; v[el.dataset.k].push({ l: '', v: '' }); render(); },
  'pc-del'(el) { const v = S.modal && S.modal.cost; if (!v) return; v[el.dataset.k].splice(Number(el.dataset.i), 1); render(); },
  async 'pc-save'(el) {
    const a = atById(el.dataset.id), v = S.modal && S.modal.cost; if (!a || !v || !canEditBooking(a)) return;
    const clean = l => l.filter(y => String(y.l || '').trim() || num(y.v)).map(y => ({ l: String(y.l || '').trim(), v: num(y.v) }));
    if ([...v.plus, ...v.minus].some(y => num(y.v) && !String(y.l || '').trim())) { toast('ใส่ชื่อรายการให้ครบ', 'bad'); return; }
    const t = payCostVals(a, S.modal);
    const dep = num(v.dep), fillDep = !num(a.deposit) && dep > 0;
    // the booking had no deposit amount: the one typed here fills the booking too (10/11)
    if (await saveFlow(a, { ...(fillDep ? { deposit: dep, receipt_hist: [...(a.rec.receipt_hist || []), { old: { receipt_no: a.rec.receipt_no || null, deposit: a.rec.deposit || null }, why: 'ใส่ยอดมัดจำจากค่าใช้จ่ายวันรับรถ (ใบจองไม่ระบุยอด)', ...actor() }] } : {}), flow: { cost: { dep, regAuto: num(v.auto && v.auto.reg), insAuto: num(v.auto && v.auto.ins), reg: num(v.reg), plate: num(v.plate), ins: num(v.ins), acc: num(v.acc), plus: clean(v.plus), minus: clean(v.minus), total: t.tp, net: t.net, ...actor() } } }, 'บันทึกค่าใช้จ่ายวันรับรถแล้ว')) { S.modal.cost = null; render(); }
  },
  async 'flow-down'(el) {
    const a = atById(el.dataset.id), m = S.modal || {};
    if (!a || !stepAllowed(a, 'down') || (a.flow.done.delivered && !fixOn(a)) || !(stepOpen(a, 'down') || payItems(a).length)) { toast('บันทึกการชำระได้หลังทำ ใบสั่งแต่งรถ แล้ว', 'bad'); return; }
    const d = m.pay || {}, no = String(d.receipt_no || '').trim(), date = d.date || todayISO(), method = d.method || 'cash';
    if (!no) { toast('ใส่เลขที่ใบเสร็จ', 'bad'); $('#pay-no')?.focus(); return; }
    if (!(num(d.amount) > 0)) { toast('ใส่ยอดเงิน', 'bad'); $('#pay-am')?.focus(); return; }
    if (!validDate(date) || date > todayISO()) { toast('วันที่ชำระต้องไม่เกินวันนี้', 'bad'); return; }
    if (method === 'transfer' && !String(d.bank || '').trim()) { toast('ใส่ธนาคารที่โอน', 'bad'); $('#pay-bk')?.focus(); return; }
    if (method === 'cheque' && !String(d.cheque_no || '').trim()) { toast('ใส่เลขที่เช็ค', 'bad'); $('#pay-ck')?.focus(); return; }
    const row = { method, receipt_no: no, amount: num(d.amount), date, ...(method === 'transfer' ? { bank: String(d.bank).trim() } : {}), ...(method === 'cheque' ? { cheque_no: String(d.cheque_no).trim() } : {}), ...(method === 'card' && num(d.fee) ? { fee: num(d.fee) } : {}), ...actor() };
    const items = [...payItems(a).map(x => x.legacy ? { method: '', receipt_no: x.receipt_no, amount: x.amount, date: x.date, by: x.by, role: x.role, at: x.at } : x), row];
    const base = { ...a.rec, flow: { ...(a.rec.flow || {}) } }, tmp = { ...a, rec: { ...base, flow: { ...base.flow, down: payDown(a, items) } } };
    const msg = payDone(tmp) ? (isCash(a.rec) ? 'บันทึกชำระครบแล้ว' : 'บันทึกชำระดาวน์ครบแล้ว') : 'บันทึกการชำระบางส่วนแล้ว ยังไม่ครบ';
    if (await saveFlow(a, { flow: { down: payDown(a, items) } }, msg)) { S.modal.pay = { method, date: todayISO() }; render(); }
  },
  async 'pay-del'(el) {
    const a = atById(el.dataset.id), i = Number(el.dataset.i); if (!a || !canEditBooking(a) || (a.flow.done.delivered && !fixOn(a))) return;
    const items = payItems(a).map(x => x.legacy ? { method: '', receipt_no: x.receipt_no, amount: x.amount, date: x.date, by: x.by, role: x.role, at: x.at } : x), gone = items.splice(i, 1)[0]; if (!gone) return;
    const prev = (a.rec.flow || {}).down || {};
    if (await saveFlow(a, { flow: { down: items.length ? payDown(a, items, { hist: [...(prev.hist || []), { ...actor(), act: 'ลบแถวชำระ', row: gone }].slice(-30) }) : null } }, 'ลบรายการชำระแล้ว')) render();
  }
});
// the day-of-collection total follows each typed amount (on leaving the box)
document.addEventListener('change', e => { const k = e.target && e.target.dataset && e.target.dataset.modal; if (k && /^cost\./.test(k) && S.modal && S.modal.cost) render(); });
