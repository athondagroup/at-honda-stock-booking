// ------------------------------------------------------------------ the AT Honda website (Supabase): sign out (13/10)
Object.assign(ACTIONS, {
  'web-pass'() { if (window.__WEB && window.__WEB.setPassword) window.__WEB.setPassword(); },
  async 'web-logout'() { if (window.__WEB && window.__WEB.logout) await window.__WEB.logout(); }
});
