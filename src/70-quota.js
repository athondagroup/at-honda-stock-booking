// ------------------------------------------------------------------ quota status chips act as filters (13/10)
Object.assign(ACTIONS, {
  'qs-pick'(el) { const k = el.dataset.k || ''; S.filters.qs = S.filters.qs === k ? '' : k; render(); }
});
