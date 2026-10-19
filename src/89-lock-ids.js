// ------------------------------------------------------------------ locks on a car IDS has allocated (ตกลง 19/10)
// IDS gives the car (or quota slot) to a customer:
//  - the same customer name as the lock (booking customer, or the name on a temporary lock): the lock is done by
//    itself (deriveNow marks it; lockIdsSync writes it down after an upload and tells Telegram)
//  - another name: the lock waits in a list; the manager picks the booking it really is
//      the booking IDS gave the car to  → the same customer spelt differently: done
//      another booking / no booking      → the car went to someone else: the lock is closed, the sales is told
//      ถ้าเป็น advanced invoice          → keep the lock
// Only function declarations here: the first render runs before this part of the file.
function lockIdsCands(l, D) {
  const info = l.idsInfo || {}, out = [];
  const took = info.no ? D.bookingByKey.get('ids:' + info.no) : null;
  if (took) out.push({ key: took.key, label: `ใบจอง IDS ที่ได้รถคันนี้: ${info.no} · ${took.cust || info.cust || ''} · ${took.owner || took.sales || ''}`, took: true });
  else if (info.no || info.cust) out.push({ key: 'ids:' + (info.no || ''), label: `ใบจอง IDS ที่ได้รถคันนี้: ${info.no || ''} · ${info.cust || ''}`, took: true });
  const spec = l.spec || (D.cars.get(l.vin) || {}).spec || '', model = String(spec).split('|')[0];
  D.bookings.filter(b => b.state !== 'cancel' && b.key !== (took && took.key) && (b.owner === l.owner || (l.booking && b.key === l.booking.key)) && (!model || b.model === model))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 20)
    .forEach(b => out.push({ key: b.key, label: `${b.no || 'ยังไม่อยู่ใน IDS'} · ${b.cust || ''} · ${specLabelText(b.spec)} · ${b.owner || ''} · จอง ${fmtD(b.date)}` }));
  return out;
}
function lockIdsCust(l) { return l.booking ? l.booking.cust || '' : l.type === 'temp' ? l.prospect || '' : l.dealer_name || ''; }
function lockIdsBox(l, D) {
  const info = l.idsInfo || {}, br = l.car_br, can = perms().write && canApproveBr(br), pick = (S.lockIds || {})[l.id] || '';
  const cands = lockIdsCands(l, D);
  return `<div class="p-3 md:px-4" style="background:var(--warn-soft)">
    <div class="text-sm"><b>IDS จัดสรรรถคันนี้ให้ ${esc(info.cust || '–')}</b>${info.no ? ` (ใบจอง ${esc(info.no)})` : ''} · ล็อกนี้ทำไว้ให้ <b>${esc(lockIdsCust(l) || '–')}</b> · เซลล์ ${esc(l.owner || '–')} · ชื่อไม่ตรงกัน</div>
    ${can ? `<div class="mt-2 flex flex-wrap gap-2 items-end">
      <div class="field grow" style="min-width:260px"><label class="text-xs" for="lki-${esc(l.id)}">ใบจองที่ตรงกับล็อกนี้</label><select id="lki-${esc(l.id)}" data-lockids="${esc(l.id)}">
        <option value="">เลือกใบจอง</option>${cands.map(c => `<option value="${esc(c.key)}" ${pick === c.key ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>
      <button class="btn btn-dark btn-sm" data-act="lockids-pick" data-id="${esc(l.id)}" ${pick ? '' : 'disabled'}>ยืนยันใบจองนี้</button>
      <button class="btn btn-red btn-sm" data-act="lockids-close" data-id="${esc(l.id)}">ไม่มีใบจองที่ตรง ปิดล็อก</button>
      <button class="btn btn-ghost btn-sm" data-act="lockids-keep" data-id="${esc(l.id)}">คงล็อกไว้ (advanced invoice)</button></div>
      <p class="text-xs text-muted mt-1">เลือกใบจอง IDS ที่ได้รถ = ลูกค้าคนเดียวกัน (ชื่อสะกดต่าง) ล็อกสำเร็จ · เลือกใบจองอื่น หรือกดปิดล็อก = คนอื่นได้รถไป ปิดล็อกและแจ้งเซลล์ทาง Telegram</p>`
      : '<p class="text-xs text-muted mt-1">รอผู้จัดการสาขาของรถเลือกใบจองที่ตรง</p>'}</div>`;
}
function lockIdsList(D, vis) {
  const ask = vis.filter(l => l.idsAsk && ['pending', 'approved', 'allocated'].includes(l.status));
  if (!ask.length) return '';
  return `<h2 class="font-head text-lg font-semibold mb-1" style="color:var(--bad)">IDS จัดสรรรถที่มีล็อกให้ลูกค้าชื่ออื่น เลือกใบจองที่ตรง <span class="text-base">${ask.length}</span></h2>
    <p class="text-sm text-muted mb-2">ล็อกที่ชื่อลูกค้าตรงกับที่ IDS จัดสรร ระบบปิดให้เองแล้ว (สำเร็จ)</p>
    <div class="bg-surface border border-line rounded-lg divide-y divide-line mb-5">${ask.map(l => `<div>${lockRow(l, D)}${lockIdsBox(l, D)}</div>`).join('')}</div>`;
}
// Telegram: one short message to the manager and sales groups (nothing when not set up)
async function lockIdsTg(lines, to) {
  if (!lines.length || !(window.__WEB && window.__WEB.tgText)) return null;
  return window.__WEB.tgText({ text: lines.join('\n'), to: to || ['mgr', 'sales'] });
}
function lockIdsLine(l, info) {
  return `${l.vin || 'Quota ' + (l.ref || '')} ${specLabelText(l.spec || (derive().cars.get(l.vin) || {}).spec || '')} · ${l.type === 'temp' ? 'ล็อกชั่วคราว' : 'ล็อก'}ของ ${l.owner || '–'} ให้ ${lockIdsCust(l) || '–'} · IDS จัดสรรให้ ${info.cust || '–'}${info.no ? ' (ใบจอง ' + info.no + ')' : ''}`;
}
// after an upload: write down the locks closed by name, and tell Telegram once about each lock IDS gave to another name
async function lockIdsSync() {
  const D = derive(), res = { done: 0, ask: 0 }, doneL = [], askL = [];
  for (const l of D.locks) {
    if (!['pending', 'approved', 'allocated'].includes(l.status)) continue;
    // IDS gave the car to this lock's own booking, or to the same customer name: the lock is done
    if (l.idsTook && l.idsTook.same && !(l.type === 'dealer' && l.idsTook.st === 'delivered')) {
      const info = l.idsTook;
      const x = await claimFresh('locks', l.id, r => ['pending', 'approved', 'allocated'].includes(r.status)); if (!x) continue;
      x.status = 'done'; x.done_at = new Date().toISOString();
      x.ids_done = { no: info.no || null, cust: info.cust || null, by_name: !!info.byName, at: x.done_at };
      if (info.no && !x.bkref) x.ids_bk = 'ids:' + info.no;
      if (await saveLock(l.id, x, info.byName ? 'สำเร็จ: IDS จัดสรรให้ลูกค้าคนนี้แล้ว (ชื่อตรง)' : 'สำเร็จ: IDS จัดสรรคันนี้ให้ใบจองนี้แล้ว', `${info.cust || ''}${info.no ? ' · ใบจอง ' + info.no : ''}`)) { res.done++; doneL.push('✅ ' + lockIdsLine(l, info)); }
    } else if (l.idsAsk && l.idsInfo && l.ids_tg !== (l.idsInfo.no || l.idsInfo.cust)) {
      const x = await claimFresh('locks', l.id, () => true); if (!x) continue;
      x.ids_tg = l.idsInfo.no || l.idsInfo.cust;
      if (await write('locks', l.id, x)) { res.ask++; askL.push('⚠️ ' + lockIdsLine(l, l.idsInfo)); }
    }
  }
  const lines = [...(doneL.length ? ['ล็อกสำเร็จ IDS จัดสรรให้ลูกค้าคนเดียวกัน', ...doneL] : []), ...(askL.length ? [(doneL.length ? '\n' : '') + 'IDS จัดสรรรถที่มีล็อกให้ลูกค้าชื่ออื่น รอผู้จัดการเลือกใบจองที่ตรงในเว็บ', ...askL] : [])];
  await lockIdsTg(lines);
  return res;
}
async function lockIdsClose(id, why, extra) {
  const l = derive().locks.find(x => x.id === id); if (!l || !canApproveBr(l.car_br)) return;
  const info = l.idsInfo || {};
  const x = await claimFresh('locks', id, r => ['pending', 'approved', 'allocated'].includes(r.status)); if (!x) return;
  markUndo(x, 'ปิดล็อก (IDS จัดสรรให้คนอื่น)', x.status);
  x.status = x.status === 'pending' ? 'rejected' : 'released';
  x.ids_closed = { no: info.no || null, cust: info.cust || null, ...(extra || {}), ...actor() };
  if (extra && extra.bk) x.bkref = x.bkref || extra.bk;
  if (!await saveLock(id, x, 'ปิดล็อก: IDS จัดสรรให้คนอื่น', why)) return;
  const st = await lockIdsTg([`🔓 ปิดล็อก ${lockIdsLine(l, info)}`, why ? `หมายเหตุ: ${why}` : ''].filter(Boolean));
  delete (S.lockIds || {})[id];
  toast(`ปิดล็อกแล้ว${st && (st.sales === 'ok' || st.mgr === 'ok') ? ' · แจ้ง Telegram แล้ว' : ''}`); render();
}
Object.assign(ACTIONS, {
  async 'lockids-pick'(el) {
    const id = el.dataset.id, key = (S.lockIds || {})[id], D = derive(), l = D.locks.find(x => x.id === id);
    if (!l || !key || !canApproveBr(l.car_br)) return;
    const c = lockIdsCands(l, D).find(x => x.key === key); if (!c) return;
    if (!c.took) {
      const b = D.bookingByKey.get(key);
      if (!confirm(`ล็อกนี้เป็นของใบจอง ${b ? b.cust : key} ซึ่งไม่ได้รถคันนี้ ปิดล็อกและแจ้งเซลล์?`)) return;
      await lockIdsClose(id, `ล็อกนี้เป็นของใบจอง ${b ? (b.no || '') + ' ' + (b.cust || '') : key}`, { bk: key }); return;
    }
    const info = l.idsInfo || {};
    const x = await claimFresh('locks', id, r => ['pending', 'approved', 'allocated'].includes(r.status)); if (!x) return;
    x.status = 'done'; x.done_at = new Date().toISOString();
    x.ids_done = { no: info.no || null, cust: info.cust || null, by_name: false, at: x.done_at, ...actor() };
    if (!x.bkref && key.startsWith('ids:') && key.length > 4) x.ids_bk = key;
    if (!await saveLock(id, x, 'สำเร็จ: IDS จัดสรรให้ลูกค้าคนนี้แล้ว (ผู้จัดการยืนยัน ชื่อสะกดต่าง)', `${info.cust || ''}${info.no ? ' · ใบจอง ' + info.no : ''}`)) return;
    await lockIdsTg([`✅ ล็อกสำเร็จ (ผู้จัดการยืนยันว่าเป็นลูกค้าคนเดียวกัน) ${lockIdsLine(l, info)}`]);
    delete S.lockIds[id]; toast('บันทึกแล้ว ล็อกสำเร็จ'); render();
  },
  async 'lockids-close'(el) { if (confirm('ปิดล็อกนี้ เพราะ IDS จัดสรรรถให้คนอื่นแล้ว และแจ้งเซลล์ทาง Telegram?')) await lockIdsClose(el.dataset.id, 'ไม่มีใบจองที่ตรง'); },
  async 'lockids-keep'(el) {
    const id = el.dataset.id, l = derive().locks.find(x => x.id === id); if (!l || !canApproveBr(l.car_br)) return;
    const x = await claimFresh('locks', id, () => true); if (!x) return;
    x.ids_keep = { no: (l.idsInfo || {}).no || null, ...actor() };
    if (await saveLock(id, x, 'คงล็อกไว้ (IDS จัดสรรเป็น advanced invoice)', (l.idsInfo || {}).cust || '')) { toast('คงล็อกไว้แล้ว'); render(); }
  }
});
document.addEventListener('change', ev => { const t = ev.target; if (t && t.dataset && t.dataset.lockids) { (S.lockIds ||= {})[t.dataset.lockids] = t.value; render(); } });
