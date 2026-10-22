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
// same person: the whole name (titles and spacing ignored, so "ภาคภูมิพีรยวัฒนา" = "ภาคภูมิ พีรยวัฒนา") is the same,
// or differs by one typo (one letter added, dropped, changed, or two side by side swapped: นรนม ↔ นรมน) in a name long
// enough to be first name + last name. A first name alone never matches a full name.
function bkDupSame(x, y) {
  const a = bkDupKey(x), b = bkDupKey(y);
  if (!a || !b) return false;
  if (a === b) return a.length >= 4;
  return Math.min(a.length, b.length) >= 8 && Math.abs(a.length - b.length) <= 1 && osaDist(a, b, 1) <= 1;
}
function bkDupsOf(name, D, exceptId) {
  return D.at.filter(a => a.id !== exceptId && !a.cancelled && a.active && (bkDupSame(name, a.cust) || bkDupSame(name, a.rec.customer)))
    .sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));
}
function bkDupLine(a) { return `${esc(a.cust)}${a.custForm ? ` (ฟอร์ม: ${esc(a.custForm)})` : ''} · ${esc(a.model || '')} ${esc(gradeShort(a.model, a.grade) || a.grade || '')} ${esc(a.color || '')} · จอง ${fmtD(a.date)} · ${esc(a.sales || '–')} · ${esc(a.br || '')}`; }
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
  return `<div class="mt-1 p-2 rounded text-xs" style="background:var(--warn-soft)"><b style="color:var(--bad)">⚠ ลูกค้าชื่อนี้เคยคีย์จองแล้ว${dups.some(a => bkDupKey(a.cust) !== bkDupKey(x.doc.customer) && bkDupKey(a.rec.customer) !== bkDupKey(x.doc.customer)) ? ' (ชื่อใกล้เคียง อาจสะกดผิด)' : ''}</b>
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
// ---------- two bookings already in the system for one customer (keyed twice): merge, never cancel
// The extra booking is taken out (not counted as a cancellation, its open locks closed, its sheet row = คีย์ซ้ำ);
// the kept booking's history says what the extra one held. Managers merge straight away; others ask the manager.
function mergeChangeBox(a, ch) {
  const D = derive(), into = D.at.find(x => x.id === ch.into), dec = canDecideBooking(a);
  return `<div class="p-3 rounded-lg text-sm" style="background:var(--warn-soft);border-left:3px solid var(--warn)"><b>ขอรวมใบจอง (ลงซ้ำ) รอผู้จัดการอนุมัติ</b>
    <div>ใบนี้จะถูกเอาออก (ไม่นับเป็นยกเลิก) ใช้ใบจอง: ${into ? bkDupLine(into) : esc(ch.into_label || ch.into)}</div>
    <div class="text-xs mt-1">ขอโดย ${who(ch)} ${fmtDT(ch.at)}</div>
    ${dec ? `<div class="flex flex-wrap gap-2 mt-2"><button class="btn btn-red btn-sm" data-act="merge-approve" data-id="${esc(a.id)}">อนุมัติรวมใบ</button><button class="btn btn-ghost btn-sm" data-act="chg-reject" data-id="${esc(a.id)}">ไม่อนุมัติ</button></div>` : `<div class="text-xs mt-1">รอ${MGR_NAME[a.br] || 'ผู้จัดการ'}อนุมัติ</div>`}
    ${isRequester(ch) && perms().write ? `<div class="mt-2"><button class="btn btn-ghost btn-sm" data-act="chg-withdraw" data-id="${esc(a.id)}">ถอนคำขอ</button></div>` : ''}</div>`;
}
async function bkMerge(a, into, how) {
  const fields = ['customer', 'model', 'grade', 'color', 'sales', 'booking_date', 'booking_no', 'receipt_no', 'deposit', 'discount', 'foc_total', 'purchase', 'note'];
  const ri = into.rec, ra = a.rec;
  const diff = fields.filter(k => String(ra[k] ?? '').trim() && String(ra[k] ?? '').trim() !== String(ri[k] ?? '').trim()).map(k => `${CHANGE_KEYS[k] || INSTANT_KEYS[k] || k} ใบที่ซ้ำ: ${fieldVal(k, ra[k])}`).join(' · ');
  const r = await saveBk(a.id, 'รวมกับใบจองเดิม (ลงซ้ำ)', `ใช้ใบจอง ${into.cust} จอง ${fmtD(into.date)} · ${how}`, x => {
    x.hidden = { ...actor(), why: `ลงซ้ำ รวมกับใบจอง ${into.id}` }; x.merged_into = into.id;
    if (x.change && x.change.type === 'merge' && x.change.status === 'pending') finishChange(x, 'approved', how);
  });
  if (!r) return false;
  await saveBk(into.id, 'รวมใบจองที่ลงซ้ำเข้ามา', `${a.cust} จอง ${fmtD(a.date)} (${a.sales || ''})${diff ? ' · ' + diff : ' · ข้อมูลตรงกัน'}`, x => {
    x.form_ids = [...new Set([...(x.form_ids || []), a.id])];
  });
  if (typeof releaseFor === 'function') await releaseFor(a, 'รวมใบจอง (ลงซ้ำ)');
  const drive = ra.sheet_drive_id || (a.id.startsWith('F_') ? a.id.slice(2) : null);
  if (drive) { const st = await gsMarkDupRow(drive); if (st === 'notfound' || st === 'error') toast(`ไม่ได้เขียน "คีย์ซ้ำ" ในชีต (${a.cust})`, 'bad'); }
  return true;
}
Object.assign(ACTIONS, {
  async 'merge-open'(el) {
    const D = derive(), a = D.at.find(x => x.id === el.dataset.id), into = D.at.find(x => x.id === el.dataset.into);
    if (!a || !into) { toast('ไม่พบใบจอง', 'bad'); return; }
    const txt = `ใบนี้: ${a.cust} · ${a.model} · จอง ${fmtD(a.date)} · ${a.sales}\nใช้ใบเดิม: ${into.cust} · ${into.model} · จอง ${fmtD(into.date)} · ${into.sales}`;
    if (canDecideBooking(a)) {
      if (!confirm(`รวมใบจองที่ลงซ้ำ (ไม่นับเป็นยกเลิก)?\n\n${txt}\n\nใบนี้จะถูกเอาออก ล็อกที่เปิดอยู่ของใบนี้ถูกปิด`)) return;
      if (await bkMerge(a, into, 'ผู้จัดการรวมเอง')) { S.modal = null; toast('รวมใบจองแล้ว ไม่นับเป็นการยกเลิก'); render(); }
      return;
    }
    if (!confirm(`ขอผู้จัดการรวมใบจองที่ลงซ้ำ?\n\n${txt}`)) return;
    const r = await saveBk(a.id, 'ขอรวมใบจอง (ลงซ้ำ)', `กับใบจอง ${into.cust} จอง ${fmtD(into.date)}`, x => {
      x.change = { id: rid(), type: 'merge', into: into.id, into_label: `${into.cust} ${into.model} จอง ${fmtD(into.date)} (${into.sales || ''})`, reason: 'ลงซ้ำ', status: 'pending', ...actor() };
    }, x => x.status !== 'cancelled' && pendingFree(x));
    if (r) { toast('ส่งคำขอรวมใบให้ผู้จัดการอนุมัติแล้ว'); render(); }
  },
  async 'merge-approve'(el) {
    const D = derive(), a = D.at.find(x => x.id === el.dataset.id); if (!a || !a.change || a.change.type !== 'merge' || !canDecideBooking(a)) return;
    const into = D.at.find(x => x.id === a.change.into); if (!into) { toast('ไม่พบใบจองที่จะรวมด้วย', 'bad'); return; }
    if (!confirm('อนุมัติรวมใบจอง (ใบนี้ถูกเอาออก ไม่นับเป็นยกเลิก)?')) return;
    if (await bkMerge(a, into, 'ผู้จัดการอนุมัติ')) { S.modal = null; toast('รวมใบจองแล้ว'); render(); }
  },
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
