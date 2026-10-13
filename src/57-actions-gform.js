// ------------------------------------------------------------------ Google Form link (trial period)
Object.assign(ACTIONS, {
  'gform-parse'() {
    const link = (S.gform && S.gform.link) || ($('#gf-link') && $('#gf-link').value) || '';
    const r = gformParse(link);
    S.gform = { link, parsed: r.error ? null : r, error: r.error || null }; render();
  },
  async 'gform-save'() {
    const g = S.gform; if (!g || !g.parsed || !perms().upload) return;
    const map = {}, dup = [];
    g.parsed.entries.forEach(x => { if (!x.field) return; if (map[x.field]) dup.push(x.field); map[x.field] = x.entry; });
    if (dup.length) { toast(`เลือกช่องซ้ำ: ${dup.map(f => GF_FIELDS.find(x => x[0] === f)[1]).join(', ')}`, 'bad'); return; }
    const need = ['br', 'sales', 'customer', 'model'].filter(f => !map[f]);
    if (need.length) { toast(`ยังไม่ได้เลือกช่อง: ${need.map(f => GF_FIELDS.find(x => x[0] === f)[1]).join(', ')}`, 'bad'); return; }
    if (await write('ref', 'gform', { base: g.parsed.base, map, ...actor() })) { S.gform = null; toast('บันทึกการตั้งค่า Google Form แล้ว'); render(); }
  },
  async 'gform-done'(el) {
    const a = atById(el.dataset.id); if (!a || !canEditBooking(a)) return;
    const r = await saveBk(a.id, 'ส่งเข้า Google Form แล้ว', '', x => { x.gform = { sent_at: new Date().toISOString(), ...actor() }; }, x => !(x.gform && x.gform.sent_at));
    if (r) toast('บันทึกว่าส่งเข้า Google Form แล้ว');
  }
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.dataset && t.dataset.gf === 'link') S.gform = { ...(S.gform || {}), link: t.value };
  else if (t.dataset && t.dataset.gf === 'field' && S.gform && S.gform.parsed) S.gform.parsed.entries[Number(t.dataset.i)].field = t.value;
});
// opening the form is a normal link (new tab); remember it here so "ส่งฟอร์มแล้ว" is the obvious next step
document.addEventListener('click', ev => {
  const a = ev.target.closest && ev.target.closest('a[data-gform]');
  if (!a) return;
  S.gformOpened = { ...(S.gformOpened || {}), [a.dataset.gform]: true };
  setTimeout(render, 300);
});
