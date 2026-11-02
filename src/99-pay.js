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
  const n = isCash(a.rec) ? num(d.price) - num(d.disc ?? d.discount) : num(d.down) - num(d.down_disc);
  return n > 0 ? n : null;
}
const payPaid = a => payItems(a).reduce((t, x) => t + num(x.amount), 0);
function payDone(a) {
  const it = payItems(a); if (!it.length) return false;
  if (it.some(x => x.legacy)) return true;
  const req = payRequired(a); return req === null || payPaid(a) >= req;
}
// the booking's flow.down after a change of the rows (receipt_no / amount / date mirror the rows for the places that read them)
function payDown(a, items, extra) {
  const prev = (a.rec.flow || {}).down || {}, last = items.slice().sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')))[0];
  const { receipt_no, amount, date, ...keep } = prev;
  return { ...keep, ...(extra || {}), items, receipt_no: items.map(x => x.receipt_no).filter(Boolean).join(', ') || null, amount: items.reduce((t, x) => t + num(x.amount), 0), date: last ? last.date : null };
}
function payBody(a, m, who, canAdd) {
  const it = payItems(a), req = payRequired(a), paid = payPaid(a), left = req === null ? null : Math.max(0, req - paid), full = payDone(a), p = (m.pay = m.pay || { method: 'cash', date: todayISO() });
  const edit = canEditBooking(a) && perms().write && !a.flow.done.delivered;
  const sum = `<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mb-1">${req === null ? '<span class="text-muted">ยังไม่มีเงื่อนไขการขาย จึงไม่ทราบยอดที่ต้องชำระ</span>'
    : `<span>${isCash(a.rec) ? 'ราคาสุทธิ' : 'เงินดาวน์'} <b class="num">${money(req)}</b> บาท</span><span>ชำระแล้ว <b class="num">${money(paid)}</b></span><span>${left ? `คงเหลือ <b class="num" style="color:var(--warn)">${money(left)}</b>` : '<b style="color:var(--good)">ชำระครบ</b>'}</span>`}${it.length && !full ? chip('ยังไม่ครบ · ส่งมอบไม่ได้', 'warn') : ''}</div>`;
  const rows = it.length ? `<div class="border border-line rounded-lg divide-y divide-line text-sm mb-2">${it.map((x, i) => `<div class="p-2 px-3 flex flex-wrap items-center gap-x-3 gap-y-0.5"><span class="num text-muted">${fmtD(x.date)}</span><span class="font-medium">${esc(payMethodName(x.method))}</span>
      <span>ใบเสร็จ <span class="code">${esc(x.receipt_no || '–')}</span></span>${x.bank ? `<span class="text-muted">${esc(x.bank)}</span>` : ''}${x.cheque_no ? `<span class="text-muted">เช็ค ${esc(x.cheque_no)}</span>` : ''}${num(x.fee) ? `<span class="text-muted">ค่าธรรมเนียม ${money(x.fee)}</span>` : ''}
      <span class="num font-medium ml-auto">${x.amount ? money(x.amount) + ' บาท' : '–'}</span><span class="text-xs text-muted">${esc(x.role || '')}</span>${edit ? `<button class="btn btn-ghost btn-sm" data-act="pay-del" data-id="${esc(a.id)}" data-i="${i}">ลบ</button>` : ''}</div>`).join('')}</div>` : '';
  const f = (id, label, key, type = 'text', extra = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" ${extra} data-modal="pay.${key}" value="${esc(p[key] ?? '')}" autocomplete="off"></div>`;
  const form = canAdd ? `<div class="grid sm:grid-cols-3 gap-3 items-end mt-1">
      <div class="field"><label for="pay-m">วิธีชำระ</label><select id="pay-m" data-modal="pay.method">${payMethods().map(([k, l]) => `<option value="${k}" ${p.method === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      ${f('pay-no', 'เลขที่ใบเสร็จ', 'receipt_no')}${f('pay-am', 'ยอดเงิน (บาท)', 'amount', 'number', 'min="0" step="100" inputmode="numeric"')}${f('pay-dt', 'วันที่ชำระ', 'date', 'date', `max="${todayISO()}"`)}
      ${p.method === 'transfer' ? `<div class="field"><label for="pay-bk">ธนาคาร</label><input id="pay-bk" list="pay-banks" data-modal="pay.bank" value="${esc(p.bank ?? '')}" autocomplete="off"><datalist id="pay-banks">${(typeof THAI_BANKS !== 'undefined' ? THAI_BANKS : []).map(b => `<option value="${esc(b)}">`).join('')}</datalist></div>` : ''}
      ${p.method === 'cheque' ? f('pay-ck', 'เลขที่เช็ค', 'cheque_no') : ''}
      ${p.method === 'card' ? f('pay-fee', 'ค่าธรรมเนียม (บาท ถ้ามี)', 'fee', 'number', 'min="0" step="1" inputmode="numeric"') : ''}</div>
      <button class="btn btn-dark btn-sm mt-2" data-act="flow-down" data-id="${esc(a.id)}">${it.length ? 'เพิ่มการชำระ' : 'บันทึกการชำระ'}</button>` : '';
  return sum + rows + form;
}
Object.assign(ACTIONS, {
  async 'flow-down'(el) {
    const a = atById(el.dataset.id), m = S.modal || {};
    if (!a || !stepAllowed(a, 'down') || a.flow.done.delivered || !(stepOpen(a, 'down') || payItems(a).length)) { toast('บันทึกการชำระได้หลังทำ ใบสั่งแต่งรถ แล้ว', 'bad'); return; }
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
    const a = atById(el.dataset.id), i = Number(el.dataset.i); if (!a || !canEditBooking(a) || a.flow.done.delivered) return;
    const items = payItems(a).map(x => x.legacy ? { method: '', receipt_no: x.receipt_no, amount: x.amount, date: x.date, by: x.by, role: x.role, at: x.at } : x), gone = items.splice(i, 1)[0]; if (!gone) return;
    const prev = (a.rec.flow || {}).down || {};
    if (await saveFlow(a, { flow: { down: items.length ? payDown(a, items, { hist: [...(prev.hist || []), { ...actor(), act: 'ลบแถวชำระ', row: gone }].slice(-30) }) : null } }, 'ลบรายการชำระแล้ว')) render();
  }
});
