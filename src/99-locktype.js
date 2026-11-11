// ------------------------------------------------------------------ the lock typed on the stock page (ตกลง 10/11)
// Managers / the executive type in the "ล็อก" cell like they type in the IDS stock sheet: a customer / booking no. / seller,
// then pick a booking (15 days), "nick / customer" with no booking yet (7 days) or a dealer (15 days). It locks at once (no approval),
// the branch is told (a notice that goes away once read) and the booking-no cell of the car's row in the IDS stock sheet gets the text.
// Own lock: change or let go at once (no reason, logged). Somebody else's lock: ask to change it; the one who locked approves,
// the old lock stays until then. Let go / expired / not approved: the sheet cell is cleared. Cars IDS already booked or invoiced:
// no typing (the old lock button). Sales only look.
// Only function declarations / ACTIONS here: the first render runs before this part of the file.
function ltCan() { const p = perms(); return !!(p.write && p.approve); }
// a unit is a stock car, or a quota slot not in stock yet (typed on the Quota page too, 11/11): { quota, ref, vin, br, spec }
function ltUnitQ(q) { return { quota: q, ref: q.ref, vin: q.vin || null, br: q.br, spec: q.spec }; }
const ltKey = c => c.quota ? 'Q:' + c.ref : c.vin;
function ltUnit(key, D) { key = String(key || ''); if (key.startsWith('Q:')) { const q = D.quota.find(x => x.ref === key.slice(2)); return q ? ltUnitQ(q) : null; } return D.cars.get(key) || null; }
// the same unit: a quota slot's lock has no VIN (only its Ref) until the car comes
const ltSameU = (l, c) => c.quota ? ((!l.vin && l.ref === c.ref) || (!!c.vin && l.vin === c.vin)) : l.vin === c.vin;
const ltSameL = (x, l) => l.vin ? x.vin === l.vin : (!x.vin && !!l.ref && x.ref === l.ref);
function ltOpenCar(c) {
  if (c && c.quota) { const q = c.quota; return (q.st === 'waiting' || q.st === 'vin') && !q.bk && !q.booking && !q.atb && !q.car; }
  return !!c && carLockable(c) && !c.bkno && !['invoiced', 'sold', 'booked', 'delivered', 'company'].includes(c.status);
}
function ltLocks(c, D) { return c.quota ? D.locks.filter(l => ltSameU(l, c) && (l.live || l.status === 'pending')).filter(lockVisible) : carLocks(c, D); }
// the live lock on a car that the cell shows (pending requests to change it are listed under it)
function ltLockOf(c, D) { return ltLocks(c, D).find(l => l.live && l.status !== 'pending') || null; }
function ltNick(sales) {
  const nk = (S.ref.get('sales') && S.ref.get('sales').nick) || {};
  const hit = Object.entries(nk).find(([, full]) => full === sales);
  return hit ? hit[0] : String(sales || '').split(' ')[0];
}
// the text that goes into the sheet, in the sheet's own way of writing it ("nick / customer", "ขาย dealer")
function ltTextOf(l) {
  if (l.sheet_text) return l.sheet_text;
  if (l.type === 'dealer') return 'ขาย ' + (l.dealer_name || '');
  const cust = (l.booking && l.booking.cust) || l.prospect || '';
  return `${ltNick(l.owner || l.sales) || ''} / ${cust}`.trim();
}
const ltMine = l => !!(l && S.me && S.me.id && (l.typed_by === S.me.id || (!l.typed_by && l.requested_by === S.me.id)));
// bookings without a car, the same spec first, then the same model, then the rest; matched on customer, booking no. or seller
// (11/11) web forms not in IDS yet count too (marked); with nothing typed yet, the bookings of the same spec show
function ltCands(c, q, D) {
  const k = searchKey(q || '');
  const [model] = String(c.spec).split('|');
  return D.bookings.filter(b => ['waiting', 'noids'].includes(b.state) && !(b.app && b.app.demo) && (k ? [b.cust, b.no, b.owner, b.sales].some(x => x && searchKey(String(x)).includes(k)) : b.spec === c.spec) && (k || !isSales() || isMine(b.owner)))
    .map(b => ({ b, rank: b.spec === c.spec ? 0 : String(b.spec || '').split('|')[0] === model ? 1 : 2 }))
    .sort((x, y) => x.rank - y.rank || String(x.b.qdate || x.b.date || '').localeCompare(String(y.b.qdate || y.b.date || ''))).slice(0, 6);
}
function ltDrop(c, D) {
  const t = S.lt, q = String(t.q || '').trim();
  const p = parseSheetText(q), cands = ltCands(c, q, D);
  const it = (k, body, sub) => `<button class="lt-it" data-act="lt-pick" data-vin="${esc(ltKey(c))}" data-k="${esc(k)}"><span>${body}</span>${sub ? `<span class="lt-sub">${sub}</span>` : ''}</button>`;
  const rows = cands.map(({ b, rank }) => it(b.app ? b.app.key : b.key, `<b>${esc(b.cust || '–')}</b>${b.no ? ` · ${esc(b.no)}` : ' · <span class="text-muted">ยังไม่มีเลข IDS</span>'} <span class="text-muted">${esc(b.br || '')}</span>${b.noIds ? ' <span class="lt-sub" style="display:inline;color:var(--warn)">ฟอร์มยังไม่อยู่ใน IDS</span>' : ''}`,
    `เซลล์ ${esc(b.owner || b.sales || '–')} · จอง ${fmtD(b.qdate || b.date)} · ${esc(specLabelText(b.spec))} · ${rank === 0 ? '<span style="color:var(--good)">สเปกตรง</span>' : '<span style="color:var(--warn)">สเปกไม่ตรง</span>'} · ล็อก ${LOCK_DAYS_BY.booking} วัน`)).join('');
  const temp = p.kind === 'named' || p.kind === 'nick'
    ? it('temp', `＋ ล็อกชั่วคราว "${esc(q)}"`, `ยังไม่มีใบจอง · เซลล์ ${p.sales ? esc(p.sales) : `<span style="color:var(--warn)">ยังไม่รู้ว่า "${esc(p.who)}" คือใคร</span>`}${p.cust ? ` · ลูกค้า ${esc(p.cust)}` : ''} · ${LOCK_DAYS_BY.temp} วัน`)
    : `<div class="lt-hint">ยังไม่มีใบจอง: พิมพ์ "ชื่อเล่นเซลล์ / ชื่อลูกค้า" เช่น "มด / เปิ้ล" (ล็อก ${LOCK_DAYS_BY.temp} วัน)</div>`;
  const dealer = it('dealer', `＋ ขาย / แลกดีลเลอร์ "${esc(p.kind === 'dealer' ? p.dealer : q)}"`, `ไม่มีชื่อลูกค้า · ${LOCK_DAYS_BY.dealer} วัน`);
  if (!q) return `<div class="lt-drop" role="listbox">${rows ? `<div class="lt-hint">ใบจองสเปกนี้ที่ยังไม่มีรถ (พิมพ์ชื่อ / เลขใบจอง / เซลล์ เพื่อหาใบอื่น)</div>${rows}` : `<div class="lt-hint">ไม่มีใบจองสเปกนี้รอรถ · พิมพ์ชื่อลูกค้า / เลขใบจอง หรือ "ชื่อเล่นเซลล์ / ชื่อลูกค้า"</div>`}</div>`;
  return `<div class="lt-drop" role="listbox">${t.mode === 'ask' ? '<div class="lt-hint">ขอแก้ล็อกของคนอื่น: คนที่ล็อกไว้ต้องอนุมัติก่อน ล็อกเดิมยังอยู่</div>' : ''}
    ${rows ? `<div class="lt-hint">ใบจองที่ยังไม่มีรถ · สเปกตรงกันขึ้นก่อน</div>${rows}` : `<div class="lt-hint">ไม่พบใบจองที่ตรงกับ "${esc(q)}"</div>`}${temp}${dealer}</div>`;
}
// the stock table's "ล็อก" cell for managers / the executive
function ltCell(c, D, p) {
  const L = ltLockOf(c, D), t = S.lt && S.lt.vin === ltKey(c) ? S.lt : null;
  if (!ltOpenCar(c) && !L) return c.quota ? null : stockActions(c, p, D, 'lock');
  const asks = ltLocks(c, D).filter(l => l.status === 'pending' && l.replaces);
  const askTxt = asks.length ? `<div class="text-xs" style="color:var(--warn)">${asks.map(l => `${esc(ltRoleShort(l))} ขอแก้เป็น "${esc(ltTextOf(l))}" รอ${esc(l.approver_role || 'คนล็อก')}อนุมัติ`).join('<br>')}</div>` : '';
  const warn = L && L.sheet_sync && L.sheet_sync.conflict ? `<div class="text-xs" style="color:var(--bad)">ชีตมี "${esc(L.sheet_sync.current || '')}" ยังไม่ได้เขียน <button class="underline" data-act="lt-force" data-id="${esc(L.id)}">เขียนทับ</button></div>` : '';
  if (t) return `<div class="lt-cell on"><input id="lt-in" class="lt-in" data-lt="${esc(ltKey(c))}" value="${esc(t.q || '')}" placeholder="ชื่อลูกค้า / เลขใบจอง / เซลล์" autocomplete="off">
    <button class="text-xs underline text-muted" data-act="lt-cancel">ยกเลิก</button>${ltDrop(c, D)}</div>`;
  const gone = !L ? ltGone(c, D) : null;
  if (!L) return `<div class="lt-cell"><input class="lt-in idle" data-lt-open="${esc(ltKey(c))}" placeholder="พิมพ์ชื่อลูกค้า / เลขใบจอง" readonly>${gone ? `<div class="text-xs"><button class="underline" style="color:var(--accent, #2563eb)" data-act="lt-undo" data-id="${esc(gone.id)}" title="ปล่อยไปเมื่อ ${fmtDT(gone.rel.at)}">↶ ย้อนกลับ "${esc(ltTextOf(gone))}"</button></div>` : ''}</div>`;
  const txt = `<span class="lt-txt" title="${esc(lockLabel(L))}">${esc(ltTextOf(L))}</span>`;
  const own = ltMine(L);
  return `<div class="lt-cell">${txt} ${own
    ? `<button class="text-xs underline" style="color:var(--accent, #2563eb)" data-act="lt-edit" data-vin="${esc(ltKey(c))}">แก้</button> · <button class="text-xs underline" style="color:var(--accent, #2563eb)" data-act="lt-release" data-id="${esc(L.id)}">ปล่อย</button>`
    : `<button class="text-xs underline" style="color:var(--accent, #2563eb)" data-act="lt-ask" data-vin="${esc(ltKey(c))}">ขอแก้</button>`}${own && L.replaced && ltRecent(L.requested_at) ? ` · <button class="text-xs underline" style="color:var(--accent, #2563eb)" data-act="lt-undo" data-id="${esc(L.id)}">↶ ย้อนกลับการแก้</button>` : ''}${warn}${askTxt}</div>`;
}
// the Quota page's "ล็อก" cell (11/11): typed like the stock page; a slot whose car is in stock types on the car
function ltQuotaCell(q, D, p) { const u = q.car || ltUnitQ(q); return ltOpenCar(u) || ltLockOf(u, D) ? ltCell(u, D, p) : null; }
const ltRoleShort = l => String(l.requested_role || '').replace(/\s*\(.*\)$/, '') || 'ผู้จัดการ';
// ---- write / clear the sheet cell (only on the real web; the preview never touches the real sheet)
async function ltSheet(id, value, expect, force) {
  const l = findLock(id); if (!l) return null;
  const live = !!(window.__WEB), D = derive();
  // the stock tab when the car is in stock; the quota tab's "Vin Number" cell when the unit has a quota slot (by frame number or Ref)
  const qs = D.quota.find(q => (l.vin && q.vin === l.vin) || (!l.vin && l.ref && q.ref === l.ref)) || null;
  const call = async input => {
    try { const mcp = await gsUse(); if (!mcp) throw { code: 'nomcp' }; const r = await mcp.callTool('Google Sheets', 'stock_cell', input, { cache: false }); let x = r && r.payload; if (typeof x === 'string') { try { x = JSON.parse(x); } catch (e) { x = null; } } return x || { code: 'error' }; }
    catch (e) { return { code: (e && e.code) || 'error' }; }
  };
  let res = null, qres = null;
  if (!live) res = { ok: true, preview: true };
  else {
    if (l.vin) res = await call({ br: l.car_br, vin: l.vin, value, expect: expect ?? '', force: !!force });
    // a stock row was written, or there is none (a quota slot not in stock / a car missing from the stock tab): the quota slot follows
    if (qs && (!res || res.ok || res.code === 'not_found')) qres = await call({ target: 'quota', vin: qs.vin || '', ref: qs.ref, br: qs.br, value, expect: expect ?? '', force: !!force });
    if (!res || (res.code === 'not_found' && qres && (qres.ok || qres.code === 'conflict'))) { res = qres; qres = null; }
  }
  const cur = findLock(id) || l, now = new Date().toISOString();
  cur.sheet_sync = res && res.ok ? { at: now, value, range: res.range || null, preview: !!res.preview }
    : { at: now, value, conflict: res && res.code === 'conflict', current: res && res.current, error: res && res.code !== 'conflict' ? (res && res.code) || 'error' : null };
  if (qres) cur.sheet_quota = qres.ok ? { at: now, range: qres.range } : { at: now, error: qres.code || 'error', current: qres.current };
  if (value === '' && res && res.ok) cur.sheet_cleared = now;
  await write('locks', id, cur);
  if (res && res.code === 'conflict') toast(`ยังไม่ได้เขียนลงชีต: ช่องในชีตตอนนี้เป็น "${res.current || ''}" ไม่ตรงกับที่เว็บรู้ · ล็อกในเว็บบันทึกแล้ว`, 'bad');
  else if (!(res && res.ok)) toast(res && res.code === 'not_found' ? 'ไม่พบรถ / Quota นี้ในชีต Stock IDS (ล็อกในเว็บบันทึกแล้ว)' : 'เขียนชีตไม่สำเร็จ ล็อกในเว็บบันทึกแล้ว ลองใหม่ภายหลัง', 'bad');
  return res;
}
// typed locks that ended (let go, expired, not approved, replaced): clear their sheet cell once (managers' sessions)
let ltSwept = new Set();
function ltSweep(D) {
  if (!ltCan() || !window.__WEB) return;
  for (const l of D.locks) {
    if (!l.typed || l.sheet_cleared || ltSwept.has(l.id) || l.live || !(l.vin || l.ref) || !(l.sheet_sync && l.sheet_sync.value && !l.sheet_sync.conflict)) continue;
    if (D.locks.some(x => x.id !== l.id && x.live && ltSameL(x, l) && x.typed)) { ltSwept.add(l.id); continue; }   // the cell now belongs to the next typed lock
    ltSwept.add(l.id); ltSheet(l.id, '', ltTextOf(l));
  }
}
// ---- the lock itself
function ltNew(c, D, k, q, extra) {
  const p = parseSheetText(q), now = new Date().toISOString();
  let type = 'temp', b = null, owner = null, prospect = null, dealer = null, text;
  if (k === 'dealer') { type = 'dealer'; dealer = (p.kind === 'dealer' ? p.dealer : q).trim(); text = 'ขาย ' + dealer; }
  else if (k === 'temp') { owner = p.sales || null; prospect = p.cust || null; text = q.trim(); }
  else { b = D.bookingByKey.get(k); if (!b) return null; type = 'booking'; owner = b.owner || b.sales || null; text = `${ltNick(owner)} / ${b.cust || ''}`.trim(); }
  return {
    vin: c.vin || null, ref: c.quota ? c.ref : null, car_br: c.br, spec: c.spec, type, bkref: b ? (b.app ? b.app.key : b.key) : null, bk_br: b ? b.br : null, sales: owner,
    sales_nick: type === 'temp' && !owner ? p.who || null : null, prospect, dealer_name: dealer, reason: 'พิมพ์ล็อกในหน้า Stock', note: '', warnings: [],
    status: 'approved', requested_at: now, requested_by: S.me.id || null, requested_role: roleLabel(), ext: 0, history: [], convert_from: null,
    req_br: (b ? b.br : null) || (owner ? salesBranch(owner) : null) || c.br, start: todayISO(), end: addDays(todayISO(), LOCK_DAYS_BY[type] || 15), approved_at: now,
    typed: true, typed_by: S.me.id || null, sheet_text: text, notices: [{ k: 'new', at: now, by: S.me.id || null, role: roleLabel() }], ...(extra || {})
  };
}
// the list floats over the page (the table scrolls inside its box and would cut it off)
function ltPlace() {
  const i = document.getElementById('lt-in'), d = document.querySelector('.lt-drop'); if (!i || !d) return;
  const r = i.getBoundingClientRect(), w = Math.min(360, window.innerWidth - 16);
  d.style.position = 'fixed'; d.style.width = w + 'px'; d.style.top = (r.bottom + 4) + 'px'; d.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
}
new MutationObserver(() => ltPlace()).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('scroll', ltPlace, true); window.addEventListener('resize', ltPlace);
document.addEventListener('input', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.lt || !S.lt) return;
  S.lt.q = t.value; render();
});
document.addEventListener('focusin', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.ltOpen) return;
  S.lt = { vin: t.dataset.ltOpen, q: '', mode: 'new' }; render();
  setTimeout(() => { const i = document.getElementById('lt-in'); if (i) i.focus(); }, 0);
});
document.addEventListener('keydown', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.lt) return;
  if (ev.key === 'Escape') { S.lt = null; render(); }
  if (ev.key === 'Enter') { const first = document.querySelector('.lt-drop [data-act="lt-pick"]'); if (first) first.click(); }
});
Object.assign(ACTIONS, {
  'lt-cancel'() { S.lt = null; render(); },
  'lt-edit'(el) { const D = derive(), c = ltUnit(el.dataset.vin, D), L = c && ltLockOf(c, D); if (!L) return; S.lt = { vin: ltKey(c), q: '', mode: 'edit', old: L.id }; render(); setTimeout(() => { const i = document.getElementById('lt-in'); if (i) i.focus(); }, 0); },
  'lt-ask'(el) { const D = derive(), c = ltUnit(el.dataset.vin, D), L = c && ltLockOf(c, D); if (!L) return; S.lt = { vin: ltKey(c), q: '', mode: 'ask', old: L.id }; render(); setTimeout(() => { const i = document.getElementById('lt-in'); if (i) i.focus(); }, 0); },
  async 'lt-pick'(el) {
    if (!ltCan()) { toast('พิมพ์ล็อกได้เฉพาะผู้จัดการและผู้บริหาร', 'bad'); return; }
    const D = derive(), c = ltUnit(el.dataset.vin, D), t = S.lt || {}, k = el.dataset.k, q = String(t.q || '').trim();
    if (!c) return;
    const old = t.old ? findLock(t.old) : null, oldD = t.old ? D.locks.find(x => x.id === t.old) : null;
    if (!old && !ltOpenCar(c)) { toast('รถคันนี้ล็อกแบบพิมพ์ไม่ได้ (IDS จัดสรรหรือออกใบกำกับแล้ว) ใช้ปุ่มขอล็อก', 'bad'); return; }
    if (!old && ltLockOf(c, D)) { toast('รถคันนี้มีล็อกแล้ว กดแก้ / ขอแก้แทน', 'bad'); return; }
    const ask = t.mode === 'ask' && old && !ltMine(oldD || old);
    const l = ltNew(c, D, k, q, ask ? { status: 'pending', start: null, end: null, approved_at: null, replaces: t.old, approver: old.typed_by || old.requested_by || null, approver_role: old.requested_role || null, notices: [] }
      : old ? { replaced: t.old } : null);
    if (!l) { toast('ไม่พบใบจองนี้', 'bad'); return; }
    if (l.type === 'temp' && !l.sales && !l.prospect) { toast('พิมพ์ "ชื่อเล่นเซลล์ / ชื่อลูกค้า"', 'bad'); return; }
    const id = newId('locks');
    if (ask) {
      if (!await saveLock(id, l, 'ขอแก้ล็อก (พิมพ์ในหน้า Stock)', `"${ltTextOf(old)}" → "${l.sheet_text}" · รอ${l.approver_role || 'คนล็อก'}อนุมัติ`)) return;
      S.lt = null; toast(`ส่งคำขอแก้แล้ว รอ${l.approver_role || 'คนที่ล็อก'}อนุมัติ · ล็อกเดิมยังอยู่`); return;
    }
    if (old) { old.status = 'released'; old.rel = { at: new Date().toISOString(), by: roleLabel(), self: true, reason: 'แก้ไขล็อก (พิมพ์ใหม่)' }; old.sheet_cleared = new Date().toISOString(); await saveLock(t.old, old, 'แก้ไขล็อก', `เปลี่ยนเป็น "${l.sheet_text}"`); }
    if (!await saveLock(id, l, old ? 'แก้ไขล็อก (พิมพ์ในหน้า Stock)' : 'ล็อก (พิมพ์ในหน้า Stock)', `"${l.sheet_text}" · หมด ${fmtD(l.end)}`)) return;
    if (l.type !== 'temp') await settleUnit(derive(), l, id);
    S.lt = null;
    toast(`ล็อกแล้วถึง ${fmtD(l.end)} · แจ้งสาขา ${c.br} แล้ว${window.__WEB ? '' : ' · เว็บตัวอย่าง: ไม่เขียนชีตจริง'}`);
    ltSheet(id, l.sheet_text, old ? ltTextOf(old) : (c.quota ? (c.quota.vnote || '') : (c.bknote || '')));
  },
  async 'lt-release'(el) {
    const id = el.dataset.id, l = await claimFresh('locks', id, x => x.status === 'approved' || x.status === 'allocated');
    if (!l) return;
    if (!ltMine(l)) { toast('ล็อกของคนอื่น: กดขอแก้ หรือให้ผู้จัดการปล่อยจากหน้าล็อก', 'bad'); return; }
    l.status = 'released'; l.rel = { at: new Date().toISOString(), by: roleLabel(), self: true, reason: 'ปล่อยเอง' };
    l.notices = [...(l.notices || []), { k: 'rel', at: l.rel.at, by: S.me.id || null, role: roleLabel() }];
    markUndo(l, 'ปล่อยล็อก', 'approved');
    if (!await saveLock(id, l, 'ปล่อยล็อก (เจ้าของล็อก)', '')) return;
    toast('ปล่อยล็อกแล้ว รถกลับเป็นว่าง');
    if (l.typed) ltSheet(id, '', ltTextOf(l));
  },
  async 'lt-force'(el) { const l = findLock(el.dataset.id); if (!l || !ltCan()) return; await ltSheet(el.dataset.id, ltTextOf(l), '', true); toast('เขียนทับในชีตแล้ว'); },
  async 'ntc-ack'(el) {
    const [id, at] = String(el.dataset.id || '').split('|'), l = findLock(id); if (!l || !S.me || !S.me.id) return;
    const acks = { ...(l.acks || {}) }; acks[S.me.id] = [...new Set([...(acks[S.me.id] || []), at])].slice(-20);
    await write('locks', id, { ...l, acks });
  }
});
// a request to change somebody's typed lock, approved by the one who locked: the old lock goes, the new one starts, the sheet follows
async function ltApproveChange(id) {
  const l = findLock(id); if (!l || !l.replaces) return;
  const old = findLock(l.replaces);
  if (old && ['approved', 'allocated'].includes(old.status)) {
    old.status = 'released'; old.rel = { at: new Date().toISOString(), by: roleLabel(), self: true, reason: 'เปลี่ยนตามคำขอแก้' }; old.sheet_cleared = new Date().toISOString();
    await saveLock(l.replaces, old, 'ปล่อยล็อก (อนุมัติคำขอแก้)', `เปลี่ยนเป็น "${ltTextOf(l)}"`);
  }
  const cur = findLock(id); cur.notices = [...(cur.notices || []), { k: 'new', at: new Date().toISOString(), by: S.me.id || null, role: roleLabel() }]; await write('locks', id, cur);
  ltSheet(id, ltTextOf(cur), old ? ltTextOf(old) : '');
}
// notices that go away once read (managers' typed locks and requests decided at once): new lock, let go, expired
function ltNotices(D, add) {
  for (const l of D.locks) {
    const owner = l.owner || l.sales || null, unit = l.vin || ('Quota ' + (l.ref || '')), cust = (l.booking && l.booking.cust) || l.prospect || l.dealer_name || '';
    const evs = [...(l.notices || [])];
    if (l.typed && (l.expired || l.autoReleased) && l.end) evs.push({ k: 'exp', at: l.end + 'T23:59:00.000Z', by: null });
    for (const n of evs) {
      if (!n.at || daysBetween(String(n.at).slice(0, 10), D.today) > 7) continue;
      const title = n.k === 'new' ? `${n.role || 'ผู้จัดการ'} ล็อกรถ ${specLabelText(l.spec)}` : n.k === 'rel' ? `ปล่อยล็อกแล้ว ${specLabelText(l.spec)} · รถกลับเป็นว่าง` : `ล็อกหมดอายุ ${specLabelText(l.spec)} · ${l.typed ? 'ล้างช่องในชีตแล้ว · ' : ''}รถกลับเป็นว่าง`;
      const text = `${unit} · สาขา ${l.car_br || ''}${cust ? ' · ' + cust : ''}${owner ? ' · เซลล์ ' + owner : ''}${n.k === 'new' && l.end ? ' · ถึง ' + fmtD(l.end) : ''}`;
      add('ntc:' + l.id + ':' + n.k + ':' + n.at, { br: l.car_br, sales: owner, roles: ['admin', 'manager', 'sales'] }, 'warn', title, text, { act: 'ntc-ack', id: l.id + '|' + n.at, label: 'รับทราบ', ack: true, by: n.by || null, acks: l.acks || {} });
    }
  }
}

// ---- undo (11/11): typing makes it easy to let go / change by mistake. Within 24 hours the one who did it puts it back.
const ltRecent = at => !!at && Date.now() - new Date(at).getTime() < 24 * 3600 * 1000;
function ltGone(c, D) {
  if (!S.me || !S.me.id) return null;
  const xs = D.locks.filter(l => ltSameU(l, c) && l.typed && l.status === 'released' && l.rel && ltRecent(l.rel.at) && l.rel.reason !== 'แก้ไขล็อก (พิมพ์ใหม่)' && l.rel.reason !== 'ย้อนกลับการแก้'
    && ((l.history || []).slice(-1)[0] || {}).by === S.me.id);
  return xs.sort((a, b) => String(b.rel.at).localeCompare(String(a.rel.at)))[0] || null;
}
Object.assign(ACTIONS, {
  async 'lt-undo'(el) {
    if (!ltCan()) return;
    const id = el.dataset.id, l = findLock(id), D = derive(); if (!l) return;
    if (l.status === 'released') {
      if (D.locks.some(x => x.id !== id && ltSameL(x, l) && x.live)) { toast('ย้อนกลับไม่ได้ รถคันนี้มีล็อกใหม่แล้ว', 'bad'); return; }
      const cur = { ...l, status: 'approved' }; delete cur.rel; delete cur.sheet_cleared; delete cur.undo;
      if (!await saveLock(id, cur, 'ย้อนกลับ: ปล่อยล็อก', 'กดผิด')) return;
      toast(`ย้อนกลับแล้ว ล็อก "${ltTextOf(cur)}" ถึง ${fmtD(cur.end)}`);
      ltSheet(id, ltTextOf(cur), '');
      return;
    }
    if (l.replaced) {
      const old = findLock(l.replaced); if (!old) { toast('ไม่พบล็อกเดิม', 'bad'); return; }
      const now = new Date().toISOString();
      if (!await saveLock(id, { ...l, status: 'released', rel: { at: now, by: roleLabel(), self: true, reason: 'ย้อนกลับการแก้' }, sheet_cleared: now }, 'ย้อนกลับการแก้', `กลับไปเป็น "${ltTextOf(old)}"`)) return;
      const back = { ...old, status: 'approved' }; delete back.rel; delete back.sheet_cleared;
      await saveLock(l.replaced, back, 'ย้อนกลับ: แก้ไขล็อก', 'กดผิด');
      toast(`ย้อนกลับแล้ว ล็อกกลับเป็น "${ltTextOf(back)}"`);
      ltSheet(l.replaced, ltTextOf(back), ltTextOf(l));
    }
  }
});
