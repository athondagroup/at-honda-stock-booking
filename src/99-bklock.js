// ------------------------------------------------------------------ the lock typed on the booking page (ตกลง 11/11)
// The "ล็อก" column of a booking: managers / the executive type a frame number (the last digits are enough) or a quota Ref, pick the car
// or the quota slot and the booking is locked to it at once (15 days), the same typed lock as on the stock page: the sheet cell is
// written ("nick / customer"), the branch is told, let go / change / undo work the same. A booking already locked or allocated by IDS
// shows its frame number (or "Quota Ref" until the slot has one). Sales only see.
// Only function declarations / ACTIONS / document listeners here: the first render runs before this part of the file.
function bltKey(r) { const row = r.row || {}; return (row.app && row.app.key) || row.key || r.key; }
function bltUnitLabel(l, D) {
  if (l.vin) return `<span class="code">${esc(l.vin)}</span>`;
  const q = l.ref ? D.quota.find(x => x.ref === l.ref) : null;
  return q && q.vin ? `<span class="code">${esc(q.vin)}</span><div class="text-xs text-muted">Quota ${esc(l.ref)}</div>` : `<span class="code">Quota ${esc(l.ref || '')}</span><div class="text-xs text-muted">ยังไม่มีเลขเฟรม</div>`;
}
// the units a booking can be locked to: free cars in stock and open quota slots, the same spec first; q = frame number / Ref typed
function bltCands(row, q, D) {
  const k = String(q || '').toUpperCase().replace(/\s+/g, ''), spec = row.spec || '', [model] = String(spec).split('|');
  const hit = (...xs) => !k || xs.some(x => x && String(x).toUpperCase().includes(k));
  const demo = ltDemoBk(row);
  const cars = [...D.cars.values()].filter(c => (ltOpenCar(c) || (demo && ltDemoCar(c))) && !ltLockOf(c, D) && hit(c.vin, c.ref)).map(c => ({ u: c, kind: 'car' }));
  const qs = D.quota.filter(x => !x.car).map(ltUnitQ).filter(u => ltOpenCar(u) && !ltLockOf(u, D) && hit(u.ref, u.vin)).map(u => ({ u, kind: 'quota' }));
  const rank = u => u.spec === spec ? 0 : String(u.spec || '').split('|')[0] === model ? 1 : 2;
  return [...cars, ...qs].map(x => ({ ...x, rank: rank(x.u) })).filter(x => k || x.rank === 0)
    .sort((x, y) => x.rank - y.rank || (x.kind === y.kind ? 0 : x.kind === 'car' ? -1 : 1) || (x.u.br === row.br ? 0 : 1) - (y.u.br === row.br ? 0 : 1) || String(x.u.br).localeCompare(String(y.u.br))).slice(0, 10);
}
function bltDrop(r, D) {
  const t = S.blt, row = r.row || {}, list = bltCands(row, t.q, D);
  const it = x => { const u = x.u, q = u.quota;
    return `<button class="lt-it" data-act="blt-pick" data-u="${esc(ltKey(u))}" data-k="${esc(t.key)}"><span><b class="code">${esc(x.kind === 'car' ? u.vin : 'Quota ' + u.ref)}</b> · ${esc(u.br || '')}${x.kind === 'car' ? ' · ว่าง' : q && q.m ? ` · ส่ง ${fmtM(q.m)}${q.week ? ' W' + q.week : ''}` : ''}</span>
      <span class="lt-sub">${esc(specLabelText(u.spec))} · ${x.rank === 0 ? '<span style="color:var(--good)">สเปกตรง</span>' : '<span style="color:var(--warn)">สเปกไม่ตรง</span>'} · ล็อกให้ใบจองนี้ ${LOCK_DAYS_BY.booking} วัน</span></button>`; };
  const cars = list.filter(x => x.kind === 'car'), qs = list.filter(x => x.kind === 'quota');
  return `<div class="lt-drop" role="listbox"><button type="button" class="lt-x" data-act="blt-cancel" aria-label="ปิด">✕ ปิด</button>${t.mode === 'edit' ? '<div class="lt-hint">เปลี่ยนรถ / Quota ของล็อกนี้ (ล็อกเดิมปล่อยให้เอง)</div>' : ''}
    ${cars.length ? `<div class="lt-hint">รถในสต็อกที่ว่าง${t.q ? '' : ' สเปกเดียวกัน'}</div>${cars.map(it).join('')}` : ''}
    ${qs.length ? `<div class="lt-hint">Quota ที่ยังว่าง</div>${qs.map(it).join('')}` : ''}
    ${list.length ? '' : `<div class="lt-hint">${t.q ? `ไม่พบรถว่าง / Quota ว่างที่ตรงกับ "${esc(t.q)}"` : 'ไม่มีรถว่าง / Quota ว่างสเปกนี้ · พิมพ์เลขเฟรม หรือ Ref Quota เพื่อหาสเปกอื่น'}</div>`}</div>`;
}
function bkLockList(r, D) {
  const row = r.row || {}, a = r.a, keys = [r.key, row.key, a && a.key].filter(Boolean);
  return D.locks.filter((l, i, all) => all.findIndex(x => x.id === l.id) === i && keys.includes(l.bkref) && ['pending', 'approved', 'allocated'].includes(l.status) && !l.autoReleased && (l.live || l.status === 'pending'));
}
function bkLockCell(r, D) {
  const row = r.row || {}, key = bltKey(r), a = r.a;
  const can = ltCan() && !isSales(), t = S.blt && S.blt.key === key ? S.blt : null;
  if (t) return `<div class="lt-cell on"><input id="blt-in" class="lt-in" data-blt="${esc(key)}" value="${esc(t.q || '')}" placeholder="เลขเฟรม / Ref Quota" autocomplete="off">
    <button class="text-xs underline text-muted" data-act="blt-cancel">ยกเลิก</button>${bltDrop(r, D)}</div>`;
  const ls = bkLockList(r, D);
  // a booking holds one car: more than one comes from a slip between the sheet and the web, checked on the booking card (11/11)
  if (ls.length > 1) return a ? `<button class="text-xs underline font-semibold" style="color:var(--bad)" data-act="at-open" data-id="${esc(a.id)}">ล็อกไว้เกิน 1 คัน กดตรวจสอบ</button>` : `<span class="text-xs font-semibold" style="color:var(--bad)">ล็อกไว้เกิน 1 คัน</span>`;
  const lk = ls[0];
  if (lk) {
    const lnk = (act, txt, extra = '') => `<button class="underline" style="color:var(--accent, #2563eb)" data-act="${act}" ${extra}>${txt}</button>`;
    const rel = lk.typed && ltMine(lk) ? lnk('lt-release', 'ปล่อยล็อก', `data-id="${esc(lk.id)}"`) : lnk('release-open', 'ปล่อยล็อก', `data-id="${esc(lk.id)}"`);
    return `<div class="text-sm">${bltUnitLabel(lk, D)}${lk.type === 'temp' ? '<div class="text-xs text-muted">ล็อกชั่วคราว</div>' : ''}
      ${lk.status === 'pending' ? `<div class="text-xs" style="color:var(--warn)">รออนุมัติ${a ? ` · ${lnk('at-open', 'ตรวจสอบ', `data-id="${esc(a.id)}"`)}` : ''}</div>`
        : can ? `<div class="text-xs">${lnk('blt-edit', 'แก้ไข', `data-k="${esc(key)}" data-id="${esc(lk.id)}"`)} · ${rel}${lk.end ? ` <span class="text-muted">· ถึง ${fmtD(lk.end)}</span>` : ''}</div>` : lk.end ? `<div class="text-xs text-muted">ถึง ${fmtD(lk.end)}</div>` : ''}
      ${lk.sheet_sync && lk.sheet_sync.error && lk.sheet_sync.value ? '<div class="text-xs" style="color:var(--warn)">ยังไม่ได้ลงชีต</div>' : ''}</div>`;
  }
  // allocated by IDS / in the delivery steps: its frame number
  const vin = r.vin || row.vin || (a && atVin(a));
  if (vin) return `<span class="code text-sm">${esc(vin)}</span><div class="text-xs text-muted">${row.state === 'idscar' || row.match === 'car' ? 'IDS จัดสรร' : 'จัดสรรแล้ว'}</div>`;
  if (row.state === 'idsquota' && (row.ref || row.ws)) return `<span class="code text-sm">Quota ${esc(row.ref || row.ws)}</span><div class="text-xs text-muted">IDS จับคู่</div>`;
  if (!can || !['waiting', 'demo', 'democar'].includes(row.state) || (a && !a.active && row.state !== 'demo')) return '<span class="text-muted">–</span>';
  return `<input class="lt-in idle" data-blt-open="${esc(key)}" placeholder="พิมพ์เลขเฟรม / Ref Quota" readonly>`;
}
document.addEventListener('focusin', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.bltOpen) return;
  S.blt = { key: t.dataset.bltOpen, q: '', mode: 'new' }; render();
  setTimeout(() => { const i = document.getElementById('blt-in'); if (i) i.focus(); }, 0);
});
document.addEventListener('input', ev => { const t = ev.target; if (!t || !t.dataset || !t.dataset.blt || !S.blt) return; S.blt.q = t.value; render(); setTimeout(() => { const i = document.getElementById('blt-in'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); });
document.addEventListener('keydown', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.blt) return;
  if (ev.key === 'Escape') { S.blt = null; render(); }
  if (ev.key === 'Enter') { const first = document.querySelector('.lt-drop [data-act="blt-pick"]'); if (first) first.click(); }
});
// the floating list follows its box (as on the stock page)
new MutationObserver(() => { const i = document.getElementById('blt-in'), d = i && i.parentElement.querySelector('.lt-drop'); if (!i || !d) return;
  const r = i.getBoundingClientRect(), w = Math.min(360, window.innerWidth - 16); d.style.position = 'fixed'; d.style.width = w + 'px'; d.style.top = (r.bottom + 4) + 'px'; d.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px'; }).observe(document.documentElement, { childList: true, subtree: true });
Object.assign(ACTIONS, {
  'blt-cancel'() { S.blt = null; render(); },
  'blt-edit'(el) { S.blt = { key: el.dataset.k, q: '', mode: 'edit', old: el.dataset.id }; render(); setTimeout(() => { const i = document.getElementById('blt-in'); if (i) i.focus(); }, 0); },
  async 'blt-pick'(el) {
    if (!ltCan()) { toast('พิมพ์ล็อกได้เฉพาะผู้จัดการและผู้บริหาร', 'bad'); return; }
    const D = derive(), u = ltUnit(el.dataset.u, D), t = S.blt || {}; if (!u) return;
    const other = ltLockOf(u, D); if (other && other.id !== t.old) { toast('รถ / Quota นี้มีล็อกแล้ว เลือกคันอื่น', 'bad'); return; }
    if (!ltOpenCar(u) && !ltDemoCar(u)) { toast('รถ / Quota นี้ล็อกไม่ได้แล้ว (IDS จัดสรรหรือออกใบกำกับ)', 'bad'); return; }
    // the same typed lock as the stock page: the unit is the car / slot picked, the booking is this row
    S.lt = { vin: ltKey(u), q: '', mode: t.mode === 'edit' ? 'edit' : 'new', old: t.old || null };
    S.blt = null;
    await ACTIONS['lt-pick']({ dataset: { vin: ltKey(u), k: el.dataset.k } });
  }
});
// the booking card: more than one lock, or a request still waiting, is shown on top so "กดตรวจสอบ" lands on it (11/11)
function bkLockAlertOn(a, D) { const ls = bkLockList({ row: a.row, a, key: a.key }, D); return ls.length > 1 || ls.some(l => l.status === 'pending'); }
function bkLockAlert(a, D) {
  if (!bkLockAlertOn(a, D)) return '';
  const ls = bkLockList({ row: a.row, a, key: a.key }, D);
  return `<section class="mb-4 p-3 rounded-lg" style="border:1.5px solid var(--bad)"><h3 class="font-head font-semibold" style="color:var(--bad)">${ls.length > 1 ? `ใบจองนี้ล็อกไว้ ${ls.length} คัน (ควรมีคันเดียว)` : 'มีคำขอล็อกค้างอยู่'}</h3>
    <div class="text-xs text-muted mb-2">${ls.length > 1 ? 'เกิดจากการลงชีตกับเว็บไม่ตรงกัน เลือกคันที่ใช้จริง แล้วกด "ยกเลิกล็อก (ปล่อยรถ)" หรือ "ไม่อนุมัติ" ที่คันอื่น' : 'คำขอเก่าที่ยังไม่ได้ตัดสิน อนุมัติหรือไม่อนุมัติได้ที่นี่'}</div>
    <div class="border border-line rounded-lg divide-y divide-line bg-surface">${ls.map(l => lockRow(l, D)).join('')}</div></section>`;
}
// tapping anywhere outside the lock box closes it (stock page / quota page / booking page) – on a phone the list covered "ยกเลิก" (12/11)
document.addEventListener('pointerdown', ev => {
  if (!S.lt && !S.blt) return;
  const t = ev.target; if (t && t.closest && t.closest('.lt-cell')) return;
  S.lt = null; S.blt = null; render();
}, true);
