// ------------------------------------------------------------------ IDS bookings that change or disappear (ตกลง 19/10)
// 1. Same customer, new model / booking no.: "แก้ไขการจอง" changes the web booking to the IDS model and number and the
//    same row in the form's response sheet; "จองเพิ่ม" keeps it and adds a second booking (as before).
// 2. A Booking IDS upload lists the IDS bookings that are gone. One that had a web booking and no invoice is flagged;
//    the executive or branch manager says what happened, one by one or all at once:
//      ยกเลิก (the web booking is cancelled at once, its locks released, the sheet row marked ยกเลิก)
//      แก้ไขใบจอง (paired with a new IDS booking: the system suggests the ones with the same sales, branch and model
//        that have no web booking yet (A), or any of them can be picked by hand (B); the web booking takes the new
//        customer name, number and model)
//      อื่น ๆ (a note)
// Only function declarations here: the first render runs before this part of the file.
// ---- the sheet row of a booking (web: Edge Function; elsewhere nothing is sent)
function bkSheetSet(rec, f) {
  const set = {};
  if ('customer' in f) set[5] = f.customer || '';
  if ('model' in f) set[6] = GF_MODEL[f.model] || f.model || '';
  if ('grade' in f) set[7] = String(f.grade || '').replace(/^e:HEV\s+/i, '');
  if ('color' in f) set[8] = f.color || '';
  if (f.cancel) set[2] = 'ยกเลิก';
  if (f.uncancel) set[2] = '';
  return set;
}
async function bkSheetSync(id, rec, f) {
  if (!(window.__WEB && window.__WEB.sheetUpdate)) return 'skip';
  const set = bkSheetSet(rec, f); if (!Object.keys(set).length) return 'skip';
  const c = gsCfg(), driveId = (rec && rec.sheet_drive_id) || (id.startsWith('F_') ? id.slice(2) : ''), webId = driveId ? '' : id;
  const r = await window.__WEB.sheetUpdate({ sheetId: c.id, tab: (c.range || 'Booking!A2:U').split('!')[0], webId, driveId, set });
  return (r && r.sheet) || 'error';
}
function bkSheetMsg(st) { return st === 'ok' ? ' · แก้ในชีตแล้ว' : st === 'notfound' ? ' · ไม่พบแถวนี้ในชีต (ไม่ได้แก้ชีต)' : st === 'off' ? ' · ยังไม่ได้ตั้งค่าการแก้ชีต' : st === 'error' ? ' · แก้ชีตไม่สำเร็จ' : ''; }
// change a web booking to an IDS booking (model, number, and the customer name when it changed)
async function bkTakeIds(a, r, act, withName) {
  const f = { model: r.model || a.model, grade: r.grade || a.grade, color: r.color || a.color };
  if (withName && r.name) f.customer = r.name;
  const ch = [['customer', 'ลูกค้า'], ['model', 'รุ่น'], ['grade', 'เกรด'], ['color', 'สี']].filter(([k]) => k in f && f[k] !== a.rec[k]).map(([k, t]) => `${t} ${a.rec[k] || '–'} → ${f[k]}`);
  if (r.no && r.no !== a.rec.booking_no) ch.push(`เลขที่ใบจอง ${a.rec.booking_no || '–'} → ${r.no}`);
  const saved = await saveBk(a.id, act, ch.join(' · '), x => {
    Object.assign(x, f); if (r.no) x.booking_no = r.no;
    x.match_pick = { key: r.key, ...actor() }; x.match_skip = (x.match_skip || []).filter(k => k !== r.key);
  });
  if (!saved) return null;
  const st = await bkSheetSync(a.id, saved, f);
  return { ch, st };
}
// ---- case 1: the button in the match box
Object.assign(ACTIONS, {
  async 'match-edit'(el) {
    const a = atById(el.dataset.id); if (!a || !canEditBooking(a) || !a.match) return;
    const r = a.match.recs.find(x => x.key === el.dataset.key); if (!r) return;
    const res = await bkTakeIds(a, r, 'แก้ไขการจองตาม IDS', false);
    if (res) { toast(`แก้ไขการจองแล้ว${res.ch.length ? ': ' + res.ch.join(' · ') : ''}${bkSheetMsg(res.st)}`, res.st === 'error' ? 'bad' : 'good'); render(); }
  }
});
// ---- case 2: the IDS bookings gone since the last Booking upload of that branch
function bkOutDiff(r, D) {
  const prev = D.X.bookings.filter(b => b.br === r.br && !b.seed), now = new Set(r.rows.map(b => String(b.no)));
  const atBy = new Map(D.at.filter(a => a.ids).map(a => [a.ids.key, a]));
  return prev.filter(b => b.no && !now.has(String(b.no))).map(b => {
    const a = atBy.get('ids:' + b.no) || null, inv = (b.vin && D.invByVin.get(b.vin)) || D.X.inv.find(i => i.no && String(i.no) === String(b.no));
    let why, flag = false;
    if (inv && !inv.company) why = inv.ddate ? `ส่งมอบแล้ว ${fmtD(inv.ddate)}` : `ออกใบกำกับแล้ว ${fmtD(inv.idate)}`;
    else if (a && a.cancelled) why = 'ใบจองในเว็บยกเลิกแล้ว';
    else if (a && a.done) why = 'ส่งมอบแล้วตามข้อมูลในเว็บ';
    else if (a) { why = 'หายจาก IDS: ยกเลิก หรือเปลี่ยนใบจอง ต้องตรวจสอบ'; flag = true; }
    else why = 'ไม่มีใบจองในเว็บ';
    return { no: b.no, cust: b.cust, sales: b.sales, spec: specKey(b.model, b.grade, b.color), date: b.date, why, flag, atId: a ? a.id : null };
  });
}
// IDS bookings with no web booking yet, best guesses first: same sales, same branch, same model (grade and colour score more)
function bkCands(a, D, all) {
  const list = D.idsOnly.filter(b => b.br === a.br || all);
  const score = b => (salesCanon(b.sales || '') === a.sales ? 4 : 0) + (b.model === a.model ? 3 : 0) + (b.grade === a.grade ? 1 : 0) + (b.color === a.color ? 1 : 0) - (b.date && a.date ? Math.min(2, Math.abs(daysBetween(a.date, b.date)) / 30) : 0);
  const sorted = list.map(b => ({ b, s: score(b) })).sort((x, y) => y.s - x.s);
  return all ? sorted.map(x => x.b) : sorted.filter(x => x.s >= 7 && salesCanon(x.b.sales || '') === a.sales && x.b.model === a.model).slice(0, 3).map(x => x.b);
}
// the web booking has already been paired (same customer name) with another IDS booking that is in IDS now
function bkOutAuto(o) {
  const a = o && o.atId && typeof atById === 'function' ? atById(o.atId) : null;
  return a && !a.cancelled && a.ids && String(a.ids.no) !== String(o.no) ? a.ids : null;
}
// gone from the Booking file because the car was delivered (DL has that booking number, or the booking is delivered)
function bkOutDelivered(o) {
  if (!o) return null;
  const a = o.atId && typeof atById === 'function' ? atById(o.atId) : null;
  if (a && !a.cancelled && a.flow && a.flow.done && a.flow.done.delivered) return { date: a.flow.deliveredDate || (a.rec.flow && a.rec.flow.delivered && a.rec.flow.delivered.date) || null };
  const inv = o.no ? derive().X.inv.find(i => String(i.no || '') === String(o.no) && !i.company) : null;
  return inv ? { date: inv.ddate || inv.idate || null, inv: inv.inv } : null;
}
function bkOutPending(o) { return !!(o && o.flag && !o.res && !bkOutAuto(o) && !bkOutDelivered(o)); }
function bkOutList(u, D) {
  const can = canApproveBr(u.br) && perms().write, F = S.bkOut && S.bkOut.id === u.id ? S.bkOut : { sel: {}, pick: {} };
  const todo = (u.out || []).filter(bkOutPending);
  const row = (o, i) => {
    const a = o.atId ? atById(o.atId) : null, auto = o.flag && !o.res ? bkOutAuto(o) : null, open = bkOutPending(o) && a && !a.cancelled;
    const dv = o.flag && !o.res && !auto ? bkOutDelivered(o) : null;
    if (dv) return `<div class="py-2 border-t border-line flex flex-wrap gap-x-4 items-center"><span class="code">${esc(o.no)}</span><span>${esc(o.cust || '')}</span><span class="text-muted">${specLabel(o.spec)}</span><span style="color:var(--good)">ส่งมอบแล้ว${dv.date ? ' ' + fmtD(dv.date) : ''}${dv.inv ? ` (DL ใบกำกับ ${esc(dv.inv)})` : ''} · หายจากไฟล์ Booking เพราะส่งมอบ ไม่ต้องทำอะไร</span></div>`;
    if (auto) return `<div class="py-2 border-t border-line"><div class="flex flex-wrap gap-x-4 items-center"><span class="code">${esc(o.no)}</span><span>${esc(o.cust || '')}</span><span class="text-muted">${specLabel(o.spec)}</span><span class="text-muted">${esc(o.sales || '')}</span>
      <span style="color:var(--good)">ระบบจับคู่กับ IDS ใบใหม่แล้ว: ${esc(auto.no)} · ${esc(auto.cust || '')} · ${specLabel(auto.spec)}</span></div>
      <div class="text-xs text-muted mt-1">ใบจองในเว็บจับคู่กับใบใหม่นี้แล้ว (ส่วนใหญ่ IDS ออกเลขใบจองใหม่) ไม่ต้องยกเลิก <button class="underline" data-act="at-open" data-id="${esc(a.id)}">เปิด</button>
      ${can ? ` · <button class="underline" data-act="bkout-relink" data-id="${esc(u.id)}" data-i="${i}" data-key="${esc(auto.key)}">ยืนยัน (บันทึกเลขใหม่ในใบจองและชีต)</button>` : ''}</div></div>`;
    const head = `<div class="flex flex-wrap gap-x-4 items-center">${can && open ? `<input type="checkbox" class="w-4 h-4" data-bkout="${esc(u.id)}" data-i="${i}" ${F.sel[i] ? 'checked' : ''} aria-label="เลือกใบจอง ${esc(o.no)}">` : ''}
      <span class="code">${esc(o.no)}</span><span>${esc(o.cust || '')}</span><span class="text-muted">${specLabel(o.spec)}</span><span class="text-muted">${esc(o.sales || '')}</span>
      ${o.res ? `<span style="color:var(--good)">ทำแล้ว: ${esc(o.res.text)}</span><span class="text-xs text-muted">${fmtDT(o.res.at)} ${esc(o.res.role || '')}</span>` : `<span style="color:var(--${o.flag ? 'bad' : 'muted'})">${esc(o.why)}</span>`}</div>`;
    if (!open || !can) return `<div class="py-1">${head}</div>`;
    const sug = bkCands(a, D, false), all = bkCands(a, D, true), pick = F.pick[i] || '';
    const opt = b => `${b.no} · ${b.cust} · ${specLabelText(specKey(b.model, b.grade, b.color))} · ${b.sales || ''} · ${fmtD(b.date)}`;
    return `<div class="py-2 border-t border-line">${head}
      <div class="text-xs text-muted mt-1">ใบจองในเว็บ: ${esc(a.cust)} · ${esc(a.sales || '')} · จอง ${fmtD(a.date)} <button class="underline" data-act="at-open" data-id="${esc(a.id)}">เปิด</button></div>
      ${sug.length ? `<div class="mt-1 flex flex-wrap gap-2 items-center"><span class="text-xs">ระบบเดาว่าเปลี่ยนเป็น:</span>${sug.map(b => `<button class="btn btn-ghost btn-sm" data-act="bkout-relink" data-id="${esc(u.id)}" data-i="${i}" data-key="${esc(b.key)}" title="เปลี่ยนใบจองในเว็บให้เป็นใบนี้">${esc(b.no)} · ${esc(b.cust)} · ${esc(b.color || '')}</button>`).join('')}</div>` : '<div class="text-xs text-muted mt-1">ไม่พบใบ IDS ใหม่ที่เซลล์ สาขา และรุ่นเดียวกัน</div>'}
      <div class="mt-1 flex flex-wrap gap-2 items-end"><div class="field"><label class="text-xs" for="bko-${i}">หรือเลือกจับคู่เอง (ใบ IDS ที่ยังไม่มีฟอร์ม สาขา ${esc(a.br)})</label><select id="bko-${i}" data-bkoutpick="${esc(u.id)}" data-i="${i}"><option value="">–</option>${all.map(b => `<option value="${esc(b.key)}" ${pick === b.key ? 'selected' : ''}>${esc(opt(b))}</option>`).join('')}</select></div>
        <button class="btn btn-dark btn-sm" data-act="bkout-relink" data-id="${esc(u.id)}" data-i="${i}" data-key="${esc(pick)}" ${pick ? '' : 'disabled'}>แก้ไขใบจองเป็นใบนี้</button>
        <button class="btn btn-red btn-sm" data-act="bkout-cancel" data-id="${esc(u.id)}" data-i="${i}">ยกเลิกใบจอง</button></div></div>`;
  };
  const sel = todo.filter(o => F.sel[(u.out || []).indexOf(o)]).length;
  const bar = can && todo.length ? `<div class="p-3 rounded-lg mb-2" style="background:var(--warn-soft)">
      <div class="font-medium mb-1">ใบจองที่หายจาก IDS ${todo.length} ใบ · เลือกแล้ว ${sel}</div>
      <div class="flex flex-wrap gap-2 items-end"><button class="btn btn-ghost btn-sm" data-act="bkout-all" data-id="${esc(u.id)}" data-v="1">เลือกทั้งหมด</button><button class="btn btn-ghost btn-sm" data-act="bkout-all" data-id="${esc(u.id)}" data-v="">ไม่เลือกเลย</button>
        <div class="field"><label for="bko-note" class="text-xs">เหตุผล / หมายเหตุ</label><input id="bko-note" data-bkoutnote="${esc(u.id)}" value="${esc(F.note || '')}" placeholder="เช่น ลูกค้าไม่ซื้อแล้ว"></div>
        <button class="btn btn-red btn-sm" data-act="bkout-cancel-sel" data-id="${esc(u.id)}" ${sel && !F.busy ? '' : 'disabled'}>ยกเลิกที่เลือก (${sel})</button>
        <button class="btn btn-ghost btn-sm" data-act="bkout-other-sel" data-id="${esc(u.id)}" ${sel && !F.busy ? '' : 'disabled'}>อื่น ๆ (ใส่หมายเหตุ)</button></div>
      <p class="text-xs text-muted mt-1">ยกเลิก = ยกเลิกใบจองในเว็บทันที ปล่อยล็อก และใส่ "ยกเลิก" ในชีตคำตอบฟอร์ม · แก้ไขใบจอง = เปลี่ยนชื่อลูกค้า เลขที่ใบจอง และรุ่นตาม IDS ใบใหม่ (ทั้งเว็บและชีต)</p></div>` : '';
  return `<div class="mt-2 text-sm flex flex-col">${bar}${(u.out || []).map(row).join('')}</div>`;
}
function bkOutState(id) { if (!S.bkOut || S.bkOut.id !== id) S.bkOut = { id, sel: {}, pick: {}, note: '' }; return S.bkOut; }
async function bkOutMark(id, idxs, text) {
  const u = await claimFresh('uploads', id, () => true); if (!u) return false;
  const res = { text, ...actor() };
  u.out = (u.out || []).map((o, i) => idxs.includes(i) ? { ...o, res } : o);
  return write('uploads', id, u);
}
async function bkOutCancel(id, idxs) {
  const u0 = S.uploads.get(id); if (!u0 || !canApproveBr(u0.br)) return;
  const F = bkOutState(id), note = (F.note || '').trim() || 'ยกเลิกใน IDS';
  F.busy = true; render();
  let n = 0, sheetBad = 0; const done = [];
  try {
    for (const i of idxs) {
      const o = u0.out[i], a = o && o.atId ? atById(o.atId) : null; if (!a || a.cancelled || !bkOutPending(o)) continue;
      const r = await saveBk(a.id, 'ยกเลิกใบจอง (หายจาก IDS)', note, x => {
        x.status = 'cancelled'; x.cancelled_at = new Date().toISOString();
        x.cancel = { reason: 'ยกเลิกใน IDS', note, refund: null, ...actor() }; x.change = null;
      });
      if (!r) continue;
      await releaseFor(a, 'ใบจองยกเลิก (หายจาก IDS)');   // the sheet's ยกเลิก column is set by saveBk
      n++; done.push(i);
    }
    if (done.length) await bkOutMark(id, done, `ยกเลิกใบจองแล้ว · ${note}`);
  } finally { F.busy = false; }
  F.sel = {}; toast(`ยกเลิกแล้ว ${n} ใบ${sheetBad ? ` · แก้ชีตไม่ได้ ${sheetBad} ใบ` : ''}`, sheetBad ? 'bad' : 'good'); render();
}
Object.assign(ACTIONS, {
  'bkout-all'(el) { const F = bkOutState(el.dataset.id), u = S.uploads.get(el.dataset.id); F.sel = {}; if (el.dataset.v && u) (u.out || []).forEach((o, i) => { if (bkOutPending(o)) F.sel[i] = true; }); render(); },
  async 'bkout-cancel'(el) { const o = (S.uploads.get(el.dataset.id) || {}).out?.[Number(el.dataset.i)]; if (!o || !confirm(`ยกเลิกใบจอง ${o.cust || ''} (${o.no}) ในเว็บทันที?`)) return; await bkOutCancel(el.dataset.id, [Number(el.dataset.i)]); },
  async 'bkout-cancel-sel'(el) { const F = bkOutState(el.dataset.id), u = S.uploads.get(el.dataset.id), idxs = Object.keys(F.sel).filter(k => F.sel[k] && u && bkOutPending(u.out[Number(k)])).map(Number); if (!idxs.length || !confirm(`ยกเลิกใบจองที่เลือก ${idxs.length} ใบในเว็บทันที?`)) return; await bkOutCancel(el.dataset.id, idxs); },
  async 'bkout-other-sel'(el) {
    const F = bkOutState(el.dataset.id), u = S.uploads.get(el.dataset.id), idxs = Object.keys(F.sel).filter(k => F.sel[k] && u && bkOutPending(u.out[Number(k)])).map(Number), note = (F.note || '').trim();
    if (!idxs.length) return; if (!note) { toast('ใส่หมายเหตุก่อน', 'bad'); $('#bko-note')?.focus(); return; }
    if (await bkOutMark(el.dataset.id, idxs, `อื่น ๆ: ${note}`)) { F.sel = {}; toast(`บันทึกแล้ว ${idxs.length} ใบ`); render(); }
  },
  async 'bkout-relink'(el) {
    const u = S.uploads.get(el.dataset.id), i = Number(el.dataset.i), o = u && u.out[i], key = el.dataset.key; if (!o || !key || !canApproveBr(u.br)) return;
    const D = derive(), a = atById(o.atId), b = D.idsOnly.find(x => x.key === key) || D.idsB.find(x => x.key === key); if (!a || !b) { toast('ไม่พบใบจองนี้แล้ว', 'bad'); return; }
    if (!confirm(`เปลี่ยนใบจองในเว็บ ${a.cust} → ${b.cust} (IDS ${b.no} ${b.model} ${b.color || ''})?`)) return;
    const res = await bkTakeIds(a, { key: b.key, name: b.cust, model: b.model, grade: b.grade, color: b.color, no: b.no }, 'แก้ไขใบจองตาม IDS ใบใหม่', true);
    if (!res) return;
    await bkOutMark(el.dataset.id, [i], `แก้ไขเป็น IDS ${b.no} · ${b.cust}`);
    toast(`แก้ไขแล้ว${res.ch.length ? ': ' + res.ch.join(' · ') : ''}${bkSheetMsg(res.st)}`, res.st === 'error' ? 'bad' : 'good'); render();
  }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset) return;
  if (t.dataset.bkout) { const F = bkOutState(t.dataset.bkout); F.sel[Number(t.dataset.i)] = t.checked; render(); return; }
  if (t.dataset.bkoutpick) { const F = bkOutState(t.dataset.bkoutpick); F.pick[Number(t.dataset.i)] = t.value; render(); }
});
document.addEventListener('input', ev => { const t = ev.target; if (t && t.dataset && t.dataset.bkoutnote) bkOutState(t.dataset.bkoutnote).note = t.value; });
