// ---------- หลังบ้าน: รายการของแถมที่ใช้บ่อย (ref/gifts) — the same document the quotation page reads and saves (rows: label, mode fix|foc, cost, q, std, active)
// fix = cost is a fixed number; foc = cost is looked up in the FOC list by the search words in q (words separated by |). std = ticked by default.
// The executive edits, the managers look. Only function declarations and the ACTIONS / listeners at the end: the first render runs before this file.
function gfState() { return S.gf = S.gf || {}; }
function gfRows() {
  const g = gfState();
  if (!g.rows) g.rows = ((S.ref.get('gifts') || {}).rows || []).map(r => ({ label: r.label || '', mode: /^fix/i.test(r.mode || '') ? 'fix' : 'foc', cost: r.cost ?? '', q: r.q || '', std: !!r.std, active: r.active !== false }));
  return g.rows;
}
function adminGifts() {
  const g = gfState(), can = adminWrite(), rows = gfRows(), d = S.ref.get('gifts') || {};
  const src = d.at ? `แก้ล่าสุด ${fmtD(d.at)}` : 'ยังไม่เคยบันทึกในเว็บ';
  const inp = (i, c, w, ph) => `<input class="${w}" data-gf="${i}.${c}" value="${esc(rows[i][c] ?? '')}" ${ph ? `placeholder="${esc(ph)}"` : ''} ${can ? '' : 'disabled'} style="background:transparent;border:1px solid var(--line);border-radius:6px;padding:4px 6px">`;
  return `<div class="flex flex-wrap items-center gap-2 mb-2"><h2 class="font-medium">รายการของแถมที่ใช้บ่อย</h2><span class="text-xs text-muted">${esc(src)} · ${rows.length} รายการ · ใช้ร่วมกับหน้าใบเสนอราคา แก้ที่นี่ใบเสนอราคาเห็นเหมือนกัน</span><span class="flex-1"></span>${can ? '<button class="btn btn-ghost btn-sm" data-act="gf-add">+ เพิ่มรายการ</button><button class="btn btn-red btn-sm" data-act="gf-save">บันทึกรายการที่ใช้บ่อย</button>' : ''}</div>
  <p class="text-xs text-muted mb-2">วิธีคิดทุน: <b>fix</b> = ใส่ทุนเป็นตัวเลขคงที่ (0 = ไม่มีต้นทุน เช่น ฟรีเช็กระยะ) · <b>foc</b> = ไปหาทุนจากรายการ FOC ด้วยคำค้น (คั่นหลายคำด้วย |) · ติ๊ก "เริ่มต้น" = ถูกเลือกไว้ให้เองเมื่อเปิดใบเสนอราคา · เอาติ๊ก "ใช้งาน" ออก = ซ่อนโดยไม่ลบ</p>
  ${g.note ? `<p class="text-sm mb-2 p-2 rounded-lg" style="background:var(--surface-2)">${esc(g.note)}</p>` : ''}
  <div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl text-sm"><thead><tr><th>รายการ</th><th>วิธีคิดทุน</th><th class="text-right">ทุน fix (บาท)</th><th>คำค้นใน FOC</th><th>เริ่มต้น</th><th>ใช้งาน</th><th></th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr><td>${inp(i, 'label', 'w-72')}</td>
      <td><select data-gf="${i}.mode" ${can ? '' : 'disabled'}><option value="fix" ${r.mode === 'fix' ? 'selected' : ''}>fix</option><option value="foc" ${r.mode === 'foc' ? 'selected' : ''}>foc</option></select></td>
      <td class="text-right">${r.mode === 'fix' ? inp(i, 'cost', 'w-24 text-right', '0') : '<span class="text-muted">–</span>'}</td>
      <td>${r.mode === 'foc' ? inp(i, 'q', 'w-48', 'เช่น ฟิล์ม|3M') : '<span class="text-muted">–</span>'}</td>
      <td class="text-center"><input type="checkbox" data-gf="${i}.std" ${r.std ? 'checked' : ''} ${can ? '' : 'disabled'} aria-label="เริ่มต้น"></td>
      <td class="text-center"><input type="checkbox" data-gf="${i}.active" ${r.active ? 'checked' : ''} ${can ? '' : 'disabled'} aria-label="ใช้งาน"></td>
      <td>${can ? `<button class="btn btn-ghost btn-sm" data-act="gf-del" data-i="${i}" aria-label="ลบรายการ">×</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="text-muted">ยังไม่มีรายการ</td></tr>'}</tbody></table></div>`;
}
Object.assign(ACTIONS, {
  'gf-add'() { if (!adminWrite()) return; gfRows().push({ label: '', mode: 'fix', cost: 0, q: '', std: false, active: true }); gfState().note = 'เพิ่มแถวใหม่ท้ายตารางแล้ว ใส่ชื่อรายการแล้วกดบันทึก'; render(); },
  'gf-del'(el) { if (!adminWrite()) return; const i = Number(el.dataset.i), r = gfRows(); if (r[i]) { r.splice(i, 1); gfState().note = 'ลบแล้ว · ยังไม่บันทึก'; render(); } },
  async 'gf-save'() {
    if (!adminWrite()) return; const g = gfState(), rows = gfRows().filter(r => String(r.label || '').trim());
    const objs = rows.map(r => ({ label: String(r.label).trim(), mode: r.mode === 'fix' ? 'fix' : 'foc', cost: r.mode === 'fix' ? (String(r.cost ?? '').trim() === '' ? 0 : feN(r.cost)) : null, q: r.mode === 'foc' ? String(r.q || '').trim() : '', std: !!r.std, active: r.active !== false }));
    const prev = S.ref.get('gifts') || {}, a = actor(), doc = { ...prev, src: prev.src || '', rows: objs, at: a.at, log: [...(prev.log || []), { at: a.at, act: 'แก้ของแถมใช้บ่อย (หลังบ้าน AT stock)', note: `${objs.length} รายการ`, role: a.role }].slice(-300) };
    if (await write('ref', 'gifts', doc)) { S.ref.set('gifts', doc); g.rows = null; g.note = ''; toast(`บันทึกรายการที่ใช้บ่อย ${objs.length} รายการแล้ว`); render(); }
  }
});
document.addEventListener('input', ev => { const t = ev.target; if (!t || !t.dataset || !t.dataset.gf || !S.gf || !S.gf.rows) return; const [i, c] = t.dataset.gf.split('.'), r = S.gf.rows[Number(i)]; if (r && (c === 'label' || c === 'cost' || c === 'q')) r[c] = t.value; });
document.addEventListener('change', ev => { const t = ev.target; if (!t || !t.dataset || !t.dataset.gf || !S.gf || !S.gf.rows) return; const [i, c] = t.dataset.gf.split('.'), r = S.gf.rows[Number(i)]; if (!r) return; if (c === 'std' || c === 'active') r[c] = t.checked; else if (c === 'mode') { r.mode = t.value; render(); } });
