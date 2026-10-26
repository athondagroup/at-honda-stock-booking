// ------------------------------------------------------------------ sales targets (invoices), branch × model × month (ตกลง 13/10)
// Kept in ref/targets: { rows: [{ m: 'YYYY-MM', br, model, n }], log }. The executive sets every branch, a manager only their own.
// Entered by typing, from an Excel form, or read by AI from a photo of the target table; always checked on screen before saving.
// Only function declarations here: the first render runs before this part of the file.
function tgtRows() { return (S.ref.get('targets') || {}).rows || []; }
function tgtEditBrs() { return S.role.role === 'exec' ? BRS : (MGR_OF[S.role.role] || []); }
function tgtCanEdit() { return perms().write && tgtEditBrs().length > 0; }
// target for a month (optionally one branch / one model), following the branch filter on screen
// the original target (before any adjustment)
function tgtBase(m, br, model) { return tgtRows().filter(r => r.m === m && (br ? r.br === br : inBr(r)) && (!model || r.model === model))
  .reduce((n, r) => n + (Number(r.n) || 0), 0); }
// the current target: the original with the adjustments (ปรับเป้า) of the month; one model = the original only
function tgtOf(m, br, model) { return tgtBase(m, br, model) + (model ? 0 : tgtAdjNet(m, br)); }
function tgtModels() { const s = new Set(Object.keys(CATALOG)); tgtRows().forEach(r => s.add(r.model)); return [...s]; }
function tgtMatchModel(t) {
  const k = norm(t); if (!k) return null;
  const ms = tgtModels();
  return ms.find(m => norm(m) === k) || ms.find(m => norm(m).startsWith(k) || k.startsWith(norm(m))) || ms.find(m => norm(m).includes(k)) || null;
}
function tgtMatchBr(t) {
  const s = String(t || '').trim().toUpperCase(); if (BR[s]) return s;
  const hit = BRS.find(b => String(t || '').includes(BR[b].name) || BR[b].name.includes(String(t || '').trim()));
  return hit || null;
}
// grid[branch][model index] = text in the box (model names hold spaces and colons, so inputs use the index)
function tgtGrid(m, models) {
  const g = {}; tgtEditBrs().forEach(b => { g[b] = models.map(md => { const r = tgtRows().find(x => x.m === m && x.br === b && x.model === md); return r ? String(r.n) : ''; }); });
  return g;
}
function tgtModal(m) {
  const brs = tgtEditBrs(), models = m.models, g = m.grid;
  const tot = b => g[b].reduce((n, v) => n + (Number(v) || 0), 0);
  const ai = m.ai || {};
  return `<div class="flex items-start justify-between gap-3 mb-2"><div><h2 class="font-head text-xl font-semibold">เป้าการขาย (ใบกำกับภาษี)</h2>
    <p class="text-sm text-muted">ตั้งเป้าเป็นจำนวนคัน แยกสาขา × รุ่น × เดือน · ${S.role.role === 'exec' ? 'ผู้บริหารแก้ได้ทุกสาขา' : `แก้ได้เฉพาะสาขา ${brs.join(', ')}`}</p></div>
    <button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="flex flex-wrap gap-3 items-end mb-3">
    <div class="field"><label for="tg-m">เดือน</label><input id="tg-m" type="month" value="${esc(m.m)}" data-tgt-month></div>
    <button class="btn btn-ghost btn-sm" data-act="tgt-xlsx-down">ดาวน์โหลดแบบฟอร์ม Excel</button>
    <label class="btn btn-ghost btn-sm relative">อัปโหลด Excel<input type="file" accept=".xlsx,.xls,.csv" data-tgt-xlsx class="absolute w-px h-px opacity-0"></label>
    <label class="btn btn-ghost btn-sm relative">${ai.busy ? '<span class="spin"></span> AI กำลังอ่านรูป…' : 'อัปโหลดรูปตารางเป้า (AI อ่าน)'}<input type="file" accept="image/*" data-tgt-img class="absolute w-px h-px opacity-0" ${ai.busy ? 'disabled' : ''}></label>
  </div>
  ${m.note ? `<div class="p-3 rounded-lg text-sm mb-3" style="background:var(--surface-2)">${m.note}</div>` : ''}
  <div class="bg-surface border border-line rounded-lg scroll-x max-h-[55vh] overflow-auto"><table class="tbl text-sm"><thead><tr><th>รุ่น</th>${brs.map(b => `<th class="text-right">${b}</th>`).join('')}<th class="text-right">รวม</th></tr></thead><tbody>
    ${models.map((md, i) => `<tr><td class="nowrap">${esc(md)}</td>${brs.map(b => `<td class="text-right"><input type="number" min="0" step="1" inputmode="numeric" aria-label="เป้า ${esc(md)} สาขา ${b}" data-modal="grid.${b}.${i}" data-tgt-cell value="${esc(g[b][i] ?? '')}" class="w-16 text-right num" style="background:${m.changed && m.changed[b + '|' + i] ? 'var(--warn-soft, #fff3cd)' : 'transparent'};border-bottom:1px solid var(--line)"></td>`).join('')}
      <td class="num text-right font-semibold">${fmtN(brs.reduce((n, b) => n + (Number(g[b][i]) || 0), 0))}</td></tr>`).join('')}
    <tr style="font-weight:600"><td>รวม</td>${brs.map(b => `<td class="num text-right">${fmtN(tot(b))}</td>`).join('')}<td class="num text-right">${fmtN(brs.reduce((n, b) => n + tot(b), 0))}</td></tr></tbody></table></div>
  <p class="text-xs text-muted mt-2">ช่องว่าง = ไม่มีเป้ารุ่นนั้น · ช่องสีเหลือง = ค่าที่ได้จากไฟล์หรือรูป ตรวจก่อนบันทึก</p>
  <div class="flex flex-wrap justify-end gap-2 mt-3"><button class="btn btn-ghost" data-act="close">ยกเลิก</button><button class="btn btn-red" data-act="tgt-save">บันทึกเป้า ${fmtM(m.m)}</button></div>`;
}
// rows read from a file or a photo: put them into the grid of the chosen month for review
function tgtApply(m, rows, src) {
  const brs = tgtEditBrs(), skip = [], months = new Set();
  let n = 0; m.changed = {};
  for (const r of rows) {
    const mon = r.m || m.m, br = r.br || (brs.length === 1 ? brs[0] : null), md = tgtMatchModel(r.model);
    if (mon !== m.m) { months.add(mon); continue; }
    if (!br || !brs.includes(br)) { skip.push(`${r.br || '?'} ${r.model || ''}: สาขานี้แก้ไม่ได้หรืออ่านสาขาไม่ออก`); continue; }
    if (!md) { skip.push(`${br} "${r.model}": ไม่พบรุ่นนี้`); continue; }
    const v = Number(r.n); if (!Number.isFinite(v) || v < 0) { skip.push(`${br} ${md}: จำนวนไม่ถูกต้อง`); continue; }
    const i = m.models.indexOf(md); m.grid[br][i] = String(Math.round(v)); m.changed[br + '|' + i] = true; n++;
  }
  m.note = `${src}: ใส่ในตาราง ${n} ช่อง ยังไม่บันทึก ตรวจแล้วกดบันทึก${months.size ? ` · ในไฟล์มีเดือนอื่นด้วย (${[...months].map(fmtM).join(', ')}) เลือกเดือนนั้นแล้วอัปโหลดอีกครั้ง` : ''}${skip.length ? `<div class="mt-1" style="color:var(--warn)">ข้าม ${skip.length} แถว: ${skip.slice(0, 6).map(esc).join(' · ')}${skip.length > 6 ? ' …' : ''}</div>` : ''}`;
}
async function tgtXlsxDown() {
  let X; try { X = await loadXLSX(); } catch (e) { toast('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ', 'bad'); return; }
  const m = S.modal, aoa = [['เดือน (YYYY-MM)', 'สาขา', 'รุ่น', 'เป้า (คัน)']];
  tgtEditBrs().forEach(b => m.models.forEach((md, i) => aoa.push([m.m, b, md, String(m.grid[b][i] ?? '').trim() === '' ? '' : Number(m.grid[b][i])])));
  const wb = X.utils.book_new(), ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 16 }, { wch: 8 }, { wch: 26 }, { wch: 12 }];
  X.utils.book_append_sheet(wb, ws, 'เป้า');
  const how = X.utils.aoa_to_sheet([['วิธีใช้'], ['ใส่จำนวนคันในคอลัมน์ "เป้า (คัน)" ช่องว่าง = ไม่มีเป้า'], ['เพิ่มเดือนอื่นได้โดยเพิ่มแถว (เดือนแบบ 2026-11)'], ['อัปโหลดกลับที่ ภาพรวม → ยอดขายและเป้า → ใส่ / แก้เป้า']]);
  X.utils.book_append_sheet(wb, how, 'วิธีใช้');
  const buf = X.write(wb, { type: 'array', bookType: 'xlsx' });
  await docSave(docName('เป้าการขาย', tgtEditBrs().join('-'), m.m) + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
function tgtMonthOf(v) {
  const s = String(v ?? '').trim(); let mm = s.match(/^(\d{4})-(\d{1,2})/); if (mm) return `${mm[1]}-${mm[2].padStart(2, '0')}`;
  mm = s.match(/^(\d{1,2})\/(\d{4})$/); if (mm) { let y = Number(mm[2]); if (y > 2400) y -= 543; return `${y}-${mm[1].padStart(2, '0')}`; }
  const d = adDate(s); return /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : null;
}
async function tgtXlsxUp(file) {
  let X; try { X = await loadXLSX(); } catch (e) { toast('โหลดตัวอ่านไฟล์ Excel ไม่สำเร็จ', 'bad'); return; }
  let wb; try { wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); } catch (e) { toast('อ่านไฟล์ไม่ได้', 'bad'); return; }
  const ws = wb.Sheets['เป้า'] || wb.Sheets[wb.SheetNames[0]];
  const aoa = X.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', dateNF: 'yyyy-mm' });
  const rows = aoa.slice(1).filter(r => String(r[2] || '').trim() && String(r[3] ?? '').trim() !== '').map(r => ({ m: tgtMonthOf(r[0]), br: tgtMatchBr(r[1]), model: String(r[2]).trim(), n: Number(String(r[3]).replace(/,/g, '')) }));
  if (!rows.length) { toast('ไม่พบแถวเป้าในไฟล์ ใช้แบบฟอร์มที่ดาวน์โหลดจากหน้านี้', 'bad'); return; }
  tgtApply(S.modal, rows, `ไฟล์ ${esc(file.name)}`); render();
}
const TGT_PROMPT = () => `This photo shows a monthly sales target table for AT Honda (a Honda dealer in Thailand), counted in cars (invoices).
Branches: ${BRS.map(b => `${b} = ${BR[b].name}`).join(', ')}.
Honda models used here: ${tgtModels().join(', ')}.
Read every target number. Return JSON only: {"rows":[{"month":"YYYY-MM or null","branch":"branch code or null","model":"model name as in the list","target":number}]}
Use the Gregorian year (Thai Buddhist year minus 543). If the month or branch is not shown, use null. Skip totals rows. Do not guess numbers you cannot read.`;
async function tgtImg(file) {
  const m = S.modal; m.ai = { busy: true }; render();
  try {
    const blob = await shrink(file);
    const res = await aiRead(TGT_PROMPT(), [blob]);
    const rows = (res && res.rows || []).map(r => ({ m: r.month ? tgtMonthOf(r.month) : null, br: tgtMatchBr(r.branch), model: r.model, n: r.target }));
    if (S.modal !== m) return;
    m.ai = {};
    if (!rows.length) { m.note = 'AI ไม่พบตัวเลขเป้าในรูปนี้ ลองถ่ายใหม่ให้เห็นตารางชัด ๆ หรือพิมพ์เอง'; render(); return; }
    tgtApply(m, rows, 'AI อ่านจากรูป'); render();
  } catch (e) { if (S.modal === m) { m.ai = {}; m.note = esc(aiMsg(e)); render(); } }
}
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !S.modal || S.modal.kind !== 'tgt') return;
  if (t.dataset.tgtMonth !== undefined && /^\d{4}-\d{2}$/.test(t.value)) { S.modal.m = t.value; S.modal.grid = tgtGrid(t.value, S.modal.models); S.modal.note = ''; S.modal.changed = {}; render(); return; }
  if (t.dataset.tgtCell !== undefined) { softRender(); return; }
  if (t.dataset.tgtXlsx !== undefined || t.dataset.tgtImg !== undefined) {
    const f = t.files && t.files[0]; t.value = ''; if (!f) return;
    if (t.dataset.tgtXlsx !== undefined) tgtXlsxUp(f); else tgtImg(f);
  }
});
Object.assign(ACTIONS, {
  'tgt-open'() { if (!tgtCanEdit()) return; const m = todayISO().slice(0, 7), models = tgtModels(); S.modal = { kind: 'tgt', m, models, grid: tgtGrid(m, models), note: '', changed: {} }; render(); },
  'tgt-xlsx-down'() { tgtXlsxDown(); },
  async 'tgt-save'() {
    const m = S.modal;
    const brs = tgtEditBrs(), cur = S.ref.get('targets') || { rows: [] };
    const keep = (cur.rows || []).filter(r => !(r.m === m.m && brs.includes(r.br)));
    const add = []; brs.forEach(b => m.grid[b].forEach((v, i) => { const n = Number(v); if (String(v ?? '').trim() !== '' && Number.isFinite(n) && n >= 0) add.push({ m: m.m, br: b, model: m.models[i], n: Math.round(n) }); }));
    const ok = await write('ref', 'targets', { rows: [...keep, ...add], at: new Date().toISOString(), log: [...(cur.log || []), { ...actor(), act: `ตั้งเป้า ${m.m}`, note: `${brs.join(', ')} รวม ${add.reduce((n, r) => n + r.n, 0)} คัน` }].slice(-60) });
    if (ok) { toast(`บันทึกเป้า ${fmtM(m.m)} แล้ว`); S.modal = null; render(); }
  }
});
