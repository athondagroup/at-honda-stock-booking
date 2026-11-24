// ------------------------------------------------------------------ a Quota lock follows its car into Stock (24/11)
// A lock made on a quota slot (Ref, no frame number) moves to the car once the Ref → VIN link is sure: the car's Ref in the IDS
// stock file / receive record, or the quota row holding this frame number — exactly one car. The lock itself moves (VIN set on the
// same record): same id, booking, owner, approval state, end date and history; a waiting request still waits. Then the stock row is
// written (and the quota row gets "VIN text", cellPlan). When it is not sure — the Ref points at two cars, the car already holds
// another live lock, two live locks on the one slot, or a request the old rule put back in the queue ("ล็อกซ้ำ ต่อคิว") — nothing
// moves: the branch managers get "ตรวจ: Quota X → รถ Y" and pick from the notice. Runs in managers' sessions (ltSweep) and on receive.
// Only function declarations here: the first render runs before this part of the file.
var QT_HARD = ['approved', 'allocated'];
function qtCandVins(ref, D) {
  const vs = new Set();
  for (const c of D.cars.values()) if (c.ref === ref && c.vin && !c.quota) vs.add(c.vin);
  for (const q of D.quota) if (q.ref === ref && q.vin) vs.add(q.vin);
  return [...vs];
}
function qtHard(l) { return QT_HARD.includes(l.status) && l.live !== false; }
// what to do with one lock still on a Ref: { move: vin } · { review } · null (nothing yet)
function qtDecide(l, D) {
  if (l.vin || !l.ref || !['pending', 'approved', 'allocated'].includes(l.status) || l.live === false && l.status !== 'pending') return null;
  const vins = qtCandVins(l.ref, D); if (!vins.length) return null;
  const sameSlot = D.locks.filter(x => x.id !== l.id && !x.vin && x.ref === l.ref && qtHard(x));
  if (vins.length > 1) return { review: { kind: 'multi', ref: l.ref, ids: [l.id], vins } };
  const v = vins[0];
  const onCar = D.locks.filter(x => x.id !== l.id && x.vin === v && (qtHard(x) || x.status === 'pending'));
  if (qtHard(l) && (onCar.some(qtHard) || sameSlot.length)) return { review: { kind: 'conflict', ref: l.ref, vins: [v], ids: [l.id, ...onCar.filter(qtHard).map(x => x.id), ...sameSlot.map(x => x.id)] } };
  return { move: v };
}
// a request the old receive rule put back in the queue (it lost its approval to another lock on the car): the manager picks (24/11)
function qtQueued(D) {
  const out = [];
  for (const l of D.locks) {
    if (l.status !== 'pending' || !l.vin) continue;
    const h = (l.history || []).slice(-1)[0]; if (!h || h.act !== 'ล็อกซ้ำ ต่อคิว') continue;
    const keep = D.locks.find(x => x.id !== l.id && x.vin === l.vin && qtHard(x));
    out.push({ kind: 'queued', ref: l.ref || null, vins: [l.vin], ids: [keep ? keep.id : null, l.id].filter(Boolean) });
  }
  return out;
}
// every case to check, one per slot/car (derive: notices; ltSweep: what to leave alone)
function qtReviews(D) {
  const m = new Map();
  for (const l of D.locks) { const d = qtDecide(l, D); if (d && d.review) { const k = 'Q:' + d.review.ref + ':' + d.review.vins.join(','); const r = m.get(k); if (r) r.ids = [...new Set([...r.ids, ...d.review.ids])]; else m.set(k, { key: k, ...d.review }); } }
  for (const r of qtQueued(D)) m.set('V:' + r.vins[0], { key: 'V:' + r.vins[0], ...r });
  return [...m.values()];
}
async function qtMove(id, vin, why) {
  const D = derive(), car = D.cars.get(vin);
  const l = await claimFresh('locks', id, x => !x.vin && ['pending', 'approved', 'allocated'].includes(x.status)); if (!l) return false;
  const ref = l.ref; l.vin = vin; if (car && car.br) l.car_br = car.br;
  if (!await saveLock(id, l, 'ย้ายล็อกจาก Quota มาที่ VIN', `Quota ${ref} → ${vin}${why ? ' · ' + why : ''}`)) return false;
  // the stock row now holds the lock (stock first; the quota row gets "VIN text"); the preview only works out the plan
  if (QT_HARD.includes(l.status)) ltSheet(id, ltTextOf({ ...l, id }), '', false, true);
  return true;
}
// managers' sessions: move every sure case once per opening
let qtTried = new Set();
function qtSweep(D) {
  for (const l of D.locks) {
    if (qtTried.has(l.id)) continue;
    const d = qtDecide(l, D); if (!d || !d.move) continue;
    qtTried.add(l.id); qtMove(l.id, d.move, 'รถเข้า Stock');
  }
}
// ---- the manager's pick, from the notice
function qtModal(m, D) {
  const r = qtReviews(D).find(x => x.key === m.key);
  if (!r) return `<h2 class="text-lg font-semibold mb-2">ตรวจ Quota → รถ</h2><p class="text-sm text-muted">รายการนี้ไม่ต้องตรวจแล้ว</p><div class="mt-4"><button class="btn btn-ghost" data-act="close">ปิด</button></div>`;
  const ls = r.ids.map(id => D.locks.find(x => x.id === id)).filter(Boolean);
  const who = l => `${esc(ltTextOf(l) || l.prospect || l.dealer_name || '')} <span class="text-xs text-muted">${({ pending: 'รออนุมัติ', approved: 'ล็อกแล้ว', allocated: 'จัดสรรแล้ว' })[l.status] || esc(l.status)}${l.end ? ' · หมด ' + fmtD(l.end) : ''} · ${l.vin ? esc(l.vin) : 'Quota ' + esc(l.ref)}</span>`;
  const head = r.kind === 'multi' ? `Quota <b>${esc(r.ref)}</b> ชี้ไปที่รถ ${r.vins.length} คัน เลือกคันที่ใช่` : r.kind === 'queued' ? `รถ <b>${esc(r.vins[0])}</b> มีล็อก 2 รายการ (กติกาเดิมเลื่อนรายการหนึ่งไปต่อคิว) เลือกรายการที่เก็บไว้`
    : `รถ <b>${esc(r.vins[0])}</b> (Quota ${esc(r.ref)}) มีล็อกมากกว่า 1 รายการ เลือกรายการที่เก็บไว้ รายการอื่นจะถูกปล่อย`;
  const rows = r.kind === 'multi'
    ? r.vins.map(v => { const c = D.cars.get(v); return `<div class="pick"><span class="flex-1 min-w-0"><span class="code font-medium">${esc(v)}</span> <span class="text-xs text-muted">${c ? esc(c.br + ' · ' + specLabelText(c.spec)) : ''}</span></span><button class="btn btn-red btn-sm" data-act="qtf-car" data-key="${esc(r.key)}" data-vin="${esc(v)}">ใช้คันนี้</button></div>`; }).join('')
    : ls.map(l => `<div class="pick"><span class="flex-1 min-w-0">${who(l)}</span><button class="btn btn-red btn-sm" data-act="qtf-keep" data-key="${esc(r.key)}" data-id="${esc(l.id)}">เก็บรายการนี้</button></div>`).join('');
  return `<h2 class="text-lg font-semibold mb-1">ตรวจ: Quota → รถ</h2><p class="text-sm mb-3">${head}</p>
    ${r.kind === 'multi' ? `<p class="text-xs text-muted mb-2">ล็อก: ${ls.map(who).join(' · ')}</p>` : ''}<div class="flex flex-col gap-2">${rows}</div>
    <div class="mt-4"><button class="btn btn-ghost" data-act="close">ไว้ก่อน</button></div>`;
}
Object.assign(ACTIONS, {
  'qtf-open'(el) { S.modal = { kind: 'qtf', key: el.dataset.key || el.dataset.id }; render(); },
  async 'qtf-car'(el) {
    const D = derive(), r = qtReviews(D).find(x => x.key === el.dataset.key); if (!r || !perms().approve) return;
    let n = 0; for (const id of r.ids) if (await qtMove(id, el.dataset.vin, 'ผู้จัดการเลือกคัน')) n++;
    toast(n ? `ย้ายล็อกไปที่ ${el.dataset.vin} แล้ว` : 'ย้ายไม่ได้ (มีคนแก้ไปแล้ว)', n ? 'good' : 'bad'); S.modal = null; render();
  },
  async 'qtf-keep'(el) {
    const D = derive(), r = qtReviews(D).find(x => x.key === el.dataset.key); if (!r || !perms().approve) return;
    const keep = D.locks.find(x => x.id === el.dataset.id); if (!keep) return;
    // the others let go, with the reason; the kept one moves to the car (a queued request gets its approval back)
    for (const id of r.ids.filter(x => x !== keep.id)) {
      const x = await claimFresh('locks', id, y => ['pending', 'approved', 'allocated'].includes(y.status)); if (!x) continue;
      x.status = 'released'; x.closed_why = 'qtf';
      await saveLock(id, x, 'ปล่อยล็อก (ผู้จัดการเลือกเก็บอีกรายการ)', `เก็บ "${ltTextOf(keep)}" ไว้ที่ ${r.vins[0]}`);
    }
    if (r.kind === 'queued' && keep.status === 'pending') {
      const x = await claimFresh('locks', keep.id, y => y.status === 'pending');
      if (x) { const t = todayISO(); x.status = 'approved'; x.approved_at = new Date().toISOString(); x.start = x.start || t; x.end = x.end || addDays(t, LOCK_DAYS_BY[x.type] || 15);
        await saveLock(keep.id, x, 'อนุมัติล็อก (ผู้จัดการเลือกเก็บรายการนี้)', `หมด ${fmtD(x.end)}`); }
    } else if (!keep.vin) await qtMove(keep.id, r.vins[0], 'ผู้จัดการเลือกเก็บรายการนี้');
    toast('บันทึกแล้ว'); S.modal = null; render();
  }
});
