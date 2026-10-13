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
  const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
  const gate = document.getElementById('gate');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ROLE_TH = { sales: 'เซลล์', admin: 'แอดมินสาขา', aum: 'ผู้จัดการ PSC, ATE', nuch: 'ผู้จัดการ SPH, KPA', exec: 'ผู้บริหาร' };

  function screen(html) { gate.hidden = false; gate.innerHTML = `<div class="gate-card"><div class="gate-brand">AT Honda</div><div class="gate-sub">สต็อก จอง และล็อกรถ</div>${html}</div>`; }
  function showLogin(msg) {
    screen(`${msg ? `<p class="gate-msg">${msg}</p>` : ''}
      <button class="gate-btn gate-google" id="g-google">เข้าสู่ระบบด้วย Google</button>
      <div class="gate-or">หรือรับลิงก์เข้าระบบทางอีเมล</div>
      <form id="g-mail" class="gate-row"><input id="g-email" type="email" required placeholder="อีเมลที่ลงทะเบียนไว้" autocomplete="email"><button class="gate-btn">ส่งลิงก์</button></form>
      <p class="gate-note">ใช้อีเมลที่ผู้ดูแลระบบเพิ่มไว้แล้วเท่านั้น</p>`);
    const back = location.origin + location.pathname;
    document.getElementById('g-google').onclick = async () => {
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back } });
      if (error) showLogin(`เข้าสู่ระบบด้วย Google ไม่ได้: ${esc(error.message)} (ผู้ดูแลต้องเปิด Google ใน Supabase ก่อน)`);
    };
    document.getElementById('g-mail').onsubmit = async ev => {
      ev.preventDefault();
      const email = document.getElementById('g-email').value.trim().toLowerCase();
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: back, shouldCreateUser: true } });
      showLogin(error ? `ส่งลิงก์ไม่ได้: ${esc(error.message)}` : `ส่งลิงก์ไปที่ ${esc(email)} แล้ว เปิดอีเมลแล้วกดลิงก์เพื่อเข้าระบบ`);
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
        if (error) throw Object.assign(new Error('tool_error'), { code: 'tool_error' });
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
    window.__WEB.notify = async body => { const { data, error } = await sb.functions.invoke('booking-notify', { body }); if (error) throw Object.assign(new Error('notify'), { code: 'unavailable' }); return data; };
    const caps = { db, user, assets, downloads, sample, mcp };
    window.claude = { use: async n => caps[n] || null };
    window.__startApp();
  }

  async function boot() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { showLogin(new URLSearchParams(location.hash.slice(1)).get('error_description') || ''); return; }
    try { await sb.rpc('claim_member'); } catch (e) { /* names only */ }
    const { data: m } = await sb.from('members').select('*').eq('email', session.user.email.toLowerCase()).maybeSingle();
    if (!m || !m.active) { showWaiting(session.user.email); return; }
    start(session, m);
  }
  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') location.reload(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => null);
  boot();
})();
