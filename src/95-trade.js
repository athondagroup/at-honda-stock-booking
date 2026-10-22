// ---------- old car traded in, asked when the booking is keyed (ตกลง 22/10)
// มี / ไม่มี is required; brand and model when there is one; year and the price are optional at booking time
// (the price is settled at the down-payment step, which starts from what the booking said).
// Only function declarations at the top level: the first render runs before this file.
function bookTradeFields(d) {
  const t = d.trade || '';
  return `<div class="field sm:col-span-2"><span class="text-sm font-medium req">ลูกค้ามีรถเก่าเทิร์นไหม</span><div class="flex gap-5 text-sm mt-1">
      <label class="flex items-center gap-2"><input type="radio" class="w-5 h-5" name="b-trade" value="no" data-draft="booking.trade" ${t === 'no' ? 'checked' : ''}> ไม่มี</label>
      <label class="flex items-center gap-2"><input type="radio" class="w-5 h-5" name="b-trade" value="yes" data-draft="booking.trade" ${t === 'yes' ? 'checked' : ''}> มีรถเก่าเทิร์น</label></div>
    ${t === 'yes' ? `<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
      <div class="field"><label for="b-tb" class="req">ยี่ห้อ</label><input id="b-tb" data-draft="booking.t_brand" value="${esc(d.t_brand || '')}" placeholder="เช่น Toyota" autocomplete="off"></div>
      <div class="field"><label for="b-tm" class="req">รุ่น</label><input id="b-tm" data-draft="booking.t_model" value="${esc(d.t_model || '')}" placeholder="เช่น Vios" autocomplete="off"></div>
      <div class="field"><label for="b-ty">ปี</label><input id="b-ty" type="number" min="1980" max="2030" inputmode="numeric" data-draft="booking.t_year" value="${esc(d.t_year || '')}"></div>
      <div class="field"><label for="b-tp">ราคาประเมิน (ถ้ามี)</label><input id="b-tp" type="number" min="0" step="1000" inputmode="numeric" data-draft="booking.t_price" value="${esc(d.t_price || '')}"></div></div>` : ''}</div>`;
}
function bookTradeRec(d) {
  if (d.trade === 'no') return { has: false };
  if (d.trade !== 'yes') return null;
  return { has: true, brand: String(d.t_brand || '').trim(), model: String(d.t_model || '').trim(), year: parseInt(d.t_year, 10) || null, price: num(d.t_price) || null };
}
function tradeText(r) {
  const t = (r.flow && r.flow.down && r.flow.down.tradein) || r.trade;
  if (!t) return 'ยังไม่ระบุ';
  if (!t.has) return 'ไม่มี';
  return ['มี', t.brand, t.model, t.year, t.price ? `ราคา ${money(t.price)}` : ''].filter(Boolean).join(' ');
}
// the down-payment step starts from the booking's answer
function tradePre(r) {
  const t = r.trade; if (!t) return {};
  return t.has ? { trade: 'yes', t_brand: t.brand || '', t_model: t.model || '', t_year: t.year || '', t_price: t.price || '' } : { trade: 'no' };
}
