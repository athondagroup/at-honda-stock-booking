// AT Honda Sale Calculator (ใบเสนอราคา) on the website: the same sign-in as the AT stock web (Supabase Auth +
// table public.members), and an adapter so the page's window.claude.use(name) calls are answered by Supabase:
//   db        → table public.docs (config → col "qcfg", quotes → "quotes", staffreq → "qreq"), live by Realtime
//   user      → the signed-in member (executives = ผู้ดูแลระบบ of the quote page)
//   downloads → an ordinary browser download
//   mcp       → Edge Function "gsheet" (reads the campaign Google Sheet with the company service account)
(function () {
  'use strict';
  const CFG = window.AT_CONFIG;
  const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
  const gate = document.getElementById('gate');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STOCK_URL = new URL('../', location.href).href;

  function screen(html) { gate.hidden = false; gate.innerHTML = `<div class="gate-card"><div class="gate-brand">AT Honda</div><div class="gate-sub">ใบเสนอราคา · Sale Calculator</div>${html}</div>`; }
  let googleOn = null;
  async function googleEnabled() {
    if (googleOn !== null) return googleOn;
    try { const r = await fetch(CFG.url + '/auth/v1/settings', { headers: { apikey: CFG.key } }); const j = await r.json(); googleOn = !!(j && j.external && j.external.google); } catch (e) { googleOn = false; }
    return googleOn;
  }
  async function showLogin(msg) {
    const g = await googleEnabled(), last = localStorage.getItem('ath-email') || '';
    screen(`${msg ? `<p class="gate-msg">${msg}</p>` : ''}
      <form id="g-pass" class="gate-col">
        <input id="g-email" type="email" required placeholder="อีเมลที่ลงทะเบียนไว้" autocomplete="username" value="${esc(last)}">
        <input id="g-pw" type="password" placeholder="รหัสผ่าน" autocomplete="current-password">
        <button class="gate-btn">เข้าสู่ระบบ</button>
      </form>
      <div class="gate-or">ครั้งแรก หรือลืมรหัสผ่าน</div>
      <button class="gate-btn gate-ghost gate-wide" id="g-link">ส่งลิงก์เข้าระบบไปที่อีเมล</button>
      <p class="gate-note">ใช้อีเมลและรหัสผ่านเดียวกับเว็บ AT stock · กดลิงก์ในอีเมลแล้วระบบให้ตั้งรหัสผ่าน · ใช้อีเมลที่ผู้ดูแลระบบเพิ่มไว้แล้วเท่านั้น</p>
      ${g ? '<div class="gate-or">หรือ</div><button class="gate-btn gate-google" id="g-google">เข้าสู่ระบบด้วย Google</button>' : ''}`);
    const back = location.origin + location.pathname;
    const emailOf = () => document.getElementById('g-email').value.trim().toLowerCase();
    if (g) document.getElementById('g-google').onclick = async () => {
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back } });
      if (error) showLogin(`เข้าสู่ระบบด้วย Google ไม่ได้: ${esc(error.message)}`);
    };
    document.getElementById('g-pass').onsubmit = async ev => {
      ev.preventDefault();
      const email = emailOf(), password = document.getElementById('g-pw').value;
      if (!password) { showLogin('ใส่รหัสผ่าน หรือกด "ส่งลิงก์เข้าระบบไปที่อีเมล" ถ้ายังไม่เคยตั้ง'); return; }
      localStorage.setItem('ath-email', email);
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { showLogin(/invalid/i.test(error.message) ? 'อีเมลหรือรหัสผ่านไม่ถูก ถ้ายังไม่เคยตั้งรหัสผ่าน หรือลืม กดส่งลิงก์เข้าระบบ' : `เข้าระบบไม่ได้: ${esc(error.message)}`); return; }
      boot();
    };
    document.getElementById('g-link').onclick = async () => {
      const email = emailOf();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showLogin('ใส่อีเมลก่อน แล้วกดส่งลิงก์'); return; }
      localStorage.setItem('ath-email', email);
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: back, shouldCreateUser: true } });
      showLogin(error ? `ส่งลิงก์ไม่ได้: ${esc(error.message)}` : `ส่งลิงก์ไปที่ ${esc(email)} แล้ว เปิดอีเมลแล้วกดลิงก์เพื่อเข้าระบบ`);
    };
  }
  function showSetPass(email, done, msg) {
    screen(`<p class="gate-msg">${msg || `ตั้งรหัสผ่านสำหรับ <b>${esc(email)}</b> ใช้ได้ทั้งเว็บใบเสนอราคาและเว็บ AT stock`}</p>
      <form id="g-set" class="gate-col">
        <input type="email" value="${esc(email)}" autocomplete="username" readonly hidden>
        <input id="g-p1" type="password" required minlength="6" placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)" autocomplete="new-password">
        <input id="g-p2" type="password" required minlength="6" placeholder="พิมพ์รหัสผ่านอีกครั้ง" autocomplete="new-password">
        <button class="gate-btn">บันทึกรหัสผ่าน</button>
      </form>
      <button class="gate-btn gate-ghost gate-wide" id="g-skip" style="margin-top:10px">ข้ามไปก่อน</button>`);
    document.getElementById('g-skip').onclick = () => { localStorage.setItem('ath-pw-skip', email); done(); };
    document.getElementById('g-set').onsubmit = async ev => {
      ev.preventDefault();
      const p1 = document.getElementById('g-p1').value, p2 = document.getElementById('g-p2').value;
      if (p1.length < 6) { showSetPass(email, done, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว'); return; }
      if (p1 !== p2) { showSetPass(email, done, 'รหัสผ่าน 2 ช่องไม่ตรงกัน ลองใหม่'); return; }
      const { error } = await sb.auth.updateUser({ password: p1, data: { pw_set: true } });
      if (error) { showSetPass(email, done, `ตั้งรหัสผ่านไม่ได้: ${esc(error.message)}`); return; }
      localStorage.setItem('ath-email', email);
      done();
    };
  }
  function showWaiting(email) {
    screen(`<p class="gate-msg">อีเมล <b>${esc(email)}</b> ยังไม่มีสิทธิ์ใช้งาน</p><p class="gate-note">แจ้งผู้ดูแลระบบให้เพิ่มอีเมลนี้ที่เว็บ AT stock (หลังบ้าน → ผู้ใช้งานเว็บ) แล้วกดเข้าใหม่</p>
      <div class="gate-row"><button class="gate-btn" id="g-retry">ลองอีกครั้ง</button><button class="gate-btn gate-ghost" id="g-out">ใช้อีเมลอื่น</button></div>`);
    document.getElementById('g-retry').onclick = () => location.reload();
    document.getElementById('g-out').onclick = async () => { await sb.auth.signOut(); location.reload(); };
  }

  // ---- db: the page's collection names → rows of public.docs
  // atref = หลังบ้านของเว็บ AT stock (อ่านอย่างเดียว เฉพาะตารางที่ใบเสนอราคาใช้ ไม่โหลดประวัติการแก้)
  const COL = { config: 'qcfg', quotes: 'quotes', staffreq: 'qreq', atref: 'ref' };
  const REF_IDS = ['campaigns', 'margins', 'privileges', 'fees', 'foc', 'catalog', 'gifts'];
  const REF_FIELDS = 'id,at:data->at,rows:data->rows,prices:data->prices,price_issue:data->price_issue,reg:data->reg,ins:data->ins,month:data->month,cols:data->cols,src:data->src';
  const colOf = name => { const c = COL[name]; if (!c) throw Object.assign(new Error('collection ' + name), { code: 'invalid_argument' }); return c; };
  const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');
  const err = (e, code) => Object.assign(new Error(e && e.message || code), { code: code || (e && /row-level security|permission|violates/i.test(e.message || '') ? 'not_granted' : /too large|payload/i.test(e && e.message || '') ? 'invalid_argument' : 'unavailable') });
  const subs = {}; // col -> [listener]
  let channel = null;
  async function loadCol(col) {
    const out = new Map(); let from = 0;
    if (col === 'ref') {
      const { data, error } = await sb.from('docs').select(REF_FIELDS).eq('col', 'ref').in('id', REF_IDS);
      if (error) throw err(error);
      data.forEach(r => { const d = {}; Object.keys(r).forEach(k => { if (k !== 'id' && r[k] !== null && r[k] !== undefined) d[k] = r[k]; }); out.set(r.id, d); });
      return out;
    }
    for (;;) {
      const { data, error } = await sb.from('docs').select('id,data').eq('col', col).range(from, from + 999);
      if (error) throw err(error);
      data.forEach(r => out.set(r.id, r.data));
      if (data.length < 1000) return out;
      from += 1000;
    }
  }
  async function refreshOne(col, id) {
    const { data, error } = await sb.from('docs').select('data').eq('col', col).eq('id', id).maybeSingle();
    if (error) return;
    (subs[col] || []).forEach(s => s.put(id, data ? data.data : undefined));
  }
  function ensureChannel() {
    if (channel) return;
    channel = sb.channel('quote-docs').on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
      const row = p.new && p.new.col ? p.new : p.old; if (!row || !row.col || !subs[row.col]) return;
      if (p.eventType !== 'DELETE' && p.new && p.new.data) (subs[row.col] || []).forEach(s => s.put(row.id, p.new.data));
      else refreshOne(row.col, row.id);
    }).subscribe(st => { if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setTimeout(reloadAll, 3000); });
  }
  async function reloadAll() { for (const col of Object.keys(subs)) { try { const m = await loadCol(col); subs[col].forEach(s => s.reset(m)); } catch (e) { /* next time */ } } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reloadAll(); });
  const snapOf = (id, d) => ({ id, exists: d !== undefined, data: () => d });
  function listen(col, onChange, onErr) {
    const map = new Map();
    const s = { put(id, d) { if (col === 'ref' && !REF_IDS.includes(id)) return; if (d === undefined) map.delete(id); else map.set(id, d); onChange(map); }, reset(m) { map.clear(); m.forEach((v, k) => map.set(k, v)); onChange(map); } };
    (subs[col] ||= []).push(s);
    ensureChannel();
    loadCol(col).then(m => s.reset(m)).catch(e => onErr && onErr(e));
    return () => { subs[col] = (subs[col] || []).filter(x => x !== s); };
  }
  function query(col, order, lim) {
    const q = {
      orderBy(field, dir) { return query(col, { field, dir: dir === 'desc' ? -1 : 1 }, lim); },
      limit(n) { return query(col, order, n); },
      onSnapshot(cb, onErr) {
        return listen(col, map => {
          let docs = [...map].map(([id, d]) => snapOf(id, d));
          if (order) docs.sort((a, b) => { const x = a.data()[order.field], y = b.data()[order.field]; return (x > y ? 1 : x < y ? -1 : 0) * order.dir; });
          if (lim) docs = docs.slice(0, lim);
          cb({ docs, size: docs.length, empty: !docs.length });
        }, onErr);
      },
      async get() { const m = await loadCol(col); return { docs: [...m].map(([id, d]) => snapOf(id, d)) }; }
    };
    return q;
  }
  const db = {
    collection(name) {
      const col = colOf(name);
      return Object.assign(query(col, null, 0), {
        doc(id) {
          id = id || hex(10);
          return {
            id,
            async set(body) { if (col === 'ref' && id !== 'gifts') throw Object.assign(new Error('read only'), { code: 'not_granted' }); const { error } = await sb.from('docs').upsert({ col, id, data: JSON.parse(JSON.stringify(body)) }); if (error) throw err(error); },
            async update(body) { const cur = await this.get(); await this.set({ ...(cur.data() || {}), ...body }); },
            async delete() { const { error } = await sb.from('docs').delete().eq('col', col).eq('id', id); if (error) throw err(error); },
            async get() { const { data, error } = await sb.from('docs').select('data').eq('col', col).eq('id', id).maybeSingle(); if (error) throw err(error); return snapOf(id, data ? data.data : undefined); },
            onSnapshot(cb, onErr) { return listen(col, map => cb(snapOf(id, map.get(id))), onErr); }
          };
        },
        async add(body) { const r = this.doc(); await r.set(body); return r; }
      });
    }
  };

  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      return { status: 'saved' };
    }
  };

  // Google Sheet through the Edge Function "gsheet" (company service account), same call shape as the claude.ai connector
  const mcp = {
    async callTool(server, tool, input) {
      const { data, error } = await sb.functions.invoke('gsheet', { body: { tool, ...input } });
      if (error) {
        let info = {}; try { info = (error.context && typeof error.context.json === 'function') ? await error.context.json() : {}; } catch (e) { info = {}; }
        throw Object.assign(new Error(info.message || 'ชีตตอบกลับผิดพลาด'), { code: 'tool_error', status: info.status || null });
      }
      return { content: [], payload: data };
    }
  };

  function footer(email) {
    const f = document.createElement('div');
    f.id = 'q-web-foot';
    f.style.cssText = 'text-align:center;font:500 12px Prompt,sans-serif;color:#6b7280;padding:18px 12px calc(110px + env(safe-area-inset-bottom,0px))';
    f.innerHTML = `เข้าระบบเป็น ${esc(email)} · <a href="${esc(STOCK_URL)}" style="color:#dc2626;font-weight:700">ไปเว็บ AT stock</a> · <a href="#" id="q-out" style="color:#374151;font-weight:700">ออกจากระบบ</a>`;
    document.body.appendChild(f);
    document.getElementById('q-out').onclick = async ev => { ev.preventDefault(); await sb.auth.signOut(); location.reload(); };
  }

  async function start(session, m) {
    gate.hidden = true; gate.innerHTML = '';
    const email = session.user.email.toLowerCase(), isExec = m.role === 'exec';
    const me = { id: session.user.id, name: m.name || email, email, isOwner: isExec, canEdit: isExec };
    window.__QWEB = { email, role: m.role, branch: m.branch || '', salesName: m.sales_name || '', name: m.name || '', logout: async () => { await sb.auth.signOut(); location.reload(); } };
    const user = { async me() { return me; }, async id() { return me.id; }, isOwner: () => isExec, canEdit: () => isExec };
    const caps = { db, user, downloads, mcp };
    window.claude = { use: async n => caps[n] || null };
    window.__startApp();
    footer(email);
  }

  async function boot() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const q = new URLSearchParams(location.hash.slice(1) || location.search.slice(1)), e = q.get('error_description') || q.get('error');
      if (e || q.get('code')) history.replaceState(null, '', location.pathname);
      showLogin(e ? `ลิงก์เข้าระบบใช้ไม่ได้ (${esc(e)}) ลิงก์ใช้ได้ครั้งเดียวและหมดอายุใน 1 ชั่วโมง กดส่งลิงก์ใหม่ หรือเข้าด้วยรหัสผ่าน` : q.get('code') ? 'ลิงก์นี้ต้องเปิดในเบราว์เซอร์เดียวกับที่กดส่งลิงก์ กดส่งลิงก์ใหม่อีกครั้ง' : '');
      return;
    }
    try { await sb.rpc('claim_member'); } catch (e) { /* names only */ }
    const { data: m } = await sb.from('members').select('*').eq('email', session.user.email.toLowerCase()).maybeSingle();
    if (!m || !m.active) { showWaiting(session.user.email); return; }
    const em = session.user.email.toLowerCase(), meta = session.user.user_metadata || {};
    if (!meta.pw_set && (session.user.app_metadata || {}).provider !== 'google' && localStorage.getItem('ath-pw-skip') !== em) { showSetPass(em, () => start(session, m)); return; }
    start(session, m);
  }
  let started = false;
  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && window.__QWEB) location.reload(); });
  if (!started) { started = true; boot(); }
})();
