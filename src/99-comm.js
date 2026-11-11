// ---------- sale terms (24/10): price, discount, down, instalments, Honda campaign and the margin in 3 parts
// keyed on the booking form (Google Form bookings add them later), shown in the finance step, used for commission.
// Campaigns and the standard margin table come per campaign month; a booking can pick the campaign of the month it
// was booked or the month it was invoiced, within each campaign's dates (book from–to, invoice / delivery by).
// An Advance car uses the month of its Advance invoice only. A month not keyed yet falls back to the latest one, with a warning.
// The rows are built in here for now; a ref doc 'campaigns' / 'margins' (from the Google Sheet later) replaces them.
// Only function declarations here: the first render runs before this part of the file.
function campRowsBuiltIn() {
  const g = (key, group, list) => list.map(([n, name, sup]) => ({ month: '2026-10', book_from: '2026-10-01', book_to: '2026-10-31', deliver_by: '2026-11-30', key, id: key + '-' + n, group, name, sup }));
  return [...campRowsOct(g), ...campRowsNov()];
}
function campRowsOct(g) {
  return [
    ...g('cityRec', 'City ราคาแนะนำ (แคมเปญเดิม ก.ย.)', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.69% + ฟรีประกันภัย 1 ปี', 0], [2, 'ทางเลือก 2: Service e-coupon มูลค่า 6,000 บาท + ฟรีประกันภัย 1 ปี', 0], [3, 'ทางเลือก 3: ค่าช่วยเหลือการขาย 12,000 บาท + ฟรีประกันภัย 1 ปี (ไม่ร่วม Gen to Gen / Test Drive / Local Native)', 12000]]),
    ...g('cityHbRec', 'City Hatchback ราคาแนะนำ (แคมเปญเดิม ก.ย.)', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.69% + ฟรีประกันภัย 1 ปี', 0], [2, 'ทางเลือก 2: Service e-coupon มูลค่า 6,000 บาท + ฟรีประกันภัย 1 ปี', 0], [3, 'ทางเลือก 3: ค่าช่วยเหลือการขาย 12,000 บาท + ฟรีประกันภัย 1 ปี (ไม่ร่วม Gen to Gen / Test Drive / Local Native)', 12000]]),
    ...g('city', 'City ราคาปกติ (แคมเปญ ต.ค.)', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.69% + ฟรีประกันภัย 1 ปี + ค่าช่วยเหลือการขาย 20,000 บาท', 20000], [2, 'ทางเลือก 2: ดอกเบี้ยพิเศษ 1.69% + Honda Exclusive Care 3 ปี', 0], [3, 'ทางเลือก 3: ดอกเบี้ยพิเศษ 0.99% + ฟรีประกันภัย 1 ปี + ค่าช่วยเหลือการขาย 8,000 บาท', 8000], [4, 'ทางเลือก 4: ค่าช่วยเหลือการขาย 26,000 บาท + ฟรีประกันภัย 1 ปี (ซื้อสด / Standard Rate / Double Smile Plus)', 26000]]),
    ...g('cityHb', 'City Hatchback ราคาปกติ (แคมเปญ ต.ค.)', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.69% + ฟรีประกันภัย 1 ปี + ค่าช่วยเหลือการขาย 20,000 บาท', 20000], [2, 'ทางเลือก 2: ดอกเบี้ยพิเศษ 1.69% + Honda Exclusive Care 3 ปี', 0], [3, 'ทางเลือก 3: ดอกเบี้ยพิเศษ 0.99% + ฟรีประกันภัย 1 ปี + ค่าช่วยเหลือการขาย 8,000 บาท', 8000], [4, 'ทางเลือก 4: ค่าช่วยเหลือการขาย 26,000 บาท + ฟรีประกันภัย 1 ปี (ซื้อสด / Standard Rate / Double Smile Plus)', 26000]]),
    ...g('civic', 'Civic e:HEV EL+ / RS', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี', 0], [2, 'ทางเลือก 2: ดอกเบี้ยพิเศษ 0% + ฟรีประกันภัย 1 ปี + ค่าช่วยเหลือการขาย 35,000 บาท', 35000], [3, 'ทางเลือก 3: ค่าช่วยเหลือการขาย 90,000 บาท + ฟรีประกันภัย 1 ปี (ดอกเบี้ยมาตรฐาน)', 90000]]),
    ...g('civicEL', 'Civic e:HEV EL', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.89% + Honda Exclusive Care 3 ปี', 0], [2, 'ทางเลือก 2: ค่าช่วยเหลือการขาย 50,000 บาท (ดอกเบี้ยมาตรฐาน)', 50000]]),
    ...g('hrv', 'HR-V e:HEV', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี + ฟรีประกันภัยรวม 2 ปี', 0], [2, 'ทางเลือก 2: ค่าช่วยเหลือการขาย 90,000 บาท + ฟรีประกันภัย 2 ปี (ดอกเบี้ยมาตรฐาน)', 90000], [3, 'ทางเลือก 3: ค่าช่วยเหลือการขาย 140,000 บาท (ดอกเบี้ยมาตรฐาน)', 140000]]),
    ...g('accord', 'Accord e:HEV', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี', 0], [2, 'ทางเลือก 2: ค่าช่วยเหลือการขาย 110,000 บาท + ฟรีประกันภัย 1 ปี (ดอกเบี้ยมาตรฐาน)', 110000]]),
    ...g('crv', 'CR-V e:HEV', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี', 0], [2, 'ทางเลือก 2: ค่าช่วยเหลือการขาย 110,000 บาท + ฟรีประกันภัย 1 ปี (ดอกเบี้ยมาตรฐาน)', 110000]]),
    ...g('en2', 'e:N2', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + ฟรีประกันภัย 1 ปี + โฮมชาร์จเจอร์ + Ultimate Care + ค่าช่วยเหลือการขาย 200,000 บาท', 200000], [2, 'ทางเลือก 2: ค่าช่วยเหลือการขาย 330,000 บาท + Ultimate Care (ดอกเบี้ยมาตรฐาน)', 330000]]),
    ...g('step', 'STEP WGN e:HEV', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.69% + ฟรีประกันภัย 1 ปี + Ultimate Care', 0], [2, 'ทางเลือก 2: ค่าช่วยเหลือการขาย 40,000 บาท + Ultimate Care (ดอกเบี้ยมาตรฐาน)', 40000]])
  ];
}
// November – December 2026 campaign (Honda letter SP133/26): book 1 Nov – 31 Dec 2026, invoice / deliver by 31 Jan 2027 (added 2/11)
function campRowsNov() {
  const g = (key, group, list) => list.map(([n, name, sup]) => ({ month: '2026-11', book_from: '2026-11-01', book_to: '2026-12-31', deliver_by: '2027-01-31', key, id: key + '-' + n, group, name, sup }));
  const city = [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.69% + ฟรีประกันภัย 1 ปี + ค่าช่วยเหลือการขาย 20,000 บาท', 20000], [2, 'ทางเลือก 2: ดอกเบี้ยพิเศษ 1.69% + Honda Exclusive Care 3 ปี', 0], [3, 'ทางเลือก 3: ดอกเบี้ยพิเศษ 0.99% + ฟรีประกันภัย 1 ปี + ค่าช่วยเหลือการขาย 8,000 บาท', 8000], [4, 'ทางเลือก 4: ค่าช่วยเหลือการขาย 26,000 บาท + ฟรีประกันภัย 1 ปี (ซื้อสด / Standard Rate / Double Smile Plus)', 26000]];
  const rec = [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.69% + ฟรีประกันภัย 1 ปี', 0], [2, 'ทางเลือก 2: Service e-coupon มูลค่า 6,000 บาท + ฟรีประกันภัย 1 ปี', 0], [3, 'ทางเลือก 3: ค่าช่วยเหลือการขาย 12,000 บาท + ฟรีประกันภัย 1 ปี (ไม่ร่วม Gen to Gen / Test Drive / Local Native)', 12000]];
  return [
    ...g('cityRec', 'City ราคาช่วงแนะนำ (แคมเปญ พ.ย.–ธ.ค.)', rec),
    ...g('cityHbRec', 'City Hatchback ราคาช่วงแนะนำ (แคมเปญ พ.ย.–ธ.ค.)', rec),
    ...g('city', 'City ราคาปกติ (แคมเปญ พ.ย.–ธ.ค.)', city),
    ...g('cityHb', 'City Hatchback ราคาปกติ (แคมเปญ พ.ย.–ธ.ค.)', city),
    ...g('civic', 'Civic e:HEV EL+ / RS', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี', 0], [2, 'ทางเลือก 2: ดอกเบี้ยพิเศษ 0% + ฟรีประกันภัย 1 ปี + ค่าช่วยเหลือการขาย 35,000 บาท', 35000], [3, 'ทางเลือก 3: ค่าช่วยเหลือการขาย 90,000 บาท + ฟรีประกันภัย 1 ปี (ดอกเบี้ยมาตรฐาน)', 90000]]),
    ...g('civicEL', 'Civic e:HEV EL', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.89% + Honda Exclusive Care 3 ปี', 0], [2, 'ทางเลือก 2: ค่าช่วยเหลือการขาย 50,000 บาท (ดอกเบี้ยมาตรฐาน)', 50000]]),
    ...g('hrv', 'HR-V e:HEV / HuNT / EL, RS สีทูโทน', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี + ฟรีประกันภัยเพิ่ม 1 ปี (รวม 2 ปี)', 0], [2, 'ทางเลือก 2: ค่าช่วยเหลือการขาย 90,000 บาท + ฟรีประกันภัย 2 ปี (ดอกเบี้ยมาตรฐาน)', 90000], [3, 'ทางเลือก 3: ค่าช่วยเหลือการขาย 140,000 บาท (ดอกเบี้ยมาตรฐาน · เฉพาะ EL, RS สีทูโทน)', 140000]]),
    ...g('accord', 'Accord e:HEV', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี', 0], [2, 'ทางเลือก 2: ค่าช่วยเหลือการขาย 110,000 บาท + ฟรีประกันภัย 1 ปี (ดอกเบี้ยมาตรฐาน)', 110000]]),
    ...g('crv', 'CR-V e:HEV', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี', 0], [2, 'ทางเลือก 2: ดอกเบี้ยพิเศษ 0.99% + Honda Exclusive Care 5 ปี + เพิ่มฟรีค่าแรงค่าอะไหล่เช็คระยะ 2 ปี หรือ 40,000 กม.', 0], [3, 'ทางเลือก 3: ค่าช่วยเหลือการขาย 110,000 บาท + ฟรีประกันภัย 1 ปี (ดอกเบี้ยมาตรฐาน)', 110000]]),
    ...g('crvHunt', 'CR-V e:HEV HuNT', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + Honda Exclusive Care 5 ปี + ฟรีประกันภัยเพิ่ม 1 ปี (รวม 2 ปี)', 0], [2, 'ทางเลือก 2: ดอกเบี้ยพิเศษ 0.99% + Honda Exclusive Care 5 ปี + เพิ่มฟรีค่าแรงค่าอะไหล่เช็คระยะ 2 ปี หรือ 40,000 กม. + ฟรีประกันภัยเพิ่ม 1 ปี (รวม 2 ปี)', 0], [3, 'ทางเลือก 3: ค่าช่วยเหลือการขาย 110,000 บาท + ฟรีประกันภัย 2 ปี (ดอกเบี้ยมาตรฐาน)', 110000]]),
    ...g('en2', 'e:N2', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 0% + ฟรีประกันภัย 1 ปี + Ultimate Care + โฮมชาร์จเจอร์ + ค่าช่วยเหลือการขาย 200,000 บาท (ไม่ร่วม Gen to Gen / Local Native)', 200000], [2, 'ทางเลือก 2: ดอกเบี้ยพิเศษ 0% สูงสุด 84 เดือน + ฟรีประกันภัย 2 ปี + Ultimate Care + ฟรีค่าแรงและค่าอะไหล่เช็คระยะ 7 ปี หรือ 140,000 กม. + โฮมชาร์จเจอร์ (ไม่ร่วม Gen to Gen / Local Native)', 0], [3, 'ทางเลือก 3: ค่าช่วยเหลือการขาย 330,000 บาท + Ultimate Care (ดอกเบี้ยมาตรฐาน · ไม่ร่วม Gen to Gen / Local Native)', 330000]]),
    ...g('step', 'STEP WGN e:HEV', [[1, 'ทางเลือก 1: ดอกเบี้ยพิเศษ 1.69% + ฟรีประกันภัย 1 ปี + Ultimate Care (ไม่ร่วม Gen to Gen / Local Native)', 0], [2, 'ทางเลือก 2: ค่าช่วยเหลือการขาย 40,000 บาท + Ultimate Care (ดอกเบี้ยมาตรฐาน · ไม่ร่วม Gen to Gen / Local Native)', 40000]])
  ];
}
function campRows() { const d = S.ref.get('campaigns'); return d && Array.isArray(d.rows) && d.rows.length ? d.rows.filter(r => r.active !== false) : campRowsBuiltIn(); }
// standard margin table: % of the price without paint (cash / finance); AT campaign baht per Step column, finance only
function marginRowsBuiltIn() {
  const r = (mkey, cash, fin, s1, s2) => ({ month: '2026-10', mkey, cash, fin, step1: s1, step2: s2 });
  const oct = [r('accord', 0.03, 0.03, 10000, 20000), r('crv', 0.03, 0.03, 15000, 20000), r('city', 0.03, 0.03, 15000, 20000), r('cityHb', 0.03, 0.03, 15000, 20000),
    r('civic', 0.03, 0.03, 10000, 20000), r('hrv', 0.03, 0.03, 12000, 20000), r('en2', 0.03, 0.03, 15000, 20000), r('step', 0.02, 0.03, 0, 0)];
  return [...oct, ...oct.map(x => ({ ...x, month: '2026-11' }))];   // Nov–Dec: same standard margin as October until it is changed in the table
}
function marginRows() { const d = S.ref.get('margins'); return d && Array.isArray(d.rows) && d.rows.length ? d.rows.filter(r => r.active !== false) : marginRowsBuiltIn(); }
function termsModelKey(model) {
  const m = String(model || '').toUpperCase();
  return m.startsWith('CITY HATCH') ? 'cityHb' : m.startsWith('CITY') ? 'city' : m.startsWith('CIVIC') ? 'civic' : m.startsWith('HR-V') ? 'hrv' : m.startsWith('ACCORD') ? 'accord' : m.startsWith('CR-V') ? 'crv' : m.startsWith('E:N2') ? 'en2' : m.startsWith('STEP') ? 'step' : null;
}
function campKeysFor(x) {
  const k = termsModelKey(x.model), g = String(x.grade || '').toUpperCase();
  if (k === 'city') return ['city', 'cityRec'];
  if (k === 'cityHb') return ['cityHb', 'cityHbRec'];
  if (k === 'civic') return /EL\+|RS/.test(g) ? ['civic'] : /EL/.test(g) ? ['civicEL'] : ['civic', 'civicEL'];
  if (k === 'crv' && /HUNT/.test(g)) return ['crvHunt', 'crv'];
  return k ? [k] : [];
}
// the months whose campaigns this sale may use
function termsMonths(x) {
  const bm = x.bookDate ? x.bookDate.slice(0, 7) : null, im = x.inv ? x.inv.slice(0, 7) : null;
  return x.adv ? [im].filter(Boolean) : [...new Set([bm, im].filter(Boolean))];
}
// a month not keyed yet: the latest month there is (with a warning)
function termsMonthUse(rows, M) { if (rows.some(r => r.month === M)) return M; const ms = [...new Set(rows.map(r => r.month))].sort(); return ms.filter(m => m <= M).pop() || ms.pop() || null; }
// → { opts: [{value, month, name, sup, group, ok, why}], warns: [] }
function campOptions(x) {
  const keys = campKeysFor(x), out = [], warns = [];
  let all = campRows().filter(r => keys.includes(r.key));
  // CR-V HuNT has its own table from November; the months before use the CR-V table
  if (keys.includes('crvHunt')) { const hm = new Set(all.filter(r => r.key === 'crvHunt').map(r => r.month)); all = all.filter(r => r.key === 'crvHunt' || !hm.has(r.month)); }
  const bm = x.bookDate ? x.bookDate.slice(0, 7) : null, im = x.inv ? x.inv.slice(0, 7) : null;
  if (x.adv && !im) warns.push('รถ Advance ใช้แคมเปญตามเดือนใบกำกับ Advance แต่ยังไม่พบวันที่ใบกำกับ');
  termsMonths(x).forEach(M => {
    const use = termsMonthUse(all, M); if (!use) return;
    if (use !== M) warns.push(`ยังไม่มีแคมเปญเดือน ${fmtM(M)} ใน Sheet · ใช้ของเดือน ${fmtM(use)} ไปก่อน ตรวจอีกครั้ง`);
    const by = x.adv ? 'เดือนใบกำกับ Advance' : M === bm && M === im ? 'เดือนจองและเดือนใบกำกับ' : M === bm ? 'เดือนจอง' : 'เดือนใบกำกับ';
    all.filter(r => r.month === use).forEach(r => {
      let ok = true, why = '';
      // booked in this campaign's month: the invoice has to come out by the campaign's delivery date
      if (use === M && M === bm && M !== im && !x.adv) {
        if (r.book_from && x.bookDate < r.book_from || r.book_to && x.bookDate > r.book_to) { ok = false; why = `จองนอกช่วง ${fmtD(r.book_from)}–${fmtD(r.book_to)}`; }
        else if (x.inv && r.deliver_by && x.inv > r.deliver_by) { ok = false; why = `ใบกำกับ ${fmtD(x.inv)} เกินกำหนดรับรถ ${fmtD(r.deliver_by)}`; }
      }
      out.push({ value: r.month + '|' + r.id, month: r.month, name: r.name, sup: num(r.sup), grade: r.grade || '', gname: r.group || '', group: `แคมเปญ ${fmtM(r.month)} (${by}) · ${r.group}`, ok, why, deliver_by: r.deliver_by });
    });
  });
  return { opts: [...out, { value: 'pending', name: 'รอเลือกแคมเปญ (ยังไม่ตัดสินใจ)', sup: 0, group: '', ok: true }, { value: 'none', name: 'ไม่ใช้แคมเปญ Honda (ดอกเบี้ยมาตรฐาน / นอกตาราง)', sup: 0, group: '', ok: true }, { value: 'other', name: 'อื่น ๆ (พิมพ์เอง)', sup: 0, group: '', ok: true }], warns: [...new Set(warns)] };
}
// the margin table for this sale: the month of the picked campaign, else the booking (Advance: invoice) month
function marginStdFor(x, campValue) {
  const cm = /^\d{4}-\d{2}\|/.test(campValue || '') ? campValue.slice(0, 7) : null;
  const M = cm || (termsMonths(x)[0]) || todayISO().slice(0, 7);
  const mk = termsModelKey(x.model), rows = marginRows().filter(r => r.mkey === mk), use = termsMonthUse(rows, M), r = rows.find(y => y.month === use);
  const st = r ? { pct: x.cash ? num(r.cash) : num(r.fin), step1: x.cash ? 0 : num(r.step1), step2: x.cash ? 0 : num(r.step2) } : { pct: 0.03, step1: 0, step2: 0 };
  return { ...st, month: use, warn: !r ? 'ยังไม่มี Margin มาตรฐานของรุ่นนี้ ใช้ 3%' : use !== M ? `ยังไม่มี Margin มาตรฐานเดือน ${fmtM(M)} · ใช้ของเดือน ${fmtM(use)}` : '' };
}
// Honda special privileges that pay money (Margin part 4): Gen to Gen (1 car / 2+ cars), Local Native (money or
// Ultimate Care), ฮอนด้าเคียงข้างคุณ (a typed amount); the interest-rate privileges are noted only
function privRowsBuiltIn() {
  const r = (priv, mkey, a1, a2) => ({ month: '2026-10', priv, mkey, a1, a2 });
  const td = { month: '2026-11', priv: 'td', mkey: 'en2', a1: 20000, a2: 0, cond: 'ทดลองขับใน SPEAR (ที่ปรึกษาบันทึกเท่านั้น) + จอง 1–30 พ.ย. 69 + รับรถภายใน 31 ธ.ค. 69 · ชื่อผู้ทดลองขับตรงกับผู้ซื้อ · จองและรับจากผู้จำหน่ายที่ทดลองขับ · ไม่รวม Fleet/Leasing (SP133/26)' };
  return [r('gtg', 'city', 8000, 10000), r('gtg', 'cityHb', 8000, 10000), r('gtg', 'civic', 10000, 15000), r('gtg', 'hrv', 10000, 15000), r('gtg', 'accord', 25000, 30000), r('gtg', 'crv', 25000, 30000),
    ...['city', 'cityHb', 'civic', 'hrv', 'accord', 'crv', 'en2', 'step'].map(k => r('ln', k, 10000, 0))].flatMap(x => [x, { ...x, month: '2026-11' }]).concat([td]);   // Nov–Dec: same amounts (Honda letter SP133/26)
}
function privRows() { const d = S.ref.get('privileges'); return d && Array.isArray(d.rows) && d.rows.length ? d.rows.filter(r => r.active !== false) : privRowsBuiltIn(); }
function privFor(x, month) {
  const mk = termsModelKey(x.model), rows = privRows().filter(r => r.mkey === mk), req = month || (termsMonths(x)[0]) || todayISO().slice(0, 7), use = termsMonthUse(rows, req);
  // an older month than the first keyed one (the Jul-Sep campaign): the table has no amounts for it, so none are filled in (typed by hand)
  const miss = !!(use && use > req), get = k => miss ? null : rows.find(r => r.month === use && r.priv === k) || null;
  return { gtg: get('gtg'), ln: get('ln'), td: get('td'), month: use, miss, req };
}
// what the picked campaign rules out (its name says "ไม่ร่วม Gen to Gen / Local Native")
function privBlocked(camp) { const n = String(camp && camp.name || ''); const m = n.match(/ไม่ร่วม([^)]*)/); const t = m ? m[1] : ''; return { gtg: /Gen to Gen/i.test(t), ln: /Local Native/i.test(t) }; }
function privDefault(x, o, camp) {
  const pr = privFor(x, /^\d{4}-\d{2}\|/.test(o.campaign_id || '') ? o.campaign_id.slice(0, 7) : null), bl = privBlocked(camp);
  const gtg = !bl.gtg && pr.gtg ? (o.priv_gtg === '1' ? num(pr.gtg.a1) : o.priv_gtg === '2' ? num(pr.gtg.a2) : 0) : 0;
  const ln = !bl.ln && pr.ln && o.priv_ln === 'cash' ? num(pr.ln.a1) : 0;
  const td = pr.td && o.priv_td === '1' ? num(pr.td.a1) : 0;
  return { amt: gtg + ln + td + num(o.priv_hk), pr, bl };
}
function privText(o) {
  const t = [];
  if (o.priv_gtg) t.push(`Gen to Gen (${o.priv_gtg === '2' ? '2 คันขึ้นไป' : '1 คัน'})`);
  if (o.priv_ln) t.push(`Local Native (${o.priv_ln === 'care' ? 'Ultimate Care' : 'รับเงิน'})`);
  if (o.priv_td) t.push('e:N2 Test Drive (เงินสนับสนุน)');
  if (num(o.priv_hk)) t.push(`ฮอนด้าเคียงข้างคุณ ${money(o.priv_hk)}`);
  return t.join(' · ');
}
function commFinAmount(c) { const n = num(c.price) - num(c.discount) - num(c.down); return num(c.price) && n > 0 ? n : null; }
const INS_KINDS = [['', 'ไม่ระบุ'], ...INSURERS.map(x => [x, x])];
function termEmpty(v) { return v === '' || v === null || v === undefined; }
// fills the worked-out values (amount financed, default margins, total) without writing them into the draft
function termsFill(x, v, paint) {
  const o = { ...v }, { opts } = campOptions(x), camp = opts.find(y => y.value === o.campaign_id), st = marginStdFor(x, o.campaign_id);
  // ค่าประกันคุ้มครองสินเชื่อ (10/11): taken out of the down payment, it raises the amount financed (finance letter: ดาวน์สุทธิ = ดาวน์ − ประกัน, ยอดจัด = ราคา − ดาวน์สุทธิ)
  const insOff = !x.cash && o.ins_credit_by === 'down' ? num(o.ins_credit) : 0;
  o.down_net = x.cash || termEmpty(o.down) ? null : num(o.down) - insOff;
  o.fin_amount = x.cash ? null : commFinAmount({ price: o.price, discount: o.disc, down: num(o.down) - insOff });
  const base = x.mbase ? x.mbase : num(o.price) ? num(o.price) - num(o.price_add) - num(paint) : 0;
  const pv = privDefault(x, o, camp);
  const def = { margin_car: base ? Math.round(base * st.pct) : 0, margin_at: o.at_step === '1' ? st.step1 : o.at_step === '2' ? st.step2 : 0, margin_honda: camp && camp.ok ? camp.sup : 0, margin_priv: pv.amt };
  ['margin_car', 'margin_at', 'margin_honda', 'margin_priv'].forEach(k => { if (termEmpty(o[k])) o[k] = def[k]; });
  if (x.cash) { o.margin_at = 0; o.at_step = ''; }
  // ลูกค้าชำระเพิ่ม (10/11): items the customer pays for on top, each with its value, counted in the margin
  o.extra_pay = xpArr(o.extra_pay);
  o.margin_extra = o.extra_pay.reduce((n, y) => n + num(y && y.v), 0);
  o.margin = num(o.margin_car) + num(o.margin_at) + num(o.margin_honda) + num(o.margin_priv) + o.margin_extra;
  return { o, camp, st, base, def, pv };
}
// the fields: price + discount (unless the booking form has them), down / instalments, campaign, margin
// f: { attr: 'data-modal' | 'data-draft', pre, idp, ro, paint, priceDisc: bool, lockPrice, priceNote }
function termsFields(x, v, f) {
  // VAT is always the first line of ลูกค้าชำระเพิ่ม (11/11): ready to fill, left empty when there is none (only the form being keyed)
  // the list lives on the form being keyed itself (the booking form passes a copy): typed values go to the same array (12/11 fix)
  if (v && !f.ro) { const tgt = xpTarget(f) || v; tgt.extra_pay = xpArr(tgt.extra_pay); if (!tgt.extra_pay.some(xpVat)) tgt.extra_pay.unshift({ l: 'VAT', v: '' }); v.extra_pay = tgt.extra_pay; }
  const { o, st, base, pv } = termsFill(x, v, f.paint), { opts, warns } = campOptions(x), dis = f.ro ? 'disabled' : '';
  const S2 = (k, label, list) => `<div class="field"><label for="${f.idp}-${k}">${label}</label><select id="${f.idp}-${k}" ${f.attr}="${f.pre}.${k}" ${dis}>${list.map(([val, t, off]) => `<option value="${val}" ${String(o[k] || '') === val ? 'selected' : ''} ${off ? 'disabled' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
  const N = (k, label, extra = '') => `<div class="field"><label for="${f.idp}-${k}">${label}</label><input id="${f.idp}-${k}" type="number" min="0" inputmode="decimal" ${f.attr}="${f.pre}.${k}" value="${esc(o[k] ?? '')}" ${dis} ${extra}></div>`;
  const RO = (label, val, note) => `<div class="field"><label>${label}</label><div class="num p-2 rounded-lg border border-line">${val ? money(val) : '–'}</div>${note ? `<span class="text-xs text-muted">${note}</span>` : ''}</div>`;
  const g = pv.pr.gtg, ln = pv.pr.ln;
  const privBox = `<div class="mt-3 pt-3 border-t border-line"><div class="font-medium text-sm mb-2">สิทธิพิเศษ Honda</div><div class="grid sm:grid-cols-2 gap-3">
    ${S2('priv_gtg', 'Gen to Gen', [['', 'ไม่ใช้'], ...(g && !pv.bl.gtg ? [['1', `รถฮอนด้าเดิม 1 คัน · ${money(g.a1)}`], ['2', `2 คันขึ้นไป · ${money(g.a2)}`]] : [['x', pv.bl.gtg ? 'แคมเปญที่เลือกไม่ร่วม Gen to Gen' : pv.pr.miss ? `ไม่มีตารางสิทธิ์เดือน ${fmtM(pv.pr.req)} · ใส่ยอดเองในช่อง 4` : 'รุ่นนี้ไม่ร่วม Gen to Gen', true]])])}
    ${S2('priv_ln', 'Local Native', [['', 'ไม่ใช้'], ...(ln && !pv.bl.ln ? [['cash', `รับเงิน · ${money(ln.a1)}`], ['care', 'รับ Ultimate Care (ไม่เข้า Margin)']] : [['x', pv.bl.ln ? 'แคมเปญที่เลือกไม่ร่วม Local Native' : pv.pr.miss ? `ไม่มีตารางสิทธิ์เดือน ${fmtM(pv.pr.req)} · ใส่ยอดเองในช่อง 4` : 'รุ่นนี้ไม่ร่วม Local Native', true]])])}
    ${pv.pr.td ? S2('priv_td', 'e:N2 Test Drive', [['', 'ไม่ใช้'], ['1', `ทดลองขับ + จอง 1–30 พ.ย. + รับรถภายใน 31 ธ.ค. · ${money(pv.pr.td.a1)}`]]) : ''}
    ${N('priv_hk', 'ฮอนด้าเคียงข้างคุณ (บาท)', 'step="1000" placeholder="25,000–70,000"')}
    ${N('margin_priv', '4. สิทธิพิเศษ Honda (บาท)')}</div>
    <div class="text-xs text-muted mt-1">${pv.pr.miss ? `เดือน ${fmtM(pv.pr.req)} ไม่มียอดในตาราง (Gen to Gen ของแคมเปญเดือนนี้ขึ้นกับปีที่ครอบครองรถเดิม) ใส่ยอดเองในช่อง 4 และดูเงื่อนไขในเอกสารแคมเปญ` : `ยอดตามแท็บสิทธิพิเศษ Honda เดือน ${fmtM(pv.pr.month)}`} · ฮอนด้าเคียงข้างคุณใช้ร่วมกับ Gen to Gen / Local Native ไม่ได้${pv.pr.td ? '<br>e:N2 Test Drive: ต้องมีบันทึกทดลองขับใน SPEAR ชื่อตรงผู้ซื้อ และจอง/รับรถกับผู้จำหน่ายเดียวกับที่ทดลองขับ (ไม่รวม Fleet / Leasing)' : ''}</div></div>`;
  const price = f.priceDisc ? `<div class="field"><label for="${f.idp}-price" class="req">ราคารถ (ราคาเต็ม)</label><input id="${f.idp}-price" type="number" min="0" step="100" inputmode="decimal" ${f.attr}="${f.pre}.price" value="${esc(o.price ?? '')}" ${f.lockPrice || f.ro ? 'readonly style="background:var(--surface-2)"' : ''}>${f.priceNote ? `<span class="text-xs text-muted">${f.priceNote}</span>` : ''}</div>` + (f.priceAdd ? N('price_add', 'บวกราคารถ (บาท)', 'step="100" placeholder="ถ้าราคาจริงสูงกว่าราคาในเว็บ"') : '') + N('disc', 'ส่วนลดราคารถ', 'step="100"') : '';
  const fco = f.finCo ? S2('fin_co', 'บริษัทไฟแนนซ์', [['', 'เลือกบริษัทไฟแนนซ์'], ...FINANCE.map(n => [n, n])]) : '';
  const insCr = N('ins_credit', 'ค่าประกันคุ้มครองสินเชื่อ (บาท)', 'step="1"') + S2('ins_credit_by', 'ค่าประกันคุ้มครองสินเชื่อ ชำระแบบ', [['', 'ไม่มี / ยังไม่ระบุ'], ['down', 'หักจากเงินดาวน์ (ยอดจัดเพิ่ม)'], ['pay', 'ลูกค้าชำระวันรับรถ']]);
  const fin = x.cash ? '' : fco + N('down', 'เงินดาวน์', 'step="100"') + insCr + (o.ins_credit_by === 'down' && num(o.ins_credit) ? RO('เงินดาวน์สุทธิ', o.down_net, 'ดาวน์ − ค่าประกันคุ้มครองสินเชื่อ') : '') + N('down_disc', 'ส่วนลดดาวน์', 'step="100"') + RO('ยอดจัด', o.fin_amount, o.ins_credit_by === 'down' && num(o.ins_credit) ? 'ราคารถ − ส่วนลด − ดาวน์สุทธิ (คิดให้เอง)' : 'ราคารถ − ส่วนลด − ดาวน์ (คิดให้เอง)') + N('rate', 'ดอกเบี้ย (% ต่อปี)', 'step="0.01" max="30"') + `<div class="field"><label for="${f.idp}-term">จำนวนงวด (เดือน)</label><input id="${f.idp}-term" type="number" min="0" inputmode="decimal" ${f.attr}="${f.pre}.term" value="${esc(o.term ?? '')}" ${dis} step="1" max="120">
      <label class="tf-chk"><input type="checkbox" ${f.attr}="${f.pre}.adv_inst" ${o.adv_inst ? 'checked' : ''} ${dis}> ผ่อนต้นงวด (ชำระงวดแรกวันรับรถ)</label>${(() => { const mo = typeof dealMonthly === 'function' ? dealMonthly(o) : null; return mo ? `<span class="text-xs text-muted">ค่างวดโดยประมาณ ${money(mo)} บาท / เดือน</span>` : ''; })()}</div>`;
  const groups = [...new Set(opts.map(y => y.group))];
  const sel = `<div class="field sm:col-span-3"><label for="${f.idp}-camp">แคมเปญ Honda <span class="text-xs text-muted">(ยังไม่เลือกได้)</span></label><select id="${f.idp}-camp" ${f.attr}="${f.pre}.campaign_id" ${dis}><option value="">เลือกแคมเปญ</option>${groups.map(gname => {
    const os = opts.filter(y => y.group === gname).map(y => `<option value="${esc(y.value)}" ${o.campaign_id === y.value ? 'selected' : ''} ${y.ok ? '' : 'disabled'}>${esc(y.name)}${y.ok ? '' : ` · ใช้ไม่ได้: ${esc(y.why)}`}</option>`).join('');
    return gname ? `<optgroup label="${esc(gname)}">${os}</optgroup>` : os; }).join('')}</select>
    ${warns.map(w => `<span class="text-xs" style="color:var(--warn)">${esc(w)}</span>`).join('')}
    ${!x.inv && !x.adv ? '<span class="text-xs text-muted">ถ้าออกใบกำกับเดือนถัดไป จะเลือกแคมเปญของเดือนใบกำกับได้ด้วย</span>' : ''}</div>
    ${o.campaign_id === 'other' ? `<div class="field sm:col-span-3"><label for="${f.idp}-ct">ชื่อแคมเปญ</label><input id="${f.idp}-ct" ${f.attr}="${f.pre}.campaign_text" value="${esc(o.campaign_text ?? '')}" ${dis} autocomplete="off"></div>` : ''}`;
  const step = x.cash ? '' : `<div class="field"><label for="${f.idp}-step">AT แคมเปญ (ช่อง Step)</label><select id="${f.idp}-step" ${f.attr}="${f.pre}.at_step" ${dis}>
    <option value="" ${!o.at_step ? 'selected' : ''}>ไม่มี</option><option value="1" ${o.at_step === '1' ? 'selected' : ''}>Step ช่อง 1 · +${money(st.step1)}</option><option value="2" ${o.at_step === '2' ? 'selected' : ''}>Step ช่อง 2 · +${money(st.step2)}</option></select></div>`;
  const WHO = [['', 'ไม่มี'], ['AT แถม', 'AT แถม'], ['Honda แถม', 'Honda แถม'], ['ลูกค้าซื้อ', 'ลูกค้าซื้อ']], WHO_REG = WHO.filter(y => y[0] !== 'Honda แถม'), REG_TYPES = [['บุคคลธรรมดา', 'บุคคลธรรมดา'], ['นิติบุคคล', 'นิติบุคคล']];
  const insBox = `<div class="mt-3 p-3 rounded-lg border border-line"><div class="font-medium text-sm mb-2">ประกันภัยและทะเบียน (ไปขึ้นในใบสั่งแต่งรถ)</div><div class="grid grid-cols-2 gap-3">
    ${f.noIns1 ? '' : S2('ins1_by', 'ประกันภัยชั้น 1 + พ.ร.บ. ปีที่ 1', WHO) + S2('ins1_kind', 'บริษัทประกัน ปีที่ 1', INS_KINDS)}${S2('ins2_by', 'ประกันภัยชั้น 1 + พ.ร.บ. ปีที่ 2', WHO)}${S2('ins2_kind', 'บริษัทประกัน ปีที่ 2', INS_KINDS)}${S2('ins3_by', 'ประกันภัยชั้น 1 + พ.ร.บ. ปีที่ 3', WHO)}${S2('ins3_kind', 'บริษัทประกัน ปีที่ 3', INS_KINDS)}${S2('reg_by', 'ค่าจดทะเบียน', WHO_REG)}${S2('reg_type', 'ค่าจดทะเบียนของ', REG_TYPES)}</div></div>`;
  return `<div class="grid sm:grid-cols-3 gap-3 tf-grid">${price}${fin}${f.adm ? campAdminBox(f, o, v, sel, opts) : sel}</div>
    ${insBox}
    <div class="mt-3 p-3 rounded-lg border border-line" style="background:var(--surface)"><div class="font-medium text-sm mb-2">Margin (แก้ตัวเลขได้)</div>
      <div class="grid sm:grid-cols-3 gap-3">${N('margin_car', `1. Margin รถ ${Math.round(st.pct * 100)}%`)}${step}${x.cash ? '' : N('margin_at', '2. AT แคมเปญ (บาท)')}${N('margin_honda', `${x.cash ? '2' : '3'}. Honda แคมเปญ (บาท)`)}</div>
      <div class="text-xs text-muted mt-1">Margin รถ คิดจากราคารถจริง ไม่รวมค่าสี ไม่รวมบวก/ลดราคารถ ${base ? `${money(base)} บาท${f.paint ? ` (ค่าสี ${money(f.paint)})` : ''}` : '(ใส่ราคารถก่อน)'} · ตาราง Margin เดือน ${fmtM(st.month)}${x.cash ? ' · ซื้อสดไม่มี Step AT' : ''}</div>
      ${st.warn ? `<div class="text-xs" style="color:var(--warn)">${esc(st.warn)}</div>` : ''}
      ${privBox}
      <div class="mt-3 pt-3 border-t border-line"><div class="font-medium text-sm mb-2">${x.cash ? '4' : '5'}. ลูกค้าชำระเพิ่ม <span class="text-xs text-muted font-normal">(รวมใน Margin)</span></div>
        ${o.extra_pay.map((y, i) => `<div class="flex gap-2 items-end mb-2"><div class="field grow"><label for="${f.idp}-xp${i}l">รายการ</label>${xpVat(y) ? `<div class="p-2 rounded-lg border border-line" style="background:var(--surface-2)">VAT <span class="text-xs text-muted">(ไม่มีเว้นว่างได้)</span></div>` : `<input id="${f.idp}-xp${i}l" ${f.attr}="${f.pre}.extra_pay.${i}.l" value="${esc((y && y.l) || '')}" placeholder="เช่น ฟิล์มเกรดสูงกว่าแพ็กเกจ" autocomplete="off" ${dis}>`}</div>
          <div class="field w-36"><label for="${f.idp}-xp${i}v">มูลค่า (บาท)</label><input id="${f.idp}-xp${i}v" type="number" min="0" step="1" inputmode="decimal" ${f.attr}="${f.pre}.extra_pay.${i}.v" value="${esc((y && y.v) ?? '')}" ${dis}></div>
          ${f.ro || xpVat(y) ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-act="terms-xp-del" data-attr="${f.attr}" data-pre="${f.pre}" data-i="${i}" aria-label="ลบรายการ">ลบ</button>`}</div>`).join('')}
        ${f.ro ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-act="terms-xp-add" data-attr="${f.attr}" data-pre="${f.pre}">+ เพิ่มรายการ</button>`}
        ${o.margin_extra ? `<span class="text-sm ml-2">รวม <b class="num">${money(o.margin_extra)}</b> บาท</span>` : ''}</div>
      <div class="text-sm mt-2">รวม Margin <b class="num">${money(o.margin)}</b> บาท</div></div>`;
}
// what is saved: numbers, the campaign's text and month, the margin parts and total
function termsRecord(x, v, paint) {
  const { o, camp, pv } = termsFill(x, v, paint), n = k => termEmpty(o[k]) ? null : num(o[k]);
  return { price: n('price'), disc: n('disc'), down: x.cash ? null : n('down'), down_disc: x.cash ? null : n('down_disc'), fin_amount: x.cash ? null : o.fin_amount,
    fin_co: x.cash ? null : (o.fin_co || null), ins_credit: x.cash ? null : n('ins_credit'), ins_credit_by: x.cash || !num(o.ins_credit) ? null : (o.ins_credit_by || null), down_net: x.cash ? null : o.down_net,
    rate: x.cash || termEmpty(o.rate) ? null : Number(o.rate), term: x.cash || termEmpty(o.term) ? null : parseInt(o.term, 10), adv_inst: !x.cash && !!o.adv_inst,
    campaign_id: o.campaign_id || null, campaign: camp ? (camp.value === 'other' ? String(o.campaign_text || '').trim() || 'อื่น ๆ' : (camp.group ? camp.group + ' · ' : '') + camp.name) : null, campaign_text: o.campaign_id === 'other' ? String(o.campaign_text || '').trim() : null,
    camp_month: camp && camp.month ? camp.month : null, at_step: x.cash ? null : (o.at_step || null), margin_car: num(o.margin_car), margin_at: num(o.margin_at), margin_honda: num(o.margin_honda), margin: o.margin, paint: num(paint),
    priv_gtg: pv.bl.gtg ? null : (o.priv_gtg || null), priv_ln: pv.bl.ln ? null : (o.priv_ln || null), priv_td: o.priv_td && pv.pr.td ? o.priv_td : null, priv_hk: n('priv_hk'), margin_priv: num(o.margin_priv), privileges: privText({ ...o, priv_td: pv.pr.td ? o.priv_td : '' }) || null,
    extra_pay: o.extra_pay.filter(y => y && (num(y.v) || (String(y.l || '').trim() && !xpVat(y)))).map(y => ({ l: String(y.l || '').trim(), v: num(y.v) })), margin_extra: o.margin_extra,
    ins1_by: o.ins1_by || null, ins1_kind: o.ins1_kind || null, ins2_by: o.ins2_by || null, ins3_by: o.ins3_by || null, ins2_kind: o.ins2_kind || null, ins3_kind: o.ins3_kind || null, reg_by: o.reg_by || null, reg_type: o.reg_type || (o.reg_by ? 'บุคคลธรรมดา' : null) };
}
function termsCheck(x, v) {
  if (termEmpty(v.price) || !num(v.price)) return { err: 'ใส่ราคารถ', id: 'price' };
  if (num(v.disc) > num(v.price)) return { err: 'ส่วนลดมากกว่าราคารถ', id: 'disc' };
  if (!x.cash) {
    if (termEmpty(v.down)) return { err: 'ใส่เงินดาวน์', id: 'down' };
    if (num(v.down_disc) > num(v.down)) return { err: 'ส่วนลดดาวน์มากกว่าเงินดาวน์', id: 'down_disc' };
    if (num(v.ins_credit) && !v.ins_credit_by) return { err: 'เลือกว่าค่าประกันคุ้มครองสินเชื่อ หักจากเงินดาวน์ หรือชำระวันรับรถ', id: 'ins_credit_by' };
    if (v.ins_credit_by === 'down' && num(v.ins_credit) > num(v.down)) return { err: 'ค่าประกันคุ้มครองสินเชื่อมากกว่าเงินดาวน์', id: 'ins_credit' };
    if (termEmpty(v.rate) || !(Number(v.rate) >= 0) || Number(v.rate) > 30) return { err: 'ใส่ดอกเบี้ย (0–30%)', id: 'rate' };
    const t = Number(v.term); if (!(t >= 1 && t <= 120 && t === Math.round(t))) return { err: 'ใส่จำนวนงวด 1–120 เดือน', id: 'term' };
  }
  if (xpArr(v.extra_pay).some(y => y && num(y.v) && !String(y.l || '').trim())) return { err: 'ลูกค้าชำระเพิ่ม: ใส่ชื่อรายการ', id: 'xp0l' };
  if (num(v.priv_hk) && (num(v.priv_hk) < 25000 || num(v.priv_hk) > 70000)) return { err: 'ฮอนด้าเคียงข้างคุณ 25,000–70,000 บาท', id: 'priv_hk' };
  if (num(v.priv_hk) && (v.priv_gtg || v.priv_ln)) return { err: 'ฮอนด้าเคียงข้างคุณ ใช้ร่วมกับ Gen to Gen / Local Native ไม่ได้', id: 'priv_hk' };
  // not chosen yet is allowed (ตกลง 30/10): it is kept as "รอเลือกแคมเปญ" and the admin picks it later
  if (!v.campaign_id) v.campaign_id = 'pending';
  if (v.campaign_id === 'other' && !String(v.campaign_text || '').trim()) return { err: 'พิมพ์ชื่อแคมเปญ', id: 'ct' };
  const c = campOptions(x).opts.find(y => y.value === v.campaign_id);
  if (!c) return { err: 'แคมเปญที่เลือกไว้ไม่อยู่ในเดือนที่ใช้ได้แล้ว เลือกใหม่', id: 'camp' };
  if (!c.ok) return { err: `แคมเปญนี้ใช้ไม่ได้: ${c.why}`, id: 'camp' };
  return {};
}
// the sale on a booking: model, cash/finance, booking date, the invoice (or the Advance invoice) of its car
function termsCtxAt(a, D) {
  const vin = atVin(a), adv = vin ? advRec(vin) : null, inv = adv ? adv.idate : (vin && D.invByVin.get(vin) && D.invByVin.get(vin).idate) || (a.rec.inv_man && a.rec.inv_man.idate) || null;
  // the margin on the car is worked out on the real car price (web price list, no paint): never on a price added to or cut (10/11)
  const web = typeof dealWeb === 'function' ? dealWeb(a, D) : null;
  return { model: a.model, grade: a.grade, color: a.color, cash: isCash(a.rec), bookDate: a.date || a.rec.booking_date || null, inv: inv || null, adv: !!adv, mbase: web && web.base > 0 ? web.base : null };
}
// ---- the booking form: the same fields, price from the price list and the discount from the booking's own field
function bookTermsCtx(d) { return { model: d.model, grade: d.grade, color: d.color, cash: d.purchase === 'ซื้อสด', bookDate: d.booking_date || todayISO(), inv: null, adv: false }; }
function bookTermsPrice(d) { const p = d.model && d.grade && d.color ? priceOf(d.model, d.grade, d.color, bookYear(d.model)) : null; return p && p.exact ? { price: p.price, paint: p.extra > 0 && p.extra < p.price ? p.extra : 0 } : null; }
function bookTermsBox(d) {
  if (!d.model || !d.grade || !d.color) return `<fieldset class="p-4 rounded-lg border border-line"><legend class="font-head font-semibold px-1">เงื่อนไขการขาย</legend><p class="text-sm text-muted">เลือกรุ่น เกรด สี ก่อน แล้วจะเลือกดาวน์ ผ่อน แคมเปญ และ Margin ได้</p></fieldset>`;
  d.deal = d.deal || {};
  const x = bookTermsCtx(d), p = bookTermsPrice(d);
  const v = bookTermsV(d, x, p);
  return `<fieldset class="p-4 rounded-lg border border-line"><legend class="font-head font-semibold px-1">เงื่อนไขการขาย (${x.cash ? 'ซื้อสด' : 'ไฟแนนซ์'})</legend>
    <p class="text-sm text-muted mb-2">ส่วนลดไม่มีเว้นว่างได้ · หลังบันทึก เซลล์ขอแก้ได้อีก 1 ครั้งตอนไฟแนนซ์ผ่าน (แอดมินอนุมัติ)</p>
    <div class="grid sm:grid-cols-3 gap-3 mb-3">
      ${p ? `<div class="field"><label>ราคารถ (ราคาเต็ม)</label><div class="num p-2 rounded-lg border border-line" style="background:var(--surface-2)">${money(p.price)}</div><span class="text-xs text-muted">ตามใบราคาในเว็บ${p.paint ? ` · รวมค่าสี ${money(p.paint)}` : ''}</span></div>`
        : `<div class="field"><label for="bt-price" class="req">ราคารถ (ราคาเต็ม)</label><input id="bt-price" type="number" min="0" step="100" inputmode="decimal" data-draft="booking.deal.price" value="${esc(d.deal.price ?? '')}"><span class="text-xs" style="color:var(--warn)">ยังไม่มีราคาสีนี้ในเว็บ ใส่เอง</span></div>`}
      <div class="field"><label for="b-discount">${x.cash ? 'ส่วนลดราคารถ (บาท)' : 'ส่วนลด (บาท) · ไฟแนนซ์ลงเป็นส่วนลดดาวน์'}</label><input id="b-discount" type="number" min="0" step="100" inputmode="numeric" data-draft="booking.discount" value="${esc(d.discount ?? '')}" placeholder="ไม่มีเว้นว่าง"></div></div>
    ${termsFields(x, v, { attr: 'data-draft', pre: 'booking.deal', idp: 'bt', paint: p ? p.paint : 0, priceDisc: false, noIns1: true })}</fieldset>`;
}
function bookTermsMissing(d) {
  if (!d.model || !d.grade || !d.color) return null;
  const x = bookTermsCtx(d), p = bookTermsPrice(d), v = bookTermsV(d, x, p);
  return termsCheck(x, v).err || null;
}
function bookTermsRec(d) {
  if (!d.model || !d.grade || !d.color) return null;
  const x = bookTermsCtx(d), p = bookTermsPrice(d), v = bookTermsV(d, x, p);
  return { ...termsRecord(x, v, p ? p.paint : 0), price_src: p ? 'ใบราคาในเว็บ' : 'ใส่เอง', cash: x.cash, ...actor(), first: actor(), hist: [], src: 'ใบจอง' };
}
// ---- after delivery: the commission data is the sale terms (changed in the finance step), shown here
function commForm(a, m, D) {
  const d = a.rec.deal, cm = a.rec.comm || {};
  if (!(d && d.at)) return `<div class="mt-2 p-3 rounded-lg text-sm" style="background:var(--warn-soft)">ยังไม่ได้ใส่เงื่อนไขการขาย (ราคา ดาวน์ ผ่อน แคมเปญ Margin) · ใส่ที่ขั้น "ไฟแนนซ์ผ่าน" ด้านบน ใช้ทำค่าคอม${cm.price ? ` · มีข้อมูลค่าคอมเดิม ราคา ${money(cm.price)}${cm.margin ? ` Margin ${money(cm.margin)}` : ''}` : ''}</div>`;
  return `<div class="mt-2 p-3 rounded-lg border border-line text-sm"><b>ข้อมูลค่าคอม</b> ใช้เงื่อนไขการขายในขั้นไฟแนนซ์ · ${esc(d.campaign || 'ไม่ได้เลือกแคมเปญ')}
    ${d.privileges ? `<div class="mt-1">สิทธิพิเศษ: ${esc(d.privileges)}</div>` : ''}
    <div class="mt-1">Margin รถ ${money(d.margin_car)} + AT แคมเปญ ${money(d.margin_at)} + Honda แคมเปญ ${money(d.margin_honda)} + สิทธิพิเศษ ${money(d.margin_priv)}${num(d.margin_extra) ? ` + ลูกค้าชำระเพิ่ม ${money(d.margin_extra)}` : ''} = <b class="num">${money(d.margin)}</b> บาท</div></div>`;
}
// picking a campaign or a Step column puts that margin part back to its default (it can be typed over after);
// on 'input', because the page redraws on a select's input and its 'change' then never reaches the document
document.addEventListener('input', ev => {
  const t = ev.target; if (!t || !t.dataset || t.tagName !== 'SELECT') return;
  const m = (t.dataset.modal || t.dataset.draft || '').match(/^(deal|booking\.deal)\.(campaign_id|at_step|priv_gtg|priv_ln|priv_td)$/); if (!m) return;
  const tgt = m[1] === 'deal' ? (S.modal && S.modal.deal) : (S.draft.booking && S.draft.booking.deal); if (!tgt) return;
  if (m[2] === 'campaign_id') { tgt.margin_honda = ''; tgt.margin_priv = ''; } else if (m[2] === 'at_step') tgt.margin_at = ''; else tgt.margin_priv = '';
  render();
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset) return;
  const k = t.dataset.modal || t.dataset.draft || '';
  if (k === 'booking.discount' && S.draft.booking && S.draft.booking.model) { softRender(); return; } const m = k.match(/^(deal|booking\.deal)\.(campaign_id|at_step|purchase_to|price_add|price|disc|down|down_disc|rate|term|margin_car|margin_at|margin_honda|margin_priv|priv_hk|campaign_text)$/);
  if (!m) return;
  const tgt = m[1] === 'deal' ? (S.modal && S.modal.deal) : (S.draft.booking && S.draft.booking.deal);
  if (!tgt) return;
  // a select redraws now; a typed number redraws after the focus has moved on (softRender keeps it there)
  if (m[2] === 'priv_hk') { tgt.margin_priv = ''; softRender(); return; }
  if (t.tagName === 'SELECT') render(); else if (m[1] === 'booking.deal') softRender();
});

// ---------- campaign: the sales' part and the admin's part (ขอ 26/10)
// The sales pick a campaign when they key the terms (kept as sales_camp_id). The branch admin / manager then decides the campaign
// that counts: the same as the sales (copied), their own pick, or an uploaded campaign sheet / photo that is matched to the list.
function campFull(y) { return y ? (y.group ? y.group + ' · ' : '') + y.name : ''; }
function campAdminBox(f, o, v, sel, opts) {
  const mode = v.adm_mode || 'own', id = (S.modal && S.modal.id) || (S.modal && S.modal.at && S.modal.at.id) || '';
  const sc = v.sales_camp_id ? opts.find(y => y.value === v.sales_camp_id) : null, scName = v.sales_camp || campFull(sc);
  const seg = (k, label) => `<button type="button" class="btn btn-sm ${mode === k ? 'btn-dark' : 'btn-ghost'}" data-act="camp-mode" data-mode="${k}">${label}</button>`;
  const cur = opts.find(y => y.value === o.campaign_id), cm = S.modal && S.modal.campMatch;
  const upload = mode !== 'upload' ? '' : `<div class="mt-2 p-3 rounded-lg border border-line" style="background:var(--surface)">
      <label class="btn btn-ghost btn-sm relative">${cm && cm.busy ? '<span class="spin"></span> กำลังอ่านไฟล์…' : 'เลือกไฟล์แคมเปญ (รูป / Excel / CSV)'}<input type="file" accept="image/*,.xlsx,.xls,.csv" data-camp-up class="absolute w-px h-px opacity-0"></label>
      ${cm && !cm.busy ? `<div class="text-sm mt-2">ไฟล์ <b>${esc(cm.file)}</b> · ${cm.found.length ? 'ระบบเทียบกับแคมเปญของเดือนนี้ พบที่น่าจะตรง ให้เลือกยืนยัน:' : esc(cm.note || 'ไม่พบแคมเปญที่ตรง เลือกเองจากรายการได้')}</div>
        <div class="flex flex-col gap-2 mt-2">${cm.found.map(h => `<div class="p-2 rounded-lg border border-line flex flex-wrap items-center gap-2"><div class="flex-1 min-w-[200px] text-sm"><b>${esc(campFull(h.opt))}</b><div class="text-xs text-muted">${esc(h.why)}</div></div>${chip(h.pct + '% ตรง', h.pct >= 80 ? 'good' : 'warn')}<button type="button" class="btn btn-dark btn-sm" data-act="camp-use" data-cid="${esc(h.opt.value)}">ใช้ตัวนี้</button></div>`).join('')}</div>` : '<div class="text-xs text-muted mt-2">ระบบอ่านชื่อ ดอกเบี้ย และค่าช่วยเหลือในไฟล์ แล้วเทียบกับรายการแคมเปญ ตรวจก่อนกดใช้ ไม่เก็บไฟล์ในใบจอง</div>'}
    </div>`;
  return `<div class="sm:col-span-3 p-3 rounded-lg border border-line" style="background:var(--surface)">
    <div class="font-medium text-sm mb-1">แคมเปญ Honda</div>
    ${typeof campFileBox === 'function' ? campFileBox(opts, v) : ''}
    <div class="text-sm mb-2">เซลล์เลือก: ${scName ? `<b>${esc(scName)}</b>` : '<span class="text-muted">เซลล์ยังไม่ได้เลือก</span>'}</div>
    <div class="flex flex-wrap gap-2" role="group" aria-label="แอดมินเลือกแคมเปญ">${seg('same', 'เลือกเหมือนเซลล์ (copy)')}${seg('own', 'เลือกเอง')}</div>
    ${mode === 'same' ? `<div class="mt-2 text-sm">${scName ? `ใช้แคมเปญเดียวกับเซลล์: <b>${esc(campFull(cur) || scName)}</b>` : 'เซลล์ยังไม่ได้เลือกแคมเปญ ให้เลือกเองหรืออัปโหลด'}</div>` : `<div class="mt-2">${sel}</div>${mode === 'upload' ? '' : '<div class="text-xs text-muted mt-1">อัปโหลดไฟล์แคมเปญเพื่อเทียบ ทำที่หน้า เพิ่มเติม › อัปเดตแคมเปญ</div>'}`}
    ${scName && cur && o.campaign_id !== v.sales_camp_id ? `<div class="text-xs mt-2" style="color:var(--warn)">ต่างจากที่เซลล์เลือก · ระบบบันทึกทั้งสองไว้</div>` : ''}</div>`;
}
// score each campaign against the text of a file: how many of its parts (interest, free insurance, support baht ...) appear
function campMatchText(opts, text) {
  const t = String(text || '').replace(/[\s,]/g, '').toLowerCase(), out = [];
  for (const y of opts) {
    const parts = String(y.name).replace(/^ทางเลือก ?\d+ ?:/, '').split('+').map(p => p.replace(/[\s,]/g, '').toLowerCase()).filter(Boolean);
    const hit = parts.filter(p => t.includes(p));
    if (hit.length) out.push({ opt: y, pct: Math.round(hit.length / parts.length * 100), why: `พบในไฟล์: ${hit.length} จาก ${parts.length} ส่วน` });
  }
  return out.sort((a, b) => b.pct - a.pct).slice(0, 3);
}
async function campUpload(file) {
  const m = S.modal, a = atById(m.id || (m.at && m.at.id)); if (!m || !a) return;
  const x = termsCtxAt(a, derive()), opts = campOptions(x).opts.filter(y => y.ok && y.value !== 'other');
  m.campMatch = { busy: true, file: file.name, found: [] }; render();
  try {
    let found = [], note = '';
    if (/^image\//.test(file.type)) {
      const res = await aiRead(`This photo or screenshot shows a Honda sales campaign for a Honda dealer in Thailand. Match it to ONE to THREE of these campaign options (id: text):\n${opts.map(y => `${y.value}: ${campFull(y)}`).join('\n')}\nReturn JSON only: {"matches":[{"id":"option id","percent":0-100,"why":"short reason in Thai"}]}. Return an empty list when none fits. Do not guess.`, [await shrink(file)]);
      found = (res && res.matches || []).map(h => ({ opt: opts.find(y => y.value === h.id), pct: Math.round(Number(h.percent) || 0), why: h.why || 'AI อ่านจากรูป' })).filter(h => h.opt);
    } else {
      const X = await loadXLSX(), wb = /\.(csv|txt)$/i.test(file.name) ? X.read(await file.text(), { type: 'string' }) : X.read(await file.arrayBuffer(), { type: 'array' });
      const text = wb.SheetNames.map(n => X.utils.sheet_to_csv(wb.Sheets[n])).join(' ');
      found = campMatchText(opts, text);
    }
    if (!found.length) note = 'ไม่พบแคมเปญที่ตรงกับไฟล์นี้ เลือกเองจากรายการได้';
    if (S.modal === m) { m.campMatch = { file: file.name, found, note }; render(); }
  } catch (e) { if (S.modal === m) { m.campMatch = { file: file.name, found: [], note: 'อ่านไฟล์ไม่ได้ ลองไฟล์อื่นหรือเลือกเอง' }; render(); } }
}
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset || t.dataset.campUp === undefined) return;
  const f = t.files && t.files[0]; t.value = ''; if (f) campUpload(f);
});
Object.assign(ACTIONS, {
  'camp-mode'(el) {
    const d = S.modal && S.modal.deal; if (!d) return;
    d.adm_mode = el.dataset.mode;
    if (d.adm_mode === 'same' && d.sales_camp_id && d.campaign_id !== d.sales_camp_id) { d.campaign_id = d.sales_camp_id; d.margin_honda = ''; d.margin_priv = ''; }
    render();
  },
  'camp-use'(el) { const d = S.modal && S.modal.deal; if (!d) return; d.campaign_id = el.dataset.cid; d.margin_honda = ''; d.margin_priv = ''; d.adm_mode = 'own'; d.adm_file = (S.modal.campMatch || {}).file || null; render(); }
});

Object.assign(ACTIONS, {
  'terms-xp-add'(el) { const root = el.dataset.attr === 'data-modal' ? S.modal : S.draft; if (!root) return; const k = el.dataset.pre + '.extra_pay';
    let o = root; for (const p of k.split('.').slice(0, -1)) { if (!o[p]) o[p] = {}; o = o[p]; } o.extra_pay = xpArr(o.extra_pay); o.extra_pay.push({ l: '', v: '' }); render(); },
  'terms-xp-del'(el) { const root = el.dataset.attr === 'data-modal' ? S.modal : S.draft; if (!root) return;
    let o = root; for (const p of el.dataset.pre.split('.')) { if (!o[p]) return; o = o[p]; } if (Array.isArray(o.extra_pay)) o.extra_pay.splice(Number(el.dataset.i), 1); render(); }
});

function xpVat(y) { return !!y && /^\s*(vat|แวต|ภาษีมูลค่าเพิ่ม)\s*$/i.test(String(y.l || '')); }

// the booking form's discount (11/11): cash = discount on the car price · finance = the down-payment discount first
function bookTermsV(d, x, p) {
  const dl = d.deal || {}, fin = !x.cash;
  return { ...dl, price: p ? p.price : dl.price, disc: fin ? (dl.disc ?? '') : d.discount, down_disc: fin && termEmpty(dl.down_disc) ? (d.discount ?? '') : dl.down_disc, ins1_by: d.insurance, ins1_kind: d.insurance_kind };
}

// extra_pay as an array, also when a typed value made it an object ({0: {...}}) (12/11)
function xpArr(x) { return Array.isArray(x) ? x : x && typeof x === 'object' ? Object.keys(x).filter(k => /^\d+$/.test(k)).sort((a, b) => a - b).map(k => x[k]) : []; }
function xpTarget(f) {
  let o = f.attr === 'data-modal' ? S.modal : f.attr === 'data-draft' ? S.draft : null; if (!o) return null;
  for (const k of String(f.pre || '').split('.').filter(Boolean)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
  return o;
}
