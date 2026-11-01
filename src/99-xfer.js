// ------------------------------------------------------------------ cars asked for / sent to another branch (ตกลง 2/11)
// pull: the admin of the branch that wants the car asks; the admin (or manager) of the car's branch confirms, then the Stock moves
// push: the admin of the branch that sells the car tells the other branch; that branch confirms "รับรถเข้า Stock", then the Stock moves
// The car stays in the old branch's Stock until the confirmation. Only function declarations / ACTIONS here.
const xferResponder = x => x && (S.role.role === 'exec' || canApproveBr(x.dir === 'pull' ? x.from : x.to) || (S.role.role === 'admin' && myBranch() === (x.dir === 'pull' ? x.from : x.to)));
function xferBox(c) {
  const x = c.xfer; if (!x) return '';
  const resp = xferResponder(x) && perms().write, mineAsk = x.by === S.me.id;
  const txt = x.dir === 'pull' ? `สาขา ${x.to} ขอรถคันนี้เข้าสาขา · รอแอดมินสาขา ${x.from} ยืนยันย้าย Stock` : `สาขา ${x.from} แจ้งขายรถคันนี้ให้สาขา ${x.to} · รอแอดมินสาขา ${x.to} กดรับรถเข้า Stock`;
  return `<div class="p-3 rounded-lg mt-3" style="background:var(--warn-soft)"><div class="text-sm font-medium">${esc(txt)}</div>
    <div class="text-xs text-muted">${esc(x.role || '')} · ${fmtDT(x.at)}${x.note ? ' · ' + esc(x.note) : ''}</div>
    <div class="flex flex-wrap gap-2 mt-2">${resp ? `<button class="btn btn-red btn-sm" data-act="xfer-ok" data-vin="${esc(c.vin)}">${x.dir === 'pull' ? 'ยืนยันย้าย Stock' : 'รับรถเข้า Stock'}</button>` : ''}
      ${resp || mineAsk || canApproveBr(x.from) || canApproveBr(x.to) ? `<button class="btn btn-ghost btn-sm" data-act="xfer-no" data-vin="${esc(c.vin)}">${resp && !mineAsk ? 'ปฏิเสธ' : 'ยกเลิกคำขอ'}</button>` : ''}</div></div>`;
}
Object.assign(ACTIONS, {
  'xfer-open'(el) { ACTIONS['car-open']({ dataset: { vin: el.dataset.id || el.dataset.vin } }); },
  async 'xfer-ok'(el) {
    const vin = el.dataset.vin, cur = S.vehicles.get(vin), x = cur && cur.xfer;
    if (!x || !xferResponder(x) || !perms().write) { toast('ทำรายการนี้ไม่ได้', 'bad'); return; }
    const fresh = await claimFresh('vehicles', vin, v => v.xfer && v.xfer.at === x.at); if (!fresh) return;
    const { xfer, ...rest } = fresh;
    if (await write('vehicles', vin, { ...rest, branch: x.to, moved: { ...(rest.moved || {}), ...actor(), from: x.from, to: x.to, spec: x.spec || (rest.moved && rest.moved.spec) || null, via: x.dir, asked_by: x.by || null } })) { toast(`ย้ายรถไปสาขา ${x.to} แล้ว`); render(); }
  },
  async 'xfer-no'(el) {
    const vin = el.dataset.vin, cur = S.vehicles.get(vin), x = cur && cur.xfer; if (!x) return;
    const { xfer, ...rest } = cur;
    if (await write('vehicles', vin, { ...rest, xfer_last: { ...x, ended: { ...actor(), result: x.by === S.me.id ? 'cancel' : 'reject' } } })) { toast('ปิดคำขอแล้ว'); render(); }
  }
});
