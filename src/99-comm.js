// ---------- commission data after delivery (23/10): amount financed worked out, the Honda campaign picked from a list,
// the margin in 3 parts the sales can adjust: the car margin (standard table, on the price without paint),
// the AT campaign (the Step column) and the Honda campaign (its sales support money). Not read from the Google Sheet yet.
// Only function declarations here: the first render runs before this part of the file.
// Honda campaigns SP118/26, October 2026 (booked 1–31 Oct, delivered by 30 Nov) — from the sales calculator
function hondaCampData() {
  return {
    citySep: ['City ราคาแนะนำ (แคมเปญเดิม ก.ย.)', [['1', 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.69% + ฟรีประกันภัย 1 ปี', 0], ['2', 'ทางเลือก 2: Service e-coupon มูลค่า 6,000 บาท + ฟรีประกันภัย 1 ปี', 0], ['3', 'ทางเลือก 3: ค่าช่วยเหลือการขาย 12,000 บาท + ฟรีประกันภัย 1 ปี (ไม่ร่วม Gen to Gen / Test Drive / Local Native)', 12000]]],
    cityOct: ['City ราคาปกติ (แคมเปญ ต.ค.)', [['1', 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.69% + ฟรีประกันภัย 1 ปี + ค่าช่วยเหลือการขาย 20,000 บาท', 20000], ['2', 'ทางเลือก 2: ดอกเบี้ยพิเศษ 1.69% + Honda Exclusive Care 3 ปี', 0], ['3', 'ทางเลือก 3: ดอกเบี้ยพิเศษ 0.99% + ฟรีประกันภัย 1 ปี + ค่าช่วยเหลือการขาย 8,000 บาท', 8000], ['4', 'ทางเลือก 4: ค่าช่วยเหลือการขาย 26,000 บาท + ฟรีประกันภัย 1 ปี (ซื้อสด / Standard Rate / Double Smile Plus)', 26000]]],
    civic: ['Civic e:HEV EL+ / RS', [['1', 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี', 0], ['2', 'ทางเลือก 2: ดอกเบี้ยพิเศษ 0% + ฟรีประกันภัย 1 ปี + ค่าช่วยเหลือการขาย 35,000 บาท', 35000], ['3', 'ทางเลือก 3: ค่าช่วยเหลือการขาย 90,000 บาท + ฟรีประกันภัย 1 ปี (ดอกเบี้ยมาตรฐาน)', 90000]]],
    civicEL: ['Civic e:HEV EL', [['1', 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.89% + Honda Exclusive Care 3 ปี', 0], ['2', 'ทางเลือก 2: ค่าช่วยเหลือการขาย 50,000 บาท (ดอกเบี้ยมาตรฐาน)', 50000]]],
    hrv: ['HR-V e:HEV', [['1', 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี + ฟรีประกันภัยรวม 2 ปี', 0], ['2', 'ทางเลือก 2: ค่าช่วยเหลือการขาย 90,000 บาท + ฟรีประกันภัย 2 ปี (ดอกเบี้ยมาตรฐาน)', 90000], ['3', 'ทางเลือก 3: ค่าช่วยเหลือการขาย 140,000 บาท (ดอกเบี้ยมาตรฐาน)', 140000]]],
    accord: ['Accord e:HEV', [['1', 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี', 0], ['2', 'ทางเลือก 2: ค่าช่วยเหลือการขาย 110,000 บาท + ฟรีประกันภัย 1 ปี (ดอกเบี้ยมาตรฐาน)', 110000]]],
    crv: ['CR-V e:HEV', [['1', 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี', 0], ['2', 'ทางเลือก 2: ค่าช่วยเหลือการขาย 110,000 บาท + ฟรีประกันภัย 1 ปี (ดอกเบี้ยมาตรฐาน)', 110000]]],
    en2: ['e:N2', [['1', 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + ฟรีประกันภัย 1 ปี + โฮมชาร์จเจอร์ + Ultimate Care + ค่าช่วยเหลือการขาย 200,000 บาท', 200000], ['2', 'ทางเลือก 2: ค่าช่วยเหลือการขาย 330,000 บาท + Ultimate Care (ดอกเบี้ยมาตรฐาน)', 330000]]],
    step: ['STEP WGN e:HEV', [['1', 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.69% + ฟรีประกันภัย 1 ปี + Ultimate Care', 0], ['2', 'ทางเลือก 2: ค่าช่วยเหลือการขาย 40,000 บาท + Ultimate Care (ดอกเบี้ยมาตรฐาน)', 40000]]]
  };
}
function hondaCampKeys(a) {
  const m = String(a.model || '').toUpperCase(), g = String(a.grade || '').toUpperCase();
  if (m.startsWith('CITY')) return ['cityOct', 'citySep'];
  if (m.startsWith('CIVIC')) return /EL\+|RS/.test(g) ? ['civic'] : /EL/.test(g) ? ['civicEL'] : ['civic', 'civicEL'];
  if (m.startsWith('HR-V')) return ['hrv'];
  if (m.startsWith('ACCORD')) return ['accord'];
  if (m.startsWith('CR-V')) return ['crv'];
  if (m.startsWith('E:N2')) return ['en2'];
  if (m.startsWith('STEP')) return ['step'];
  return [];
}
// → [{id, name, sup, group}] for this car, plus "no Honda campaign" and "other (typed)"
function hondaCamps(a) {
  const D0 = hondaCampData(), out = [];
  hondaCampKeys(a).forEach(k => D0[k][1].forEach(([id, name, sup]) => out.push({ id: k + '-' + id, name, sup, group: D0[k][0] })));
  return [...out, { id: 'none', name: 'ไม่ใช้แคมเปญ Honda (ดอกเบี้ยมาตรฐาน / นอกตาราง)', sup: 0, group: '' }, { id: 'other', name: 'อื่น ๆ (พิมพ์เอง)', sup: 0, group: '' }];
}
// standard margin table (แคมเปญ ต.ค. 2569): % of the price without paint; Step column 1 / 2 = AT extra baht, finance only
function marginStd(a) {
  const m = String(a.model || '').toUpperCase();
  const row = m.startsWith('ACCORD') ? [0.03, 10000, 20000] : m.startsWith('CR-V') ? [0.03, 15000, 20000] : m.startsWith('CITY') ? [0.03, 15000, 20000]
    : m.startsWith('CIVIC') ? [0.03, 10000, 20000] : m.startsWith('HR-V') ? [0.03, 12000, 20000] : m.startsWith('E:N2') ? [0.03, 15000, 20000] : m.startsWith('STEP') ? [0.03, 0, 0] : [0.03, 0, 0];
  const cash = isCash(a.rec);
  return { pct: cash && m.startsWith('STEP') ? 0.02 : row[0], step1: cash ? 0 : row[1], step2: cash ? 0 : row[2] };
}
function commFinAmount(c) { const n = num(c.price) - num(c.discount) - num(c.down); return num(c.price) && n > 0 ? n : null; }
// what the form shows: typed values first, then the finance step, then the defaults worked out here
function commView(a, m, D) {
  const web = dealWeb(a, D), dl = a.rec.deal || {}, st = marginStd(a), cash = isCash(a.rec);
  const c = Object.assign({}, commDeal(a), a.rec.comm || {}, m.comm || {});
  const paint = dl.at && dl.paint !== undefined ? num(dl.paint) : (web && num(c.price) === web.price ? web.paint : 0);
  const base = num(c.price) ? num(c.price) - paint : 0;
  const camps = hondaCamps(a), camp = camps.find(x => x.id === c.campaign_id);
  const step = c.at_step ?? '';
  const def = { margin_car: base ? Math.round(base * st.pct) : '', margin_at: step === '1' ? st.step1 : step === '2' ? st.step2 : 0, margin_honda: camp ? camp.sup : 0 };
  ['margin_car', 'margin_at', 'margin_honda'].forEach(k => { if (c[k] === undefined || c[k] === null || c[k] === '') c[k] = def[k]; });
  c.fin_amount = cash ? null : commFinAmount(c);
  const total = num(c.margin_car) + num(c.margin_at) + num(c.margin_honda);
  return { c, paint, base, st, camps, camp, total, cash };
}
function commForm(a, m, D, ro, open) {
  const { c, paint, base, st, camps, total, cash } = commView(a, m, D);
  const F2 = (k, label, extra = '') => `<div class="field"><label for="cm-${k}">${label}</label><input id="cm-${k}" type="number" min="0" inputmode="decimal" data-modal="comm.${k}" value="${esc(c[k] ?? '')}" ${ro ? 'disabled' : ''} ${extra}></div>`;
  const RO = (label, v, note) => `<div class="field"><label>${label}</label><div class="num p-2 rounded-lg" style="background:var(--surface-2)">${v === null || v === '' ? '–' : money(v)}</div>${note ? `<span class="text-xs text-muted">${note}</span>` : ''}</div>`;
  const groups = [...new Set(camps.map(x => x.group))];
  const campSel = `<div class="field sm:col-span-3"><label for="cm-camp">แคมเปญ Honda</label><select id="cm-camp" data-modal="comm.campaign_id" ${ro ? 'disabled' : ''}><option value="">เลือกแคมเปญ</option>${groups.map(g => {
    const opts = camps.filter(x => x.group === g).map(x => `<option value="${x.id}" ${c.campaign_id === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    return g ? `<optgroup label="${esc(g)}">${opts}</optgroup>` : opts; }).join('')}</select>
    ${!c.campaign_id && c.campaign ? `<span class="text-xs text-muted">ที่เคยพิมพ์ไว้: ${esc(c.campaign)}</span>` : ''}</div>
    ${c.campaign_id === 'other' ? `<div class="field sm:col-span-3"><label for="cm-ct">ชื่อแคมเปญ</label><input id="cm-ct" data-modal="comm.campaign_text" value="${esc(c.campaign_text ?? '')}" ${ro ? 'disabled' : ''} autocomplete="off"></div>` : ''}`;
  const stepSel = cash ? '' : `<div class="field"><label for="cm-step">AT แคมเปญ (ช่อง Step)</label><select id="cm-step" data-modal="comm.at_step" ${ro ? 'disabled' : ''}>
    <option value="" ${!c.at_step ? 'selected' : ''}>ไม่มี</option><option value="1" ${c.at_step === '1' ? 'selected' : ''}>Step ช่อง 1 · +${money(st.step1)}</option><option value="2" ${c.at_step === '2' ? 'selected' : ''}>Step ช่อง 2 · +${money(st.step2)}</option></select></div>`;
  return `<details class="mt-2" ${open ? 'open' : ''}><summary class="text-sm font-medium cursor-pointer">ข้อมูลสำหรับค่าคอม (กรอกหลังส่งมอบ)</summary>
    <div class="grid sm:grid-cols-3 gap-3 mt-2">${F2('price', 'ราคารถ')}${F2('discount', 'ส่วนลดราคารถ')}${cash ? '' : F2('down', 'เงินดาวน์') + F2('down_disc', 'ส่วนลดดาวน์') + RO('ยอดจัด', c.fin_amount, 'ราคารถ − ส่วนลด − ดาวน์ (คิดให้เอง)') + F2('rate', 'ดอกเบี้ย %', 'step="0.01"') + F2('term', 'จำนวนงวด')}
      ${campSel}</div>
    <div class="mt-3 p-3 rounded-lg border border-line"><div class="font-medium text-sm mb-2">Margin (แก้ตัวเลขได้)</div>
      <div class="grid sm:grid-cols-3 gap-3">
        ${F2('margin_car', `1. Margin รถ ${Math.round(st.pct * 100)}%`)}
        ${stepSel}${cash ? '' : F2('margin_at', '2. AT แคมเปญ (บาท)')}
        ${F2('margin_honda', `${cash ? '2' : '3'}. Honda แคมเปญ (บาท)`)}</div>
      <div class="text-xs text-muted mt-1">Margin รถ คิดจากราคาไม่รวมค่าสี ${base ? `${money(base)} บาท${paint ? ` (ค่าสี ${money(paint)})` : ''}` : '(ใส่ราคารถก่อน)'} · ${cash ? 'ซื้อสดไม่มี Step AT' : 'AT แคมเปญตามช่อง Step ของตาราง Margin มาตรฐาน'} · Honda แคมเปญ = ค่าช่วยเหลือการขายของทางเลือกที่เลือก</div>
      <div class="text-sm mt-2">รวม Margin <b class="num">${money(total)}</b> บาท</div></div>
    ${ro ? '' : `<button class="btn btn-ghost btn-sm mt-2" data-act="comm-save" data-id="${esc(a.id)}">บันทึกข้อมูลค่าคอม</button>`}</details>`;
}
// the record saved by "บันทึกข้อมูลค่าคอม"
function commRecord(a, D) {
  const { c, camp, total, cash } = commView(a, S.modal || {}, D);
  const o = { ...c };
  ['price', 'discount', 'down', 'down_disc', 'term', 'margin_car', 'margin_at', 'margin_honda'].forEach(k => { if (k in o && o[k] !== '' && o[k] !== null) o[k] = num(o[k]); });
  if (o.rate !== undefined && o.rate !== '' && o.rate !== null) o.rate = Number(o.rate);
  o.fin_amount = cash ? null : commFinAmount(o);
  o.campaign = camp ? (camp.id === 'other' ? String(o.campaign_text || '').trim() || 'อื่น ๆ' : (camp.group ? camp.group + ' · ' : '') + camp.name) : (o.campaign || null);
  o.margin = total;
  return o;
}
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset || !S.modal || S.modal.kind !== 'at') return;
  const k = t.dataset.modal; if (k !== 'comm.campaign_id' && k !== 'comm.at_step') return;
  const a = atById(S.modal.id); if (!a) return;
  S.modal.comm = S.modal.comm || {};
  // picking a campaign or a Step column resets that margin part to its default (it can be typed over after)
  if (k === 'comm.campaign_id') { const x = hondaCamps(a).find(y => y.id === t.value); S.modal.comm.margin_honda = x ? x.sup : 0; }
  else { const st = marginStd(a); S.modal.comm.margin_at = t.value === '1' ? st.step1 : t.value === '2' ? st.step2 : 0; }
  render();
});
