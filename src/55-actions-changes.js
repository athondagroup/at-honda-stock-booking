// ------------------------------------------------------------------ booking actions: confirmations, edit / cancel requests, refund
// Every decision re-reads the booking first (claimFresh): when two people press at once, the first one counts
// and the second sees who already did it.
async function saveBk(id, act, note, fn, ok = () => true) {
  const r = await claimFresh('bookings', id, ok);
  if (!r) return null;
  const wasCx = r.status === 'cancelled';
  if (fn(r) === false) return null;
  r.log = [...(r.log || []), { ...actor(), act, note: note || '' }].slice(-40);
  if (!(await write('bookings', id, r))) return null;
  // a booking cancelled (or put back) anywhere in the web: column ยกเลิก of the form's response sheet follows (ตกลง 19/10)
  const isCx = r.status === 'cancelled';
  if (wasCx !== isCx && typeof bkSheetSync === 'function') bkSheetSync(id, r, isCx ? { cancel: true } : { uncancel: true }).then(st => {
    if (st === 'error' || st === 'off') toast(`ยกเลิกในเว็บแล้ว แต่แก้ชีตไม่สำเร็จ (${r.customer || id})`, 'bad');
    else if (st === 'notfound') toast(`ไม่พบแถวของ ${r.customer || id} ในชีต จึงไม่ได้ใส่ "ยกเลิก"`, 'bad');
  });
  return r;
}
const liveLocksOf = a => derive().locks.filter(x => x.live && (x.bkref === a.key || (a.row && x.bkref === a.row.key)));
async function releaseFor(a, note) {
  for (const l of liveLocksOf(a)) { const cur = findLock(l.id); if (!cur) continue; cur.status = 'released'; await saveLock(l.id, cur, 'ปล่อยล็อก', note); }
}
async function retagLocks(a, sales) {
  for (const l of liveLocksOf(a)) { const cur = findLock(l.id); if (!cur || cur.sales === sales) continue; cur.sales = sales; await saveLock(l.id, cur, 'เปลี่ยนเจ้าของเคส', sales); }
}
const pendingFree = x => !(x.change && x.change.status === 'pending');
function finishChange(r, status, note) {
  r.changes = [...(r.changes || []), { ...r.change, status, decided: { ...actor(), note: note || '' } }].slice(-20);
  r.change = null;
}
// apply approved key fields. A new model, grade or colour gives up its car; the manager decides the queue:
// a new place from today, or the old place with a reason (q = { queue: 'new'|'keep', keep_reason, keep_note })
function applyFields(r, fields, q) {
  const specChanged = SPEC_KEYS.some(k => k in fields && fields[k] !== r[k]);
  Object.assign(r, fields);
  if ('purchase' in fields) {
    if (r.purchase === 'ซื้อสด') { r.finance = null; r.fin_status = null; }
    else if (!r.fin_status) r.fin_status = 'รอผล';
  }
  if ('receipt_no' in fields && r.flow) r.flow = { ...r.flow };
  if (specChanged) {
    if (q && q.queue === 'keep') r.queue_keep = { reason: q.keep_reason, note: (q.keep_note || '').trim() || null, ...actor() };
    else { r.queue_date = todayISO(); r.queue_keep = null; }
    if (r.flow && r.flow.assign) r.flow = { ...r.flow, assign: null };
  }
  return specChanged;
}
// the queue choice is required when the spec changes: keeping the old place needs a reason
function queueCheck(q) {
  q = q || {};
  if (q.queue !== 'keep') return null;
  if (!q.keep_reason) return 'เลือกเหตุผลที่ให้ใช้คิวเดิม';
  if (q.keep_reason === 'อื่น ๆ' && !(q.keep_note || '').trim()) return 'เขียนรายละเอียดเมื่อเลือก "อื่น ๆ"';
  return null;
}
const queueText = q => q && q.queue === 'keep' ? ` · ใช้คิวเดิม: ${q.keep_reason}${q.keep_note ? ' ' + q.keep_note : ''}` : ' · ต่อคิวใหม่';
async function afterApply(a, fields, specChanged) {
  if (specChanged) await releaseFor(a, 'เปลี่ยนรุ่น/เกรด/สี');
  if (fields.sales && fields.sales !== a.sales) await retagLocks(a, fields.sales);
}
const EDIT_FIELDS = [...Object.keys(CHANGE_KEYS), ...Object.keys(INSTANT_KEYS)];
const cleanVal = (k, v) => {
  if (k === 'discount' || k === 'foc_total' || k === 'deposit') return num(v);
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};
const same = (x, y) => String(x ?? '') === String(y ?? '');

Object.assign(ACTIONS, {
  // ---- owner of the case when IDS was keyed under another sales ID
  async 'owner-yes'(el) {
    const a = atById(el.dataset.id); if (!a || !canOwnerConfirm(a)) return;
    const ids = a.idsSales;
    const r = await saveBk(a.id, 'ยืนยันเจ้าของเคส', `IDS คีย์ด้วย ${ids}`, x => { x.owner_confirm = { ids_name: ids, result: 'mine', sales: x.sales, ...actor() }; x.owner_dispute = null; },
      x => !(x.owner_confirm && sameName(x.owner_confirm.ids_name, ids)));
    if (r) toast(`ยืนยันแล้ว เคสนี้เป็นของ ${a.sales} จะไม่เตือนอีก`);
  },
  'owner-no-open'() { S.modal.owner_no = true; render(); },
  'owner-no-cancel'() { S.modal.owner_no = false; render(); },
  async 'owner-no'(el) {
    const a = atById(el.dataset.id); if (!a || !canOwnerConfirm(a)) return;
    const ids = a.idsSales, note = (S.modal.owner_note || '').trim();
    const r = await saveBk(a.id, 'แจ้งว่าไม่ใช่เคสของตัวเอง', note, x => { x.owner_dispute = { ids_name: ids, note, ...actor() }; },
      x => !(x.owner_confirm && sameName(x.owner_confirm.ids_name, ids)));
    if (r) { S.modal.owner_no = false; toast('ส่งให้ผู้จัดการเลือกเจ้าของเคสแล้ว'); render(); }
  },
  async 'owner-set'(el) {
    const a = atById(el.dataset.id); if (!a || !canApproveBr(a.br)) return;
    const pick = S.modal.owner_pick || a.sales, ids = a.idsSales, from = a.sales;
    const r = await saveBk(a.id, pick === from ? 'ยืนยันเจ้าของเคส (ผู้จัดการ)' : 'เปลี่ยนเจ้าของเคส (ผู้จัดการ)', pick === from ? pick : `${from} → ${pick}`, x => {
      x.sales = pick;
      x.owner_confirm = { ids_name: ids, result: pick === from ? 'mine' : 'reassigned', from, sales: pick, ...actor() };
      x.owner_dispute = null;
    }, x => x.sales === from);
    if (!r) return;
    if (pick !== from) await retagLocks(a, pick);
    S.modal.owner_pick = null; toast(pick === from ? `ยืนยันเจ้าของเคสเป็น ${pick} แล้ว` : `เปลี่ยนเจ้าของเคสเป็น ${pick} แล้ว`); render();
  },

  // ---- pairing an AT booking with IDS when the name matches but other details do not
  async 'match-yes'(el) {
    const a = atById(el.dataset.id), key = el.dataset.key; if (!a || !canEditBooking(a)) return;
    const r = await saveBk(a.id, 'ยืนยันจับคู่กับ IDS', key, x => { x.match_pick = { key, ...actor() }; x.match_skip = (x.match_skip || []).filter(k => k !== key); });
    if (r) toast('ยืนยันแล้ว ใช้รุ่น เกรด สี ตาม IDS คิวเดิม');
  },
  async 'match-no'(el) {
    const a = atById(el.dataset.id), key = el.dataset.key; if (!a || !canEditBooking(a)) return;
    // "not this customer" drops every IDS record of that other deal (booking, stock, DL)
    const keys = a.match && a.match.recs.some(x => x.key === key) ? a.match.recs.map(x => x.key) : [key];
    const r = await saveBk(a.id, 'ไม่ใช่ใบเดียวกับ IDS', keys.join(', '), x => {
      x.match_skip = [...new Set([...(x.match_skip || []), ...keys])];
      if (x.match_pick && keys.includes(x.match_pick.key)) x.match_pick = null;
    });
    if (r) toast('บันทึกแล้ว ระบบจะไม่จับคู่กับรายการนี้อีก');
  },
  async 'match-more'(el) {
    const a = atById(el.dataset.id), key = el.dataset.key, no = el.dataset.no; if (!a || !canEditBooking(a)) return;
    const keys = a.match ? a.match.recs.map(x => x.key) : [key];
    const r = await saveBk(a.id, 'ลูกค้าจองเพิ่มอีกคัน', no ? `IDS ${no}` : '', x => { x.match_skip = [...new Set([...(x.match_skip || []), ...keys])]; });
    if (!r) return;
    if (no) {
      ACTIONS['ids-claim']({ dataset: { id: no } });
      Object.assign(S.draft.booking, { multi_reason: 'ซื้อเพิ่มอีกคัน (จอง 2 คัน)', multi_note: `คันที่ 2 ของ ${a.cust}` });
      render();
    }
  },
  async 'match-second'(el) {
    const a = atById(el.dataset.id), key = el.dataset.key, other = el.dataset.other; if (!a || !canEditBooking(a)) return;
    const r = await saveBk(a.id, 'ไม่ซ้ำ เป็นคันที่ 2', '', x => {
      x.match_skip = [...new Set([...(x.match_skip || []), key])];
      x.multi = { reason: 'ซื้อเพิ่มอีกคัน (จอง 2 คัน)', note: 'คันที่ 2 ยังไม่ลง IDS', with: [other], ...actor() };
    });
    if (r) toast('บันทึกว่าเป็นคันที่ 2 แล้ว เซลล์คีย์ใบจองนี้ลง IDS ต่อ');
  },

  // ---- edit
  'edit-open'(el) {
    const a = atById(el.dataset.id); if (!a || !canEditBooking(a)) return;
    const e = {}; EDIT_FIELDS.forEach(k => { e[k] = a.rec[k] ?? ''; });
    if (!S.modal || S.modal.id !== a.id) S.modal = { kind: 'at', id: a.id };
    S.modal.edit = e; S.modal.edit_reason = ''; render();
  },
  'edit-back'() { S.modal.edit = null; render(); },
  async 'edit-save'(el) {
    const a = atById(el.dataset.id), m = S.modal; if (!a || !m.edit || !canEditBooking(a)) return;
    const e = m.edit, direct = canApproveBr(a.br), locked = specLocked(a);
    if (!String(e.customer || '').trim()) { toast('ใส่ชื่อลูกค้า', 'bad'); return; }
    if (!locked && (!e.model || !e.grade || !e.color)) { toast('เลือกรุ่น เกรด และสีให้ครบ', 'bad'); return; }
    if (!e.sales) { toast('เลือกเซลล์เจ้าของเคส', 'bad'); return; }
    if (e.source === 'อื่น ๆ') { const x = String(e.source_x || '').trim(); if (!x) { toast('พิมพ์แหล่งที่มาอื่น', 'bad'); return; } e.source = `อื่น ๆ: ${x}`; }
    if (e.booking_no && !/^\d{8,12}$/.test(String(e.booking_no).trim())) { toast('เลขที่ใบจองต้องเป็นตัวเลข 8–12 หลัก', 'bad'); return; }
    if (canAdminEdit(a)) {
      if (!validDate(e.booking_date) || e.booking_date > todayISO()) { toast('วันที่จองต้องไม่เกินวันนี้', 'bad'); return; }
      if (e.deposit !== '' && e.deposit !== null && !(num(e.deposit) >= 0)) { toast('ยอดมัดจำต้องเป็นตัวเลข', 'bad'); return; }
    }
    const planBase = canAdminEdit(a) ? e.booking_date : a.date;
    if (e.delivery_plan && planBase && e.delivery_plan < planBase) { toast('วันนัดรับรถต้องไม่ก่อนวันจอง', 'bad'); return; }
    const keyF = {}, keyOld = {}, inst = {};
    editKeyDiff(e, a).forEach(k => { keyF[k] = cleanVal(k, e[k]); keyOld[k] = a.rec[k] ?? null; });
    if (keyF.purchase === 'ซื้อสด') delete keyF.finance;
    Object.keys(INSTANT_KEYS).forEach(k => { const v = cleanVal(k, e[k]); if (!same(v, a.rec[k])) inst[k] = v; });
    const nKey = Object.keys(keyF).length, nInst = Object.keys(inst).length;
    if (!nKey && !nInst) { toast('ยังไม่ได้แก้อะไร'); return; }
    const reason = (m.edit_reason || '').trim();
    if (!direct && nKey && !reason) { toast('ใส่เหตุผลที่ขอแก้', 'bad'); $('#ed-reason')?.focus(); return; }
    const specEdit = SPEC_KEYS.some(k => k in keyF), q = m.eq || {};
    if (direct && specEdit) { const bad = queueCheck(q); if (bad) { toast(bad, 'bad'); return; } }
    let spec = false;
    const log = changeText({ fields: { ...keyF, ...inst }, old: { ...keyOld, ...Object.fromEntries(Object.keys(inst).map(k => [k, a.rec[k] ?? null])) } }) + (direct && specEdit ? queueText(q) : '');
    const r = await saveBk(a.id, direct ? 'แก้ไขใบจอง (ผู้จัดการ)' : nKey ? 'ขอแก้ไขใบจอง' : 'แก้ไขใบจอง', log, x => {
      Object.assign(x, inst);
      if (!nKey) return;
      if (direct) spec = applyFields(x, keyF, q);
      else x.change = { id: rid(), type: 'edit', fields: keyF, old: keyOld, reason, status: 'pending', ...actor() };
    }, pendingFree);
    if (!r) return;
    if (direct && nKey) await afterApply(a, keyF, spec);
    S.modal.edit = null; S.modal.eq = null;
    toast(direct || !nKey ? 'บันทึกการแก้ไขแล้ว' : nInst ? `บันทึกช่องทั่วไปแล้ว ช่องสำคัญส่งให้${MGR_NAME[a.br] || 'ผู้จัดการ'}อนุมัติ` : `ส่งคำขอแก้ไขให้${MGR_NAME[a.br] || 'ผู้จัดการ'}อนุมัติแล้ว`);
    render();
  },

  // ---- cancel
  'cancel-open'(el) {
    const a = atById(el.dataset.id); if (!a || !canEditBooking(a) || a.cancelled) return;
    if (a.change) { toast('มีคำขอที่รออนุมัติอยู่ ให้ผู้จัดการตัดสินก่อน', 'bad'); return; }
    if (!S.modal || S.modal.id !== a.id) S.modal = { kind: 'at', id: a.id };
    const reason = el.dataset.reason || CANCEL_REASONS[0];
    S.modal.cancel = { reason, note: '', refund: /ซ้ำ|เปลี่ยนรุ่น/.test(reason) ? 'transfer' : 'refund', amount: a.deposit || '' }; render();
  },
  'cancel-close'() { S.modal.cancel = null; render(); },
  async 'cancel-submit'(el) {
    const a = atById(el.dataset.id), c = S.modal.cancel; if (!a || !c || !canEditBooking(a)) return;
    const note = (c.note || '').trim(), direct = canApproveBr(a.br);
    if ((c.reason === 'อื่น ๆ' || direct) && !note) { toast(direct ? 'ใส่เหตุผลที่อนุมัติยกเลิก' : 'เขียนรายละเอียดเมื่อเลือก "อื่น ๆ"', 'bad'); $('#cn-n')?.focus(); return; }
    if (direct) {
      const refund = c.refund || 'refund', amount = refund === 'refund' ? num(c.amount) : 0;
      if (refund === 'refund' && !(amount > 0)) { toast('ใส่ยอดเงินที่คืน', 'bad'); return; }
      const trBad = refund === 'transfer' ? trCheck(c, a) : null; if (trBad) { toast(trBad, 'bad'); return; }
      const tr = refund === 'transfer' ? trRecord(c, a) : null;
      const r = await saveBk(a.id, 'ยกเลิกใบจอง (ผู้จัดการ)', `${c.reason} · ${note}${tr ? ` · โอนมัดจำ ${money(tr.amount)}${tr.to ? '' : ' (ค้างไว้)'}` : ''}`, x => {
        x.status = 'cancelled'; x.cancelled_at = new Date().toISOString();
        x.cancel = { reason: c.reason, req_note: null, req: null, note, refund, amount: tr ? tr.amount : amount, ...(tr ? { transfer: tr, to: tr.to } : {}), ...actor() };
      }, x => x.status !== 'cancelled' && pendingFree(x));
      if (!r) return;
      if (tr && tr.to) await trLinkTo({ ...a, rec: r }, tr.to);
      await releaseFor(a, 'ยกเลิกใบจอง');
      S.modal.cancel = null; toast(refund === 'refund' ? 'ยกเลิกแล้ว ทำใบขออนุมัติคืนเงินจองได้จากใบจองนี้' : 'ยกเลิกใบจองแล้ว'); render();
      return;
    }
    const r = await saveBk(a.id, 'ขอยกเลิกใบจอง', `${c.reason}${note ? ' · ' + note : ''}`, x => {
      x.change = { id: rid(), type: 'cancel', reason: c.reason, note, refund: /ซ้ำ|เปลี่ยนรุ่น/.test(c.reason) ? 'transfer' : 'refund', status: 'pending', ...actor() };
    }, x => x.status !== 'cancelled' && pendingFree(x));
    if (r) { S.modal.cancel = null; toast('ส่งคำขอยกเลิกให้ผู้จัดการอนุมัติแล้ว'); render(); }
  },
  // replaced by a request that a manager approves
  'booking-cancel'(el) { ACTIONS['cancel-open'](el); },

  // ---- manager decides a request
  async 'chg-approve'(el) {
    const a = atById(el.dataset.id); if (!a || !a.change || !canDecideBooking(a)) return;
    const ch = a.change, cx = S.modal.cx || {}, note = (cx.note || '').trim(), stillThere = x => x.change && x.change.id === ch.id && x.change.status === 'pending';
    if (ch.type === 'cancel') {
      const refund = cx.refund || ch.refund || 'refund', amount = refund === 'refund' ? num(cx.amount ?? a.deposit) : 0;
      if (!note) { toast('ใส่เหตุผลที่อนุมัติยกเลิก', 'bad'); $('#cx-nt')?.focus(); return; }
      if (refund === 'refund' && !(amount > 0)) { toast('ใส่ยอดเงินที่คืน', 'bad'); return; }
      const cxt = { ...cx, tto: cx.tto ?? ch.to ?? '' };
      const trBad = refund === 'transfer' ? trCheck(cxt, a) : null; if (trBad) { toast(trBad, 'bad'); return; }
      const tr = refund === 'transfer' ? trRecord(cxt, a) : null;
      const r = await saveBk(a.id, 'อนุมัติยกเลิกใบจอง', `${REFUND[refund]}${refund === 'refund' ? ' ' + money(amount) : tr ? ` ${money(tr.amount)}${tr.to ? '' : ' (ค้างไว้)'}` : ''} · ${note}`, x => {
        x.status = 'cancelled'; x.cancelled_at = new Date().toISOString();
        x.cancel = { reason: x.change.reason, req_note: x.change.note || null, req: { by: x.change.by, role: x.change.role, at: x.change.at }, note, refund, amount: tr ? tr.amount : amount, ...(tr ? { transfer: tr, to: tr.to } : {}), ...actor() };
        finishChange(x, 'approved', note);
      }, stillThere);
      if (!r) return;
      if (tr && tr.to) await trLinkTo({ ...a, rec: r }, tr.to);
      await releaseFor(a, 'ยกเลิกใบจอง');
      S.modal.cx = null; toast(refund === 'refund' ? 'อนุมัติยกเลิกแล้ว ปุ่มใบขออนุมัติคืนเงินจองอยู่ในใบจองนี้' : 'อนุมัติยกเลิกแล้ว'); render();
      return;
    }
    const specEdit = SPEC_KEYS.some(k => k in ch.fields);
    if (specEdit) { const bad = queueCheck(cx); if (bad) { toast(bad, 'bad'); return; } }
    let spec = false;
    const r = await saveBk(a.id, 'อนุมัติแก้ไขใบจอง', changeText(ch) + (specEdit ? queueText(cx) : '') + (note ? ' · ' + note : ''), x => { spec = applyFields(x, x.change.fields, cx); finishChange(x, 'approved', note); }, stillThere);
    if (!r) return;
    await afterApply(a, ch.fields, spec);
    S.modal.cx = null; toast(spec ? (cx.queue === 'keep' ? 'อนุมัติแล้ว ใช้คิวเดิม' : 'อนุมัติแล้ว ใบจองต่อคิวใหม่ของสเปกใหม่') : 'อนุมัติการแก้ไขแล้ว'); render();
  },
  async 'chg-reject'(el) {
    const a = atById(el.dataset.id); if (!a || !a.change || !canDecideBooking(a)) return;
    const ch = a.change, note = ((S.modal.cx || {}).note || '').trim();
    if (!note) { toast('ใส่เหตุผลที่ไม่อนุมัติ (เซลล์จะเห็น)', 'bad'); $('#cx-nt')?.focus(); return; }
    const r = await saveBk(a.id, ch.type === 'cancel' ? 'ไม่อนุมัติยกเลิก' : 'ไม่อนุมัติแก้ไข', note, x => finishChange(x, 'rejected', note), x => x.change && x.change.id === ch.id && x.change.status === 'pending');
    if (r) { S.modal.cx = null; toast('บันทึกว่าไม่อนุมัติแล้ว'); render(); }
  },
  async 'chg-withdraw'(el) {
    const a = atById(el.dataset.id); if (!a || !a.change || !isRequester(a.change)) return;
    const ch = a.change;
    const r = await saveBk(a.id, 'ถอนคำขอ', ch.type === 'cancel' ? 'ยกเลิก' : 'แก้ไข', x => finishChange(x, 'withdrawn', ''), x => x.change && x.change.id === ch.id && x.change.status === 'pending');
    if (r) toast('ถอนคำขอแล้ว');
  },

  // ---- refund form for accounting
  'refund-open'(el) {
    const a = atById(el.dataset.id); if (!a || !a.cancelled || !canEditBooking(a)) return;
    const rf = a.rec.refund || {};
    S.files.passbook.forEach(x => { try { URL.revokeObjectURL(x.url); } catch (e) { /* ignore */ } });
    S.files.passbook = []; S.ai.refund = null;
    if (!S.modal || S.modal.id !== a.id) S.modal = { kind: 'at', id: a.id };
    S.modal.refund = { bank: rf.bank || '', bank_other: rf.bank_other || '', account_no: rf.account_no || '', account_name: rf.account_name || a.cust || '', img: rf.img || null };
    render();
  },
  'refund-back'() { S.modal.refund = null; render(); },
  async 'ai-passbook'() {
    const f = S.files.passbook[0], m = S.modal; if (!f || !m || !m.refund) return;
    S.ai.refund = { state: 'running' }; render();
    try {
      const res = await aiRead(REFUND_PROMPT, [f.blob]);
      if (!res || typeof res !== 'object') throw { code: 'invalid_json' };
      const bank = String(res.bank || '');
      const hit = THAI_BANKS.find(b => { const [th, code] = b.replace(')', '').split(' ('); return (code && bank.toUpperCase().includes(code.toUpperCase())) || (th && bank.includes(th)); });
      if (S.modal && S.modal.refund) {
        if (hit) S.modal.refund.bank = hit; else if (bank) { S.modal.refund.bank = 'อื่น ๆ'; S.modal.refund.bank_other = bank; }
        if (res.account_no) S.modal.refund.account_no = String(res.account_no);
        if (res.account_name) S.modal.refund.account_name = String(res.account_name);
      }
      S.ai.refund = { state: 'done' };
    } catch (e) { S.ai.refund = { state: 'error', msg: aiMsg(e) }; }
    render();
  },
  async 'refund-save'(el) {
    const a = atById(el.dataset.id), f = S.modal.refund; if (!a || !f || !canEditBooking(a)) return;
    const bank = f.bank, acct = String(f.account_no || '').trim(), name = String(f.account_name || '').trim();
    if (!bank || (bank === 'อื่น ๆ' && !String(f.bank_other || '').trim())) { toast('เลือกธนาคาร', 'bad'); return; }
    const digits = acct.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) { toast('เลขที่บัญชีต้องเป็นตัวเลข 10–15 หลัก', 'bad'); $('#rf-no')?.focus(); return; }
    if (!name) { toast('ใส่ชื่อบัญชี', 'bad'); return; }
    if (!nameOk(name, a.cust)) { toast(`ชื่อบัญชีต้องตรงกับชื่อผู้จอง (${a.cust})`, 'bad'); $('#rf-nm')?.focus(); return; }
    let img = f.img;
    if (S.files.passbook[0]) { img = await storeImage(S.files.passbook[0].blob); if (!img) { toast('เก็บรูปหน้าสมุดบัญชีไม่สำเร็จ ลองอีกครั้ง', 'bad'); return; } }
    if (!img) { toast('แนบรูปหน้าสมุดบัญชี', 'bad'); return; }
    const r = await saveBk(a.id, 'ทำใบขออนุมัติคืนเงินจอง', `${bank === 'อื่น ๆ' ? f.bank_other : bank} ${acct}`, x => {
      x.refund = { bank, bank_other: bank === 'อื่น ๆ' ? String(f.bank_other).trim() : null, account_no: acct, account_name: name, img, ...actor() };
    }, x => x.status === 'cancelled');
    if (!r) return;
    S.modal.refund = null; S.files.passbook = []; render();
    toast('บันทึกแล้ว เปิดใบขออนุมัติให้บันทึกเป็น PDF หรือรูป');
    const fresh = atById(a.id); if (fresh) printRefund(fresh);
  },
  'refund-print'(el) { const a = atById(el.dataset.id); if (a) printRefund(a); }
});
