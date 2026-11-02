// ------------------------------------------------------------------ transfer a customer to another branch (ตกลง 2/11)
// IDS has no transfer: the admin withdraws the booking at the old branch and keys a new one (new number) at the new branch.
// The web keeps ONE booking: the booking branch / seller stay (the booking count and the commission), the branch that issues the invoice
// becomes the new one (a.delivBr). The old IDS number is kept as an old number; the new IDS booking is paired when it appears.
// Existing payments stay (amount not counted twice); each needs a receipt number of the new branch.
// Only function declarations / ACTIONS here: the first render runs before this part of the file.
function bkxCan(a) { return !!(a && !a.cancelled && !a.demo && !a.done && perms().write && (adminOwns(a) || canApproveBr(a.br) || canApproveBr(a.delivBr))); }
function bkxWaiting(a) { const x = a.xfer; return !!(x && !a.done && !(a.match && a.match.recs.some(r => r.kind === 'booking' && r.br === x.to))); }
function bkxBox(m, a) {
  if (a.cancelled || a.demo) return '';
  const x = a.xfer, cur = a.delivBr || a.br, can = bkxCan(a);
  const it = typeof payItems === 'function' ? payItems(a) : [], need = x ? it.map((p, i) => ({ p, i })).filter(o => o.p.needs_new) : [];
  let out = '';
  if (x) out += box(bkxWaiting(a) ? 'warn' : 'surface', `<b>โอนลูกค้า ${esc(x.from)} → ${esc(x.to)}</b> · ${who(x)} ${fmtDT(x.at)}${x.why ? ` · ${esc(x.why)}` : ''}
    <div class="text-xs text-muted mt-1">ยอดจองและเซลล์เจ้าของเคสยังเป็นสาขา ${esc(a.br)} / ${esc(a.sales || '')} · สาขา ${esc(x.to)} ออกใบกำกับและทำเงื่อนไขการขาย${x.old_no ? ` · เลข IDS เดิม ${esc(x.old_no)} (${esc(x.from)}) ถอนจองแล้ว` : ''}</div>
    ${bkxWaiting(a) ? `<div class="mt-1">รอแอดมินสาขา ${esc(x.to)} คีย์ใบจองใหม่ใน IDS · เมื่ออัปโหลดไฟล์ IDS ที่มีใบจองใหม่ (ชื่อลูกค้าและรุ่นตรงกัน) ระบบจับคู่ให้เอง</div>` : ''}
    <div class="text-xs mt-1">รถ: ต้องจัดสรรใหม่ที่สาขา ${esc(x.to)} หรือกดโอนย้ายรถคันเดิมไปสาขา ${esc(x.to)}</div>`);
  if (need.length) out += box('warn', `<b>ใส่เลขที่ใบเสร็จใหม่ของสาขา ${esc(x.to)}</b> (ยอดเงินเท่าเดิม ไม่นับซ้ำ)
    <div class="grid gap-2 mt-2">${need.map(o => `<div class="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end"><div class="text-sm">${fmtD(o.p.date)} · ${money(o.p.amount)} บาท · เดิม <span class="code">${esc(o.p.receipt_no || '–')}</span></div>
      <div class="field"><label for="xf-rc${o.i}">เลขที่ใบเสร็จใหม่</label><input id="xf-rc${o.i}" data-modal="xf_rc${o.i}" value="${esc(m['xf_rc' + o.i] ?? '')}" autocomplete="off"></div>
      <button class="btn btn-dark btn-sm" data-act="bkx-rc" data-id="${esc(a.id)}" data-i="${o.i}">บันทึก</button></div>`).join('')}</div>`);
  if (!can) return out;
  if (m.xf_open) {
    const brs = BRS.filter(b => b !== cur);
    out += box('surface', `<b>โอนลูกค้าไปสาขาอื่น</b>
      <div class="grid sm:grid-cols-2 gap-3 mt-2"><div class="field"><label for="xf-to" class="req">สาขาปลายทาง (ออกใบกำกับ)</label><select id="xf-to" data-modal="xf_to">${opt(brs, m.xf_to, 'เลือกสาขา')}</select></div>
      <div class="field"><label for="xf-why">เหตุผล</label><input id="xf-why" data-modal="xf_why" value="${esc(m.xf_why ?? '')}" autocomplete="off" placeholder="เช่น ลูกค้าออกรถที่สาขาที่มีรถ"></div></div>
      <div class="text-xs text-muted mt-1">ใบจองยังนับเป็นยอดจองของสาขา ${esc(a.br)} และเซลล์เดิม · ต้องถอนจองและคีย์ใหม่ใน IDS เอง</div>
      <div class="flex gap-2 mt-2"><button class="btn btn-dark btn-sm" data-act="bkx-save" data-id="${esc(a.id)}">โอนลูกค้า</button><button class="btn btn-ghost btn-sm" data-act="bkx-close">ยกเลิก</button></div>`);
  } else out += `<div><button class="btn btn-ghost btn-sm" data-act="bkx-open">โอนลูกค้าไปสาขาอื่น</button></div>`;
  return out;
}
Object.assign(ACTIONS, {
  'bkx-open'() { S.modal.xf_open = true; S.modal.xf_to = ''; S.modal.xf_why = ''; render(); },
  'bkx-close'() { S.modal.xf_open = false; render(); },
  async 'bkx-save'(el) {
    const a = atById(el.dataset.id), m = S.modal; if (!a || !bkxCan(a)) return;
    const to = m.xf_to, from = a.delivBr || a.br;
    if (!to || to === from) { toast('เลือกสาขาปลายทาง', 'bad'); return; }
    const old = a.match && a.match.recs.find(r => r.kind === 'booking');
    const r = await saveBk(a.id, 'โอนลูกค้าข้ามสาขา', `${from} → ${to}${m.xf_why ? ' · ' + m.xf_why : ''}`, x => {
      x.xfer = { from, to, why: String(m.xf_why || '').trim(), old_no: old ? old.no || null : null, old_key: old ? old.key : null, ...actor() };
      if (old) x.ids_alt = [...new Set([...(x.ids_alt || []), old.key])];
      if (x.match_pick && old && x.match_pick.key === old.key) delete x.match_pick;
      const dn = x.flow && x.flow.down; if (dn && Array.isArray(dn.items)) dn.items = dn.items.map(p => ({ ...p, needs_new: true }));
    });
    if (r) { m.xf_open = false; toast(`โอนลูกค้าไปสาขา ${to} แล้ว · แจ้งแอดมินสาขาปลายทางให้คีย์ IDS และจัดสรรรถ`); }
  },
  async 'bkx-rc'(el) {
    const a = atById(el.dataset.id), i = Number(el.dataset.i), m = S.modal; if (!a || !bkxCan(a)) return;
    const no = String(m['xf_rc' + i] || '').trim(); if (!no) { toast('ใส่เลขที่ใบเสร็จใหม่', 'bad'); return; }
    const r = await saveBk(a.id, 'ใบเสร็จใหม่ตามสาขาที่โอน', no, x => {
      const dn = x.flow && x.flow.down; if (!dn || !Array.isArray(dn.items) || !dn.items[i]) return false;
      const items = dn.items.map((p, k) => k === i ? { ...p, receipt_old: p.receipt_no || null, receipt_no: no, needs_new: false } : p);
      x.flow.down = payDown({ rec: x }, items);
    });
    if (r) { delete m['xf_rc' + i]; toast('บันทึกเลขที่ใบเสร็จใหม่แล้ว'); }
  }
});
