// ------------------------------------------------------------------ the AT Honda website (Supabase): sign out (13/10)
Object.assign(ACTIONS, {
  'web-pass'() { if (window.__WEB && window.__WEB.setPassword) window.__WEB.setPassword(); },
  async 'web-logout'() { if (window.__WEB && window.__WEB.logout) await window.__WEB.logout(); }
});

// choosing "อื่น ๆ" as the booking source in the edit window shows the box to type it
document.addEventListener('change', ev => { const t = ev.target; if (t && t.dataset && t.dataset.modal === 'edit.source' && S.modal && S.modal.edit) render(); });
