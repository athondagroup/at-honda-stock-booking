// ------------------------------------------------------------------ หลังบ้าน: check and fix the data by hand (ตกลง 13/10: ทั้ง ก และ ข)
// ก  pages here: sales roster, bookings, locks, each change checked and kept in the record's own history ("หลังบ้าน: …")
// ข  download one Excel file, fix it in Excel or Google Sheets, upload it back: the changed cells are shown and confirmed first.
//    Deleting a row in the file never deletes anything; put "Y" in "เอาออก" to take a record out (it can be put back here).
// Writes: the executive and the managers (bookings and locks of their own branches; the sales roster for both managers).
// Branch admins can look and download. Only function declarations here: the first render runs before this file.
// หลังบ้าน: the executive only (ตกลง 14/10: managers and branch admins no longer)
function adminCan() { return S.role.role === 'exec' || !!MGR_OF[S.role.role]; }
// หลังบ้าน: executive edits, managers only look, branch admins have no access
function adminWrite(br) { if (S.view === 'admin' && S.role.role !== 'exec') return false; return perms().write && perms().approve && (!br || canApproveBr(br)); }
function adminTabs() { return [...(window.__WEB && window.__WEB.role === 'exec' ? [['users', 'ผู้ใช้งานเว็บ']] : []), ['sales', 'รายชื่อเซลล์'], ['cat', 'รุ่น เกรด สี'], ['book', 'ใบจอง'], ['lock', 'ล็อกรถ'], ['file', 'แก้ผ่าน Excel / Google Sheet'], ['log', 'ประวัติหลังบ้าน']]; }
function viewAdmin(D) {
  if (!adminCan()) return `${pageHead('หลังบ้าน', '')}<div class="bg-surface border border-line rounded-lg">${emptyBox('บทบาทนี้เข้าหลังบ้านไม่ได้', 'สำหรับผู้บริหาร (แก้ได้) และผู้จัดการ (ดูได้)')}</div>`;
  const sub = adminTabs().some(t => t[0] === S.sub.admin) ? S.sub.admin : 'sales';
  const body = sub === 'users' ? adminUsers() : sub === 'book' ? adminBook(D) : sub === 'lock' ? adminLock(D) : sub === 'file' ? adminFile(D) : sub === 'log' ? adminLog(D) : sub === 'cat' ? adminCatalog(D) : adminSales(D);
  return `${pageHead('หลังบ้าน', 'ตรวจและแก้ข้อมูลโดยตรง ทุกการแก้เก็บประวัติว่าใครแก้ เมื่อไหร่ จากอะไรเป็นอะไร')}
  ${tabs('admin', adminTabs())}${!adminWrite() ? '<p class="text-sm text-muted mb-3">ผู้จัดการดูและดาวน์โหลดได้ การแก้ในหลังบ้านทำโดยผู้บริหาร</p>' : ''}${body}`;
}
// ---------- sales roster (ref/sales): name, branch, nicknames, the form's wording, left
function rosterOf() { const d = S.ref.get('sales') || {}; return { list: (d.list || []).map(x => ({ ...x })), nick: { ...(d.nick || {}) }, log: d.log || [] }; }
function nicksOf(name, r) { return Object.entries(r.nick).filter(([k, v]) => v === name && k !== name).map(([k]) => k); }
function adminSales(D) {
  const r = rosterOf(), can = adminWrite();
  const cnt = n => D.at.filter(a => a.sales === n && !a.cancelled).length;
  return `${can ? '<div class="flex justify-end mb-2"><button class="btn btn-red btn-sm" data-act="ad-sales-open" data-i="-1">+ เพิ่มเซลล์</button></div>' : ''}
  <div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl"><thead><tr><th>ชื่อ</th><th>สาขา</th><th>ชื่อเล่น / ชื่อที่ใช้ในฟอร์มและชีต</th><th>ใบจองที่ยังไม่ยกเลิก</th><th>สถานะ</th><th></th></tr></thead><tbody>
  ${r.list.map((x, i) => `<tr><td class="font-medium">${esc(x.name)}${x.manager ? ' ' + chip('ผู้จัดการ', 'neutral') : ''}</td><td>${esc(x.br || '–')}</td><td class="text-sm">${nicksOf(x.name, r).map(esc).join(', ') || '<span class="text-muted">–</span>'}</td>
    <td class="num">${cnt(x.name)}</td><td>${x.left ? chip('ลาออก', 'muted') : chip('ทำงานอยู่', 'good')}</td><td class="text-right">${can ? `<button class="btn btn-ghost btn-sm" data-act="ad-sales-open" data-i="${i}">แก้ไข</button>` : ''}</td></tr>`).join('')}
  </tbody></table></div><p class="text-xs text-muted mt-2">ชื่อเล่นใช้จับชื่อในชีต Stock และฟอร์มเดิม · ลาออก: ใบจองเดิมยังเก็บชื่อไว้ แต่ไม่มีให้เลือกในรายชื่อ · เปลี่ยนชื่อเซลล์ ระบบถามว่าจะเปลี่ยนชื่อในใบจองเดิมด้วยไหม</p>`;
}
function adminSalesModal(m) {
  return `<div class="flex items-start justify-between gap-3 mb-3"><h2 class="font-head text-xl font-semibold">${m.i < 0 ? 'เพิ่มเซลล์' : 'แก้ไขเซลล์'}</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="grid sm:grid-cols-2 gap-3">
    <div class="field sm:col-span-2"><label for="as-n" class="req">ชื่อ-นามสกุล</label><input id="as-n" data-modal="name" value="${esc(m.name || '')}"></div>
    <div class="field"><label for="as-b">สาขา</label><select id="as-b" data-modal="br"><option value="">ไม่ระบุ</option>${BRS.map(b => `<option value="${b}" ${m.br === b ? 'selected' : ''}>${b} ${BR[b].name}</option>`).join('')}</select></div>
    <label class="flex items-center gap-2 text-sm mt-6"><input type="checkbox" class="w-5 h-5" data-modal="left" ${m.left ? 'checked' : ''}> ลาออกแล้ว</label>
    <div class="field sm:col-span-2"><label for="as-k">ชื่อเล่น / ชื่อที่ใช้ในฟอร์มและชีต (คั่นด้วยจุลภาค)</label><input id="as-k" data-modal="nicks" value="${esc(m.nicks || '')}" placeholder="เช่น อ๊อฟ, ธีธัช ธนาวุฒิ (อ๊อฟ)"></div>
    ${m.i >= 0 && m.orig && m.name && m.name.trim() !== m.orig ? `<label class="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" class="w-5 h-5" data-modal="rename" ${m.rename ? 'checked' : ''}> เปลี่ยนชื่อในใบจองเดิมที่ใช้ชื่อ "${esc(m.orig)}" ด้วย</label>` : ''}
  </div>
  <div class="flex justify-end gap-2 mt-4"><button class="btn btn-ghost" data-act="close">ยกเลิก</button><button class="btn btn-red" data-act="ad-sales-save">บันทึก</button></div>`;
}
// ---------- bookings: search everything (cancelled and taken out too), fix any field
function adminBookList(D, all) {
  const q = all ? '' : searchKey(S.filters.adq || ''), showOut = !all && !!S.filters.adOut;
  return [...S.bookings.entries()].map(([id, r]) => ({ id, r }))
    .filter(x => (showOut || !x.r.hidden) && (S.role.role !== 'admin' || x.r.br === S.role.branch) && (!S.br || x.r.br === S.br))
    .filter(x => !q || [x.r.customer, x.r.sales, x.r.booking_no, x.id, x.r.receipt_no].some(v => v && searchKey(v).includes(q)))
    .sort((a, b) => (b.r.booking_date || '').localeCompare(a.r.booking_date || ''));
}
function adminBook(D) {
  const list = adminBookList(D), f = S.filters;
  return `<div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end mb-3">
    <div class="field col-span-2 sm:grow sm:max-w-sm"><label for="f-adq">ค้นหาชื่อลูกค้า / เซลล์ / เลขที่ใบจอง / เลขที่ใบเสร็จ</label><input id="f-adq" type="search" data-filter="adq" value="${esc(f.adq || '')}"></div>
    <label class="flex items-center gap-2 text-sm"><input type="checkbox" class="w-5 h-5" data-filter="adOut" ${f.adOut ? 'checked' : ''}> แสดงที่เอาออกแล้ว</label></div>
  <p class="text-sm mb-2">${list.length} ใบ${list.length > 200 ? ' · แสดง 200 ใบล่าสุด' : ''}</p>
  <div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl"><thead><tr><th>วันที่จอง</th><th>ลูกค้า</th><th>เซลล์ / สาขา</th><th>รุ่น เกรด สี</th><th>มัดจำ / ใบเสร็จ</th><th>สถานะ</th><th></th></tr></thead><tbody>
  ${list.slice(0, 200).map(({ id, r }) => `<tr ${r.hidden ? 'style="opacity:.55"' : ''}><td class="num nowrap">${fmtD(r.booking_date)}<div class="text-xs text-muted code">${esc(r.booking_no || '')}</div></td><td>${esc(r.customer || '')}</td>
    <td class="nowrap">${esc(r.sales || '')}<div class="text-xs text-muted">${esc(r.br || '')}</div></td><td class="text-sm">${esc(r.model || '')} ${esc(gradeShort(r.model, r.grade) || '')} ${esc(r.color || '')}</td>
    <td class="text-sm num">${money(r.deposit)}<div class="text-xs text-muted">${esc(r.receipt_no || '')}</div></td>
    <td>${r.hidden ? chip('เอาออกแล้ว', 'muted') : r.status === 'cancelled' ? chip('ยกเลิก', 'muted') : chip('ใช้งาน', 'good')}</td>
    <td class="text-right nowrap"><button class="btn btn-ghost btn-sm" data-act="ad-bk-open" data-id="${esc(id)}">${adminWrite(r.br) ? 'แก้ไข' : 'ดู'}</button></td></tr>`).join('')}
  </tbody></table></div>`;
}
function adBkFields() {
  return [['booking_no', 'เลขที่ใบจอง IDS'], ['booking_date', 'วันที่จอง', 'date'], ['br', 'สาขา', 'br'], ['sales', 'เซลล์เจ้าของ', 'sales'], ['customer', 'ชื่อลูกค้า'],
    ['model', 'รุ่น'], ['grade', 'เกรด'], ['color', 'สี'], ['purchase', 'เงื่อนไข', 'purchase'], ['finance', 'ไฟแนนซ์'], ['deposit', 'มัดจำ (บาท)', 'num'], ['receipt_no', 'เลขที่ใบเสร็จมัดจำ'],
    ['discount', 'ส่วนลด (บาท)', 'num'], ['foc_total', 'FOC (บาท)', 'num'], ['note', 'หมายเหตุ']];
}
function adminBkModal(m) {
  const r = S.bookings.get(m.id) || {}, e = m.e, can = adminWrite(r.br);
  const inpt = ([k, t, ty]) => {
    const v = e[k] ?? '';
    const ctl = ty === 'br' ? `<select id="ab-${k}" data-modal="e.${k}" ${can ? '' : 'disabled'}>${BRS.map(b => `<option ${v === b ? 'selected' : ''}>${b}</option>`).join('')}</select>`
      : ty === 'sales' ? `<select id="ab-${k}" data-modal="e.${k}" ${can ? '' : 'disabled'}>${opt([...new Set([v, ...salesNames(true)].filter(Boolean))], v)}</select>`
      : ty === 'purchase' ? `<select id="ab-${k}" data-modal="e.${k}" ${can ? '' : 'disabled'}>${opt(['ไฟแนนซ์', 'ซื้อสด'], v, '–')}</select>`
      : `<input id="ab-${k}" ${ty === 'date' ? 'type="date"' : ty === 'num' ? 'type="number"' : ''} data-modal="e.${k}" value="${esc(v)}" ${can ? '' : 'disabled'}>`;
    return `<div class="field"><label for="ab-${k}">${t}${String(v) !== String(r[k] ?? '') ? ' <span style="color:var(--warn)">●</span>' : ''}</label>${ctl}</div>`;
  };
  const log = (r.log || []).filter(x => /หลังบ้าน/.test(x.act)).slice(-5).reverse();
  return `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">แก้ข้อมูลใบจอง (หลังบ้าน)</h2><div class="text-xs text-muted code">${esc(m.id)}</div></div><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="grid sm:grid-cols-3 gap-3">${adBkFields().map(inpt).join('')}
    <div class="field"><label for="ab-st">สถานะ</label><select id="ab-st" data-modal="e.status" ${can ? '' : 'disabled'}><option value="" ${e.status !== 'cancelled' ? 'selected' : ''}>ใช้งาน</option><option value="cancelled" ${e.status === 'cancelled' ? 'selected' : ''}>ยกเลิก</option></select></div>
    <label class="flex items-center gap-2 text-sm mt-6"><input type="checkbox" class="w-5 h-5" data-modal="e.hidden" ${e.hidden ? 'checked' : ''} ${can ? '' : 'disabled'}> เอาออกจากระบบ (เช่น ข้อมูลทดสอบ ลงซ้ำ)</label></div>
  <p class="text-xs mt-2" style="color:var(--warn)">แก้ตรงที่นี่ไม่ผ่านขั้นอนุมัติ และไม่ปล่อยล็อกหรือเปลี่ยนคิวให้เอง ใช้แก้ข้อมูลผิดหรือบั๊ก ถ้าเป็นการเปลี่ยนตามลูกค้า ใช้ "แก้ไขใบจอง" ในใบจองแทน</p>
  ${can ? `<div class="field mt-3"><label for="ab-why" class="req">เหตุผลที่แก้</label><input id="ab-why" data-modal="why" value="${esc(m.why || '')}" placeholder="เช่น นำเข้าชื่อเซลล์ผิด"></div>` : ''}
  ${log.length ? `<div class="text-xs text-muted mt-3">${log.map(x => `<div>${fmtDT(x.at)} · ${esc(x.act)} · ${esc(x.note || '')} · ${who(x)}</div>`).join('')}</div>` : ''}
  <div class="flex justify-end gap-2 mt-4"><button class="btn btn-ghost" data-act="close">ปิด</button>${can ? '<button class="btn btn-red" data-act="ad-bk-save">บันทึก</button>' : ''}</div>`;
}
function adCast(k, v) { const f = adBkFields().find(x => x[0] === k); if (f && f[2] === 'num') return v === '' || v === null || v === undefined ? null : Number(String(v).replace(/,/g, '')); return v === undefined ? null : v === '' ? null : String(v).trim(); }
function adDiff(r, e) {
  const out = [];
  for (const [k, t] of adBkFields()) { const nv = adCast(k, e[k]), ov = r[k] ?? null; if (String(nv ?? '') !== String(ov ?? '')) out.push({ k, t, ov, nv }); }
  const ns = e.status === 'cancelled' ? 'cancelled' : (r.status === 'cancelled' ? null : r.status || null);
  if ((r.status === 'cancelled') !== (ns === 'cancelled')) out.push({ k: 'status', t: 'สถานะ', ov: r.status === 'cancelled' ? 'ยกเลิก' : 'ใช้งาน', nv: ns === 'cancelled' ? 'ยกเลิก' : 'ใช้งาน', raw: ns });
  if (!!r.hidden !== !!e.hidden) out.push({ k: 'hidden', t: 'เอาออก', ov: r.hidden ? 'Y' : '', nv: e.hidden ? 'Y' : '' });
  return out;
}
function adApply(x, diff, why) {
  for (const d of diff) {
    if (d.k === 'status') { if (d.raw === 'cancelled') { x.status = 'cancelled'; x.cancelled_at = x.cancelled_at || new Date().toISOString(); x.cancel = x.cancel || { reason: 'แก้ไขหลังบ้าน', note: why, refund: null, ...actor() }; } else { x.status = null; x.cancelled_at = null; } }
    else if (d.k === 'hidden') x.hidden = d.nv ? { ...actor(), why } : null;
    else x[d.k] = d.nv;
  }
}
// ---------- locks: put a stuck status right, fix the dealer name, take a record out
function adminLock(D) {
  const q = searchKey(S.filters.alq || ''), showOut = !!S.filters.alOut;
  const list = [...S.locks.entries()].map(([id, l]) => ({ id, l })).filter(x => (showOut || !x.l.hidden) && (!S.br || x.l.car_br === S.br) && (S.role.role !== 'admin' || x.l.car_br === S.role.branch))
    .filter(x => !q || [x.l.vin, x.l.ref, x.l.sales, x.l.prospect, x.l.dealer_name, x.id].some(v => v && searchKey(v).includes(q)))
    .sort((a, b) => (b.l.requested_at || '').localeCompare(a.l.requested_at || ''));
  return `<div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end mb-3">
    <div class="field col-span-2 sm:grow sm:max-w-sm"><label for="f-alq">ค้นหา VIN / Quota / เซลล์ / ลูกค้า / ดีลเลอร์</label><input id="f-alq" type="search" data-filter="alq" value="${esc(S.filters.alq || '')}"></div>
    <label class="flex items-center gap-2 text-sm"><input type="checkbox" class="w-5 h-5" data-filter="alOut" ${showOut ? 'checked' : ''}> แสดงที่เอาออกแล้ว</label></div>
  <div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl"><thead><tr><th>รถ / Quota</th><th>ประเภท</th><th>สถานะ</th><th>เซลล์ / ลูกค้า / ดีลเลอร์</th><th>ขอเมื่อ</th><th></th></tr></thead><tbody>
  ${list.slice(0, 200).map(({ id, l }) => `<tr ${l.hidden ? 'style="opacity:.55"' : ''}><td class="code">${esc(l.vin || 'Quota ' + (l.ref || ''))}<div class="text-xs text-muted">${esc(l.car_br || '')}</div></td><td>${esc((LOCK_TYPE[l.type] || [l.type])[0])}</td>
    <td>${l.hidden ? chip('เอาออกแล้ว', 'muted') : esc(adLockSt()[l.status] || l.status)}</td><td class="text-sm">${esc(l.sales || l.sales_nick || '')} ${esc(l.prospect || l.dealer_name || '')}</td><td class="num text-xs">${fmtDT(l.requested_at)}</td>
    <td class="text-right"><button class="btn btn-ghost btn-sm" data-act="ad-lk-open" data-id="${esc(id)}">${adminWrite(l.car_br) || (l.type === 'dealer' && perms().approveDealer) ? 'แก้ไข' : 'ดู'}</button></td></tr>`).join('')}
  </tbody></table></div>`;
}
function adLockSt() { return { pending: 'รออนุมัติ', approved: 'ล็อก', allocated: 'แจ้งจัดสรรแล้ว รอไฟล์ IDS', released: 'ปล่อยแล้ว', rejected: 'ไม่อนุมัติ', withdrawn: 'ถอนคำขอ', done: 'ส่งมอบแล้ว', bumped: 'มีคนจองก่อน', converted: 'เปลี่ยนเป็นล็อกให้ใบจอง' }; }
function adminLkModal(m) {
  const l = S.locks.get(m.id) || {}, e = m.e, can = adminWrite(l.car_br) || (l.type === 'dealer' && perms().approveDealer);
  return `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">แก้ข้อมูลล็อก (หลังบ้าน)</h2><div class="text-xs text-muted code">${esc(m.id)} · ${esc(l.vin || 'Quota ' + (l.ref || ''))}</div></div><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="grid sm:grid-cols-2 gap-3">
    <div class="field"><label for="al-st">สถานะ</label><select id="al-st" data-modal="e.status" ${can ? '' : 'disabled'}>${Object.entries(adLockSt()).map(([k, t]) => `<option value="${k}" ${e.status === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label for="al-end">หมดล็อก</label><input id="al-end" type="date" data-modal="e.end" value="${esc(e.end || '')}" ${can ? '' : 'disabled'}></div>
    ${l.type === 'dealer' ? `<div class="field"><label for="al-dn">ชื่อดีลเลอร์</label><input id="al-dn" data-modal="e.dealer_name" value="${esc(e.dealer_name || '')}" ${can ? '' : 'disabled'}></div>` : ''}
    ${l.type === 'temp' ? `<div class="field"><label for="al-pr">ลูกค้าที่จะมาจอง</label><input id="al-pr" data-modal="e.prospect" value="${esc(e.prospect || '')}" ${can ? '' : 'disabled'}></div>` : ''}
    <div class="field"><label for="al-sa">เซลล์</label><select id="al-sa" data-modal="e.sales" ${can ? '' : 'disabled'}>${opt([...new Set([e.sales, ...salesNames(true)].filter(Boolean))], e.sales || '', '–')}</select></div>
    <label class="flex items-center gap-2 text-sm mt-6"><input type="checkbox" class="w-5 h-5" data-modal="e.hidden" ${e.hidden ? 'checked' : ''} ${can ? '' : 'disabled'}> เอาออกจากระบบ</label></div>
  ${can ? `<div class="field mt-3"><label for="al-why" class="req">เหตุผลที่แก้</label><input id="al-why" data-modal="why" value="${esc(m.why || '')}"></div>` : ''}
  <div class="flex justify-end gap-2 mt-4"><button class="btn btn-ghost" data-act="close">ปิด</button>${can ? '<button class="btn btn-red" data-act="ad-lk-save">บันทึก</button>' : ''}</div>`;
}
// ---------- ข: one Excel file out, the same file back in
function adSheetCols() { return ['id', ...adBkFields().map(f => f[1]), 'สถานะ (ยกเลิก)', 'เอาออก (Y)']; }
async function adExport() {
  let X; try { X = await loadXLSX(); } catch (e) { toast('โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ', 'bad'); return; }
  const r = rosterOf(), wb = X.utils.book_new();
  const sales = [['ชื่อ-นามสกุล', 'สาขา', 'ชื่อเล่น (คั่นด้วยจุลภาค)', 'ลาออก (Y)'], ...r.list.map(x => [x.name, x.br || '', nicksOf(x.name, r).join(', '), x.left ? 'Y' : ''])];
  const bks = [adSheetCols(), ...adminBookList(derive(), true).map(({ id, r: b }) => [id, ...adBkFields().map(([k]) => b[k] ?? ''), b.status === 'cancelled' ? 'ยกเลิก' : '', b.hidden ? 'Y' : ''])];
  const how = [['วิธีใช้'], ['1. แก้ในไฟล์นี้ (หรืออัปโหลดเข้า Google Sheets แล้วแก้ จากนั้น ไฟล์ → ดาวน์โหลด → .xlsx)'], ['2. ห้ามแก้คอลัมน์ id และชื่อแท็บ'], ['3. ลบแถวในไฟล์ไม่ลบข้อมูล ถ้าต้องการเอาออก ใส่ Y ในคอลัมน์ "เอาออก"'],
    ['4. อัปโหลดกลับที่ หลังบ้าน → แก้ผ่าน Excel / Google Sheet ระบบแสดงช่องที่เปลี่ยนให้ตรวจก่อนบันทึก'], ['5. แท็บเซลล์: เพิ่มแถวใหม่ = เพิ่มเซลล์ · แก้ชื่อในแถวเดิมไม่ได้ (ใช้หน้ารายชื่อเซลล์)'], [`ดาวน์โหลดเมื่อ ${fmtDT(new Date().toISOString())}`]];
  [['วิธีใช้', how], ['เซลล์', sales], ['ใบจอง', bks]].forEach(([n, aoa]) => { const ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = aoa[0].map(() => ({ wch: 22 })); X.utils.book_append_sheet(wb, ws, n); });
  const buf = X.write(wb, { type: 'array', bookType: 'xlsx' });
  await docSave(docName('AT Honda หลังบ้าน', S.br || 'ทุกสาขา', todayISO()) + '.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
// emoji can come back damaged from a spreadsheet round trip; compare text without them
function adStrip(s) { return String(s ?? '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{E000}-\u{F8FF}\u{FFFD}]/gu, '').trim(); }
function adDate(v) {
  const s = String(v ?? '').trim(); if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if (m) { let y = Number(m[3]); if (y < 100) y += 2000; if (y > 2400) y -= 543; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  if (/^\d{5}$/.test(s)) { const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 864e5); return d.toISOString().slice(0, 10); }
  return s;
}
async function adImport(file) {
  let X; try { X = await loadXLSX(); } catch (e) { toast('โหลดตัวอ่านไฟล์ Excel ไม่สำเร็จ', 'bad'); return; }
  let wb; try { wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); } catch (e) { toast('อ่านไฟล์ไม่ได้ ใช้ไฟล์ .xlsx ที่ดาวน์โหลดจากหน้านี้', 'bad'); return; }
  const rows = n => wb.Sheets[n] ? X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '', dateNF: 'yyyy-mm-dd' }) : null;
  const plan = { bk: [], sales: [], err: [], file: file.name };
  const bk = rows('ใบจอง');
  if (bk) {
    const head = bk[0].map(String), cols = adSheetCols();
    if (cols.some((c, i) => head[i] !== c)) plan.err.push('แท็บ "ใบจอง": หัวคอลัมน์ไม่ตรงกับไฟล์ที่ดาวน์โหลด (อย่าย้ายหรือลบคอลัมน์)');
    else for (const row of bk.slice(1)) {
      const id = String(row[0] || '').trim(); if (!id) continue;
      const r = S.bookings.get(id); if (!r) { plan.err.push(`ไม่พบใบจอง id ${id} (ข้ามแถวนี้)`); continue; }
      const e = {}; adBkFields().forEach(([k, , ty], i) => { e[k] = ty === 'date' ? adDate(row[i + 1]) : row[i + 1]; if (!ty && typeof r[k] === 'string' && adStrip(e[k]) === adStrip(r[k])) e[k] = r[k]; });
      e.status = /ยกเลิก/.test(String(row[cols.length - 2] || '')) ? 'cancelled' : '';
      e.hidden = /^y/i.test(String(row[cols.length - 1] || '').trim());
      const diff = adDiff(r, e);
      if (diff.length) plan.bk.push({ id, br: r.br, cust: r.customer, diff, ok: adminWrite(r.br) });
    }
  }
  const sa = rows('เซลล์');
  if (sa) adSalesPlan(sa, plan);
  S.adImport = plan; render();
}
// the sales tab of a file read back: what changes per sales person (also used by the full data file)
function adSalesPlan(sa, plan) {
    const ro = rosterOf();
    for (const row of sa.slice(1)) {
      const name = String(row[0] || '').trim(); if (!name) continue;
      const nicks = String(row[2] || '').split(',').map(x => x.trim()).filter(x => x !== undefined), left = /^y/i.test(String(row[3] || '').trim()), br = String(row[1] || '').trim() || null;
      const cur = ro.list.find(x => x.name === name);
      if (br && !BRS.includes(br)) { plan.err.push(`เซลล์ ${name}: สาขา "${br}" ไม่ถูกต้อง (ใช้ PSC ATE SPH KPA)`); continue; }
      // a file read back can lose emoji in nicknames ("เบียร์🍺"): match each one to the nickname it came from
      const curN = cur ? nicksOf(name, ro) : [], strip = adStrip;
      const pool = [...curN];
      nicks.forEach((n, i) => { const j = pool.indexOf(n); if (j >= 0) { pool.splice(j, 1); nicks[i] = { v: n }; } });
      nicks.forEach((n, i) => { if (typeof n !== 'string') return; const j = pool.findIndex(o => strip(o) === strip(n)); if (j >= 0) { nicks[i] = { v: pool[j] }; pool.splice(j, 1); } });
      const kept = nicks.map(n => typeof n === 'string' ? n : n.v).filter(n => strip(n) || curN.includes(n));
      nicks.length = 0; nicks.push(...new Set(kept));
      const oldN = curN.slice().sort().join(', ');
      const ch = [];
      if (!cur) ch.push('เพิ่มเซลล์ใหม่');
      else { if ((cur.br || null) !== br) ch.push(`สาขา ${cur.br || '–'} → ${br || '–'}`); if (!!cur.left !== left) ch.push(left ? 'ลาออก' : 'กลับมาทำงาน'); }
      if ([...nicks].sort().join(', ') !== oldN) ch.push(`ชื่อเล่น: ${oldN || '–'} → ${nicks.join(', ') || '–'}`);
      if (ch.length) plan.sales.push({ name, br, nicks, left, isNew: !cur, ch });
    }
}
function adminFile(D) {
  const p = S.adImport;
  return `<section class="bg-surface border border-line rounded-lg p-4 mb-4"><h2 class="font-head font-semibold mb-1">1. ดาวน์โหลดไฟล์สำหรับแก้</h2>
    <p class="text-sm text-muted mb-2">ไฟล์ Excel มีแท็บ วิธีใช้ / เซลล์ / ใบจอง (${S.br ? 'สาขา ' + S.br : 'ทุกสาขาที่คุณเห็น'}) เปิดใน Excel หรืออัปโหลดเข้า Google Sheets เพื่อแก้หลายรายการพร้อมกัน</p>
    <button class="btn btn-dark btn-sm" data-act="ad-export">ดาวน์โหลดไฟล์ (.xlsx)</button></section>
  <section class="bg-surface border border-line rounded-lg p-4 mb-4"><h2 class="font-head font-semibold mb-1">2. อัปโหลดไฟล์ที่แก้แล้ว</h2>
    <p class="text-sm text-muted mb-2">จาก Google Sheets: ไฟล์ → ดาวน์โหลด → Microsoft Excel (.xlsx) · ระบบยังไม่บันทึกจนกว่าจะกดยืนยัน</p>
    <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-adminfile="1" ${adminWrite() ? '' : 'disabled'}></section>
  ${p ? `<section class="bg-surface border border-line rounded-lg p-4"><h2 class="font-head font-semibold mb-2">3. ตรวจสิ่งที่จะเปลี่ยน · ${esc(p.file)}</h2>
    ${p.err.length ? box('bad', p.err.slice(0, 20).map(esc).join('<br>')) : ''}
    ${!p.bk.length && !p.sales.length ? '<p class="text-sm">ไม่มีช่องที่เปลี่ยน</p>' : ''}
    ${p.sales.length ? `<h3 class="font-medium mt-2 mb-1">เซลล์ ${p.sales.length} รายการ</h3><ul class="text-sm list-disc pl-5">${p.sales.map(x => `<li><b>${esc(x.name)}</b>: ${x.ch.map(esc).join(' · ')}</li>`).join('')}</ul>` : ''}
    ${p.bk.length ? `<h3 class="font-medium mt-3 mb-1">ใบจอง ${p.bk.length} ใบ</h3><div class="scroll-x max-h-96 overflow-auto"><table class="tbl text-sm"><thead><tr><th>ลูกค้า</th><th>สาขา</th><th>ช่อง</th><th>เดิม</th><th>ใหม่</th></tr></thead><tbody>
      ${p.bk.map(x => x.diff.map((d, i) => `<tr ${x.ok ? '' : 'style="opacity:.5"'}>${i ? '<td></td><td></td>' : `<td>${esc(x.cust || '')}${x.ok ? '' : ' ' + chip('ไม่มีสิทธิ์แก้สาขานี้ ข้าม', 'muted')}</td><td>${esc(x.br || '')}</td>`}<td>${esc(d.t)}</td><td>${esc(String(d.ov ?? '–'))}</td><td style="font-weight:600">${esc(String(d.nv ?? '–'))}</td></tr>`).join('')).join('')}</tbody></table></div>` : ''}
    ${p.bk.length || p.sales.length ? `<div class="field mt-3"><label for="ad-why" class="req">เหตุผลที่แก้</label><input id="ad-why" data-modal-free="why" value="${esc(p.why || '')}"></div>
      <div class="flex gap-2 mt-3"><button class="btn btn-red" data-act="ad-import-go" ${p.busy ? 'disabled' : ''}>${p.busy ? '<span class="spin"></span> กำลังบันทึก…' : `ยืนยันบันทึก ${p.bk.filter(x => x.ok).length + p.sales.length} รายการ`}</button><button class="btn btn-ghost" data-act="ad-import-clear">ยกเลิก</button></div>` : ''}</section>` : ''}`;
}
function adminLog(D) {
  const ev = [];
  for (const [id, r] of S.bookings) (r.log || []).forEach(x => { if (/หลังบ้าน/.test(x.act)) ev.push({ ...x, what: `ใบจอง ${r.customer || id}` }); });
  for (const [id, l] of S.locks) (l.history || []).forEach(x => { if (/หลังบ้าน/.test(x.act)) ev.push({ ...x, what: `ล็อก ${l.vin || 'Quota ' + (l.ref || id)}` }); });
  rosterOf().log.forEach(x => ev.push({ ...x, what: 'รายชื่อเซลล์' }));
  ev.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  return `<div class="bg-surface border border-line rounded-lg divide-y divide-line">${ev.slice(0, 300).map(e => `<div class="p-3 md:px-4 flex flex-wrap gap-x-5 gap-y-1 text-sm"><span class="w-32 num text-muted">${fmtDT(e.at)}</span><span class="w-56 font-medium">${esc(e.what)}</span><span class="flex-1 min-w-0">${esc(e.act)} · ${esc(e.note || '')}</span><span>${who(e)}</span></div>`).join('')
    || emptyBox('ยังไม่มีการแก้หลังบ้าน', 'ทุกการแก้จากหน้านี้และจากไฟล์จะเก็บไว้ที่นี่')}</div>`;
}
async function adSaveRoster(fn, act, note) {
  const cur = await claimFresh('ref', 'sales', () => true); if (!cur) return false;
  const r = { list: (cur.list || []).map(x => ({ ...x })), nick: { ...(cur.nick || {}) } };
  if (fn(r) === false) return false;
  const doc = { ...cur, list: r.list.sort((a, b) => a.name.localeCompare(b.name, 'th')), nick: r.nick, at: new Date().toISOString(), log: [...(cur.log || []), { ...actor(), act, note }].slice(-60) };
  return write('ref', 'sales', doc);
}
function adSetNicks(r, name, nicks, oldName) {
  Object.keys(r.nick).forEach(k => { if (r.nick[k] === name || (oldName && r.nick[k] === oldName)) delete r.nick[k]; });
  r.nick[name] = name; nicks.forEach(k => { r.nick[k] = name; });
}
Object.assign(ACTIONS, {
  'ad-sales-open'(el) {
    const i = Number(el.dataset.i), r = rosterOf(), x = r.list[i] || {};
    S.modal = { kind: 'adsales', i, name: x.name || '', orig: x.name || '', br: x.br || '', left: !!x.left, nicks: x.name ? nicksOf(x.name, r).join(', ') : '', rename: true }; render();
  },
  async 'ad-sales-save'() {
    const m = S.modal; if (!m || !adminWrite()) return;
    const name = (m.name || '').trim(); if (!name) { toast('ใส่ชื่อ-นามสกุล', 'bad'); return; }
    const nicks = String(m.nicks || '').split(',').map(x => x.trim()).filter(x => x && x !== name);
    const rn = m.i >= 0 && m.orig && m.orig !== name;
    const ok = await adSaveRoster(r => {
      if (r.list.some((x, j) => x.name === name && (m.i < 0 || x.name !== m.orig))) { toast('มีชื่อนี้อยู่แล้ว', 'bad'); return false; }
      if (m.i < 0) r.list.push({ name, br: m.br || null }); else { const x = r.list.find(y => y.name === m.orig); if (!x) return false; x.name = name; x.br = m.br || null; x.left = !!m.left; }
      adSetNicks(r, name, rn ? [...new Set([...nicks, m.orig])] : nicks, rn ? m.orig : null);
    }, m.i < 0 ? 'หลังบ้าน: เพิ่มเซลล์' : 'หลังบ้าน: แก้เซลล์', `${rn ? m.orig + ' → ' : ''}${name} · ${m.br || '–'}${m.left ? ' · ลาออก' : ''}${nicks.length ? ' · ' + nicks.join(', ') : ''}`);
    if (!ok) return;
    if (rn && m.rename) { let n = 0; for (const [id, b] of S.bookings) if (b.sales === m.orig) { if (await saveBk(id, 'หลังบ้าน: เปลี่ยนชื่อเซลล์', `${m.orig} → ${name}`, x => { x.sales = name; })) n++; } toast(`บันทึกแล้ว เปลี่ยนชื่อในใบจอง ${n} ใบ`); }
    else toast('บันทึกรายชื่อเซลล์แล้ว');
    S.modal = null; render();
  },
  'ad-bk-open'(el) {
    const r = S.bookings.get(el.dataset.id); if (!r) return;
    const e = {}; adBkFields().forEach(([k]) => { e[k] = r[k] ?? ''; }); e.status = r.status === 'cancelled' ? 'cancelled' : ''; e.hidden = !!r.hidden;
    S.modal = { kind: 'adbk', id: el.dataset.id, e, why: '' }; render();
  },
  async 'ad-bk-save'() {
    const m = S.modal, r0 = S.bookings.get(m.id); if (!m || !r0 || !adminWrite(r0.br)) return;
    const why = (m.why || '').trim(); if (!why) { toast('ใส่เหตุผลที่แก้', 'bad'); $('#ab-why')?.focus(); return; }
    const diff = adDiff(r0, m.e); if (!diff.length) { toast('ไม่มีช่องที่เปลี่ยน'); return; }
    const r = await saveBk(m.id, 'หลังบ้าน: แก้ข้อมูลใบจอง', `${diff.map(d => `${d.t} ${d.ov ?? '–'} → ${d.nv ?? '–'}`).join(' · ')} · ${why}`, x => adApply(x, adDiff(x, m.e), why));
    if (r) { S.modal = null; toast(`บันทึกแล้ว ${diff.length} ช่อง`); render(); }
  },
  'ad-lk-open'(el) {
    const l = S.locks.get(el.dataset.id); if (!l) return;
    S.modal = { kind: 'adlk', id: el.dataset.id, e: { status: l.status, end: l.end || '', dealer_name: l.dealer_name || '', prospect: l.prospect || '', sales: l.sales || '', hidden: !!l.hidden }, why: '' }; render();
  },
  async 'ad-lk-save'() {
    const m = S.modal, l0 = S.locks.get(m.id); if (!m || !l0) return;
    if (!(adminWrite(l0.car_br) || (l0.type === 'dealer' && perms().approveDealer))) return;
    const why = (m.why || '').trim(); if (!why) { toast('ใส่เหตุผลที่แก้', 'bad'); return; }
    const l = await claimFresh('locks', m.id, () => true); if (!l) return;
    const ch = [];
    ['status', 'end', 'dealer_name', 'prospect', 'sales'].forEach(k => { const nv = m.e[k] === '' ? null : m.e[k]; if (String(nv ?? '') !== String(l[k] ?? '')) { ch.push(`${k === 'status' ? 'สถานะ' : k === 'end' ? 'หมดล็อก' : k === 'sales' ? 'เซลล์' : k === 'prospect' ? 'ลูกค้า' : 'ดีลเลอร์'} ${k === 'status' ? adLockSt()[l[k]] || l[k] : l[k] ?? '–'} → ${k === 'status' ? adLockSt()[nv] || nv : nv ?? '–'}`); l[k] = nv; } });
    if (!!l.hidden !== !!m.e.hidden) { ch.push(m.e.hidden ? 'เอาออก' : 'นำกลับ'); l.hidden = m.e.hidden ? { ...actor(), why } : null; }
    if (!ch.length) { toast('ไม่มีช่องที่เปลี่ยน'); return; }
    if (await saveLock(m.id, l, 'หลังบ้าน: แก้ข้อมูลล็อก', `${ch.join(' · ')} · ${why}`)) { S.modal = null; toast('บันทึกแล้ว'); render(); }
  },
  async 'ad-export'() { await adExport(); },
  'ad-import-clear'() { S.adImport = null; render(); },
  async 'ad-import-go'() {
    const p = S.adImport; if (!p || p.busy || !adminWrite()) return;
    const why = (p.why || '').trim(); if (!why) { toast('ใส่เหตุผลที่แก้', 'bad'); $('#ad-why')?.focus(); return; }
    p.busy = true; render();
    let n = 0, bad = 0;
    try {
      if (p.sales.length) {
        const ok = await adSaveRoster(r => {
          for (const s of p.sales) {
            let x = r.list.find(y => y.name === s.name);
            if (!x) { x = { name: s.name }; r.list.push(x); }
            x.br = s.br; x.left = s.left || undefined; adSetNicks(r, s.name, s.nicks);
          }
        }, 'หลังบ้าน: นำเข้าไฟล์ (เซลล์)', `${p.sales.map(s => s.name).join(', ')} · ${why}`);
        if (ok) n += p.sales.length; else bad += p.sales.length;
      }
      for (const x of p.bk.filter(y => y.ok)) {
        const e = {}; x.diff.forEach(d => { e[d.k] = d.k === 'status' ? d.raw || '' : d.k === 'hidden' ? !!d.nv : d.nv; });
        const r = await saveBk(x.id, 'หลังบ้าน: นำเข้าไฟล์', `${x.diff.map(d => `${d.t} ${d.ov ?? '–'} → ${d.nv ?? '–'}`).join(' · ')} · ${why}`, cur => {
          const full = {}; adBkFields().forEach(([k]) => { full[k] = k in e ? e[k] : cur[k] ?? ''; });
          full.status = 'status' in e ? e.status : cur.status === 'cancelled' ? 'cancelled' : ''; full.hidden = 'hidden' in e ? e.hidden : !!cur.hidden;
          adApply(cur, adDiff(cur, full), why);
        });
        if (r) n++; else bad++;
      }
    } finally { p.busy = false; }
    S.adImport = null; toast(`บันทึกแล้ว ${n} รายการ${bad ? ` · ไม่สำเร็จ ${bad}` : ''}`, bad ? 'bad' : 'good'); render();
  }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.adminfile) return;
  const f = t.files && t.files[0]; t.value = ''; if (f) adImport(f);
});
document.addEventListener('input', ev => {
  const t = ev.target; if (!t || !t.dataset || t.dataset.modalFree !== 'why' || !S.adImport) return;
  S.adImport.why = t.value;
});
