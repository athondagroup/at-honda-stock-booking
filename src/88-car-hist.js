// ------------------------------------------------------------------ car history (ตกลง 19/10): every car that ever came in
// Each Stock upload replaces the stock table, so the history of each car (by VIN) is kept in its own docs
// ids/carlog_<br>_<year of first seen>: { cars: { vin: entry } }
//   entry = { m, g, c, p (prod), y, br, in (first seen), last (last seen), out: { d, why } | null,
//             mv: [{ d, from, to }], al: [{ no, cust, s, d }] (IDS allocations seen) }
// Everything else (locks, web bookings, DL invoices, deliveries, cars taken out) is read live and put on the same
// timeline. Executive and managers only.
// Only function declarations here: the first render runs before this part of the file.
function carlogAll() {
  const m = new Map();
  for (const [id, d] of S.ids) if (id.startsWith('carlog_') && d && d.cars) for (const [vin, e] of Object.entries(d.cars)) { const o = m.get(vin); if (!o || (e.last || '') > (o.e.last || '')) m.set(vin, { id, e }); }
  return m;
}
async function carlogUpdate(sel) {
  const all = carlogAll(), touched = new Map();
  const ent = (vin, br, d) => {
    let x = all.get(vin);
    if (!x) { x = { id: `carlog_${br}_${String(d || todayISO()).slice(0, 4)}`, e: { in: d, br } }; all.set(vin, x); }
    else x.e = JSON.parse(JSON.stringify(x.e));
    (touched.get(x.id) || touched.set(x.id, new Map()).get(x.id)).set(vin, x.e);
    all.set(vin, x);
    return x.e;
  };
  const addAl = (e, a) => {
    if (!a.no && !a.cust) return;
    e.al = e.al || [];
    const o = e.al.find(x => (a.no && x.no === a.no) || (!a.no && !x.no && x.cust === a.cust));
    if (o) Object.entries(a).forEach(([k, v]) => { if (v) o[k] = v; }); else e.al.push(Object.fromEntries(Object.entries(a).filter(([, v]) => v)));
    e.al = e.al.slice(-8);
  };
  for (const r of sel) {
    const d = r.asof || todayISO();
    if (r.src === 'stock') {
      for (const c of r.rows || []) {
        if (!c.vin) continue;
        const e = ent(c.vin, r.br, d);
        e.m = c.model || e.m; e.g = c.grade || e.g; e.c = c.color || e.c; e.p = c.prod || e.p || null; if (c.year) e.y = c.year;
        if (e.br && e.br !== r.br) e.mv = [...(e.mv || []), { d, from: e.br, to: r.br }].slice(-6);
        e.br = r.br;
        if (!e.in || d < e.in) e.in = d;
        if (!e.last || d > e.last) e.last = d;
        if (e.out && e.out.d <= d) e.out = null;
        addAl(e, { no: c.bkno || null, cust: c.cust || null, d: c.bkdate || d });
      }
      for (const o of (r.diff && r.diff.out) || []) {
        if (!o.vin) continue;
        const e = ent(o.vin, r.br, d);
        if (!e.m) { const [m, g, c] = String(o.spec || '').split('|'); e.m = m; e.g = g; e.c = c; }
        if (o.p && !e.p) e.p = o.p;
        if (!e.br) e.br = r.br;
        if (e.br === r.br && !(e.last && e.last > d)) e.out = { d, why: o.why || '' };
        addAl(e, { no: o.bk || null, cust: o.cust || null });
      }
    } else if (r.src === 'booking') {
      for (const b of r.rows || []) { if (b.vin && all.has(b.vin)) addAl(ent(b.vin, r.br, d), { no: b.no || null, cust: b.cust || null, s: b.sales || null, d: b.date || null }); }
    }
  }
  for (const [id, m] of touched) {
    let doc = S.ids.has(id) ? await claimFresh('ids', id, () => true) : { cars: {} };
    if (!doc) continue;
    const [, br, y] = id.split('_');
    doc.cars = doc.cars || {}; m.forEach((e, v) => { doc.cars[v] = e; });
    Object.assign(doc, { src: 'carlog', br, y, n: Object.keys(doc.cars).length }, actor());
    if (utf8len(doc) > 250000) { toast(`ประวัติรถ ${br} ปี ${y} ใหญ่เกินที่เก็บได้ แจ้งผู้ดูแลระบบ`, 'bad'); continue; }
    await write('ids', id, doc);
  }
}
// once: build the car log from the stock / booking tables kept before this feature (backups of each upload),
// oldest first, with the reason each car left taken from the upload history. Run by the executive's browser.
async function carlogSeed() {
  if (S.ids.has('carlog_meta') || S.role.role !== 'exec' || !perms().write || !(window.__WEB && window.__WEB.docsLog)) return;
  const ids = BRS.flatMap(b => ['stock_' + b, 'booking_' + b]);
  const logs = await window.__WEB.docsLog(ids);
  const snaps = [...logs.filter(x => x && x.data && x.data.cols), ...ids.filter(id => S.ids.get(id)).map(id => ({ id, data: S.ids.get(id), at: new Date().toISOString() }))];
  const why = new Map();
  [...S.uploads.values()].filter(u => u.src === 'stock').sort((a, b) => (a.at || '').localeCompare(b.at || '')).forEach(u => (u.out || []).forEach(o => why.set(o.vin, (o.res && o.res.text) || o.why)));
  const prev = {}, sel = [];
  for (const s of snaps) {
    const [src, br] = s.id.split('_'), rows = unpack(s.data), asof = s.data.asof || String(s.at).slice(0, 10);
    if (src === 'stock') {
      const p = prev[br], now = new Set(rows.map(r => r.vin));
      const out = p ? p.filter(c => !now.has(c.vin)).map(c => ({ vin: c.vin, spec: specKey(c.model, c.grade, c.color), why: why.get(c.vin) || 'ไม่อยู่ในไฟล์ Stock รอบถัดไป', p: c.prod || null, bk: c.bkno || null, cust: c.cust || null })) : [];
      prev[br] = rows; sel.push({ src, br, asof, rows, diff: { out } });
    } else sel.push({ src, br, asof, rows });
  }
  await carlogUpdate(sel);
  await write('ids', 'carlog_meta', { src: 'carlog_meta', seeded: snaps.length, ...actor() });
  toast(`สร้างประวัติรถจากข้อมูลเดิมแล้ว (${snaps.length} ตาราง)`);
}
// one row per VIN: the car log + today's stock + DL invoices + locks + web bookings
function carHistRows(D) {
  const rows = new Map();
  const row = vin => rows.get(vin) || rows.set(vin, { vin, al: [], inv: [], locks: [], web: [] }).get(vin);
  for (const [vin, { e }] of carlogAll()) Object.assign(row(vin), { model: e.m, grade: e.g, color: e.c, prod: e.p || null, br: e.br, in: e.in || null, last: e.last || null, out: e.out || null, mv: e.mv || [], al: [...(e.al || [])], logged: true });
  const addAl = (r, a) => { if ((a.no || a.cust) && !r.al.some(x => (a.no && x.no === a.no) || (!a.no && x.cust === a.cust))) r.al.push(a); };
  for (const c of [...D.cars.values(), ...D.deliveredOut]) {
    const r = row(c.vin);
    Object.assign(r, { model: c.model || r.model, grade: c.grade || r.grade, color: c.color || r.color, prod: c.prod || r.prod || null, br: c.br || r.br });
    if (D.cars.has(c.vin)) { r.now = c; r.out = null; }
    addAl(r, { no: c.bkno || null, cust: c.cust || null, d: c.bkdate || null });
  }
  for (const b of D.idsB) if (b.vin) { const r = rows.get(b.vin); if (r) { const o = r.al.find(x => x.no && x.no === b.no); if (o) { o.s = o.s || b.sales; o.cust = o.cust || b.cust; } else addAl(r, { no: b.no, cust: b.cust, s: b.sales, d: b.date }); } }
  for (const i of D.X.inv) {
    if (!i.vin) continue;
    const r = row(i.vin);
    if (!r.model) Object.assign(r, { model: i.model, grade: i.grade, color: i.color, br: i.br });
    if (!r.inv.some(x => x.inv === i.inv && x.idate === i.idate)) r.inv.push(i);
  }
  for (const l of D.locks) if (l.vin) row(l.vin).locks.push(l);
  for (const a of D.at) {
    const f = a.rec.flow || {}, vin = (f.assign && f.assign.vin) || (a.match && a.match.vin) || null;
    if (vin) row(vin).web.push(a);
  }
  const out = [...rows.values()].filter(r => r.model || r.logged);
  out.forEach(r => {
    r.spec = specKey(r.model, r.grade, r.color);
    r.inv.sort((a, b) => (b.idate || '').localeCompare(a.idate || ''));
    r.lastInv = r.inv.find(i => !i.company && !i.other) || r.inv[0] || null;
    r.date = r.in || (r.lastInv && r.lastInv.idate) || r.prod || null;
    r.al.sort((a, b) => (a.d || '').localeCompare(b.d || ''));
    r.lastAl = r.al[r.al.length - 1] || null;
    r.state = r.now ? 'stock' : r.lastInv && r.lastInv.ddate ? 'delivered' : r.lastInv ? 'invoiced' : r.out ? 'out' : 'unknown';
  });
  return out;
}
function carHistState(r) {
  if (r.state === 'stock') return `${statusChip(CAR_STATUS, r.now.status)}`;
  if (r.state === 'delivered') return chip(r.lastInv.other ? `ขายให้${r.lastInv.to && BRS.includes(r.lastInv.to) ? 'สาขา ' + r.lastInv.to : 'ดีลเลอร์/สาขาอื่น'}` : `ส่งมอบ ${fmtD(r.lastInv.ddate)}`, 'muted');
  if (r.state === 'invoiced') return chip(r.lastInv.other ? 'ขายให้สาขาอื่น/ดีลเลอร์' : `ออกใบกำกับ ${fmtD(r.lastInv.idate)}`, 'neutral');
  if (r.state === 'out') return `${chip('ออกจากสต็อก', 'muted')}<div class="text-xs text-muted">${esc(r.out.why || '')}</div>`;
  return chip('ไม่ทราบ', 'muted');
}
function carHistFilter(D) {
  const f = S.filters, q = searchKey(f.chQ || ''), at = f.chAt || '';
  let list = carHistRows(D).filter(r => !S.br || r.br === S.br);
  if (f.chModel) list = list.filter(r => r.model === f.chModel);
  if (f.chGrade) list = list.filter(r => r.grade === f.chGrade);
  if (f.chColor) list = list.filter(r => String(r.color || '').toUpperCase() === String(f.chColor).toUpperCase());
  if (at) list = list.filter(r => r.in && r.in <= at && !(r.out && r.out.d <= at) && !(r.lastInv && r.lastInv.ddate && r.lastInv.ddate <= at));
  else {
    if (f.chFrom) list = list.filter(r => (r.date || '') >= f.chFrom);
    if (f.chTo) list = list.filter(r => r.date && r.date <= f.chTo);
  }
  if (f.chState) list = list.filter(r => f.chState === 'sold' ? ['delivered', 'invoiced'].includes(r.state) : r.state === f.chState);
  if (q) list = list.filter(r => [r.vin, ...r.al.flatMap(a => [a.no, a.cust, a.s]), ...r.inv.flatMap(i => [i.cust, i.sales, i.inv]), ...r.locks.flatMap(l => [l.prospect, l.owner, l.dealer_name]), ...r.web.flatMap(a => [a.cust, a.sales])].some(x => x && searchKey(x).includes(q)));
  return list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.vin.localeCompare(b.vin));
}
function carHistView(D) {
  const f = S.filters, list = carHistFilter(D);
  const all = carHistRows(D), models = [...new Set(all.map(r => r.model).filter(Boolean))].sort();
  const grades = [...new Set(all.filter(r => !f.chModel || r.model === f.chModel).map(r => r.grade).filter(Boolean))].sort();
  const colors = [...new Set(all.filter(r => (!f.chModel || r.model === f.chModel) && (!f.chGrade || r.grade === f.chGrade)).map(r => String(r.color || '').toUpperCase()).filter(Boolean))].sort();
  const sel = (id, k, t, opts) => `<div class="field"><label for="${id}">${t}</label><select id="${id}" data-filter="${k}"><option value="">ทั้งหมด</option>${opts.map(o => `<option ${f[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
  const st = [['', 'ทั้งหมด'], ['stock', 'อยู่ในสต็อกตอนนี้'], ['sold', 'ขาย / ออกใบกำกับแล้ว'], ['out', 'ออกจากสต็อก (ไม่มีใบกำกับ)']];
  const lockTxt = r => { const ls = r.locks.slice().sort((a, b) => (b.requested_at || '').localeCompare(a.requested_at || '')); if (!ls.length) return ''; const l = ls[0]; return `${ls.length} ครั้ง<div class="text-xs text-muted">ล่าสุด ${esc(l.owner || '')} · ${esc(lockIdsCust(l) || '')} · ${esc(lockStatusTxt(l.status))}</div>`; };
  const fmt = r => `<tr>
    <td class="nowrap"><button class="code underline" data-act="carhist-open" data-id="${esc(r.vin)}">${esc(r.vin)}</button></td>
    <td class="nowrap">${specLabel(r.spec)}</td><td>${esc(r.br || '')}</td><td class="num nowrap">${r.prod ? fmtD(r.prod) : '–'}</td><td class="num nowrap">${r.in ? fmtD(r.in) : '<span class="text-muted">–</span>'}</td>
    <td style="min-width:170px">${r.lastAl ? `${esc(r.lastAl.cust || '')}<div class="text-xs text-muted">${esc(r.lastAl.no || '')}${r.lastAl.s ? ' · ' + esc(r.lastAl.s) : ''}${r.al.length > 1 ? ` · เคยจัดสรร ${r.al.length} ครั้ง` : ''}</div>` : '<span class="text-muted">–</span>'}</td>
    <td style="min-width:140px">${lockTxt(r) || '<span class="text-muted">–</span>'}</td>
    <td style="min-width:170px">${r.lastInv ? `${esc(r.lastInv.cust || r.lastInv.to || '')}<div class="text-xs text-muted">ใบกำกับ ${fmtD(r.lastInv.idate)}${r.lastInv.ddate ? ' · ส่งมอบ ' + fmtD(r.lastInv.ddate) : ''}${r.lastInv.sales ? ' · ' + esc(r.lastInv.sales) : ''}</div>` : '<span class="text-muted">–</span>'}</td>
    <td style="min-width:130px">${carHistState(r)}</td></tr>`;
  return `${pageHead('สต็อกรถ', 'ประวัติรถรายคัน: เข้าสต็อกเมื่อไร IDS จัดสรรให้ใคร ใครเคยล็อก ออกใบกำกับ / ส่งมอบให้ใคร (ผู้บริหารและผู้จัดการ)', '')}
  ${brSeg()}
  <div class="flex flex-wrap items-center justify-between gap-3 mb-3">${stockSeg('hist')}</div>
  <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end mb-3">
    ${sel('ch-m', 'chModel', 'รุ่น', models)}${sel('ch-g', 'chGrade', 'เกรด', grades)}${sel('ch-c', 'chColor', 'สี', colors)}
    <div class="field"><label for="ch-s">สถานะ</label><select id="ch-s" data-filter="chState">${st.map(([k, t]) => `<option value="${k}" ${(f.chState || '') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label for="ch-f">เข้าตั้งแต่</label><input id="ch-f" type="date" data-filter="chFrom" value="${esc(f.chFrom || '')}" ${f.chAt ? 'disabled' : ''}></div>
    <div class="field"><label for="ch-t">ถึง</label><input id="ch-t" type="date" data-filter="chTo" value="${esc(f.chTo || '')}" ${f.chAt ? 'disabled' : ''}></div>
    <div class="field"><label for="ch-at">สต็อก ณ วันที่</label><input id="ch-at" type="date" data-filter="chAt" value="${esc(f.chAt || '')}"></div>
    <div class="field col-span-2 sm:grow sm:max-w-xs"><label for="ch-q">ค้นหา VIN / ลูกค้า / เซลล์ / เลขใบจอง</label><input id="ch-q" type="search" data-filter="chQ" value="${esc(f.chQ || '')}"></div>
    <button class="btn btn-ghost btn-sm" data-act="carhist-clear">ล้างตัวกรอง</button>
    <button class="btn btn-ghost btn-sm" data-act="carhist-xlsx">ดาวน์โหลด Excel</button>
  </div>
  <p class="text-sm mb-2"><b class="num">${list.length}</b> คัน${f.chAt ? ` · สต็อก ณ ${fmtD(f.chAt)} (นับจากประวัติการอัปโหลด Stock ที่เก็บไว้)` : ''} · <span class="text-muted">กด VIN เพื่อดูไทม์ไลน์ของคันนั้น</span></p>
  <div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl">
    <thead><tr><th>VIN</th><th>รุ่น / เกรด / สี</th><th>สาขา</th><th>วันผลิต</th><th>เข้าสต็อก</th><th>IDS จัดสรรให้</th><th>ล็อก</th><th>ใบกำกับ / ส่งมอบ</th><th>ตอนนี้</th></tr></thead>
    <tbody>${list.slice(0, 500).map(fmt).join('') || `<tr><td colspan="9">${emptyBox('ไม่พบรถตามตัวกรองนี้', 'ลองล้างตัวกรอง')}</td></tr>`}</tbody></table></div>
  ${list.length > 500 ? '<p class="text-xs text-muted mt-2">แสดง 500 คันแรก ใช้ตัวกรอง หรือดาวน์โหลด Excel เพื่อดูทั้งหมด</p>' : ''}
  <p class="text-xs text-muted mt-2">วันเข้าสต็อก = วันที่ของไฟล์ Stock แรกที่พบรถคันนี้ (เก็บตั้งแต่ 19/10/26) · รถที่ขายก่อนหน้านั้นดูได้จาก DL (ใบกำกับ / ส่งมอบ)</p>`;
}
function lockStatusTxt(s) { return { pending: 'รออนุมัติ', approved: 'ล็อกอยู่', allocated: 'แจ้งจัดสรรแล้ว', done: 'สำเร็จ', released: 'ปล่อยแล้ว', rejected: 'ไม่อนุมัติ', withdrawn: 'ถอนคำขอ', bumped: 'มีคนจองก่อน', converted: 'เปลี่ยนเป็นล็อกใบจอง', cancelled: 'ยกเลิก' }[s] || s || ''; }
function stockSeg(mode) {
  return `<div class="seg" role="group" aria-label="มุมมอง"><button data-act="sub" data-key="stock" data-sub="spec" aria-pressed="${mode === 'spec'}">ตามสเปก</button><button data-act="sub" data-key="stock" data-sub="list" aria-pressed="${mode === 'list'}">รายคัน${isSales() ? '' : ' พร้อมชื่อลูกค้า'}</button>${S.spCount || spCan() ? `<button data-act="sub" data-key="stock" data-sub="sp" aria-pressed="${mode === 'sp'}">รถพิเศษ${S.spCount ? ' (' + S.spCount + ')' : ''}</button>` : ''}${perms().approve ? `<button data-act="sub" data-key="stock" data-sub="hist" aria-pressed="${mode === 'hist'}">ประวัติรถ</button>` : ''}</div>`;
}
// every event of one car, oldest first
function carHistEvents(r) {
  const ev = [], add = (at, what, note, who) => { if (at) ev.push({ at: String(at), what, note: note || '', who: who || '' });
  };
  if (r.prod) add(r.prod, 'ผลิต');
  if (r.in) add(r.in, `เข้าสต็อก ${r.br && !(r.mv || []).length ? r.br : (r.mv && r.mv[0] ? r.mv[0].from : r.br) || ''}`, 'พบในไฟล์ Stock IDS ครั้งแรก');
  (r.mv || []).forEach(m => add(m.d, `ย้ายสาขา ${m.from} → ${m.to}`));
  r.al.forEach(a => add(a.d || r.in, 'IDS จัดสรรให้', [a.cust, a.no ? 'ใบจอง ' + a.no : '', a.s ? 'เซลล์ ' + a.s : ''].filter(Boolean).join(' · ')));
  r.locks.forEach(l => (l.history || []).forEach(h => add(h.at, `${l.type === 'temp' ? 'ล็อกชั่วคราว' : l.type === 'dealer' ? 'ล็อกแลก/ขายดีลเลอร์' : 'ล็อกให้ใบจอง'}: ${h.act}`, [lockIdsCust(l), l.owner ? 'เซลล์ ' + l.owner : '', h.note].filter(Boolean).join(' · '), h.role)));
  const v = S.vehicles.get(r.vin);
  if (v) {
    if (v.added) add(v.added.at, 'รับรถเข้า (ในเว็บ)', v.added.note, v.added.role);
    if (v.moved) add(v.moved.at, `ย้ายไป ${v.branch || ''} (ในเว็บ)`, '', v.moved.role);
    if (v.prod_info) add(v.prod_info.at, 'ใส่วันผลิต', fmtD(v.prod_info.date), v.prod_info.role);
    if (v.removed) add(v.removed.at, 'นำรถออก (ในเว็บ)', [v.removed.dealer, v.removed.note].filter(Boolean).join(' · '), v.removed.role);
  }
  r.web.forEach(a => {
    const f = a.rec.flow || {};
    if (f.assign && f.assign.vin === r.vin) add(f.assign.at, 'จัดสรรให้ใบจองในเว็บ', `${a.cust} · เซลล์ ${a.sales || ''}`, f.assign.role);
    if (f.delivered && f.delivered.date && f.assign && f.assign.vin === r.vin) add(f.delivered.date, 'ส่งมอบ (ขั้นตอนในเว็บ)', a.cust);
  });
  r.inv.forEach(i => {
    add(i.idate, i.other ? `ใบกำกับขาย${i.to && BRS.includes(i.to) ? 'ให้สาขา ' + i.to : 'ให้ดีลเลอร์/สาขาอื่น'}` : i.company ? 'ใบกำกับรถบริษัท' : 'ออกใบกำกับ', [i.cust || i.to, i.inv ? 'เลขที่ ' + i.inv : '', i.sales ? 'เซลล์ ' + i.sales : '', i.fin].filter(Boolean).join(' · '));
    if (i.ddate) add(i.ddate, 'ส่งมอบ (DL)', i.cust || '');
  });
  if (r.out) add(r.out.d, 'ออกจากสต็อก IDS', r.out.why);
  return ev.sort((a, b) => a.at.localeCompare(b.at));
}
function carHistModal(m, D) {
  const r = carHistRows(D).find(x => x.vin === m.vin);
  if (!r) return `<p>ไม่พบรถ ${esc(m.vin)}</p><div class="flex justify-end mt-3"><button class="btn btn-ghost" data-act="close">ปิด</button></div>`;
  const ev = carHistEvents(r);
  return `<div class="flex items-start justify-between gap-3 mb-2"><div><h2 class="font-head text-xl font-semibold">ประวัติรถ <span class="code">${esc(r.vin)}</span></h2>
    <div class="text-sm">${specLabel(r.spec)} · ${esc(r.br || '')} · ${carHistState(r)}</div></div><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
    <ol class="flex flex-col divide-y divide-line text-sm">${ev.map(e => `<li class="py-2 flex flex-wrap gap-x-4"><span class="num text-muted w-28">${e.at.length > 10 ? fmtDT(e.at) : fmtD(e.at)}</span><span class="font-medium">${esc(e.what)}</span><span class="text-muted flex-1 min-w-0">${esc(e.note)}</span>${e.who ? `<span class="text-xs text-muted">${esc(e.who)}</span>` : ''}</li>`).join('') || '<li class="py-2 text-muted">ยังไม่มีเหตุการณ์</li>'}</ol>`;
}
async function carHistXlsx() {
  let X; try { X = await loadXLSX(); } catch (e) { toast('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ', 'bad'); return; }
  const list = carHistFilter(derive());
  const aoa = [['VIN', 'รุ่น', 'เกรด', 'สี', 'สาขา', 'วันผลิต', 'เข้าสต็อก', 'IDS จัดสรรให้ (ล่าสุด)', 'เลขใบจอง IDS', 'เซลล์ (IDS)', 'จำนวนครั้งที่จัดสรร', 'จำนวนล็อก', 'ล็อกล่าสุด', 'ลูกค้าในใบกำกับ', 'เลขที่ใบกำกับ', 'วันที่ใบกำกับ', 'วันส่งมอบ', 'เซลล์ (DL)', 'ออกจากสต็อก', 'เหตุผลที่ออก', 'ตอนนี้'],
    ...list.map(r => { const l = r.locks.slice().sort((a, b) => (b.requested_at || '').localeCompare(a.requested_at || ''))[0], i = r.lastInv;
      return [r.vin, r.model || '', r.grade || '', r.color || '', r.br || '', r.prod || '', r.in || '', r.lastAl ? r.lastAl.cust || '' : '', r.lastAl ? r.lastAl.no || '' : '', r.lastAl ? r.lastAl.s || '' : '', r.al.length, r.locks.length,
        l ? `${l.owner || ''} · ${lockIdsCust(l) || ''} · ${lockStatusTxt(l.status)}` : '', i ? i.cust || i.to || '' : '', i ? i.inv || '' : '', i ? i.idate || '' : '', i ? i.ddate || '' : '', i ? i.sales || '' : '',
        r.out ? r.out.d : '', r.out ? r.out.why : '', { stock: 'อยู่ในสต็อก', delivered: 'ส่งมอบแล้ว', invoiced: 'ออกใบกำกับแล้ว', out: 'ออกจากสต็อก', unknown: '' }[r.state]]; })];
  const wb = X.utils.book_new(), ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = aoa[0].map(() => ({ wch: 16 })); X.utils.book_append_sheet(wb, ws, 'ประวัติรถ');
  const buf = X.write(wb, { type: 'array', bookType: 'xlsx' });
  await docSave(docName('ประวัติรถ' + (S.filters.chModel ? ' ' + S.filters.chModel : ''), S.filters.chAt || S.filters.chFrom || '', S.filters.chAt ? '' : S.filters.chTo || '') + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
Object.assign(ACTIONS, {
  'carhist-open'(el) { S.modal = { kind: 'carhist', vin: el.dataset.id }; render(); },
  'carhist-clear'() { ['chModel', 'chGrade', 'chColor', 'chState', 'chFrom', 'chTo', 'chAt', 'chQ'].forEach(k => { S.filters[k] = ''; }); render(); },
  async 'carhist-xlsx'() { await carHistXlsx(); }
});
