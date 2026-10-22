// ---------- old car traded in, asked when the booking is keyed (ตกลง 22/10)
// มี / ไม่มี is required; brand and model when there is one; year and the price are optional at booking time
// (the price is settled at the down-payment step, which starts from what the booking said).
// Only function declarations at the top level: the first render runs before this file.
function bookTradeFields(d) {
  const t = d.trade || '';
  return `<div class="field sm:col-span-2"><span class="text-sm font-medium">ลูกค้ามีรถเก่าเทิร์นไหม <span class="text-xs text-muted font-normal">(ไม่บังคับ แก้ในใบจองภายหลังได้ · ต้องระบุก่อนส่งมอบ)</span></span><div class="flex gap-5 text-sm mt-1">
      <label class="flex items-center gap-2"><input type="radio" class="w-5 h-5" name="b-trade" value="no" data-draft="booking.trade" ${t === 'no' ? 'checked' : ''}> ไม่มี</label>
      <label class="flex items-center gap-2"><input type="radio" class="w-5 h-5" name="b-trade" value="yes" data-draft="booking.trade" ${t === 'yes' ? 'checked' : ''}> มีรถเก่าเทิร์น</label></div>
    ${t === 'yes' ? `<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
      <div class="field"><label for="b-tb">ยี่ห้อ</label><input id="b-tb" data-draft="booking.t_brand" value="${esc(d.t_brand || '')}" placeholder="เช่น Toyota" autocomplete="off"></div>
      <div class="field"><label for="b-tm">รุ่น</label><input id="b-tm" data-draft="booking.t_model" value="${esc(d.t_model || '')}" placeholder="เช่น Vios" autocomplete="off"></div>
      <div class="field"><label for="b-ty">ปี</label><input id="b-ty" type="number" min="1980" max="2030" inputmode="numeric" data-draft="booking.t_year" value="${esc(d.t_year || '')}"></div>
      <div class="field"><label for="b-tp">ราคาประเมิน (ถ้ามี)</label><input id="b-tp" type="number" min="0" step="1000" inputmode="numeric" data-draft="booking.t_price" value="${esc(d.t_price || '')}"></div></div>` : ''}</div>`;
}
function bookTradeRec(d) {
  if (d.trade === 'no') return { has: false };
  if (d.trade !== 'yes') return null;
  return { has: true, brand: String(d.t_brand || '').trim(), model: String(d.t_model || '').trim(), year: parseInt(d.t_year, 10) || null, price: num(d.t_price) || null };
}
function tradeCur(r) { return r.trade || (r.flow && r.flow.down && r.flow.down.tradein) || null; }
function tradeLine(r) {
  const t = tradeCur(r);
  if (!t) return 'ยังไม่ระบุ';
  if (!t.has) return 'ไม่มี';
  return ['มี', t.brand, t.model, t.year, t.price ? `ประเมิน ${money(t.price)}` : '', t.sale_price ? `· ขาย ${money(t.sale_price)}` : '', t.tent ? `ให้ ${t.tent}` : '', (t.docs || []).length ? `· สัญญา ${t.docs.length} รูป` : ''].filter(Boolean).join(' ');
}
// the down-payment step starts from the booking's answer
function tradePre(r) {
  const t = tradeCur(r); if (!t) return {};
  return t.has ? { trade: 'yes', t_brand: t.brand || '', t_model: t.model || '', t_year: t.year || '', t_price: t.price || '', t_sale: t.sale_price || '', t_tent: t.tent || '' } : { trade: 'no' };
}
// edit in the booking (any time before the manager confirms)
function tradeEditBox(m, a) {
  const r = a.rec, can = perms().write && canEditBooking(a) && !a.cancelled && !(a.flow && a.flow.done && a.flow.done.confirmed);
  if (!m.tradeEdit) return `<div class="flex flex-wrap gap-2 items-center text-sm"><span class="text-muted">รถเก่าเทิร์น:</span> <b>${esc(tradeLine(r))}</b>${can ? ` <button class="btn btn-ghost btn-sm" data-act="trade-edit" data-id="${esc(a.id)}">แก้รถเก่า</button>` : ''}</div>`;
  const v = m.tr = m.tr || tradePre(r);
  return `<div class="p-3 rounded-lg" style="background:var(--surface-2)"><b class="text-sm">แก้รถเก่าเทิร์น</b>${tradeDelivFields('tr', v, 'te', tradeCur(r), false)}
    <div class="flex gap-2 mt-2"><button class="btn btn-dark btn-sm" data-act="trade-save" data-id="${esc(a.id)}">บันทึก</button><button class="btn btn-ghost btn-sm" data-act="trade-cancel">ยกเลิก</button></div></div>`;
}
// the old-car part of the delivery step: มี / ไม่มี is required; with a car: brand, model, the sale price, the tent that
// bought it and the sale contract (photo). need = true at delivery (everything required), false when editing in the booking.
function tradeDelivFields(pre, v, idp, cur, need) {
  const t = v.trade || '', docs = ((cur && cur.docs) || []).length, nf = S.files.trade.length, R = need ? 'req' : '';
  return `<div class="mt-2 sm:col-span-3"><div class="text-sm font-medium mb-1 ${need ? 'req' : ''}">รถเก่าเทิร์น</div><div class="flex gap-5 text-sm">
    <label class="flex items-center gap-2"><input type="radio" class="w-5 h-5" name="${idp}-tr" value="no" data-modal="${pre}.trade" ${t === 'no' ? 'checked' : ''}> ไม่มี</label>
    <label class="flex items-center gap-2"><input type="radio" class="w-5 h-5" name="${idp}-tr" value="yes" data-modal="${pre}.trade" ${t === 'yes' ? 'checked' : ''}> มีรถเก่า</label></div>
    ${t === 'yes' ? `<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
      <div class="field"><label for="${idp}-tb" class="${R}">ยี่ห้อ</label><input id="${idp}-tb" data-modal="${pre}.t_brand" value="${esc(v.t_brand ?? '')}" placeholder="เช่น Toyota" autocomplete="off"></div>
      <div class="field"><label for="${idp}-tm" class="${R}">รุ่น</label><input id="${idp}-tm" data-modal="${pre}.t_model" value="${esc(v.t_model ?? '')}" placeholder="เช่น Vios" autocomplete="off"></div>
      <div class="field"><label for="${idp}-ty">ปี</label><input id="${idp}-ty" type="number" min="1980" max="2030" inputmode="numeric" data-modal="${pre}.t_year" value="${esc(v.t_year ?? '')}"></div>
      <div class="field"><label for="${idp}-tp">ราคาประเมิน</label><input id="${idp}-tp" type="number" min="0" step="1000" inputmode="numeric" data-modal="${pre}.t_price" value="${esc(v.t_price ?? '')}"></div>
      <div class="field"><label for="${idp}-ts" class="${R}">ราคาขายรถเก่า (บาท)</label><input id="${idp}-ts" type="number" min="0" step="1000" inputmode="numeric" data-modal="${pre}.t_sale" value="${esc(v.t_sale ?? '')}"></div>
      <div class="field"><label for="${idp}-tt" class="${R}">เต็นท์ที่รับซื้อ</label><input id="${idp}-tt" data-modal="${pre}.t_tent" value="${esc(v.t_tent ?? '')}" placeholder="ชื่อเต็นท์ / ผู้ซื้อ" autocomplete="off"></div>
      <div class="field col-span-2 sm:col-span-3"><span class="text-sm ${R}">ใบสัญญาซื้อขายรถเก่า</span><label class="btn btn-ghost btn-sm relative" style="width:fit-content">${nf ? `แนบใหม่ ${nf} รูป` : docs ? `แนบแล้ว ${docs} รูป · เพิ่มรูป` : 'แนบรูปสัญญา'}<input type="file" accept="image/*" multiple data-file="trade" class="absolute w-px h-px opacity-0"></label></div></div>` : ''}</div>`;
}
// returns { rec } or { err, id }; uploads new contract photos
async function tradeDelivOf(v, cur, idp, need) {
  if (v.trade !== 'yes' && v.trade !== 'no') return need ? { err: 'เลือกว่าลูกค้ามีรถเก่าเทิร์นหรือไม่', id: null } : { rec: cur || null };
  if (v.trade === 'no') return { rec: { has: false } };
  const brand = String(v.t_brand || '').trim(), model = String(v.t_model || '').trim(), sale = num(v.t_sale), tent = String(v.t_tent || '').trim();
  const have = ((cur && cur.docs) || []).length + S.files.trade.length;
  if (need) {
    if (!brand) return { err: 'ใส่ยี่ห้อรถเก่า', id: idp + '-tb' };
    if (!model) return { err: 'ใส่รุ่นรถเก่า', id: idp + '-tm' };
    if (!(sale > 0)) return { err: 'ใส่ราคาขายรถเก่า', id: idp + '-ts' };
    if (!tent) return { err: 'ใส่ชื่อเต็นท์ที่รับซื้อ', id: idp + '-tt' };
    if (!have) return { err: 'แนบรูปใบสัญญาซื้อขายรถเก่า', id: null };
  }
  const docs = [...((cur && cur.docs) || [])];
  for (const x of S.files.trade) { const id = await storeImage(x.blob); if (id) docs.push(id); }
  return { rec: { has: true, brand, model, year: parseInt(v.t_year, 10) || null, price: num(v.t_price) || null, sale_price: sale || null, tent: tent || null, docs } };
}
function tradeFilesClear() { S.files.trade.forEach(x => { try { URL.revokeObjectURL(x.url); } catch (e) { /* ignore */ } }); S.files.trade = []; }
Object.assign(ACTIONS, {
  'trade-edit'() { if (S.modal) { S.modal.tradeEdit = true; S.modal.tr = null; tradeFilesClear(); render(); } },
  'trade-cancel'() { if (S.modal) { S.modal.tradeEdit = false; S.modal.tr = null; tradeFilesClear(); render(); } },
  async 'trade-save'(el) {
    const a = atById(el.dataset.id); if (!a || !canEditBooking(a)) return;
    const cur = tradeCur(a.rec), tr = await tradeDelivOf(S.modal.tr || {}, cur, 'te', false);
    if (tr.err) { toast(tr.err, 'bad'); return; }
    const r = await saveBk(a.id, 'แก้ไขรถเก่าเทิร์น', `${tradeLine(a.rec)} → ${tradeLine({ trade: tr.rec })}`, x => { x.trade = tr.rec; });
    if (r) { tradeFilesClear(); S.modal.tradeEdit = false; S.modal.tr = null; toast('บันทึกรถเก่าแล้ว'); render(); }
  }
});
