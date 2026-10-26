// ---------- ปรับเป้าการขาย (ขอ 26/10): the target of a month can be cut (e.g. quota cars did not arrive) and later put back
// Kept in ref/targets_adj: { rows: [{ id, m, br, k: 'cut'|'add', n, carry, link, reason, note, by, role, at }] }
//   cut  = ลดเป้า n คัน   carry = true: the cut will be made up in another month -> counts in ค้างปรับ
//   add  = เพิ่มเป้า n คัน  link = true: made up from ค้างปรับ -> takes it off ค้างปรับ
//   ค้างปรับ = (cuts with carry) − (adds with link)   current target of a month = original − cuts + adds
// Honda counts targets by "Ki": Ki 103 starts 2026-03, a Ki is 12 months (Ki 104 starts 2027-03)
// Only function declarations at the top level: the first render runs before this file.
const KI0 = { n: 103, start: '2026-03' };
const TGT_ADJ_REASONS = ['รถโควต้าไม่มาส่ง', 'ฮอนด้าปรับเป้า', 'สาขาปรับแผนการขาย', 'เกลี่ยเป้าจากเดือนอื่น', 'อื่น ๆ'];
function mAdd(m, k) { const [y, mo] = m.split('-').map(Number), t = y * 12 + (mo - 1) + k; return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, '0')}`; }
function mDiff(a, b) { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); }
function kiOf(m) { return KI0.n + Math.floor(mDiff(KI0.start, m) / 12); }
function kiMonths(k) { const s = mAdd(KI0.start, 12 * (k - KI0.n)); return Array.from({ length: 12 }, (_, i) => mAdd(s, i)); }
function kiLabel(k) { const ms = kiMonths(k); return `Ki ${k} (${monLabel(ms[0])} – ${monLabel(ms[11])})`; }
function tgtAdjRows() { return (S.ref.get('targets_adj') || {}).rows || []; }
function tgtAdjNet(m, br) { return tgtAdjRows().filter(r => r.m === m && (br ? r.br === br : inBr(r))).reduce((n, r) => n + (r.k === 'add' ? r.n : -r.n), 0); }
function tgtBacklog(k, br) {
  const ms = kiMonths(k), L = tgtAdjRows().filter(r => ms.includes(r.m) && (br ? r.br === br : inBr(r)));
  const cut = L.filter(r => r.k === 'cut' && r.carry).reduce((n, r) => n + r.n, 0), add = L.filter(r => r.k === 'add' && r.link).reduce((n, r) => n + r.n, 0);
  return { cut, add, left: cut - add };
}
// the month table of one Ki
function tgtKiTable(k, br) {
  const ms = kiMonths(k); let run = 0;
  return ms.map(m => {
    const orig = tgtBase(m, br), L = tgtAdjRows().filter(r => r.m === m && (br ? r.br === br : inBr(r)));
    const cut = L.filter(r => r.k === 'cut').reduce((n, r) => n + r.n, 0), add = L.filter(r => r.k === 'add').reduce((n, r) => n + r.n, 0);
    run += L.filter(r => r.k === 'cut' && r.carry).reduce((n, r) => n + r.n, 0) - L.filter(r => r.k === 'add' && r.link).reduce((n, r) => n + r.n, 0);
    return { m, orig, cut, add, now: orig - cut + add, left: run };
  });
}
function tgtAdjCard(D) {
  const sel = S.filters.kiSel || kiOf(D.today), kis = [kiOf(D.today) - 1, kiOf(D.today), kiOf(D.today) + 1].filter(k => k >= KI0.n);
  const T = tgtKiTable(sel), B = tgtBacklog(sel), sum = k => T.reduce((n, r) => n + r[k], 0);
  const brs = BRS.filter(b => inBr({ br: b })), can = tgtCanEdit();
  const L = tgtAdjRows().filter(r => kiMonths(sel).includes(r.m) && inBr(r)).sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  return `<section class="bg-surface border border-line rounded-lg p-4 min-w-0 mb-5"><div class="flex flex-wrap items-center gap-3 mb-2"><h2 class="font-head font-semibold">การปรับเป้า · ${esc(kiLabel(sel))}</h2>
    <div class="seg" role="group" aria-label="Ki">${kis.map(k => `<button data-act="ki-sel" data-k="${k}" aria-pressed="${k === sel}">Ki ${k}</button>`).join('')}</div>
    ${can ? '<button class="btn btn-ghost btn-sm ml-auto" data-act="tgtadj-open">ปรับเป้า</button>' : ''}</div>
  ${tiles([
    tile('เป้าเดิมทั้ง Ki', fmtN(sum('orig')), { sub2: 'คัน ใบกำกับภาษี' }),
    tile('ลดเป้า', fmtN(sum('cut')), { tone: sum('cut') ? 'warn' : '', sub2: 'รวมทุกเดือน' }),
    tile('เพิ่มเป้า', fmtN(sum('add')), { sub2: `เกลี่ยจากค้างปรับ ${fmtN(B.add)}` }),
    tile('เป้าปัจจุบัน', fmtN(sum('now')), { tone: 'good', sub2: sum('now') === sum('orig') ? 'เท่าเดิม' : `${sum('now') > sum('orig') ? 'เพิ่ม' : 'ลด'}จากเดิม ${fmtN(Math.abs(sum('now') - sum('orig')))}` }),
    tile('ค้างปรับ', fmtN(B.left), { tone: B.left > 0 ? 'bad' : '', sub2: B.left > 0 ? 'ลดไว้ ต้องเกลี่ยไปเดือนอื่น' : B.left < 0 ? 'เพิ่มเกินที่ค้าง' : 'ไม่มีค้าง' })
  ], 'lg:grid-cols-5')}
  <div class="grid lg:grid-cols-2 gap-4 mt-3">
    <div class="scroll-x"><table class="tbl text-sm"><thead><tr><th>เดือน</th><th class="text-right">เป้าเดิม</th><th class="text-right">ลด</th><th class="text-right">เพิ่ม</th><th class="text-right">เป้าปัจจุบัน</th><th class="text-right">ค้างปรับสะสม</th></tr></thead>
      <tbody>${T.map(r => `<tr${r.m === D.today.slice(0, 7) ? ' style="background:var(--surface-2)"' : ''}><td class="nowrap">${monLabel(r.m)}</td><td class="num text-right">${r.orig || '–'}</td><td class="num text-right" ${r.cut ? 'style="color:var(--bad)"' : ''}>${r.cut ? '−' + r.cut : '–'}</td><td class="num text-right" ${r.add ? 'style="color:var(--good)"' : ''}>${r.add ? '+' + r.add : '–'}</td><td class="num text-right font-semibold">${r.now || '–'}</td><td class="num text-right" ${r.left > 0 ? 'style="color:var(--bad)"' : ''}>${r.left || '–'}</td></tr>`).join('')}
      <tr style="font-weight:600"><td>รวม Ki</td><td class="num text-right">${sum('orig')}</td><td class="num text-right">${sum('cut') ? '−' + sum('cut') : '–'}</td><td class="num text-right">${sum('add') ? '+' + sum('add') : '–'}</td><td class="num text-right">${sum('now')}</td><td class="num text-right">${B.left || '–'}</td></tr></tbody></table></div>
    <div class="min-w-0"><div class="text-sm font-semibold mb-1">ค้างปรับแยกสาขา</div><div class="flex flex-wrap gap-2 mb-3">${brs.map(b => { const x = tgtBacklog(sel, b); return `<span class="inline-flex items-center gap-1 border border-line rounded-lg px-2 py-1 text-sm"><b>${b}</b> ${x.left > 0 ? chip('ค้าง ' + x.left, 'bad') : x.left < 0 ? chip('เกิน ' + (-x.left), 'warn') : chip('ไม่ค้าง', 'good')}</span>`; }).join('')}</div>
      <div class="text-sm font-semibold mb-1">ประวัติการปรับ</div>
      <div class="border border-line rounded-lg divide-y divide-line max-h-56 overflow-auto">${L.map(r => `<div class="p-2 px-3 text-sm flex flex-wrap gap-x-3 gap-y-1 items-center"><b>${esc(r.br)}</b><span class="nowrap">${monLabel(r.m)}</span>${r.k === 'cut' ? chip('ลด ' + r.n, 'bad') : chip('เพิ่ม ' + r.n, 'good')}${r.k === 'cut' ? chip(r.carry ? 'เกลี่ยเดือนอื่น' : 'ลดจริง', 'muted') : chip(r.link ? 'หักค้างปรับ' : 'ไม่หักค้าง', 'muted')}<span class="text-muted">${esc(r.reason || '')}${r.note ? ' · ' + esc(r.note) : ''}</span><span class="ml-auto text-xs text-muted">${esc(r.role || '')} · ${fmtDT(r.at)}</span>${S.role.role === 'exec' ? `<button class="btn btn-ghost btn-sm" data-act="tgtadj-del" data-id="${esc(r.id)}">ลบ</button>` : ''}</div>`).join('') || '<div class="p-3 text-sm text-muted">ยังไม่มีการปรับเป้าใน Ki นี้</div>'}</div></div></div>
  <p class="text-xs text-muted mt-2">ลดเป้าแล้วเลือก "จะเกลี่ยไปเดือนอื่น" ยอดนั้นจะขึ้นเป็นค้างปรับ เมื่อเพิ่มเป้าเดือนอื่นและเลือก "เกลี่ยจากค้างปรับ" ระบบหักค้างปรับออกให้ · เป้าปัจจุบันใช้คำนวณ % เป้าในหน้ายอดขายและเป้าทั้งหมด · Ki ของฮอนด้าเริ่มเดือนมีนาคม</p></section>`;
}
function tgtAdjModal(m) {
  const brs = tgtEditBrs(), cut = m.k === 'cut', n = Number(m.n) || 0, ki = kiOf(m.m);
  const o = tgtBase(m.m, m.br), cur = o + tgtAdjNet(m.m, m.br), nw = cur + (cut ? -n : n), B = tgtBacklog(ki, m.br);
  const after = B.left + (cut && m.carry ? n : 0) - (!cut && m.link ? n : 0);
  const seg = (k, v, label, tone) => `<button type="button" class="btn btn-sm ${m[k] === v ? (tone || 'btn-dark') : 'btn-ghost'}" data-act="tgtadj-set" data-k="${k}" data-v="${v}">${label}</button>`;
  return `<div class="flex items-start justify-between gap-3 mb-3"><div><h2 class="font-head text-xl font-semibold">ปรับเป้าการขาย</h2><p class="text-sm text-muted">${esc(kiLabel(ki))}</p></div><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="flex flex-col gap-4">
    <div class="grid sm:grid-cols-2 gap-3"><div class="field min-w-0"><label for="ta-m" class="req">เดือนที่ปรับ</label><input id="ta-m" type="month" data-modal="m" value="${esc(m.m)}"></div>
      <div class="field min-w-0"><label for="ta-br" class="req">สาขา</label><select id="ta-br" data-modal="br">${brs.map(b => `<option value="${b}" ${m.br === b ? 'selected' : ''}>${b} ${esc(BR[b].name)}</option>`).join('')}</select></div></div>
    <div class="field"><label class="req">ปรับแบบไหน</label><div class="flex flex-wrap gap-2">${seg('k', 'cut', 'ลดเป้า', 'btn-red')}${seg('k', 'add', 'เพิ่มเป้า', 'btn-dark')}</div></div>
    <div class="field"><label for="ta-n" class="req">จำนวน (คัน)</label><input id="ta-n" type="number" min="1" step="1" inputmode="numeric" data-modal="n" value="${esc(m.n)}"></div>
    <div class="field"><label for="ta-r" class="req">เหตุผล</label><select id="ta-r" data-modal="reason">${TGT_ADJ_REASONS.map(r => `<option ${m.reason === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>
    ${cut ? `<label class="flex items-center gap-2 text-sm"><input type="checkbox" class="w-5 h-5" data-modal="carry" ${m.carry ? 'checked' : ''}> จะเกลี่ยไปเดือนอื่น (ขึ้นเป็น "ค้างปรับ")</label>`
      : `<label class="flex items-center gap-2 text-sm"><input type="checkbox" class="w-5 h-5" data-modal="link" ${m.link ? 'checked' : ''}> เกลี่ยจากค้างปรับ (หักค้างปรับออก)</label>`}
    <div class="field"><label for="ta-note">หมายเหตุ</label><input id="ta-note" data-modal="note" value="${esc(m.note || '')}" placeholder="เช่น ฮอนด้าส่งรถ Quota ช้า ${'' }"></div>
    <div class="p-3 rounded-lg text-sm" style="background:var(--surface-2)">เป้า ${monLabel(m.m)} สาขา ${esc(m.br)}: เดิม <b class="num">${o}</b> · ตอนนี้ <b class="num">${cur}</b> → หลังปรับ <b class="num">${nw}</b> คัน<br>ค้างปรับของสาขา ${esc(m.br)} ใน Ki นี้: <b class="num">${B.left}</b> → <b class="num" style="color:var(--${after > 0 ? 'bad' : 'good'})">${after}</b> คัน${after < 0 ? ' <span class="text-xs">(เพิ่มเกินที่ค้างอยู่)</span>' : ''}</div>
    <div class="flex justify-end gap-2"><button class="btn btn-ghost" data-act="close">ยกเลิก</button><button class="btn btn-red" data-act="tgtadj-save">บันทึกการปรับเป้า</button></div>
  </div>`;
}
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !S.modal || S.modal.kind !== 'tgtadj' || !t.dataset.modal) return;
  if (['m', 'br', 'n', 'carry', 'link'].includes(t.dataset.modal)) render();
});
Object.assign(ACTIONS, {
  'tgtadj-open'() { if (!tgtCanEdit()) return; S.modal = { kind: 'tgtadj', m: todayISO().slice(0, 7), br: tgtEditBrs()[0], k: 'cut', n: '', reason: TGT_ADJ_REASONS[0], carry: true, link: true, note: '' }; render(); },
  'tgtadj-set'(el) { S.modal[el.dataset.k] = el.dataset.v; render(); },
  'ki-sel'(el) { S.filters.kiSel = Number(el.dataset.k); render(); },
  async 'tgtadj-save'() {
    const m = S.modal, n = Math.round(Number(m.n));
    if (!(n > 0)) { toast('ใส่จำนวนคันที่ปรับ', 'bad'); return; }
    if (!tgtEditBrs().includes(m.br)) { toast('ปรับเป้าสาขานี้ไม่ได้', 'bad'); return; }
    if (m.k === 'cut' && n > tgtBase(m.m, m.br) + tgtAdjNet(m.m, m.br)) { toast('ลดเกินเป้าที่มีอยู่ของเดือนนั้น', 'bad'); return; }
    const cur = S.ref.get('targets_adj') || { rows: [] };
    const row = { id: 'A' + Date.now().toString(36), m: m.m, br: m.br, k: m.k, n, carry: m.k === 'cut' ? !!m.carry : false, link: m.k === 'add' ? !!m.link : false, reason: m.reason, note: (m.note || '').trim() || null, ...actor() };
    if (await write('ref', 'targets_adj', { rows: [...(cur.rows || []), row], at: row.at })) { S.modal = null; toast(`${m.k === 'cut' ? 'ลด' : 'เพิ่ม'}เป้า ${monLabel(m.m)} ${m.br} ${n} คัน แล้ว`); render(); }
  },
  async 'tgtadj-del'(el) {
    if (S.role.role !== 'exec') return;
    const cur = S.ref.get('targets_adj') || { rows: [] };
    if (await write('ref', 'targets_adj', { rows: (cur.rows || []).filter(r => r.id !== el.dataset.id), at: new Date().toISOString() })) { toast('ลบรายการปรับเป้าแล้ว'); render(); }
  }
});
