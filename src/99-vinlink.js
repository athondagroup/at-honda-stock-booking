// ------------------------------------------------------------------ every frame number opens the car window (26/10)
// bookings, delivered / sold lists, moved cars and the reports show a frame number as plain text in many places; instead of editing each one,
// any ".code" element holding a 17-character frame number becomes a link after each draw. A click on it opens the same window as in สต็อก.
// Only function declarations at top level here.
function vinMark(root) {
  const VIN = /^[A-Z0-9]{17}$/;
  (root || document).querySelectorAll('.code').forEach(el => {
    const t = (el.textContent || '').trim();
    if (!VIN.test(t) || el.closest('button, a, h2, h3, label, select, option, textarea, input, [data-nolink]')) { if (el.dataset.vinlink) { delete el.dataset.vinlink; el.classList.remove('vin-auto'); } return; }
    el.dataset.vinlink = t; el.classList.add('vin-auto'); el.title = 'กดดูรายละเอียดรถ'; el.setAttribute('role', 'button'); el.tabIndex = 0;
  });
}
(function vinLinkInit() {
  if (typeof document === 'undefined' || window.__vinLinkInit) return; window.__vinLinkInit = true;
  const st = document.createElement('style');
  st.textContent = '.vin-auto{cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px}.vin-auto:hover{color:var(--red,#c8102e)}';
  document.head.appendChild(st);
  const open = el => { const vin = el.dataset.vinlink; if (vin && ACTIONS['car-open']) ACTIONS['car-open']({ dataset: { vin } }); };
  // capture phase: the row around the number (e.g. open the booking) must not also fire
  document.addEventListener('click', ev => { const el = ev.target.closest && ev.target.closest('[data-vinlink]'); if (!el) return; ev.preventDefault(); ev.stopPropagation(); open(el); }, true);
  document.addEventListener('keydown', ev => { if (ev.key !== 'Enter') return; const el = ev.target.closest && ev.target.closest('[data-vinlink]'); if (el) { ev.preventDefault(); open(el); } }, true);
})();
