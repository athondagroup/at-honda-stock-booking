const SEED = JSON.parse(document.getElementById('seed').textContent);
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

// ------------------------------------------------------------------ constants
const BR = {
  PSC: { name: 'ภาษีเจริญ', code: '0220' },
  ATE: { name: 'เอกชัย-บางบอน', code: '1630' },
  SPH: { name: 'สามพราน', code: '1350' },
  KPA: { name: 'กำแพงแสน', code: '1400' }
};
const BRS = Object.keys(BR);
const DEALER = { '220': 'PSC', '1630': 'ATE', '1350': 'SPH', '1400': 'KPA' };
const CANCEL = 'รอการยกเลิกออกจากระบบ';
const LOCK_DAYS = 15, MAX_EXT = 2, AGE_GAP = 30;
const ROLES = {
  sales: { label: 'เซลล์' },
  admin: { label: 'แอดมินสาขา' },
  aum: { label: 'พี่อั้ม (ผู้จัดการ PSC, ATE)' },
  nuch: { label: 'นุช ปทิตตา (ผู้จัดการ SPH, KPA)' },
  exec: { label: 'ผู้บริหาร' }
};
const LOCK_REASONS = ['รอผลอนุมัติไฟแนนซ์', 'รอโอนเงินดาวน์/ชำระส่วนที่เหลือ', 'ลูกค้าขอดูรถก่อนตัดสินใจ', 'อื่น ๆ'];
const FINANCE = ['HLTC', 'BAY', 'SCB', 'TTB', 'KKP', 'อื่น ๆ'];
const SOURCES = ['Walk-in', 'ลูกค้าแนะนำ', 'Online ตัวเอง', 'Online บริษัท', 'Call', 'ลูกค้าเก่า/Service'];
const INSURANCE = ['Honda แถม', 'AT แถม', 'ไฟแนนซ์แถม', 'ลูกค้าซื้อเอง'];
// insurers taking part in Honda's new-car insurance (campaign 1–31 Oct 2569, HEI 26-D / Super Pack); others can be typed in
const INSURERS = ['คุ้มภัยโตเกียวมารีนประกันภัย', 'กรุงเทพประกันภัย', 'ซมโปะประกันภัย', 'ธนชาตประกันภัย', 'ประกันภัยไทยวิวัฒน์', 'แอกซ่าประกันภัย', 'มิตซุย สุมิโตโม อินชัวรันซ์'];
const SRC_LABEL = { stock: 'Stock', booking: 'Booking', quota: 'Quota', invoice: 'Invoice/DL' };
const CAR_STATUS = {
  free: ['ว่าง', 'good'], noted: ['มีชื่อจองไว้', 'warn'], booked: ['จัดสรรแล้ว (IDS)', 'neutral'],
  sold: ['แจ้งขายแล้ว', 'muted'], invoiced: ['ออกใบกำกับแล้ว', 'muted'], delivered: ['ส่งมอบแล้ว', 'muted'],
  company: ['รถบริษัท', 'muted'], pending: ['รออนุมัติล็อก', 'warn'], locked: ['ล็อกชั่วคราว', 'red'],
  allocated: ['แจ้งจัดสรรแล้ว รอไฟล์ IDS', 'ink']
};
const QUOTA_STATUS = { waiting: ['รอ VIN', 'neutral'], vin: ['ได้ VIN แล้ว รอรถ', 'warn'], arrived: ['ถึงสาขาแล้ว', 'good'], sold: ['ขายแล้ว', 'muted'] };
const BOOK_STATE = {
  waiting: ['รอรถ', 'warn'], pending: ['รออนุมัติล็อก', 'warn'], locked: ['ล็อกแล้ว', 'red'], allocated: ['จัดสรรแล้ว', 'ink'],
  idscar: ['IDS จัดสรรรถแล้ว', 'good'], idsquota: ['IDS จับคู่ Quota', 'neutral'], cancel: ['รอยกเลิก (IDS)', 'muted']
};

// ------------------------------------------------------------------ helpers
const $ = (s, el = document) => el.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayISO = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
const fmtD = iso => { if (!iso) return '–'; const [y, m, d] = String(iso).slice(0, 10).split('-'); return d ? `${d}/${m}/${y.slice(2)}` : esc(iso); };
const fmtDT = iso => { if (!iso) return '–'; const t = new Date(Date.parse(iso) + 7 * 3600e3).toISOString(); return `${fmtD(t)} ${t.slice(11, 16)}`; };
const fmtM = m => { if (!m) return '–'; const [y, mo] = m.split('-'); return `${mo}/${y}`; };
const money = n => (n === null || n === undefined || n === '' || isNaN(Number(n))) ? '–' : Number(n).toLocaleString('th-TH');
const specKey = (m, g, c) => `${m || '?'}|${g || '?'}|${(c || '?').toUpperCase()}`;
const gradeShort = (m, g) => { const t = String(m || '').split(' ').pop(); return t && t !== m && String(g || '').startsWith(t + ' ') ? g.slice(t.length + 1) : g; };
const specLabel = k => { const [m, g, c] = String(k || '?|?|?').split('|'); return `${esc(m)} ${esc(gradeShort(m, g))} <span class="code text-muted">${esc(c)}</span>`; };
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
const chip = (text, tone) => {
  const t = {
    good: 'background:var(--good-soft);color:var(--good)', warn: 'background:var(--warn-soft);color:var(--warn)',
    red: 'background:var(--red);color:var(--on-red)', bad: 'background:var(--bad-soft);color:var(--bad)',
    ink: 'background:var(--fg);color:var(--bg)', muted: 'background:var(--surface-2);color:var(--muted)',
    neutral: 'background:var(--surface-2);color:var(--fg)'
  }[tone] || '';
  return `<span class="chip" style="${t}">${esc(text)}</span>`;
};
const statusChip = (map, st) => { const s = map[st] || [st, 'muted']; return chip(s[0], s[1]); };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const TAB_ID = rid();
const emptyBox = (t, s) => `<div class="p-6 text-center"><div class="font-medium">${t}</div><div class="text-muted text-sm mt-1">${s}</div></div>`;
const plain = o => JSON.parse(JSON.stringify(o, (k, v) => v === undefined ? null : v));

// ------------------------------------------------------------------ state
const VIEWS = ['dash', 'alerts', 'inbox', 'stock', 'book', 'quota', 'lock', 'flow', 'receive', 'upload', 'admin'];
const S = {
  mode: 'connecting', // shared | local | readonly | connecting
  view: 'dash',
  sub: { dash: 'exec', inbox: 'all', book: 'list', lock: 'approve', stock: 'spec', receive: 'pending', flow: 'booked', admin: 'sales' },
  br: lsGet('ath-br', ''),
  role: lsGet('ath-role', { role: 'aum', branch: 'SPH', sales: SEED.sales[0]?.name || '' }),
  me: { id: null, name: '' },
  bookings: new Map(), locks: new Map(), vehicles: new Map(), receipts: new Map(), ids: new Map(), uploads: new Map(), ref: new Map(),
  idsV: 0, dataV: 0, cache: null,
  draft: { booking: null }, files: { bk: [], slip: [], fin: [], passbook: [] },
  ai: { booking: null, receive: null, refund: null, exec: null }, ctl: { booking: null, receive: null },
  upl: { results: [], busy: false, msg: '' },
  filters: { model: '', status: '', q: '', specOpen: null, qModel: '', qMine: false, bq: '', bState: '', aq: '', qm: '', qs: '', rq: '' },
  modal: null, toast: null, pendingRender: false, profiles: {}, assetUrls: {},
  cap: { sample: null, images: null, assets: null, downloads: null }
};
(function readHash() {
  const [v, sub] = (location.hash || '').replace('#', '').split('/');
  if (VIEWS.includes(v)) S.view = v;
  if (sub && S.sub[S.view] !== undefined) S.sub[S.view] = sub;
})();

// ------------------------------------------------------------------ permissions (prototype roles)
function perms() {
  const r = S.role.role;
  const mgr = r === 'aum' || r === 'nuch';
  return {
    mgr: mgr || r === 'exec',
    sales: r === 'sales',
    approve: mgr || r === 'exec',
    lockDirect: mgr || r === 'exec',
    // the branch admin runs operations (upload, receive, allocate) but does not key bookings or ask for locks
    request: r === 'sales' || mgr || r === 'exec',
    book: r === 'sales' || mgr || r === 'exec',
    receive: r === 'admin' || mgr || r === 'exec',
    assign: r === 'admin' || mgr || r === 'exec',
    summary: mgr || r === 'exec' || r === 'admin',
    approveDealer: r === 'aum' || r === 'exec',
    extend: mgr || r === 'exec',
    allocate: r === 'admin' || mgr || r === 'exec',
    confirmReceive: r === 'admin' || mgr || r === 'exec',
    upload: r === 'admin' || mgr || r === 'exec',
    remove: mgr || r === 'exec',
    write: S.mode !== 'readonly'
  };
}
const myBranch = () => S.role.role === 'admin' ? S.role.branch : null;
const branchOk = br => !myBranch() || br === myBranch();
const roleLabel = () => S.role.role === 'sales' ? `เซลล์: ${S.role.sales}` : S.role.role === 'admin'
  ? `แอดมินสาขา ${S.role.branch}` : ROLES[S.role.role].label;
const salesBranch = name => (S.ref.get('sales')?.list || []).find(s => s.name === name)?.br || SEED.sales.find(s => s.name === name)?.br || null;
// Managers see every branch, but approve, allocate, edit and cancel only for their own branches (fewer alerts):
// พี่อั้ม PSC + ATE, นุช SPH + KPA. Either can ask to lock a car of any branch; that branch's manager approves.
// Trading with other dealers stays with พี่อั้ม (perms().approveDealer). The executive can do everything.
const MGR_OF = { aum: ['PSC', 'ATE'], nuch: ['SPH', 'KPA'] };
const MGR_NAME = { PSC: 'พี่อั้ม', ATE: 'พี่อั้ม', SPH: 'นุช', KPA: 'นุช' };
const mgrBranches = () => S.role.role === 'exec' ? BRS : MGR_OF[S.role.role] || [];
const mgrRoleOf = br => Object.keys(MGR_OF).find(k => MGR_OF[k].includes(br)) || null;
const canApproveBr = br => perms().approve && !!br && mgrBranches().includes(br);
// allocating a car: the branch admin, or the manager of that branch
const canAllocBr = br => (S.role.role === 'admin' && br === S.role.branch) || canApproveBr(br);
function custCell(name, sales, o = {}) {
  if (o.company) return chip('รถบริษัท', 'muted');
  if (!name) return `<span class="text-muted">${o.seed ? 'ไม่มีชื่อ (ข้อมูลตัวอย่าง)' : '–'}</span>`;
  if (S.role.role === 'sales' && sales !== S.role.sales) return '<span class="text-muted">ลูกค้าของเซลล์อื่น</span>';
  return esc(name);
}

// ------------------------------------------------------------------ catalog (model → grade → colors) from IDS names
let CATALOG = {};
// the Claude app on Android opens pages in a WebView that does not open the photo picker for pages like this one
const ANDROID_APP = /Android/i.test(navigator.userAgent) && /; wv\)|Version\/[\d.]+ Chrome\//.test(navigator.userAgent);
const ANDROID_NOTE = ANDROID_APP ? `<div class="text-xs mt-1" style="color:var(--warn)">แอป Claude บน Android ยังเปิดคลังรูปหรือกล้องจากหน้านี้ไม่ได้ ถ้ากดแล้วไม่มีอะไรขึ้น ให้คัดลอกลิงก์หน้านี้ไปเปิดใน Chrome แล้วล็อกอิน claude.ai บัญชีเดิม</div>` : '';
// models/grades/colours a new booking can pick: only the current model year (older-year stock, company cars and old IDS bookings are left out)
let BOOK_CATALOG = {}, MODEL_YEAR = {};
function buildBookCatalog(d) {
  const yr = {};
  [d.cars, d.bookings].forEach(l => l.forEach(x => { if (x.model && x.year) yr[x.model] = Math.max(yr[x.model] || 0, x.year); }));
  const cur = x => !x.year || !yr[x.model] || x.year >= yr[x.model];
  MODEL_YEAR = yr;
  return buildCatalog([d.quota, d.cars.filter(cur), d.bookings.filter(cur), ...catalogLists()]);
}
function buildCatalog(lists) {
  const t = {};
  const add = (m, g, c) => { if (!m || !g) return; (t[m] ||= {}); (t[m][g] ||= new Set()); if (c) t[m][g].add(String(c).toUpperCase()); };
  lists.forEach(list => list.forEach(x => add(x.model, x.grade, x.color)));
  const out = {};
  Object.keys(t).sort().forEach(m => { out[m] = {}; Object.keys(t[m]).sort().forEach(g => { out[m][g] = [...t[m][g]].sort(); }); });
  return out;
}
const norm = s => String(s || '').toLowerCase().replace(/[\s'’\-_.()]/g, '');
// Best catalog match for a model/grade/color that AI read off a form.
function fitSpec({ model, grade, color, text }) {
  const cat = CATALOG;
  if (text && /'\d{2}/.test(text)) {
    const m = IDS.mto(text);
    if (!model || !cat[model]) model = m.model;
    if (!grade || !(cat[model] || {})[grade]) grade = m.grade;
  }
  let M = cat[model] ? model : null;
  const hay = norm([model, grade, text].filter(Boolean).join(' '));
  if (!M) M = Object.keys(cat).filter(k => hay.includes(norm(k))).sort((a, b) => b.length - a.length)[0] || null;
  let G = M && cat[M][grade] ? grade : null;
  if (M && !G) {
    const gh = norm([grade, text].filter(Boolean).join(' '));
    G = Object.keys(cat[M]).filter(g => gh.includes(norm(g)) || gh.includes(norm(gradeShort(M, g)))).sort((a, b) => b.length - a.length)[0] || null;
  }
  let C = null;
  if (M && G) {
    const cs = cat[M][G];
    const want = String(color || '').toUpperCase().trim();
    C = cs.includes(want) ? want : cs.find(c => new RegExp(`\\b${c}\\b`).test(String(text || '').toUpperCase())) || null;
  }
  return { model: M || '', grade: G || '', color: C || '' };
}
function fitSales(name) {
  if (!name) return '';
  const all = salesNames();
  const n = norm(name);
  return all.find(s => norm(s) === n) || all.find(s => n.includes(norm(s.split(' ')[0])) && norm(s.split(' ')[0]).length > 2) || '';
}
// all = include people who have left (for reports); pickers only offer current staff
function salesNames(all = false) {
  const roster = S.ref.get('sales')?.list;
  const set = new Set(roster ? roster.map(s => s.name) : SEED.sales.map(s => s.name));
  for (const b of S.bookings.values()) if (b.sales) set.add(b.sales);
  if (!roster) idsData().bookings.forEach(b => b.sales && set.add(b.sales));
  const left = new Set((roster || []).filter(s => s.left).map(s => s.name));
  return [...set].filter(n => n && (all || !left.has(n))).sort((a, b) => a.localeCompare(b, 'th'));
}
