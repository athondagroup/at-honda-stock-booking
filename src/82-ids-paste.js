// ------------------------------------------------------------------ IDS data pasted straight from Excel (ตกลง 19/10)
// Open the IDS export in Excel, Ctrl+A → Ctrl+C, click the box here and Ctrl+V. Each paste is read by the same reader
// as a file (it knows the table by its headers and the branch from the data) and joins the same list to check
// before saving; nothing is saved until บันทึก. Paste again for the next table; the same table pasted twice keeps
// the newer paste. Excel copies cells as shown on screen, so dates are read per column (day/month or month/day).
// Only function declarations here: the first render runs before this part of the file.
function idsTsv(text) {
  // Excel's copy: tab between cells, new line between rows, "…" around a cell that holds a tab, new line or quote
  const rows = []; let row = [], cell = '', q = false;
  const s = String(text || '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"' && cell === '') q = true;
    else if (ch === '\t') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  while (rows.length && rows[rows.length - 1].every(c => !String(c).trim())) rows.pop();
  return rows;
}
// dates as shown in Excel: 19/10/2026 · 10/19/2026 · 19-Oct-26 · 19 ต.ค. 69 → day/month/year text the reader knows
function idsPasteDates(rows) {
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6, 'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12 };
  const named = /^(\d{1,2})[\s\-/]+([A-Za-z]{3,9}|[ก-ฮ]\.[ก-ฮ]\.)[\s\-/]+(\d{2,4})(\s+\d{1,2}:\d{2}(:\d{2})?)?$/;
  const num = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})(\s+\d{1,2}:\d{2}(:\d{2})?)?$/;
  const width = Math.max(0, ...rows.map(r => r.length));
  for (let c = 0; c < width; c++) {
    let dayFirst = false, monthFirst = false;
    rows.forEach(r => { const m = String(r[c] ?? '').trim().match(num); if (m) { if (+m[1] > 12) dayFirst = true; if (+m[2] > 12) monthFirst = true; } });
    const swap = monthFirst && !dayFirst;
    rows.forEach(r => {
      const v = String(r[c] ?? '').trim(); if (!v) return;
      let m = v.match(named);
      if (m) { const mo = MON[m[2].toLowerCase().slice(0, 3)] || MON[m[2]]; if (mo) r[c] = `${m[1]}/${mo}/${m[3]}`; return; }
      if (swap && (m = v.match(num))) r[c] = `${m[2]}/${m[1]}/${m[3]}`;
    });
  }
  return rows;
}
function idsPasteBox() {
  const p = perms(), U = S.upl, can = p.upload && p.write && !U.busy, P = S.idsPaste || {};
  if (!p.upload) return '';
  return `<section class="bg-surface border border-line rounded-lg p-4 md:p-5 mb-5"><h2 class="font-head text-lg font-semibold mb-1">วางข้อมูลจาก Excel (ไม่ต้องเลือกไฟล์)</h2>
    <ol class="text-sm text-muted list-decimal pl-5 mb-3"><li>เปิดไฟล์ IDS ใน Excel คลิกในตาราง แล้วกด <b>Ctrl+A</b> → <b>Ctrl+C</b> (ให้ติดแถวหัวตารางมาด้วย)</li>
      <li>คลิกในกล่องด้านล่าง แล้วกด <b>Ctrl+V</b> ระบบรู้เองว่าเป็น Stock / Booking / Quota / DL และสาขาไหน</li>
      <li>วางต่อได้ทีละตาราง ทุกตารางจะเข้ารายการตรวจด้านล่าง ตรวจจำนวนแล้วกด "บันทึก" (ยังไม่บันทึกจนกว่าจะกด)</li></ol>
    <textarea data-idspaste="1" rows="3" class="w-full font-mono text-xs border border-line rounded-lg p-3 bg-surface" placeholder="คลิกที่นี่ แล้วกด Ctrl+V" aria-label="วางข้อมูลจาก Excel" ${can ? '' : 'disabled'}></textarea>
    ${P.msg ? `<p class="text-sm mt-2" style="color:var(--${P.bad ? 'bad' : 'good'})" role="status">${esc(P.msg)}</p>` : ''}</section>`;
}
function idsPasteRead(text) {
  const p = perms(), U = S.upl;
  if (!p.upload || !p.write || U.busy) return;
  const rows = idsPasteDates(idsTsv(text));
  S.idsPaste = S.idsPaste || { n: 0 };
  if (rows.length < 2) { S.idsPaste = { ...S.idsPaste, msg: 'ไม่พบตารางในข้อความที่วาง ก๊อปจาก Excel ทั้งตาราง (Ctrl+A → Ctrl+C) แล้ววางใหม่', bad: true }; render(); return; }
  const n = ++S.idsPaste.n;
  const r = IDS.parseSheet(rows, `วางครั้งที่ ${n}`, 'วางจาก Excel');
  if (!r) { S.idsPaste = { ...S.idsPaste, msg: `วางครั้งที่ ${n}: ไม่พบหัวตาราง Stock / Booking / Quota / DL ของ IDS ก๊อปให้ติดแถวหัวตารางมาด้วย`, bad: true }; render(); return; }
  // the same table pasted again replaces the earlier paste; tables from files stay as they are
  const same = x => x.file === 'วางจาก Excel' && x.src === r.src && x.br === r.br && (r.src !== 'quota' || String(x.months) === String(r.months));
  const old = U.results.filter(x => !same(x)), off = new Set(old.filter(x => !x.on && !x.error && !x.block));
  const all = [...old, r];
  prepareUploads(all);
  all.forEach(x => { if (off.has(x)) x.on = false; });
  U.results = all;
  S.idsPaste = { ...S.idsPaste, bad: !!r.error, msg: r.error ? `วางครั้งที่ ${n}: ${r.error}`
    : `วางครั้งที่ ${n}: ${SRC_LABEL[r.src] || ''} ${r.br || ''} ${fmtN(r.rows.length)} แถว เข้ารายการตรวจด้านล่างแล้ว วางตารางต่อไปได้เลย` };
  render();
  }
document.addEventListener('paste', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.idspaste) return;
  const text = ev.clipboardData && ev.clipboardData.getData('text/plain'); if (!text) return;
  ev.preventDefault(); t.value = '';
  idsPasteRead(text);
});
// the check-list cell of a DL table: which IDS report it is, what changes car by car, and the name question
function uplInvCell(r, i) {
  const d = r.diff, lost = d.lost || [];
  const kind = `<select data-upl-kind="${i}" class="text-xs mb-1" aria-label="ชนิดรายงาน DL" style="background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:3px 6px">
      <option value="mine" ${r.kind !== 'other' ? 'selected' : ''}>ขายให้ลูกค้า (Mine)</option><option value="other" ${r.kind === 'other' ? 'selected' : ''}>จำหน่ายให้สาขาอื่น (Other)</option></select>`;
  const nums = `<div>เพิ่มใหม่ <b>${fmtN(d.add)}</b> · อัปเดต <b>${fmtN(d.upd)}</b> · ไม่เปลี่ยน ${fmtN(d.same)}</div>
    <div class="text-muted">คันเดิมที่ไม่อยู่ในไฟล์นี้ ${fmtN(d.keep)} คัน เก็บไว้เหมือนเดิม${d.stray ? ` · ย้าย ${fmtN(d.stray)} คันที่เคยบันทึกเป็นขายลูกค้า (ไม่มีชื่อ) มาเป็นจำหน่ายให้สาขาอื่น` : ''}</div>`;
  const ask = lost.length ? `<div class="mt-2 p-2 rounded" style="background:var(--warn-soft)"><b style="color:var(--warn)">${fmtN(lost.length)} คันในไฟล์นี้ไม่มีชื่อลูกค้า/เซลล์ แต่ข้อมูลเดิมมี</b>
      <div class="flex flex-wrap gap-3 mt-1"><label class="inline-flex items-center gap-1"><input type="radio" name="uplname${i}" value="old" data-upl-name="${i}" ${r.nameChoice === 'old' ? 'checked' : ''}> ใช้ชื่อเดิม</label>
      <label class="inline-flex items-center gap-1"><input type="radio" name="uplname${i}" value="new" data-upl-name="${i}" ${r.nameChoice === 'new' ? 'checked' : ''}> ใช้ข้อมูลใหม่ (ไม่มีชื่อ)</label></div>
      <details class="mt-1"><summary class="cursor-pointer">ดูรายคัน</summary>${lost.slice(0, 50).map(x => `<div class="code">${esc(x.vin || '')} · ${esc(x.cust || '–')} · ${esc(x.sales || '–')}</div>`).join('')}${lost.length > 50 ? `<div>และอีก ${lost.length - 50} คัน</div>` : ''}</details></div>` : '';
  return kind + nums + ask;
}
