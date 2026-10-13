// ------------------------------------------------------------------ production date and car swap actions
const prodDateOk = (d, cap) => {
  if (!validDate(d)) return 'ใส่วันที่ผลิต (วัน/เดือน/ปี)';
  if (d < PROD_MIN) return 'วันที่ผลิตเก่าเกินไป ตรวจปี ค.ศ. อีกครั้ง';
  if (d > todayISO()) return 'วันที่ผลิตต้องไม่เกินวันนี้';
  if (cap && d > cap) return `วันที่ผลิตต้องไม่หลังวันที่รถเข้าศูนย์ (${fmtD(cap)})`;
  return null;
};
async function readProdLabel(i) {
  const slot = prodSlot(i), pic = slot.pic;
  if (!pic || !pic.blob || !aiReady()) return;
  slot.ai = { state: 'running' }; render();
  let res;
  try { res = await aiRead(PROD_PROMPT, [pic.blob]); if (!res || typeof res !== 'object') throw { code: 'invalid_json' }; }
  catch (e) { slot.ai = { state: 'error', msg: aiMsg(e) }; render(); return; }
  if (!S.modal) return;
  const isCar = !(i === '' || i === undefined || i === null);
  const car = isCar ? S.modal.r && S.modal.r.cars[Number(i)] : null;
  const vin = String(isCar ? (car && car.vin) || '' : S.modal.vin || '').toUpperCase();
  const rv = String(res.vin || '').toUpperCase().replace(/\s/g, '');
  const vinNote = rv && VIN_RE.test(rv) && vin && rv !== vin ? ` · เลขตัวถังบนป้าย ${rv} ไม่ตรงกับคันนี้ ตรวจว่าถ่ายป้ายถูกคัน` : '';
  const d = validDate(res.date), mo = /^\d{4}-\d{2}$/.test(res.month || '') ? res.month : null, printed = res.text ? ` (บนป้าย: ${res.text})` : '';
  slot.read = { date: d, month: mo, text: res.text || null, vin: rv || null };
  if (d && d >= PROD_MIN && d <= todayISO()) {
    if (isCar) car.prod = d; else S.modal.date = d;
    slot.ai = { state: 'done', tone: vinNote ? 'warn' : 'good', msg: `AI อ่านได้ ${fmtD(d)}${printed} ตรวจกับรูปอีกครั้ง${vinNote}` };
  } else if (mo) slot.ai = { state: 'done', tone: 'warn', msg: `ป้ายระบุแค่เดือน/ปี ${fmtM(mo)}${printed} ใส่วันที่เอง${vinNote}` };
  else slot.ai = { state: 'error', msg: `AI อ่านวันผลิตจากรูปนี้ไม่ได้ ใส่วันที่เอง${vinNote}` };
  render();
}

Object.assign(ACTIONS, {
  'prod-open'(el) { S.modal = { kind: 'prod', vin: el.dataset.vin }; render(); },
  'prod-ai'(el) { readProdLabel(el.dataset.i); },
  async 'prod-save'() {
    const m = S.modal, D = derive(), c = D.cars.get(m.vin);
    if (!c || !canProd(c)) { toast('ใส่วันผลิตได้เฉพาะแอดมินหรือผู้จัดการสาขาของรถ', 'bad'); return; }
    if (c.prodIds) { toast('IDS มีวันผลิตแล้ว ระบบใช้ค่าจาก IDS', 'bad'); return; }
    const d = m.date ?? c.prodKey ?? '';
    const err = prodDateOk(d, c.consign);
    if (err) { toast(err, 'bad'); $('#pd-date')?.focus(); return; }
    let img = (c.prodInfo && c.prodInfo.img) || null;
    if (m.pic && m.pic.blob) { const id = await storeImage(m.pic.blob); if (id) img = id; }
    const cur = S.vehicles.get(m.vin) || { added: null, removed: null, branch: null };
    const doc = { ...cur, prod_info: { date: d, img, read: m.read || null, ...actor() } };
    if (await write('vehicles', m.vin, doc)) { S.modal = null; toast(`บันทึกวันผลิต ${fmtD(d)} แล้ว อายุรถนับจากวันผลิต`); render(); }
  },
  noprod(el) { S.filters.noProd = el.dataset.on === '1' ? true : !S.filters.noProd; if (S.filters.noProd) { S.view = 'stock'; S.sub.stock = 'list'; S.modal = null; setHash(); } render(); },

  // ---- เปลี่ยนคัน
  'swap-open'(el) { S.modal = { kind: 'swap', lockId: el.dataset.lock || null, atId: el.dataset.id || null, to: null, reason: '', note: '' }; render(); },
  'swap-pick'(el) { S.modal.to = el.dataset.vin; render(); },
  async 'swap-submit'() {
    const m = S.modal, D = derive(), x = swapCtx(D, m);
    if (!canSwap(x)) { toast('เปลี่ยนคันได้เฉพาะผู้จัดการสาขาของใบจองหรือของรถ ก่อนส่งมอบ', 'bad'); return; }
    const to = m.to ? D.cars.get(m.to) : null;
    if (!to) { toast('เลือกรถคันใหม่', 'bad'); return; }
    if (to.spec !== x.spec) { toast('เปลี่ยนได้เฉพาะรถสเปกเดียวกัน ถ้าลูกค้าเปลี่ยนรุ่น เกรด หรือสี ให้แก้ไขใบจองก่อน', 'bad'); return; }
    if (!['free', 'temp'].includes(to.status)) { toast('รถคันนี้ไม่ว่างแล้ว', 'bad'); return; }
    const note = (m.note || '').trim();
    if (!m.reason) { toast('เลือกเหตุผลที่เปลี่ยนคัน', 'bad'); $('#sw-reason')?.focus(); return; }
    if (m.reason === 'อื่น ๆ' && !note) { toast('เขียนรายละเอียดเมื่อเลือก "อื่น ๆ"', 'bad'); $('#sw-note')?.focus(); return; }
    const why = [m.reason, note].filter(Boolean).join(': ');
    const sw = { from_vin: x.fromVin, to_vin: to.vin, from_br: x.fromBr || null, to_br: to.br, bk_br: x.bkBr || null, reason: m.reason, note: note || null,
      was: x.lock ? x.lock.status : 'assigned', rk: S.role.role, ...actor() };
    // 1. the old lock is released (first action wins if two people press at once)
    let old = null;
    if (x.lock) {
      old = await claimFresh('locks', x.lock.id, l => ['approved', 'allocated'].includes(l.status) && l.vin === x.fromVin);
      if (!old) return;
      old.status = 'released'; old.swapped_to = to.vin;
      if (!await saveLock(x.lock.id, old, 'ปล่อยล็อก (เปลี่ยนคัน)', `เปลี่ยนเป็น ${to.vin} · ${why}`)) return;
    }
    // 2. the new car is locked for the same booking straight away, keeping the old lock's dates
    const id = newId('locks'), now = sw.at;
    const l = {
      vin: to.vin, ref: null, car_br: to.br, spec: to.spec, type: 'booking',
      bkref: old ? old.bkref : x.a.key, bk_br: x.bkBr || null, sales: old ? old.sales || null : x.a.sales || null, prospect: null, dealer_name: null,
      reason: old ? old.reason || LOCK_REASONS[0] : LOCK_REASONS[0], note: `เปลี่ยนคันจาก ${x.fromVin}: ${why}`, warnings: [],
      status: 'approved', requested_at: now, requested_by: S.me.id || null, requested_role: roleLabel(), approved_at: now,
      start: (old && old.start) || todayISO(), end: (old && old.end) || addDays(todayISO(), LOCK_DAYS_BY.booking), ext: old ? old.ext || 0 : 0, fin_ext: old ? old.fin_ext || 0 : 0,
      ext_rejected: old ? old.ext_rejected || null : null, history: [], convert_from: null, swap: sw, swapped_from_lock: x.lock ? x.lock.id : null
    };
    if (!await saveLock(id, l, 'เปลี่ยนคัน (ผู้จัดการ)', `จาก ${x.fromVin} (${x.fromBr || '?'}) · ${why}`)) return;
    await settleUnit(derive(), l, id);
    // a booking holds one car: any other request or lock it still has on another car is closed
    if (x.a) for (const o of liveLocksOf(x.a)) {
      if (o.id === id || o.type !== 'booking') continue;
      const cur = findLock(o.id); if (!cur) continue;
      const pend = cur.status === 'pending';
      cur.status = pend ? 'withdrawn' : 'released';
      await saveLock(o.id, cur, pend ? 'ถอนคำขอ (เปลี่ยนคัน)' : 'ปล่อยล็อก (เปลี่ยนคัน)', `ใบจองนี้เปลี่ยนเป็น ${to.vin}`);
    }
    // 3. the booking keeps the record, and the car assigned in the delivery step follows
    if (x.a) await saveBk(x.a.id, 'เปลี่ยนคัน', `${x.fromVin} → ${to.vin} · ${why}`, r => {
      r.swaps = [...(r.swaps || []), sw].slice(-10);
      if (r.flow && r.flow.assign && r.flow.assign.vin === x.fromVin) r.flow = { ...r.flow, assign: { ...r.flow.assign, vin: to.vin, swapped_from: x.fromVin, swap_at: now } };
    });
    S.modal = x.a ? { kind: 'at', id: x.a.id } : null;
    const tell = mgrRoleOf(to.br) !== S.role.role ? ` แจ้ง${MGR_NAME[to.br]}แล้ว` : '';
    toast(`เปลี่ยนเป็น ${to.vin} (${to.br}) แล้ว${tell} แอดมินจัดสรรคันใหม่ใน IDS`);
    render();
  }
});

// label photos: the production-date window (data-prodfile="") or one car of a delivery note (data-prodfile="<index>")
document.addEventListener('change', async ev => {
  const t = ev.target;
  if (!t.dataset || t.dataset.prodfile === undefined || !S.modal) return;
  const f = (t.files || [])[0]; t.value = '';
  if (!f) return;
  const i = t.dataset.prodfile, slot = prodSlot(i);
  if (slot.pic) { try { URL.revokeObjectURL(slot.pic.url); } catch (e) { /* ignore */ } }
  let blob;
  try { blob = await shrink(f); } catch (e) { toast(e.message || 'เปิดรูปนี้ไม่ได้', 'bad'); return; }
  slot.pic = { blob, url: URL.createObjectURL(blob) }; slot.ai = null;
  render();
  if (aiReady()) readProdLabel(i);
});
