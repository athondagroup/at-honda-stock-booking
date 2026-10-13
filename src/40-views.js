// ------------------------------------------------------------------ chrome
const ICON = {
  admin: '<path d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.4-2.9a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/>',
  inbox: '<path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 12h-4a3 3 0 0 1-6 0H5V5h14v10zm-3-5h-2V7h-4v3H8l4 4 4-4z"/>',
  dash: '<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>',
  alerts: '<path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.84V3a1.5 1.5 0 0 0-3 0v1.16A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2z"/>',
  stock: '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-6zm2.2-1h9.6l-1-3.2H8.2L7.2 10zM7.5 14a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zm9 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z"/>',
  book: '<path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9zm2 2v2h4v-2H7z"/>',
  quota: '<path d="M4 4h16v4H4V4zm0 6h10v4H4v-4zm0 6h13v4H4v-4z"/>',
  lock: '<path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9zm3 4a2 2 0 0 1 1 3.7V19h-2v-1.3A2 2 0 0 1 12 14z"/>',
  flow: '<path d="M4 5h4v4H4V5zm6 1h10v2H10V6zM4 10h4v4H4v-4zm6 1h10v2H10v-2zM4 15h4v4H4v-4zm6 1h10v2H10v-2z"/>',
  receive: '<path d="M9 3l-1.8 2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9zm3 5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>',
  upload: '<path d="M12 3l5 5h-3v6h-4V8H7l5-5zM5 16h2v3h10v-3h2v5H5v-5z"/>',
  more: '<path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/>'
};
const NAV = [
  { id: 'dash', label: 'ภาพรวม' }, { id: 'alerts', label: 'แจ้งเตือน' }, { id: 'inbox', get label() { return perms().approve ? 'รออนุมัติ' : 'คำขอของฉัน'; } }, { id: 'stock', label: 'สต็อก' }, { id: 'book', label: 'Booking' },
  { id: 'quota', label: 'Quota' }, { id: 'lock', label: 'ล็อกรถ' }, { id: 'flow', label: 'ขั้นตอนส่งมอบ' }, { id: 'receive', label: 'รับรถเข้า' },
  { id: 'upload', label: 'อัปเดตข้อมูล IDS' }, { id: 'admin', label: 'หลังบ้าน' }
];
const svg = (id, n = 20) => `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICON[id]}</svg>`;
const isSales = () => S.role.role === 'sales';
const isMine = name => isSales() && !!name && name === S.role.sales;
function badgeCounts(D) {
  const mine = myAlerts(D);
  return {
    alerts: mine.filter(a => a.tone !== 'muted').length,
    inbox: perms().approve ? inboxItems(D).length : myRequests(D).bookings.filter(x => x.pending).length,
    lock: S.role.role === 'admin' ? D.locks.filter(l => l.status === 'approved' && l.type !== 'temp' && l.car_br === myBranch()).length
      : D.locks.filter(l => l.status === 'pending' && (isSales() ? isMine(l.owner) : l.type === 'dealer' ? perms().approveDealer : canApproveBr(l.car_br))).length,
    upload: gsCan() && S.gs && S.gs.rows ? S.gs.rows.length : 0,
    receive: D.receipts.filter(r => r.status === 'pending' && (!myBranch() || r.br === myBranch())).length,
    flow: D.at.filter(a => a.flow.next === 'confirmed' && canApproveBr(a.br)).length
  };
}
// each role sees only the pages it works with: sales do not receive cars or upload IDS files
const navFor = () => NAV.filter(n => !(isSales() && (n.id === 'receive' || n.id === 'upload' || n.id === 'admin')));
// the menu shows 6 groups (ตกลง 13/10 แบบ ค); pages of one group switch with the tabs at the top of the page
const GROUPS = [
  { id: 'dash', label: 'ภาพรวม', views: ['dash'] },
  { id: 'work', label: 'งานของฉัน', views: ['alerts', 'inbox'], icon: 'alerts' },
  { id: 'stockg', label: 'สต็อก', views: ['stock', 'quota', 'lock'], icon: 'stock' },
  { id: 'bookg', label: 'Booking', views: ['book', 'flow'], icon: 'book' },
  { id: 'intake', label: 'รับรถ / อัปโหลด IDS', views: ['receive', 'upload'], icon: 'receive' },
  { id: 'admin', label: 'หลังบ้าน', views: ['admin'] }
];
const groupsFor = () => { const ok = new Set(navFor().map(n => n.id)); return GROUPS.map(g => ({ ...g, views: g.views.filter(v => ok.has(v)) })).filter(g => g.views.length); };
const groupOf = v => GROUPS.find(g => g.views.includes(v)) || GROUPS[0];
const groupEntry = g => (S.lastIn && g.views.includes(S.lastIn[g.id])) ? S.lastIn[g.id] : g.views[0];
const GROUP_TAB = { alerts: 'แจ้งเตือน', get inbox() { return perms().approve ? 'รออนุมัติ' : 'คำขอของฉัน'; }, stock: 'สต็อกรถ', quota: 'Quota', lock: 'ล็อกรถ', book: 'ใบจอง', flow: 'ขั้นตอนส่งมอบ', receive: 'รับรถเข้า', upload: 'อัปเดตข้อมูล IDS' };
function groupTabs(badges) {
  const g = groupsFor().find(x => x.views.includes(S.view));
  if (!g || g.views.length < 2) return '';
  return `<div class="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="${esc(g.label)}">${g.views.map(v => `<button class="btn btn-sm ${S.view === v ? 'btn-dark' : 'btn-ghost'}" role="tab" aria-selected="${S.view === v}" data-act="nav" data-view="${v}" data-grp-tab="1">${GROUP_TAB[v]}${badges[v] ? ` <span class="badge">${badges[v]}</span>` : ''}</button>`).join('')}</div>`;
}
// phone bar: the 3 groups used every day, the rest under เมนู
const bottomIds = () => ['dash', 'stockg', 'bookg', 'work'];
function renderChrome(D) {
  D = D || derive();
  const badges = badgeCounts(D);
  const badge = id => badges[id] ? `<span class="badge ml-auto">${badges[id]}</span>` : '';
  const gs = groupsFor(), gBadge = g => g.views.reduce((t, v) => t + (badges[v] || 0), 0);
  $('#sidenav').innerHTML = gs.map(g => { const n = gBadge(g), on = g.views.includes(S.view); return `<a href="#${groupEntry(g)}" class="nav-item" data-act="nav" data-view="${groupEntry(g)}" data-group="${g.id}" ${on ? 'aria-current="page"' : ''}>${svg(g.icon || g.views[0])}${g.label}${n ? `<span class="badge ml-auto">${n}</span>` : ''}</a>`; }).join('');
  const ids = bottomIds(), bottom = [...ids.map(id => gs.find(g => g.id === id)).filter(Boolean), { id: 'more', label: 'เมนู', views: [] }];
  const moreGs = gs.filter(g => !ids.includes(g.id)), moreViews = moreGs.flatMap(g => g.views);
  $('#bottomnav').innerHTML = bottom.map(g => {
    const on = g.id === 'more' ? moreViews.includes(S.view) : g.views.includes(S.view);
    const cnt = g.id === 'more' ? moreGs.reduce((t, x) => t + gBadge(x), 0) : gBadge(g);
    const n = { id: g.id === 'more' ? 'more' : groupEntry(g), label: g.label, icon: g.id === 'more' ? 'more' : g.icon || g.views[0] };
    return `<a href="#${n.id === 'more' ? S.view : n.id}" data-act="${n.id === 'more' ? 'menu' : 'nav'}" data-view="${n.id}" class="flex flex-col items-center gap-0.5 py-2 text-xs font-medium relative" style="color:${on ? 'var(--red)' : 'var(--muted)'}" ${on ? 'aria-current="page"' : ''}>
      ${svg(n.icon, 22)}${n.label}${cnt ? `<span class="badge absolute top-1 left-1/2 ml-2">${cnt}</span>` : ''}</a>`;
  }).join('');
  $('#role-box').innerHTML = roleControls('side');
  $('#mobile-role-label').textContent = `ทดลองเป็น ${roleLabel()}`;
  const modeTxt = {
    shared: ['บันทึกร่วมกัน', 'good', 'ทุกคนที่เปิดหน้านี้เห็นรายการเดียวกัน'],
    local: ['ทดลอง', 'warn', 'ข้อมูลที่กดจะหายเมื่อปิดหน้า'],
    readonly: ['ดูอย่างเดียว', 'warn', 'ขอสิทธิ์ Editor จากเจ้าของหน้าเพื่อทดลองกด'],
    connecting: ['…', 'muted', 'กำลังเชื่อมต่อข้อมูล']
  }[S.mode];
  const sample = usingSample();
  $('#banner').innerHTML = `<div class="px-4 md:px-8 py-2 border-b border-line bg-surface text-xs md:text-sm flex flex-wrap gap-x-4 gap-y-1 items-center">
    <span>ต้นแบบทดลอง การกดในหน้านี้ไม่เปลี่ยนข้อมูลใน IDS</span>
    <span class="inline-flex items-center gap-2">${chip(modeTxt[0], modeTxt[1])}<span class="text-muted">${modeTxt[2]}</span></span>
    ${sample.length ? `<a href="#upload" data-act="nav" data-view="upload" class="underline" style="color:var(--warn)">สาขา ${sample.join(', ')} ยังใช้ข้อมูลตัวอย่าง (ไม่มีชื่อลูกค้า) อัปโหลดไฟล์ IDS เพื่อใช้ข้อมูลจริง</a>` : ''}
  </div>`;
}
function roleControls(where) {
  const r = S.role, dark = where === 'side';
  // on the website the role comes from the login (members table); only the executive may try other roles
  const W = window.__WEB;
  if (W && !W.canSwitch) return `<div class="text-sm ${dark ? 'text-inkfg' : ''}"><div class="font-medium">${esc(W.name || W.email)}</div><div class="${dark ? 'text-inkmuted' : 'text-muted'} text-xs">${esc(roleLabel())}</div>
    <button class="mt-2 underline text-xs ${dark ? 'text-inkmuted' : 'text-muted'}" data-act="web-logout">ออกจากระบบ</button></div>`;
  const cls = dark ? 'style="background:var(--ink-line);color:var(--ink-fg);border-color:var(--ink-line)"' : '';
  const lab = dark ? 'style="color:var(--ink-muted)"' : '';
  return `<div class="field" ${lab}><label for="${where}-role">ทดลองใช้งานในบทบาท</label>
      <select id="${where}-role" data-role-field="role" ${cls}>${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === r.role ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
    ${r.role === 'admin' ? `<div class="field" ${lab}><label for="${where}-rbr">สาขา</label>
      <select id="${where}-rbr" data-role-field="branch" ${cls}>${BRS.map(b => `<option value="${b}" ${b === r.branch ? 'selected' : ''}>${b} ${BR[b].name}</option>`).join('')}</select></div>` : ''}
    ${r.role === 'sales' ? `<div class="field" ${lab}><label for="${where}-rs">ชื่อที่ปรึกษาขาย</label>
      <select id="${where}-rs" data-role-field="sales" ${cls}>${salesNames().map(s => `<option ${s === r.sales ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>` : ''}
    ${S.me.name ? `<div class="${dark ? 'text-inkmuted' : 'text-muted'} text-xs">${W ? 'ผู้ใช้' : 'ผู้ใช้ claude.ai'}: ${esc(S.me.name)}</div>` : ''}${W ? `<button class="underline text-xs ${dark ? 'text-inkmuted' : 'text-muted'}" data-act="web-logout">ออกจากระบบ</button>` : ''}`;
}

// ------------------------------------------------------------------ views
let rendering = false;
function render() {
  // a field losing focus while the page is redrawn can fire change/blur handlers that redraw again
  if (rendering) { setTimeout(render, 0); return; }
  rendering = true;
  try { renderNow(); renderFail = 0; } catch (e) { showRenderError(e); } finally { rendering = false; }
}
// a drawing error must never leave a blank or frozen page: show what broke and a way back
let renderFail = 0;
function showRenderError(e) {
  renderFail++;
  const msg = String((e && (e.stack || e.message)) || e).split('\n').slice(0, 3).join(' · ');
  try { console.error('render', e); } catch (x) { /* ignore */ }
  const main = document.getElementById('main');
  if (main) main.innerHTML = `<div class="bg-surface border border-line rounded-lg p-5"><h2 class="font-head text-lg font-semibold mb-1" style="color:var(--bad)">หน้านี้แสดงผลไม่ได้</h2>
    <p class="text-sm mb-2">ข้อมูลไม่หาย กด "ล้างตัวกรองแล้วลองใหม่" หรือกลับหน้าหลัก ถ้ายังเป็นอยู่ ส่งข้อความด้านล่างให้ผู้ดูแล</p>
    <p class="text-xs code mb-3" style="color:var(--muted);word-break:break-all">${esc(S.view)} · ${esc(JSON.stringify(S.filters).slice(0, 300))} · ${esc(msg.slice(0, 600))}</p>
    <div class="flex flex-wrap gap-2"><button class="btn btn-red" data-act="render-reset">ล้างตัวกรองแล้วลองใหม่</button><button class="btn btn-ghost" data-act="nav" data-view="dash">กลับหน้าหลัก</button></div></div>`;
  if (S.modal && renderFail < 3) { S.modal = null; }
}
function renderNow() {
  const D = derive();
  if (!navFor().some(n => n.id === S.view)) S.view = 'dash';
  renderChrome(D);
  const V = { dash: viewDash, alerts: viewAlerts, inbox: viewInbox, stock: viewStock, book: viewBook, quota: viewQuota, lock: viewLock, flow: viewFlow, receive: viewReceive, upload: viewUpload, admin: viewAdmin }[S.view] || viewDash;
  const ae = document.activeElement, main = $('#main');
  const fid = ae && ae.id && main.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName) ? ae.id : null;
  let caret = null; try { caret = fid && typeof ae.selectionStart === 'number' ? ae.selectionStart : null; } catch (e) { caret = null; }
  S.lastIn = { ...(S.lastIn || {}), [groupOf(S.view).id]: S.view };
  main.innerHTML = groupTabs(badgeCounts(D)) + V(D);
  const fe = fid && document.getElementById(fid);
  if (fe && !S.modal) { fe.focus({ preventScroll: true }); if (caret !== null) { try { fe.setSelectionRange(caret, caret); } catch (e) { /* not a text field */ } } }
  renderModal(D);
  renderToast();
  gsMaybe();
  const ids = [];
  D.locks.forEach(l => (l.history || []).forEach(h => ids.push(h.by)));
  for (const o of S.vehicles.values()) ['added', 'removed', 'prod_info'].forEach(k => o[k] && ids.push(o[k].by));
  D.receipts.forEach(r => ids.push(r.by, r.review?.by));
  for (const u of S.uploads.values()) ids.push(u.by);
  names(ids);
}
const pageHead = (title, sub, actions = '') => `<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
  <div class="min-w-0"><h1 class="font-head text-2xl md:text-3xl font-semibold">${title}</h1>${sub ? `<p class="text-muted">${sub}</p>` : ''}</div>
  ${actions || exportBtn() ? `<div class="flex flex-wrap gap-2">${actions}${exportBtn()}</div>` : ''}</div>`;
function brSeg() {
  const sc = S.brScope, opts = [['', sc ? `ทุกสาขาที่ดูแล (${sc.join(', ')})` : 'ทุกสาขา', 'ทั้งหมด'], ...(sc || BRS).map(b => [b, `${b} ${BR[b].name}`, b])];
  return `<div class="seg mb-4" role="group" aria-label="เลือกสาขา">${opts.map(([v, t, s]) => `<button data-act="br" data-br="${v}" aria-pressed="${S.br === v}"><span class="sm:hidden">${s}</span><span class="hidden sm:inline">${t}</span></button>`).join('')}</div>`;
}
const tabs = (key, list) => `<div class="flex gap-1 border-b border-line mb-4 overflow-x-auto" role="tablist">
  ${list.map(([id, t, n]) => `<button role="tab" class="tab" aria-selected="${S.sub[key] === id}" data-act="sub" data-key="${key}" data-sub="${id}">${t}${n ? ` <span class="badge" ${typeof n === 'string' ? 'style="background:var(--surface-2);color:var(--fg)"' : ''}>${n}</span>` : ''}</button>`).join('')}</div>`;
const go = (view, sub, br, label, cls = '') => `<a href="#${view}" data-act="go" data-view="${view}" ${sub ? `data-sub="${sub}"` : ''} ${br !== undefined ? `data-br="${br}"` : ''} class="${cls}">${label}</a>`;
function kpi(v, k, tone, view, sub) {
  return `<a href="#${view}" data-act="go" data-view="${view}" ${sub ? `data-sub="${sub}"` : ''} data-br="" class="block p-4 min-w-0 hover:bg-surface2">
    <div class="font-head font-semibold text-3xl num" ${tone ? `style="color:var(--${tone})"` : ''}>${v}</div>
    <div class="text-muted text-sm">${k}</div></a>`;
}
const srcLine = m => m ? `${fmtD(m.asof)}` : '<span style="color:var(--warn)">ตัวอย่าง</span>';
// the AT Honda name owns the booking; the name keyed in IDS is shown beside it, never instead of it
const salesLeft = name => !!name && (S.ref.get('sales')?.list || []).some(x => x.name === name && x.left);
const salesName = name => name ? `${esc(name)}${salesLeft(name) ? ' <span class="chip" style="background:var(--surface-2);color:var(--muted)">ลาออก</span>' : ''}` : '<span class="text-muted">–</span>';
// chk: owner confirmation state when IDS was keyed under another sales ID
const OWNER_CHK = { confirmed: ['✓ ยืนยันเจ้าของแล้ว', 'muted'], auto: ['ส่งมอบแล้ว', 'muted'], pending: ['รอยืนยันเจ้าของ', 'warn'], disputed: ['แจ้งว่าไม่ใช่ของตัวเอง', 'bad'] };
const salesCell = (atName, idsName, chk) => {
  const diff = atName && idsName && !sameName(atName, idsName);
  const tone = !diff ? '' : chk === 'confirmed' || chk === 'auto' ? 'class="text-muted"' : 'style="color:var(--warn)"';
  return `<div class="leading-snug"><span class="text-xs text-muted inline-block w-7">AT</span>${atName ? salesName(atName) : '<span class="text-xs" style="color:var(--bad)">ยังไม่มีฟอร์ม</span>'}</div>
    <div class="leading-snug text-xs" ${diff ? tone : 'class="text-muted"'}><span class="inline-block w-7 text-muted">IDS</span>${idsName ? esc(idsName) : 'ยังไม่อยู่ใน IDS'}${diff && chk && OWNER_CHK[chk] ? ` ${chip(OWNER_CHK[chk][0], OWNER_CHK[chk][1])}` : ''}</div>`;
};
const crossChip = a => a && a.cross ? `<div class="mt-0.5">${chip(`ขายข้ามสาขา → ${a.delivBr}`, 'neutral')}</div>` : '';

// ---------- alerts
function alertRow(a) {
  const btn = (x, main) => `<button class="btn ${main ? 'btn-dark' : 'btn-ghost'} btn-sm" data-act="${x.act}" ${x.id ? `data-id="${esc(x.id)}"` : ''} ${x.view ? `data-view="${x.view}"` : ''} ${x.sub ? `data-sub="${x.sub}"` : ''} ${x.q ? `data-q="${esc(x.q)}"` : ''}>${esc(x.label || (x.act === 'ids-claim' ? 'ลงฟอร์ม AT' : 'เปิด'))}</button>`;
  const act = a.act ? `<div class="flex flex-wrap gap-1 justify-end shrink-0 max-w-[50%]">${btn(a.act, !!(a.act.more && a.act.more.length))}${(a.act.more || []).map(x => btn(x)).join('')}</div>` : '';
  return `<div class="p-3 md:px-4 flex gap-3 items-start">
    <span class="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style="background:var(--${a.tone === 'bad' ? 'bad' : a.tone === 'warn' ? 'warn' : 'muted'})" aria-hidden="true"></span>
    <div class="flex-1 min-w-0"><div class="font-medium">${esc(a.title)}</div><div class="text-sm text-muted">${esc(a.text)}</div></div>${act}</div>`;
}
function viewAlerts(D) {
  const mine = myAlerts(D);
  const groups = [['bad', 'ต้องทำทันที'], ['warn', 'รอดำเนินการ'], ['muted', 'ตรวจย้อนหลัง']];
  const who = isSales() ? `เซลล์ ${S.role.sales}` : S.role.role === 'admin' ? `แอดมินสาขา ${S.role.branch}` : roleLabel();
  return `${pageHead('แจ้งเตือน', `รายการที่ ${esc(who)} ต้องทำ ระบบคำนวณใหม่ทุกครั้งที่ข้อมูลเปลี่ยน`)}
  ${groups.map(([t, h]) => { const list = mine.filter(a => a.tone === t); return list.length ? `<section class="mb-5"><h2 class="font-head text-lg font-semibold mb-2">${h} <span class="text-muted text-base">${list.length}</span></h2>
    <div class="bg-surface border border-line rounded-lg divide-y divide-line">${list.slice(0, 150).map(alertRow).join('')}</div></section>` : ''; }).join('')
    || `<div class="bg-surface border border-line rounded-lg">${emptyBox('ไม่มีอะไรค้าง', 'เมื่อใบจองยังไม่อยู่ใน IDS มีคำขอล็อก หรือถึงขั้นตอนที่ต้องทำ รายการจะขึ้นที่นี่')}</div>`}
  <p class="text-xs text-muted">ในระบบจริงจะส่งแจ้งเตือนเดียวกันนี้ทาง LINE หรือ Telegram ด้วย</p>`;
}

// ---------- stock
function ageBar(a) {
  if (a === null || a === undefined) return '–';
  const tone = a > 180 ? 'var(--bad)' : a > 90 ? 'var(--warn)' : 'var(--muted)';
  return `<span class="inline-flex items-center gap-2 num"><i class="ageb" style="width:${Math.max(4, Math.min(48, a / 6))}px;background:${tone}"></i>${a}</span>`;
}
// sales see only cars they can still sell, plus cars locked for their own customers
const carVisible = c => !isSales() || c.status === 'free' || c.status === 'temp' || c.status === 'pending' || (c.lock && isMine(c.lock.owner)) || c.temps.some(t => isMine(t.owner));
// names of other sales' customers stay hidden from sales
const lockText = l => isSales() && !isMine(l.owner) ? (l.status === 'pending' ? 'มีคำขอล็อกรออนุมัติ (ขอคิวต่อได้)' : 'ล็อกแล้ว') : lockLabel(l);
function stockCars(D) {
  const f = S.filters;
  let cars = [...D.cars.values()].filter(inBr).filter(carVisible);
  if (f.model) cars = cars.filter(c => c.model === f.model);
  if (f.noProd) cars = cars.filter(c => !c.prod);
  if (f.q) {
    const n = f.q.trim().toUpperCase();
    cars = cars.filter(c => c.vin.includes(n) || (c.ref || '').includes(n) || (c.bk || '').includes(n) || (c.cust || '').toUpperCase().includes(n) || (c.sales || '').toUpperCase().includes(n));
  }
  return cars;
}
function viewStock(D) {
  const f = S.filters, p = perms(), mode = S.sub.stock === 'list' ? 'list' : 'spec';
  const all = stockCars(D);
  const counts = {}; all.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
  const models = [...new Set([...D.cars.values()].map(c => c.model).filter(Boolean))].sort();
  const filters = `<div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end mb-3">
    <div class="field"><label for="f-model">รุ่น</label><select id="f-model" data-filter="model"><option value="">ทุกรุ่น</option>${models.map(m => `<option ${f.model === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
    ${isSales() ? '' : `<div class="field"><label for="f-status">สถานะ</label><select id="f-status" data-filter="status"><option value="">ทุกสถานะ</option>
      ${mode === 'spec' ? `<option value="low" ${f.status === 'low' ? 'selected' : ''}>สเปกที่ไม่พอ (แดง)</option>` : ''}
      ${Object.entries(CAR_STATUS).map(([k, v]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${v[0]} (${counts[k] || 0})</option>`).join('')}</select></div>`}
    <div class="field col-span-2 sm:grow sm:max-w-xs"><label for="f-q">ค้นหา VIN / Ref${isSales() ? '' : ' / เลขใบจอง / ชื่อลูกค้า'}</label><input id="f-q" type="search" data-filter="q" value="${esc(f.q)}" placeholder="เช่น MRHGN36"></div>
  </div>`;
  const heldN = [...D.cars.values()].filter(inBr).filter(c => (!f.model || c.model === f.model) && !['free', 'temp', 'company'].includes(c.status)).length;
  const line = isSales() ? `<p class="text-sm mb-2">รถที่ขายได้ <b class="num" style="color:var(--good)">${(counts.free || 0) + (counts.temp || 0)}</b> คัน${counts.temp ? ` (มีคนล็อกชั่วคราวรอลูกค้าอยู่ ${counts.temp} คัน ยังจองแข่งได้)` : ''}${counts.pending ? ` · มีคำขอล็อกรออนุมัติ ${counts.pending} คัน (ขอคิวต่อได้)` : ''} · ติดจองแล้ว <b class="num">${heldN}</b> คัน (ไม่แสดงชื่อ)</p>`
    : `<p class="text-sm mb-2">ทั้งหมด <b class="num">${all.length}</b> คัน · ว่าง <b class="num" style="color:var(--good)">${(counts.free || 0) + (counts.temp || 0)}</b> · ติดจอง/มีชื่อ <b class="num">${(counts.booked || 0) + (counts.noted || 0)}</b> · ล็อก <b class="num">${(counts.locked || 0) + (counts.pending || 0) + (counts.allocated || 0)}</b> · ขาย/ออกใบกำกับ <b class="num">${(counts.sold || 0) + (counts.invoiced || 0) + (counts.delivered || 0)}</b> · รถบริษัท <b class="num">${counts.company || 0}</b> · <span class="text-muted">ส่งมอบแล้ว (มีใบกำกับและวันที่ส่งมอบ) ตัดออกจากสต็อก ${D.deliveredOut.filter(inBr).length} คัน</span>${(() => { const n = [...D.cars.values()].filter(inBr).filter(c => !c.prod).length; return n || f.noProd ? ` · <button class="underline" style="color:var(--warn)" data-act="noprod" aria-pressed="${!!f.noProd}">${f.noProd ? 'แสดงรถทุกคัน' : `ยังไม่มีวันผลิต ${n} คัน`}</button>` : ''; })()}</p>
    ${f.noProd ? `<p class="text-sm mb-2">${chip('แสดงเฉพาะรถที่ยังไม่มีวันผลิต', 'warn')} <span class="text-muted">อายุรถของคันเหล่านี้ยังนับจากวันที่รถฝากศูนย์ กด "ใส่วันผลิต" แล้วดูจากป้ายที่ตัวรถ</span></p>` : ''}`;
  return `
  ${pageHead('สต็อกรถ', isSales() ? 'เห็นรถว่างรายคัน และจำนวนรถที่ติดจองแต่ละสเปก (ไม่แสดงชื่อ)' : 'กดที่สเปกเพื่อดูรถรายคัน หรือสลับเป็นรายคันเพื่อดูชื่อลูกค้า แถวสีแดง = ใบจองรอรถมากกว่ารถว่างรวม Quota',
    perms().receive ? `<button class="btn btn-red" data-act="go" data-view="receive">+ รับรถเข้า</button>` : '')}
  ${brSeg()}
  <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
    <div class="seg" role="group" aria-label="มุมมอง"><button data-act="sub" data-key="stock" data-sub="spec" aria-pressed="${mode === 'spec'}">ตามสเปก</button><button data-act="sub" data-key="stock" data-sub="list" aria-pressed="${mode === 'list'}">รายคัน${isSales() ? '' : ' พร้อมชื่อลูกค้า'}</button></div>
  </div>
  ${filters}${line}
  ${mode === 'list' ? carTable(all, D) : specTable(all, D)}
  <p class="text-xs text-muted mt-2">อายุรถนับจากวันผลิต (ใช้ค่าจาก IDS ถ้าไม่มีใช้ค่าที่คีย์จากป้ายที่รถ) · * ยังไม่มีวันผลิต อายุนับจากวันที่รถฝากศูนย์ไปก่อน</p>
  ${!isSales() && D.removed.filter(inBr).length ? `<section class="mt-6"><h2 class="font-head text-lg font-semibold mb-2">รถที่นำออกในระบบนี้</h2>
    <div class="bg-surface border border-line rounded-lg divide-y divide-line">${D.removed.filter(inBr).map(c => `<div class="p-3 flex flex-wrap gap-x-4 gap-y-1 items-center">
      <span class="code font-medium">${esc(c.vin)}</span><span>${specLabel(c.spec || specKey(c.model, c.grade, c.color))}</span><span>${esc(c.br)}</span>
      <span>${chip(c.removed.reason === 'dealer' ? 'ขาย/แลกดีลเลอร์' : 'อื่น ๆ', 'muted')} ${esc(c.removed.dealer || c.removed.note || '')}</span>
      <span class="text-xs text-muted">${fmtDT(c.removed.at)} ${who(c.removed)}</span>
      ${p.remove && p.write ? `<button class="btn btn-ghost btn-sm ml-auto" data-act="restore" data-vin="${esc(c.vin)}">คืนเข้าสต็อก</button>` : ''}</div>`).join('')}</div></section>` : ''}`;
}
function specTable(cars, D) {
  const f = S.filters, p = perms();
  const brs = S.br ? [S.br] : BRS;
  const pool = isSales() ? [...D.cars.values()].filter(inBr).filter(c => !f.model || c.model === f.model) : cars;
  let specs = [...new Set(pool.map(c => c.spec))].map(k => D.specs[k]);
  if (f.status === 'low') specs = specs.filter(s => s.low);
  else if (f.status) { const ks = new Set(cars.filter(c => c.status === f.status).map(c => c.spec)); specs = specs.filter(s => ks.has(s.key)); }
  specs.sort((a, b) => (b.low - a.low) || a.key.localeCompare(b.key));
  const rows = specs.map(s => {
    const open = f.specOpen === s.key || !!f.q;
    const list = cars.filter(c => c.spec === s.key && (!f.status || f.status === 'low' || c.status === f.status)).sort((a, b) => (b.age ?? -1) - (a.age ?? -1));
    return `<tr class="${s.low ? 'low' : ''}">
      <td><button class="text-left font-medium" data-act="spec" data-key="${esc(s.key)}" aria-expanded="${open}">${open ? '▾' : '▸'} ${specLabel(s.key)}</button>
        ${s.low ? `<div class="text-xs mt-0.5" style="color:var(--bad)">ใบจองรอรถเกินรถที่มี ${s.waiting - s.free - s.incoming} ใบ</div>` : ''}</td>
      ${brs.map(b => `<td class="num text-right ${S.br ? '' : 'hidden md:table-cell'}">${s.freeBy[b] || '<span class="text-muted">–</span>'}${isSales() ? '' : `<span class="text-muted text-xs">/${s.totalBy[b] || 0}</span>`}</td>`).join('')}
      <td class="num text-right font-semibold" ${s.free === 0 ? 'style="color:var(--bad)"' : ''}>${s.free}</td>
      <td class="num text-right">${s.held || '–'}</td>
      <td class="num text-right">${s.locked + s.pending || '–'}</td>
      <td class="num text-right">${s.waiting ? `<button class="underline decoration-dotted font-medium" data-act="specq-open" data-key="${esc(s.key)}" title="ดูว่าใบจองไหนรอรถสเปกนี้">${s.waiting}</button>` : '–'}</td>
      <td class="num text-right hidden sm:table-cell">${s.incoming || '–'}</td>
    </tr>
    ${open ? `<tr><td colspan="${brs.length + 6}" style="padding:0;background:var(--surface)"><div class="divide-y divide-line">${list.map(c => carRow(c, D)).join('') || '<div class="p-3 text-muted">ไม่มีรถตามตัวกรองนี้</div>'}</div></td></tr>` : ''}`;
  }).join('');
  return `<div class="bg-surface border border-line rounded-lg scroll-x">
    <table><thead><tr><th>รุ่น / เกรด / สี</th>${brs.map(b => `<th class="text-right ${S.br ? '' : 'hidden md:table-cell'}">${b} ${isSales() ? 'ว่าง' : 'ว่าง/มี'}</th>`).join('')}
      <th class="text-right">ว่าง</th><th class="text-right">ติดจอง</th><th class="text-right">ล็อก</th><th class="text-right">รอรถ</th><th class="text-right hidden sm:table-cell">Quota</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="${brs.length + 6}">${emptyBox('ไม่พบรถตามตัวกรองนี้', 'ลองล้างตัวกรองหรือค้นหาด้วยเลขอื่น')}</td></tr>`}</tbody></table></div>
    <p class="text-xs text-muted mt-2">ติดจอง = รถที่มีลูกค้าแล้ว (จอง ล็อก หรือขายแล้ว) ${isSales() ? 'แสดงเป็นจำนวน ไม่แสดงชื่อ' : 'ไม่นับรถบริษัท'} · แถวสีแดง = ใบจองรอรถมากกว่ารถว่างรวม Quota ที่ยังว่าง</p>`;
}
function tempChip(c) { return c.temps && c.temps.length ? chip(`ล็อกชั่วคราว ${c.temps.length} คน`, 'warn') : ''; }
function carRow(c, D) {
  const p = perms(), l = c.lock;
  return `<div class="px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
    <div class="min-w-[180px]"><div>${vinLink(c)}</div>
      <div class="text-xs text-muted">${c.year ? 'ปี ' + c.year : ''} ${c.ref ? '· Ref ' + esc(c.ref) : ''} ${c.src !== 'IDS' ? '· ' + esc(c.src) : ''}</div>
      <div class="text-xs">${prodText(c)} ${prodBtn(c)}</div></div>
    <div class="w-12"><b>${esc(c.br)}</b></div>
    <div class="w-32">${carStatusCell(c, D)}</div>
    <div class="w-20 text-sm" ${ageFromNote(c) ? `title="${ageFromNote(c)}"` : ''}>${ageBar(c.age)}${c.ageFrom && c.ageFrom !== 'prod' ? '<span class="text-xs text-muted">*</span>' : ''}</div>
    <div class="text-sm min-w-0 flex-1">${l ? lockText(l) : isSales() ? '' : `${c.bk ? `<span class="text-muted">ใบจอง</span> ${esc(c.bk)} · ` : ''}${custCell(c.cust || (c.bknote ? c.bknote : null), c.sales, { company: c.company || c.status === 'company', seed: c.seed && ['booked', 'noted', 'sold', 'invoiced'].includes(c.status) })}`}</div>
    <div class="flex gap-2">${carActions(c, p, D)}</div></div>`;
}
const lockLabel = l => `${l.type === 'dealer' ? 'ดีลเลอร์ ' + esc(l.dealer_name || '') : l.type === 'temp' ? 'ล็อกชั่วคราว ' + esc(l.owner || l.sales_nick || '') : 'ใบจองของ ' + esc(l.owner || '')}${l.status === 'approved' ? (l.hold ? ` · ถือไว้จนส่งมอบ ${fmtD(l.holdUntil)}` : ` · หมด ${fmtD(l.end)}`) : l.status === 'pending' ? ' · รออนุมัติ' : ''}`;
const carActions = (c, p, D) => `${delivBtn(c, D)}${carLockBtn(c, D)}${['free', 'temp', 'pending'].includes(c.status) && p.write && p.request ? `<button class="btn btn-ghost btn-sm" data-act="lock-open" data-vin="${esc(c.vin)}">${c.status === 'pending' ? 'ขอคิวต่อ' : 'ล็อก'}</button>` : ''}
  ${p.remove && p.write && !c.lock ? `<button class="btn btn-ghost btn-sm" data-act="remove-open" data-vin="${esc(c.vin)}" aria-label="นำรถ ${esc(c.vin)} ออก">− นำออก</button>` : ''}`;
function carTable(cars, D) {
  const f = S.filters, p = perms();
  const list = cars.filter(c => !f.status || f.status === 'low' || c.status === f.status)
    .sort((a, b) => (a.br || '').localeCompare(b.br || '') || a.spec.localeCompare(b.spec) || (b.age ?? -1) - (a.age ?? -1));
  if (!list.length) return `<div class="bg-surface border border-line rounded-lg">${emptyBox('ไม่พบรถตามตัวกรองนี้', 'ลองล้างตัวกรองหรือค้นหาด้วยเลขอื่น')}</div>`;
  return `<div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl">
    <thead><tr><th>หมายเลขตัวถัง</th><th>สาขา</th><th>รุ่น / เกรด / สี</th><th>สถานะ</th><th>วันผลิต</th><th class="text-right">อายุ (วัน)</th>${isSales() ? '<th>ล็อก</th>' : '<th>ชื่อลูกค้า / เลขที่ใบจอง</th><th>ที่ปรึกษาขาย</th>'}<th></th></tr></thead>
    <tbody>${list.map(c => `<tr>
      <td class="nowrap">${vinLink(c)}<div class="text-xs text-muted">${c.ref ? 'Ref ' + esc(c.ref) : ''}${c.src !== 'IDS' ? ' · ' + esc(c.src) : ''}</div></td>
      <td><b>${esc(c.br)}</b></td><td class="nowrap">${specLabel(c.spec)}</td><td class="nowrap">${carStatusCell(c, D)}</td>
      <td class="nowrap text-sm">${c.prod ? `<span class="num">${fmtD(c.prod)}</span>${c.prodSrc === 'key' ? ' <span class="text-xs text-muted">คีย์</span>' : ''}${c.prodDiff ? ' <span class="text-xs" style="color:var(--warn)">ไม่ตรง IDS</span>' : ''}` : '<span class="text-xs" style="color:var(--warn)">ยังไม่มี</span>'} ${prodBtn(c)}</td>
      <td class="text-right" ${ageFromNote(c) ? `title="${ageFromNote(c)}"` : ''}>${ageBar(c.age)}${c.ageFrom && c.ageFrom !== 'prod' ? '<span class="text-xs text-muted">*</span>' : ''}</td>
      ${isSales() ? `<td class="text-sm">${c.lock ? lockText(c.lock) : ''}</td>` : `<td style="min-width:150px">${c.lock ? `<div class="text-xs">${lockLabel(c.lock)}</div>` : ''}${custCell(c.cust || c.bknote, c.sales, { company: c.company || c.status === 'company', seed: c.seed && ['booked', 'noted', 'sold', 'invoiced'].includes(c.status) })}${c.bk ? `<div class="code text-xs text-muted">${esc(c.bk)}</div>` : ''}</td>
      <td class="nowrap">${esc(c.sales || '')}</td>`}<td class="nowrap text-right">${carActions(c, p, D)}</td></tr>`).join('')}</tbody></table></div>`;
}
function bookingLabel(ref, D) {
  if (!ref) return '';
  const b = D.bookingByKey.get(ref);
  if (!b) return ref.replace(/^ids:|^app:/, '');
  return b.no || `(AT Honda) ${b.cust || ''}`;
}
