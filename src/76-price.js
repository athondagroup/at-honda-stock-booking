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
// → {price, base, extra, exact, year, qd} or null when the price list has no such model and grade
function priceOf(model, grade, color, year) {
  if (!model || !grade) return null;
  const list = priceGroups().get(model + '|' + gradeLoose(grade)); if (!list || !list.length) return null;
  const years = [...new Set(list.map(p => p.year || 0))].sort((a, b) => b - a);
  const y = year && years.includes(Number(year)) ? Number(year) : years[0];
  const same = list.filter(p => (p.year || 0) === y), base = Math.min(...same.map(p => p.price));
  const hit = color && same.find(p => p.color === String(color).toUpperCase());
  return { price: hit ? hit.price : base, base, extra: hit ? hit.price - base : 0, exact: !!hit, year: y || null, qd: (hit || same[0]).qd || null };
}
function priceText(p) { return p ? `${money(p.price)} บาท${p.extra ? ` (สีนี้ +${money(p.extra)})` : ''}${p.exact ? '' : ' · ไม่มีราคาสีนี้ ใช้ราคาเริ่มต้นของเกรด'}` : ''; }
// the price of one booking: what it was booked at, else the price list for the allocated car's model year (else the newest year)
function bookPrice(a, D) {
  const r = a.rec || {};
  if (r.list_price) return { price: Number(r.list_price), src: 'ราคาตอนจอง' };
  const v = atVin(a), car = v && D && (D.cars.get(v) || (typeof carAny === 'function' ? carAny(v, D) : null));
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
  const k = p => [p.model, p.grade, p.year || '', p.color].join('|'), m = new Map((cur || []).map(p => [k(p), p]));
  let changed = 0; add.forEach(p => { const o = m.get(k(p)); if (!o || o.price !== p.price) changed++; m.set(k(p), p); });
  return { list: [...m.values()], changed };
}

// ---- the accounts tab: list price, the discount the sales gave, FOC, per booking / sales / model
function acctRows(D, E) {
  const inR = d => !!d && d >= E.from && d <= E.to;
  return D.at.filter(a => !a.demo && !a.cancelled && inBr(a) && inR(a.date)).map(a => {
    const p = bookPrice(a, D), disc = bookDiscount(a), foc = a.rec.foc_total === null || a.rec.foc_total === undefined || a.rec.foc_total === '' ? null : Number(a.rec.foc_total);
    const pct = p && disc !== null && p.price ? disc / p.price * 100 : null;
    // a discount above 30% of the price is almost always a typing slip (an extra 0): shown, but left out of the averages
    return { a, price: p ? p.price : null, src: p ? p.src : null, disc, foc, net: p && disc !== null ? p.price - disc : null, pct, odd: pct !== null && pct > acctOddPct() };
  });
}
function acctOddPct() { return 30; }
function pct1(x) { return x === null || x === undefined || isNaN(x) ? '–' : (Math.round(x * 100) / 100).toFixed(2) + '%'; }
function acctGroup(rows, key) {
  const g = {};
  rows.forEach(r => { const k = key(r) || 'ไม่ระบุ', x = (g[k] ||= { k, n: 0, np: 0, price: 0, disc: 0, foc: 0, max: 0 }); x.n++; if (r.price !== null && r.disc !== null && !r.odd) { x.np++; x.price += r.price; x.disc += r.disc; x.max = Math.max(x.max, r.disc); } x.foc += r.foc || 0; });
  return Object.values(g).map(x => ({ ...x, avg: x.np ? x.disc / x.np : null, pct: x.price ? x.disc / x.price * 100 : null, focAvg: x.n ? x.foc / x.n : 0 })).sort((a, b) => b.n - a.n);
}
function dashAcct(D) {
  const E = execData(D), rows = acctRows(D, E), ok = rows.filter(r => r.price !== null && r.disc !== null && !r.odd), odd = rows.filter(r => r.odd);
  const sumP = ok.reduce((n, r) => n + r.price, 0), sumD = ok.reduce((n, r) => n + r.disc, 0), sumF = rows.reduce((n, r) => n + (r.foc || 0), 0);
  const avgPct = sumP ? sumD / sumP * 100 : null, noPrice = rows.filter(r => r.price === null).length, iss = catIssue();
  const hi = r => r.pct !== null && avgPct && r.pct > avgPct * 1.5;
  const gTable = (list, label) => `<div class="scroll-x max-h-96 overflow-auto"><table class="tbl text-sm"><thead><tr><th>${label}</th><th class="text-right">ใบจอง</th><th class="text-right">ราคารถรวม</th><th class="text-right">ส่วนลดเฉลี่ย/คัน</th><th class="text-right">% ส่วนลด</th><th class="text-right">ลดสูงสุด</th><th class="text-right">FOC เฉลี่ย/คัน</th></tr></thead><tbody>
    ${list.map(x => `<tr><td class="nowrap">${label === 'เซลล์' ? salesName(x.k) : esc(x.k)}</td><td class="num text-right">${fmtN(x.n)}</td><td class="num text-right">${x.np ? money(x.price) : '–'}</td><td class="num text-right font-semibold">${x.avg === null ? '–' : money(Math.round(x.avg))}</td><td class="num text-right" ${x.pct !== null && avgPct && x.pct > avgPct * 1.5 ? 'style="color:var(--bad)"' : ''}>${pct1(x.pct)}</td><td class="num text-right">${x.np ? money(x.max) : '–'}</td><td class="num text-right">${money(Math.round(x.focAvg))}</td></tr>`).join('') || '<tr><td colspan="7" class="text-muted">ไม่มีข้อมูลในช่วงนี้</td></tr>'}</tbody></table></div>`;
  const list = rows.slice().sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  const oddBox = odd.length ? `<p class="mb-4 p-3 rounded-lg text-sm" style="background:var(--surface-2)"><b style="color:var(--bad)">ส่วนลดเกิน ${acctOddPct()}% ของราคารถ ${fmtN(odd.length)} ใบ</b> น่าจะพิมพ์ตัวเลขผิด (เช่น เกิน 0 ไป 1 ตัว) ระบบไม่นับใบเหล่านี้ในยอดรวมและค่าเฉลี่ย แก้ส่วนลดได้ที่ใบจอง (ปุ่ม "แก้ไขใบจอง") · ${odd.slice(0, 6).map(r => `${esc(r.a.cust && !isSales() ? r.a.cust : r.a.sales || '')} ลด ${money(r.disc)}`).join(' · ')}${odd.length > 6 ? ' …' : ''}</p>` : '';
  return `${pageHead('บัญชี', `ราคารถตามใบราคา Honda (ราคาขายปลีกรวม VAT) เทียบส่วนลดที่เซลล์ลงในใบจอง · ใบจองตามวันที่จอง ${fmtD(E.from)} – ${fmtD(E.to)} · ไม่นับใบที่ยกเลิก`)}
  ${dashTabs()}${periodBar(E)}
  ${catPrices().length ? '' : `<p class="mb-4 p-3 rounded-lg text-sm" style="background:var(--surface-2);color:var(--warn)">ยังไม่มีราคารถ ไปที่ หลังบ้าน → รุ่น เกรด สี แล้วเลือกไฟล์ PDF ใบราคา Honda</p>`}
  ${tiles([
    tile('ใบจองในช่วงนี้', fmtN(rows.length), { tone: odd.length ? 'warn' : '', sub2: [noPrice ? `ไม่มีราคา ${fmtN(noPrice)} ใบ` : 'มีราคาครบ', odd.length ? `ส่วนลดน่าจะกรอกผิด ${fmtN(odd.length)} ใบ` : ''].filter(Boolean).join(' · ') }),
    tile('ราคารถรวม', ok.length ? money(sumP) : '–', { sub2: `${fmtN(ok.length)} ใบที่มีทั้งราคาและส่วนลด` }),
    tile('ส่วนลดรวม', ok.length ? money(sumD) : '–', { sub2: ok.length ? `เฉลี่ย ${money(Math.round(sumD / ok.length))} บาท/คัน` : '' }),
    tile('% ส่วนลดเฉลี่ย', pct1(avgPct), { sub2: 'ส่วนลดรวม ÷ ราคารถรวม' }),
    tile('FOC ที่ใช้รวม', money(sumF), { sub2: rows.length ? `เฉลี่ย ${money(Math.round(sumF / rows.length))} บาท/คัน` : '' })
  ], 'lg:grid-cols-5')}
  ${oddBox}
  <div class="grid lg:grid-cols-2 gap-5 mb-5">
    ${dCard('แยกเซลล์', gTable(acctGroup(rows, r => r.a.sales), 'เซลล์'), `ตัวแดง = % ส่วนลดสูงกว่าค่าเฉลี่ยเกิน 1.5 เท่า · ไม่นับใบที่ส่วนลดเกิน ${acctOddPct()}%`)}
    ${dCard('แยกรุ่น เกรด', gTable(acctGroup(rows, r => `${r.a.model || ''} ${gradeShort(r.a.model, r.a.grade) || r.a.grade || ''}`.trim()), 'รุ่น เกรด'))}
  </div>
  ${dCard(`รายใบจอง <span class="text-muted text-sm font-normal">เรียงจาก % ส่วนลดมากไปน้อย · กดแถวเพื่อเปิดใบจอง</span>`, `<div class="scroll-x max-h-96 overflow-auto"><table class="tbl text-sm"><thead><tr><th>วันที่จอง</th><th>สาขา</th><th>เซลล์</th>${isSales() ? '' : '<th>ลูกค้า</th>'}<th>รุ่น เกรด สี</th><th class="text-right">ราคารถ</th><th class="text-right">ส่วนลด</th><th class="text-right">%</th><th class="text-right">ราคาหลังลด</th><th class="text-right">FOC</th></tr></thead><tbody>
    ${list.slice(0, 300).map(r => `<tr class="cursor-pointer" data-act="at-open" data-id="${esc(r.a.id)}"><td class="nowrap">${fmtD(r.a.date)}</td><td>${esc(r.a.br || '')}</td><td class="nowrap">${salesName(r.a.sales || '')}</td>${isSales() ? '' : `<td class="truncate" style="max-width:160px">${esc(r.a.cust || '')}</td>`}<td class="nowrap">${esc(r.a.model || '')} ${esc(gradeShort(r.a.model, r.a.grade) || r.a.grade || '')} ${esc(r.a.color || '')}</td>
      <td class="num text-right" title="${esc(r.src || '')}">${r.price === null ? '<span class="text-muted">ไม่มีราคา</span>' : money(r.price)}</td><td class="num text-right nowrap">${r.disc === null ? '–' : money(r.disc)}${r.odd ? ' ' + chip('ตรวจ', 'bad') : ''}</td><td class="num text-right font-semibold" ${hi(r) ? 'style="color:var(--bad)"' : ''}>${pct1(r.pct)}</td><td class="num text-right">${r.net === null ? '–' : money(r.net)}</td><td class="num text-right">${r.foc === null ? '–' : money(r.foc)}</td></tr>`).join('') || '<tr><td colspan="10" class="text-muted">ไม่มีใบจองในช่วงนี้</td></tr>'}</tbody></table></div>`,
    `ราคารถ: ใบจองใหม่เก็บราคาตอนจองไว้ · ใบจองเดิมใช้ใบราคาตามปีรุ่นของรถที่จัดสรร (ยังไม่จัดสรรใช้ปีล่าสุด)${iss && iss.no ? ` · ใบราคาที่ใช้ Issued No. ${esc(iss.no)}${iss.date ? ' (' + esc(iss.date) + ')' : ''}` : ''} · ส่วนลดใช้ตัวเลขในข้อมูลค่าคอมถ้ากรอกแล้ว ไม่งั้นใช้ตามใบจอง · ขั้นต่อไป: ใส่ต้นทุนของแถม (FOC) แต่ละรายการ`)}`;
}
