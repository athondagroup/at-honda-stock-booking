// ---------- who sees what
const lockVisible = l => {
  const r = S.role.role;
  if (r === 'sales') return isMine(l.owner);
  if (r === 'admin') return l.car_br === S.role.branch || l.bk_br === S.role.branch;
  return true; // both managers and the executive see every branch
};
const atVisible = a => isSales() ? isMine(a.sales) : S.role.role === 'admin' ? a.br === S.role.branch : true;
const monthStartISO = () => todayISO().slice(0, 8) + '01';
function matchChip(a) {
  const m = a.match;
  if (a.cancelled) return chip('ยกเลิก', 'muted');
  if (!m) {
    if (a.demo) return chip('รถทดลองขับ', 'muted');
    if (a.flow.history) return chip('ส่งมอบแล้ว (ฟอร์มเดิม)', 'muted');
    const nearTxt = a.near ? (a.near.some(h => h.other) ? ' · ชื่อซ้ำกับใบจองอื่น' : ' · มีชื่อคล้ายใน IDS') : '';
    return a.ageDays >= AT_TO_IDS_DAYS ? chip(`ยังไม่อยู่ใน IDS ${a.ageDays} วัน${nearTxt}`, a.near ? 'warn' : 'bad') : chip(`รอคีย์ IDS (${a.ageDays ?? 0} วัน)${nearTxt}`, 'neutral');
  }
  const pre = m.status === 'possible' ? 'อาจตรง · ' : '';
  if (m.kind === 'dl') return chip(pre + (m.ddate ? `ส่งมอบแล้ว ${fmtD(m.ddate)}` : `ออกใบกำกับ ${fmtD(m.idate)}`), m.status === 'possible' ? 'warn' : 'good');
  if (m.kind === 'stock') return chip(pre + 'จัดสรรรถแล้ว · รอส่งมอบ', m.status === 'possible' ? 'warn' : 'good');
  return chip(pre + 'พบใน IDS', m.status === 'possible' ? 'warn' : 'good');
}

// ---------- bookings: one list for AT Honda forms and IDS bookings, paired
function viewBook(D) {
  const p = perms();
  if (S.sub.book === 'ids' || S.sub.book === 'at') S.sub.book = 'list';
  if (S.sub.book === 'new' && !p.book) S.sub.book = 'list';
  const sub = S.sub.book;
  const body = sub === 'new' ? bookingForm(D) : sub === 'queue' ? queueList(D) : sub === 'summary' ? summaryView(D) : sub === 'cancels' ? cancelHistory(D) : bookList(D);
  const active = bookRows(D).filter(r => rowState(r, D, 'active')).length;
  return `
  ${pageHead('Booking', 'ใบจอง AT Honda กับ Booking IDS อยู่ในรายการเดียว ระบบจับคู่ด้วยชื่อลูกค้า รุ่น และวันที่ เจ้าของเคสตามฟอร์ม AT Honda รุ่น เกรด สี ตาม IDS',
    sub === 'new' || !p.book ? '' : `<button class="btn btn-red" data-act="sub" data-key="book" data-sub="new">+ ใบจอง AT Honda</button>`)}
  ${tabs('book', [['list', 'ใบจอง', String(active)], ['queue', 'คิวรอรถ'], ['summary', 'สรุปจอง'], ['cancels', 'ประวัติยกเลิก'], ...(p.book ? [['new', '+ ใบจองใหม่']] : [])])}
  ${sub === 'new' ? '' : brSeg()}${body}`;
}
// every AT form (with its IDS booking when paired) plus IDS bookings that have no form
function bookRows(D) {
  if (D._bookRows) return D._bookRows;
  const rows = [], used = new Set();
  for (const a of D.at) {
    if (a.demo) continue;
    if (a.ids) used.add(a.ids.key);
    rows.push({ key: a.key, a, b: a.ids || null, row: a.row, date: a.date, no: a.no, cust: a.cust, owner: a.sales, idsSales: a.idsSales, br: a.br, spec: a.spec, model: a.model, vin: a.match && a.match.vin });
  }
  for (const b of D.idsB) {
    if (used.has(b.key)) continue;
    rows.push({ key: b.key, a: null, b, row: D.bookingByKey.get(b.key), date: b.date, no: b.no, cust: b.cust, owner: b.owner || b.sales, idsSales: b.sales, br: b.br, spec: b.spec, model: b.model, vin: b.vin, noForm: D.idsOnly.includes(b), seed: b.seed });
  }
  return (D._bookRows = rows);
}
const BOOK_FILTERS = [['active', 'ยังไม่ส่งมอบ'], ['noids', 'ฟอร์ม AT ยังไม่อยู่ใน IDS'], ['noat', 'มีใน IDS แต่ไม่มีฟอร์ม AT'], ['waiting', 'รอรถ'], ['locked', 'ล็อก / รออนุมัติล็อก'], ['idscar', 'IDS จัดสรรรถแล้ว'],
  ['assign', 'รอจัดสรรรถ'], ['confirm', 'รอยืนยันเจ้าของ / การจับคู่'], ['req', 'รออนุมัติแก้ไข / ยกเลิก'], ['refund', 'ยกเลิกแล้ว รอทำใบคืนเงิน'], ['done', 'ส่งมอบแล้ว'], ['cancel', 'ยกเลิก'], ['all', 'ทั้งหมด']];
function rowState(r, D, st) {
  const a = r.a, state = r.row ? r.row.state : null;
  if (st === 'all') return true;
  if (st === 'active') return a ? a.active : r.b.match !== 'cancel';
  if (st === 'noids') return !!(a && a.active && !a.match);
  if (st === 'noat') return !!r.noForm;
  if (st === 'waiting') return state === 'waiting' && (a ? a.active : true);
  if (st === 'locked') return ['locked', 'pending', 'allocated'].includes(state);
  if (st === 'idscar') return state === 'idscar' && (a ? a.active : true);
  if (st === 'assign') return !!(a && a.active && a.flow.next === 'assign');
  if (st === 'confirm') return !!(a && (a.matchAsk || a.ownerCheck === 'pending' || a.ownerCheck === 'disputed'));
  if (st === 'req') return !!(a && a.change);
  if (st === 'refund') return !!(a && a.cancelled && a.rec.cancel && a.rec.cancel.refund === 'refund' && !(a.rec.refund && a.rec.refund.at));
  if (st === 'done') return !!(a && !a.cancelled && a.done);
  if (st === 'cancel') return a ? a.cancelled : r.b.match === 'cancel';
  return true;
}
const rowVisible = r => isSales() ? isMine(r.owner) : S.role.role === 'admin' ? r.br === S.role.branch : true;
const searchKey = s => stripTitles(String(s || '')).toLowerCase().replace(/[\s.\-_'’(),]/g, '').replace(TONES, '');
// the sale date is the delivery date: IDS DL (with a delivery date) or the delivery recorded here
function saleDate(r, D) {
  const a = r.a, vin = r.vin || (a && a.rec.flow && a.rec.flow.assign && a.rec.flow.assign.vin);
  const inv = vin ? D.invByVin.get(vin) : null;
  return (a && a.match && a.match.ddate) || (a && a.rec.flow && a.rec.flow.delivered && a.rec.flow.delivered.date) || (inv && !inv.company && inv.ddate) || null;
}
function bookDateOk(r, D) {
  const f = S.filters; if (!f.bDFrom && !f.bDTo) return true;
  const d = f.bDType === 'sale' ? saleDate(r, D) : r.date;
  return !!d && (!f.bDFrom || d >= f.bDFrom) && (!f.bDTo || d <= f.bDTo);
}
function bookList(D) {
  const f = S.filters, p = perms(), dRange = !!(f.bDFrom || f.bDTo);
  // a sale-date range looks at delivered bookings, so "ยังไม่ส่งมอบ" widens to every status
  const st = (f.aState || 'active') === 'active' && dRange && f.bDType === 'sale' ? 'all' : f.aState || 'active';
  const q = searchKey(f.aq);
  // a search looks in every status and every branch this person can see: a delivered or cancelled booking is still found
  // a picked status still applies while searching (only the default "ยังไม่ส่งมอบ" widens to every status)
  let list = bookRows(D).filter(r => rowVisible(r) && (q ? (st === 'active' || rowState(r, D, st)) : inBr(r) && rowState(r, D, st)));
  if (f.qModel) list = list.filter(r => r.model === f.qModel);
  const sp = r => String(r.spec || '').split('|');
  if (f.bGrade) list = list.filter(r => sp(r)[1] === f.bGrade);
  if (f.bColor) list = list.filter(r => (sp(r)[2] || '').toUpperCase() === f.bColor);
  if (f.bSales) list = list.filter(r => r.owner === f.bSales || r.idsSales === f.bSales);
  if (dRange) list = list.filter(r => bookDateOk(r, D));
  if (q) list = list.filter(r => [r.no, r.cust, r.owner, r.idsSales, r.vin, r.b && r.b.cust, r.a && r.a.atSpec && r.a.rec.customer].some(x => x && searchKey(x).includes(q)));
  if (dRange && f.bDType === 'sale') list.sort((x, y) => (saleDate(y, D) || '').localeCompare(saleDate(x, D) || '')); else list.sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const filt = `<div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end mb-3">
    <div class="field col-span-2 sm:grow sm:max-w-xs"><label for="f-aq">ค้นหาเลขที่ใบจอง / ชื่อลูกค้า / เซลล์ / VIN</label><input id="f-aq" type="search" data-filter="aq" value="${esc(f.aq)}"></div>
    ${f.aq ? '<button class="btn btn-ghost btn-sm" data-act="aq-clear">ล้างคำค้น</button>' : ''}
    <div class="field"><label for="f-qm2">รุ่น</label><select id="f-qm2" data-filter="qModel"><option value="">ทุกรุ่น</option>${Object.keys(CATALOG).map(m => `<option ${f.qModel === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
    <div class="field"><label for="f-bg">เกรด</label><select id="f-bg" data-filter="bGrade"><option value="">ทุกเกรด</option>${(f.qModel ? Object.keys(CATALOG[f.qModel] || {}) : [...new Set(Object.values(CATALOG).flatMap(g => Object.keys(g)))].sort()).map(g => `<option ${f.bGrade === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></div>
    <div class="field"><label for="f-bc">สี</label><select id="f-bc" data-filter="bColor"><option value="">ทุกสี</option>${[...new Set(f.qModel && f.bGrade ? (CATALOG[f.qModel] || {})[f.bGrade] || [] : Object.values(CATALOG).flatMap(g => Object.values(g).flat()))].sort().map(c => `<option ${f.bColor === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    ${isSales() ? '' : `<div class="field"><label for="f-bs2">เซลล์</label><select id="f-bs2" data-filter="bSales"><option value="">ทุกคน</option>${salesNames(true).map(n => `<option ${f.bSales === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`}
    <div class="field"><label for="f-bdt">ช่วงวันที่</label><select id="f-bdt" data-filter="bDType"><option value="" ${f.bDType !== 'sale' ? 'selected' : ''}>วันที่จอง</option><option value="sale" ${f.bDType === 'sale' ? 'selected' : ''}>วันที่ขาย (ส่งมอบ)</option></select></div>
    <div class="field"><label for="f-bdf">ตั้งแต่</label><input id="f-bdf" type="date" data-filter="bDFrom" value="${esc(f.bDFrom || '')}"></div>
    <div class="field"><label for="f-bdto">ถึง</label><input id="f-bdto" type="date" data-filter="bDTo" value="${esc(f.bDTo || '')}"></div>
    ${dRange || f.qModel || f.bGrade || f.bColor || f.bSales || (f.aState && f.aState !== 'active') ? '<button class="btn btn-ghost btn-sm" data-act="bd-clear">ล้างตัวกรอง</button>' : ''}
    <div class="field"><label for="f-as">แสดง</label><select id="f-as" data-filter="aState">${BOOK_FILTERS.map(([k, t]) => `<option value="${k}" ${st === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
  </div>`;
  const all = bookRows(D).filter(r => inBr(r) && rowVisible(r) && (!dRange || bookDateOk(r, D)));
  const cnt = k => all.filter(r => rowState(r, D, k)).length;
  const quick = [['noids', 'bad'], ['noat', 'bad'], ['confirm', 'warn'], ['req', 'warn'], ['assign', 'neutral']].map(([k, t]) => { const n = cnt(k); return n ? `<button class="chip" data-act="book-filter" data-st="${k}" style="cursor:pointer;${t === 'bad' ? 'background:var(--bad-soft);color:var(--bad)' : t === 'warn' ? 'background:var(--warn-soft);color:var(--warn)' : 'background:var(--surface-2);color:var(--fg)'}">${BOOK_FILTERS.find(x => x[0] === k)[1]} ${n}</button>` : ''; }).join(' ');
  if (!list.length) return `${filt}${quick && !q ? `<div class="flex flex-wrap gap-2 mb-3">${quick}</div>` : ''}<div class="bg-surface border border-line rounded-lg">${q ? emptyBox(`ไม่พบ "${esc(f.aq.trim())}"`, `ค้นหาแล้วทุกสถานะและทุกสาขา${isSales() ? ' (เซลล์ค้นหาได้เฉพาะใบจองของตัวเอง)' : S.role.role === 'admin' ? ' ของสาขาตัวเอง' : ''} ลองพิมพ์แค่ชื่อหรือนามสกุล`) : emptyBox('ไม่มีใบจองตามตัวกรองนี้', p.book ? 'กด "+ ใบจอง AT Honda" แล้วแนบรูปใบจองและสลิป' : 'ลองเปลี่ยนตัวกรองหรือสาขา')}</div>`;
  return `${filt}<div class="flex flex-wrap gap-2 items-center mb-2"><span class="text-sm">${list.length} ใบ${q ? ` · ค้นหาทุกสาขา${st === 'active' ? ' ทุกสถานะ' : ` เฉพาะ "${BOOK_FILTERS.find(x => x[0] === st)[1]}"`}` : ''}</span>${q ? '' : quick}</div>
  <div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl">
    <thead><tr><th>วันที่จอง / เลขที่</th><th>ชื่อลูกค้า</th><th>เซลล์ / สาขา</th><th>รุ่น / เกรด / สี</th><th>IDS</th><th>สถานะ / ขั้นถัดไป</th><th></th></tr></thead>
    <tbody>${list.slice(0, 300).map(r => bookRow(r, D, p)).join('')}</tbody></table></div>${list.length > 300 ? '<p class="text-xs text-muted mt-2">แสดง 300 ใบล่าสุด ใช้ตัวกรองเพื่อหาใบเก่า</p>' : ''}`;
}
function bookRow(r, D, p) {
  const a = r.a, b = r.b, row = r.row || {};
  const lk = row.lock || null;
  const acts = [];
  if (a) acts.push(`<button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(a.id)}">เปิด</button>`);
  else if (r.noForm && p.book && p.write && (!isSales() || isMine(r.owner))) acts.push(`<button class="btn btn-dark btn-sm" data-act="ids-claim" data-id="${esc(b.no)}">ลงฟอร์ม AT</button>`);
  if (!a && b && r.noForm && p.write && idsFixCan(b)) acts.push(`<button class="btn btn-ghost btn-sm" data-act="idspair-open" data-id="${esc(b.key)}">จับคู่กับฟอร์มที่มี</button>`);
  if (!a && b && p.write && idsFixCan(b)) acts.push(`<button class="btn btn-ghost btn-sm" data-act="idsfix-open" data-id="${esc(b.no)}">แก้ไข</button>`);
  if (p.write && p.request && row.state === 'waiting' && (!isSales() || isMine(r.owner)) && (a ? a.active : true)) acts.push(`<button class="btn btn-ghost btn-sm" data-act="lock-open" data-bk="${esc(row.key || r.key)}">ขอล็อกรถ</button>`);
  // the booking's own locks are handled on this row: approve, allocate, extend, release, swap, undo (ตกลง 13/10)
  if (p.write) D.locks.filter(l => (l.bkref === r.key || (row.key && l.bkref === row.key) || (a && l.bkref === a.key)) && ['pending', 'approved', 'allocated'].includes(l.status) && !l.autoReleased).forEach(l => acts.push(...rowLockActs(l, D)));
  if (p.write && a && a.active && ((a.flow.next === 'assign' && canAllocBr(a.br)) || mgrAssign(a))) acts.push(`<button class="btn btn-dark btn-sm" data-act="at-open" data-id="${esc(a.id)}">จัดสรรรถ</button>`);
  const idsCell = a ? `${matchChip(a)}${a.matchAsk ? `<div>${chip('รอยืนยันการจับคู่', 'warn')}</div>` : ''}${b && b.ids ? `<div class="text-xs text-muted">${esc(b.ids)}</div>` : ''}`
    : `${r.noForm ? chip('ยังไม่มีฟอร์ม AT', 'bad') : b.webCancel ? '' : b.match === 'cancel' ? chip('รอยกเลิกใน IDS', 'muted') : chip('ใน IDS', 'neutral')}<div class="text-xs text-muted">${esc(b.ids || '')}</div>${idsFixChip(b)}`;
  const stateCell = a && a.cancelled ? (a.rec.cancel && a.rec.cancel.refund === 'refund' ? chip(a.rec.refund && a.rec.refund.at ? 'ยกเลิก · ทำใบคืนเงินแล้ว' : 'ยกเลิก · รอทำใบคืนเงิน', a.rec.refund && a.rec.refund.at ? 'muted' : 'warn') : chip('ยกเลิก', 'muted'))
    : `${a && a.change ? `<div>${chip(a.change.type === 'cancel' ? 'รออนุมัติยกเลิก' : 'รออนุมัติแก้ไข', 'warn')}</div>` : ''}${a && gformDue(a) && gformCfg() && (a.rec.created_at || '') >= (gformCfg().at || '') ? `<div>${chip('ยังไม่ส่ง Google Form', 'warn')}</div>` : ''}${a && a.flow.history ? chip('ส่งมอบแล้ว (ประวัติ)', 'muted') : statusChip(BOOK_STATE, row.state || 'waiting')}${row.state === 'waiting' && row.pos ? ` <span class="text-xs text-muted">คิวที่ ${row.pos}</span>` : ''}
      ${a && a.flow.next ? `<div class="text-xs text-muted">ถัดไป: ${FLOW_LABEL[a.flow.next]}</div>` : ''}`;
  return `<tr ${r.noForm ? 'class="low"' : ''}>
    <td class="nowrap"><span class="num">${fmtD(r.date)}</span>${r.no ? `<div class="code text-xs text-muted">${esc(r.no)}</div>` : ''}</td>
    <td style="min-width:150px">${custCell(r.cust, r.owner, { seed: r.seed })}${a && a.rec.doc_url ? `<div class="text-xs"><a class="underline" href="${esc(a.rec.doc_url)}" target="_blank" rel="noopener">ใบจองใน Drive</a></div>` : ''}</td>
    <td class="nowrap">${salesCell(a ? a.sales : null, r.idsSales, a ? a.ownerCheck : null)}<div class="text-xs text-muted">${esc(r.br || '')} ${BR[r.br]?.name || ''}</div>${crossChip(a)}</td>
    <td class="nowrap">${specLabel(r.spec)}${a && a.specFromIds ? ' <span class="text-xs text-muted">(ตาม IDS)</span>' : ''}${a && (a.multi || a.multiOf) ? `<div>${chip('จอง 2 คัน', 'warn')}</div>` : ''}${r.vin ? `<div class="code text-xs text-muted">${esc(r.vin)}</div>` : ''}</td>
    <td style="min-width:130px">${idsCell}</td>
    <td class="nowrap">${stateCell}</td>
    <td class="text-right"><div class="flex flex-wrap gap-1 justify-end">${acts.join('')}</div></td></tr>`;
}
function bookingFilters(qKey, withState) {
  const f = S.filters;
  return `<div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end mb-3">
    <div class="field col-span-2 sm:grow sm:max-w-xs"><label for="f-${qKey}">ค้นหาเลขที่ใบจอง / ชื่อลูกค้า / เซลล์</label><input id="f-${qKey}" type="search" data-filter="${qKey}" value="${esc(f[qKey])}"></div>
    <div class="field"><label for="f-qm">รุ่น</label><select id="f-qm" data-filter="qModel"><option value="">ทุกรุ่น</option>${Object.keys(CATALOG).map(m => `<option ${f.qModel === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
    ${withState ? `<div class="field"><label for="f-bs">สถานะ</label><select id="f-bs" data-filter="bState"><option value="">ทั้งหมด</option>
      ${[['noat', 'ยังไม่มีฟอร์ม AT Honda'], ['waiting', 'รอรถ'], ['locked', 'ล็อก/รออนุมัติ'], ['idscar', 'IDS จัดสรรรถแล้ว'], ['idsquota', 'IDS จับคู่ Quota'], ['cancel', 'รอยกเลิก']].map(([k, t]) => `<option value="${k}" ${f.bState === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>` : ''}
  </div>`;
}
function queueCard(b, D) {
  const p = perms();
  const deposit = b.app ? (b.app.rec.imported ? chip('มีใบจองในฟอร์ม', 'good') : (b.app.deposit > 0 && b.app.slip ? chip(`มัดจำ ${money(b.app.deposit)}`, 'good') : chip('ยังไม่มีมัดจำ/สลิป', 'bad'))) : (b.src === 'IDS' ? chip('ยังไม่มีฟอร์ม AT', 'bad') : '');
  const canReq = p.write && p.request && b.state === 'waiting' && (!isSales() || isMine(b.owner)) && branchOk(b.br);
  return `<div class="p-3 md:px-4 flex flex-wrap gap-x-5 gap-y-2 items-center">
    <div class="w-24">${b.state === 'waiting' ? chip(`คิวที่ ${b.pos}`, 'warn') : statusChip(BOOK_STATE, b.state)}</div>
    <div class="min-w-[150px] flex-1"><div class="font-medium">${custCell(b.cust, b.owner, { seed: b.seed })}</div>
      <div class="text-xs text-muted">${b.no ? 'ใบจอง ' + esc(b.no) : '<span style="color:var(--warn)">ยังไม่มีเลขใบจอง IDS</span>'}</div></div>
    <div class="w-28 text-sm"><div class="num">${fmtD(b.date)}</div><div class="text-xs text-muted">${b.br} ${BR[b.br]?.name || ''}</div></div>
    <div class="w-44 text-sm">${salesCell(b.app ? b.app.sales : null, b.src === 'IDS' ? b.sales : b.idsSales, b.app ? b.app.ownerCheck : null)}</div>
    <div class="text-sm">${deposit}</div>
    <div class="ml-auto flex gap-2 items-center justify-end md:w-44">${b.app && (!isSales() || isMine(b.owner)) ? `<button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(b.app.id)}">เปิดใบจอง</button>` : ''}${canReq ? `${(D.specs[b.spec]?.free || 0) > 0 ? '' : '<span class="text-xs text-muted">สเปกนี้ยังไม่มีรถว่าง</span>'}<button class="btn btn-ghost btn-sm" data-act="lock-open" data-bk="${esc(b.key)}">ขอล็อกรถ</button>` : ''}</div>
  </div>`;
}
function queueList(D) {
  const f = S.filters;
  let bks = D.bookings.filter(b => b.state !== 'cancel' && inBr(b));
  if (f.qModel) bks = bks.filter(b => b.model === f.qModel);
  const mineOnly = isSales();
  const groups = {};
  bks.forEach(b => (groups[b.spec] ||= []).push(b));
  const order = { waiting: 0, pending: 1, locked: 2, allocated: 3, idsquota: 4, idscar: 5 };
  let keys = Object.keys(groups).sort((a, b) => ((D.specs[a]?.low ? 0 : 1) - (D.specs[b]?.low ? 0 : 1)) || a.localeCompare(b));
  if (mineOnly) keys = keys.filter(k => groups[k].some(b => isMine(b.owner)));
  return `
  <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end mb-3">
    <div class="field"><label for="q-model">รุ่น</label><select id="q-model" data-filter="qModel"><option value="">ทุกรุ่น</option>${Object.keys(CATALOG).map(m => `<option ${f.qModel === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
  </div>
  <p class="text-sm text-muted mb-3">คิวนับรวมทุกสาขาตามสเปก เรียงตามวันที่จอง${mineOnly ? ' · เซลล์เห็นเฉพาะใบจองของตัวเองและลำดับคิว' : ''}</p>
  <div class="flex flex-col gap-4">${keys.map(k => {
    const s = D.specs[k] || { free: 0, waiting: 0, incoming: 0 };
    const list = groups[k].sort((a, b) => (order[a.state] - order[b.state]) || (a.pos || 0) - (b.pos || 0) || (a.date || '').localeCompare(b.date || ''));
    const shown = mineOnly ? list.filter(b => isMine(b.owner)) : list;
    return `<section class="bg-surface border ${s.low ? 'border-red' : 'border-line'} rounded-lg overflow-hidden">
      <div class="px-4 py-2 flex flex-wrap gap-x-4 items-center ${s.low ? 'bg-redsoft' : 'bg-surface2'}">
        <h3 class="font-head font-semibold">${specLabel(k)}</h3>
        <span class="text-sm">รอรถ <b class="num">${s.waiting}</b> · ว่าง <b class="num">${s.free}</b> · Quota ว่าง <b class="num">${s.incoming}</b></span>
        ${s.short ? '<span class="text-sm font-semibold" style="color:var(--bad)">รถไม่พอคิว</span>' : ''}</div>
      <div class="divide-y divide-line">${shown.map(b => queueCard(b, D)).join('')}</div></section>`;
  }).join('') || `<div class="bg-surface border border-line rounded-lg">${emptyBox('ไม่มีใบจองตามตัวกรองนี้', 'ลองเลือกรุ่นอื่นหรือล้างตัวกรอง')}</div>`}</div>`;
}

// ---------- booking summary for executives and managers (sales see counts only)
// the bookings the summary counts (shared with the list that opens when a number is clicked)
function sumScope(D) {
  const f = S.filters, from = f.sFrom || monthStartISO(), to = f.sTo || D.today, by = f.sBy || 'model';
  let list = D.at.filter(a => !a.demo && inBr(a) && a.date && a.date >= from && a.date <= to);
  if (f.sModel) list = list.filter(a => a.model === f.sModel);
  if (f.sGrade) list = list.filter(a => a.grade === f.sGrade);
  if (f.sColor) list = list.filter(a => a.color === f.sColor);
  if (f.sSales) list = list.filter(a => a.sales === f.sSales);
  const idsOnly = D.idsOnly.filter(b => inBr(b) && b.date >= from && b.date <= to && (!f.sModel || b.model === f.sModel) && (!f.sSales || b.owner === f.sSales));
  const keyOf = a => by === 'sales' ? a.sales || '–' : by === 'model' ? a.model : by === 'grade' ? `${a.model}|${a.grade}` : `${a.model}|${a.grade}|${(a.color || '?').toUpperCase()}`;
  return { from, to, by, list, idsOnly, keyOf };
}
function summaryView(D) {
  const f = S.filters;
  const from = f.sFrom || monthStartISO(), to = f.sTo || D.today;
  const by = f.sBy || 'model', sort = f.sSort || 'count';
  const { list, idsOnly, keyOf } = sumScope(D);
  const label = (k) => by === 'sales' ? salesName(k) : by === 'model' ? esc(k) : by === 'grade' ? (() => { const [m, g] = k.split('|'); return `${esc(m)} ${esc(gradeShort(m, g))}`; })() : specLabel(k);
  const g = new Map();
  const bump = (k, f2, br) => { const r = g.get(k) || { k, total: 0, cancel: 0, delivered: 0, inIds: 0, noIds: 0, idsOnly: 0, idsDiff: 0, cross: 0, br: {} }; r[f2]++; if (br) r.br[br] = (r.br[br] || 0) + 1; g.set(k, r); };
  for (const a of list) {
    const k = keyOf(a);
    if (a.cancelled) { bump(k, 'cancel'); continue; }
    // branch columns: the branch that delivers the car (sales volume); the sales column still follows the case owner (commission)
    bump(k, 'total', a.delivBr || a.br);
    if (a.match && a.idsSales && !sameName(a.idsSales, a.sales)) bump(k, 'idsDiff');
    if (a.cross) bump(k, 'cross');
    if (a.done) bump(k, 'delivered');
    else if (a.match) bump(k, 'inIds');
    else bump(k, 'noIds');
  }
  idsOnly.forEach(b => bump(keyOf({ sales: b.owner, model: b.model, grade: b.grade, color: b.color }), 'idsOnly'));
  const rows = [...g.values()].sort((x, y) => sort === 'name' ? x.k.localeCompare(y.k, 'th') : (y.total - x.total) || x.k.localeCompare(y.k, 'th'));
  const tot = rows.reduce((t, r) => { ['total', 'cancel', 'delivered', 'inIds', 'noIds', 'idsOnly', 'idsDiff', 'cross'].forEach(c => { t[c] += r[c]; }); return t; }, { total: 0, cancel: 0, delivered: 0, inIds: 0, noIds: 0, idsOnly: 0, idsDiff: 0, cross: 0 });
  const models = [...new Set(D.at.map(a => a.model).filter(Boolean))].sort();
  const grades = [...new Set(D.at.filter(a => !f.sModel || a.model === f.sModel).map(a => a.grade).filter(Boolean))].sort();
  const colors = [...new Set(D.at.filter(a => (!f.sModel || a.model === f.sModel) && (!f.sGrade || a.grade === f.sGrade)).map(a => a.color).filter(Boolean))].sort();
  const sales = salesNames(true);
  const brs = S.br ? [S.br] : BRS;
  return `
  <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end mb-3">
    <div class="field"><label for="s-from">ตั้งแต่วันที่</label><input id="s-from" type="date" data-filter="sFrom" value="${from}"></div>
    <div class="field"><label for="s-to">ถึงวันที่</label><input id="s-to" type="date" data-filter="sTo" value="${to}"></div>
    <div class="field"><label for="s-by">สรุปตาม</label><select id="s-by" data-filter="sBy">${[['model', 'รุ่น'], ['grade', 'รุ่น + เกรด'], ['spec', 'รุ่น + เกรด + สี'], ['sales', 'ชื่อเซลล์']].map(([k, t]) => `<option value="${k}" ${by === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label for="s-sort">เรียงตาม</label><select id="s-sort" data-filter="sSort"><option value="count" ${sort === 'count' ? 'selected' : ''}>จำนวนจองมากไปน้อย</option><option value="name" ${sort === 'name' ? 'selected' : ''}>ชื่อ ก–ฮ / A–Z</option></select></div>
    <div class="field"><label for="s-model">รุ่น</label><select id="s-model" data-filter="sModel"><option value="">ทุกรุ่น</option>${models.map(m => `<option ${f.sModel === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
    <div class="field"><label for="s-grade">เกรด</label><select id="s-grade" data-filter="sGrade"><option value="">ทุกเกรด</option>${grades.map(m => `<option ${f.sGrade === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
    <div class="field"><label for="s-color">สี</label><select id="s-color" data-filter="sColor"><option value="">ทุกสี</option>${colors.map(m => `<option ${f.sColor === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
    <div class="field"><label for="s-sales">เซลล์</label><select id="s-sales" data-filter="sSales"><option value="">ทุกคน</option>${sales.map(m => `<option ${f.sSales === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
    <button class="btn btn-ghost btn-sm" data-act="sum-reset">เดือนนี้</button>
  </div>
  <p class="text-sm mb-2">ใบจองวันที่ ${fmtD(from)} – ${fmtD(to)}${S.br ? ` · สาขา ${S.br}` : ' · ทุกสาขา'}: จอง <b class="num">${tot.total}</b> ใบ · ส่งมอบแล้ว <b class="num">${tot.delivered}</b> · อยู่ใน IDS รอรถ <b class="num">${tot.inIds}</b> · ยังไม่อยู่ใน IDS <b class="num" style="color:var(--bad)">${tot.noIds}</b> · ยกเลิก <b class="num">${tot.cancel}</b>${tot.idsOnly ? ` · มีใน IDS ไม่มีฟอร์ม <b class="num" style="color:var(--bad)">${tot.idsOnly}</b>` : ''}</p>
  ${rows.length ? `<div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl">
    <thead><tr><th>${{ model: 'รุ่น', grade: 'รุ่น / เกรด', spec: 'รุ่น / เกรด / สี', sales: 'เซลล์' }[by]}</th>${brs.length > 1 ? brs.map(b => `<th class="text-right hidden md:table-cell">${b}</th>`).join('') : ''}<th class="text-right">จอง</th><th class="text-right">ส่งมอบแล้ว</th><th class="text-right">อยู่ใน IDS</th><th class="text-right">ยังไม่อยู่ใน IDS</th><th class="text-right">ยกเลิก</th><th class="text-right">IDS ไม่มีฟอร์ม</th>${by === 'sales' ? '<th class="text-right">คีย์ IDS ด้วยชื่ออื่น</th><th class="text-right">ขายข้ามสาขา</th>' : ''}</tr></thead>
    <tbody>${rows.map(r => `<tr><td class="nowrap">${label(r.k)}</td>${brs.length > 1 ? brs.map(b => `<td class="num text-right hidden md:table-cell">${r.br[b] ? sumBtn(r.k, 'total', r.br[b], b) : '<span class="text-muted">–</span>'}</td>`).join('') : ''}
      <td class="num text-right font-semibold">${sumBtn(r.k, 'total', r.total)}</td><td class="num text-right">${sumBtn(r.k, 'delivered', r.delivered)}</td><td class="num text-right">${sumBtn(r.k, 'inIds', r.inIds)}</td>
      <td class="num text-right" ${r.noIds ? 'style="color:var(--bad)"' : ''}>${sumBtn(r.k, 'noIds', r.noIds)}</td><td class="num text-right">${sumBtn(r.k, 'cancel', r.cancel)}</td><td class="num text-right" ${r.idsOnly ? 'style="color:var(--bad)"' : ''}>${sumBtn(r.k, 'idsOnly', r.idsOnly)}</td>${by === 'sales' ? `<td class="num text-right" ${r.idsDiff ? 'style="color:var(--warn)"' : ''}>${sumBtn(r.k, 'idsDiff', r.idsDiff)}</td><td class="num text-right">${sumBtn(r.k, 'cross', r.cross)}</td>` : ''}</tr>`).join('')}
      <tr style="font-weight:600"><td>รวม</td>${brs.length > 1 ? brs.map(b => `<td class="num text-right hidden md:table-cell">${sumBtn('*', 'total', rows.reduce((n, r) => n + (r.br[b] || 0), 0), b)}</td>`).join('') : ''}<td class="num text-right">${sumBtn('*', 'total', tot.total)}</td><td class="num text-right">${sumBtn('*', 'delivered', tot.delivered)}</td><td class="num text-right">${sumBtn('*', 'inIds', tot.inIds)}</td><td class="num text-right">${sumBtn('*', 'noIds', tot.noIds)}</td><td class="num text-right">${sumBtn('*', 'cancel', tot.cancel)}</td><td class="num text-right">${sumBtn('*', 'idsOnly', tot.idsOnly)}</td>${by === 'sales' ? `<td class="num text-right">${sumBtn('*', 'idsDiff', tot.idsDiff)}</td><td class="num text-right">${sumBtn('*', 'cross', tot.cross)}</td>` : ''}</tr>
    </tbody></table></div>` : `<div class="bg-surface border border-line rounded-lg">${emptyBox('ไม่มีใบจองในช่วงนี้', 'ลองขยายช่วงวันที่หรือล้างตัวกรอง')}</div>`}
  <p class="text-xs text-muted mt-2">นับจากใบจอง AT Honda ตามวันที่จอง · คอลัมน์สาขานับตามสาขาที่ออกรถ (ยอดขายของสาขา) · เซลล์นับตามชื่อในฟอร์ม AT Honda (เจ้าของเคส ได้ค่าคอม) ไม่ใช่ชื่อ ID ใน IDS${isSales() ? ' · เซลล์เห็นเฉพาะตัวเลข ไม่เห็นชื่อลูกค้าของคนอื่น' : ''}</p>`;
}

// ---------- quota
// a slot with only a pending request can still take more requests; the manager picks, first come first
const quotaQueue = q => !!(q.lock && q.lock.status === 'pending' && !q.bk && !q.booking && (q.st === 'waiting' || q.st === 'vin'));
function qsChip(k, label, tone, n, cur) { return `<button class="inline-flex items-center gap-1 rounded-full ${cur === k ? 'ring-2 ring-offset-1' : ''}" style="--tw-ring-color:var(--ink)" data-act="qs-pick" data-k="${k}" aria-pressed="${cur === k}" title="กดเพื่อดูรายการ">${chip(label, tone)}<b class="num underline decoration-dotted">${n}</b></button>`; }
const quotaVisible = q => (!isSales() || q.st === 'waiting' || q.st === 'vin') && (!isSales() || q.open || quotaQueue(q) || (q.lock && isMine(q.lock.owner)) || q.temps.some(t => isMine(t.owner)) || (!q.lock && q.temps.length && (q.st === 'waiting' || q.st === 'vin') && !q.bk));
function viewQuota(D) {
  const f = S.filters, p = perms();
  let list = D.quota.filter(inBr).filter(quotaVisible);
  const months = [...new Set(list.map(q => q.m).filter(Boolean))].sort();
  if (f.qm) list = list.filter(q => q.m === f.qm);
  if (f.qModel) list = list.filter(q => q.model === f.qModel);
  const cnt = {}; list.forEach(q => { cnt[q.st] = (cnt[q.st] || 0) + (q.qty || 1); });
  const live = q => q.st === 'waiting' || q.st === 'vin';
  // arrived and sold quota are already in สต็อก / delivered: kept only in the archive view, so nothing shows twice (13/10)
  const arch = f.qs === 'arrived' || f.qs === 'sold' || f.qs === 'arch';
  const matched = list.filter(q => q.bk && live(q)).length;
  if (f.qs === 'free') list = list.filter(q => q.open);
  else if (f.qs === 'matched') list = list.filter(q => q.bk && live(q));
  else if (f.qs === 'arch') list = list.filter(q => !live(q));
  else if (f.qs) list = list.filter(q => q.st === f.qs);
  else list = list.filter(live);
  list.sort((a, b) => (a.m || '').localeCompare(b.m || '') || (a.br || '').localeCompare(b.br || '') || a.spec.localeCompare(b.spec) || a.ref.localeCompare(b.ref));
  return `
  ${pageHead('Quota', isSales() ? 'Quota ที่ยังไม่มีใบจองจับคู่และยังไม่ถูกล็อก เซลล์ขอล็อกได้ ผู้จัดการเป็นคนอนุมัติ' : 'รถที่ Honda จัดสรรให้แต่ละสาขาตามเดือนส่ง พร้อมสถานะ VIN การมาถึงสาขา ใบจองที่จับคู่ และการล็อก')}
  ${brSeg()}
  <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end mb-3">
    <div class="field"><label for="f-qmon">เดือนส่ง</label><select id="f-qmon" data-filter="qm"><option value="">ทุกเดือน</option>${months.map(m => `<option value="${m}" ${f.qm === m ? 'selected' : ''}>${fmtM(m)}</option>`).join('')}</select></div>
    ${isSales() ? '' : `<div class="field"><label for="f-qst">สถานะ</label><select id="f-qst" data-filter="qs"><option value="">ทั้งหมด</option><option value="free" ${f.qs === 'free' ? 'selected' : ''}>ยังว่าง (ไม่มีใบจอง ไม่ถูกล็อก)</option><option value="matched" ${f.qs === 'matched' ? 'selected' : ''}>จับคู่ใบจองแล้ว</option>${Object.entries(QUOTA_STATUS).map(([k, v]) => `<option value="${k}" ${f.qs === k ? 'selected' : ''}>${v[0]}${k === 'arrived' || k === 'sold' ? ' (สำรองไว้ดู)' : ''}</option>`).join('')}<option value="arch" ${f.qs === 'arch' ? 'selected' : ''}>ถึงสาขา + ขายแล้ว (สำรองไว้ดู)</option></select></div>`}
    <div class="field"><label for="f-qmod">รุ่น</label><select id="f-qmod" data-filter="qModel"><option value="">ทุกรุ่น</option>${Object.keys(CATALOG).map(m => `<option ${f.qModel === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
  </div>
  ${isSales() ? (() => { const allQ = D.quota.filter(inBr).filter(q => (!f.qm || q.m === f.qm) && (!f.qModel || q.model === f.qModel)); const free = allQ.filter(q => q.open).length; return `<p class="text-sm mb-2">Quota ว่าง <b class="num" style="color:var(--good)">${free}</b> · ติดจองแล้ว <b class="num">${allQ.length - free}</b> (ไม่แสดงชื่อ)</p>`; })() : `<div class="flex flex-wrap gap-2 mb-3 text-sm">${Object.entries(QUOTA_STATUS).map(([k, v]) => qsChip(k, v[0], v[1], cnt[k] || 0, f.qs)).join('')}
    ${qsChip('matched', 'จับคู่ใบจองแล้ว', 'ink', matched, f.qs)}${f.qs ? '<button class="btn btn-ghost btn-sm" data-act="qs-pick" data-k="">ล้างตัวกรอง</button>' : ''}</div>
    ${arch ? '<p class="text-sm mb-2 p-2 rounded-lg" style="background:var(--surface-2)">หน้าสำรอง: Quota ที่ถึงสาขาหรือขายแล้ว รถเหล่านี้ดูและจัดการที่หน้าสต็อกรถ</p>' : !f.qs ? '<p class="text-xs text-muted mb-2">แสดงเฉพาะ Quota ที่ยังไม่ถึงสาขา (รอ VIN / ได้ VIN แล้ว รอรถ) · ที่ถึงสาขาแล้วและขายแล้วดูที่หน้าสต็อก หรือกดตัวเลขด้านบนเพื่อเปิดหน้าสำรอง</p>' : ''}`}
  ${list.length ? `<div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl">
    <thead><tr><th>Ref. Number</th><th>เดือนส่ง</th><th>สาขา</th><th>รุ่น / เกรด / สี</th><th>สถานะ</th><th>หมายเลขตัวถัง</th>${isSales() ? '' : '<th>ใบจองที่จับคู่ / ชื่อลูกค้า</th>'}<th>ล็อก</th><th></th></tr></thead>
    <tbody>${list.map(q => `<tr>
      <td class="code nowrap">${esc(q.ref)}</td><td class="num nowrap">${fmtM(q.m)}${q.week ? ` <span class="text-xs text-muted">W${q.week}</span>` : ''}</td><td><b>${esc(q.br)}</b></td>
      <td class="nowrap">${specLabel(q.spec)}</td><td>${statusChip(QUOTA_STATUS, q.st)}</td><td class="code text-xs nowrap">${esc(q.vin || '–')}</td>
      ${isSales() ? '' : `<td style="min-width:150px">${q.booking ? `<span class="code text-xs">${esc(q.bk)}</span> ${custCell(q.booking.cust, q.booking.owner, { seed: q.booking.seed })}<div class="text-xs text-muted">${esc(q.booking.owner || '')}</div>` : q.branchHold ? `<span class="text-muted">กันไว้ให้สาขา ${q.branchHold}</span>` : '<span class="text-muted">ยังว่าง</span>'}</td>`}
      <td class="text-sm">${q.lock ? lockText(q.lock) : ''}${q.temps.length ? `<div>${chip(`ล็อกชั่วคราว ${q.temps.length} คน`, 'warn')}</div>` : ''}</td>
      <td class="text-right nowrap">${!p.write || !p.request ? '' : (q.open || quotaQueue(q)) ? `<button class="btn btn-ghost btn-sm" data-act="lock-open" data-ref="${esc(q.ref)}">${q.open ? 'ล็อก' : 'ขอคิวต่อ'}</button>`
        : q.car && !q.booking && carLockable(q.car) ? `<button class="btn btn-ghost btn-sm" data-act="lock-open" data-vin="${esc(q.car.vin)}">${q.car.status === 'pending' ? 'ขอคิวต่อ' : 'ล็อกรถคันนี้'}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
    : `<div class="bg-surface border border-line rounded-lg">${emptyBox('ไม่มี Quota ตามตัวกรองนี้', 'อัปโหลดไฟล์ Quota จาก IDS ที่หน้าอัปเดตข้อมูล IDS')}</div>`}`;
}

// ---------- locks
function viewLock(D) {
  const vis = D.locks.filter(lockVisible);
  const pend = vis.filter(l => l.status === 'pending');
  const sub = S.sub.lock;
  const body = sub === 'active' ? activeList(D, vis) : sub === 'history' ? historyList(D) : approveList(D, pend);
  return `${pageHead('ล็อกรถ', `ล็อกให้ใบจอง ${LOCK_DAYS_BY.booking} วัน (ถ้าระบุวันรับรถแล้วถือไว้จนส่งมอบ) · ล็อกชั่วคราวให้ลูกค้าที่จะมาจอง ${LOCK_DAYS_BY.temp} วัน ล็อกซ้อนกันได้ ใครแนบใบจองก่อนได้ก่อน · ทุกการล็อกต้องให้ผู้จัดการอนุมัติ`)}
  ${tabs('lock', [['approve', 'รออนุมัติ', pend.length], ['active', 'ล็อกที่ใช้อยู่', String(vis.filter(l => l.live && l.status !== 'pending').length)], ['history', 'ประวัติ']])}${body}`;
}
const LOCK_TYPE = { booking: ['ล็อกให้ใบจอง', 'neutral'], temp: ['ล็อกชั่วคราว 7 วัน', 'warn'], dealer: ['แลก/ขายดีลเลอร์', 'neutral'] };
function lockRow(l, D, o = {}) {
  const p = perms();
  const car = l.vin ? D.cars.get(l.vin) : null;
  const q = l.ref ? D.quota.find(x => x.ref === l.ref) : null;
  const br = l.car_br || car?.br || q?.br;
  const stTxt = l.status === 'pending' ? chip('รออนุมัติ', 'warn')
    : l.status === 'approved' ? (l.mgrDue ? chip(`ครบกำหนด ผู้จัดการต่อหรือปล่อยภายใน ${fmtD(addDays(l.releaseOn, -1))}`, 'bad') : l.autoReleased ? chip(`ปล่อยคิวแล้ว ${fmtD(l.releaseOn)} (ผู้จัดการไม่ได้ต่อ)`, 'muted') : l.hold ? chip(`ถือไว้จนส่งมอบ ${fmtD(l.holdUntil)}`, 'red') : l.expired ? chip('หมดอายุ', 'bad') : chip(`ล็อก เหลือ ${l.daysLeft} วัน`, l.daysLeft <= 2 ? 'bad' : 'red'))
    : l.status === 'allocated' ? chip('แจ้งจัดสรรแล้ว รอไฟล์ IDS', 'ink') : l.status === 'rejected' ? chip('ไม่อนุมัติ', 'muted') : l.status === 'converted' ? chip('เปลี่ยนเป็นล็อกให้ใบจอง', 'muted') : l.status === 'bumped' ? chip(`มีคนจองก่อน (${l.bumped_by || ''})`, 'muted') : l.status === 'done' ? chip(l.ids_done ? 'สำเร็จ: IDS จัดสรรให้แล้ว' : l.type === 'dealer' ? 'ขายให้ดีลเลอร์แล้ว' : 'ส่งมอบแล้ว', 'good') : l.status === 'withdrawn' ? chip('ถอนคำขอแล้ว', 'muted') : chip('ปล่อยแล้ว', 'muted');
  const took = l.idsTook && !l.idsTook.same ? l.idsTook : null;
  const canDecide = p.write && l.status === 'pending' && (l.type === 'dealer' ? p.approveDealer : canApproveBr(br));
  const sheet = sheetTextOf(l);
  const mine = isMine(l.owner);
  // the person who sent the request (a sales for own customer, or an admin/manager on someone's behalf) can withdraw it
  const requester = mine || (!!l.requested_role && l.requested_role === roleLabel());
  const bk = l.booking;
  const rec = bk && bk.app ? bk.app.rec : null;
  const acts = [];
  // a request from the sheet: the manager can pick the booking (AT form or IDS) before approving
  if (canDecide && !took && sheet && !o.compact) acts.push(`<button class="btn btn-ghost btn-sm" data-act="lockbk-open" data-id="${l.id}">เลือกใบจอง</button>`);
  if (canDecide && !took) acts.push(`<button class="btn btn-red btn-sm" data-act="approve" data-id="${l.id}">อนุมัติ</button>`);
  if (canDecide) acts.push(`<button class="btn btn-ghost btn-sm" data-act="reject-open" data-id="${l.id}">ไม่อนุมัติ</button>`);
  if (l.status === 'pending' && p.write && requester && !o.compact) acts.push(`<button class="btn btn-ghost btn-sm" data-act="withdraw" data-id="${l.id}">ถอนคำขอ</button>`);
  if (canUndo(l) && p.write && !o.compact) acts.push(`<button class="btn btn-ghost btn-sm" data-act="undo" data-id="${l.id}" title="ย้อนกลับได้ภายใน ${UNDO_HOURS} ชั่วโมง">↶ ย้อนกลับ: ${esc(l.undo.act)}</button>`);
  if (l.status === 'approved' && p.write && !o.compact && took && (canAllocBr(br) || mine)) acts.push(`<button class="btn btn-red btn-sm" data-act="release-open" data-id="${l.id}">ปล่อยล็อก</button>`);
  // a dealer trade: พี่อั้ม (who approves trades for every branch) and the car's branch can change or cancel it
  const dealerMgr = l.type === 'dealer' && (p.approveDealer || canAllocBr(br));
  if (l.type === 'dealer' && p.write && !o.compact && (dealerMgr || requester) && ['pending', 'approved', 'allocated'].includes(l.status)) acts.push(`<button class="btn btn-ghost btn-sm" data-act="dealer-edit" data-id="${l.id}">แก้ไขดีลเลอร์</button>`);
  if (l.type === 'dealer' && p.write && !o.compact && dealerMgr && ['approved', 'allocated'].includes(l.status)) acts.push(`<button class="btn btn-red btn-sm" data-act="dealer-sold" data-id="${l.id}">ขายสำเร็จ · นำรถออก</button>`);
  if (l.type === 'dealer' && p.write && !o.compact && dealerMgr && ['approved', 'allocated'].includes(l.status) && !(l.live && canAllocBr(br))) acts.push(`<button class="btn btn-ghost btn-sm" data-act="release-open" data-id="${l.id}">ยกเลิกการแลก/ขาย</button>`);
  // a booking lock that is sold: the delivery is recorded in the booking (or comes from the IDS delivery file)
  if (l.type === 'booking' && p.write && !o.compact && ['approved', 'allocated'].includes(l.status) && bk && bk.app && (canAllocBr(br) || mine)) acts.push(`<button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(bk.app.id)}">ขายสำเร็จ · บันทึกส่งมอบ</button>`);
  if (l.status === 'approved' && p.write && !o.compact && l.live) {
    if (l.mgrDue && canApproveBr(br) && (l.finWait || (l.ext || 0) < MAX_EXT)) acts.push(`<button class="btn btn-red btn-sm" data-act="extend" data-id="${l.id}">ต่อ ${l.days} วัน${l.finWait ? ' (ไฟแนนซ์ยังไม่ผ่าน)' : ` (${l.ext || 0}/${MAX_EXT})`}</button>`);
    else if (!l.mgrDue && canApproveBr(br) && (l.ext || 0) < MAX_EXT && !l.hold) acts.push(`<button class="btn btn-ghost btn-sm" data-act="extend" data-id="${l.id}">ต่ออายุ ${l.days} วัน (${l.ext || 0}/${MAX_EXT})</button>`);
    if (l.type === 'temp' && mine && !l.bumped) acts.push(`<button class="btn btn-dark btn-sm" data-act="lock-convert" data-id="${l.id}">ลูกค้ามาจองแล้ว</button>`);
    if (rec && mine && l.finDue) acts.push(`<button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(bk.app.id)}">อัปเดตไฟแนนซ์</button>`);
    if (canAllocBr(br) && l.type !== 'temp') acts.push(`<button class="btn btn-dark btn-sm" data-act="allocate" data-id="${l.id}">จัดสรรใน IDS แล้ว</button>`);
    if (canAllocBr(br) || mine) acts.push(`<button class="btn btn-ghost btn-sm" data-act="release-open" data-id="${l.id}">${l.type === 'dealer' ? 'ยกเลิกการแลก/ขาย' : 'ยกเลิกล็อก (ปล่อยรถ)'}</button>`);
  }
  if (!o.compact && l.type === 'booking' && l.vin && ['approved', 'allocated'].includes(l.status) && canSwap(swapCtx(D, { lockId: l.id }))) acts.push(`<button class="btn btn-ghost btn-sm" data-act="swap-open" data-lock="${esc(l.id)}">เปลี่ยนคัน</button>`);
  const unit = l.vin ? `<span class="code font-medium">${esc(l.vin)}</span>` : `<span class="code font-medium">Quota ${esc(l.ref)}</span> <span class="text-xs text-muted">${q ? fmtM(q.m) : ''}</span>`;
  const reqH = (l.history || [])[0];
  return `<div class="p-3 md:px-4 flex flex-wrap gap-x-5 gap-y-2 items-center">
    <div class="w-36">${stTxt}<div class="mt-1">${chip(LOCK_TYPE[l.type]?.[0] || l.type, LOCK_TYPE[l.type]?.[1] || 'neutral')}</div>${l.queueN > 1 ? `<div class="mt-1">${chip(`คำขอที่ ${l.queuePos}/${l.queueN} ของคันนี้`, l.queuePos === 1 ? 'ink' : 'warn')}</div>` : ''}</div>
    <div class="min-w-[170px] flex-1"><div>${unit} <span class="text-muted">${esc(br || '')}</span></div><div class="text-sm">${specLabel(l.spec || car?.spec || q?.spec || '')}</div>${car ? `<div class="text-xs text-muted">${prodPlain(car)} · อายุ ${car.age ?? '–'} วัน</div>` : ''}${l.swap ? `<div class="text-xs" style="color:var(--warn)">เปลี่ยนคันจาก <span class="code">${esc(l.swap.from_vin)}</span> · ${esc(l.swap.reason)}</div>` : ''}</div>
    <div class="min-w-[180px] text-sm">${l.type === 'dealer' ? `ดีลเลอร์: ${esc(l.dealer_name || '')}` : l.type === 'temp' ? `ลูกค้าที่จะมาจอง: ${isSales() && !mine ? 'ของเซลล์อื่น' : esc(l.prospect || '–')}` : `ใบจอง ${esc(bookingLabel(l.bkref, D))}${bk ? ` · ${custCell(bk.cust, bk.owner, { seed: bk.seed })}` : ''}`}
      <div class="text-xs text-muted">เซลล์: ${esc(l.owner || l.sales_nick || '–')}${rec ? ` · ${esc(rec.purchase || '')}${rec.purchase === 'ไฟแนนซ์' ? ` ${esc(rec.fin_status || 'รอผล')}` : ''}` : ''}</div>
      ${sheet ? `<div class="text-xs text-muted">ข้อความในชีต: "${esc(sheet)}"${l.status === 'pending' && l.type === 'temp' && !took ? (() => { const n = sheetCands(l, D).length; return n ? ` · <span style="color:var(--warn)">มีใบจองที่อาจใช่ ${n} ใบ</span>` : ''; })() : ''}</div>` : ''}
      ${took ? `<div class="text-xs font-medium" style="color:var(--bad)">${took.st === 'booked' ? `IDS จัดสรรรถคันนี้ให้ใบจอง ${esc(took.no || '')}${took.cust ? ' ' + esc(took.cust) : ''} แล้ว · ใช้การจัดสรรจาก IDS` : `รถคันนี้ส่งมอบแล้ว${took.cust ? ' ให้ ' + esc(took.cust) : ''}`} · ${l.status === 'pending' ? 'กดไม่อนุมัติเพื่อปิดคำขอ' : 'กดปล่อยล็อกเพื่อปิดรายการ'}</div>` : l.idsTook ? `<div class="text-xs" style="color:var(--good)">${l.idsTook.st === 'delivered' ? 'ส่งมอบรถคันนี้ให้ใบจองนี้แล้ว' : 'IDS จัดสรรรถคันนี้ให้ใบจองนี้แล้ว'}</div>` : ''}
      ${l.idsInfo && ['pending', 'approved'].includes(l.status) ? `<div class="text-xs" style="color:var(--warn)">IDS จัดสรรรถคันนี้ให้ใบจอง ${esc(l.idsInfo.no || '')}${l.idsInfo.cust ? ' ' + esc(l.idsInfo.cust) : ''} แล้ว · ถ้าเป็น advanced invoice ยังอนุมัติได้ ตรวจก่อนอนุมัติ</div>` : ''}
      ${!l.idsTook && !l.idsInfo && car && ['invoiced', 'sold', 'company'].includes(car.st) && ['pending', 'approved'].includes(l.status) ? `<div class="text-xs" style="color:var(--warn)">IDS ${car.st === 'company' ? 'ออกใบกำกับเป็นรถบริษัท' : car.st === 'sold' ? 'แจ้งขายแล้ว' : 'ออกใบกำกับแล้ว'} แต่ยังไม่ส่งมอบ (เช่น advanced invoice) ยังอนุมัติได้</div>` : ''}
      ${l.bumped ? `<div class="text-xs" style="color:var(--bad)">มีใบจองของ ${esc(l.bumped.owner || '')} ได้รถคันนี้ไปแล้ว</div>` : l.challenged ? `<div class="text-xs" style="color:var(--warn)">มีใบจองของ ${esc(l.challenged.owner || '')} ขอล็อกคันนี้ รออนุมัติ</div>` : ''}</div>
    ${o.compact ? '' : `<div class="w-36 text-xs text-muted">${l.start ? `${fmtD(l.start)} → <b class="num" style="color:var(--fg)">${l.hold ? 'จนส่งมอบ' : fmtD(l.end)}</b>` : `ขอเมื่อ ${fmtDT(l.requested_at)}`}<div>ขอโดย ${who(reqH)}</div>${(() => { const d = l.status !== 'pending' ? decidedBy(l) : null; return d ? `<div>${esc(d.act)}: ${who(d)}</div>` : ''; })()}</div>`}
    ${(l.warnings || []).length && l.status === 'pending' ? `<div class="w-full text-xs" style="color:var(--warn)">⚠ ${l.warnings.map(esc).join(' · ')}${l.note ? `<div class="text-muted">${esc(l.note)}</div>` : ''}</div>` : ''}
    ${acts.length ? `<div class="ml-auto flex flex-wrap gap-2">${acts.join('')}</div>` : l.status === 'pending' && !o.compact ? `<div class="ml-auto text-xs text-muted">รอ${l.type === 'dealer' ? 'พี่อั้ม' : MGR_NAME[br] || 'ผู้จัดการ'}อนุมัติ${l.type === 'dealer' ? '' : ` (สาขา ${esc(br || '')})`} · ถอนคำขอได้เฉพาะคนที่ส่งคำขอ</div>` : ''}
  </div>`;
}
function approveList(D, pend) {
  const p = perms();
  pend = pend.sort((a, b) => (a.requested_at || '').localeCompare(b.requested_at || ''));
  // requests closed in the last day can be put back if the button was pressed by mistake
  const recent = D.locks.filter(lockVisible).filter(l => ['withdrawn', 'rejected', 'released'].includes(l.status) && canUndo(l)).sort((a, b) => (b.undo.at || '').localeCompare(a.undo.at || ''));
  // a manager sees own-branch requests first; other branches stay visible but folded away
  const decide = l => l.type === 'dealer' ? p.approveDealer : canApproveBr(l.car_br);
  const own = p.approve ? pend.filter(decide) : pend, other = p.approve ? pend.filter(l => !decide(l)) : [];
  return `<p class="text-sm text-muted mb-3">${!p.approve ? `บทบาท ${esc(roleLabel())} ${isSales() ? 'เห็นเฉพาะคำขอของตัวเอง ' : ''}อนุมัติไม่ได้ · ` : ''}พี่อั้มอนุมัติสาขา PSC, ATE · นุชอนุมัติสาขา SPH, KPA (ตามสาขาของรถ) · ขอล็อกรถได้ทุกสาขา · แลก/ขายดีลเลอร์ พี่อั้มอนุมัติ</p>
  <div class="bg-surface border border-line rounded-lg divide-y divide-line">${own.map(l => lockRow(l, D)).join('') || emptyBox(p.approve ? 'ไม่มีคำขอที่รอคุณอนุมัติ' : 'ไม่มีคำขอที่รออนุมัติ', 'ขอล็อกได้จากรถรายคันในหน้าสต็อก จาก Quota หรือจากใบจองในหน้า Booking')}</div>
  ${other.length ? `<details class="mt-4"><summary class="cursor-pointer text-sm font-medium">คำขอของสาขาอื่น (ดูอย่างเดียว) ${other.length}</summary><div class="bg-surface border border-line rounded-lg divide-y divide-line mt-2">${other.map(l => lockRow(l, D)).join('')}</div></details>` : ''}
  ${recent.length ? `<h2 class="font-head text-lg font-semibold mt-6 mb-1">เพิ่งถอน ไม่อนุมัติ หรือปล่อยล็อก</h2><p class="text-sm text-muted mb-2">ถ้ากดผิด กด "ย้อนกลับ" ได้ภายใน ${UNDO_HOURS} ชั่วโมง</p>
    <div class="bg-surface border border-line rounded-lg divide-y divide-line">${recent.map(l => lockRow(l, D)).join('')}</div>` : ''}`;
}
function activeList(D, vis) {
  const act = vis.filter(l => l.live && l.status !== 'pending' && !l.idsAsk).sort((a, b) => (b.needExt - a.needExt) || (b.finDue - a.finDue) || (a.status === 'allocated') - (b.status === 'allocated') || (a.end || '').localeCompare(b.end || ''));
  // locks IDS has overtaken (to close), and queues released by themselves in the last 3 days
  const close = vis.filter(l => l.status === 'approved' && l.idsTook && !l.idsTook.same);
  const auto = vis.filter(l => l.autoReleased && !l.idsTook && daysBetween(l.releaseOn, D.today) <= 3);
  return `${lockIdsList(D, vis)}${close.length ? `<h2 class="font-head text-lg font-semibold mb-2" style="color:var(--bad)">IDS จัดสรรรถไปแล้ว ต้องปิดล็อกนี้ <span class="text-base">${close.length}</span></h2><div class="bg-surface border border-line rounded-lg divide-y divide-line mb-5">${close.map(l => lockRow(l, D)).join('')}</div>` : ''}
  <div class="bg-surface border border-line rounded-lg divide-y divide-line">${act.map(l => lockRow(l, D)).join('') || emptyBox('ยังไม่มีรถที่ล็อกอยู่', `เมื่อผู้จัดการอนุมัติ รถจะเปลี่ยนเป็นล็อกและนับถอยหลัง`)}</div>
  <p class="text-xs text-muted mt-2">ล็อก ${LOCK_DAYS_BY.booking} วัน (ใบจอง / ดีลเลอร์): วันสุดท้ายแจ้งผู้จัดการให้ต่อหรือปล่อย ถ้าไม่ต่อภายใน ${MGR_GRACE} วันหลังครบกำหนด ระบบปล่อยคิวเอง · ล็อกชั่วคราว ${LOCK_DAYS_BY.temp} วัน หมดแล้วปล่อยเอง</p>
  ${auto.length ? `<h2 class="font-head text-lg font-semibold mt-6 mb-2">ปล่อยคิวอัตโนมัติ 3 วันล่าสุด <span class="text-muted text-base">${auto.length}</span></h2><div class="bg-surface border border-line rounded-lg divide-y divide-line">${auto.map(l => lockRow(l, D)).join('')}</div>` : ''}`;
}
function historyList(D) {
  const ev = [];
  const ht = S.filters.histType || '';
  D.locks.filter(lockVisible).filter(l => !ht || ht === l.type).forEach(l => (l.history || []).forEach(h => ev.push({ ...h, vin: l.vin || ('Quota ' + l.ref),
    act: `${h.act}${l.type === 'dealer' ? ' · แลก/ขายดีลเลอร์' : l.type === 'temp' ? ' · ล็อกชั่วคราว' : ''}`, note: [l.type === 'dealer' && !String(h.note || '').includes(l.dealer_name || '\u0000') ? `ดีลเลอร์ ${l.dealer_name || ''}` : '', h.note].filter(Boolean).join(' · ') })));
  if (!isSales() && (!ht || ht === 'car')) {
    for (const [vin, o] of S.vehicles) {
      if (o.added) ev.push({ ...o.added, act: o.added.receipt ? 'รับรถเข้า (ยืนยันจากรูป)' : 'รับรถเข้า', vin });
      if (o.removed) ev.push({ ...o.removed, act: 'นำรถออก', vin, note: o.removed.dealer || o.removed.note });
      if (o.moved) ev.push({ ...o.moved, act: `ย้ายไป ${o.branch}`, vin });
      if (o.prod_info) ev.push({ ...o.prod_info, act: 'ใส่วันผลิต', vin, note: fmtD(o.prod_info.date) });
    }
    for (const [, u] of S.uploads) ev.push({ at: u.at, by: u.by, role: u.role, act: `อัปโหลด ${SRC_LABEL[u.src]} ${u.br}`, note: `${u.n} แถว · ข้อมูล ณ ${fmtD(u.asof)}` });
  }
  ev.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  const chips = [['', 'ทั้งหมด'], ['booking', 'ล็อกให้ใบจอง'], ['temp', 'ล็อกชั่วคราว'], ['dealer', 'แลก/ขายดีลเลอร์'], ...(isSales() ? [] : [['car', 'รถเข้า-ออก / อัปโหลด']])];
  return `<div class="flex flex-wrap gap-2 mb-3" role="group" aria-label="ประเภทประวัติ">${chips.map(([k, t]) => `<button class="btn btn-sm ${ht === k ? 'btn-dark' : 'btn-ghost'}" data-act="hist-type" data-k="${k}" aria-pressed="${ht === k}">${t}</button>`).join('')}</div>
  <div class="bg-surface border border-line rounded-lg divide-y divide-line">${ev.slice(0, 300).map(e => `<div class="p-3 md:px-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
    <span class="w-32 num text-muted">${fmtDT(e.at)}</span><span class="w-52 font-medium">${esc(e.act)}</span>
    <span class="code">${esc(e.vin || '')}</span><span class="flex-1 min-w-0 text-muted">${esc(e.note || '')}</span><span>${who(e)}</span></div>`).join('')
    || emptyBox('ยังไม่มีประวัติ', 'ทุกการขอล็อก อนุมัติ ต่ออายุ ปล่อยล็อก รับรถ และอัปโหลดไฟล์ จะเก็บไว้ที่นี่พร้อมชื่อผู้ทำ')}</div>`;
}

// ---------- delivery flow
// a booking with its car allocated waits for delivery; the paperwork still missing is listed and filled at delivery (ตกลง 13/10)
const FLOW_TABS = [['booked', 'รอเลขที่ใบเสร็จจอง'], ['fin', 'รอไฟแนนซ์ผ่าน'], ['assign', 'รอจัดสรรรถ'], ['delivered', 'จัดสรรแล้ว รอส่งมอบ'], ['confirmed', 'รอผู้จัดการยืนยัน'], ['done', 'ยืนยันแล้ว']];
function flowTab(a) {
  const f = a.flow;
  if (f.history) return null;
  if (f.done.confirmed) return 'done';
  if (f.done.delivered || f.lateUpdate) return 'confirmed';
  if (f.done.assign) return 'delivered';
  return f.next;
}
function flowMissing(a) { return ['booked', 'fin', 'po', 'down'].filter(k => !a.flow.done[k]).map(k => ({ booked: 'ใบเสร็จมัดจำ', fin: 'ไฟแนนซ์', po: 'PO แต่งรถ', down: 'ใบเสร็จดาวน์' })[k]); }
function viewFlow(D) {
  const vis = D.at.filter(a => !a.cancelled && !a.demo && inBr(a) && atVisible(a));
  const inTab = (a, t) => flowTab(a) === t;
  const sub = FLOW_TABS.some(t => t[0] === S.sub.flow) ? S.sub.flow : 'booked';
  const list = vis.filter(a => inTab(a, sub)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return `${pageHead('ขั้นตอนส่งมอบ', 'จอง (เลขที่ใบเสร็จมัดจำ) → ไฟแนนซ์ผ่าน (ยืนยันบริษัท + แนบใบอนุมัติ) → จัดสรรรถ → PO สั่งแต่ง → แต่งรถ → ชำระดาวน์ (เลขที่ใบเสร็จ) → ส่งมอบ (ป้ายแดง + ประกัน) → ผู้จัดการยืนยัน เพื่อไปขั้นตอนจ่ายค่าคอม ต้องทำตามลำดับ ข้ามขั้นไม่ได้')}
  ${brSeg()}
  ${tabs('flow', FLOW_TABS.map(([k, t]) => [k, t, String(vis.filter(a => inTab(a, k)).length)]))}
  ${list.length ? `<div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl">
    <thead><tr><th>วันที่จอง</th><th>ชื่อลูกค้า</th><th>เซลล์ / สาขา</th><th>รุ่น / เกรด / สี</th><th>IDS</th><th>ทำแล้ว</th><th></th></tr></thead>
    <tbody>${list.slice(0, 300).map(a => `<tr>
      <td class="num nowrap">${fmtD(a.date)}</td><td style="min-width:150px">${custCell(a.cust, a.sales)}</td>
      <td class="nowrap">${salesCell(a.sales, a.idsSales, a.ownerCheck)}<div class="text-xs text-muted">${esc(a.br || '')}</div>${crossChip(a)}</td>
      <td class="nowrap">${specLabel(a.spec)}</td><td class="nowrap">${matchChip(a)}</td>
      <td class="nowrap">${flowDots(a)}${sub === 'delivered' && flowMissing(a).length ? `<div class="text-xs" style="color:var(--warn)">ยังขาด: ${flowMissing(a).join(', ')}</div>` : ''}</td>
      <td class="text-right nowrap">${sub === 'delivered' && atVin(a) ? delivBtn(carAny(atVin(a), D) || { vin: atVin(a) }, D) : ''}<button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(a.id)}">เปิด</button></td></tr>`).join('')}</tbody></table></div>`
    : `<div class="bg-surface border border-line rounded-lg">${emptyBox('ไม่มีรายการในขั้นนี้', 'เปิดใบจองจากหน้า Booking เพื่ออัปเดตขั้นตอน')}</div>`}
  ${sub === 'delivered' ? '<p class="text-xs text-muted mt-2">ใบจองที่ได้รถแล้ว (จัดสรรในระบบนี้หรือ IDS) รอส่งมอบ · เอกสารที่ยังขาดใส่ได้ตอนกด "ส่งมอบ" ในหน้าต่างเดียว</p>' : sub === 'confirmed' ? '<p class="text-xs text-muted mt-2">รวมใบจองที่ IDS แสดงว่าส่งมอบแล้วเดือนนี้แต่เซลล์ยังไม่อัปเดตในระบบ AT</p>' : ''}`;
}
const flowDots = a => FLOW.map(k => `<span title="${FLOW_LABEL[k]}" class="inline-block w-2.5 h-2.5 rounded-full mr-1" style="background:${a.flow.done[k] ? 'var(--good)' : (a.flow.next === k ? 'var(--warn)' : 'var(--line)')}"></span>`).join('');
