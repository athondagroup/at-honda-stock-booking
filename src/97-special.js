// ---------- ดึงกลับเข้า Stock พิเศษ (ขอ 26/10): a car IDS no longer lists (company Advance invoice, Demon, returned by the customer)
// that is still at the branch. Kept on the car: vehicles/<vin>.special
//   {reason: adv|demo|returned|other, test: true|false|null (Demon: opened as a test-drive car), sellable: true|false|null,
//    price, km, ins (insurance expiry), plate, cond, note, invNo, invDate, delivDate, br, hist[]}
// sellable = true  -> the car is a normal free car with a special price (shows in stock, can be locked / allocated)
// sellable = false / not decided -> stays a company car in stock, cannot be sold
// Only function declarations at the top level: the first render runs before this file.
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
function spCan() { return perms().write && !isSales(); }
// the box in the car window
function spBox(c, D) {
  if (!spCan()) return c.special ? spDetail(c, D, false) : '';
  const sp = c.special, vin = esc(c.vin);
  if (!sp) {
    const out = c.fromInv || c.status === 'company' || D.deliveredOut.some(x => x.vin === c.vin);
    if (!out) return '';
    return `<div class="mb-3 p-3 rounded-lg text-sm flex flex-wrap items-center gap-3" style="background:var(--surface-2)">
      <div class="flex-1 min-w-[220px]">${c.fromInv ? 'รถคันนี้ไม่อยู่ในไฟล์ Stock IDS แล้ว' : 'รถบริษัท'} · ถ้ายังอยู่ที่สาขา (รถ Advance ของบริษัท · รถ Demon · ลูกค้าคืนรถ) ดึงกลับเข้า Stock พิเศษได้ ระบบจะจำวันที่ใบกำกับและวันที่ส่งมอบไว้</div>
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
      ${sell ? row('ราคาขาย', `<b class="num">${fmtN(sp.price)}</b> บาท`) : ''}
      ${sell ? row('เลขไมล์', sp.km !== '' && sp.km != null ? `<span class="num">${fmtN(sp.km)}</span> กม.` : '') : ''}
      ${sell ? row('ประกันหมดอายุ', sp.ins ? `${fmtD(sp.ins)} ${spInsChip(sp.ins)}` : '') : ''}
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
  const f = (id, label, key, type, extra = '', req = false) => `<div class="field"><label for="${id}" class="${req ? 'req' : ''}">${label}</label><input id="${id}" ${type ? `type="${type}"` : ''} ${extra} data-modal="d.${key}" value="${esc(d[key] ?? '')}"></div>`;
  return `<div class="flex items-start justify-between gap-3 mb-1"><h2 class="font-head text-xl font-semibold">${m.edit ? 'แก้ข้อมูลรถ Stock พิเศษ' : 'ดึงกลับเข้า Stock พิเศษ'}</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <p class="text-sm mb-4"><span class="code font-medium">${esc(c.vin)}</span> ${c.spec ? specLabel(c.spec) : ''}</p>
  <div class="flex flex-col gap-4">
    <div class="field"><label for="sp-reason" class="req">ดึงกลับเข้า Stock พิเศษ เพราะอะไร</label><select id="sp-reason" data-modal="d.reason" data-sp-reason="1">${SP_REASONS.map(([k, t]) => `<option value="${k}" ${d.reason === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
    ${d.reason === 'demo' ? `<div class="field"><label class="req">รถ Demon คันนี้</label><div class="flex flex-wrap gap-2">${seg('test', true, 'เปิดเป็นรถทดลองขับ')}${seg('test', false, 'ไม่เปิดทดลองขับ')}</div></div>` : ''}
    <div class="field"><label class="req">รถคันนี้ขายได้ไหม</label>
      <div class="flex flex-wrap gap-2">${seg('sellable', true, 'ขายได้', 'btn-red')}${seg('sellable', false, 'ขายไม่ได้')}${seg('sellable', null, 'ยังไม่ตัดสินใจ')}</div>
      <p class="text-xs text-muted mt-1">${d.sellable === true ? 'ขายได้ = เข้า Stock เป็นรถว่าง มีราคาและข้อมูลรถพิเศษกำกับ ล็อก/จัดสรรได้ตามปกติ' : d.sellable === false ? 'ขายไม่ได้ = อยู่ใน Stock เป็นรถบริษัท ล็อกและขายไม่ได้' : 'ยังไม่ตัดสินใจ = อยู่ใน Stock เป็นรถบริษัท ไว้ก่อน แก้เป็นขายได้ทีหลังได้'}</p></div>
    ${d.sellable === true ? `<div class="p-3 rounded-lg border border-line flex flex-col gap-3" style="background:var(--surface-2)"><b class="text-sm">ข้อมูลรถพิเศษสำหรับขาย</b>
      <div class="grid sm:grid-cols-2 gap-3">
        ${f('sp-price', 'ราคาขาย (บาท)', 'price', 'number', 'inputmode="numeric" min="0" step="1000"', true)}
        ${f('sp-km', 'เลขไมล์ (กม.)', 'km', 'number', 'inputmode="numeric" min="0"', true)}
        ${f('sp-ins', 'ประกันหมดอายุ', 'ins', 'date', '', true)}
        ${f('sp-plate', 'ทะเบียน (ถ้ามี)', 'plate', '', '')}</div>
      ${f('sp-cond', 'สภาพรถ / อุปกรณ์ติดรถ / ของแถม', 'cond', '', 'placeholder="เช่น ฟิล์ม พรมปู กรอบป้าย ใช้งานมาแล้ว..."')}</div>` : ''}
    <div class="grid sm:grid-cols-3 gap-3">
      ${f('sp-invno', 'เลขที่ใบกำกับ', 'invNo', '', '')}
      ${f('sp-invd', 'วันที่ออกใบกำกับ', 'invDate', 'date', '')}
      ${f('sp-dd', 'วันที่ส่งมอบ (เดิม)', 'delivDate', 'date', '')}</div>
    <div class="field"><label for="sp-br" class="req">อยู่สาขา</label><select id="sp-br" data-modal="d.br">${BRS.map(b => `<option value="${b}" ${d.br === b ? 'selected' : ''}>${b} ${esc(BR[b].name)}</option>`).join('')}</select></div>
    ${f('sp-note', d.sellable === false ? 'เหตุผลที่ขายไม่ได้' : 'หมายเหตุ', 'note', '', '', d.sellable === false)}
    <p class="text-xs text-muted">ระบบจำว่าใครดึงกลับและเมื่อไร ดูได้ในประวัติรถ · วันที่ใบกำกับและวันที่ส่งมอบดึงมาจากไฟล์ DL ให้แล้ว แก้ได้</p>
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
    const d = sp ? { ...sp } : {
      reason: inv && inv.company ? 'adv' : 'returned', test: null, sellable: null, price: '', km: '', ins: '', plate: '', cond: '', note: '',
      invNo: (inv && inv.inv) || '', invDate: (inv && inv.idate) || '', delivDate: (inv && inv.ddate) || '', br: c.br || (inv && inv.br) || BRS[0]
    };
    if (el.dataset.sell) d.sellable = el.dataset.sell === 'true';
    S.modal = { kind: 'special', vin, edit: !!sp, d, undoAsk: false }; render();
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
    if (d.sellable === true && !d.ins) { toast('ใส่วันที่ประกันหมดอายุ', 'bad'); return; }
    if (d.sellable === false && !(d.note || '').trim()) { toast('เขียนเหตุผลที่ขายไม่ได้', 'bad'); return; }
    const cur = S.vehicles.get(m.vin) || { added: null, removed: null, branch: null }, prev = cur.special;
    const act = !prev ? `ดึงกลับเข้า Stock พิเศษ (${SP_REASONS.find(x => x[0] === d.reason)[1].replace(/ \(.*\)$/, '')})`
      : prev.sellable !== d.sellable ? (d.sellable === true ? 'ตั้งเป็นขายได้' : d.sellable === false ? 'ตั้งเป็นขายไม่ได้' : 'ตั้งเป็นยังไม่ตัดสินใจ') : 'แก้ข้อมูลรถพิเศษ';
    const sp = {
      reason: d.reason, test: d.reason === 'demo' ? d.test : null, sellable: d.sellable,
      price: d.sellable === true ? Number(d.price) : null, km: d.sellable === true ? Number(d.km) : null, ins: d.sellable === true ? d.ins : null,
      plate: d.sellable === true ? (d.plate || '').trim() || null : null, cond: d.sellable === true ? (d.cond || '').trim() || null : null,
      note: (d.note || '').trim() || null, invNo: (d.invNo || '').trim() || null, invDate: d.invDate || null, delivDate: d.delivDate || null, br: d.br,
      ...actor(), hist: [...((prev && prev.hist) || []), { act, note: (d.note || '').trim() || null, price: d.sellable === true ? Number(d.price) : null, ...actor() }]
    };
    if (await write('vehicles', m.vin, { ...cur, special: sp })) { S.modal = { kind: 'car', vin: m.vin }; toast(act); render(); }
  }
});
