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
// what IDS has for a booking, in words
function mergeIdsText(a) {
  const mm = a.match; if (!mm) return '';
  const dl = mm.recs.find(r => r.kind === 'dl'), bk = mm.recs.find(r => r.kind === 'booking'), st = mm.recs.find(r => r.kind === 'stock');
  return [dl ? `IDS DL ใบกำกับ ${dl.row && dl.row.inv ? dl.row.inv : ''}${dl.ddate ? ` ส่งมอบ ${fmtD(dl.ddate)}` : ''}` : '', bk ? `IDS ใบจอง ${bk.no || ''}` : '', !dl && !bk && st ? `IDS Stock ${st.vin || ''}` : ''].filter(Boolean).join(' · ');
}
// which of two bookings to keep: the one IDS knows (DL, then booking), then the one further along, then the earlier one
function mergeAdvice(x, y) {
  const score = a => (a.match ? (a.match.recs.some(r => r.kind === 'dl') ? 300 : a.match.recs.some(r => r.kind === 'booking') ? 200 : 100) : 0)
    + (a.rec.receipt_no ? 20 : 0) + Object.keys((a.rec.flow || {})).length;
  const sx = score(x), sy = score(y);
  const pick = sx !== sy ? (sx > sy ? x : y) : (String(x.date || '') <= String(y.date || '') ? x : y), other = pick === x ? y : x;
  const why = mergeIdsText(pick) && !mergeIdsText(other) ? `ตรงกับ ${mergeIdsText(pick)}`
    : pick.rec.receipt_no && !other.rec.receipt_no ? `มีเลขที่ใบเสร็จมัดจำ ${pick.rec.receipt_no}`
    : sx !== sy ? 'ทำขั้นตอนไปมากกว่า' : 'จองก่อน';
  return { id: pick.id, why };
}
function mergeModal(m, D) {
  const x = D.at.find(t => t.id === m.a), y = D.at.find(t => t.id === m.b);
  if (!x || !y) return `<p>ไม่พบใบจอง</p><button class="btn btn-ghost" data-act="close">ปิด</button>`;
  const adv = mergeAdvice(x, y), keep = m.keep || adv.id;
  const card = a => `<button class="pick text-left ${keep === a.id ? 'on' : ''}" data-act="merge-keep" data-id="${esc(a.id)}" aria-pressed="${keep === a.id}"><span class="flex-1 min-w-0">
      <span class="font-semibold">${esc(a.cust)}</span> · ${esc(a.model)} ${esc(gradeShort(a.model, a.grade) || a.grade || '')} ${esc(a.color || '')} · จอง ${fmtD(a.date)}
      ${adv.id === a.id ? `<span class="chip" style="background:var(--good-soft, var(--surface-2));color:var(--good)">แนะนำ · ${esc(adv.why)}</span>` : ''}
      <span class="block text-xs text-muted">เซลล์ ${esc(a.sales || '–')} · ${esc(a.br || '')}${a.rec.receipt_no ? ` · ใบเสร็จ ${esc(a.rec.receipt_no)}` : ''}${a.rec.discount ? ` · ส่วนลด ${money(a.rec.discount)}` : ''}${mergeIdsText(a) ? ` · ${esc(mergeIdsText(a))}` : ' · ยังไม่พบใน IDS'}${a.custForm ? ` · ฟอร์มสะกด "${esc(a.custForm)}"` : ''}</span>
      <span class="block text-xs mt-1">${keep === a.id ? '<b style="color:var(--good)">✓ ใช้ใบนี้เป็นหลัก</b>' : '<span style="color:var(--bad)">ใบนี้จะถูกเอาออก (ไม่นับยกเลิก)</span>'}</span></span></button>`;
  const drop = keep === x.id ? y : x;
  return `<div class="flex items-start justify-between gap-3 mb-2"><h2 class="font-head text-xl font-semibold">รวมใบจองที่ลงซ้ำ</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <p class="text-sm mb-3">เลือกใบที่ใช้เป็นหลัก อีกใบจะถูกเอาออก ไม่นับเป็นการยกเลิก ล็อกของใบที่เอาออกถูกปิด และแถวในชีตเขียนว่า "คีย์ซ้ำ" · ข้อมูลของใบที่เอาออกเก็บไว้ในประวัติของใบหลัก</p>
  <div class="flex flex-col gap-2">${card(x)}${card(y)}</div>
  <div class="flex flex-wrap justify-end gap-2 mt-4"><button class="btn btn-ghost" data-act="close">ยกเลิก</button>
    <button class="btn btn-red" data-act="merge-go">${canDecideBooking(drop) ? 'รวมใบจอง' : 'ส่งคำขอให้ผู้จัดการรวม'}</button></div>`;
}
Object.assign(ACTIONS, {
  'merge-open'(el) { S.modal = { kind: 'merge', a: el.dataset.id, b: el.dataset.into, keep: null }; render(); },
  'merge-keep'(el) { if (S.modal && S.modal.kind === 'merge') { S.modal.keep = el.dataset.id; render(); } },
  async 'merge-go'() {
    const m = S.modal; if (!m || m.kind !== 'merge') return;
    const D = derive(), x = D.at.find(t => t.id === m.a), y = D.at.find(t => t.id === m.b);
    if (!x || !y) { toast('ไม่พบใบจอง', 'bad'); return; }
    const keepId = m.keep || mergeAdvice(x, y).id, keep = keepId === x.id ? x : y, drop = keep === x ? y : x;
    if (canDecideBooking(drop)) {
      if (!confirm(`ใช้ใบของ ${keep.cust} (จอง ${fmtD(keep.date)}) เป็นหลัก และเอาใบของ ${drop.cust} (จอง ${fmtD(drop.date)}) ออก?\nไม่นับเป็นยกเลิก ล็อกของใบที่เอาออกถูกปิด`)) return;
      if (await bkMerge(drop, keep, 'ผู้จัดการรวมเอง')) { S.modal = null; toast('รวมใบจองแล้ว ไม่นับเป็นการยกเลิก'); render(); }
      return;
    }
    const r = await saveBk(drop.id, 'ขอรวมใบจอง (ลงซ้ำ)', `ใช้ใบ ${keep.cust} จอง ${fmtD(keep.date)} เป็นหลัก`, t => {
      t.change = { id: rid(), type: 'merge', into: keep.id, into_label: `${keep.cust} ${keep.model} จอง ${fmtD(keep.date)} (${keep.sales || ''})`, reason: 'ลงซ้ำ', status: 'pending', ...actor() };
    }, t => t.status !== 'cancelled' && pendingFree(t));
    if (r) { S.modal = null; toast('ส่งคำขอรวมใบให้ผู้จัดการอนุมัติแล้ว'); render(); }
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
