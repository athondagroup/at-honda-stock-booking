// ------------------------------------------------------------------ AI could not read a delivery note: read the stored photo again (ขอ 13/10)
// Only function declarations here: the first render runs before this part of the file.
function recvCanRetry(r) { return !!(r && r.status === 'pending' && !r.ai_ok && r.img && perms().write && aiReady()); }
function recvRetryBtn(id, r, small) {
  if (!recvCanRetry(r)) return '';
  const busy = S.recvRetry && S.recvRetry[id];
  return `<button class="btn ${small ? 'btn-ghost btn-sm' : 'btn-dark btn-sm'}" data-act="recv-retry" data-id="${esc(id)}" ${busy ? 'disabled' : ''}>${busy ? '<span class="spin"></span> AI กำลังอ่าน…' : 'ลองให้ AI อ่านอีกครั้ง'}</button>`;
}
Object.assign(ACTIONS, {
  async 'recv-retry'(el) {
    const id = el.dataset.id, r0 = S.receipts.get(id);
    if (!recvCanRetry(r0) || (S.recvRetry && S.recvRetry[id])) return;
    S.recvRetry = { ...(S.recvRetry || {}), [id]: true }; render();
    let res = null, why = '';
    try {
      const resp = await fetch(imgSrc(r0.img)); if (!resp.ok) throw { code: 'img' };
      const blob = await resp.blob();
      res = await aiRead(RECEIVE_PROMPT(), [blob]);
      if (!res || typeof res !== 'object' || !Array.isArray(res.cars) || !res.cars.length) { res = null; why = 'AI ยังอ่านรถในใบนี้ไม่ได้ ลองถ่ายรูปใหม่ให้เห็นทั้งใบ หรือกรอกเอง'; }
    } catch (e) { why = e && e.code === 'img' ? 'เปิดรูปที่เก็บไว้ไม่ได้ ลองส่งรูปใหม่' : aiMsg(e); }
    S.recvRetry = { ...S.recvRetry, [id]: false };
    const cur = S.receipts.get(id); if (!cur || cur.status !== 'pending') { render(); return; }
    let doc;
    if (res) {
      const br = myBranch() || IDS.dealerBr(res.dealer_code || '') || cur.br || 'PSC';
      doc = { ...cur, br, doc_no: res.doc_no || cur.doc_no || '', doc_date: validDate(res.doc_date) || cur.doc_date, dealer_code: res.dealer_code || cur.dealer_code || '', ref_no: res.ref_no || cur.ref_no || '',
        transporter: res.transporter || cur.transporter || '', plate: res.truck_plate || cur.plate || '', sign_date: validDate(res.dealer_sign_date) || cur.sign_date || null,
        cars: res.cars.slice(0, 6).map(c => receiveCarFromAi(c, br)), unreadable: (Array.isArray(res.unreadable) ? res.unreadable : []).slice(0, 10).map(String), ai_ok: true, ai_msg: '', ai_retry: { ...actor() } };
    } else doc = { ...cur, ai_msg: why };
    if (await write('receipts', id, doc)) {
      if (S.modal && S.modal.kind === 'receive' && S.modal.id === id) S.modal.r = JSON.parse(JSON.stringify(doc));
      toast(res ? `อ่านแล้ว ${doc.cars.length} คัน ตรวจก่อนยืนยัน` : why, res ? 'good' : 'bad');
    }
    render();
  }
});

// ------------------------------------------------------------------ a received car takes over the locks of its Quota slot (ตกลง 13/10)
// Locks made on "Quota Ref" become locks of the VIN (the Ref stays on them). One car, one lock:
// first come first served — the lock approved first keeps the car and any other approved lock on it becomes the next in
// the queue (pending), with a note. Temporary locks follow the usual rule: a booking lock wins and the temp owner is alerted.
async function recvMoveLocks(vin, ref) {
  if (!vin) return { moved: 0, queued: 0 };
  let moved = 0, queued = 0;
  if (ref) for (const [id, l0] of S.locks) {
    if (l0.ref !== ref || l0.vin || !['pending', 'approved', 'allocated'].includes(l0.status)) continue;
    const l = await claimFresh('locks', id, x => x.ref === ref && !x.vin); if (!l) continue;
    l.vin = vin;
    if (await saveLock(id, l, 'ย้ายล็อกจาก Quota มาที่ VIN', `Quota ${ref} → ${vin} (รับรถเข้า)`)) moved++;
  }
  const live = [...S.locks.entries()].map(([id, l]) => ({ id, ...l }))
    .filter(l => (l.vin === vin || (ref && l.ref === ref)) && l.type !== 'temp' && ['approved', 'allocated'].includes(l.status))
    .sort((a, b) => (a.approved_at || a.requested_at || '').localeCompare(b.approved_at || b.requested_at || ''));
  for (const l of live.slice(1)) {
    const cur = await claimFresh('locks', l.id, x => ['approved', 'allocated'].includes(x.status)); if (!cur) continue;
    cur.status = 'pending'; delete cur.start; delete cur.end;
    if (await saveLock(l.id, cur, 'ล็อกซ้ำ ต่อคิว', `รถ ${vin} มีล็อกที่อนุมัติก่อนแล้ว (${live[0].sales || live[0].dealer_name || ''}) คำขอนี้เป็นคิวถัดไป`)) queued++;
  }
  return { moved, queued };
}

// ---- removing a receive record entered by mistake (ตกลง 14/10): only one not confirmed yet (pending or ไม่ผ่าน).
// Records are never erased (history is kept); the record is marked removed and no longer shows anywhere.
function recvCanDelete(m) {
  const r = S.receipts.get(m.id); if (!r || r.hidden || r.status === 'confirmed') return false;
  const p = perms(); if (!p.write) return false;
  return (p.confirmReceive && branchOk(r.br)) || (r.by && r.by === S.me.id);
}
Object.assign(ACTIONS, {
  async 'recv-del'(el) {
    const id = el.dataset.id, r = S.receipts.get(id); if (!r || !recvCanDelete({ id })) return;
    if (!confirm('ลบรายการรับรถนี้? (ลงผิด ไม่เก็บเข้าระบบ)')) return;
    if (await write('receipts', id, { ...r, hidden: true, removed: { ...actor(), at: new Date().toISOString(), prev_status: r.status || null } })) { S.modal = null; toast('ลบรายการรับรถแล้ว'); render(); }
  }
});
