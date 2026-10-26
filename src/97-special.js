// ---------- ดึงกลับเข้า Stock พิเศษ (ขอ 26/10): a car IDS no longer lists (company Advance invoice, Demon, returned by the customer)
// that is still at the branch. Kept on the car: vehicles/<vin>.special
//   {reason: adv|demo|returned|other, test: true|false|null (Demon: opened as a test-drive car), sellable: true|false|null,
//    price, km, ins (insurance expiry), plate, cond, note, invNo, invDate, delivDate, br, hist[]}
// sellable = true  -> the car is a normal free car with a special price (shows in stock, can be locked / allocated)
// sellable = false / not decided -> stays a company car in stock, cannot be sold
// Only function declarations at the top level: the first render runs before this file.
const SP_INS_TYPES = ['ชั้น 1', 'ชั้น 2+', 'ชั้น 3+', 'ชั้น 2', 'ชั้น 3', 'พ.ร.บ. อย่างเดียว', 'อื่น ๆ'];
const SP_REASONS = [['adv', 'รถบริษัท Advance (ออกใบกำกับไว้ก่อน)'], ['demo', 'รถบริษัท Demon'], ['returned', 'ลูกค้าคืนรถ'], ['other', 'อื่น ๆ']];
function spStatus(sp) { return sp && sp.sellable === true ? 'free' : 'company'; }
function spReasonText(sp) {
  const r = SP_REASONS.find(x => x[0] === sp.reason);
  let t = r ? r[1].replace(/ \(.*\)$/, '') : 'พิเศษ';
  if (sp.reason === 'demo') t += sp.test === true ? ' · เปิดทดลองขับ' : sp.test === false ? ' · ไม่เปิดทดลองขับ' : '';
  return t;
}
function spChip(c) {
  const sp = c && c.special; if (!sp) return '';
  return ' ' + chip('พิเศษ: ' + spReasonText(sp), 'warn') + ' ' + (sp.sellable === true ? chip('ขายได้' + (sp.price ? ' ' + fmtN(sp.price) : ''), 'good') : sp.sellable === false ? chip('ขายไม่ได้', 'bad') : chip('รอตัดสินว่าขายได้ไหม', 'muted'));
}
function spInsChip(d) {
  if (!d) return '';
  const n = daysBetween(todayISO(), d);
  return n < 0 ? chip(`หมดแล้ว ${-n} วัน`, 'bad') : n <= 30 ? chip(`อีก ${n} วันหมด`, 'warn') : '';
}
// only the manager and above press it
function spCan() { return perms().write && (S.role.role === 'exec' || !!MGR_OF[S.role.role]); }
// the box in the car window
function spBox(c, D) {
  if (!spCan()) return c.special ? spDetail(c, D, false) : '';
  const sp = c.special, vin = esc(c.vin);
  if (!sp) {
    const out = c.fromInv || ['company', 'free'].includes(c.status) || D.deliveredOut.some(x => x.vin === c.vin);
    if (!out) return '';
    return `<div class="mb-3 p-3 rounded-lg text-sm flex flex-wrap items-center gap-3" style="background:var(--surface-2)">
      <div class="flex-1 min-w-[220px]">${c.fromInv ? 'รถคันนี้ไม่อยู่ในไฟล์ Stock IDS แล้ว · ' : ''}รถบริษัท Advance · รถ Demon · ลูกค้าคืนรถ ที่ยังอยู่ที่สาขา ดึงเข้าแท็บ "รถพิเศษ" (แยกจาก Stock ปกติ) ได้ ระบบจะจำวันที่ใบกำกับ วันที่ส่งมอบ และว่าขายได้หรือไม่</div>
      <button class="btn btn-red btn-sm" data-act="sp-open" data-vin="${vin}">ดึงกลับเข้า Stock พิเศษ</button></div>`;
  }
  return spDetail(c, D, true);
}
function spDetail(c, D, edit) {
  const sp = c.special, vin = esc(c.vin);
  const row = (k, v) => v === null || v === undefined || v === '' ? '' : `<tr><td class="text-muted nowrap">${k}</td><td>${v}</td></tr>`;
  const sell = sp.sellable === true;
  return `<section class="mb-3 border rounded-lg overflow-hidden" style="border-color:var(--warn)">
    <div class="p-3 flex flex-wrap items-center gap-2" style="background:var(--surface-2)"><b>Stock พิเศษ</b>${spChip(c)}
      <span class="ml-auto flex flex-wrap gap-2">${edit ? `<button class="btn ${sell ? 'btn-dark' : 'btn-red'} btn-sm" data-act="sp-open" data-vin="${vin}" data-sell="true">ขายได้</button>
        <button class="btn ${sp.sellable === false ? 'btn-dark' : 'btn-ghost'} btn-sm" data-act="sp-open" data-vin="${vin}" data-sell="false">ขายไม่ได้</button>
        <button class="btn btn-ghost btn-sm" data-act="sp-open" data-vin="${vin}">แก้ข้อมูล</button>` : ''}</span></div>
    <table class="tbl text-sm"><tbody>
      ${row('เหตุผล', esc(spReasonText(sp)))}
      ${sell ? row('ราคาเต็ม', sp.fullPrice != null ? `<span class="num">${fmtN(sp.fullPrice)}</span> บาท` : '') : ''}
      ${sell ? row('ราคาตั้งขาย', `<b class="num">${fmtN(sp.price)}</b> บาท`) : ''}
      ${sell ? row('ยอดจัด มือ 2', sp.finMax != null ? `<span class="num">${fmtN(sp.finMax)}</span> บาท` : '') : ''}
      ${sell ? row('Margin แคมเปญ', sp.margin != null ? `<span class="num">${fmtN(sp.margin)}</span> บาท` : '') : ''}
      ${sell ? row('เลขไมล์', sp.km !== '' && sp.km != null ? `<span class="num">${fmtN(sp.km)}</span> กม.` : '') : ''}
      ${sell ? row('ประกันภัย', sp.insNone ? chip('ยังไม่แจ้งประกัน', 'warn') : [sp.insType, sp.insCo].filter(Boolean).map(esc).join(' · ')) : ''}
      ${sell && !sp.insNone ? row('ประกันหมดอายุ', sp.ins ? `${fmtD(sp.ins)} ${spInsChip(sp.ins)}` : '') : ''}
      ${sell ? row('ป้ายภาษีหมดอายุ', sp.taxExp ? `${fmtD(sp.taxExp)} ${spInsChip(sp.taxExp)}` : '') : ''}
      ${sell ? row('ทะเบียน', esc(sp.plate || '')) : ''}
      ${sell ? row('สภาพรถ / อุปกรณ์', esc(sp.cond || '')) : ''}
      ${row('ใบกำกับ', sp.invNo || sp.invDate ? `${esc(sp.invNo || '')} ${sp.invDate ? '· ' + fmtD(sp.invDate) : ''}` : '')}
      ${row('วันที่ส่งมอบ (เดิม)', sp.delivDate ? fmtD(sp.delivDate) : '')}
      ${row(sp.sellable === false ? 'เหตุผลที่ขายไม่ได้' : 'หมายเหตุ', esc(sp.note || ''))}
      ${row('บันทึกโดย', `${esc(sp.role || '')} · ${fmtDT(sp.at)}`)}
    </tbody></table></section>`;
}
function spModal(m, D) {
  const c = carAny(m.vin, D) || { vin: m.vin }, d = m.d, ok = (k, v) => d[k] === v;
  const seg = (k, v, label, tone) => `<button type="button" class="btn btn-sm ${ok(k, v) ? (tone || 'btn-dark') : 'btn-ghost'}" data-act="sp-set" data-k="${k}" data-v="${v}">${label}</button>`;
  const sys = m.sys || {};
  const f = (id, label, key, type, extra = '', req = false) => { const lk = !!sys[key];
    return `<div class="field min-w-0"><label for="${id}" class="${req ? 'req' : ''}">${label}${lk ? ` <span class="text-xs" style="color:var(--good)">ข้อมูลจากระบบ (${esc(sys[key + 'Src'] || 'DL')})</span>` : ''}</label><input id="${id}" ${type ? `type="${type}"` : ''} ${extra} ${lk ? 'disabled' : ''} data-modal="d.${key}" value="${esc(d[key] ?? '')}" style="display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box;text-align:left"></div>`; };
  return `<div class="flex items-start justify-between gap-3 mb-1"><h2 class="font-head text-xl font-semibold">${m.edit ? 'แก้ข้อมูลรถ Stock พิเศษ' : 'ดึงกลับเข้า Stock พิเศษ'}</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <p class="text-sm mb-4"><span class="code font-medium">${esc(c.vin)}</span> ${c.spec ? specLabel(c.spec) : ''}</p>
  <div class="flex flex-col gap-4">
    <div class="field"><label for="sp-reason" class="req">ดึงกลับเข้า Stock พิเศษ เพราะอะไร</label><select id="sp-reason" data-modal="d.reason" data-sp-reason="1">${SP_REASONS.map(([k, t]) => `<option value="${k}" ${d.reason === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
    ${d.reason === 'demo' ? `<div class="field"><label class="req">รถ Demon คันนี้</label><div class="flex flex-wrap gap-2">${seg('test', true, 'เปิดเป็นรถทดลองขับ')}${seg('test', false, 'ไม่เปิดทดลองขับ')}</div></div>` : ''}
    <div class="field"><label class="req">รถคันนี้ขายได้ไหม</label>
      <div class="flex flex-wrap gap-2">${seg('sellable', true, 'ขายได้', 'btn-red')}${seg('sellable', false, 'ขายไม่ได้')}${seg('sellable', null, 'ยังไม่ตัดสินใจ')}</div>
      <p class="text-xs text-muted mt-1">${d.sellable === true ? 'ขายได้ = เป็นรถพิเศษที่ขายได้ อยู่ในแท็บ "รถพิเศษ" แยกจาก Stock ปกติ มีราคาและข้อมูลรถกำกับ ล็อก จัดสรร ส่งมอบได้ตามปกติ' : d.sellable === false ? 'ขายไม่ได้ = อยู่ในแท็บ "รถพิเศษ" เป็นรถบริษัท ล็อกและขายไม่ได้' : 'ยังไม่ตัดสินใจ = อยู่ในแท็บ "รถพิเศษ" เป็นรถบริษัทไว้ก่อน แก้เป็นขายได้ทีหลังได้'}</p></div>
    ${d.sellable === true ? `<div class="p-3 rounded-lg border border-line flex flex-col gap-3" style="background:var(--surface-2)"><b class="text-sm">ข้อมูลรถพิเศษสำหรับขาย</b>
      <div class="grid sm:grid-cols-2 gap-3">
        ${f('sp-full', 'ราคาเต็ม (บาท)', 'fullPrice', 'number', 'inputmode="numeric" min="0" step="1000"')}
        ${f('sp-price', 'ราคาตั้งขาย (บาท)', 'price', 'number', 'inputmode="numeric" min="0" step="1000"', true)}
        ${f('sp-fin', 'ยอดจัด มือ 2 (บาท)', 'finMax', 'number', 'inputmode="numeric" min="0" step="1000"')}
        ${f('sp-mg', 'Margin แคมเปญ (บาท)', 'margin', 'number', 'inputmode="numeric" step="1000"')}
        ${f('sp-km', 'เลขไมล์ (กม.)', 'km', 'number', 'inputmode="numeric" min="0"', true)}
        ${f('sp-plate', 'ทะเบียน (ถ้ามี)', 'plate', '', '')}
        ${f('sp-tax', 'วันหมดอายุป้ายภาษี', 'taxExp', 'date', '')}</div>
      <div class="p-3 rounded-lg border border-line flex flex-col gap-3"><b class="text-sm">ประกันภัย</b>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" class="w-5 h-5" data-modal="d.insNone" ${d.insNone ? 'checked' : ''}> ยังไม่แจ้งประกัน</label>
        ${d.insNone ? '' : `<div class="grid sm:grid-cols-2 gap-3">
          <div class="field min-w-0"><label for="sp-instype">ประเภทประกัน</label><select id="sp-instype" data-modal="d.insType"><option value="">เลือก</option>${SP_INS_TYPES.map(t => `<option ${d.insType === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
          ${f('sp-insco', 'บริษัทประกัน', 'insCo', '', '')}
          ${f('sp-ins', 'ประกันหมดอายุ', 'ins', 'date', '', true)}</div>`}</div>
      ${f('sp-cond', 'สภาพรถ / อุปกรณ์ติดรถ / ของแถม', 'cond', '', 'placeholder="เช่น ฟิล์ม พรมปู กรอบป้าย ใช้งานมาแล้ว..."')}</div>` : ''}
    <div class="grid sm:grid-cols-3 gap-3">
      ${f('sp-invno', 'เลขที่ใบกำกับ', 'invNo', '', '')}
      ${f('sp-invd', 'วันที่ออกใบกำกับ', 'invDate', 'date', '')}
      ${f('sp-dd', 'วันที่ส่งมอบ (เดิม)', 'delivDate', 'date', '')}</div>
    <div class="field"><label for="sp-br" class="req">อยู่สาขา</label><select id="sp-br" data-modal="d.br">${BRS.map(b => `<option value="${b}" ${d.br === b ? 'selected' : ''}>${b} ${esc(BR[b].name)}</option>`).join('')}</select></div>
    ${f('sp-note', d.sellable === false ? 'เหตุผลที่ขายไม่ได้' : 'หมายเหตุ', 'note', '', '', d.sellable === false)}
    <p class="text-xs text-muted">ระบบจำว่าใครดึงกลับและเมื่อไร ดูได้ในประวัติรถ · ถ้าระบบมีเลขใบกำกับ วันที่ออกใบกำกับ หรือวันที่ส่งมอบอยู่แล้ว จะใช้ข้อมูลของระบบ (แก้ไม่ได้) ช่องที่ระบบไม่มีกรอกเองได้</p>
    <div class="flex flex-wrap justify-between gap-2">
      <div>${m.edit ? (m.undoAsk ? `<button class="btn btn-red" data-act="sp-undo-go">ยืนยัน นำออกจาก Stock พิเศษ</button>` : `<button class="btn btn-ghost" data-act="sp-undo">นำออกจาก Stock พิเศษ</button>`) : ''}</div>
      <div class="flex gap-2"><button class="btn btn-ghost" data-act="sp-cancel">ยกเลิก</button><button class="btn btn-red" data-act="sp-submit">${m.edit ? 'บันทึก' : 'ดึงกลับเข้า Stock พิเศษ'}</button></div></div>
  </div>`;
}
Object.assign(ACTIONS, {
  'sp-open'(el) {
    if (!spCan()) return;
    const vin = el.dataset.vin, D = derive(), c = carAny(vin, D); if (!c) return;
    const sp = c.special, inv = D.invByVin.get(vin);
    // dates and invoice the system already has are used as they are (locked); only what is missing is typed
    const lg = typeof carlogAll === 'function' ? carlogAll().get(vin) : null, lo = lg && lg.e.out && /ส่งมอบ/.test(lg.e.out.why || '') ? lg.e.out.d : null;
    const sys = {};
    if (inv && inv.inv) { sys.invNo = inv.inv; sys.invNoSrc = 'DL'; }
    if (inv && inv.idate) { sys.invDate = inv.idate; sys.invDateSrc = 'DL'; }
    if (inv && inv.ddate) { sys.delivDate = inv.ddate; sys.delivDateSrc = 'DL'; } else if (lo) { sys.delivDate = lo; sys.delivDateSrc = 'ประวัติ IDS'; }
    const d = sp ? { ...sp } : {
      reason: inv && inv.company ? 'adv' : 'returned', test: null, sellable: null, price: '', km: '', ins: '', plate: '', cond: '', note: '',
      invNo: sys.invNo || '', invDate: sys.invDate || '', delivDate: sys.delivDate || '', br: c.br || (inv && inv.br) || BRS[0]
    };
    if (el.dataset.sell) d.sellable = el.dataset.sell === 'true';
    for (const k of ['invNo', 'invDate', 'delivDate']) if (sys[k]) d[k] = sys[k];
    S.modal = { kind: 'special', vin, edit: !!sp, d, sys, undoAsk: false }; render();
  },
  'sp-set'(el) { const v = el.dataset.v, d = S.modal.d; d[el.dataset.k] = v === 'true' ? true : v === 'false' ? false : v === 'null' ? null : v; render(); },
  'sp-cancel'() { const vin = S.modal && S.modal.vin; S.modal = vin ? { kind: 'car', vin } : null; render(); },
  'sp-undo'() { S.modal.undoAsk = true; render(); },
  async 'sp-undo-go'() {
    const m = S.modal, cur = S.vehicles.get(m.vin) || { added: null, removed: null, branch: null };
    if (await write('vehicles', m.vin, { ...cur, special: null, special_log: [...(cur.special_log || []), { act: 'นำออกจาก Stock พิเศษ', ...actor() }] })) {
      S.modal = { kind: 'car', vin: m.vin }; toast('นำออกจาก Stock พิเศษแล้ว'); render();
    }
  },
  async 'sp-submit'() {
    const m = S.modal, d = m.d;
    if (d.reason === 'demo' && d.test === null) { toast('เลือกว่ารถ Demon คันนี้เปิดทดลองขับหรือไม่', 'bad'); return; }
    if (d.sellable === true && !(Number(d.price) > 0)) { toast('ใส่ราคาขาย', 'bad'); return; }
    if (d.sellable === true && (d.km === '' || d.km == null)) { toast('ใส่เลขไมล์', 'bad'); return; }
    if (d.sellable === true && !d.insNone && !d.ins) { toast('ใส่วันที่ประกันหมดอายุ หรือติ๊ก "ยังไม่แจ้งประกัน"', 'bad'); return; }
    if (d.sellable === false && !(d.note || '').trim()) { toast('เขียนเหตุผลที่ขายไม่ได้', 'bad'); return; }
    const cur = S.vehicles.get(m.vin) || { added: null, removed: null, branch: null }, prev = cur.special;
    const act = !prev ? `ดึงกลับเข้า Stock พิเศษ (${SP_REASONS.find(x => x[0] === d.reason)[1].replace(/ \(.*\)$/, '')})`
      : prev.sellable !== d.sellable ? (d.sellable === true ? 'ตั้งเป็นขายได้' : d.sellable === false ? 'ตั้งเป็นขายไม่ได้' : 'ตั้งเป็นยังไม่ตัดสินใจ') : 'แก้ข้อมูลรถพิเศษ';
    const sp = {
      reason: d.reason, test: d.reason === 'demo' ? d.test : null, sellable: d.sellable,
      price: d.sellable === true ? Number(d.price) : null, km: d.sellable === true ? Number(d.km) : null,
      ins: d.sellable === true && !d.insNone ? d.ins : null, insNone: d.sellable === true && !!d.insNone,
      insType: d.sellable === true && !d.insNone ? d.insType || null : null, insCo: d.sellable === true && !d.insNone ? (d.insCo || '').trim() || null : null,
      fullPrice: d.sellable === true && d.fullPrice !== '' && d.fullPrice != null ? Number(d.fullPrice) : null, finMax: d.sellable === true && d.finMax !== '' && d.finMax != null ? Number(d.finMax) : null,
      margin: d.sellable === true && d.margin !== '' && d.margin != null ? Number(d.margin) : null, taxExp: d.sellable === true ? d.taxExp || null : null,
      plate: d.sellable === true ? (d.plate || '').trim() || null : null, cond: d.sellable === true ? (d.cond || '').trim() || null : null,
      note: (d.note || '').trim() || null, invNo: String(d.invNo || '').trim() || null, invDate: d.invDate || null, delivDate: d.delivDate || null, br: d.br,
      ...actor(), hist: [...((prev && prev.hist) || []), { act, note: (d.note || '').trim() || null, price: d.sellable === true ? Number(d.price) : null, ...actor() }]
    };
    if (await write('vehicles', m.vin, { ...cur, special: sp })) { S.modal = { kind: 'car', vin: m.vin }; toast(act); render(); }
  }
});

// the "รถพิเศษ" tab of สต็อก: kept apart from the normal stock (not counted in the spec table / free cars)
function spView(D) {
  const L = (D.spCars || []).filter(inBr), p = perms();
  const n = k => L.filter(c => k === 'y' ? c.special.sellable === true : k === 'n' ? c.special.sellable === false : c.special.sellable == null).length;
  const head = k => `<th>${k}</th>`;
  return `${pageHead('สต็อกรถ', 'รถพิเศษ: รถบริษัท Advance · รถ Demon · ลูกค้าคืนรถ ข้อมูลแยกจาก Stock ปกติ ไม่นับในรถว่างหรือตารางสเปก')}
  ${brSeg()}
  <div class="flex flex-wrap items-center justify-between gap-3 mb-3">${stockSeg('sp')}</div>
  <p class="text-sm mb-2">รถพิเศษ <b class="num">${L.length}</b> คัน · ขายได้ <b class="num" style="color:var(--good)">${n('y')}</b> · ขายไม่ได้ <b class="num">${n('n')}</b> · รอตัดสินใจ <b class="num">${n('w')}</b></p>
  ${L.length ? `<div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl">
    <thead><tr>${['หมายเลขตัวถัง', 'สาขา', 'รุ่น / เกรด / สี', 'เหตุผล', 'ขายได้ไหม', 'ราคา', 'เลขไมล์', 'ประกันหมดอายุ', 'ใบกำกับ', 'สถานะ', ''].map(head).join('')}</tr></thead>
    <tbody>${L.sort((a, b) => (a.br || '').localeCompare(b.br || '')).map(c => { const sp = c.special; return `<tr>
      <td class="nowrap">${vinLink(c)}</td><td><b>${esc(c.br || '')}</b></td><td class="nowrap">${c.spec ? specLabel(c.spec) : ''}</td>
      <td class="nowrap text-sm">${esc(spReasonText(sp))}</td>
      <td class="nowrap">${sp.sellable === true ? chip('ขายได้', 'good') : sp.sellable === false ? chip('ขายไม่ได้', 'bad') : chip('รอตัดสิน', 'muted')}</td>
      <td class="nowrap num text-right">${sp.price ? fmtN(sp.price) : '–'}</td><td class="nowrap num text-right">${sp.km != null && sp.km !== '' ? fmtN(sp.km) : '–'}</td>
      <td class="nowrap text-sm">${sp.insNone ? chip('ยังไม่แจ้งประกัน', 'warn') : sp.ins ? fmtD(sp.ins) + ' ' + spInsChip(sp.ins) : '–'}</td>
      <td class="nowrap text-sm">${esc(sp.invNo || '')}${sp.invDate ? ' · ' + fmtD(sp.invDate) : ''}</td>
      <td class="nowrap">${carStatusCell(c, D)}</td>
      <td><div class="flex gap-2">${sp.sellable === true ? stockActions(c, p, D) : ''}</div></td></tr>`; }).join('')}</tbody></table></div>`
    : `<div class="bg-surface border border-line rounded-lg">${emptyBox('ยังไม่มีรถพิเศษ', 'เปิดรถจากหน้าข้อมูลรถ แล้วกด "ดึงกลับเข้า Stock พิเศษ" (ผู้จัดการขึ้นไป)')}</div>`}`;
}
