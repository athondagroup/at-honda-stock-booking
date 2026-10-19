// ------------------------------------------------------------------ IDS bookings with no AT form: fix them here (ตกลง 19/10)
// One doc ids/bkfix keeps, per IDS booking number, what was changed in the web. It is applied on top of every
// Booking IDS upload, so the next upload does not undo it:
//   set     customer / sales / branch / model / grade / colour typed here (the IDS value is kept in idsOrig)
//   skip    "no AT form needed" with a reason (Make รถ Advanced, demo car, dealer, duplicate, other): off the to-do list
//   cancel  cancelled in the web at once (counts as cancelled, off the queue)
// "คืนค่าตาม IDS" removes the entry. Matching with an AT form already entered uses the existing pair box.
// Only function declarations here: the first render runs before this part of the file.
function idsFixDoc() { return S.ids.get('bkfix') || null; }
function idsFixMap() { const d = idsFixDoc(); return (d && d.fix) || {}; }
function idsFixSkipReasons() { return ['ลูกค้า Make รถ Advanced', 'รถ Demo', 'ขายให้ดีลเลอร์ / สาขาอื่น', 'ใบจองซ้ำ', 'อื่น ๆ']; }
function idsFixFields() { return [['cust', 'ชื่อลูกค้า'], ['sales', 'เซลล์'], ['br', 'สาขา'], ['model', 'รุ่น'], ['grade', 'เกรด'], ['color', 'สี']]; }
// an IDS booking row with the web changes on top (called from deriveNow)
function idsFixApply(b) {
  const fx = idsFixMap()[String(b.no)];
  if (!fx) return b;
  const out = { ...b, idsOrig: { cust: b.cust, sales: b.sales, br: b.br, model: b.model, grade: b.grade, color: b.color }, fix: fx };
  Object.entries(fx.set || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') out[k] = v; });
  if (fx.skip) out.skip = fx.skip;
  if (fx.cancel) { out.webCancel = fx.cancel; out.match = 'cancel'; }
  return out;
}
function idsFixCan(b) {
  if (!perms().write || !b) return false;
  return canAllocBr(b.br) || (b.idsOrig && canAllocBr(b.idsOrig.br)) || isMine(b.owner || b.sales);
}
function idsFixCanClose(b) { return !!b && perms().write && (canAllocBr(b.br) || (b.idsOrig && canAllocBr(b.idsOrig.br))); }
// a chip for the IDS cell of the booking list
function idsFixChip(b) {
  if (!b || !b.fix) return '';
  const f = b.fix, bits = [];
  if (f.cancel) bits.push(chip('ยกเลิกในเว็บ', 'muted'));
  else if (f.skip) bits.push(chip(`ไม่ต้องมีฟอร์ม: ${f.skip.reason}`, 'muted'));
  if (f.set && Object.keys(f.set).length) bits.push(chip('แก้ข้อมูลในเว็บ', 'neutral'));
  const note = (f.cancel && f.cancel.note) || (f.skip && f.skip.note) || '';
  return `<div class="flex flex-wrap gap-1 mt-1">${bits.join('')}</div>${note ? `<div class="text-xs text-muted">${esc(note)}</div>` : ''}`;
}
function idsFixOpen(no) {
  const D = derive(), b = D.idsB.find(x => String(x.no) === String(no)); if (!b) return;
  const o = b.idsOrig || b;
  S.modal = { kind: 'idsfix', no: String(b.no), mode: b.webCancel ? 'cancel' : b.skip ? 'skip' : 'edit',
    e: { cust: b.cust || '', sales: b.sales || '', br: b.br || '', model: b.model || '', grade: b.grade || '', color: b.color || '' },
    reason: (b.skip && b.skip.reason) || '', note: (b.webCancel && b.webCancel.note) || (b.skip && b.skip.note) || '', orig: { ...o } };
  render();
}
function idsFixModal(m, D) {
  const b = D.idsB.find(x => String(x.no) === m.no);
  if (!b) return `<p>ไม่พบใบจอง IDS ${esc(m.no)} แล้ว</p><div class="flex justify-end mt-3"><button class="btn btn-ghost" data-act="close">ปิด</button></div>`;
  const can = idsFixCan(b), canClose = idsFixCanClose(b), e = m.e, o = m.orig, dis = can ? '' : 'disabled';
  const models = Object.keys(CATALOG), grades = e.model ? Object.keys(CATALOG[e.model] || {}) : [], colors = e.model && e.grade ? (CATALOG[e.model] || {})[e.grade] || [] : [];
  const keep = (list, v) => [...new Set([v, ...list].filter(Boolean))];
  const ctl = k => k === 'sales' ? `<select id="ixf-${k}" data-modal="e.${k}" ${dis}>${opt(keep(salesNames(true), e.sales), e.sales, '–')}</select>`
    : k === 'br' ? `<select id="ixf-${k}" data-modal="e.${k}" ${canClose ? '' : 'disabled'}>${opt(BRS, e.br)}</select>`
    : k === 'model' ? `<select id="ixf-${k}" data-modal="e.${k}" ${dis}>${opt(keep(models, e.model), e.model, '–')}</select>`
    : k === 'grade' ? `<select id="ixf-${k}" data-modal="e.${k}" ${dis}>${opt(keep(grades, e.grade), e.grade, '–')}</select>`
    : k === 'color' ? `<select id="ixf-${k}" data-modal="e.${k}" ${dis}>${opt(keep(colors, e.color), e.color, '–')}</select>`
    : `<input id="ixf-${k}" data-modal="e.${k}" value="${esc(e[k] || '')}" ${dis}>`;
  const fld = ([k, t]) => `<div class="field"><label for="ixf-${k}">${t}${String(e[k] || '') !== String(o[k] || '') ? ' <span style="color:var(--warn)">●</span>' : ''}</label>${ctl(k)}
    <div class="text-xs text-muted">ใน IDS: ${esc(o[k] || '–')}</div></div>`;
  const tab = (k, t) => `<button class="btn btn-sm ${m.mode === k ? 'btn-dark' : 'btn-ghost'}" data-act="idsfix-mode" data-k="${k}">${t}</button>`;
  const log = ((b.fix && b.fix.log) || []).slice(-5).reverse();
  let body;
  if (m.mode === 'edit') body = `<div class="grid sm:grid-cols-3 gap-3">${idsFixFields().map(fld).join('')}</div>
    <p class="text-xs text-muted mt-2">● = ต่างจาก IDS · ข้อมูลที่แก้ตรงนี้ใช้ในเว็บเท่านั้น (ไม่ได้แก้ในระบบ IDS) และอัพโหลด IDS รอบหน้าจะไม่ทับ · ถ้าแก้ชื่อลูกค้าให้ตรงกับฟอร์มที่ลงไว้ ระบบจะจับคู่ให้เอง</p>
    <div class="flex flex-wrap justify-end gap-2 mt-3"><button class="btn btn-dark" data-act="idsfix-save" ${can ? '' : 'disabled'}>บันทึกการแก้ไข</button></div>`;
  else if (m.mode === 'skip') body = `<div class="grid sm:grid-cols-2 gap-3"><div class="field"><label for="ixf-r" class="req">เหตุผล</label><select id="ixf-r" data-modal="reason" ${canClose ? '' : 'disabled'}>${opt(idsFixSkipReasons(), m.reason, 'เลือกเหตุผล')}</select></div>
      <div class="field"><label for="ixf-n" ${m.reason === 'อื่น ๆ' ? 'class="req"' : ''}>หมายเหตุ</label><input id="ixf-n" data-modal="note" value="${esc(m.note || '')}" ${canClose ? '' : 'disabled'}></div></div>
    <p class="text-xs text-muted mt-2">ใบนี้ยังอยู่ในคิวตาม IDS แต่ไม่ขึ้นในรายการ "มีใน IDS แต่ไม่มีฟอร์ม AT" และไม่เตือนเซลล์อีก</p>
    <div class="flex flex-wrap justify-end gap-2 mt-3"><button class="btn btn-dark" data-act="idsfix-skip" ${canClose ? '' : 'disabled'}>บันทึก ไม่ต้องมีฟอร์ม</button></div>`;
  else body = `<div class="field"><label for="ixf-c" class="req">เหตุผลที่ยกเลิก</label><input id="ixf-c" data-modal="note" value="${esc(m.note || '')}" placeholder="เช่น ลูกค้าไม่ซื้อแล้ว" ${canClose ? '' : 'disabled'}></div>
    <p class="text-xs text-muted mt-2">ยกเลิกในเว็บทันที: ออกจากคิวและยอดจอง · อย่าลืมยกเลิกในระบบ IDS ด้วย</p>
    <div class="flex flex-wrap justify-end gap-2 mt-3"><button class="btn btn-red" data-act="idsfix-cancel" ${canClose ? '' : 'disabled'}>ยกเลิกใบจองนี้</button></div>`;
  return `<div class="flex items-start justify-between gap-3 mb-2"><div><h2 class="font-head text-xl font-semibold">แก้ไขใบจอง IDS</h2>
      <div class="text-xs text-muted"><span class="code">${esc(b.no)}</span> · จอง ${fmtD(b.date)} · ${esc(o.cust || '')} · ${esc(o.br || '')}</div></div><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
    ${can ? '' : '<p class="text-sm mb-2" style="color:var(--bad)">ดูได้อย่างเดียว: แก้ได้เฉพาะเซลล์เจ้าของ แอดมินสาขา และผู้จัดการ</p>'}
    <div class="flex flex-wrap gap-2 mb-3">${tab('edit', 'แก้ข้อมูล')}${tab('skip', 'ไม่ต้องมีฟอร์ม')}${tab('cancel', 'ยกเลิก')}
      ${D.idsOnly.includes(b) ? `<button class="btn btn-ghost btn-sm" data-act="idspair-open" data-id="${esc(b.key)}">จับคู่กับฟอร์มที่มี</button>` : ''}</div>
    ${!canClose && m.mode !== 'edit' ? '<p class="text-sm mb-2" style="color:var(--bad)">เฉพาะแอดมินสาขาและผู้จัดการ</p>' : ''}
    ${body}
    ${b.fix ? `<div class="mt-4 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2"><div class="text-xs text-muted">${log.map(x => `${fmtDT(x.at)} ${esc(x.role || '')} · ${esc(x.act)}${x.note ? ' · ' + esc(x.note) : ''}`).join('<br>')}</div>
      ${canClose || can ? `<button class="btn btn-ghost btn-sm" data-act="idsfix-reset">คืนค่าตาม IDS (ลบที่แก้ในเว็บทั้งหมด)</button>` : ''}</div>` : ''}`;
}
// write one booking's entry (null removes it)
async function idsFixWrite(no, fn, act, note) {
  let doc = idsFixDoc() ? await claimFresh('ids', 'bkfix', () => true) : { src: 'bkfix', fix: {} };
  if (!doc) return false;
  doc.fix = doc.fix || {};
  const cur = doc.fix[no] ? JSON.parse(JSON.stringify(doc.fix[no])) : { set: {}, log: [] };
  const next = fn(cur);
  if (next === null) delete doc.fix[no];
  else { next.log = [...(next.log || []), { act, note: note || '', ...actor() }].slice(-20); doc.fix[no] = next; }
  doc.src = 'bkfix'; Object.assign(doc, actor());
  return write('ids', 'bkfix', doc);
}
Object.assign(ACTIONS, {
  'idsfix-open'(el) { idsFixOpen(el.dataset.id); },
  'idsfix-mode'(el) { if (S.modal) { S.modal.mode = el.dataset.k; render(); } },
  async 'idsfix-save'() {
    const m = S.modal, D = derive(), b = D.idsB.find(x => String(x.no) === m.no); if (!b || !idsFixCan(b)) return;
    const o = m.orig, set = {}, ch = [];
    idsFixFields().forEach(([k, t]) => { const v = String(m.e[k] || '').trim(); if (k === 'br' && !idsFixCanClose(b)) return; if (v && v !== String(o[k] || '')) { set[k] = v; ch.push(`${t} ${o[k] || '–'} → ${v}`); } });
    if (set.model || set.grade || set.color) { set.model = set.model || m.e.model; set.grade = set.grade || m.e.grade; set.color = set.color || m.e.color; }
    if (!(await idsFixWrite(m.no, x => ({ ...x, set }), 'แก้ข้อมูล', ch.join(' · ') || 'ใช้ข้อมูลตาม IDS'))) return;
    S.modal = null; toast(ch.length ? `บันทึกแล้ว: ${ch.join(' · ')}` : 'บันทึกแล้ว (ข้อมูลตาม IDS)'); render();
  },
  async 'idsfix-skip'() {
    const m = S.modal, b = derive().idsB.find(x => String(x.no) === m.no); if (!b || !idsFixCanClose(b)) return;
    const note = (m.note || '').trim();
    if (!m.reason) { toast('เลือกเหตุผลก่อน', 'bad'); return; }
    if (m.reason === 'อื่น ๆ' && !note) { toast('ใส่หมายเหตุก่อน', 'bad'); $('#ixf-n')?.focus(); return; }
    if (!(await idsFixWrite(m.no, x => ({ ...x, skip: { reason: m.reason, note, ...actor() }, cancel: null }), 'ไม่ต้องมีฟอร์ม AT', `${m.reason}${note ? ' · ' + note : ''}`))) return;
    S.modal = null; toast(`บันทึกแล้ว: ${b.cust || b.no} ไม่ต้องมีฟอร์ม (${m.reason})`); render();
  },
  async 'idsfix-cancel'() {
    const m = S.modal, b = derive().idsB.find(x => String(x.no) === m.no); if (!b || !idsFixCanClose(b)) return;
    const note = (m.note || '').trim();
    if (!note) { toast('ใส่เหตุผลก่อน', 'bad'); $('#ixf-c')?.focus(); return; }
    if (!confirm(`ยกเลิกใบจอง IDS ${b.no} (${b.cust || ''}) ในเว็บทันที?`)) return;
    if (!(await idsFixWrite(m.no, x => ({ ...x, cancel: { note, ...actor() }, skip: null }), 'ยกเลิกในเว็บ', note))) return;
    S.modal = null; toast(`ยกเลิกแล้ว: ${b.cust || b.no} · อย่าลืมยกเลิกในระบบ IDS ด้วย`); render();
  },
  async 'idsfix-reset'() {
    const m = S.modal; if (!m || !confirm('ลบทุกอย่างที่แก้ในเว็บของใบนี้ แล้วกลับไปใช้ข้อมูลตาม IDS?')) return;
    if (!(await idsFixWrite(m.no, () => null))) return;
    S.modal = null; toast('คืนค่าตาม IDS แล้ว'); render();
  }
});
