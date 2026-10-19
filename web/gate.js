// AT Honda website: sign-in gate and the Supabase adapter.
// The app itself was built for claude.ai, where the page asks the host for its abilities through
// window.claude.use(name). Here the same names are answered by Supabase, so the app code is shared:
//   db        → table public.docs (one JSON document per record, live updates by Realtime)
//   user      → Supabase Auth (Google or e-mail link) + table public.members (role, branch, sales name)
//   assets    → Storage bucket "assets" (private; shown through short-lived signed links)
//   downloads → an ordinary browser download
//   sample    → Edge Function "ai-read" (Claude API), only when the company API key is set
//   mcp       → Edge Function "gsheet" (Google Form sheet), only when it is set up
(function () {
  'use strict';
  const CFG = window.AT_CONFIG;
  const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
  const gate = document.getElementById('gate');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ROLE_TH = { sales: 'เซลล์', admin: 'แอดมินสาขา', aum: 'ผู้จัดการ PSC, ATE', nuch: 'ผู้จัดการ SPH, KPA', exec: 'ผู้บริหาร' };

  function screen(html) { gate.hidden = false; gate.innerHTML = `<div class="gate-card"><div class="gate-brand">AT Honda</div><div class="gate-sub">สต็อก จอง และล็อกรถ</div>${html}</div>`; }
  // sign-in: e-mail + password (set once after the first e-mail link); the e-mail link stays for the first time
  // and for a forgotten password; Google shows only when it is switched on in Supabase (Authentication → Providers)
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
      <p class="gate-note">กดลิงก์ในอีเมลแล้ว ระบบให้ตั้งรหัสผ่าน ครั้งต่อไปใช้อีเมล + รหัสผ่านได้เลย · ใช้อีเมลที่ผู้ดูแลระบบเพิ่มไว้แล้วเท่านั้น</p>
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
  // set (or change) the password; after the first e-mail link this shows once, and from the menu "ตั้งรหัสผ่าน"
  function showSetPass(email, done, msg) {
    screen(`<p class="gate-msg">${msg || `ตั้งรหัสผ่านสำหรับ <b>${esc(email)}</b> ครั้งต่อไปเข้าด้วยอีเมล + รหัสผ่านได้เลย ไม่ต้องรอลิงก์`}</p>
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
    screen(`<p class="gate-msg">อีเมล <b>${esc(email)}</b> ยังไม่มีสิทธิ์ใช้งาน</p><p class="gate-note">แจ้งผู้ดูแลระบบให้เพิ่มอีเมลนี้ พร้อมบทบาทและสาขา แล้วกดเข้าใหม่</p>
      <div class="gate-row"><button class="gate-btn" id="g-retry">ลองอีกครั้ง</button><button class="gate-btn gate-ghost" id="g-out">ใช้อีเมลอื่น</button></div>`);
    document.getElementById('g-retry').onclick = () => location.reload();
    document.getElementById('g-out').onclick = async () => { await sb.auth.signOut(); location.reload(); };
  }

  // ---- db: collection(col).doc(id).set/get, collection(col).doc().id, collection(col).onSnapshot
  const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');
  const subs = {}; // col -> [{ map, emit }]
  let channel = null;
  const err = (e, code) => Object.assign(new Error(e && e.message || code), { code: code || (e && /row-level security|permission/i.test(e.message || '') ? 'not_granted' : /too large|payload/i.test(e && e.message || '') ? 'invalid_argument' : 'unavailable') });
  async function loadCol(col) {
    const out = new Map(); let from = 0;
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
    (subs[col] || []).forEach(s => { if (data) s.map.set(id, data.data); else s.map.delete(id); s.emit(); });
  }
  function ensureChannel() {
    if (channel) return;
    channel = sb.channel('docs-all').on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
      const row = p.new && p.new.col ? p.new : p.old; if (!row || !row.col || !subs[row.col]) return;
      if (p.eventType !== 'DELETE' && p.new && p.new.data) (subs[row.col] || []).forEach(s => { s.map.set(row.id, p.new.data); s.emit(); });
      else refreshOne(row.col, row.id);
    }).subscribe(st => { if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setTimeout(reloadAll, 3000); });
  }
  async function reloadAll() { for (const col of Object.keys(subs)) { try { const m = await loadCol(col); subs[col].forEach(s => { s.map.clear(); m.forEach((v, k) => s.map.set(k, v)); s.emit(); }); } catch (e) { /* next time */ } } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reloadAll(); });
  const db = {
    collection(col) {
      return {
        doc(id) {
          id = id || hex(10);
          return {
            id,
            async set(body) { const { error } = await sb.from('docs').upsert({ col, id, data: body }); if (error) throw err(error); },
            async get() { const { data, error } = await sb.from('docs').select('data').eq('col', col).eq('id', id).maybeSingle(); if (error) throw err(error); return { exists: !!data, data: () => data ? data.data : undefined }; }
          };
        },
        onSnapshot(cb, onErr) {
          const s = { map: new Map(), emit: () => cb({ docs: [...s.map].map(([id, d]) => ({ id, data: () => d })) }) };
          (subs[col] ||= []).push(s);
          ensureChannel();
          loadCol(col).then(m => { m.forEach((v, k) => s.map.set(k, v)); s.emit(); }).catch(e => onErr && onErr(e));
          return () => { subs[col] = subs[col].filter(x => x !== s); };
        }
      };
    }
  };

  // ---- assets: private bucket, signed links (cached), swapped into <img> when ready
  const urls = {}, want = new Set(); let timer = null;
  const PH = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  function fill() {
    document.querySelectorAll('img[src*="#asset="]').forEach(im => { const id = im.getAttribute('src').split('#asset=')[1]; if (urls[id]) im.src = urls[id]; });
  }
  async function sign() {
    timer = null; const ids = [...want]; want.clear(); if (!ids.length) return;
    const { data } = await sb.storage.from('assets').createSignedUrls(ids, 6 * 3600);
    (data || []).forEach(x => { if (x.signedUrl) urls[x.path] = x.signedUrl; });
    fill();
  }
  window.__assetUrl = id => { if (urls[id]) return urls[id]; want.add(id); if (!timer) timer = setTimeout(sign, 30); return PH + '#asset=' + id; };
  new MutationObserver(() => { if (Object.keys(urls).length) fill(); }).observe(document.documentElement, { subtree: true, childList: true });
  const assets = {
    async upload(blob, o) {
      const id = hex(16), type = (o && o.type) || blob.type || 'image/jpeg';
      const { error } = await sb.storage.from('assets').upload(id, blob, { contentType: type, upsert: false });
      if (error) throw err(error, /exceeded|too large/i.test(error.message || '') ? 'too_large' : undefined);
      const { data } = await sb.storage.from('assets').createSignedUrl(id, 6 * 3600);
      urls[id] = data && data.signedUrl;
      return { id, url: urls[id], sizeBytes: blob.size, contentType: type };
    }
  };

  // ---- downloads
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      return { status: 'saved' };
    }
  };

  // ---- AI (Claude API through the Edge Function; the key never reaches the browser)
  const toB64 = b => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = bad; r.readAsDataURL(b); });
  async function ai(body) {
    const { data, error } = await sb.functions.invoke('ai-read', { body });
    if (error) { let code = 'unavailable'; try { const j = await error.context.json(); code = j.code || code; } catch (e) { /* plain error */ } throw Object.assign(new Error(code), { code }); }
    return data;
  }
  async function makeSample() {
    let ready = false;
    try { ready = !!(await ai({ ping: true })).ready; } catch (e) { ready = false; }
    if (!ready) return null;
    const imgs = async list => Promise.all((list || []).map(async b => ({ type: b.type || 'image/jpeg', data: await toB64(b) })));
    const sample = async (input, o = {}) => { const r = await ai({ prompt: typeof input === 'string' ? input : JSON.stringify(input), images: await imgs(o.images), mode: 'text' }); return { text: r.text || '', truncated: false }; };
    sample.json = async (prompt, o = {}) => (await ai({ prompt, images: await imgs(o.images), mode: 'json' })).json;
    sample.limits = async () => ({ maxPromptBytes: 200000, images: { maxCount: 5, maxInputBytes: 5e6, mediaTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] } });
    return sample;
  }

  // ---- Google Form sheet (Edge Function), same call shape as the claude.ai connector
  async function makeMcp() {
    try { const { data } = await sb.functions.invoke('gsheet', { body: { ping: true } }); if (!data || !data.ready) return null; } catch (e) { return null; }
    return {
      async callTool(server, tool, input) {
        const { data, error } = await sb.functions.invoke('gsheet', { body: input });
        if (error) {
          // the function says why (Google's status, and the account the sheet must be shared with)
          let info = {}; try { info = (error.context && typeof error.context.json === 'function') ? await error.context.json() : {}; } catch (e) { info = {}; }
          throw Object.assign(new Error('tool_error'), { code: 'tool_error', status: info.status || null, share_with: info.share_with || '', detail: info.message || '' });
        }
        return { content: [], payload: data };
      }
    };
  }

  async function start(session, m) {
    gate.hidden = true; gate.innerHTML = '';
    const email = session.user.email.toLowerCase();
    const canSwitch = m.role === 'exec';
    // the role always comes from the members table; the executive may still try other roles on screen
    let role = { role: m.role, branch: m.branch || 'PSC', sales: m.sales_name || '' };
    if (canSwitch) { try { const prev = JSON.parse(localStorage.getItem('ath-role') || 'null'); if (prev && prev.role) role = prev; } catch (e) { /* first visit */ } }
    localStorage.setItem('ath-role', JSON.stringify(role));
    window.__WEB = { email, name: m.name || email, role: m.role, canSwitch, logout: async () => { await sb.auth.signOut(); localStorage.removeItem('ath-role'); location.reload(); },
      setPassword: () => showSetPass(email, () => { gate.hidden = true; gate.innerHTML = ''; }),
      // the executive manages who may sign in (RLS lets only the executive change this table)
      members: {
        async list() { const { data, error } = await sb.from('members').select('email,name,role,branch,sales_name,active,user_id,updated_at').order('role').order('email'); if (error) throw err(error); return data; },
        async save(row) { const { error } = await sb.from('members').upsert({ ...row, email: row.email.toLowerCase(), updated_at: new Date().toISOString() }); if (error) throw err(error); }
      },
      // one-time move of the records and photos from the claude.ai version
      async importDocs(list, onStep) {
        for (let i = 0; i < list.length; i += 100) {
          const { error } = await sb.from('docs').upsert(list.slice(i, i + 100).map(d => ({ col: d.col, id: d.id, data: d.data })));
          if (error) throw err(error); if (onStep) onStep(Math.min(list.length, i + 100));
        }
      },
      async importAsset(id, blob, type) {
        const { error } = await sb.storage.from('assets').upload(id, blob, { contentType: type || 'image/jpeg', upsert: true });
        if (error && !/exists|duplicate/i.test(error.message || '')) throw err(error);
      } };
    const me = { id: session.user.id, name: m.name || email };
    const user = {
      async me() { return me; }, async id() { return me.id; }, isOwner: () => canSwitch, canEdit: () => canSwitch,
      async can(n) { return n === 'data.write' ? true : null; },
      async profiles(ids) {
        const out = {}; const { data } = await sb.from('members').select('user_id,name,email').in('user_id', ids);
        (data || []).forEach(r => { out[r.user_id] = { name: r.name || r.email }; });
        // people from the claude.ai version (ids like u_…), named in ref/people at the move
        if (ids.some(id => !out[id])) { const { data: p } = await sb.from('docs').select('data').eq('col', 'ref').eq('id', 'people').maybeSingle(); const map = (p && p.data && p.data.map) || {}; ids.forEach(id => { if (!out[id] && map[id]) out[id] = { name: map[id] }; }); }
        return out;
      }
    };
    const [sample, mcp, notify] = await Promise.all([makeSample(), makeMcp(),
      sb.functions.invoke('booking-notify', { body: { ping: true } }).then(r => r.data || null).catch(() => null)]);
    // a booking keyed here goes to the Telegram groups and the form's sheet (Edge Function booking-notify)
    window.__WEB.notifyReady = notify && (notify.mgr || notify.sales || notify.sheet) ? notify : null;
    window.__WEB.sheetUpdate = async q => { try { const { data, error } = await sb.functions.invoke('booking-notify', { body: { sheetUpdate: q } }); return error ? { sheet: 'error' } : data; } catch (e) { return { sheet: 'error' }; } };
    window.__WEB.notify = async body => { const { data, error } = await sb.functions.invoke('booking-notify', { body }); if (error) throw Object.assign(new Error('notify'), { code: 'unavailable' }); return data; };
    const caps = { db, user, assets, downloads, sample, mcp };
    window.claude = { use: async n => caps[n] || null };
    window.__startApp();
  }

  async function boot() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const q = new URLSearchParams(location.hash.slice(1) || location.search.slice(1)), err = q.get('error_description') || q.get('error');
      if (err || q.get('code')) history.replaceState(null, '', location.pathname);
      showLogin(err ? `ลิงก์เข้าระบบใช้ไม่ได้ (${esc(err)}) ลิงก์ใช้ได้ครั้งเดียวและหมดอายุใน 1 ชั่วโมง กดส่งลิงก์ใหม่ หรือเข้าด้วยรหัสผ่าน` : q.get('code') ? 'ลิงก์นี้ต้องเปิดในเบราว์เซอร์เดียวกับที่กดส่งลิงก์ กดส่งลิงก์ใหม่อีกครั้ง' : '');
      return;
    }
    try { await sb.rpc('claim_member'); } catch (e) { /* names only */ }
    const { data: m } = await sb.from('members').select('*').eq('email', session.user.email.toLowerCase()).maybeSingle();
    if (!m || !m.active) { showWaiting(session.user.email); return; }
    const em = session.user.email.toLowerCase(), meta = session.user.user_metadata || {};
    // signed in by e-mail link and no password yet: offer to set one (once; "ข้ามไปก่อน" is remembered on this device)
    if (!meta.pw_set && (session.user.app_metadata || {}).provider !== 'google' && localStorage.getItem('ath-pw-skip') !== em) { showSetPass(em, () => start(session, m)); return; }
    start(session, m);
  }
  // reload only when someone who was using the app is signed out (a failed link also reports SIGNED_OUT: reloading
  // then would loop forever — 14/10)
  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && window.__WEB) location.reload(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => null);
  boot();
})();
