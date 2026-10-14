// ------------------------------------------------------------------ models, grades and colours (ตกลง 13/10)
// The pickers used to know only what had already appeared in an IDS file. Now they also use ref/catalog:
//  - rows read from Honda's price list (paste the PDF's text in หลังบ้าน → รุ่น เกรด สี; only names and colour codes are kept, no prices)
//  - rows added by hand
//  - a model, grade or colour that appears in a new IDS file is picked up by itself, as before
// Only function declarations here: the first render runs before this part of the file.
function catModelOf(h) {
  const s = String(h || '').replace(/\s+/g, ' ').trim();
  if (/^CITY HATCHBACK e:? ?HEV/i.test(s)) return 'CITY HATCHBACK e:HEV';
  if (/^CITY HATCHBACK/i.test(s)) return 'CITY HATCHBACK';
  if (/^CITY e:? ?HEV/i.test(s)) return 'CITY e:HEV';
  if (/^CITY\b/i.test(s)) return 'CITY';
  if (/^(New )?CIVIC e:? ?HEV/i.test(s)) return 'CIVIC e:HEV';
  if (/^ACCORD e:? ?HEV/i.test(s)) return 'ACCORD e:HEV';
  if (/^HR-V\b.*e:? ?HEV/i.test(s)) return 'HR-V e:HEV';
  if (/^CR-V e:? ?HEV/i.test(s)) return 'CR-V e:HEV';
  if (/^STEP ?WGN/i.test(s)) return 'STEP WGN e:HEV';
  if (/^e:N2/i.test(s)) return 'e:N2';
  if (/^e:N1/i.test(s)) return 'e:N1';
  return null;   // petrol / diesel / models AT Honda no longer sells: left out
}
function catGradeOf(model, g) {
  let s = String(g || '').replace(/\s+/g, ' ').replace(/\bCVT\b|\bSpecial lot\b|\bLight Interior\b|^2\.0 /gi, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^S \+$/, 'S').replace(/^e:HEV Hunt$/i, 'e:HEV HuNT').replace(/\s*\+$/, '+').replace(/EL \+/, 'EL+');
  if (/^e:N[12]$/i.test(s) || !s) return model === 'e:N2' ? 'e:N2' : model === 'e:N1' ? 'e:N1' : s;
  if (/HEV/.test(model) && !/^e:HEV/.test(s)) s = 'e:HEV ' + s;
  return s.trim();
}
// text copied from (or read out of) the price list PDF → rows [{model, grade, year, colors}] for the pickers,
// plus prices [{model, grade, year, color, price, qd}]: the Retail Price (incl. VAT), column A. Only that column is kept;
// the dealer margin and wholesale columns of the confidential list are not stored.
// One model year can carry two quotations (e.g. QD-1-006/26 and the newer QD-1-008/26): the newest quotation number wins.
function qdRank(q) { const m = String(q || '').match(/QD-?(\d)-?(\d+)\/(\d{2})/i); return m ? Number(m[3]) * 1e5 + Number(m[2]) * 10 + Number(m[1]) : 0; }
function catParseFull(text) {
  const out = new Map(), prices = new Map(); let model = null, year = null, qd = null;
  const src = String(text || '');
  const issue = { no: (src.match(/Issued\s*No\.?\s*([\d/]+)/i) || [])[1] || null, date: (src.match(/\b(\d{1,2}-[A-Z][a-z]{2}-\d{2})\b/) || [])[1] || null };
  for (const raw of src.split(/\r?\n/)) {
    let line = raw.replace(/\s+/g, ' ').trim(); if (!line) continue;
    const q = line.match(/^'?(QD-?\d[-\d/]*)\s+/); if (q) { qd = q[1]; line = line.slice(q[0].length); }
    const head = line.match(/^(CITY|New CIVIC|CIVIC|ACCORD|HR-V|CR-V|STEP ?WGN|e:N[12]|WR-V|BR-V)\b[^()]*$/i);
    if (head && !/\d{2,3},\d{3}/.test(line)) { model = catModelOf(line); qd = null; const ys = [...line.matchAll(/(?:'|\b)(\d{2})(?=\s*(?:YM|-|'|$|\s))/g)].map(x => Number(x[1])).filter(y => y >= 18 && y <= 40); year = ys.length ? 2000 + Math.max(...ys) : null; continue; }
    if (/^e:N[12]\s*\(/i.test(line) && !model) model = catModelOf(line);
    if (!model) continue;
    let g = null, cs = null, rest = '';
    const m = line.match(/^(.+?)\s*\(([A-Z]{3}(?:\s*\/\s*[A-Z]{3})*)\s*\)/);
    if (m) { g = m[1]; cs = m[2].split('/').map(x => x.trim()); rest = line.slice(m[0].length); }
    else { const h = line.match(/^(e:HEV Hunt)\s+([A-Z]{3})\b/i); if (h) { g = h[1]; cs = [h[2]]; rest = line.slice(h[0].length); } }
    // a real price-list row has a price on it; this drops headings and footnotes that happen to have brackets
    if (!g || !/\d{1,3},\d{3}/.test(line) || /[\u0E00-\u0E7F]/.test(g) || g.length > 40) continue;
    const grade = catGradeOf(model, g), key = model + '|' + grade + '|' + (year || '');
    if (!grade || grade === 'e:HEV') continue;
    if (!out.has(key)) out.set(key, { model, grade, year, colors: new Set() });
    cs.forEach(c => out.get(key).colors.add(c.toUpperCase()));
    const pm = rest.match(/(\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?/), price = pm ? Number(pm[1].replace(/,/g, '')) : null;
    if (price && price >= 100000) cs.forEach(c => {
      const k = key + '|' + c.toUpperCase(), cur = prices.get(k);
      if (!cur || qdRank(qd) >= qdRank(cur.qd)) prices.set(k, { model, grade, year, color: c.toUpperCase(), price, qd: qd || null });
    });
  }
  // keep the newest model year of each model only: older years are no longer ordered (old codes stay only if a car of that year is in IDS)
  const rows = [...out.values()], newest = {};
  rows.forEach(r => { if (r.year) newest[r.model] = Math.max(newest[r.model] || 0, r.year); });
  const keep = new Map();
  rows.filter(r => !newest[r.model] || r.year === newest[r.model]).forEach(r => { const k = r.model + '|' + r.grade; if (!keep.has(k)) keep.set(k, { model: r.model, grade: r.grade, year: r.year, colors: new Set() }); r.colors.forEach(c => keep.get(k).colors.add(c)); });
  // prices of every model year are kept: a car of last year's model in stock is still sold at its own price
  return { rows: [...keep.values()].map(r => ({ ...r, colors: [...r.colors].sort() })), prices: [...prices.values()], issue };
}
function catParse(text) { return catParseFull(text).rows; }
function catRows() { return (S.ref.get('catalog') || {}).rows || []; }
// the merged table the pickers use: IDS names first, then ref/catalog
function catalogLists() { return [catRows().flatMap(r => (r.colors && r.colors.length ? r.colors : [null]).map(c => ({ model: r.model, grade: r.grade, color: c })))]; }
function adminCatalog(D) {
  const can = adminWrite(), rows = catRows(), mine = new Set(rows.map(r => r.model + '|' + r.grade)), m = S.adCat || {};
  const ids = buildCatalog([idsData().cars, idsData().quota, idsData().bookings]);
  const list = Object.entries(CATALOG).flatMap(([mo, gs]) => Object.entries(gs).map(([g, cs]) => ({ mo, g, cs, fromIds: !!(ids[mo] && ids[mo][g]), fromCat: mine.has(mo + '|' + g) })));
  return `${can ? `<section class="bg-surface border border-line rounded-lg p-4 mb-4"><h2 class="font-head font-semibold mb-1">อัปเดตจากใบราคา Honda (Price List)</h2>
    <p class="text-sm text-muted mb-2">เลือกไฟล์ PDF ใบราคา (Price List) ระบบอ่านรุ่น เกรด รหัสสี และราคาขายปลีกรวม VAT (คอลัมน์ Retail Price) ให้ตรวจก่อนบันทึก · ไม่เก็บ Margin หรือราคาขายส่ง</p>
    <div class="flex flex-wrap gap-2 items-center mb-2"><label class="btn btn-dark btn-sm relative">เลือกไฟล์ PDF ใบราคา<input type="file" accept=".pdf,application/pdf" data-cat-pdf class="absolute w-px h-px opacity-0"></label>
      ${m.busy ? `<span class="text-sm"><span class="spin"></span> ${esc(m.busy)}</span>` : m.file ? `<span class="text-sm text-muted">ไฟล์ ${esc(m.file)}</span>` : ''}</div>
    <details class="mb-1" ${m.text ? 'open' : ''}><summary class="text-sm cursor-pointer text-muted">หรือวางข้อความจาก PDF (เปิด PDF กด Ctrl+A แล้ว Ctrl+C)</summary>
    <textarea id="cat-txt" rows="4" class="w-full mt-2" data-catx="1" placeholder="วางข้อความจากใบราคาที่นี่">${esc(m.text || '')}</textarea>
    <div class="flex gap-2 mt-2"><button class="btn btn-ghost btn-sm" data-act="cat-parse">อ่านข้อความ</button></div></details>
    ${m.pdfErr ? `<p class="text-sm" style="color:var(--bad)">${esc(m.pdfErr)}</p>` : ''}
    ${m.parsed ? `<div class="mt-3">${m.parsed.length ? `<p class="text-sm mb-1">${m.issue && m.issue.no ? `ใบราคา Issued No. <b>${esc(m.issue.no)}</b>${m.issue.date ? ` (${esc(m.issue.date)})` : ''} · ` : ''}พบ ${m.parsed.length} รุ่น/เกรด (ปีรุ่นล่าสุด) · ใหม่ ${m.parsed.filter(r => !CATALOG[r.model] || !CATALOG[r.model][r.grade] || r.colors.some(c => !CATALOG[r.model][r.grade].includes(c))).length} รายการ · ราคา ${fmtN((m.prices || []).length)} รายการ (ทุกปีรุ่น)${m.prices && m.prices.length ? ` · ราคาเปลี่ยน/ใหม่ ${fmtN(priceMerge(catPrices(), m.prices).changed)} รายการ` : ''}</p>
      <div class="scroll-x max-h-72 overflow-auto"><table class="tbl text-sm"><thead><tr><th>รุ่น</th><th>เกรด</th><th>สี</th><th class="text-right">ราคา (บาท)</th></tr></thead><tbody>${m.parsed.map(r => { const cur = (CATALOG[r.model] || {})[r.grade]; const ps = (m.prices || []).filter(p => p.model === r.model && p.grade === r.grade && p.year === r.year); return `<tr><td>${esc(r.model)}${r.year ? ` <span class="text-xs text-muted">MY'${String(r.year).slice(-2)}</span>` : ''}${CATALOG[r.model] ? '' : ' ' + chip('รุ่นใหม่', 'warn')}</td><td>${esc(r.grade)}${cur ? '' : ' ' + chip('ใหม่', 'warn')}</td><td>${r.colors.map(c => cur && cur.includes(c) ? esc(c) : `<b style="color:var(--warn)">${esc(c)}</b>`).join(' ')}</td><td class="num text-right text-xs">${priceCell(ps)}</td></tr>`; }).join('')}</tbody></table></div>
      <button class="btn btn-red btn-sm mt-2" data-act="cat-save">บันทึกรุ่นและราคา</button>` : '<p class="text-sm" style="color:var(--bad)">ไม่พบรุ่น เกรด สีในข้อความนี้</p>'}</div>` : ''}</section>
  <section class="bg-surface border border-line rounded-lg p-4 mb-4"><h2 class="font-head font-semibold mb-2">เพิ่มเอง</h2>
    <div class="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
      <div class="field"><label for="cat-m">รุ่น</label><input id="cat-m" list="cat-ms" data-catf="model" value="${esc(m.model || '')}" placeholder="เช่น CITY e:HEV"><datalist id="cat-ms">${Object.keys(CATALOG).map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
      <div class="field"><label for="cat-g">เกรด</label><input id="cat-g" data-catf="grade" value="${esc(m.grade || '')}" placeholder="เช่น e:HEV SV"></div>
      <div class="field"><label for="cat-c">รหัสสี (คั่นด้วยจุลภาค)</label><input id="cat-c" data-catf="colors" value="${esc(m.colors || '')}" placeholder="เช่น MTG, CBL, PMW"></div>
      <button class="btn btn-dark btn-sm" data-act="cat-add">เพิ่ม</button></div></section>` : ''}
  <div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl"><thead><tr><th>รุ่น</th><th>เกรด</th><th>สี</th><th class="text-right">ราคา (ปีรุ่นล่าสุด)</th><th>มาจาก</th><th></th></tr></thead><tbody>
    ${list.map(x => `<tr><td>${esc(x.mo)}</td><td>${esc(x.g)}</td><td class="text-sm">${x.cs.map(esc).join(' ')}</td><td class="num text-right text-xs">${priceCell(newestPrices(x.mo, x.g))}</td><td class="text-xs">${[x.fromIds ? 'ไฟล์ IDS' : '', x.fromCat ? 'ใบราคา / เพิ่มเอง' : ''].filter(Boolean).join(' · ')}</td>
      <td class="text-right">${can && x.fromCat ? `<button class="btn btn-ghost btn-sm" data-act="cat-del" data-k="${esc(x.mo + '|' + x.g)}">ลบ</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
  <p class="text-xs text-muted mt-2">รุ่น เกรด สีที่ขึ้นในไฟล์ IDS ระบบเพิ่มให้เอง ลบได้เฉพาะที่มาจากใบราคาหรือเพิ่มเอง${catIssue() && catIssue().no ? ` · ราคาจากใบราคา Issued No. ${esc(catIssue().no)}${catIssue().date ? ' (' + esc(catIssue().date) + ')' : ''}` : ''}</p>`;
}
// "649,000" or "649,000 · CBL +6,000 · PMW +10,000": the grade's starting price and the colours that cost more
function priceCell(ps) {
  if (!ps || !ps.length) return '<span class="text-muted">–</span>';
  const base = Math.min(...ps.map(p => p.price)), up = {};
  ps.filter(p => p.price > base).forEach(p => { (up[p.price - base] ||= []).push(p.color); });
  return `<b>${money(base)}</b>${Object.entries(up).sort((a, b) => a[0] - b[0]).map(([d, cs]) => `<br>${cs.map(esc).join('/')} +${money(Number(d))}`).join('')}`;
}
function newestPrices(model, grade) { const ps = catPrices().filter(p => p.model === model && p.grade === grade); const y = Math.max(0, ...ps.map(p => p.year || 0)); return ps.filter(p => (p.year || 0) === y); }
async function catSave(fn, act, note, extra) {
  const cur = S.ref.get('catalog') || { rows: [] };
  const rows = (cur.rows || []).map(r => ({ ...r, colors: [...(r.colors || [])] }));
  if (fn(rows) === false) return false;
  const ok = await write('ref', 'catalog', { ...cur, rows, ...(extra ? extra(cur) : {}), at: new Date().toISOString(), log: [...(cur.log || []), { ...actor(), act, note }].slice(-40) });
  if (ok) { S.cache = null; }
  return ok;
}
function catMerge(rows, add) {
  for (const r of add) {
    const x = rows.find(y => y.model === r.model && y.grade === r.grade);
    if (x) { x.colors = [...new Set([...x.colors, ...r.colors])].sort(); if (r.year) x.year = r.year; } else rows.push({ model: r.model, grade: r.grade, year: r.year || null, colors: [...r.colors].sort() });
  }
}
Object.assign(ACTIONS, {
  'cat-parse'() { const t = ($('#cat-txt') || {}).value || '', P = catParseFull(t); S.adCat = { ...(S.adCat || {}), text: t, file: null, pdfErr: null, parsed: P.rows, prices: P.prices, issue: P.issue }; render(); },
  async 'cat-save'() {
    const p = S.adCat && S.adCat.parsed; if (!p || !p.length || !adminWrite()) return;
    const pr = S.adCat.prices || [], iss = S.adCat.issue || null;
    const extra = pr.length ? cur => { const mg = priceMerge(cur.prices, pr); return { prices: mg.list, price_issue: { ...(iss || {}), at: new Date().toISOString() } }; } : null;
    if (await catSave(rows => catMerge(rows, p), 'หลังบ้าน: อัปเดตรุ่นจากใบราคา', `${p.length} รุ่น/เกรด${pr.length ? ` · ราคา ${pr.length} รายการ` : ''}${iss && iss.no ? ` · Issued No. ${iss.no}` : ''}`, extra)) { S.adCat = null; toast(pr.length ? 'บันทึกรุ่นและราคาแล้ว' : 'บันทึกรุ่น เกรด สีแล้ว ใช้ในหน้าลงใบจองได้ทันที'); render(); }
  },
  async 'cat-add'() {
    const m = S.adCat || {}; if (!adminWrite()) return;
    const model = (m.model || '').trim(), grade = (m.grade || '').trim(), colors = String(m.colors || '').split(/[,\s]+/).map(c => c.trim().toUpperCase()).filter(Boolean);
    if (!model || !grade) { toast('ใส่รุ่นและเกรด', 'bad'); return; }
    if (colors.some(c => !/^[A-Z]{3}$/.test(c))) { toast('รหัสสีใช้ตัวอักษรภาษาอังกฤษ 3 ตัว เช่น MTG', 'bad'); return; }
    if (await catSave(rows => catMerge(rows, [{ model, grade, colors }]), 'หลังบ้าน: เพิ่มรุ่น', `${model} ${grade} ${colors.join(' ')}`)) { S.adCat = null; toast('เพิ่มแล้ว'); render(); }
  },
  async 'cat-del'(el) {
    const [model, grade] = el.dataset.k.split('|'); if (!adminWrite()) return;
    if (await catSave(rows => { const i = rows.findIndex(r => r.model === model && r.grade === grade); if (i < 0) return false; rows.splice(i, 1); }, 'หลังบ้าน: ลบรุ่น', `${model} ${grade}`)) { toast('ลบแล้ว'); render(); }
  }
});
document.addEventListener('input', ev => {
  const t = ev.target; if (!t || !t.dataset) return;
  if (t.dataset.catf) S.adCat = { ...(S.adCat || {}), [t.dataset.catf]: t.value };
  if (t.dataset.catx) S.adCat = { ...(S.adCat || {}), text: t.value };
});
// what a new booking can pick: the current price list (newest model year) plus anything in stock or on a Quota now.
// Names that only appear in old IDS bookings are left out, so old model codes no longer show up.
function pickCatalog(D) {
  const rows = catRows(); if (!rows.length) return CATALOG;
  const t = {}, add = (m, g, c) => { if (!m || !g) return; ((t[m] ||= {})[g] ||= new Set()); if (c) t[m][g].add(String(c).toUpperCase()); };
  rows.forEach(r => (r.colors || []).forEach(c => add(r.model, r.grade, c)));
  [...D.cars.values()].forEach(c => add(c.model, c.grade, c.color));
  D.quota.forEach(q => { if (q.open || quotaQueue(q)) add(q.model, q.grade, q.color); });
  const out = {}; Object.keys(t).sort().forEach(m => { out[m] = {}; Object.keys(t[m]).sort().forEach(g => { out[m][g] = [...t[m][g]].sort(); }); });
  return out;
}
// the model years of one spec in stock: "ว่าง 3 คัน (MY'27 2 · MY'26 1)"
function specYears(D, key) {
  const by = {}; [...D.cars.values()].filter(c => c.spec === key && (c.status === 'free' || c.status === 'temp')).forEach(c => { const y = c.year ? `MY'${String(c.year).slice(-2)}` : 'ไม่ทราบปี'; by[y] = (by[y] || 0) + 1; });
  return Object.entries(by).sort((a, b) => b[0].localeCompare(a[0]));
}
function catYearOf(model, grade) { const ys = catRows().filter(x => x.model === model && (!grade || x.grade === grade) && x.year).map(x => x.year); return ys.length ? Math.max(...ys) : null; }
