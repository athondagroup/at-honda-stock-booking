// ------------------------------------------------------------------ car prices and the accounts tab (ตกลง 14/10)
// Prices come from Honda's price list PDF (หลังบ้าน → รุ่น เกรด สี → เลือกไฟล์ PDF, or paste its text as before).
// Only the Retail Price incl. VAT is stored, per model + grade + colour + model year; everyone can see it, sales included.
// A booking keeps the price it was booked at (list_price); older bookings use the price list for the car's model year.
// Next step (not built yet): the cost of each FOC item, so the tab can show discount + freebies per car.
// Only function declarations here: the first render runs before this part of the file.
function catPrices() { return (S.ref.get('catalog') || {}).prices || []; }
function catIssue() { return (S.ref.get('catalog') || {}).price_issue || null; }
// grades on old bookings are sometimes written differently from the price list ("S+" vs "S")
function gradeLoose(g) { return String(g || '').replace(/\s+/g, '').replace(/\+$/, '').toUpperCase(); }
var PRICE_MEMO = null;
function priceGroups() {
  const list = catPrices(); if (PRICE_MEMO && PRICE_MEMO.src === list) return PRICE_MEMO.by;
  const by = new Map();
  list.forEach(p => { const k = p.model + '|' + gradeLoose(p.grade); if (!by.has(k)) by.set(k, []); by.get(k).push(p); });
  PRICE_MEMO = { src: list, by }; return by;
}
// → {price, base, extra, exact, year, qd, old} or null when the price list has no such model and grade
// tier 'cur' = current price; 'old' = ราคาเดิม (before the campaign adjustment), for cars IDS marks "ราคาเดิม".
// Prices saved before 14/10 have no tier: they count as current.
function priceTier(p) { return p.tier === 'old' ? 'old' : 'cur'; }
function priceOf(model, grade, color, year, old) {
  if (!model || !grade) return null;
  const all = priceGroups().get(model + '|' + gradeLoose(grade)); if (!all || !all.length) return null;
  const years = [...new Set(all.map(p => p.year || 0))].sort((a, b) => b - a);
  const y = year && years.includes(Number(year)) ? Number(year) : years[0];
  const inY = all.filter(p => (p.year || 0) === y), oldList = inY.filter(p => priceTier(p) === 'old'), curList = inY.filter(p => priceTier(p) === 'cur');
  const pick = (list, c) => { if (!list.length) return null; const base = Math.min(...list.map(p => p.price)), hit = c && list.find(p => p.color === String(c).toUpperCase()); return { price: hit ? hit.price : base, base, extra: hit ? hit.price - base : 0, exact: !!hit, qd: (hit || list[0]).qd || null }; };
  const cur = pick(curList.length ? curList : oldList, color), op = pick(oldList, color);
  const main = old && op ? op : cur;
  return { ...main, year: y || null, isOld: !!(old && op), old: op ? op.price : null, cur: cur ? cur.price : null };
}
// a car in stock whose IDS model name says "ราคาเดิม" sells at the price before the adjustment
function carOldPrice(car) { return !!(car && /ราคาเดิม/.test(String(car.note || ''))); }
function priceText(p) { return p ? `${money(p.price)} บาท${p.isOld ? ' (ราคาเดิม)' : ''}${p.extra ? ` (สีนี้ +${money(p.extra)})` : ''}${p.exact ? '' : ' · ไม่มีราคาสีนี้ ใช้ราคาเริ่มต้นของเกรด'}${!p.isOld && p.old && p.old !== p.price ? ` · รถที่ IDS ระบุ "ราคาเดิม" ${money(p.old)} บาท` : ''}` : ''; }
// the price of one booking: what it was booked at, else the price list for the allocated car's model year (else the newest year)
function bookPrice(a, D) {
  const r = a.rec || {};
  const v = atVin(a), car = v && D && (D.cars.get(v) || (typeof carAny === 'function' ? carAny(v, D) : null));
  // the allocated car is a "ราคาเดิม" car: its old price, whatever was snapshotted at booking time
  if (carOldPrice(car) || r.price_old) { const p = priceOf(a.model, a.grade, a.color, (car && car.year) || r.list_price_year || null, true); if (p && p.isOld) return { price: p.price, src: 'ราคาเดิม (รถคันนี้)', exact: p.exact }; }
  if (r.list_price) return { price: Number(r.list_price), src: 'ราคาตอนจอง' };
  const p = priceOf(a.model, a.grade, a.color, (car && car.year) || null);
  return p ? { price: p.price, src: car && car.year ? `ใบราคา MY'${String(p.year).slice(-2)}` : 'ใบราคาปัจจุบัน', exact: p.exact } : null;
}
function bookYear(model) { return (typeof MODEL_YEAR === 'object' && MODEL_YEAR[model]) || catYearOf(model) || null; }
// the booking form: the price of the picked car and, once a discount is typed, the price after it
function bookFormPrice(d) {
  if (!d.model || !d.grade || !catPrices().length) return '<div id="bk-price" hidden></div>';
  const p = priceOf(d.model, d.grade, d.color, bookYear(d.model)), box = body => `<div id="bk-price" class="sm:col-span-2 lg:col-span-3 text-sm p-2 px-3 rounded-lg" style="background:var(--surface-2)" aria-live="polite">${body}</div>`;
  if (!p) return box('<span class="text-muted">ยังไม่มีราคารุ่น/เกรดนี้ในใบราคา</span>');
  if (!d.color) return box(`ราคารถ${p.year ? ` MY'${String(p.year).slice(-2)}` : ''} เริ่มต้น <b class="num">${money(p.base)}</b> บาท · เลือกสีแล้วจะเห็นราคาตามสี`);
  const disc = d.discount === '' || d.discount === null || d.discount === undefined ? null : Number(d.discount);
  return box(`ราคารถ${p.year ? ` MY'${String(p.year).slice(-2)}` : ''} <b class="num">${priceText(p)}</b>${disc !== null && !isNaN(disc) && p.price ? ` · หลังส่วนลด <b class="num">${money(p.price - disc)}</b> บาท (ลด ${pct1(disc / p.price * 100)})${disc / p.price * 100 > acctOddPct() ? ' <b style="color:var(--bad)">ส่วนลดสูงผิดปกติ ตรวจตัวเลข</b>' : ''}` : ''}`);
}
// typing the discount updates the price box only (the form is not redrawn while typing)
document.addEventListener('input', ev => {
  const t = ev.target; if (!t || t.id !== 'b-discount' || !S.draft || !S.draft.booking) return;
  const el = document.getElementById('bk-price'); if (el) el.outerHTML = bookFormPrice({ ...S.draft.booking, discount: t.value });
});
// kept on a new booking so a later price list does not change what it was booked at
function bookPriceSnap(d) { const p = priceOf(d.model, d.grade, d.color, bookYear(d.model)); return p && p.exact ? { list_price: p.price, list_price_year: p.year, list_price_qd: p.qd } : {}; }
function bookPriceLine(a, D) {
  const p = bookPrice(a, D); if (!p) return null;
  const d = bookDiscount(a);
  return `${money(p.price)} บาท (${p.src})${d !== null && p.price ? ` · หลังส่วนลด ${money(p.price - d)} (ลด ${pct1(d / p.price * 100)})` : ''}`;
}
function bookDiscount(a) { const c = (a.rec && a.rec.comm) || {}; const v = c.discount ?? (a.rec && a.rec.discount); return v === null || v === undefined || v === '' ? null : Number(v); }

// ---- reading the PDF in the browser (pdf.js, loaded from jsdelivr only when a file is picked)
// The legacy build also runs on older iPhones. The worker is imported onto the page itself, so pdf.js needs no
// separate worker file from another site (that also works inside claude.ai).
var PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/';
var pdfLoading = null;
function loadPdfJs() {
  if (pdfLoading) return pdfLoading;
  pdfLoading = (async () => {
    const lib = await import(PDFJS_URL + 'pdf.min.mjs');
    if (!globalThis.pdfjsWorker) globalThis.pdfjsWorker = await import(PDFJS_URL + 'pdf.worker.min.mjs');
    lib.GlobalWorkerOptions.workerSrc = PDFJS_URL + 'pdf.worker.min.mjs';
    return lib;
  })().catch(e => { pdfLoading = null; throw e; });
  return pdfLoading;
}
// the text of every page, one line per row of the table (items on the same height joined left to right)
async function pdfText(file) {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n), tc = await page.getTextContent(), rows = [];
    tc.items.forEach(it => { if (!it.str || !it.str.trim()) return; const y = it.transform[5], x = it.transform[4]; let r = rows.find(r => Math.abs(r.y - y) < 3); if (!r) rows.push(r = { y, items: [] }); r.items.push({ x, s: it.str }); });
    rows.sort((a, b) => b.y - a.y).forEach(r => out.push(r.items.sort((a, b) => a.x - b.x).map(i => i.s).join(' ')));
  }
  return out.join('\n');
}
document.addEventListener('change', async ev => {
  const t = ev.target; if (!t || !t.dataset || t.dataset.catPdf === undefined) return;
  const f = t.files && t.files[0]; t.value = ''; if (!f) return;
  S.adCat = { ...(S.adCat || {}), busy: `กำลังอ่าน ${f.name}`, file: f.name, parsed: null }; render();
  try {
    const text = await pdfText(f), P = catParseFull(text);
    S.adCat = { ...(S.adCat || {}), busy: null, text: '', parsed: P.rows, prices: P.prices, issue: P.issue };
  } catch (e) { S.adCat = { ...(S.adCat || {}), busy: null, parsed: [], prices: [], pdfErr: 'เปิดไฟล์ PDF ไม่ได้ ลองใหม่ หรือเปิด PDF แล้ว Ctrl+A, Ctrl+C วางในช่องข้อความแทน' }; }
  render();
});
// a new price list replaces the prices of the same model + grade + colour + year; other years stay
function priceMerge(cur, add) {
  const k = p => [p.model, p.grade, p.year || '', p.color, priceTier(p)].join('|'), m = new Map((cur || []).map(p => [k(p), p]));
  let changed = 0; add.forEach(p => { const o = m.get(k(p)); if (!o || o.price !== p.price) changed++; m.set(k(p), p); });
  // a new list that has no "ราคาเดิม" for a colour drops an old one kept from before
  const curKeys = new Set(add.filter(p => priceTier(p) === 'cur').map(p => [p.model, p.grade, p.year || '', p.color].join('|')));
  const hasOld = new Set(add.filter(p => priceTier(p) === 'old').map(p => [p.model, p.grade, p.year || '', p.color].join('|')));
  [...m.entries()].forEach(([kk, p]) => { const base = [p.model, p.grade, p.year || '', p.color].join('|'); if (priceTier(p) === 'old' && curKeys.has(base) && !hasOld.has(base)) m.delete(kk); });
  return { list: [...m.values()], changed };
}

// ---- the accounts tab: list price, the discount the sales gave, FOC, per booking / sales / model
function acctRows(D, E) {
  // by TAX INVOICE (27/10): the cars invoiced in the period (DL file, not company cars, a re-issued invoice once = the newest), branch = the
  // branch that issued the invoice; joined by frame number with the booking for the sales' discount and FOC and the campaign money
  const advs = new Map(); for (const [vin] of S.vehicles) { const a = advRec(vin); if (a) advs.set(vin, a); }
  const pay = (S.ref.get('honda_pay') || {}), picks = pay.picks || {}, pv = pay.v || {};
  return D.X.inv.filter(i => !i.company && i.idate && i.idate >= E.from && i.idate <= E.to && inBr(i) && !(i.vin && advs.has(i.vin)) && !(i.vin && D.invByVin.get(i.vin) !== i)).map(i => {
    const a = i.vin ? carBookingOf(i.vin, D) : null, deal = a && a.rec && a.rec.deal, vin = String(i.vin || '').toUpperCase();
    const p = a ? bookPrice(a, D) : (priceOf(i.model, i.grade, i.color, null) ? { ...priceOf(i.model, i.grade, i.color, null), src: 'ใบราคาปัจจุบัน' } : null);
    const disc = a ? bookDiscount(a) : null, foc = a && !(a.rec.foc_total === null || a.rec.foc_total === undefined || a.rec.foc_total === '') ? Number(a.rec.foc_total) : null;
    const real = deal && deal.at && deal.campaign_id && !['pending', 'none'].includes(deal.campaign_id), pk = picks[vin];
    // campaign money: what Honda's money file paid, else the admin's campaign in the sale terms, else the campaign picked in the report
    const reward = pv[vin] && Number(pv[vin].amt) ? Number(pv[vin].amt) : real ? Number(deal.margin_honda) || 0 : pk && pk.cid ? Number(pk.sup) || 0 : null;
    const pct = p && disc !== null && p.price ? disc / p.price * 100 : null;
    // a discount above 30% of the price is almost always a typing slip (an extra 0): shown, but left out of the averages
    return { a, i, vin, br: i.br, cust: (a && a.cust) || i.cust || '', sales: (a && a.sales) || i.sales || '', model: (a && a.model) || i.model || '', grade: (a && a.grade) || i.grade || '', color: (a && a.color) || i.color || '', date: i.idate,
      price: p ? p.price : null, src: p ? p.src : null, disc, foc, reward, net: p && disc !== null ? p.price - disc : null, pct, odd: pct !== null && pct > acctOddPct() };
  });
}
function acctOddPct() { return 30; }
function pct1(x) { return x === null || x === undefined || isNaN(x) ? '–' : (Math.round(x * 100) / 100).toFixed(2) + '%'; }
function acctGroup(rows, key) {
  const g = {};
  rows.forEach(r => { const k = key(r) || 'ไม่ระบุ', x = (g[k] ||= { k, n: 0, np: 0, price: 0, disc: 0, foc: 0, max: 0, rew: 0 }); x.n++; x.rew += r.reward || 0; if (r.price !== null && r.disc !== null && !r.odd) { x.np++; x.price += r.price; x.disc += r.disc; x.max = Math.max(x.max, r.disc); } x.foc += r.foc || 0; });
  return Object.values(g).map(x => ({ ...x, avg: x.np ? x.disc / x.np : null, pct: x.price ? x.disc / x.price * 100 : null, focAvg: x.n ? x.foc / x.n : 0 })).sort((a, b) => b.n - a.n);
}
function dashAcct(D) {
  const E = execData(D), rows = acctRows(D, E), ok = rows.filter(r => r.price !== null && r.disc !== null && !r.odd), odd = rows.filter(r => r.odd);
  const sumP = ok.reduce((n, r) => n + r.price, 0), sumD = ok.reduce((n, r) => n + r.disc, 0), sumF = rows.reduce((n, r) => n + (r.foc || 0), 0), sumR = rows.reduce((n, r) => n + (r.reward || 0), 0), nR = rows.filter(r => r.reward !== null).length, noBk = rows.filter(r => !r.a).length;
  const avgPct = sumP ? sumD / sumP * 100 : null, noPrice = rows.filter(r => r.price === null).length, iss = catIssue();
  const hi = r => r.pct !== null && avgPct && r.pct > avgPct * 1.5;
  const gTable = (list, label) => `<div class="scroll-x max-h-96 overflow-auto"><table class="tbl text-sm"><thead><tr><th>${label}</th><th class="text-right">ใบกำกับ</th><th class="text-right">ราคารถรวม</th><th class="text-right">เงินรางวัลแคมเปญ</th><th class="text-right">ส่วนลดเฉลี่ย/คัน</th><th class="text-right">% ส่วนลด</th><th class="text-right">ลดสูงสุด</th><th class="text-right">FOC เฉลี่ย/คัน</th></tr></thead><tbody>
    ${list.map(x => `<tr><td class="nowrap">${label === 'เซลล์' ? salesName(x.k) : esc(x.k)}</td><td class="num text-right">${fmtN(x.n)}</td><td class="num text-right">${x.np ? money(x.price) : '–'}</td><td class="num text-right">${x.rew ? money(x.rew) : '–'}</td><td class="num text-right font-semibold">${x.avg === null ? '–' : money(Math.round(x.avg))}</td><td class="num text-right" ${x.pct !== null && avgPct && x.pct > avgPct * 1.5 ? 'style="color:var(--bad)"' : ''}>${pct1(x.pct)}</td><td class="num text-right">${x.np ? money(x.max) : '–'}</td><td class="num text-right">${money(Math.round(x.focAvg))}</td></tr>`).join('') || '<tr><td colspan="8" class="text-muted">ไม่มีข้อมูลในช่วงนี้</td></tr>'}</tbody></table></div>`;
  const list = rows.slice().sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  const oddBox = odd.length ? `<p class="mb-4 p-3 rounded-lg text-sm" style="background:var(--surface-2)"><b style="color:var(--bad)">ส่วนลดเกิน ${acctOddPct()}% ของราคารถ ${fmtN(odd.length)} ใบ</b> น่าจะพิมพ์ตัวเลขผิด (เช่น เกิน 0 ไป 1 ตัว) ระบบไม่นับใบเหล่านี้ในยอดรวมและค่าเฉลี่ย แก้ส่วนลดได้ที่ใบจอง (ปุ่ม "แก้ไขใบจอง") · ${odd.slice(0, 6).map(r => `${esc(r.cust && !isSales() ? r.cust : r.sales || '')} ลด ${money(r.disc)}`).join(' · ')}${odd.length > 6 ? ' …' : ''}</p>` : '';
  return `${pageHead('บัญชี', `รถที่ออกใบกำกับภาษีในช่วงนี้ (${fmtD(E.from)} – ${fmtD(E.to)}) · ราคาเต็มตามใบราคา Honda (รวม VAT) เทียบเงินรางวัลแคมเปญ ส่วนลด และ FOC ของใบจองคันนั้น · ไม่รวมรถบริษัท ใบกำกับที่ออกซ้ำนับครั้งเดียว`)}
  ${dashTabs()}${periodBar(E)}
  ${catPrices().length ? '' : `<p class="mb-4 p-3 rounded-lg text-sm" style="background:var(--surface-2);color:var(--warn)">ยังไม่มีราคารถ ไปที่ หลังบ้าน → รุ่น เกรด สี แล้วเลือกไฟล์ PDF ใบราคา Honda</p>`}
  ${tiles([
    tile('ใบกำกับในช่วงนี้', fmtN(rows.length), { tone: odd.length ? 'warn' : '', sub2: [noPrice ? `ไม่มีราคา ${fmtN(noPrice)} คัน` : 'มีราคาครบ', noBk ? `ไม่พบใบจอง ${fmtN(noBk)} คัน` : '', odd.length ? `ส่วนลดน่าจะกรอกผิด ${fmtN(odd.length)} คัน` : ''].filter(Boolean).join(' · ') }),
    tile('ราคารถยนต์ (ราคาเต็ม)', rows.some(r => r.price !== null) ? money(rows.reduce((n, r) => n + (r.price || 0), 0)) : '–', { sub2: `${fmtN(rows.length - noPrice)} คันที่มีราคา` }),
    tile('เงินรางวัลแคมเปญ', nR ? money(sumR) : '–', { sub2: nR ? `${fmtN(nR)} คัน · ยังไม่มีเงิน ${fmtN(rows.length - nR)} คัน` : 'ยังไม่มีข้อมูลเงินรางวัล' }),
    tile('ส่วนลดรวม', ok.length ? money(sumD) : '–', { sub2: ok.length ? `เฉลี่ย ${money(Math.round(sumD / ok.length))} บาท/คัน · ${pct1(avgPct)} ของราคา` : 'ยังไม่มีส่วนลดในใบจอง' }),
    tile('FOC รวม', money(sumF), { sub2: rows.length ? `เฉลี่ย ${money(Math.round(sumF / rows.length))} บาท/คัน` : '' })
  ], 'lg:grid-cols-5')}
  ${oddBox}
  ${dCard('เปรียบเทียบสาขา', gTable(acctGroup(rows, r => r.br), 'สาขา'), 'สาขาที่ออกรถ · ตัวแดง = % ส่วนลดสูงกว่าค่าเฉลี่ยเกิน 1.5 เท่า')}
  <div class="grid lg:grid-cols-2 gap-5 my-5">
    ${dCard('แยกเซลล์', gTable(acctGroup(rows, r => r.sales), 'เซลล์'), `ตัวแดง = % ส่วนลดสูงกว่าค่าเฉลี่ยเกิน 1.5 เท่า · ไม่นับใบที่ส่วนลดเกิน ${acctOddPct()}%`)}
    ${dCard('แยกรุ่น เกรด', gTable(acctGroup(rows, r => `${r.model || ''} ${gradeShort(r.model, r.grade) || r.grade || ''}`.trim()), 'รุ่น เกรด'))}
  </div>
  ${dCard(`รายคัน <span class="text-muted text-sm font-normal">เรียงจาก % ส่วนลดมากไปน้อย · กดแถวเพื่อเปิดใบจอง กดเลขตัวถังเพื่อดูรถ</span>`, `<div class="scroll-x max-h-96 overflow-auto"><table class="tbl text-sm"><thead><tr><th>ออกใบกำกับ</th><th>สาขา</th><th>เลขตัวถัง</th><th>เซลล์</th>${isSales() ? '' : '<th>ลูกค้า</th>'}<th>รุ่น เกรด สี</th><th class="text-right">ราคาเต็ม</th><th class="text-right">เงินรางวัลแคมเปญ</th><th class="text-right">ส่วนลด</th><th class="text-right">%</th><th class="text-right">ราคาหลังลด</th><th class="text-right">FOC</th></tr></thead><tbody>
    ${list.slice(0, 1500).map(r => `<tr ${r.a ? `class="cursor-pointer" data-act="at-open" data-id="${esc(r.a.id)}"` : ''}><td class="num nowrap">${fmtD(r.date)}</td><td>${esc(r.br || '')}</td><td class="nowrap">${r.vin ? vinLink({ vin: r.vin }) : ''}</td><td class="nowrap">${salesName(r.sales || '')}${r.a ? '' : ' <span class="text-xs text-muted">ไม่พบใบจอง</span>'}</td>${isSales() ? '' : `<td class="truncate" style="max-width:160px">${esc(r.cust || '')}</td>`}<td class="nowrap">${esc(r.model || '')} ${esc(gradeShort(r.model, r.grade) || r.grade || '')} ${esc(r.color || '')}</td>
      <td class="num text-right" title="${esc(r.src || '')}">${r.price === null ? '<span class="text-muted">ไม่มีราคา</span>' : money(r.price)}</td><td class="num text-right">${r.reward === null ? '–' : money(r.reward)}</td><td class="num text-right nowrap">${r.disc === null ? '–' : money(r.disc)}${r.odd ? ' ' + chip('ตรวจ', 'bad') : ''}</td><td class="num text-right font-semibold" ${hi(r) ? 'style="color:var(--bad)"' : ''}>${pct1(r.pct)}</td><td class="num text-right">${r.net === null ? '–' : money(r.net)}</td><td class="num text-right">${r.foc === null ? '–' : money(r.foc)}</td></tr>`).join('') || '<tr><td colspan="12" class="text-muted">ไม่มีใบกำกับในช่วงนี้</td></tr>'}</tbody></table></div>`,
    `ราคาเต็ม: ใบจองใหม่เก็บราคาตอนจองไว้ (คันที่ไม่พบใบจองใช้ใบราคาปัจจุบัน) · เงินรางวัลแคมเปญ: ตามไฟล์เงิน Honda ถ้ามี ไม่งั้นตามแคมเปญที่เลือกไว้ · ราคารถ · ใบจองเดิมใช้ใบราคาตามปีรุ่นของรถที่จัดสรร (ยังไม่จัดสรรใช้ปีล่าสุด)${iss && iss.no ? ` · ใบราคาที่ใช้ Issued No. ${esc(iss.no)}${iss.date ? ' (' + esc(iss.date) + ')' : ''}` : ''} · ส่วนลดใช้ตัวเลขในข้อมูลค่าคอมถ้ากรอกแล้ว ไม่งั้นใช้ตามใบจอง · ขั้นต่อไป: ใส่ต้นทุนของแถม (FOC) แต่ละรายการ`)}`;
}

// ---- editing one model + grade by hand (ตกลง 14/10): name, colours, current price and ราคาเดิม per colour
function catEditOpen(mo, g) {
  const row = catRows().find(r => r.model === mo && r.grade === g), cs = (CATALOG[mo] || {})[g] || (row ? row.colors : []) || [];
  const all = catPrices().filter(p => p.model === mo && p.grade === g), y = Math.max(0, ...all.map(p => p.year || 0)) || (row && row.year) || bookYear(mo) || Number(todayISO().slice(0, 4));
  const pr = {}; [...new Set([...cs, ...all.filter(p => (p.year || 0) === y).map(p => p.color)])].forEach(c => { pr[c] = { cur: '', old: '' }; });
  all.filter(p => (p.year || 0) === y).forEach(p => { (pr[p.color] ||= { cur: '', old: '' })[priceTier(p)] = String(p.price); });
  S.modal = { kind: 'catedit', omo: mo, og: g, model: mo, grade: g, year: String(y), colors: Object.keys(pr).sort().join(', '), pr };
  render();
}
function catEditColors(m) { return [...new Set(String(m.colors || '').split(/[,\s]+/).map(c => c.trim().toUpperCase()).filter(Boolean))]; }
function catEditModal(m) {
  const cs = catEditColors(m), bad = cs.filter(c => !/^[A-Z]{3}$/.test(c));
  const inp = (c, t) => `<input class="w-32 text-right" inputmode="numeric" data-modal="pr.${c}.${t}" value="${esc(((m.pr || {})[c] || {})[t] || '')}" placeholder="${t === 'cur' ? 'เช่น 649000' : 'ถ้ามี'}" aria-label="${t === 'cur' ? 'ราคาปัจจุบัน' : 'ราคาเดิม'} ${esc(c)}">`;
  return `<div class="flex items-start justify-between gap-3 mb-3"><h2 class="font-head text-xl font-semibold">แก้รุ่น เกรด สี และราคา</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
    <div class="grid sm:grid-cols-4 gap-3 mb-3">
      <div class="field sm:col-span-2"><label for="ce-m">รุ่น</label><input id="ce-m" data-modal="model" value="${esc(m.model)}" list="ce-ms"><datalist id="ce-ms">${Object.keys(CATALOG).map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
      <div class="field"><label for="ce-g">เกรด</label><input id="ce-g" data-modal="grade" value="${esc(m.grade)}"></div>
      <div class="field"><label for="ce-y">ปีรุ่น (ค.ศ.)</label><input id="ce-y" data-modal="year" inputmode="numeric" value="${esc(m.year)}"></div>
      <div class="field sm:col-span-4"><label for="ce-c">รหัสสี (คั่นด้วยจุลภาค) แล้วกดนอกช่องเพื่ออัปเดตตารางราคา</label><input id="ce-c" data-modal="colors" data-ce-colors="1" value="${esc(m.colors)}"></div></div>
    ${bad.length ? `<p class="text-sm mb-2" style="color:var(--bad)">รหัสสีต้องเป็นตัวอังกฤษ 3 ตัว: ${bad.map(esc).join(', ')}</p>` : ''}
    <div class="scroll-x"><table class="tbl text-sm"><thead><tr><th>สี</th><th class="text-right">ราคาปัจจุบัน (บาท รวม VAT)</th><th class="text-right">ราคาเดิม / ก่อนปรับแคมเปญ</th></tr></thead><tbody>
      ${cs.map(c => `<tr><td class="code">${esc(c)}</td><td class="text-right">${inp(c, 'cur')}</td><td class="text-right">${inp(c, 'old')}</td></tr>`).join('') || '<tr><td colspan="3" class="text-muted">ใส่รหัสสีก่อน</td></tr>'}</tbody></table></div>
    <p class="text-xs text-muted mt-2">ราคาเดิมใช้กับรถที่ IDS ระบุ "ราคาเดิม" ในชื่อรุ่น (เช่น CITY ที่ปรับราคาตามแคมเปญ) เว้นว่างได้ · เปลี่ยนชื่อรุ่น/เกรดที่นี่ ไม่เปลี่ยนใบจองเดิม</p>
    <div class="flex justify-end gap-2 mt-4"><button class="btn btn-ghost" data-act="close">ยกเลิก</button><button class="btn btn-red" data-act="cat-edit-save">บันทึก</button></div>`;
}
async function catEditSave() {
  const m = S.modal; if (!m || m.kind !== 'catedit' || !adminWrite()) return;
  const model = String(m.model || '').trim(), grade = String(m.grade || '').trim(), year = parseInt(m.year, 10) || null, cs = catEditColors(m);
  if (!model || !grade) { toast('ใส่รุ่นและเกรด', 'bad'); return; }
  if (!cs.length || cs.some(c => !/^[A-Z]{3}$/.test(c))) { toast('รหัสสีใช้ตัวอักษรภาษาอังกฤษ 3 ตัว เช่น MTG', 'bad'); return; }
  const num2 = v => { const n = Number(String(v || '').replace(/[^\d.]/g, '')); return n > 0 ? Math.round(n) : null; };
  const add = [];
  for (const c of cs) {
    const x = (m.pr || {})[c] || {}, cur = num2(x.cur), old = num2(x.old);
    if ((x.cur && !cur) || (x.old && !old)) { toast(`ราคาของสี ${c} ต้องเป็นตัวเลข`, 'bad'); return; }
    if (cur && cur < 100000 || old && old < 100000) { toast(`ราคาของสี ${c} ดูน้อยเกินไป ใส่เป็นบาท เช่น 649000`, 'bad'); return; }
    if (cur) add.push({ model, grade, year, color: c, price: cur, qd: 'manual', tier: 'cur' });
    if (old) add.push({ model, grade, year, color: c, price: old, qd: 'manual', tier: 'old' });
  }
  const extra = cur => {
    // this year's prices of the edited model + grade are replaced; other years follow a rename
    const keep = (cur.prices || []).filter(p => !(p.model === m.omo && p.grade === m.og && (p.year || null) === year)).map(p => p.model === m.omo && p.grade === m.og ? { ...p, model, grade } : p);
    return { prices: [...keep, ...add] };
  };
  const ok = await catSave(rows => {
    const i = rows.findIndex(r => r.model === m.omo && r.grade === m.og); if (i >= 0) rows.splice(i, 1);
    const j = rows.findIndex(r => r.model === model && r.grade === grade); if (j >= 0) rows.splice(j, 1);
    rows.push({ model, grade, year, colors: cs.slice().sort(), manual: true });
  }, 'หลังบ้าน: แก้รุ่น/ราคา', `${m.omo} ${m.og}${m.omo !== model || m.og !== grade ? ` → ${model} ${grade}` : ''} · ${cs.join(' ')} · ราคา ${add.length} รายการ`, extra);
  if (ok) { S.modal = null; toast('บันทึกแล้ว'); render(); }
}
Object.assign(ACTIONS, {
  'cat-edit'(el) { const [mo, g] = el.dataset.k.split('|'); catEditOpen(mo, g); },
  'cat-edit-save'() { catEditSave(); }
});
// the colour list redraws the price table when the field is left
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.ceColors || !S.modal || S.modal.kind !== 'catedit') return;
  const cs = catEditColors(S.modal); S.modal.pr = Object.fromEntries(cs.map(c => [c, (S.modal.pr || {})[c] || { cur: '', old: '' }])); render();
});
