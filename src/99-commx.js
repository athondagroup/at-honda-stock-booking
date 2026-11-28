// ------------------------------------------------------------------ commission data: what a car still lacks, and the Excel export (28/11)
// commGaps: what is still missing for the commission claim of one car (the same check everywhere: person tables, the car
// list, the export). cmxModal: pick sellers, months, lists and column groups → one .xlsx, one sheet per seller (+ a summary).
// Sales export their own cars only, Margin / FOC included (for the claim). Managers: their branches; executive: all.
// Only function declarations here: the first render runs before this part of the file.
function commGaps(a, D) {
  if (!a || a.cancelled || a.demo) return [];
  const d = a.rec.deal || {}, fl = a.rec.flow || {}, g = [];
  if (!d.at) g.push('เงื่อนไขการขาย');
  else { if (!d.at_step) g.push('ช่อง STEP'); if (!d.reg_by) g.push('ผู้จ่ายค่าจดทะเบียน'); }
  if (!(fl.po && fl.po.at)) g.push(fl.po_skip ? 'ใบสั่งแต่ง (ข้ามไว้)' : 'ใบสั่งแต่ง');
  if (!fl.delivered) g.push('บันทึกส่งมอบ');
  if (!String(a.rec.receipt_no || '').trim()) g.push('เลขใบเสร็จ');
  if (d.at) { const foc = saleFoc(a).v, m = num(d.margin); if (foc && m > 0 && foc > 3 * m) g.push(`FOC ${money(foc)} สูงผิดปกติ`); }
  return g;
}
function commGapCell(a, D) {
  const g = commGaps(a, D);
  return g.length ? `<span class="text-xs font-semibold" style="color:var(--bad)">⚠ ขาด ${g.length}</span><div class="text-xs" style="color:var(--bad)">${g.map(esc).join(' · ')}</div>`
    : '<span class="text-xs font-semibold" style="color:var(--good)">✓ ครบ</span>';
}
function commGapBadge(list, D) {
  const n = (list || []).filter(a => commGaps(a, D).length).length;
  return n ? ` <span class="text-xs" style="color:var(--bad)" title="${n} คันข้อมูลเบิกค่าคอมยังไม่ครบ">⚠${n}</span>` : '';
}
// ---- the export
function cmxCanSeeAll() { return !isSales(); }
function cmxMonths(D) { const out = [], [y, m] = D.today.slice(0, 7).split('-').map(Number); for (let k = 0; k < 18; k++) { const t = new Date(Date.UTC(y, m - 1 - k, 1)); out.push(t.toISOString().slice(0, 7)); } return out; }
function cmxScope(fn) { const own = MGR_OF[S.role.role], prev = S.brScope; if (own) S.brScope = own; try { return fn(); } finally { S.brScope = prev; } }
function cmxSellers(D) {
  if (isSales()) return S.role.sales ? [S.role.sales] : [];
  return cmxScope(() => [...new Set(D.at.filter(a => inBr(a) && a.sales && !a.demo).map(a => a.sales))].sort((a, b) => a.localeCompare(b, 'th')));
}
const CMX_SETS = [['cm', 'เบิกค่าคอม'], ['inv', 'ใบกำกับ'], ['dv', 'ส่งมอบ'], ['bk', 'จอง'], ['cx', 'ยกเลิก'], ['tr', 'รถเก่า (เทิร์น)']];
const CMX_GROUPS = [['terms', 'เงื่อนไขการขาย (ซื้อสด/ไฟแนนซ์ ราคา ส่วนลด ดาวน์ ยอดจัด)'], ['camp', 'แคมเปญ และช่อง STEP'], ['margin', 'Margin / FOC / เหลือ-เกิน'], ['other', 'ประกัน ค่าจดทะเบียน ที่มา เงินจอง ใบเสร็จ']];
function cmxState(D) {
  const m = S.modal; if (m.who) return m;
  const last = (() => { try { return JSON.parse(localStorage.getItem('atCmx') || 'null'); } catch (e) { return null; } })() || {};
  const mo = D.today.slice(0, 7);
  Object.assign(m, { who: m.pre ? [m.pre] : isSales() ? cmxSellers(D) : [], from: m.month || mo, to: m.month || mo, sets: last.sets || { cm: true }, groups: last.groups || { terms: true, camp: true, margin: true, other: true } });
  return m;
}
function cmxModal(m, D) {
  const st = cmxState(D), sellers = cmxSellers(D), months = cmxMonths(D);
  const chk = (key, on, label) => `<label class="flex items-center gap-2 text-sm py-1"><input type="checkbox" data-act="cmx-t" data-k="${esc(key)}" ${on ? 'checked' : ''}> ${label}</label>`;
  const mSel = (k, v) => `<select class="p-1 rounded border border-line" data-cmx="${k}" style="background:var(--surface)">${months.map(x => `<option value="${x}" ${x === v ? 'selected' : ''}>${fmtM(x)}</option>`).join('')}</select>`;
  const n = st.who.length;
  return `<h2 class="font-head text-xl font-semibold mb-1">ดึงข้อมูลเซลล์ (Excel)</h2>
    <p class="text-sm text-muted mb-3">1 ไฟล์ · 1 แผ่นต่อ 1 เซลล์${n > 1 ? ' + แผ่นสรุป' : ''} · คอลัมน์ "ข้อมูลที่ยังไม่ครบ" บอกทุกคันที่ต้องเติมก่อนเบิก</p>
    <div class="grid gap-4 md:grid-cols-2">
      <div><div class="font-semibold text-sm mb-1">เซลล์ ${isSales() ? '' : `<button class="text-xs underline ml-2" data-act="cmx-all" data-v="1">เลือกทั้งหมด</button><button class="text-xs underline ml-2" data-act="cmx-all" data-v="">ล้าง</button>`}</div>
        <div class="max-h-60 overflow-auto border border-line rounded p-2">${sellers.map(s => chk('who:' + s, st.who.includes(s), salesName(s))).join('') || '<span class="text-sm text-muted">ไม่มี</span>'}</div></div>
      <div class="flex flex-col gap-3">
        <div><div class="font-semibold text-sm mb-1">เดือน</div><div class="flex items-center gap-2 text-sm">ตั้งแต่ ${mSel('from', st.from)} ถึง ${mSel('to', st.to)}</div></div>
        <div><div class="font-semibold text-sm mb-1">รายการที่ดึง</div>${CMX_SETS.map(([k, t]) => chk('set:' + k, st.sets[k], t + (k === 'cm' ? ' <span class="text-xs text-muted">(ตามเดือนเบิกค่าคอมในเว็บ)</span>' : ''))).join('')}</div>
        <div><div class="font-semibold text-sm mb-1">กลุ่มคอลัมน์ <span class="text-xs text-muted font-normal">ข้อมูลรถ/ลูกค้า และข้อมูลที่ยังไม่ครบ มีเสมอ</span></div>${CMX_GROUPS.map(([k, t]) => chk('grp:' + k, st.groups[k], t)).join('')}</div>
      </div></div>
    <div class="mt-4 flex gap-2 justify-end"><button class="btn btn-ghost" data-act="close">ยกเลิก</button>
      <button class="btn btn-red" data-act="cmx-go" ${n && Object.values(st.sets).some(Boolean) && st.from <= st.to ? '' : 'disabled'}>${st.busy ? '<span class="spin"></span> กำลังสร้างไฟล์…' : `ดึงข้อมูล ${n} คน`}</button></div>
    ${st.from > st.to ? '<p class="text-xs mt-2" style="color:var(--bad)">เดือนเริ่มต้องไม่หลังเดือนสุดท้าย</p>' : ''}`;
}
// the cars of one seller, per list, in the month range: [{ set, month, a }]
function cmxRows(D, who, st) {
  const ys = []; for (let y = Number(st.from.slice(0, 4)); y <= Number(st.to.slice(0, 4)); y++) ys.push(y);
  const out = [];
  cmxScope(() => ys.forEach(y => {
    const s = pmStats(D, a => inBr(a) && a.sales === who, y);
    CMX_SETS.forEach(([k]) => { if (!st.sets[k]) return; Object.keys(s).forEach(mo => { if (mo < st.from || mo > st.to) return; s[mo][k].forEach(a => out.push({ set: k, month: mo, a })); }); });
  }));
  return out;
}
function cmxSheet(X, D, who, st) {
  const G = st.groups, rows = cmxRows(D, who, st), setName = Object.fromEntries(CMX_SETS);
  const head = ['รายการ', 'เดือน', 'สาขา', 'ลูกค้า', 'รุ่น', 'เกรด', 'สี', 'VIN', 'วันที่จอง', 'เลขใบกำกับ', 'วันที่ใบกำกับ', 'วันส่งมอบ', 'เดือนเบิกค่าคอม'];
  const NUM = new Set();
  const add = (cols, isNum) => cols.forEach(c => { if (isNum && isNum.includes(c)) NUM.add(head.length); head.push(c); });
  if (G.terms) add(['ซื้อสด/ไฟแนนซ์', 'ไฟแนนซ์', 'ดอกเบี้ย %', 'งวด', 'ราคารถ', 'ค่าสี', 'บวกราคา', 'ส่วนลด', 'เงินดาวน์', 'ยอดจัด'], ['ราคารถ', 'ค่าสี', 'บวกราคา', 'ส่วนลด', 'เงินดาวน์', 'ยอดจัด']);
  if (G.camp) add(['แคมเปญ', 'เดือนแคมเปญ', 'ช่อง STEP']);
  if (G.margin) add(['Margin รถ', 'สนับสนุน AT', 'สนับสนุน Honda', 'สิทธิพิเศษ', 'Margin เพิ่ม', 'Margin รวม', 'FOC รวม', 'ที่มา FOC', 'เหลือ / เกิน (Margin − ส่วนลด − FOC)'], ['Margin รถ', 'สนับสนุน AT', 'สนับสนุน Honda', 'สิทธิพิเศษ', 'Margin เพิ่ม', 'Margin รวม', 'FOC รวม', 'เหลือ / เกิน (Margin − ส่วนลด − FOC)']);
  if (G.other) add(['ประกันชั้น 1', 'ค่าจดทะเบียน', 'ที่มาลูกค้า', 'เงินจอง', 'เลขใบเสร็จ'], ['เงินจอง']);
  head.push('ข้อมูลที่ยังไม่ครบ');
  const dt = x => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(x || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : null; };
  const v = x => x === undefined || x === null || x === '' ? null : x, n = x => x === undefined || x === null || x === '' ? null : Number(x);
  let gapCars = 0;
  const body = rows.map(({ set, month, a }) => {
    const d = a.rec.deal || {}, has = !!d.at, inv = soldInv(a, D) || {}, s = saleSum(a, D), ev = pmEvents(a, D).find(e => e[0] === 'cm');
    const gaps = commGaps(a, D); if (gaps.length) gapCars++;
    const r = [setName[set], fmtM(month), a.delivBr || a.br || '', a.cust || '', a.model || '', a.grade || '', a.color || '', atVin(a) || '', dt(a.date), v(inv.inv), dt(inv.idate), dt(s.ddate), ev ? fmtM(ev[2] || ev[1].slice(0, 7)) : null];
    if (G.terms) r.push(v(a.rec.purchase), v(d.fin_co || a.rec.finance), n(d.rate), n(d.term), n(d.price), n(d.paint), n(d.price_add), n(s.disc), n(d.down), n(d.fin_amount));
    if (G.camp) r.push(v(d.campaign), d.camp_month ? fmtM(d.camp_month) : null, d.at_step ? 'ช่อง ' + d.at_step : has ? 'ไม่ระบุ' : null);
    if (G.margin) r.push(n(d.margin_car), n(d.margin_at), n(d.margin_honda), n(d.margin_priv), n(d.margin_extra), has ? n(d.margin) : null, n(s.foc.v), v(s.foc.src), s.bal === null ? null : s.bal);
    if (G.other) r.push(v(d.ins1_by || a.rec.insurance), v(d.reg_by), v(a.rec.source), n(a.rec.deposit), v(a.rec.receipt_no));
    r.push(gaps.length ? gaps.join(' · ') : 'ครบ');
    return r;
  });
  const title = [`${salesName(who)} · ${fmtM(st.from)}${st.to !== st.from ? ' – ' + fmtM(st.to) : ''} · ${rows.length} รายการ · ข้อมูลไม่ครบ ${gapCars} คัน · ดึงเมื่อ ${fmtDT(new Date().toISOString())}`];
  const ws = X.utils.aoa_to_sheet([title, [], head, ...body]);
  for (let r = 0; r < body.length; r++) for (const c of NUM) { const ref = X.utils.encode_cell({ r: r + 3, c }); if (ws[ref] && typeof ws[ref].v === 'number') ws[ref].z = '#,##0;(#,##0)'; }
  ws['!cols'] = head.map(h => ({ wch: h === 'แคมเปญ' ? 50 : h === 'ข้อมูลที่ยังไม่ครบ' ? 45 : h === 'ลูกค้า' ? 24 : h === 'VIN' ? 20 : Math.max(9, Math.min(18, h.length + 2)) }));
  ws['!autofilter'] = { ref: X.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2 + body.length, c: head.length - 1 } }) };
  return { ws, n: rows.length, gap: gapCars };
}
async function cmxGo() {
  const D = derive(), st = cmxState(D); if (st.busy) return;
  const who = isSales() ? st.who.filter(isMine) : st.who; if (!who.length) return;
  try { localStorage.setItem('atCmx', JSON.stringify({ sets: st.sets, groups: st.groups })); } catch (e) { }
  st.busy = true; render();
  let X; try { X = await loadXLSX(); } catch (e) { st.busy = false; toast('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ', 'bad'); render(); return; }
  const wb = X.utils.book_new(), used = new Set(), sum = [];
  const sheetName = s => { let b = String(salesName(s) || s).replace(/<[^>]*>/g, '').replace(/[\[\]:*?/\\]/g, ' ').slice(0, 28).trim() || 'เซลล์', t = b, k = 2; while (used.has(t)) t = `${b.slice(0, 25)} ${k++}`; used.add(t); return t; };
  const sheets = who.map(s => ({ s, ...cmxSheet(X, D, s, st) }));
  if (who.length > 1) {
    const ws = X.utils.aoa_to_sheet([[`สรุป · ${fmtM(st.from)}${st.to !== st.from ? ' – ' + fmtM(st.to) : ''}`], [], ['เซลล์', 'รายการ', 'คันที่ข้อมูลยังไม่ครบ'], ...sheets.map(x => [String(salesName(x.s)).replace(/<[^>]*>/g, ''), x.n, x.gap])]);
    ws['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 22 }]; X.utils.book_append_sheet(wb, ws, 'สรุป'); used.add('สรุป');
  }
  sheets.forEach(x => X.utils.book_append_sheet(wb, x.ws, sheetName(x.s)));
  const buf = X.write(wb, { type: 'array', bookType: 'xlsx' });
  const nm = who.length === 1 ? String(salesName(who[0])).replace(/<[^>]*>/g, '') : `${who.length} คน`;
  await docSave(docName('ข้อมูลเซลล์', nm, st.from === st.to ? st.from : `${st.from}_${st.to}`) + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  st.busy = false; S.modal = null; render();
}
function cmxBtn(pre, month) { return `<button class="btn btn-ghost btn-sm" data-act="cmx-open" ${pre ? `data-who="${esc(pre)}"` : ''} ${month ? `data-m="${esc(month)}"` : ''}>ดึงข้อมูลเซลล์ (Excel)</button>`; }
Object.assign(ACTIONS, {
  'cmx-open'(el) { S.modal = { kind: 'cmx', pre: el.dataset.who || null, month: el.dataset.m || null }; render(); },
  'cmx-t'(el) {
    const st = S.modal; if (!st || st.kind !== 'cmx') return;
    const [k, ...rest] = el.dataset.k.split(':'), x = rest.join(':');
    if (k === 'who') { if (isSales()) return; st.who = st.who.includes(x) ? st.who.filter(y => y !== x) : [...st.who, x]; }
    else if (k === 'set') st.sets = { ...st.sets, [x]: !st.sets[x] };
    else if (k === 'grp') st.groups = { ...st.groups, [x]: !st.groups[x] };
    render();
  },
  'cmx-all'(el) { const st = S.modal; if (!st || isSales()) return; st.who = el.dataset.v ? cmxSellers(derive()) : []; render(); },
  'cmx-go'() { cmxGo(); }
});
document.addEventListener('change', ev => { const t = ev.target; if (!t || !t.dataset || !t.dataset.cmx || !S.modal || S.modal.kind !== 'cmx') return; S.modal[t.dataset.cmx] = t.value; render(); });
