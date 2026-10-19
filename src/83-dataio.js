// ------------------------------------------------------------------ all data in one Excel file, and back (ตกลง 19/10)
// The executive and the managers (their own branches) download the tables they pick, for the dates they pick.
// Columns marked "(แก้ได้)" can be changed in Excel and the file uploaded back: every change is listed first and
// the person ticks which ones to save (one by one, or all). Everything else is for reading only: it comes from
// IDS or is worked out by the system, and is ignored when the file comes back.
// Only function declarations here: the first render runs before this part of the file.
function dioCan() { return S.role.role === 'exec' || !!MGR_OF[S.role.role]; }
function dioBrs() { const own = S.role.role === 'exec' ? BRS : MGR_OF[S.role.role] || []; return S.br && own.includes(S.br) ? [S.br] : own; }
function dioEd(t) { return t + ' (แก้ได้)'; }
function dioTabs() {
  return [['sum', 'สรุป', 0], ['book', 'ใบจอง', 1], ['deliv', 'ส่งมอบ', 0], ['inv', 'ใบกำกับ', 1], ['other', 'ขายให้สาขาอื่น', 1], ['stock', 'Stock', 0],
    ['idsbk', 'Booking IDS', 0], ['queue', 'Match คิว', 0], ['quota', 'Quota', 0], ['lock', 'ล็อก', 0], ['cancel', 'ยกเลิก คืนเงิน', 0],
    ['recv', 'รับรถเข้า', 0], ['sales', 'เซลล์', 1], ['upl', 'ประวัติอัปโหลด', 0]];
}
function invNo(v) { return String(v ?? '').replace(/^0+/, '').trim(); }
function dioBtn() { return dioCan() ? `<button class="btn btn-ghost btn-sm" data-act="dio-open">ข้อมูลทั้งหมด (Excel)</button>` : ''; }
// ---- building the tables
function dioIn(d, c) { if (!c.from && !c.to) return true; const s = String(d || '').slice(0, 10); return !!s && (!c.from || s >= c.from) && (!c.to || s <= c.to); }
function dioBuild(k, D, c) {
  const brOk = b => c.brs.includes(b), lab = (T, v) => (T[v] || [v || ''])[0], spec = x => [x.model, x.grade, x.color];
  if (k === 'book') {
    const F = adBkFields(), atBy = new Map(D.at.map(a => [a.id, a]));
    const head = ['id', ...F.map(f => dioEd(f[1])), dioEd('สถานะ (ยกเลิก)'), dioEd('เอาออก (Y)'), 'สถานะคิว', 'คิวที่', 'ขั้นถัดไป', 'VIN ที่ได้', 'เลขที่ใบจอง IDS ที่จับคู่', 'วันที่ส่งมอบ', 'แหล่งที่มา', 'ประกัน', 'บันทึกเมื่อ'];
    const rows = [...S.bookings.entries()].filter(([, r]) => brOk(r.br) && dioIn(r.booking_date, c)).sort((x, y) => String(y[1].booking_date || '').localeCompare(String(x[1].booking_date || '')))
      .map(([id, r]) => { const a = atBy.get(id); return [id, ...F.map(([f]) => r[f] ?? ''), r.status === 'cancelled' ? 'ยกเลิก' : '', r.hidden ? 'Y' : '',
        a && a.row ? lab(BOOK_STATE, a.row.state) : '', a && a.row && a.row.pos || '', a ? (a.flow.next || '') : '', a ? atVin(a) || '' : '', a && a.match ? a.match.no || '' : '',
        a ? a.flow.deliveredDate || '' : '', r.source || '', r.insurance || '', String(r.created_at || '').slice(0, 16).replace('T', ' ')]; });
    return [head, ...rows];
  }
  if (k === 'deliv') {
    const prev = S.brScope; S.brScope = c.brs;
    let rows; try { rows = carListRows(D, { from: c.from || '2000-01-01', to: c.to || '2999-12-31' }, 'dv'); } finally { S.brScope = prev; }
    const atBy = new Map(D.at.map(a => [a.id, a]));
    return [['วันที่ส่งมอบ', 'วันที่ใบกำกับ', 'สาขา', 'รุ่น', 'เกรด', 'สี', 'VIN', 'ลูกค้า', 'เซลล์', 'ไฟแนนซ์', 'เลขที่ใบกำกับ', 'ป้ายแดง', 'ประกัน', 'ที่มา'],
      ...rows.map(r => { const dv = r.id && atBy.get(r.id) && atBy.get(r.id).rec.flow && atBy.get(r.id).rec.flow.delivered || {}; return [r.ddate || '', r.idate || '', r.br || '', r.model || '', r.grade || '', r.color || '', r.vin || '', r.cust || '', r.sales || '', r.fin || '', r.inv || '', dv.plate || '', dv.insurer || dv.insurance || '', r.src || '']; })];
  }
  if (k === 'inv' || k === 'other') {
    const want = k === 'other';
    const rows = c.brs.flatMap(b => invAllRows(b).map(r => ({ ...r, br: b }))).filter(r => !!r.other === want && dioIn(r.idate, c)).sort((x, y) => (y.idate || '').localeCompare(x.idate || ''));
    return [['สาขา', 'VIN', 'เลขที่ใบกำกับ', 'วันที่ใบกำกับ', dioEd('วันที่ส่งมอบ'), dioEd('ชื่อลูกค้า'), dioEd('เซลล์'), dioEd('ไฟแนนซ์'), 'เลขที่ใบจอง IDS', 'รุ่น', 'เกรด', 'สี', 'รถบริษัท'],
      ...rows.map(r => [r.br, r.vin || '', r.inv || '', r.idate || '', r.ddate || '', r.cust || '', r.sales || '', r.fin || '', r.no || '', r.model || '', r.grade || '', r.color || '', r.company ? 'Y' : ''])];
  }
  if (k === 'stock') {
    const rows = [...D.cars.values()].filter(x => brOk(x.br)).sort((x, y) => x.br.localeCompare(y.br) || String(x.stockin || '').localeCompare(String(y.stockin || '')));
    return [['สาขา', 'VIN', 'รุ่น', 'เกรด', 'สี', 'ปี', 'สถานะ', 'วันที่เข้าสต็อก', 'อายุสต็อก (วัน)', 'ล็อก / จัดสรรให้', 'เลขที่ใบจอง IDS', 'ลูกค้าใน IDS', 'หมายเหตุ'],
      ...rows.map(x => [x.br, x.vin, ...spec(x), x.year || '', lab(CAR_STATUS, x.status), x.stockin || '', x.stockin ? daysBetween(x.stockin, D.today) : '',
        (x.lock && (x.lock.sales || x.lock.prospect || x.lock.dealer_name)) || x.assignedTo || '', x.bkno || '', x.cust || '', x.note || ''])];
  }
  if (k === 'idsbk') return [['สาขา', 'วันที่จอง', 'เลขที่ใบจอง', 'ลูกค้า', 'เซลล์', 'รุ่น', 'เกรด', 'สี', 'VIN', 'Quota Ref'],
    ...D.X.bookings.filter(b => brOk(b.br) && dioIn(b.date, c)).map(b => [b.br, b.date || '', b.no || '', b.cust || '', b.sales || '', ...spec(b), b.vin || '', b.ref || ''])];
  if (k === 'queue') {
    const rows = D.bookings.filter(b => brOk(b.br) && dioIn(b.date, c)).sort((x, y) => String(x.spec).localeCompare(String(y.spec)) || (x.pos || 0) - (y.pos || 0));
    return [['สาขา', 'วันที่จอง', 'ลูกค้า', 'เซลล์', 'รุ่น', 'เกรด', 'สี', 'มาจาก', 'เลขที่ใบจอง IDS', 'สถานะ', 'คิวที่', 'VIN', 'มีฟอร์ม AT'],
      ...rows.map(b => [b.br, b.qdate || b.date || '', b.cust || '', b.owner || b.sales || '', ...spec(b), b.src === 'IDS' ? 'IDS' : 'ฟอร์ม AT', b.no || '', lab(BOOK_STATE, b.state), b.state === 'waiting' ? b.pos || '' : '', b.vin || '', b.app ? 'Y' : ''])];
  }
  if (k === 'quota') return [['สาขา', 'เดือน', 'Ref', 'รุ่น', 'เกรด', 'สี', 'VIN', 'สถานะ', 'เลขที่ใบจอง', 'จำนวน'],
    ...D.quota.filter(q => brOk(q.br)).map(q => [q.br, q.m || '', q.ref || '', ...spec(q), q.vin || '', q.st || '', q.bk || '', q.qty || 1])];
  if (k === 'lock') return [['id', 'รถ / Quota', 'สาขา', 'ประเภท', 'สถานะ', 'เซลล์', 'ลูกค้า / ดีลเลอร์', 'ขอเมื่อ', 'หมดล็อก', 'ผู้ขอ', 'เอาออก'],
    ...[...S.locks.entries()].filter(([, l]) => brOk(l.car_br) && dioIn(l.requested_at, c)).sort((x, y) => String(y[1].requested_at || '').localeCompare(String(x[1].requested_at || '')))
      .map(([id, l]) => [id, l.vin || 'Quota ' + (l.ref || ''), l.car_br || '', lab(LOCK_TYPE, l.type), adLockSt()[l.status] || l.status || '', l.sales || l.sales_nick || '', l.prospect || l.dealer_name || '', String(l.requested_at || '').slice(0, 10), l.end || '', l.role || '', l.hidden ? 'Y' : ''])];
  if (k === 'cancel') return [['วันที่ยกเลิก', 'สาขา', 'ลูกค้า', 'เซลล์', 'รุ่น', 'เหตุผล', 'มัดจำ (บาท)', 'เงินมัดจำ', 'ยอดคืน (บาท)', 'คืนแล้วเมื่อ'],
    ...[...S.bookings.values()].filter(r => r.status === 'cancelled' && brOk(r.br) && dioIn(r.cancelled_at || r.booking_date, c))
      .map(r => { const x = r.cancel || {}; return [String(r.cancelled_at || '').slice(0, 10), r.br || '', r.customer || '', r.sales || '', r.model || '', [x.reason, x.note].filter(Boolean).join(' · '), r.deposit ?? '', REFUND[x.refund] || x.refund || '', x.amount ?? '', r.refund && r.refund.at ? String(r.refund.at).slice(0, 10) : '']; })];
  if (k === 'recv') return [['วันที่เอกสาร', 'เลขที่เอกสาร', 'สาขา', 'VIN', 'รุ่น', 'เกรด', 'สี', 'สถานะ'],
    ...D.receipts.filter(r => brOk(r.br) && dioIn(r.doc_date, c)).flatMap(r => (r.cars || []).map(x => [r.doc_date || '', r.doc_no || '', r.br || '', x.vin || '', ...spec(x), r.status || '']))];
  if (k === 'sales') { const r = rosterOf(); return [[dioEd('ชื่อ-นามสกุล'), dioEd('สาขา'), dioEd('ชื่อเล่น (คั่นด้วยจุลภาค)'), dioEd('ลาออก (Y)')], ...r.list.filter(x => !x.br || brOk(x.br)).map(x => [x.name, x.br || '', nicksOf(x.name, r).join(', '), x.left ? 'Y' : ''])]; }
  if (k === 'upl') return [['เมื่อ', 'ตาราง', 'สาขา', 'เดือน', 'ไฟล์', 'ข้อมูล ณ', 'แถวเดิม', 'แถวใหม่', 'โดย'],
    ...[...S.uploads.values()].filter(u => brOk(u.br) && dioIn(u.at, c)).sort((x, y) => String(y.at || '').localeCompare(String(x.at || '')))
      .map(u => [String(u.at || '').slice(0, 16).replace('T', ' '), (SRC_LABEL[u.src] || u.src) + (u.kind === 'other' ? ' (สาขาอื่น)' : ''), u.br || '', u.m || '', u.file || '', u.asof || '', u.prevN ?? '', u.n ?? '', u.role || ''])];
  return [];
}
async function dioExport() {
  const m = S.modal; if (!m || !dioCan()) return;
  const pick = dioTabs().filter(([k]) => m.tabs[k]);
  if (!pick.length) { toast('เลือกอย่างน้อย 1 ตาราง', 'bad'); return; }
  if (m.from && m.to && m.from > m.to) { toast('วันเริ่มต้องไม่หลังวันสิ้นสุด', 'bad'); return; }
  let X; try { X = await loadXLSX(); } catch (e) { toast('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ', 'bad'); return; }
  const D = derive(), c = { from: m.from || '', to: m.to || '', brs: dioBrs() }, wb = X.utils.book_new(), counts = [];
  const tabs = pick.filter(([k]) => k !== 'sum').map(([k, n, ed]) => { const aoa = dioBuild(k, D, c); counts.push([n, Math.max(0, aoa.length - 1), ed ? 'แก้ได้บางคอลัมน์' : 'ดูอย่างเดียว']); return [n, aoa]; });
  if (m.tabs.sum) {
    const src = c.brs.map(b => { const s = D.X.src[b]; return [b, s.stock ? s.stock.asof : '', s.booking ? s.booking.asof : '', s.invoice ? s.invoice.asof : '', s.quota.map(q => q.m).join(', ')]; });
    tabs.unshift(['สรุป', [['AT Honda · ข้อมูลทั้งหมด'], ['ดาวน์โหลดเมื่อ', new Date().toLocaleString('th-TH')], ['โดย', roleLabel()], ['สาขา', c.brs.join(', ')], ['ช่วงวันที่', c.from || c.to ? `${c.from || 'ต้น'} ถึง ${c.to || 'ปัจจุบัน'}` : 'ทั้งหมด'], [],
      ['วิธีแก้แล้วอัปโหลดกลับ'], ['1. แก้ได้เฉพาะคอลัมน์ที่หัวมีคำว่า "(แก้ได้)" คอลัมน์อื่นมาจาก IDS หรือระบบคำนวณ แก้ไปก็ไม่ถูกนำเข้า'], ['2. ห้ามแก้คอลัมน์ id และ VIN ห้ามเปลี่ยนชื่อแท็บ'],
      ['3. อัปโหลดกลับที่ ภาพรวม → ข้อมูลทั้งหมด (Excel) ระบบแสดงทุกช่องที่เปลี่ยน ให้เลือกรายการหรือทั้งหมดก่อนบันทึก'], ['4. ลบแถวไม่ลบข้อมูล ถ้าจะเอาใบจองออกใส่ Y ในช่อง "เอาออก (Y)"'], [],
      ['ตาราง', 'จำนวนแถว', 'การแก้'], ...counts, [], ['ข้อมูล IDS ล่าสุด', 'Stock ณ', 'Booking ณ', 'DL ณ', 'Quota เดือน'], ...src]]);
  }
  tabs.forEach(([n, aoa]) => { const ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = (aoa[0] || []).map((h, i) => ({ wch: Math.min(40, Math.max(10, String(h).length + 2, ...aoa.slice(1, 200).map(r => String(r[i] ?? '').length + 1))) })); X.utils.book_append_sheet(wb, ws, n); });
  const buf = X.write(wb, { type: 'array', bookType: 'xlsx' });
  await docSave(docName('AT Honda ข้อมูลทั้งหมด', c.brs.length === BRS.length ? 'ทุกสาขา' : c.brs.join('-'), todayISO()) + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
// ---- the file back: list every change, the person ticks what to save
async function dioImport(file) {
  let X; try { X = await loadXLSX(); } catch (e) { toast('โหลดตัวอ่านไฟล์ Excel ไม่สำเร็จ', 'bad'); return; }
  let wb; try { wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); } catch (e) { toast('อ่านไฟล์ไม่ได้ ใช้ไฟล์ .xlsx ที่ดาวน์โหลดจากหน้านี้', 'bad'); return; }
  const rows = n => wb.Sheets[n] ? X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '', dateNF: 'yyyy-mm-dd' }) : null;
  const plan = { file: file.name, items: [], err: [], ro: [] }, brs = dioBrs();
  const col = (head, t) => head.indexOf(t);
  // bookings
  const bk = rows('ใบจอง');
  if (bk && bk.length) {
    const head = bk[0].map(String), F = adBkFields(), iId = col(head, 'id');
    if (iId < 0) plan.err.push('แท็บ "ใบจอง": ไม่พบคอลัมน์ id');
    else for (const row of bk.slice(1)) {
      const id = String(row[iId] || '').trim(); if (!id) continue;
      const r = S.bookings.get(id); if (!r) { plan.err.push(`ใบจอง: ไม่พบ id ${id} (ข้าม)`); continue; }
      const e = {};
      F.forEach(([k, t, ty]) => { const i = col(head, dioEd(t)); if (i < 0) { e[k] = r[k] ?? ''; return; } e[k] = ty === 'date' ? adDate(row[i]) : row[i]; if (!ty && typeof r[k] === 'string' && adStrip(e[k]) === adStrip(r[k])) e[k] = r[k]; });
      const iSt = col(head, dioEd('สถานะ (ยกเลิก)')), iOut = col(head, dioEd('เอาออก (Y)'));
      e.status = iSt < 0 ? (r.status === 'cancelled' ? 'cancelled' : '') : /ยกเลิก/.test(String(row[iSt] || '')) ? 'cancelled' : '';
      e.hidden = iOut < 0 ? !!r.hidden : /^y/i.test(String(row[iOut] || '').trim());
      const diff = adDiff(r, e);
      if (diff.length) plan.items.push({ tab: 'ใบจอง', key: id, title: r.customer || id, br: r.br, diff, ok: adminWrite(r.br) && brs.includes(r.br), on: true, e });
    }
  }
  // invoices: customer / other branches, by VIN
  for (const [tab, other] of [['ใบกำกับ', false], ['ขายให้สาขาอื่น', true]]) {
    const t = rows(tab); if (!t || !t.length) continue;
    const head = t[0].map(String), iBr = col(head, 'สาขา'), iVin = col(head, 'VIN'), iInv = col(head, 'เลขที่ใบกำกับ');
    const E = [['ddate', 'วันที่ส่งมอบ', 'date'], ['cust', 'ชื่อลูกค้า'], ['sales', 'เซลล์'], ['fin', 'ไฟแนนซ์']].map(([k, n, ty]) => [k, n, ty, col(head, dioEd(n))]).filter(x => x[3] >= 0);
    if (iVin < 0 || iBr < 0) { plan.err.push(`แท็บ "${tab}": ไม่พบคอลัมน์ สาขา หรือ VIN`); continue; }
    const byBr = {};
    for (const row of t.slice(1)) {
      const vin = String(row[iVin] || '').trim(), br = String(row[iBr] || '').trim(); if (!vin) continue;
      const all = byBr[br] ||= (BRS.includes(br) ? invAllRows(br) : []);
      const inv = iInv >= 0 ? String(row[iInv] || '').trim() : '';
      const cur = all.find(x => x.vin === vin && !!x.other === other && invNo(x.inv) === invNo(inv)) || (!inv ? all.find(x => x.vin === vin && !!x.other === other) : null);
      if (!cur) { plan.err.push(`${tab}: ไม่พบ ${vin} ในสาขา ${br || '?'} (ข้าม)`); continue; }
      const diff = [];
      E.forEach(([k, n, ty, i]) => { let nv = ty === 'date' ? adDate(row[i]) : String(row[i] ?? '').trim(); if (!ty && adStrip(nv) === adStrip(cur[k] || '')) nv = cur[k] || ''; if (String(nv || '') !== String(cur[k] || '')) diff.push({ k, t: n, ov: cur[k] || null, nv: nv || null }); });
      if (diff.length) plan.items.push({ tab, key: vin, title: `${vin}${cur.cust ? ' · ' + cur.cust : ''}`, br, diff, ok: adminWrite(br) && brs.includes(br), on: true, other, inv });
    }
  }
  // sales roster
  const sa = rows('เซลล์');
  if (sa && sa.length) {
    const p = { sales: [], err: [] }; adSalesPlan(sa, p);
    plan.err.push(...p.err);
    p.sales.forEach(x => plan.items.push({ tab: 'เซลล์', key: x.name, title: x.name, br: x.br, diff: x.ch.map(t => ({ t, ov: null, nv: null, text: true })), ok: adminWrite(), on: true, s: x }));
  }
  plan.ro = wb.SheetNames.filter(n => !['สรุป', 'ใบจอง', 'ใบกำกับ', 'ขายให้สาขาอื่น', 'เซลล์'].includes(n));
  S.modal.plan = plan; render();
}
async function dioApply() {
  const m = S.modal, p = m && m.plan; if (!p || p.busy) return;
  const sel = p.items.filter(x => x.on && x.ok); if (!sel.length) { toast('ยังไม่ได้เลือกรายการ', 'bad'); return; }
  const why = (m.why || '').trim(); if (!why) { toast('ใส่เหตุผลที่แก้', 'bad'); $('#dio-why')?.focus(); return; }
  p.busy = true; render();
  let n = 0, bad = 0;
  try {
    const sales = sel.filter(x => x.tab === 'เซลล์');
    if (sales.length) {
      const ok = await adSaveRoster(r => { for (const { s } of sales) { let x = r.list.find(y => y.name === s.name); if (!x) { x = { name: s.name }; r.list.push(x); } x.br = s.br; x.left = s.left || undefined; adSetNicks(r, s.name, s.nicks); } },
        'หลังบ้าน: นำเข้าไฟล์ข้อมูลทั้งหมด (เซลล์)', `${sales.map(x => x.key).join(', ')} · ${why}`);
      if (ok) n += sales.length; else bad += sales.length;
    }
    for (const x of sel.filter(y => y.tab === 'ใบจอง')) {
      const r = await saveBk(x.key, 'หลังบ้าน: นำเข้าไฟล์ข้อมูลทั้งหมด', `${x.diff.map(d => `${d.t} ${d.ov ?? '–'} → ${d.nv ?? '–'}`).join(' · ')} · ${why}`, cur => { adApply(cur, adDiff(cur, x.e), why); });
      if (r) n++; else bad++;
    }
    // invoices: one write per branch with every ticked car changed
    const inv = sel.filter(y => y.tab === 'ใบกำกับ' || y.tab === 'ขายให้สาขาอื่น'), byBr = {};
    inv.forEach(x => { (byBr[x.br] ||= []).push(x); });
    for (const [br, list] of Object.entries(byBr)) {
      const all = invAllRows(br);
      list.forEach(x => { const r = all.find(y => y.vin === x.key && !!y.other === x.other && invNo(y.inv) === invNo(x.inv)) || (!x.inv ? all.find(y => y.vin === x.key && !!y.other === x.other) : null); if (r) x.diff.forEach(d => { r[d.k] = d.nv; }); });
      if (await invStore(br, all, { asof: null, warn: [] })) {
        n += list.length;
        await write('uploads', newId('uploads'), { src: 'invoice', br, m: null, asof: null, file: p.file, sheet: 'แก้จากไฟล์ข้อมูลทั้งหมด', n: list.length, prevN: null, out: [], inN: 0, note: why, ...actor() });
      } else bad += list.length;
    }
  } finally { p.busy = false; }
  m.plan = null; toast(`บันทึกแล้ว ${n} รายการ${bad ? ` · ไม่สำเร็จ ${bad}` : ''}`, bad ? 'bad' : 'good'); render();
}
function dioModal(m) {
  const p = m.plan, brs = dioBrs();
  const tabs = dioTabs().map(([k, n, ed]) => `<label class="inline-flex items-center gap-2 text-sm"><input type="checkbox" class="w-4 h-4" data-modal="tabs.${k}" ${m.tabs[k] ? 'checked' : ''}> ${esc(n)}${ed ? ' <span class="text-xs text-muted">(แก้ได้)</span>' : ''}</label>`).join('');
  const sel = p ? p.items.filter(x => x.on && x.ok).length : 0;
  return `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">ข้อมูลทั้งหมด (Excel)</h2><div class="text-sm text-muted">สาขา ${esc(brs.join(', '))}</div></div><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <section class="border border-line rounded-lg p-3 mb-4"><h3 class="font-semibold mb-2">1. ดาวน์โหลด</h3>
    <div class="flex flex-wrap gap-2 mb-2"><button class="btn btn-ghost btn-sm" data-act="dio-all" data-v="1">เลือกทุกตาราง</button><button class="btn btn-ghost btn-sm" data-act="dio-all" data-v="">ไม่เลือกเลย</button></div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">${tabs}</div>
    <div class="flex flex-wrap gap-3 items-end"><div class="field"><label for="dio-from">ตั้งแต่วันที่</label><input id="dio-from" type="date" data-modal="from" value="${esc(m.from || '')}"></div>
      <div class="field"><label for="dio-to">ถึงวันที่</label><input id="dio-to" type="date" data-modal="to" value="${esc(m.to || '')}"></div>
      <button class="btn btn-dark" data-act="dio-export">ดาวน์โหลด (.xlsx)</button></div>
    <p class="text-xs text-muted mt-2">ไม่เลือกวันที่ = ทั้งหมด · ช่วงวันที่ใช้กับ วันที่จอง / ส่งมอบ / ใบกำกับ / ขอล็อก / ยกเลิก · Stock, Quota และเซลล์เป็นข้อมูลปัจจุบันเสมอ · คอลัมน์ที่หัวมีคำว่า "(แก้ได้)" แก้แล้วอัปโหลดกลับได้</p></section>
  <section class="border border-line rounded-lg p-3"><h3 class="font-semibold mb-2">2. อัปโหลดไฟล์ที่แก้แล้ว</h3>
    <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-diofile="1" aria-label="ไฟล์ข้อมูลทั้งหมดที่แก้แล้ว">
    <p class="text-xs text-muted mt-1">ระบบยังไม่บันทึก จะแสดงทุกช่องที่เปลี่ยนให้เลือกก่อน</p>
    ${p ? `<div class="mt-3"><div class="text-sm mb-2"><b>${esc(p.file)}</b> · พบ ${fmtN(p.items.length)} รายการที่เปลี่ยน${p.ro.length ? ` · แท็บที่ดูอย่างเดียว (ไม่นำเข้า): ${esc(p.ro.join(', '))}` : ''}</div>
      ${p.err.length ? box('warn', p.err.slice(0, 15).map(esc).join('<br>') + (p.err.length > 15 ? `<br>และอีก ${p.err.length - 15} ข้อ` : '')) : ''}
      ${p.items.length ? `<div class="flex flex-wrap gap-2 mb-2"><button class="btn btn-ghost btn-sm" data-act="dio-pick" data-v="1">เลือกทั้งหมด</button><button class="btn btn-ghost btn-sm" data-act="dio-pick" data-v="">ไม่เลือกเลย</button></div>
      <div class="border border-line rounded-lg max-h-96 overflow-auto"><table class="tbl text-sm"><thead><tr><th></th><th>แท็บ</th><th>รายการ</th><th>สาขา</th><th>ช่อง</th><th>เดิม</th><th>ใหม่</th></tr></thead><tbody>
        ${p.items.map((x, i) => x.diff.map((d, j) => `<tr ${x.ok ? '' : 'style="opacity:.5"'}>${j ? '<td></td><td></td><td></td><td></td>' : `<td><input type="checkbox" class="w-5 h-5" data-dio-item="${i}" ${x.on && x.ok ? 'checked' : ''} ${x.ok ? '' : 'disabled'} aria-label="บันทึกรายการนี้"></td><td class="nowrap">${esc(x.tab)}</td><td>${esc(x.title)}${x.ok ? '' : ' ' + chip('ไม่มีสิทธิ์แก้สาขานี้', 'muted')}</td><td>${esc(x.br || '')}</td>`}
          ${d.text ? `<td colspan="3">${esc(d.t)}</td>` : `<td>${esc(d.t)}</td><td>${esc(String(d.ov ?? '–'))}</td><td><b>${esc(String(d.nv ?? '–'))}</b></td>`}</tr>`).join('')).join('')}</tbody></table></div>
      <div class="field mt-3"><label for="dio-why" class="req">เหตุผลที่แก้</label><input id="dio-why" data-modal="why" value="${esc(m.why || '')}"></div>
      <div class="flex flex-wrap gap-2 mt-3"><button class="btn btn-red" data-act="dio-apply" ${sel && !p.busy ? '' : 'disabled'}>${p.busy ? '<span class="spin"></span> กำลังบันทึก…' : `บันทึก ${fmtN(sel)} รายการที่เลือก`}</button><button class="btn btn-ghost" data-act="dio-clear">ยกเลิกไฟล์นี้</button></div>` : '<p class="text-sm">ไม่มีช่องที่แก้ได้ที่เปลี่ยน</p>'}</div>` : ''}</section>`;
}
Object.assign(ACTIONS, {
  'dio-open'() { if (!dioCan()) return; const tabs = {}; dioTabs().forEach(([k]) => { tabs[k] = true; }); S.modal = { kind: 'dio', tabs, from: '', to: '', why: '', plan: null }; render(); },
  'dio-all'(el) { const m = S.modal; if (!m || m.kind !== 'dio') return; dioTabs().forEach(([k]) => { m.tabs[k] = !!el.dataset.v; }); render(); },
  async 'dio-export'() { await dioExport(); },
  'dio-pick'(el) { const p = S.modal && S.modal.plan; if (!p) return; p.items.forEach(x => { x.on = !!el.dataset.v && x.ok; }); render(); },
  'dio-clear'() { if (S.modal) S.modal.plan = null; render(); },
  async 'dio-apply'() { await dioApply(); }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset) return;
  if (t.dataset.diofile) { const f = t.files && t.files[0]; t.value = ''; if (f && S.modal && S.modal.kind === 'dio') dioImport(f); return; }
  if (t.dataset.dioItem !== undefined) { const p = S.modal && S.modal.plan, x = p && p.items[Number(t.dataset.dioItem)]; if (x && x.ok) x.on = t.checked; render(); }
});
// ---- one stored IDS table as a spreadsheet: search, sort by any column, download (ตกลง 19/10)
function idsViewBtn(src, br, inner, has) { return has ? `<button class="text-left w-full rounded hover:bg-surface-2 p-1 -m-1" data-act="ids-view" data-src="${src}" data-br="${br}" title="ดูข้อมูลเป็นตาราง">${inner}<div class="text-xs" style="color:var(--red)">ดูตาราง ›</div></button>` : inner; }
function idsViewHead() {
  return { vin: 'VIN', model: 'รุ่น', grade: 'เกรด', color: 'สี', year: 'ปี', note: 'หมายเหตุ', consign: 'ฝากขาย', stockin: 'วันที่เข้าสต็อก', prod: 'ผลิต', ref: 'Quota Ref', bkno: 'เลขที่ใบจอง', bknote: 'หมายเหตุใบจอง',
    cust: 'ลูกค้า', sold: 'แจ้งขาย', company: 'รถบริษัท', alloc: 'จัดสรร', bkdate: 'วันที่จอง', engine: 'เลขเครื่อง', no: 'เลขที่ใบจอง', date: 'วันที่จอง', sales: 'เซลล์', ids: 'IDS', ws: 'W/S Order',
    aging: 'อายุ', est: 'ประมาณการ', m: 'เดือน', vnote: 'หมายเหตุ VIN', qty: 'จำนวน', week: 'สัปดาห์', cdate: 'Create date', ndc: 'NDC out', dstock: 'Dealer stock in', otype: 'Order type',
    inv: 'เลขที่ใบกำกับ', idate: 'วันที่ใบกำกับ', ddate: 'วันที่ส่งมอบ', fin: 'ไฟแนนซ์', other: 'ขายให้สาขาอื่น', archived: 'เก็บสำรอง' };
}
function idsViewRows(src, br) {
  if (src === 'invoice') { const live = unpack(S.ids.get('invoice_' + br)), keys = new Set(live.map(invKey)); return { cols: [...PACK.invoice, 'archived'], rows: [...live, ...invArchiveRows(br, keys).map(r => ({ ...r, archived: true }))] }; }
  if (src === 'quota') return { cols: PACK.quota, rows: [...S.ids.values()].filter(d => d.src === 'quota' && d.br === br).sort((a, b) => String(a.m).localeCompare(String(b.m))).flatMap(d => unpack(d)) };
  return { cols: PACK[src], rows: unpack(S.ids.get(idsDocId(src, br))) };
}
function idsViewModal(m) {
  const H = idsViewHead(), { cols, rows } = idsViewRows(m.src, m.br), q = searchKey(m.q || '');
  const show = c => rows.some(r => r[c] !== null && r[c] !== undefined && r[c] !== '' && r[c] !== false);
  const C = cols.filter(show), val = v => v === true ? 'Y' : v === false || v === null || v === undefined ? '' : String(v);
  let list = q ? rows.filter(r => C.some(c => searchKey(val(r[c])).includes(q))) : rows.slice();
  if (m.sort) { const [c, dir] = m.sort; list.sort((a, b) => (dir ? -1 : 1) * val(a[c]).localeCompare(val(b[c]), 'th', { numeric: true })); }
  const doc = m.src === 'invoice' ? S.ids.get('invoice_' + m.br) : m.src === 'quota' ? null : S.ids.get(idsDocId(m.src, m.br));
  return `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">${esc(SRC_LABEL[m.src] || m.src)} · ${esc(m.br)}</h2>
      <div class="text-sm text-muted">${fmtN(rows.length)} แถว${doc ? ` · ข้อมูล ณ ${fmtD(doc.asof)} · ไฟล์ ${esc(doc.file || '')} · อัปโหลด ${fmtDT(doc.at)}` : ''}${m.src === 'invoice' ? ' · รวมรายการเก่าที่เก็บสำรอง' : ''}</div></div>
    <div class="flex gap-2"><button class="btn btn-dark btn-sm" data-act="ids-view-xlsx">ดาวน์โหลด Excel</button><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div></div>
  <div class="field mb-2" style="max-width:22rem"><label for="iv-q">ค้นหา (VIN ลูกค้า เซลล์ รุ่น …)</label><input id="iv-q" type="search" data-modal="q" value="${esc(m.q || '')}"></div>
  <div class="text-xs text-muted mb-1">${q ? `พบ ${fmtN(list.length)} แถว · ` : ''}กดหัวคอลัมน์เพื่อเรียง${list.length > 1000 ? ' · แสดง 1,000 แถวแรก (ดาวน์โหลดเพื่อดูทั้งหมด)' : ''}</div>
  <div class="border border-line rounded-lg overflow-auto" style="max-height:65vh"><table class="tbl text-xs"><thead><tr><th class="text-right">#</th>${C.map(c => `<th class="nowrap"><button data-act="ids-view-sort" data-c="${c}">${esc(H[c] || c)}${m.sort && m.sort[0] === c ? (m.sort[1] ? ' ▼' : ' ▲') : ''}</button></th>`).join('')}</tr></thead>
    <tbody>${list.slice(0, 1000).map((r, i) => `<tr><td class="text-right text-muted">${i + 1}</td>${C.map(c => `<td class="nowrap">${esc(val(r[c]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
async function idsViewXlsx() {
  const m = S.modal; if (!m || m.kind !== 'idsview') return;
  let X; try { X = await loadXLSX(); } catch (e) { toast('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ', 'bad'); return; }
  const H = idsViewHead(), { cols, rows } = idsViewRows(m.src, m.br), val = v => v === true ? 'Y' : v === false || v === null || v === undefined ? '' : v;
  const aoa = [cols.map(c => H[c] || c), ...rows.map(r => cols.map(c => val(r[c])))];
  const wb = X.utils.book_new(), ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = cols.map(() => ({ wch: 16 })); X.utils.book_append_sheet(wb, ws, (SRC_LABEL[m.src] || m.src).replace('/', '-'));
  const buf = X.write(wb, { type: 'array', bookType: 'xlsx' });
  await docSave(docName('IDS', SRC_LABEL[m.src] || m.src, m.br, todayISO()) + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
Object.assign(ACTIONS, {
  'ids-view'(el) { S.modal = { kind: 'idsview', src: el.dataset.src, br: el.dataset.br, q: '', sort: null }; render(); },
  'ids-view-sort'(el) { const m = S.modal; if (!m) return; const c = el.dataset.c; m.sort = m.sort && m.sort[0] === c ? [c, !m.sort[1]] : [c, false]; render(); },
  async 'ids-view-xlsx'() { await idsViewXlsx(); }
});
