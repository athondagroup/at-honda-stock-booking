// ---------- the same customer keyed twice (decided 21/10)
// A booking whose customer's name (titles and spaces ignored, first and last name) matches a booking still open
// (not cancelled, not delivered) is either a second booking or the same booking keyed twice.
// - Google Form import: the row says so before it is imported; the importer picks
//     คีย์ซ้ำ ไม่ต้องนำเข้า   → not imported; column C of the new sheet row = "คีย์ซ้ำ"
//     นำเข้าข้อมูลใหม่ แทนใบเดิม → the old booking keeps its queue, locks and steps and takes the new values
//                               (every changed field kept in its history); column C of the old sheet row = "คีย์ซ้ำ"
//     จองเพิ่ม                → imported as a booking of its own
// - a sales keying a new booking in the web: "ชื่อนี้เคยคีย์จองแล้ว" → จองเพิ่ม (save) or ยกเลิก ใช้ใบจองเดิม
// Rows marked "คีย์ซ้ำ" (sheet column C, or kept in ref/gsdup where the sheet cannot be written) are not offered again.
// Only function declarations at the top level: the first render runs before this file.
function bkDupKey(s) { return normName(s).replace(/\s+/g, ''); }
function bkDupsOf(name, D, exceptId) {
  const k = bkDupKey(name); if (k.length < 4) return [];
  return D.at.filter(a => a.id !== exceptId && !a.cancelled && a.active && bkDupKey(a.cust) === k)
    .sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));
}
function bkDupLine(a) { return `${esc(a.cust)} · ${esc(a.model || '')} ${esc(gradeShort(a.model, a.grade) || a.grade || '')} ${esc(a.color || '')} · จอง ${fmtD(a.date)} · ${esc(a.sales || '–')} · ${esc(a.br || '')}`; }
// the form's fields that a replacement copies onto the old booking
function gsDupFields() { return ['booking_date', 'br', 'sales', 'customer', 'source', 'model', 'grade', 'color', 'purchase', 'insurance', 'discount', 'foc_total', 'note', 'lead_id', 'doc_url']; }
function gsDupDiff(doc, rec) {
  const same = (x, y) => String(x ?? '').trim() === String(y ?? '').trim();
  // the name only differs in a title or spacing (that is how it was found): the old spelling stays
  return gsDupFields().filter(k => !same(doc[k], rec[k]) && !(k === 'customer' && bkDupKey(doc[k]) === bkDupKey(rec[k])));
}
function gsIgnored(id) { const d = S.ref.get('gsdup'); return !!(d && d.ids && d.ids[id]); }
async function gsIgnore(id, info) {
  const cur = S.ref.get('gsdup') || {};
  return write('ref', 'gsdup', { ...cur, ids: { ...(cur.ids || {}), [id]: { ...info, ...actor(), at: new Date().toISOString() } } });
}
async function gsMarkDupRow(driveId) {
  if (!driveId || !(window.__WEB && window.__WEB.sheetUpdate)) return 'skip';
  const c = gsCfg();
  const r = await window.__WEB.sheetUpdate({ sheetId: c.id, tab: (c.range || 'Booking!A2:U').split('!')[0], webId: '', driveId, set: { 2: 'คีย์ซ้ำ' } });
  return (r && r.sheet) || 'error';
}
// under the customer's name in the import table
function gsDupCell(x, D) {
  const dups = bkDupsOf(x.doc.customer, D, x.id); if (!dups.length) return '';
  const g = S.gs || {}, act = (g.dupAct || {})[x.id] || 'dup', old = dups[0], r = S.bookings.get(old.id) || {};
  const diff = gsDupDiff(x.doc, r).filter(k => k !== 'doc_url');
  return `<div class="mt-1 p-2 rounded text-xs" style="background:var(--warn-soft)"><b style="color:var(--bad)">⚠ ลูกค้าชื่อนี้เคยคีย์จองแล้ว</b>
    ${dups.slice(0, 3).map(a => `<div>${bkDupLine(a)}</div>`).join('')}
    ${diff.length ? `<div class="mt-1">ต่างจากใบเดิม: ${diff.map(k => `<b>${esc(CHANGE_KEYS[k] || INSTANT_KEYS[k] || k)}</b> ${esc(fieldVal(k, r[k]))} → ${esc(fieldVal(k, x.doc[k]))}`).join(' · ')}</div>` : '<div class="mt-1">ข้อมูลตรงกับใบเดิมทุกช่อง</div>'}
    <select class="mt-1 w-full" style="max-width:100%;min-height:36px;border:1px solid var(--line);border-radius:6px;background:var(--surface)" data-gsdup="${esc(x.id)}" aria-label="ชื่อซ้ำ ทำอย่างไร">
      <option value="dup" ${act === 'dup' ? 'selected' : ''}>คีย์ซ้ำ ไม่ต้องนำเข้า</option>
      <option value="replace" ${act === 'replace' ? 'selected' : ''}>นำเข้าข้อมูลใหม่ แทนใบเดิม (จอง ${fmtD(old.date)})</option>
      <option value="extra" ${act === 'extra' ? 'selected' : ''}>จองเพิ่ม (ลูกค้าจองอีกคัน)</option></select></div>`;
}
// one picked import row with a duplicate: returns 'skip' | 'replaced' | null (import it as usual)
async function gsDupApply(x, D) {
  const dups = bkDupsOf(x.doc.customer, D, x.id); if (!dups.length) return null;
  const act = ((S.gs || {}).dupAct || {})[x.id] || 'dup', old = dups[0];
  if (act === 'extra') { x.doc.dup_note = `จองเพิ่ม (ชื่อซ้ำกับใบจอง ${old.cust} จอง ${fmtD(old.date)})`; return null; }
  if (act === 'dup') {
    await gsIgnore(x.id, { act: 'คีย์ซ้ำ ไม่นำเข้า', of: old.id });
    const st = await gsMarkDupRow(x.id.slice(2));
    if (st === 'notfound' || st === 'error') toast(`ไม่ได้เขียน "คีย์ซ้ำ" ในชีต (${x.doc.customer})`, 'bad');
    return 'skip';
  }
  const r0 = S.bookings.get(old.id) || {}, keys = gsDupDiff(x.doc, r0);
  const fields = Object.fromEntries(keys.map(k => [k, x.doc[k] ?? null])), oldv = Object.fromEntries(keys.map(k => [k, r0[k] ?? null]));
  const shown = Object.fromEntries(Object.entries(fields).filter(([k]) => k !== 'doc_url'));
  const note = (Object.keys(shown).length ? changeText({ fields: shown, old: oldv }) : 'ข้อมูลเหมือนเดิม') + ' · จากฟอร์มที่ส่งซ้ำ';
  const prevDrive = r0.sheet_drive_id || (old.id.startsWith('F_') ? old.id.slice(2) : null);
  const r = await saveBk(old.id, 'นำเข้าข้อมูลใหม่แทนใบเดิม (คีย์ซ้ำ)', note, b => {
    Object.assign(b, fields);
    b.form_ids = [...new Set([...(b.form_ids || []), ...(prevDrive ? ['F_' + prevDrive] : []), x.id])];
    b.old_doc_urls = [...(b.old_doc_urls || []), ...(fields.doc_url && r0.doc_url ? [r0.doc_url] : [])];
    b.sheet_drive_id = x.id.slice(2);
  });
  if (!r) return 'skip';
  await gsIgnore(x.id, { act: 'นำเข้าแทนใบเดิม', of: old.id });
  if (prevDrive) { const st = await gsMarkDupRow(prevDrive); if (st === 'notfound' || st === 'error') toast(`ไม่ได้เขียน "คีย์ซ้ำ" ในแถวเดิมของชีต (${x.doc.customer})`, 'bad'); }
  return 'replaced';
}
Object.assign(ACTIONS, {
  'bkdup-old'(el) {
    if (!confirm('ไม่บันทึกใบจองใหม่นี้ และเปิดใบจองเดิมให้แก้แทน?')) return;
    S.modal = null; S.view = 'book'; S.sub.book = 'list';
    resetBooking();
    setHash(); render();
    if (el.dataset.id) ACTIONS['at-open']({ dataset: { id: el.dataset.id } });
  }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.gsdup || !S.gs) return;
  S.gs.dupAct = { ...(S.gs.dupAct || {}), [t.dataset.gsdup]: t.value }; render();
});
