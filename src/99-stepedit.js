// ---------- edit a flow step after it was saved (receipt, finance, down payment, delivery); old values go to the step's hist
// Only function declarations at the top level: the first render runs before this file.
const SE_STEPS = ['booked', 'fin', 'down', 'delivered'];
function stepEditOk(a, k) {
  const fl = a.flow;
  if (!fl || fl.history || !perms().write || a.cancelled || !stepAllowed(a, k)) return false;
  return !(fl.done.confirmed && !canApproveBr(a.br));
}
function seHistOf(a, k) {
  const f = a.rec.flow || {};
  return k === 'booked' ? (a.rec.receipt_hist || []) : ((f[k] && f[k].hist) || []);
}
function stepEditUI(a, m, k) {
  if (!SE_STEPS.includes(k) || !a.flow.done[k] || !stepEditOk(a, k)) return '';
  const hist = seHistOf(a, k), last = hist[hist.length - 1];
  const note = hist.length ? `<div class="text-xs text-muted mt-1">แก้ไขแล้ว ${hist.length} ครั้ง · ล่าสุด: ${esc(last.why || '')} · ${who(last)}</div>` : '';
  if (!(m.se && m.se.k === k)) return `${note}<div class="mt-1"><button class="btn btn-ghost btn-sm" data-act="se-open" data-id="${esc(a.id)}" data-k="${k}">แก้ไขข้อมูลขั้นนี้</button></div>`;
  const v = m.se, I = (id, lab, path, val, extra) => `<div class="field"><label for="${id}">${lab}</label><input id="${id}" data-modal="se.${path}" value="${esc(val ?? '')}" autocomplete="off" ${extra || ''}></div>`;
  let body = '';
  if (k === 'booked') body = I('se-rc', 'เลขที่ใบเสร็จมัดจำ', 'receipt_no', v.receipt_no) + I('se-dp', 'ยอดมัดจำ (บาท)', 'deposit', v.deposit, 'type="number" min="0" step="100" inputmode="numeric"');
  if (k === 'fin') body = `<div class="field"><label for="se-fc">บริษัทไฟแนนซ์</label><select id="se-fc" data-modal="se.company">${opt(FINANCE, v.company, 'เลือก')}</select></div>
    ${/HLTC/i.test(v.company || '') ? `<label class="flex items-center gap-2 text-sm self-center"><input type="checkbox" class="w-5 h-5" data-modal="se.dsp" ${v.dsp ? 'checked' : ''}> DSP (Double Smile Plus)</label>` : ''}`
    + I('se-fd', 'วันที่ผ่าน', 'date', v.date, `type="date" max="${todayISO()}"`);
  if (k === 'down') body = I('se-dn', 'เลขที่ใบเสร็จ', 'receipt_no', v.receipt_no) + I('se-da', 'ยอดเงิน (บาท)', 'amount', v.amount, 'type="number" min="0" step="100" inputmode="numeric"') + I('se-dd', 'วันที่ชำระ', 'date', v.date, `type="date" max="${todayISO()}"`);
  if (k === 'delivered') body = I('se-vd', 'วันที่ส่งมอบ', 'date', v.date, `type="date" max="${todayISO()}"`) + I('se-vp', 'เลขทะเบียนป้ายแดง', 'plate', v.plate)
    + `<div class="field"><label for="se-vi">บริษัทประกัน</label><input id="se-vi" list="se-ins" data-modal="se.insurer" value="${esc(v.insurer ?? '')}"><datalist id="se-ins">${INSURERS.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>`;
  return `${note}<div class="p-3 rounded-lg mt-2" style="background:var(--surface-2)"><b class="text-sm">แก้ไข${esc(FLOW_LABEL[k])}</b>
    <div class="grid sm:grid-cols-3 gap-3 items-end mt-2">${body}</div>
    <div class="field mt-2"><label for="se-why" class="req">เหตุผลที่แก้</label><input id="se-why" data-modal="se.why" value="${esc(v.why ?? '')}" placeholder="เช่น แอดมินคีย์ผิด" autocomplete="off"></div>
    <div class="flex gap-2 mt-2"><button class="btn btn-dark btn-sm" data-act="se-save" data-id="${esc(a.id)}">บันทึกการแก้ไข</button><button class="btn btn-ghost btn-sm" data-act="se-close">ยกเลิก</button></div>
    <div class="text-xs text-muted mt-1">ค่าเดิมเก็บไว้ในประวัติของขั้นนี้</div></div>`;
}
Object.assign(ACTIONS, {
  'se-open'(el) {
    const a = atById(el.dataset.id), k = el.dataset.k; if (!a || !stepEditOk(a, k)) return;
    const r = a.rec, f = r.flow || {};
    const pre = {
      booked: { receipt_no: r.receipt_no || '', deposit: r.deposit || '' },
      fin: { company: (f.fin && f.fin.company) || r.finance || '', dsp: !!r.dsp, date: (f.fin && f.fin.date) || '' },
      down: { receipt_no: (f.down && f.down.receipt_no) || '', amount: (f.down && f.down.amount) || '', date: (f.down && f.down.date) || '' },
      delivered: { date: (f.delivered && f.delivered.date) || a.flow.deliveredDate || '', plate: (f.delivered && f.delivered.plate) || '', insurer: (f.delivered && f.delivered.insurer) || '' }
    }[k];
    S.modal.se = { k, why: '', ...pre }; render();
  },
  'se-close'() { S.modal.se = null; render(); },
  async 'se-save'(el) {
    const a = atById(el.dataset.id), v = S.modal.se; if (!a || !v || !stepEditOk(a, v.k)) return;
    const k = v.k, r = a.rec, f = r.flow || {}, why = String(v.why || '').trim();
    const bad = (t, id) => { toast(t, 'bad'); if (id) $('#' + id)?.focus(); };
    const dateOk = d => validDate(d) && d <= todayISO();
    const hist = (old, prev) => [...(prev || []), { old, why, ...actor() }];
    if (k === 'booked') {
      const no = String(v.receipt_no || '').trim(); if (!no) return bad('ใส่เลขที่ใบเสร็จมัดจำ', 'se-rc');
      const dup = derive().at.find(x => x.id !== a.id && !x.cancelled && String(x.rec.receipt_no || '').trim() === no && x.br === a.br);
      if (dup) return bad(`เลขที่ใบเสร็จนี้ใช้กับใบจองของ ${dup.cust} แล้ว`, 'se-rc');
      if (!why) return bad('ใส่เหตุผลที่แก้', 'se-why');
      if (!await saveFlow(a, { receipt_no: no, deposit: num(v.deposit) || null, receipt_hist: hist({ receipt_no: r.receipt_no || null, deposit: r.deposit || null }, r.receipt_hist) }, 'แก้ไขใบเสร็จมัดจำแล้ว')) return;
    } else {
      const prev = f[k] || {}, { hist: ph, ...old } = prev; let patch;
      if (k === 'fin') {
        if (!v.company) return bad('เลือกบริษัทไฟแนนซ์', 'se-fc');
        if (!dateOk(v.date)) return bad('วันที่ผ่านต้องไม่เกินวันนี้', 'se-fd');
        const dsp = /HLTC/i.test(v.company) ? !!v.dsp : false;
        patch = { finance: v.company, dsp, flow: { fin: { ...prev, company: v.company, dsp, date: v.date, hist: hist(old, ph) } } };
      } else if (k === 'down') {
        if (!String(v.receipt_no || '').trim()) return bad('ใส่เลขที่ใบเสร็จ', 'se-dn');
        if (!dateOk(v.date)) return bad('วันที่ชำระต้องไม่เกินวันนี้', 'se-dd');
        patch = { flow: { down: { ...prev, receipt_no: String(v.receipt_no).trim(), amount: num(v.amount), date: v.date, hist: hist(old, ph) } } };
      } else {
        if (!dateOk(v.date)) return bad('วันที่ส่งมอบต้องไม่เกินวันนี้', 'se-vd');
        if (a.date && v.date < a.date) return bad('วันที่ส่งมอบต้องไม่ก่อนวันจอง', 'se-vd');
        if (!String(v.plate || '').trim()) return bad('ใส่เลขทะเบียนป้ายแดง', 'se-vp');
        if (!String(v.insurer || '').trim()) return bad('ใส่บริษัทประกัน', 'se-vi');
        patch = { flow: { delivered: { ...prev, date: v.date, plate: String(v.plate).trim(), insurer: String(v.insurer).trim(), hist: hist(old, ph) } } };
      }
      if (!why) return bad('ใส่เหตุผลที่แก้', 'se-why');
      if (!await saveFlow(a, patch, 'แก้ไขแล้ว เก็บค่าเดิมไว้ในประวัติ')) return;
    }
    S.modal.se = null; render();
  }
});
