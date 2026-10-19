// ---------- one AT Honda booking: documents, IDS match, and the ordered delivery steps
const FIN_STATUS = ['รอยื่น', 'รอผล', 'ผ่าน', 'ไม่ผ่าน'];
const MODEL_CODES = { 'CITY': ['CT'], 'CITY e:HEV': ['CT'], 'CITY HATCHBACK': ['CH'], 'CITY HATCHBACK e:HEV': ['CH'], 'CIVIC e:HEV': ['CV'], 'HR-V e:HEV': ['HR'], 'CR-V e:HEV': ['CR'], 'ACCORD e:HEV': ['AC', 'AH'], 'e:N2': ['EN', 'E2'], 'STEP WGN e:HEV': ['SW', 'SP'], 'BR-V': ['BR'] };
function focCatalog() {
  const d = S.ref.get('foc');
  if (!d || !d.cols) return [];
  if (focCatalog.cache && focCatalog.cache.src === d) return focCatalog.cache.rows;
  const rows = d.rows.map(r => { const o = {}; d.cols.forEach((c, i) => { o[c] = r[i]; }); return o; });
  focCatalog.cache = { src: d, rows };
  return rows;
}
// the owner sales, the branch admin, or the manager of the booking's branch (the executive: every branch)
const canEditBooking = a => isMine(a.sales) || (S.role.role === 'admin' && a.br === S.role.branch) || canApproveBr(a.br);
function stepAllowed(a, k) {
  const p = perms();
  if (!p.write || a.cancelled) return false;
  if (k === 'confirmed') return canApproveBr(a.br);
  if (k === 'assign') return canAllocBr(a.br);
  return canEditBooking(a);
}
// the branch manager can allocate a car at any step, without the deposit receipt or the finance approval (13/10)
function mgrAssign(a) { return !!(a && perms().write && !a.cancelled && !a.done && !a.flow.done.assign && !a.flow.history && canApproveBr(a.br)); }
// trade-in at the down payment step: has an old car or not, brand / model / year, the price taken in (13/10)
function tradeFields(pre, v, idp) {
  const t = v.trade || '';
  return `<div class="mt-2"><div class="text-sm font-medium mb-1">ลูกค้ามีรถเก่าเทิร์นไหม</div><div class="flex gap-4 text-sm">
    <label class="flex items-center gap-1"><input type="radio" name="${idp}-tr" value="no" data-modal="${pre}.trade" ${t === 'no' ? 'checked' : ''}> ไม่มีรถเก่า</label>
    <label class="flex items-center gap-1"><input type="radio" name="${idp}-tr" value="yes" data-modal="${pre}.trade" ${t === 'yes' ? 'checked' : ''}> มีรถเก่า</label></div>
    ${t === 'yes' ? `<div class="grid sm:grid-cols-4 gap-3 mt-2">
      <div class="field"><label for="${idp}-tb">ยี่ห้อ</label><input id="${idp}-tb" data-modal="${pre}.t_brand" value="${esc(v.t_brand ?? '')}" placeholder="เช่น Toyota" autocomplete="off"></div>
      <div class="field"><label for="${idp}-tm">รุ่น</label><input id="${idp}-tm" data-modal="${pre}.t_model" value="${esc(v.t_model ?? '')}" placeholder="เช่น Vios" autocomplete="off"></div>
      <div class="field"><label for="${idp}-ty">ปี</label><input id="${idp}-ty" type="number" min="1980" max="2030" inputmode="numeric" data-modal="${pre}.t_year" value="${esc(v.t_year ?? '')}"></div>
      <div class="field"><label for="${idp}-tp">ราคารับซื้อ / ตีราคา (บาท)</label><input id="${idp}-tp" type="number" min="0" step="1000" inputmode="numeric" data-modal="${pre}.t_price" value="${esc(v.t_price ?? '')}"></div></div>` : ''}</div>`;
}
// returns the trade-in record, or a message saying what is missing
function tradeOf(v, idp) {
  if (v.trade !== 'yes' && v.trade !== 'no') return { err: 'เลือกว่าลูกค้ามีรถเก่าเทิร์นหรือไม่', id: null };
  if (v.trade === 'no') return { rec: { has: false } };
  const brand = String(v.t_brand || '').trim(), model = String(v.t_model || '').trim(), year = parseInt(v.t_year, 10) || null, price = num(v.t_price);
  if (!brand) return { err: 'ใส่ยี่ห้อรถเก่า', id: idp + '-tb' };
  if (!model) return { err: 'ใส่รุ่นรถเก่า', id: idp + '-tm' };
  if (!year || year < 1980 || year > 2030) return { err: 'ใส่ปีรถเก่า', id: idp + '-ty' };
  if (!price) return { err: 'ใส่ราคารับซื้อ / ตีราคา', id: idp + '-tp' };
  return { rec: { has: true, brand, model, year, price } };
}
function tradeText(t) { return !t ? '' : t.has ? ` · รถเก่า ${esc(t.brand)} ${esc(t.model)} ${t.year} ตีราคา ${money(t.price)} บาท` : ' · ไม่มีรถเก่า'; }
function atModal(m, D) {
  const a = D.at.find(x => x.id === m.id);
  if (!a) return `<p>ไม่พบใบจอง</p><button class="btn btn-ghost" data-act="close">ปิด</button>`;
  const r = a.rec, p = perms();
  const mine = !isSales() || isMine(a.sales);
  if (m.po) return poEditor(m, a, D);
  if (m.edit) return editPanel(m, a);
  if (m.refund) return refundPanel(m, a);
  const imgs = [...(r.doc_imgs || []).map(id => ['ใบจอง', id]), ...(r.slip_imgs || []).map(id => ['สลิป', id]), ...((r.flow?.fin?.docs) || []).map(id => ['เอกสารไฟแนนซ์', id])];
  const rows = [['วันที่จอง', fmtD(a.date)], ['สาขา', `${a.br || ''} ${BR[a.br]?.name || ''}`], ['เซลล์เจ้าของ (AT)', `${a.sales || ''}${a.salesBr ? ` (สาขา ${a.salesBr})` : ''}`],
    ['สาขาที่ออกรถ', a.cross ? `${a.delivBr} · ขายข้ามสาขา: ยอดขายนับให้สาขา ${a.delivBr} ค่าคอมเป็นของ ${a.sales}` : null], ['ลงคิวใหม่เมื่อ', r.queue_date && r.queue_date !== r.booking_date ? `${fmtD(r.queue_date)} (เปลี่ยนรุ่น/สี)` : null], ['ลูกค้า', mine ? a.cust : 'ลูกค้าของเซลล์อื่น'],
    ['รุ่น', `${a.model} ${a.grade} ${a.color}${a.specFromIds ? ' (ตาม IDS)' : ''}`], ['ฟอร์ม AT ลงไว้', a.specFromIds ? `${a.atSpec.model} ${a.atSpec.grade} ${a.atSpec.color} · ระบบใช้รุ่นตาม IDS คิวเดิม` : null], ['เงื่อนไข', [r.purchase, r.finance].filter(Boolean).join(' · ')], ['ประกันภัย', r.insurance], ['ราคารถ', bookPriceLine(a, D)], ['ส่วนลด', money(r.discount)], ['FOC ที่ใช้ทั้งหมด', money(r.foc_total)],
    ['มัดจำ', r.deposit ? money(r.deposit) : (r.imported ? 'ไม่มีในฟอร์มเดิม' : '–')], ['แหล่งที่มา', r.source], ['Lead ID', r.lead_id], ['หมายเหตุ', r.note], ['ข้อความในฟอร์มเดิม', r.imported ? r.model_text : null]].filter(([, v]) => v !== null && v !== undefined && v !== '');
  const mm = a.match;
  const matchInfo = mm ? `<div class="p-3 rounded-lg text-sm" style="background:var(--surface-2)"><b>พบใน IDS</b>${mm.status === 'possible' ? ` <span style="color:var(--warn)">(ชื่อตรงแต่รุ่นใน IDS คือ ${esc(mm.idsModel)} ${esc(mm.idsGrade || '')})</span>` : ''}
      ${mm.recs.map(x => `<div>· ${{ booking: 'Booking IDS', stock: 'Stock IDS', dl: 'Invoice/DL' }[x.kind]} ${x.no ? `เลขที่ใบจอง <span class="code">${esc(x.no)}</span>` : ''} ${x.kind === 'dl' && mm.ddate ? `ส่งมอบ ${fmtD(mm.ddate)}` : ''} ${x.vin ? `<span class="code">${esc(x.vin)}</span>` : ''}</div>`).join('')}
      ${mm.manual ? `<div class="text-xs text-muted">จับคู่โดยคนยืนยัน · ${who(r.match_pick || {})} ${fmtDT(r.match_pick?.at)}</div>` : ''}
      ${a.specFromIds ? `<div class="text-xs text-muted">ใช้รุ่น เกรด สี ตาม IDS (ฟอร์ม AT ลงไว้ ${esc(a.atSpec.model)} ${esc(gradeShort(a.atSpec.model, a.atSpec.grade) || '')} ${esc(a.atSpec.color || '')}) คิวเดิม · ลูกค้าเปลี่ยนรุ่นให้แก้ใน IDS</div>` : ''}</div>
      ${a.matchAsk ? matchAskBox(a) : ''}`
    : (a.cancelled || a.demo ? '' : `<div class="p-3 rounded-lg text-sm" style="background:var(--bad-soft);color:var(--bad)">ยังไม่พบใบจองนี้ใน IDS ทั้ง Booking, Stock และ DL ของทั้ง 4 สาขา${a.ageDays !== null ? ` (จองมา ${a.ageDays} วัน)` : ''} เซลล์ต้องคีย์ลง IDS และแอดมินอัปโหลดไฟล์ล่าสุด</div>
      ${a.near ? nearBox(a) : ''}`);
  const multi = a.multi || a.multiOf ? `<div class="text-xs mt-1" style="color:var(--warn)">${a.multi ? `จอง 2 คัน: ${esc(a.multi.reason)}${a.multi.note ? ` · ${esc(a.multi.note)}` : ''}` : 'ลูกค้ารายนี้ลงใบจองเพิ่มอีกใบ'}</div>` : '';
  const canChange = p.write && canEditBooking(a) && !a.cancelled && !a.done && !a.change && !m.cancel;
  return `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">ใบจอง AT Honda</h2><div class="mt-1 flex flex-wrap gap-2">${matchChip(a)} ${a.row && !a.cancelled ? statusChip(BOOK_STATE, a.row.state) : ''}${a.cross ? chip(`ขายข้ามสาขา ${a.salesBr} → ${a.delivBr}`, 'neutral') : ''}${a.multi || a.multiOf ? chip('จอง 2 คัน', 'warn') : ''}${a.change ? chip(a.change.type === 'cancel' ? 'รออนุมัติยกเลิก' : 'รออนุมัติแก้ไข', 'warn') : ''}</div>${multi}</div><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  ${nextStepBox(a, D, mine)}
  <div class="grid md:grid-cols-[1fr_1.25fr] gap-5">
    <div class="flex flex-col gap-3 order-2 md:order-1">
      ${r.doc_url && mine ? `<a class="btn btn-ghost" href="${esc(r.doc_url)}" target="_blank" rel="noopener">เปิดรูปใบจองใน Google Drive</a><p class="text-xs text-muted -mt-1">ใบจองจากฟอร์มเดิมเก็บใน Drive หน้านี้ดึงรูปมาแสดงตรง ๆ ไม่ได้</p>` : ''}
      ${imgs.length && mine ? imgs.map(([t, id]) => `<div><div class="text-xs text-muted mb-1">${t}</div><div class="photo-pane" style="max-height:44vh"><img src="${imgSrc(id)}" alt="${t}" loading="lazy"></div></div>`).join('')
        : (!r.doc_url ? `<div class="p-4 rounded-lg text-sm text-muted" style="background:var(--surface-2)">${mine ? 'ไม่มีรูป' : 'รูปเอกสารเห็นได้เฉพาะเซลล์เจ้าของใบจองและผู้จัดการ'}</div>` : '')}
      <table class="tbl text-sm"><tbody>${rows.map(([k, v]) => `<tr><td class="text-muted nowrap">${k}</td><td style="white-space:pre-line">${esc(v || '–')}</td></tr>`).join('')}</tbody></table>
    </div>
    <div class="flex flex-col gap-3 order-1 md:order-2">
      ${gformBox(m, a)}
      ${a.cancelled ? cancelledBox(m, a) : trInBox(a, D)}
      ${changeBox(m, a)}
      ${m.cancel ? cancelPanel(m, a) : ''}
      ${ownerBox(m, a)}
      ${matchInfo}
      ${a.cancelled ? '' : flowPanel(m, a, D)}
      <div class="text-xs text-muted">บันทึก ${fmtDT(r.created_at)} โดย ${who({ by: r.created_by, role: r.created_role })}</div>
      ${bookingHistory(a)}
      <div class="flex flex-wrap gap-2 justify-end">
        ${canChange ? `<button class="btn btn-ghost" data-act="edit-open" data-id="${esc(a.id)}">${canApproveBr(a.br) ? 'แก้ไขใบจอง' : 'แก้ไข / ขอแก้ไขใบจอง'}</button><button class="btn btn-ghost" data-act="cancel-open" data-id="${esc(a.id)}">${canApproveBr(a.br) ? 'ยกเลิกใบจอง' : 'ขอยกเลิกใบจอง'}</button>` : ''}
        ${canSwap(swapCtx(D, { atId: a.id })) ? `<button class="btn btn-ghost" data-act="swap-open" data-id="${esc(a.id)}">เปลี่ยนคัน</button>` : ''}
        ${p.write && p.request && (canEditBooking(a) || p.mgr) && a.row?.state === 'waiting' ? `<button class="btn btn-red" data-act="lock-open" data-bk="${esc(a.row.key)}">ขอล็อกรถ</button>` : ''}
      </div>
    </div>
  </div>`;
}
function flowPanel(m, a, D) {
  const f = a.rec.flow || {}, r = a.rec, fl = a.flow;
  if (fl.history) return `<div class="p-3 rounded-lg text-sm" style="background:var(--surface-2)">ส่งมอบแล้ว${fl.deliveredDate ? ` ${fmtD(fl.deliveredDate)}` : ''} ก่อนเริ่มใช้ระบบนี้ เก็บไว้เป็นประวัติ</div>`;
  const step = (k, body) => {
    const done = fl.done[k] || (k !== 'confirmed' && fl.lateUpdate && FLOW.indexOf(k) <= FLOW.indexOf('delivered'));
    const cur = fl.next === k;
    const icon = done ? `<span class="w-6 h-6 rounded-full grid place-items-center text-xs font-bold" style="background:var(--good);color:#fff">✓</span>` : `<span class="w-6 h-6 rounded-full grid place-items-center text-xs font-bold" style="background:${cur ? 'var(--warn)' : 'var(--surface-2)'};color:${cur ? '#fff' : 'var(--muted)'}">${FLOW.indexOf(k) + 1}</span>`;
    return `<div class="flex gap-3"><div class="pt-0.5">${icon}</div><div class="flex-1 min-w-0 pb-3 border-b border-line"><div class="font-medium ${cur ? '' : done ? '' : 'text-muted'}">${FLOW_LABEL[k]}</div>${body || ''}</div></div>`;
  };
  const can = k => stepAllowed(a, k) && fl.next === k;
  const bookedBody = () => {
    if (fl.done.booked) return `<div class="text-sm text-muted">${fmtD(a.date)} · ใบเสร็จมัดจำ <span class="code">${esc(r.receipt_no)}</span>${r.deposit ? ` · ${money(r.deposit)} บาท` : ''}</div>`;
    return `<div class="text-sm text-muted">${fmtD(a.date)} · ยังไม่มีเลขที่ใบเสร็จมัดจำ ต้องใส่ก่อนไปขั้นถัดไป</div>
      ${canEditBooking(a) && perms().write ? `<div class="grid sm:grid-cols-[1fr_auto] gap-2 items-end mt-1"><div class="field"><label for="fl-rc">เลขที่ใบเสร็จมัดจำ</label><input id="fl-rc" data-modal="receipt_no" value="${esc(m.receipt_no ?? '')}" autocomplete="off"></div>
      <button class="btn btn-dark btn-sm" data-act="flow-booked" data-id="${esc(a.id)}">บันทึก</button></div>` : ''}`;
  };
  const finBody = () => {
    const fin = f.fin || {};
    if (isCash(r)) return '<div class="text-sm text-muted">ซื้อสด ไม่ต้องผ่านไฟแนนซ์</div>';
    if (fl.done.fin) return `<div class="text-sm text-muted">${esc(fin.company || r.finance || '')} อนุมัติ ${fmtD(fin.date)} ${fin.docs?.length ? `· แนบ ${fin.docs.length} รูป` : ''} · ${who(fin)}</div>`;
    const status = m.fin_status ?? r.fin_status ?? 'รอผล';
    const company = m.fin_company ?? fin.company ?? r.finance ?? '';
    return `<div class="text-sm text-muted mb-2">ยื่น ${esc(r.finance || '–')} สถานะตอนนี้ <b>${esc(r.fin_status || 'รอผล')}</b> · เมื่อผ่าน ให้ยืนยันบริษัทไฟแนนซ์และแนบใบอนุมัติ</div>
      ${stepAllowed(a, 'fin') ? `<div class="grid sm:grid-cols-3 gap-3 items-end">
        <div class="field"><label for="fl-fc">บริษัทไฟแนนซ์ (ยืนยัน)</label><select id="fl-fc" data-modal="fin_company">${opt(FINANCE, company, 'เลือก')}</select></div>
        <div class="field"><label for="fl-fs">สถานะไฟแนนซ์</label><select id="fl-fs" data-modal="fin_status">${opt(FIN_STATUS, status)}</select></div>
        <div class="flex flex-col gap-1"><label class="btn btn-ghost btn-sm relative">${S.files.fin.length ? `แนบแล้ว ${S.files.fin.length} รูป` : 'แนบใบอนุมัติ'}<input type="file" accept="image/*" multiple data-file="fin" class="absolute w-px h-px opacity-0"></label></div>
      </div>
      <div class="mt-2 flex gap-2"><button class="btn btn-dark btn-sm" data-act="flow-fin" data-id="${esc(a.id)}">บันทึก</button>
      <span class="text-xs text-muted self-center">เลือก "ผ่าน" พร้อมแนบเอกสาร จึงไปขั้นถัดไปได้</span></div>` : ''}`;
  };
  const downBody = () => {
    const d = f.down || {};
    if (fl.done.down) return `<div class="text-sm text-muted">${isCash(r) ? 'ชำระครบ' : 'ชำระดาวน์'} ใบเสร็จ <span class="code">${esc(d.receipt_no)}</span>${d.amount ? ` · ${money(d.amount)} บาท` : ''} · ${fmtD(d.date)}${tradeText(d.tradein)} · ${who(d)}</div>`;
    if (!can('down')) return '';
    return `<div class="grid sm:grid-cols-3 gap-3 items-end mt-1">
      <div class="field"><label for="fl-dn">เลขที่ใบเสร็จ${isCash(r) ? 'ชำระครบ' : 'เงินดาวน์'}</label><input id="fl-dn" data-modal="down.receipt_no" value="${esc(m.down?.receipt_no ?? '')}" autocomplete="off"></div>
      <div class="field"><label for="fl-da">ยอดเงิน (บาท)</label><input id="fl-da" type="number" min="0" step="100" inputmode="numeric" data-modal="down.amount" value="${esc(m.down?.amount ?? '')}"></div>
      <div class="field"><label for="fl-dd2">วันที่ชำระ</label><input id="fl-dd2" type="date" data-modal="down.date" value="${esc(m.down?.date ?? todayISO())}" max="${todayISO()}"></div></div>
      ${tradeFields('down', m.down || {}, 'fl')}
      <button class="btn btn-dark btn-sm mt-2" data-act="flow-down" data-id="${esc(a.id)}">บันทึกการชำระ</button>`;
  };
  const assignBody = () => {
    if (fl.done.assign && !(f.assign && f.assign.vin)) return `<div class="text-sm text-muted">IDS จัดสรรรถ <span class="code">${esc(a.match.vin)}</span> ให้ใบจองนี้แล้ว (จากไฟล์ IDS)</div>${bkLocks(a, D)}${swapHist(a)}`;
    if (fl.done.assign) { const ac = D.cars.get(f.assign.vin); return `<div class="text-sm text-muted">รถ <span class="code">${esc(f.assign.vin)}</span>${ac ? ` · ${esc(ac.br)} · ${prodPlain(ac)}` : ''} · ${who(f.assign)}</div>${swapHist(a)}`; }
    if (!can('assign') && !mgrAssign(a)) return (fl.next === 'assign' ? '<div class="text-sm text-muted">รอแอดมินหรือผู้จัดการจัดสรรรถให้</div>' : '') + bkLocks(a, D);
    const lockCar = [...D.cars.values()].find(c => c.lock && c.lock.bkref && (c.lock.bkref === a.key || c.lock.bkref === a.row?.key));
    const cands = [...D.cars.values()].filter(c => c.spec === a.spec && (carLockOpen(c) || c === lockCar)).sort((x, y) => (y === lockCar) - (x === lockCar) || (y.age ?? 0) - (x.age ?? 0));
    const matchVin = a.match && a.match.vin;
    const val = m.assign_vin ?? (lockCar ? lockCar.vin : matchVin || '');
    return `<div class="grid sm:grid-cols-[1fr_auto] gap-2 items-end mt-1">
      <div class="field"><label for="fl-vin">หมายเลขตัวถัง</label><input id="fl-vin" class="code" maxlength="17" list="fl-vins" data-modal="assign_vin" value="${esc(val)}" placeholder="เลือกหรือพิมพ์ VIN">
        <datalist id="fl-vins">${cands.map(c => `<option value="${c.vin}">${c.br} · ${prodPlain(c)} · อายุ ${c.age ?? '–'} วัน${c === lockCar ? ' · ล็อกให้ใบจองนี้' : ''}</option>`).join('')}</datalist></div>
      <button class="btn btn-dark btn-sm" data-act="flow-assign" data-id="${esc(a.id)}">จัดสรรให้ ${esc(a.sales || '')}</button></div>
      ${fl.next !== 'assign' ? '<div class="text-xs mt-1" style="color:var(--warn)">ผู้จัดการจัดสรรได้เลย ไม่ต้องรอใบเสร็จมัดจำหรือใบอนุมัติไฟแนนซ์ ขั้นที่ยังขาดเซลล์ใส่ภายหลัง</div>' : ''}
      ${bkLocks(a, D)}<div class="text-xs text-muted mt-1">${lockCar ? `รถที่ล็อกไว้ให้ใบจองนี้: ${lockCar.vin} · ${prodPlain(lockCar)}` : matchVin ? `IDS จัดสรรไว้แล้ว: ${matchVin}` : `รถว่างสเปกนี้ ${cands.length} คัน`}</div>${swapHist(a)}`;
  };
  const poBody = () => {
    if (fl.done.po) return `<div class="text-sm text-muted">สั่งแต่ง ${(f.po.items || []).length} รายการ ${fmtD(f.po.date)} · ${who(f.po)}</div>
      <div class="flex gap-2 mt-1"><button class="btn btn-ghost btn-sm" data-act="po-open" data-id="${esc(a.id)}">${fl.done.delivered ? 'ดูใบแต่งรถ' : 'แก้ใบแต่งรถ'}</button><button class="btn btn-ghost btn-sm" data-act="po-print" data-id="${esc(a.id)}">พิมพ์ใบแต่งรถ</button></div>`;
    return can('po') ? `<div class="mt-1"><button class="btn btn-dark btn-sm" data-act="po-open" data-id="${esc(a.id)}">ทำใบสั่งแต่ง (PO)</button></div>` : '';
  };
  const delivBody = () => {
    const dv = f.delivered || {};
    if (fl.done.delivered && dv.src === 'IDS' && !(dv.plate && dv.insurer)) return `<div class="text-sm">ส่งมอบแล้วตาม IDS (DL) ${fmtD(dv.date)} · บันทึกเข้าระบบแล้ว</div>${stepAllowed(a, 'delivered') ? `<details class="mt-1"><summary class="text-sm cursor-pointer" style="color:var(--warn)">เพิ่มเลขทะเบียนป้ายแดงและบริษัทประกัน (ไม่บังคับ)</summary>${delivForm()}</details>` : ''}${commBody()}`;
    if (fl.done.delivered) return `<div class="text-sm text-muted">ส่งมอบ ${fmtD(dv.date)} · ป้ายแดง <span class="code">${esc(dv.plate)}</span> · ประกัน ${esc(dv.insurer)} · ${who(dv)}</div>${commBody()}`;
    if (fl.lateUpdate) return `<div class="text-sm">ส่งมอบแล้วตาม IDS (DL) ${fmtD(fl.deliveredDate)}</div>${stepAllowed(a, 'delivered') ? `<details class="mt-1"><summary class="text-sm cursor-pointer" style="color:var(--warn)">เพิ่มเลขทะเบียนป้ายแดงและบริษัทประกัน (ไม่บังคับ)</summary>${delivForm()}</details>` : ''}${commBody()}`;
    if (!can('delivered')) return fl.next === 'delivered' && !stepAllowed(a, 'delivered') ? '<div class="text-sm text-muted">รอเซลล์อัปเดตการส่งมอบ</div>' : '';
    return delivForm();
  };
  function delivForm() {
    const v = m.deliv || {}, dv = f.delivered || {};
    return `      <div class="grid sm:grid-cols-3 gap-3 items-end mt-1">
      <div class="field"><label for="fl-dd">วันที่ส่งมอบรถ</label><input id="fl-dd" type="date" data-modal="deliv.date" value="${esc(v.date ?? (fl.deliveredDate || todayISO()))}" max="${todayISO()}"></div>
      <div class="field"><label for="fl-pl">เลขทะเบียนป้ายแดง</label><input id="fl-pl" data-modal="deliv.plate" value="${esc(v.plate ?? dv.plate ?? '')}" placeholder="เช่น ป-1234 นครปฐม" autocomplete="off"></div>
      <div class="field"><label for="fl-in">บริษัทประกันที่ทำ</label><input id="fl-in" list="fl-ins" data-modal="deliv.insurer" value="${esc(v.insurer ?? dv.insurer ?? '')}" placeholder="เลือกหรือพิมพ์"><datalist id="fl-ins">${INSURERS.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div></div>
      <div class="text-xs text-muted mt-1">ประกันในใบจอง: ${esc(r.insurance || '–')}</div>
      <button class="btn btn-dark btn-sm mt-2" data-act="flow-deliver" data-id="${esc(a.id)}">บันทึกส่งมอบ</button>`;
  };
  const commBody = () => {
    const c = Object.assign({}, a.rec.comm || {}, m.comm || {});
    const ro = fl.done.confirmed || !canEditBooking(a);
    const F2 = (k, label, type = 'number') => `<div class="field"><label for="cm-${k}">${label}</label><input id="cm-${k}" type="${type}" data-modal="comm.${k}" value="${esc(c[k] ?? '')}" ${ro ? 'disabled' : ''}></div>`;
    return `<details class="mt-2" ${fl.done.confirmed ? '' : 'open'}><summary class="text-sm font-medium cursor-pointer">ข้อมูลสำหรับค่าคอม (กรอกหลังส่งมอบ)</summary>
      <div class="grid sm:grid-cols-3 gap-3 mt-2">${F2('price', 'ราคารถ')}${F2('discount', 'ส่วนลด')}${F2('down', 'เงินดาวน์')}${a.rec.purchase === 'ไฟแนนซ์' ? F2('fin_amount', 'ยอดจัด') + F2('rate', 'ดอกเบี้ย %') + F2('term', 'จำนวนงวด') : ''}${F2('campaign', 'แคมเปญ', 'text')}${F2('margin', 'Margin', 'number')}</div>
      ${ro ? '' : `<button class="btn btn-ghost btn-sm mt-2" data-act="comm-save" data-id="${esc(a.id)}">บันทึกข้อมูลค่าคอม</button>`}</details>`;
  };
  const confBody = () => {
    if (fl.done.confirmed) return `<div class="text-sm text-muted">ยืนยัน ${fmtDT(f.confirm.at)} · ${who(f.confirm)} พร้อมเข้าขั้นตอนจ่ายค่าคอม</div>`;
    return can('confirmed') ? `<div class="mt-1"><button class="btn btn-red btn-sm" data-act="flow-confirm" data-id="${esc(a.id)}">ยืนยันเพื่อทำค่าคอม</button></div>` : (fl.next === 'confirmed' ? '<div class="text-sm text-muted">รอผู้จัดการยืนยัน (พี่อั้มหรือนุช)</div>' : '');
  };
  const planRow = canEditBooking(a) && !fl.done.delivered ? `<div class="grid sm:grid-cols-[1fr_auto] gap-2 items-end mb-1"><div class="field"><label for="fl-plan">วันนัดรับรถ</label><input id="fl-plan" type="date" data-modal="plan" value="${esc(m.plan ?? r.delivery_plan ?? '')}"></div>
      <button class="btn btn-ghost btn-sm" data-act="plan-save" data-id="${esc(a.id)}">บันทึกวันนัด</button></div><p class="text-xs text-muted mb-2">มีวันนัดรับรถแล้ว ล็อกรถจะถือไว้จนส่งมอบ ไม่ต้องปลดทุก 15 วัน</p>` : (r.delivery_plan ? `<p class="text-sm mb-2">วันนัดรับรถ ${fmtD(r.delivery_plan)}</p>` : '');
  return `<section data-flow-steps><h3 class="font-head font-semibold mb-2">ขั้นตอนส่งมอบ</h3>${planRow}
    ${step('booked', bookedBody())}${step('fin', finBody())}${step('assign', assignBody())}${step('po', poBody())}${step('down', downBody())}${step('delivered', delivBody())}${step('confirmed', confBody())}</section>`;
}

// ---------- PO: accessories order (ใบแต่งรถ)
function poDraft(a) {
  const po = (a.rec.flow && a.rec.flow.po) || {};
  return { items: (po.items || []).map(x => ({ ...x })), date: po.date || todayISO(), ddate: po.ddate || a.rec.delivery_plan || '', dtime: po.dtime || '', by: po.by_name || a.sales || '', note: po.note || '' };
}
function poEditor(m, a, D) {
  const po = m.po, codes = [...(MODEL_CODES[a.model] || []), 'OT', 'ALL'];
  const cat = focCatalog();
  const q = (m.poq || '').trim().toLowerCase();
  const hits = cat.filter(x => codes.includes(x.model) && (!q || x.name.toLowerCase().includes(q) || (x.part || '').toLowerCase().includes(q))).slice(0, 40);
  const cost = po.items.reduce((n, x) => n + (Number(x.cost) || 0) * (Number(x.qty) || 1), 0);
  const sale = po.items.reduce((n, x) => n + (Number(x.sale) || 0) * (Number(x.qty) || 1), 0);
  const focBudget = Number(a.rec.foc_total) || 0;
  const ro = a.flow.done.delivered || !stepAllowed(a, 'po');
  return `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">ใบสั่งแต่ง (PO)</h2><p class="text-sm text-muted">${esc(a.cust)} · ${esc(a.model)} ${esc(a.grade)} ${esc(a.color)} · รหัสรุ่นในรายการ FOC: ${codes.slice(0, -2).join(', ') || '–'}</p></div>
    <button class="btn btn-ghost btn-sm" data-act="po-back">กลับ</button></div>
  <div class="grid md:grid-cols-[1.1fr_1fr] gap-5">
    <div class="flex flex-col gap-3">
      <div class="grid sm:grid-cols-2 gap-3">
        <div class="field"><label for="po-date">วันที่สั่งอุปกรณ์</label><input id="po-date" type="date" data-modal="po.date" value="${esc(po.date)}" ${ro ? 'disabled' : ''}></div>
        <div class="field"><label for="po-by">ผู้สั่งอุปกรณ์</label><input id="po-by" data-modal="po.by" value="${esc(po.by)}" ${ro ? 'disabled' : ''}></div>
        <div class="field"><label for="po-dd">วันที่ส่งมอบ</label><input id="po-dd" type="date" data-modal="po.ddate" value="${esc(po.ddate)}" ${ro ? 'disabled' : ''}></div>
        <div class="field"><label for="po-dt">เวลา</label><input id="po-dt" type="time" data-modal="po.dtime" value="${esc(po.dtime)}" ${ro ? 'disabled' : ''}></div>
      </div>
      <table class="tbl text-sm"><thead><tr><th>ลำดับ</th><th>ชื่ออุปกรณ์อะไหล่</th><th>หมายเลขอะไหล่ / ผู้ขาย</th><th class="text-right">จำนวน</th><th class="text-right">ทุน FOC</th><th></th></tr></thead>
        <tbody>${po.items.map((x, i) => `<tr><td class="num">${i + 1}</td><td style="min-width:160px">${ro ? esc(x.name) : `<input data-modal="po.items.${i}.name" value="${esc(x.name)}" class="w-full" style="background:transparent;border-bottom:1px solid var(--line)">`}</td>
          <td class="code text-xs">${esc(x.part || x.vendor || '–')}</td>
          <td class="text-right">${ro ? esc(x.qty) : `<input type="number" min="1" data-modal="po.items.${i}.qty" value="${esc(x.qty)}" class="w-12 text-right" style="background:transparent;border-bottom:1px solid var(--line)">`}</td>
          <td class="num text-right">${money((Number(x.cost) || 0) * (Number(x.qty) || 1))}</td>
          <td>${ro ? '' : `<button class="btn btn-ghost btn-sm" data-act="po-del" data-i="${i}" aria-label="ลบรายการ ${i + 1}">×</button>`}</td></tr>`).join('') || '<tr><td colspan="6" class="text-muted">ยังไม่มีรายการ เลือกจากรายการ FOC ทางขวา หรือเพิ่มเอง</td></tr>'}</tbody></table>
      <div class="text-sm p-3 rounded-lg" style="background:var(--surface-2)">ทุน FOC รวม <b class="num">${money(cost)}</b> บาท · ราคาขาย <b class="num">${money(sale)}</b> บาท
        ${focBudget ? ` · FOC ในใบจอง ${money(focBudget)} บาท → <b style="color:var(--${cost > focBudget ? 'bad' : 'good'})">${cost > focBudget ? 'เกิน' : 'เหลือ'} ${money(Math.abs(focBudget - cost))}</b>` : ''}</div>
      <div class="field"><label for="po-note">หมายเหตุ</label><input id="po-note" data-modal="po.note" value="${esc(po.note)}" ${ro ? 'disabled' : ''}></div>
      <div class="flex flex-wrap gap-2">${ro ? '' : `<button class="btn btn-red" data-act="po-save" data-id="${esc(a.id)}">บันทึก PO</button><button class="btn btn-ghost" data-act="po-custom">+ เพิ่มรายการเอง</button>`}<button class="btn btn-ghost" data-act="po-print" data-id="${esc(a.id)}">พิมพ์ใบแต่งรถ</button></div>
    </div>
    <div class="flex flex-col gap-2">
      <div class="field"><label for="po-q">ค้นหาในรายการ FOC (${cat.length ? cat.length + ' รายการ' : 'ยังไม่มีรายการ'})</label><input id="po-q" type="search" data-modal="poq" value="${esc(m.poq || '')}" placeholder="เช่น ฟิล์ม, พรม, 08P"></div>
      <div class="flex flex-col gap-1 max-h-[55vh] overflow-auto pr-1">${hits.map(x => `<button class="pick text-left text-sm" data-act="po-add" data-name="${esc(x.name)}" ${ro ? 'disabled' : ''}>
        <span class="flex-1 min-w-0">${esc(x.name)}<span class="block text-xs text-muted">${esc(x.cat || '')} · ${esc(x.part || x.vendor || '')} · ทุน ${money(x.cost)} · ขาย ${money(x.sale)}</span></span></button>`).join('') || `<p class="text-sm text-muted">${cat.length ? 'ไม่พบรายการที่ค้นหา' : 'รายการ FOC ยังไม่ได้นำเข้า'}</p>`}</div>
    </div>
  </div>`;
}
// the accessories order for the parts team, saved as a PDF or a picture
function printPO(a) {
  const po = (S.modal && S.modal.po) || poDraft(a);
  const vin = a.rec.flow?.assign?.vin, D0 = derive();
  const car = vin ? (D0.cars.get(vin) || D0.deliveredOut.find(c => c.vin === vin) || {}) : {};
  const rows = [...po.items.map((x, i) => [String(i + 1), x.name, x.part || x.vendor || '', String(x.qty), x.note || '']),
    ...Array.from({ length: Math.max(0, 15 - po.items.length) }, (_, i) => [String(po.items.length + i + 1), '', '', '', ''])];
  const spec = { title: 'ใบสั่งแต่งรถ', sub: `บริษัท เอที ฮอนด้า ออโตโมบิล จำกัด สาขา${BR[a.br]?.name || ''}`, blocks: [
    { kv: [['วันที่สั่งอุปกรณ์', fmtD(po.date), 'พนักงานขาย', a.sales || ''], ['เลขที่ใบจอง', a.no || '', 'ชื่อลูกค้า', a.cust || ''], ['รุ่นรถ', a.model || '', 'แบบรถ / สีรถ', `${a.grade || ''} / ${a.color || ''}`],
      ['วันที่ส่งมอบ', `${fmtD(po.ddate)} ${po.dtime || ''}`, 'ผู้สั่งอุปกรณ์', po.by || ''], ['หมายเลขตัวถัง', vin || '', 'หมายเลขเครื่องยนต์', car.engine || '']] },
    { h: 'รายการแต่งอุปกรณ์' },
    { items: { cols: ['ลำดับ', 'ชื่ออุปกรณ์อะไหล่', 'หมายเลขอะไหล่', 'จำนวน', 'หมายเหตุ'], widths: [0.08, 0.44, 0.24, 0.1, 0.14], rows } },
    ...(po.note ? [{ note: `หมายเหตุ: ${po.note}` }] : []),
    { sign: ['ผู้สั่งอุปกรณ์', 'ผู้จัดการฝ่ายขาย', 'ฝ่ายอะไหล่ / ผู้ติดตั้ง'] }] };
  const back = S.modal && S.modal.kind === 'at' ? { ...S.modal } : { kind: 'at', id: a.id };
  openDoc(spec, docName('ใบสั่งแต่งรถ', a.cust, vin || ''), back);
}
