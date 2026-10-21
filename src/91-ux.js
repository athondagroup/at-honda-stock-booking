// ------------------------------------------------------------------ ปรับการใช้งานตามบทวิเคราะห์ 19/10 (ตัวอย่างใน artifact ก่อนขึ้นเว็บ)
// - the first page follows the role · งานวันนี้ heads the work tabs · each branch's data date next to the sales figures
// - two ages for a car (in stock / since production) · one list of wrong / missing / to-match data for the admin
// - the booking list: sort, page by 50, the filters in use with one clear button
// Only function declarations here: the first render runs before this part of the file.
function startView() {
  const r = S.role.role;
  return r === 'sales' ? 'dash' : r === 'admin' ? 'datafix' : r === 'exec' ? 'dash' : perms().approve ? 'inbox' : 'alerts';
}
// ---- ages: days in stock and days since production, never one number with a *
function ageCell(c) {
  if (!c) return '–';
  const st = c.stockAge ?? null, pr = c.prodAge ?? null;
  return `<div class="text-xs leading-tight"><div>สต็อก ${st === null ? '–' : ageBar(st)}</div><div>${pr === null ? '<span style="color:var(--warn)">ผลิต: รอระบุ</span>' : `ผลิต ${ageBar(pr)}`}</div></div>`;
}
// ---- how fresh each branch's IDS data is
function dlAsof(br, D) { const m = D.X.src[br]; return m && m.invoice ? m.invoice.asof || null : null; }
function freshInfo(D) {
  const brs = BRS.filter(b => inBr({ br: b }));
  const rows = brs.map(b => ({ b, dl: dlAsof(b, D), st: D.X.src[b] && D.X.src[b].stock ? D.X.src[b].stock.asof : null, bk: D.X.src[b] && D.X.src[b].booking ? D.X.src[b].booking.asof : null }));
  const latest = rows.map(r => r.dl).filter(Boolean).sort().pop() || null;
  rows.forEach(r => { r.lag = r.dl && latest ? daysBetween(r.dl, latest) : null; r.stale = !r.dl || (r.lag !== null && r.lag >= 3); r.thisMonth = !!(r.dl && r.dl.slice(0, 7) === D.today.slice(0, 7)); });
  return { rows, latest, stale: rows.filter(r => r.stale) };
}
function freshChip(br, D) {
  const f = freshInfo(D).rows.find(r => r.b === br); if (!f) return '';
  if (!f.dl) return chip('ไม่มีข้อมูล DL', 'bad');
  return chip(`${fmtD(f.dl)}${f.lag === 0 ? ' · ล่าสุด' : !f.thisMonth ? ' · ยังไม่มีเดือนนี้' : ` · ขาด ${f.lag} วัน`}`, f.lag === 0 ? 'good' : !f.thisMonth ? 'bad' : 'neutral');
}
function dataFreshBox(D) {
  const f = freshInfo(D);
  if (!f.rows.length) return '';
  if (!f.stale.length) return `<p class="text-xs text-muted mb-3">ข้อมูลใบกำกับ/ส่งมอบ (DL) ทุกสาขาถึง ${fmtD(f.latest)}</p>`;
  return `<div class="p-3 rounded-lg mb-4 text-sm flex flex-wrap items-center gap-x-4 gap-y-1" style="background:var(--warn-soft)">
    <b>ยอดยังเทียบกันไม่ได้ครบ</b>
    <span>DL ${f.stale.map(r => `${r.b} ${r.dl ? 'ถึง ' + fmtD(r.dl) : 'ไม่มีข้อมูล'}`).join(' · ')} (สาขาอื่นถึง ${fmtD(f.latest)})</span>
    ${perms().upload !== false && !isSales() ? '<button class="underline ml-auto" data-act="go" data-view="upload">อัปโหลด DL ล่าสุด</button>' : ''}</div>`;
}
// ---- งานวันนี้: counts above the work tabs
function todayHead(D) {
  const badges = badgeCounts(D), mine = myAlerts(D);
  const late = mine.filter(a => a.tone === 'bad').length;
  const soon = D.at.filter(a => inBr(a) && a.active && a.rec.delivery_plan && a.rec.delivery_plan >= D.today && daysBetween(D.today, a.rec.delivery_plan) <= 7 && (!isSales() || isMine(a.sales))).length;
  const tile = (n, t, view, tone) => `<button class="text-left p-3 rounded-lg border ${S.view === view ? 'border-ink' : 'border-line'} bg-surface" data-act="nav" data-view="${view}"><div class="num text-2xl font-semibold" ${tone ? `style="color:var(--${tone})"` : ''}>${n}</div><div class="text-xs">${t}</div></button>`;
  return `<p class="text-sm text-muted mb-2">งานวันนี้ · ${fmtD(D.today)} · รวมแจ้งเตือน งานรออนุมัติ และงานค้างไว้ที่เดียว</p>
  ${isSales() ? '' : dataFreshBox(D)}
  <div class="grid grid-cols-3 gap-2 mb-4">${perms().approve ? tile(badges.inbox || 0, 'รอฉันอนุมัติ', 'inbox', '') : tile(badges.inbox || 0, 'คำขอของฉัน', 'inbox', '')}${tile(late, 'ต้องทำทันที / เกินกำหนด', 'alerts', late ? 'bad' : '')}${tile(soon, 'นัดส่งมอบภายใน 7 วัน', 'alerts', '')}</div>`;
}
// ---- one list for the admin: wrong, missing, to match
function datafixItems(D) {
  const f = freshInfo(D);
  const at = D.at.filter(a => inBr(a));
  const upl = [...S.uploads.values()].filter(u => inBr(u));
  const outStock = upl.filter(u => u.src === 'stock').reduce((n, u) => n + (u.out || []).filter(o => outOpen(u, o)).length, 0);
  const outBk = upl.filter(u => u.src === 'booking').reduce((n, u) => n + (u.out || []).filter(o => typeof bkOutPending === 'function' ? bkOutPending(o) : o.flag && !o.res).length, 0);
  return [
    ['ไฟล์ IDS', [
      ['DL (ใบกำกับ/ส่งมอบ) ไม่ได้อัปเดต', f.stale.map(r => r.b).join(', ') || 0, 'bad', { act: 'go', view: 'upload' }],
      ['รถยังไม่มีวันผลิต', [...D.cars.values()].filter(c => inBr(c) && !c.prod).length, 'warn', { act: 'noprod', on: '1' }]]],
    ['ใบจอง', [
      ['ฟอร์ม AT ยังไม่อยู่ใน IDS', at.filter(a => a.active && !a.match).length, 'bad', { act: 'book-filter', st: 'noids' }],
      ['มีใน IDS แต่ไม่มีฟอร์ม AT', D.idsOnly.filter(b => inBr(b)).length, 'bad', { act: 'book-filter', st: 'noat' }],
      ['รอยืนยันการจับคู่ / รุ่นไม่ตรง / เจ้าของเคส', at.filter(a => a.matchAsk || a.ownerCheck === 'pending' || a.ownerCheck === 'disputed').length, 'warn', { act: 'book-filter', st: 'confirm' }],
      ['หายจาก IDS ต้องตรวจ', outBk, 'warn', { act: 'go', view: 'upload' }],
      ['ใบจองยังไม่มีเลขที่ใบเสร็จมัดจำ', at.filter(a => a.active && !a.rec.receipt_no && !a.rec.imported).length, 'neutral', { act: 'go', view: 'flow', sub: 'booked' }]]],
    ['รถและล็อก', [
      ['รถออกจากสต็อก ไม่รู้ว่าไปไหน', outStock, 'bad', { act: 'go', view: 'upload' }],
      ['IDS จัดสรรรถที่มีล็อก ชื่อไม่ตรง', D.locks.filter(l => l.idsAsk && ['pending', 'approved', 'allocated'].includes(l.status) && inBr({ br: l.car_br })).length, 'warn', { act: 'go', view: 'lock', sub: 'active' }],
      ['รับรถเข้ารอยืนยัน', D.receipts.filter(r => r.status === 'pending' && inBr(r)).length, 'neutral', { act: 'go', view: 'receive' }]]]
  ];
}
function viewDatafix(D) {
  const btnAttrs = a => Object.entries(a).map(([k, v]) => k === 'act' ? `data-act="${esc(v)}"` : `data-${k}="${esc(v)}"`).join(' ');
  const secs = datafixItems(D);
  const total = secs.reduce((t, [, rows]) => t + rows.filter(r => r[1] && r[1] !== 0).length, 0);
  return `${pageHead('ข้อมูลผิด / ขาด / ต้องจับคู่', 'รวมทุกเรื่องที่เคยกระจายอยู่หลายหน้าไว้ที่เดียว กดหัวข้อเพื่อเปิดรายการพร้อมปุ่มแก้')}
  ${brSeg()}${dataFreshBox(D)}
  <div class="grid md:grid-cols-3 gap-4">${secs.map(([h, rows]) => `<section class="bg-surface border border-line rounded-lg p-3"><h2 class="font-head font-semibold mb-1">${h}</h2>
    ${rows.map(([t, n, tone, a]) => `<button class="w-full flex items-center justify-between gap-2 py-3 border-t border-line text-left text-sm" ${btnAttrs(a)}><span>${t}</span>${n && n !== 0 ? chip(String(n), tone) : '<span class="text-xs text-muted">ไม่มี</span>'}</button>`).join('')}</section>`).join('')}</div>
  <p class="text-xs text-muted mt-3">${total ? `มี ${total} หัวข้อที่ต้องดู` : 'ไม่มีอะไรค้าง'} · นับตามสาขาที่เลือกด้านบน</p>`;
}
// ---- booking list helpers
// how much open work a row has: things to fix first, then next steps, then waiting
function bkWorkRank(r, D) {
  const a = r.a;
  if (r.noForm) return 5;
  if (a && a.change) return 5;
  if (a && (a.matchAsk || a.ownerCheck === 'pending')) return 4;
  if (a && a.active && !a.match) return 4;
  if (a && a.active && a.flow && a.flow.next) return 3;
  if (r.row && r.row.state === 'waiting') return 2;
  return a && !a.active ? 0 : 1;
}
function bkEntered(r) { const a = r.a; return (a && (a.rec.created_at || a.rec.imported_at)) || r.date || ''; }
// the filters in use, each with its own ✕, and one "clear all"
function bkFilterBar(f, st, q) {
  const on = [];
  if (S.br) on.push([`สาขา ${S.br}`, 'br']);
  if (f.aq) on.push([`ค้นหา "${f.aq}"`, 'aq']);
  if (st && st !== 'active') on.push([(BOOK_FILTERS.find(x => x[0] === st) || [, st])[1], 'aState']);
  if (f.qModel) on.push([f.qModel, 'qModel']);
  if (f.bGrade) on.push([f.bGrade, 'bGrade']);
  if (f.bColor) on.push([f.bColor, 'bColor']);
  if (f.bSales) on.push([f.bSales, 'bSales']);
  if (f.bDFrom || f.bDTo) on.push([`${f.bDType === 'sale' ? 'ขาย' : 'จอง'} ${f.bDFrom ? fmtD(f.bDFrom) : '…'}–${f.bDTo ? fmtD(f.bDTo) : '…'}`, 'bDate']);
  if (!on.length) return '';
  return `<div class="flex flex-wrap items-center gap-2 mb-3 p-2 rounded-lg border border-line bg-surface text-sm"><span class="text-muted">กำลังกรอง:</span>${on.map(([t, k]) => `<button class="chip" style="cursor:pointer" data-act="fclear" data-k="${k}" aria-label="เอาตัวกรอง ${esc(t)} ออก">${esc(t)} ✕</button>`).join('')}<button class="underline ml-auto" data-act="fclear" data-k="*">ล้างทั้งหมด</button></div>`;
}
function pager(pg, pages) {
  if (pages <= 1) return '';
  const b = (n, t, lab) => `<button class="btn btn-sm ${n === pg ? 'btn-dark' : 'btn-ghost'}" data-act="bpage" data-p="${n}" ${n < 1 || n > pages ? 'disabled' : ''} ${lab ? `aria-label="${lab}"` : ''}>${t}</button>`;
  const nums = [...new Set([1, pg - 1, pg, pg + 1, pages])].filter(n => n >= 1 && n <= pages).sort((x, y) => x - y);
  return `<nav class="flex flex-wrap gap-1 justify-center mt-3" aria-label="หน้า">${b(pg - 1, '‹', 'หน้าก่อน')}${nums.map(n => b(n, String(n))).join('')}${b(pg + 1, '›', 'หน้าถัดไป')}</nav>`;
}
Object.assign(ACTIONS, {
  bpage(el) { S.filters.bPage = Number(el.dataset.p) || 1; render(); window.scrollTo(0, 0); },
  fclear(el) {
    const k = el.dataset.k, f = S.filters;
    if (k === '*') { ['aq', 'qModel', 'bGrade', 'bColor', 'bSales', 'bDFrom', 'bDTo'].forEach(x => { f[x] = ''; }); f.aState = 'active'; setBr(''); }
    else if (k === 'br') setBr('');
    else if (k === 'bDate') { f.bDFrom = ''; f.bDTo = ''; }
    else if (k === 'aState') f.aState = 'active';
    else f[k] = '';
    f.bPage = 1; render();
  }
});
// ---- booking detail: who has to do what next, by when, on top (บทวิเคราะห์ 19/10)
function nextStepWho(k) { return { booked: 'เซลล์ / แอดมินสาขา ใส่เลขที่ใบเสร็จมัดจำ', fin: 'เซลล์ อัปเดตไฟแนนซ์', assign: 'แอดมิน / ผู้จัดการ จัดสรรรถ', po: 'เซลล์ ทำ PO สั่งแต่ง', down: 'เซลล์ บันทึกการชำระ', delivered: 'เซลล์ / แอดมิน บันทึกส่งมอบ', confirmed: 'ผู้จัดการ ยืนยันส่งมอบ' }[k] || ''; }
function nextStepBox(a, D, mine) {
  const r = a.rec, n = a.flow && a.flow.next;
  const vin = (a.match && a.match.vin) || (r.flow && r.flow.assign && r.flow.assign.vin) || null;
  const head = `<div class="text-sm">${mine ? `<b>${esc(a.cust || '')}</b> · ` : ''}${esc(a.model || '')} ${esc(gradeShort(a.model, a.grade) || '')} ${esc(a.color || '')} · เซลล์ ${esc(a.sales || '')}${a.no ? ` · ใบจอง <span class="code">${esc(a.no)}</span>` : ''}${vin ? ` · รถ <span class="code">${esc(vin)}</span>` : ''}</div>`;
  const dates = [['วันที่จอง', fmtD(a.date)], ['บันทึกเข้าระบบ', r.created_at ? fmtDT(r.created_at) + (r.imported ? ' (จากฟอร์ม)' : '') : '–'], ['เริ่มคิว', fmtD(r.queue_date || r.booking_date || a.date)]];
  let due = null;
  if (n === 'fin' && a.date) { due = addDays(a.date, 15); dates.push(['ครบกำหนดไฟแนนซ์อนุมัติผ่าน (15 วันจากวันจอง)', fmtD(due)]); }
  if (r.delivery_plan) dates.push(['นัดรับรถ', fmtD(r.delivery_plan)]);
  const late = due && due < D.today ? daysBetween(due, D.today) : 0;
  const body = a.cancelled ? '<div class="font-semibold">ยกเลิกแล้ว</div>' : a.done ? '<div class="font-semibold" style="color:var(--good)">ส่งมอบแล้ว</div>'
    : n ? `<div class="text-xs text-muted">ขั้นต่อไป</div><div class="text-lg font-semibold">${esc(FLOW_LABEL[n] || n)}</div><div class="text-sm">${esc(nextStepWho(n))}${late ? ` · <b style="color:var(--bad)">เลยกำหนด ${late} วัน</b>` : ''}</div>
      <button class="btn btn-red btn-sm mt-2 self-start" data-act="scroll-flow">ไปที่ขั้นนี้</button>` : '<div class="text-sm">ไม่มีขั้นที่ต้องทำ</div>';
  const ro = !a.cancelled && !a.done && !(perms().write && canEditBooking(a)) ? `<div class="text-xs p-2 rounded" style="background:var(--surface-2)">ดูได้อย่างเดียว: ใบจองสาขา ${esc(a.br)} แก้ได้โดยเซลล์เจ้าของ (${esc(a.sales || '–')}) แอดมินสาขา ${esc(a.br)} และผู้จัดการสาขา ${esc(a.br)}${mgrNameOf(a.br) ? ` (${esc(mgrNameOf(a.br))})` : ''} · บทบาทตอนนี้: ${esc(roleLabel())}</div>` : '';
  const holdTxt = n && n !== 'fin' && n !== 'booked' && a.rec.delivery_plan ? '<div class="text-xs" style="color:var(--good)">ไฟแนนซ์ผ่านและยืนยันวันออกรถแล้ว: ล็อกคิวไว้จนส่งมอบ ไม่ปลดล็อก ไม่ถามซ้ำ</div>' : '';
  return `<div class="p-3 rounded-lg border-2 mb-4 flex flex-col gap-2" style="border-color:${a.cancelled || a.done ? 'var(--line)' : 'var(--red)'}">${head}<div class="flex flex-col">${body}</div>${holdTxt}${ro}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">${dates.map(([k, v]) => `<div><div class="text-muted">${k}</div><div class="num">${v}</div></div>`).join('')}</div></div>`;
}
Object.assign(ACTIONS, { 'scroll-flow'(el) { const t = document.querySelector('#modal-root [data-flow-steps]') || document.querySelector('#modal-root h3'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
// ---- one search for everything: customers, booking numbers, VIN (the last 6 digits are enough), quota Ref
function gsearchModal(m, D) {
  const q = String(m.q || '').trim(), k = searchKey(q), up = q.toUpperCase().replace(/\s+/g, '');
  const scope = m.all === false ? 'br' : 'all', inScope = x => scope === 'all' || inBr(x);
  let cars = [], bks = [], qs = [];
  if (q.length >= 2) {
    const vinHit = v => v && (String(v).toUpperCase().endsWith(up) || (up.length >= 6 && String(v).toUpperCase().includes(up)));
    cars = [...D.cars.values(), ...D.deliveredOut].filter(c => inScope(c) && (vinHit(c.vin) || (c.ref && String(c.ref).toUpperCase().includes(up)))).slice(0, 10);
    bks = bookRows(D).filter(r => rowVisible(r) && inScope(r) && ([r.no, r.owner, r.idsSales].some(x => x && searchKey(x).includes(k)) || vinHit(r.vin) || ((!isSales() || isMine(r.owner)) && [r.cust, r.b && r.b.cust].some(x => x && searchKey(x).includes(k))))).slice(0, 12);
    qs = D.quota.filter(x => inScope(x) && ((x.ref && String(x.ref).toUpperCase().includes(up)) || vinHit(x.vin))).slice(0, 8);
  }
  const vinShow = v => { const s = String(v || ''); return up && s.toUpperCase().endsWith(up) ? `${esc(s.slice(0, s.length - up.length))}<b style="background:var(--warn-soft)">${esc(s.slice(-up.length))}</b>` : esc(s); };
  const sec = (t, n, body) => n ? `<section class="mb-3"><h3 class="font-semibold text-sm mb-1">${t} ${n}</h3><div class="flex flex-col gap-1">${body}</div></section>` : '';
  const btn = (attrs, html) => `<button class="text-left p-2 rounded-lg border border-line bg-surface text-sm" ${attrs}>${html}</button>`;
  return `<div class="flex items-start justify-between gap-3 mb-2"><h2 class="font-head text-xl font-semibold">ค้นหาทุกอย่าง</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="field mb-2"><label for="gs-q">ชื่อลูกค้า เลขใบจอง เซลล์ VIN (ท้าย 6 หลักพอ) หรือ Ref</label><input id="gs-q" type="search" data-modal="q" value="${esc(q)}" autofocus></div>
  <div class="flex gap-2 mb-3 text-sm"><button class="btn btn-sm ${scope === 'all' ? 'btn-dark' : 'btn-ghost'}" data-act="gsearch-scope" data-v="all">ทุกสาขา</button><button class="btn btn-sm ${scope === 'br' ? 'btn-dark' : 'btn-ghost'}" data-act="gsearch-scope" data-v="br" ${S.br ? '' : 'disabled'}>เฉพาะ ${S.br || 'สาขาที่เลือก'}</button></div>
  ${q.length < 2 ? '<p class="text-sm text-muted">พิมพ์อย่างน้อย 2 ตัว</p>' : !(cars.length + bks.length + qs.length) ? `<p class="text-sm text-muted">ไม่พบ "${esc(q)}" ใน${scope === 'all' ? 'ทุกสาขา' : ' ' + S.br}</p>`
    : `<p class="text-xs text-muted mb-2">ค้นใน${scope === 'all' ? 'ทุกสาขา' : ' ' + S.br} ตามสิทธิ์ที่เห็นได้${isSales() ? ' (เซลล์เห็นชื่อลูกค้าเฉพาะของตัวเอง)' : ''}</p>
    ${sec('รถ', cars.length, cars.map(c => btn(`data-act="car-open" data-vin="${esc(c.vin)}"`, `<span class="code">${vinShow(c.vin)}</span><span class="block text-xs text-muted">${specLabelText(c.spec || specKey(c.model, c.grade, c.color))} · ${esc(c.br || '')} · ${c.handed ? 'ส่งมอบแล้ว' : esc((CAR_STATUS[c.status] || [c.status])[0] || '')}</span>`)).join(''))}
    ${sec('ใบจอง', bks.length, bks.map(r => btn(r.a ? `data-act="at-open" data-id="${esc(r.a.id)}"` : `data-act="go" data-view="book" data-q="${esc(r.no || '')}"`, `<b>${(!isSales() || isMine(r.owner)) ? esc(r.cust || '') : 'ลูกค้าของเซลล์อื่น'}</b><span class="block text-xs text-muted">${esc(r.no || 'ยังไม่อยู่ใน IDS')} · ${esc(r.br || '')} · ${esc(r.owner || '')} · ${specLabelText(r.spec)}${r.vin ? ` · VIN …${esc(String(r.vin).slice(-6))}` : ''}</span>`)).join(''))}
    ${sec('Quota', qs.length, qs.map(x => btn(`data-act="go" data-view="quota"`, `<b>Ref ${esc(x.ref || '')}</b><span class="block text-xs text-muted">${specLabelText(x.spec)} · ${esc(x.br || '')}${x.vin ? ` · VIN …${esc(String(x.vin).slice(-6))}` : ''}</span>`)).join(''))}`}`;
}
Object.assign(ACTIONS, {
  'gsearch-open'() { S.modal = { kind: 'gsearch', q: '', all: true }; render(); setTimeout(() => { const i = document.getElementById('gs-q'); if (i) i.focus(); }, 30); },
  'gsearch-scope'(el) { if (S.modal) { S.modal.all = el.dataset.v !== 'br'; render(); } }
});
function mgrNameOf(br) { const k = Object.keys(MGR_OF).find(r => MGR_OF[r].includes(br)); return k ? ROLES[k].label : ''; }
// ต้องเร่งตาม (stuck): an open booking stuck past its expected time
function bkStuckWhy(a, D) {
  const r = a.rec, f = a.flow || {}, age = a.ageDays ?? 0;
  if (a.change) return 'รออนุมัติคำขอ';
  if (!a.match && age > 3) return `ยังไม่อยู่ใน IDS ${age} วัน`;
  if (f.next === 'booked' && !r.imported && age > 3) return 'ยังไม่มีเลขที่ใบเสร็จมัดจำ';
  if (f.next === 'fin' && age > 15) return `ไฟแนนซ์ยังไม่ผ่าน เกิน 15 วัน (${age} วัน)`;
  if (r.delivery_plan && r.delivery_plan < D.today) return `เลยวันนัดส่งมอบ ${fmtD(r.delivery_plan)}`;
  const asg = r.flow && r.flow.assign && r.flow.assign.at;
  if (asg && !(r.flow.delivered && r.flow.delivered.date) && daysBetween(asg.slice(0, 10), D.today) > 14) return 'จัดสรรรถแล้วเกิน 14 วัน ยังไม่ส่งมอบ';
  return '';
}
function bkStuck(a, D) { return !!bkStuckWhy(a, D); }
// ---- a new version of the website: tell the person and update with one press (a home-screen app has no reload button)
function updCheck() {
  if (!window.__BUILD || typeof fetch !== 'function') return;
  fetch('version.json?ts=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => {
    if (!j || !j.v || j.v === window.__BUILD || document.getElementById('upd-bar')) return;
    const d = document.createElement('div'); d.id = 'upd-bar';
    d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:60;background:#17181c;color:#fff;border-radius:12px;padding:12px 14px;display:flex;gap:12px;align-items:center;box-shadow:0 6px 24px rgba(0,0,0,.25);max-width:520px;margin:0 auto';
    d.innerHTML = '<span style="flex:1">มีเว็บเวอร์ชันใหม่</span><button style="background:#c8102e;color:#fff;border:0;border-radius:8px;padding:10px 14px;font:inherit;font-weight:600" data-act="app-reload">อัปเดตเลย</button>';
    document.body.appendChild(d);
  }).catch(() => null);
}
if (typeof window !== 'undefined' && window.__BUILD) {
  setInterval(updCheck, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updCheck(); });
  setTimeout(updCheck, 15000);
}
Object.assign(ACTIONS, { 'app-reload'() { try { location.reload(); } catch (e) { /* ignore */ } } });

// ---------- back to the previous page (the installed web app has no browser back button)
function navPush() {
  const h = S.navHist || (S.navHist = []);
  const cur = { view: S.view, sub: S.sub[S.view] || '' }, last = h[h.length - 1];
  if (!last || last.view !== cur.view || last.sub !== cur.sub) h.push(cur);
  if (h.length > 20) h.shift();
}
function backBar() {
  const h = S.navHist || [];
  const prev = h.length ? h[h.length - 1] : null;
  if (!prev || (prev.view === S.view && (prev.sub || '') === (S.sub[S.view] || ''))) return '';
  const g = groupOf(prev.view), name = (GROUP_TAB[prev.view] || (g && g.label) || prev.view);
  return `<div class="mb-2"><button class="btn btn-ghost btn-sm" data-act="nav-back" aria-label="กลับไปหน้าก่อน">← กลับ: ${esc(name)}</button></div>`;
}
// เมนู (เพิ่มเติม): the tools pages one by one, each with what it is for; only those this role may open
function menuItems() {
  const can = new Set(navFor().map(n => n.id));
  const items = [['datafix', 'ข้อมูลผิด / ขาด / ต้องจับคู่', 'รวมเรื่องที่ต้องแก้ไว้ที่เดียว กดแล้วพาไปหน้าที่แก้'],
    ['upload', 'อัปโหลดข้อมูล IDS', 'ไฟล์ Stock, Booking, Quota, Invoice/DL จาก IDS'],
    ['admin', 'หลังบ้าน', S.role.role === 'exec' ? 'ผู้ใช้งาน รายชื่อเซลล์ รุ่น เกรด สี แก้ข้อมูลโดยตรง' : 'ดูได้อย่างเดียว การแก้ทำโดยผู้บริหาร']].filter(x => can.has(x[0]));
  if (!items.length) return '';
  const bc = badgeCounts(derive()), nOf = v => v === 'datafix' ? datafixCount(derive()) : bc[v] || 0;
  return `<nav class="flex flex-col gap-2 mb-4" aria-label="เมนูเพิ่มเติม">${items.map(([v, t, d]) => `<a href="#${v}" data-act="nav" data-view="${v}" class="bg-surface border border-line rounded-lg p-3 flex items-center gap-3" style="min-height:56px;${S.view === v ? 'border-color:var(--red)' : ''}">${svg(v === 'admin' ? 'admin' : v === 'upload' ? 'upload' : 'alerts')}<span class="flex-1"><span class="font-semibold block">${t}</span><span class="text-xs text-muted">${d}</span></span>${nOf(v) ? `<span class="chip" style="background:var(--red);color:#fff">${nOf(v)}</span>` : ''}<span aria-hidden="true">›</span></a>`).join('')}</nav>`;
}
Object.assign(ACTIONS, {
  'nav-back'() {
    const h = S.navHist || [];
    const prev = h.pop() || { view: startView(), sub: '' };
    S.view = prev.view; if (prev.sub) S.sub[S.view] = prev.sub;
    S.modal = null; setHash(); render(); window.scrollTo(0, 0);
  }
});

// how many kinds of data problem are open (the same rows the data-fix page lists)
function datafixCount(D) { return datafixItems(D).reduce((t, [, rows]) => t + rows.filter(r => r[1] && r[1] !== 0).length, 0); }
