// ---------- หลังบ้าน: ค่าจดทะเบียน, เบี้ยประกัน, รายการ FOC (ขอ 31/10): edited here, saved to ref/fees and ref/foc
// The executive edits, the managers look. What is saved here wins over the files shipped with the site (foc.json / fees.json).
// Only function declarations and the ACTIONS / listeners at the end: the first render runs before this file.
const FEE_GRP = { city: 'City / City e:HEV', cityTurbo: 'City Turbo', cityHb: 'City Hatchback', wrv: 'WR-V', brv: 'BR-V', hrv: 'HR-V e:HEV', civic15: 'Civic 1.5', civic: 'Civic e:HEV (EL+ / RS)', civicEL: 'Civic e:HEV EL', accord15: 'Accord 1.5', accord: 'Accord e:HEV', crv15: 'CR-V 1.5', crv: 'CR-V e:HEV', step: 'STEP WGN e:HEV', en2: 'e:N2' };
function feState() { return S.fe = S.fe || { tab: 'reg', q: '', code: '', add: {}, show: 60 }; }
function feFees() { const f = feState(); if (!f.fees) f.fees = JSON.parse(JSON.stringify(refStatic('fees') || { reg: {}, ins: {} })); f.fees.reg = f.fees.reg || {}; f.fees.ins = f.fees.ins || {}; return f.fees; }
function feFoc() { const f = feState(); if (!f.foc) { const d = refStatic('foc') || { cols: ['model', 'cat', 'part', 'vendor', 'name', 'cost', 'sale', 'note', 'pieces', 'src'], rows: [] }; f.foc = JSON.parse(JSON.stringify(d)); } return f.foc; }
const feN = v => { const n = Number(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
function feRegTable(can) {
  const f = feFees(), keys = Object.keys(FEE_GRP).filter(k => f.reg[k]).concat(Object.keys(f.reg).filter(k => !FEE_GRP[k]));
  const inp = (path, v) => `<input type="number" min="0" step="100" class="w-28 text-right" data-fe="${path}" value="${esc(v ?? '')}" ${can ? '' : 'disabled'}>`;
  return `<div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl"><thead><tr><th>รุ่น</th><th class="text-right">บุคคลธรรมดา (บาท)</th><th class="text-right">นิติบุคคล (บาท)</th></tr></thead><tbody>
    ${keys.map(k => `<tr><td>${esc(FEE_GRP[k] || k)} <span class="text-xs text-muted">${esc(k)}</span></td><td class="text-right">${inp(`reg.${k}.0`, f.reg[k][0])}</td><td class="text-right">${inp(`reg.${k}.1`, f.reg[k][1])}</td></tr>`).join('')}</tbody></table></div>
    <p class="text-xs text-muted mt-2">ใช้เป็นทุน FOC ในใบสั่งแต่งรถเมื่อเลือกค่าจดทะเบียน "AT แถม" (ไม่ใช่ของลูกค้า) เซลล์แก้ตัวเลขในใบได้</p>`;
}
function feInsTable(can) {
  const f = feFees(), keys = Object.keys(FEE_GRP).filter(k => f.ins[k]).concat(Object.keys(f.ins).filter(k => !FEE_GRP[k]));
  const inp = (path, v) => `<input type="number" min="0" step="0.01" class="w-24 text-right" data-fe="${path}" value="${esc(v ?? '')}" ${can ? '' : 'disabled'}>`;
  const cell = (k, plan, n) => Array.from({ length: n }, (_, i) => inp(`ins.${k}.${plan}.${i}`, (f.ins[k][plan] || [])[i])).join(' ');
  return `<div class="field mb-2" style="max-width:240px"><label for="fe-m">เบี้ยของเดือนแคมเปญ</label><input id="fe-m" data-fe-meta="month" value="${esc(f.month || '')}" placeholder="เช่น 2026-10" ${can ? '' : 'disabled'}></div>
  <div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl text-sm"><thead><tr><th>รุ่น</th><th>ทำ 1 ปี · เบี้ยปี 1</th><th>ทำ 2 ปี · เบี้ยปี 1 / ปี 2</th><th>ทำ 3 ปี · เบี้ยปี 1 / ปี 2 / ปี 3</th></tr></thead><tbody>
    ${keys.map(k => `<tr><td>${esc(FEE_GRP[k] || k)} <span class="text-xs text-muted">${esc(k)}</span></td><td>${cell(k, '1', 1)}</td><td class="nowrap">${cell(k, '2', 2)}</td><td class="nowrap">${cell(k, '3', 3)}</td></tr>`).join('')}</tbody></table></div>
    <p class="text-xs text-muted mt-2">เบี้ยรวม VAT และอากรแล้ว · ใช้เป็นทุน FOC เมื่อเลือกประกันปีนั้นเป็น "AT แถม" · Honda แถมและลูกค้าซื้อไม่นับ FOC · เบี้ยแต่ละปีขึ้นกับจำนวนปีที่ทำประกัน (แผน 1/2/3 ปี)</p>`;
}
function feFocTable(can) {
  const d = feFoc(), f = feState(), ci = Object.fromEntries(d.cols.map((c, i) => [c, i])), q = f.q.trim().toLowerCase();
  const codes = [...new Set(d.rows.map(r => r[ci.model]))].sort();
  const all = d.rows.map((r, i) => ({ r, i })).filter(({ r }) => (!f.code || r[ci.model] === f.code) && (!q || String(r[ci.name]).toLowerCase().includes(q) || String(r[ci.part] || '').toLowerCase().includes(q) || String(r[ci.src] || '').toLowerCase().includes(q) || String(r[ci.cat] || '').toLowerCase().includes(q)));
  const list = all.slice(0, f.show);
  const inp = (i, c, w, type) => `<input ${type === 'n' ? 'type="number" min="0"' : ''} class="${w}" data-fe-foc="${i}.${c}" value="${esc(d.rows[i][ci[c]] ?? '')}" ${can ? '' : 'disabled'} style="background:transparent;border-bottom:1px solid var(--line)">`;
  const A = f.add || {};
  const add = can ? `<section class="bg-surface border border-line rounded-lg p-3 mb-3"><h3 class="font-medium text-sm mb-2">เพิ่มรายการ FOC</h3><div class="grid sm:grid-cols-4 gap-2">
      <div class="field"><label for="fa-m">รหัสรุ่น</label><input id="fa-m" list="fa-ms" data-fe-add="model" value="${esc(A.model || '')}" placeholder="เช่น CT, OT (ทุกรุ่น)"><datalist id="fa-ms">${codes.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
      <div class="field"><label for="fa-c">หมวด</label><input id="fa-c" data-fe-add="cat" value="${esc(A.cat || '')}" placeholder="เช่น ฟิล์ม, ทั่วไป"></div>
      <div class="field sm:col-span-2"><label for="fa-n">ชื่อรายการ</label><input id="fa-n" data-fe-add="name" value="${esc(A.name || '')}"></div>
      <div class="field"><label for="fa-p">หมายเลขอะไหล่</label><input id="fa-p" data-fe-add="part" value="${esc(A.part || '')}" placeholder="ของเทียบ: ATG-…"></div>
      <div class="field"><label for="fa-v">ผู้ขาย</label><input id="fa-v" data-fe-add="vendor" value="${esc(A.vendor || '')}"></div>
      <div class="field"><label for="fa-k">ทุน FOC</label><input id="fa-k" type="number" min="0" data-fe-add="cost" value="${esc(A.cost || '')}"></div>
      <div class="field"><label for="fa-s">ราคาขาย</label><input id="fa-s" type="number" min="0" data-fe-add="sale" value="${esc(A.sale || '')}"></div></div>
    <button class="btn btn-dark btn-sm mt-2" data-act="fe-foc-add">เพิ่มรายการ</button></section>` : '';
  return `${add}<div class="flex flex-wrap gap-2 items-end mb-2"><div class="field"><label for="fe-q">ค้นหา (ชื่อ, หมายเลขอะไหล่, หมวด)</label><input id="fe-q" type="search" data-fe-q="q" value="${esc(f.q)}" placeholder="กด Enter เพื่อค้นหา"></div>
    <div class="field"><label for="fe-c">รหัสรุ่น</label><select id="fe-c" data-fe-q="code"><option value="">ทุกรุ่น</option>${codes.map(c => `<option ${f.code === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    <span class="text-sm text-muted pb-2">พบ ${all.length} จาก ${d.rows.length} รายการ</span></div>
  <div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl text-sm"><thead><tr><th>รุ่น</th><th>หมวด</th><th>ชื่อรายการ</th><th>หมายเลขอะไหล่</th><th class="text-right">ทุน FOC</th><th class="text-right">ราคาขาย</th><th></th></tr></thead><tbody>
    ${list.map(({ r, i }) => `<tr><td class="text-xs">${esc(r[ci.model])}</td><td class="text-xs">${esc(r[ci.cat] || '')}</td><td style="min-width:240px">${inp(i, 'name', 'w-full')}${r[ci.pieces] ? '<div class="text-xs text-muted">ชุด: มีรายการชิ้นส่วนข้างใน</div>' : ''}</td><td>${inp(i, 'part', 'w-36 code text-xs')}</td><td class="text-right">${inp(i, 'cost', 'w-24 text-right', 'n')}</td><td class="text-right">${inp(i, 'sale', 'w-24 text-right', 'n')}</td>
      <td>${can ? `<button class="btn btn-ghost btn-sm" data-act="fe-foc-del" data-i="${i}" aria-label="ลบรายการ">×</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="text-muted">ไม่พบรายการ</td></tr>'}</tbody></table></div>
  ${all.length > list.length ? `<button class="btn btn-ghost btn-sm mt-2" data-act="fe-more">แสดงเพิ่ม (${all.length - list.length} รายการที่เหลือ)</button>` : ''}
  <p class="text-xs text-muted mt-2">ชุด DVP / แพ็คเกจ S ที่มีชิ้นส่วนข้างใน แก้ราคาชุดได้ แต่ชิ้นส่วนข้างในแก้ที่นี่ไม่ได้ · ของเทียบให้ใส่หมายเลขอะไหล่ขึ้นต้นด้วย ATG-</p>`;
}
function adminFees() {
  const f = feState(), can = adminWrite(), tb = (id, t) => `<button type="button" class="tab" aria-selected="${f.tab === id}" data-act="fe-tab" data-t="${id}">${t}</button>`;
  const body = f.tab === 'ins' ? feInsTable(can) : f.tab === 'foc' ? feFocTable(can) : feRegTable(can);
  const d = S.ref.get(f.tab === 'foc' ? 'foc' : 'fees') || {}, src = d.at ? `แก้ล่าสุดในเว็บ ${fmtD(d.at)}` : 'ยังใช้ข้อมูลที่แนบมากับเว็บ (ดึงจากชีต)';
  return `<div class="flex flex-wrap items-center gap-2 mb-3"><div class="tabs" role="tablist">${tb('reg', 'ค่าจดทะเบียน')}${tb('ins', 'เบี้ยประกัน')}${tb('foc', 'รายการ FOC')}</div>
    <span class="text-xs text-muted">${esc(src)}</span><span class="flex-1"></span>${can ? `<button class="btn btn-red btn-sm" data-act="fe-save">บันทึก${f.tab === 'foc' ? 'รายการ FOC' : f.tab === 'ins' ? 'เบี้ยประกัน' : 'ค่าจดทะเบียน'}</button>` : ''}</div>${body}`;
}
Object.assign(ACTIONS, {
  'fe-tab'(el) { feState().tab = el.dataset.t; render(); },
  'fe-more'() { feState().show += 100; render(); },
  'fe-foc-del'(el) { if (!adminWrite()) return; const d = feFoc(), i = Number(el.dataset.i); if (d.rows[i]) { d.rows.splice(i, 1); render(); } },
  'fe-foc-add'() {
    if (!adminWrite()) return; const d = feFoc(), A = feState().add || {}, ci = Object.fromEntries(d.cols.map((c, i) => [c, i]));
    if (!String(A.name || '').trim() || !String(A.model || '').trim()) { toast('ใส่รหัสรุ่นและชื่อรายการ', 'bad'); return; }
    const r = d.cols.map(() => ''); r[ci.model] = String(A.model).trim().toUpperCase(); r[ci.cat] = A.cat || 'เพิ่มเอง'; r[ci.name] = String(A.name).trim(); r[ci.part] = String(A.part || '').trim(); r[ci.vendor] = A.vendor || ''; r[ci.cost] = feN(A.cost); r[ci.sale] = feN(A.sale); r[ci.src] = 'เพิ่มในเว็บ';
    d.rows.unshift(r); feState().add = {}; feState().q = ''; toast('เพิ่มแล้ว (อยู่บนสุด) กด บันทึกรายการ FOC เพื่อเก็บ'); render();
  },
  async 'fe-save'() {
    if (!adminWrite()) return; const f = feState();
    if (f.tab === 'foc') {
      const d = feFoc(), ci = Object.fromEntries(d.cols.map((c, i) => [c, i])); d.rows.forEach(r => { r[ci.cost] = feN(r[ci.cost]); r[ci.sale] = feN(r[ci.sale]); });
      const prev = S.ref.get('foc') || {}, doc = { ...d, at: new Date().toISOString(), log: [...(prev.log || []).slice(-50), { ...actor(), n: d.rows.length }] };
      if (await write('ref', 'foc', doc)) { S.ref.set('foc', doc); f.foc = null; toast(`บันทึกรายการ FOC ${d.rows.length} รายการแล้ว`); render(); }
      return;
    }
    const x = feFees(), fix = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v.map(feN) : Object.fromEntries(Object.entries(v).map(([p, a]) => [p, a.map(feN)]))]));
    const prev = S.ref.get('fees') || {}, doc = { ...x, reg: fix(x.reg), ins: fix(x.ins), at: new Date().toISOString(), log: [...(prev.log || []).slice(-50), { ...actor() }] };
    if (await write('ref', 'fees', doc)) { S.ref.set('fees', doc); f.fees = null; toast(f.tab === 'ins' ? 'บันทึกเบี้ยประกันแล้ว' : 'บันทึกค่าจดทะเบียนแล้ว'); render(); }
  }
});
// typed values go into the working copy without redrawing (the cursor stays); the search and the filter redraw when they change
document.addEventListener('input', ev => {
  const t = ev.target; if (!t || !t.dataset || !S.fe) return;
  if (t.dataset.fe) { const p = t.dataset.fe.split('.'), f = feFees(); let o = f[p[0]]; for (let i = 1; i < p.length - 1; i++) { if (o[p[i]] === undefined) o[p[i]] = []; o = o[p[i]]; } o[p[p.length - 1]] = t.value; }
  else if (t.dataset.feMeta) feFees()[t.dataset.feMeta] = t.value;
  else if (t.dataset.feFoc) { const [i, c] = t.dataset.feFoc.split('.'), d = feFoc(), k = d.cols.indexOf(c); if (d.rows[Number(i)] && k >= 0) d.rows[Number(i)][k] = t.value; }
  else if (t.dataset.feAdd) { S.fe.add = S.fe.add || {}; S.fe.add[t.dataset.feAdd] = t.value; }
});
document.addEventListener('change', ev => { const t = ev.target; if (t && t.dataset && t.dataset.feQ && S.fe) { S.fe[t.dataset.feQ] = t.value; S.fe.show = 60; render(); } });
