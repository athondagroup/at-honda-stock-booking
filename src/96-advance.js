// ---------- advance invoices (ตกลง 22/10): a car invoiced (DL / แจ้งขาย) but not handed over
//   Advance มีลูกค้าจริง    = a real customer, delivered later: stays taken, its lock stays
//   Advance ไม่มีลูกค้าจริง  = a made-up name to reach the month's target: the car is free to sell, its locks released
// The choice is kept on the car (vehicles/<vin>.advance) for that invoice; a new invoice for the car asks again.
// Only function declarations at the top level: the first render runs before this file.
function advOf(vin, inv) {
  const v = S.vehicles.get(vin), a = v && v.advance;
  if (!a || !a.kind) return null;
  if (a.inv && inv && inv.inv && String(a.inv) !== String(inv.inv)) return null;
  return a;
}
// the "no real customer" advance invoice of a car, whatever invoice the car has now (23/10): it counts as an invoice
// sale of its branch and month; a later invoice for that car is a re-issue (not counted again as an invoice sale,
// its delivery counts for the branch that delivered)
function advRec(vin) { const v = S.vehicles.get(vin), a = v && v.advance; return a && a.kind === 'fake' && a.inv && a.idate ? a : null; }
function advBr(vin, a, D) {
  if (a.br) return a.br;
  const r = D.X.inv.find(i => i.vin === vin && String(i.inv || '').replace(/^0+/, '') === String(a.inv).replace(/^0+/, ''));
  const c = D.cars.get(vin);
  return (r && r.br) || (c && (c.fromBr || c.br)) || null;
}
function advInvNo(x) { return String(x || '').replace(/^0+/, ''); }
// every fake-advance car: where it is now (still no customer, re-issued to a real customer, delivered)
function advList(D) {
  const out = [];
  for (const [vin, v] of S.vehicles) {
    const a = v && v.advance; if (!a || a.kind !== 'fake' || !a.inv || !a.idate) continue;
    const br = advBr(vin, a, D), cur = D.invByVin.get(vin), re = cur && advInvNo(cur.inv) !== advInvNo(a.inv) && !cur.company ? cur : null;
    // a booking that holds the car now; the one matched by the advance invoice's own name is not a buyer
    const bk0 = carBookingOf(vin, D), bk = bk0 && !(a.cust && bkDupSame(a.cust, bk0.cust)) ? bk0 : null, dv = (re && re.ddate) || (bk && bk.flow && bk.flow.done && bk.flow.done.delivered ? bk.flow.deliveredDate : null);
    const c = carAny(vin, D) || { vin };
    const lk = !re && !bk && c.lock && c.lock.type === 'booking' ? c.lock : null;
    out.push({ vin, a, br, c, re, bk, lk, dv, dvBr: re ? re.br : bk ? (bk.delivBr || bk.br) : null, sold: !!(re || bk || lk), age: daysBetween(a.idate, D.today) });
  }
  return out.sort((x, y) => (x.a.idate || '').localeCompare(y.a.idate || ''));
}
function advPath(x) {
  const m = d => d ? monLabel(d.slice(0, 7)) : '';
  return chip(`ADV ${x.br || ''} ${m(x.a.idate)}`, 'warn') + ' ' + (x.dv ? `→ ${chip(`ส่งมอบ ${x.dvBr || ''} ${m(x.dv)}`, 'good')}` : x.re ? `→ ${chip(`ออกใบใหม่ ${x.re.br} ${m(x.re.idate)} · รอส่งมอบ`, 'neutral')}` : x.bk || x.lk ? `→ ${chip(`${x.lk ? 'ล็อกให้' : 'มีใบจอง'} ${x.lk ? (x.lk.owner || '') : (x.bk.cust || '')} · รอออกใบใหม่`, 'neutral')}` : chip(`ยังไม่มีลูกค้า · ${x.age} วัน`, 'muted'));
}
function advLabel(a) {
  const m = a.idate ? monLabel(a.idate.slice(0, 7)) : '';
  return a.kind === 'fake' ? `รถ Advance ไม่มีลูกค้าจริง${m ? ` (แจ้งขาย ${m})` : ''} · ยกเลิกล็อกและปล่อยรถแล้ว` : `รถ Advance มีลูกค้าจริง${m ? ` แจ้งขาย ${m}` : ''} · ล็อกไว้ รอส่งมอบ`;
}
// the lock or booking a fake-advance car now holds (it was freed, then locked / allocated to a new booking)
function advNewOwner(c) {
  if (!c) return '';
  if (c.assignedTo) return `จัดสรรให้ ${esc(c.assignedTo.cust || '')}${c.assignedTo.no ? ` (ใบจอง ${esc(c.assignedTo.no)})` : ''}`;
  if (c.lock) return `${c.lock.status === 'pending' ? 'ขอล็อกให้' : 'ล็อกให้'} ${esc(c.lock.owner || c.lock.dealer_name || c.lock.prospect || '')}${c.lock.status === 'pending' ? ' · รออนุมัติ' : ''}`;
  const t = (c.temps || [])[0];
  if (t) return `ล็อกชั่วคราวให้ ${esc(t.prospect || t.owner || '')}${t.status === 'pending' ? ' · รออนุมัติ' : ''}`;
  return '';
}
function advChip(w, c) {
  const a = w.vin ? advOf(w.vin, w) : null, ar = !a && w.vin ? advRec(w.vin) : null;
  if (ar && advInvNo(ar.inv) !== advInvNo(w.inv)) return chip(`ใบออกใหม่แทนใบ Advance ${ar.br || ''} ${monLabel(ar.idate.slice(0, 7))} · ไม่นับใบกำกับซ้ำ`, 'neutral');
  if (!a) return chip('ยังไม่ระบุว่าเป็น Advance แบบไหน', 'muted');
  if (a.kind === 'real') return chip('รถ Advance มีลูกค้าจริง · ล็อกไว้ รอกดส่งมอบ', 'warn');
  const nw = advNewOwner(c);
  return chip('รถ Advance ไม่มีลูกค้าจริง', 'good') + ' ' + (nw ? `<b class="text-xs" style="color:var(--good)">→ ${nw}</b>` : '<span class="text-xs text-muted">ว่าง ยังไม่มีใบจองใหม่ ล็อกหรือจัดสรรได้</span>');
}
// buttons on the row: fake = the same as any stock car (ล็อก · จัดสรร · ส่งมอบ · นำออก); real = ส่งมอบ only
function advActs(w, c, D) {
  if (!w.vin) return '';
  const a = advOf(w.vin, w);
  if (a && a.kind === 'fake' && D.cars.get(w.vin)) return stockActions(D.cars.get(w.vin), perms(), D);
  return delivBtn(c, D);
}
function advCheck(w) {
  if (!w.vin || !(perms().write && canAllocBr(w.br))) return '';
  const on = !!(S.adv && S.adv[w.vin]);
  return `<input type="checkbox" class="w-5 h-5" data-advsel="${esc(w.vin)}" ${on ? 'checked' : ''} aria-label="เลือก ${esc(w.vin)}">`;
}
function advBar(W) {
  const can = W.some(w => w.vin && perms().write && canAllocBr(w.br)); if (!can) return '';
  const n = Object.values(S.adv || {}).filter(Boolean).length;
  return `<div class="p-3 px-4 border-t border-line text-sm" style="background:var(--surface-2)">
    <div class="mb-2">ติ๊กเลือกรถแล้วระบุว่าเป็นรถ Advance แบบไหน · เลือกแล้ว <b>${n}</b> คัน</div>
    <div class="flex flex-wrap gap-2"><button class="btn btn-dark btn-sm" data-act="adv-set" data-kind="real" ${n ? '' : 'disabled'}>Advance มีลูกค้าจริง · คงล็อก รอส่งมอบ</button>
      <button class="btn btn-red btn-sm" data-act="adv-set" data-kind="fake" ${n ? '' : 'disabled'}>Advance ไม่มีลูกค้าจริง · ยกเลิกล็อกและปล่อยรถ</button>
      <button class="btn btn-ghost btn-sm" data-act="adv-set" data-kind="clear" ${n ? '' : 'disabled'}>ล้างที่ตั้งไว้</button></div>
    <p class="text-xs text-muted mt-1">ระบบจำไว้กับใบกำกับนั้น อัปโหลด IDS รอบหน้าไม่ต้องตั้งใหม่ · ไม่มีลูกค้าจริง = ยกเลิกล็อกเดิมของรถคันนั้น (ล็อกของชื่อที่ใช้แจ้งขาย) และปล่อยรถให้ว่าง แล้วล็อก / จัดสรรให้ใบจองใหม่ได้ตามปกติ · มีลูกค้าจริง = รอกดส่งมอบอย่างเดียว</p></div>`;
}
Object.assign(ACTIONS, {
  async 'adv-set'(el) {
    const kind = el.dataset.kind, vins = Object.entries(S.adv || {}).filter(([, v]) => v).map(([k]) => k);
    if (!vins.length) return;
    const D = derive(), W = invWaitingList(D);
    const txt = kind === 'fake' ? 'Advance ไม่มีลูกค้าจริง: ยกเลิกล็อกและปล่อยรถ' : kind === 'real' ? 'Advance มีลูกค้าจริง: คงล็อก รอส่งมอบ' : 'ล้างที่ตั้งไว้';
    if (!confirm(`${txt}\n${vins.length} คัน?`)) return;
    let n = 0, rel = 0;
    for (const vin of vins) {
      const w = W.find(x => x.vin === vin); if (!w || !canAllocBr(w.br)) continue;
      const cur = S.vehicles.get(vin) || { added: null, removed: null, branch: null };
      const advance = kind === 'clear' ? null : { kind, inv: w.inv || null, idate: w.idate || null, cust: w.cust || null, br: w.br || null, ...actor(), at: new Date().toISOString(), hist: [...((cur.advance && cur.advance.hist) || []), ...(cur.advance ? [{ kind: cur.advance.kind, at: cur.advance.at, role: cur.advance.role }] : [])].slice(-10) };
      if (!await write('vehicles', vin, { ...cur, advance })) continue;
      n++;
      if (kind === 'fake') for (const [id, l] of S.locks) {
        if (l.vin !== vin || l.hidden || !['pending', 'approved', 'allocated'].includes(l.status)) continue;
        const c2 = findLock(id); if (!c2) continue; c2.status = 'released'; await saveLock(id, c2, 'ปล่อยล็อก', `รถ Advance ไม่มีลูกค้าจริง (ใบกำกับ ${w.inv || ''}) ปล่อยว่าง`); rel++;
      }
    }
    S.adv = {};
    toast(`ตั้งแล้ว ${n} คัน${rel ? ` · ยกเลิกล็อกและปล่อยรถ ${rel} รายการ` : ''}`); render();
  }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.advsel) return;
  S.adv = { ...(S.adv || {}), [t.dataset.advsel]: t.checked }; render();
});

// ---- the detail behind the home tiles (23/10): invoiced not delivered, car by car, and the advance summary
function advSumModal(m, D) {
  const L = advList(D).filter(x => inBr({ br: x.br }) || (x.dvBr && inBr({ br: x.dvBr })));
  const brs = BRS.filter(b => inBr({ br: b }));
  const rows = brs.map(b => { const mine = L.filter(x => x.br === b); return { b, n: mine.length, sold: mine.filter(x => x.sold).length, left: mine.filter(x => !x.sold).length, inOther: L.filter(x => x.dvBr === b && x.br !== b && x.dv).length }; });
  const tot = k => rows.reduce((n, r) => n + r[k], 0);
  const W = invWaitingList(D);
  const sum = `<section class="mb-5"><h3 class="font-head font-semibold mb-2">รถ Advance (แจ้งขายล่วงหน้า ไม่มีลูกค้าจริง)</h3>
    <div class="scroll-x"><table class="tbl text-sm"><thead><tr><th>สาขา</th><th class="text-right">ใบ Advance</th><th class="text-right">ขายออกแล้ว</th><th class="text-right">ยังไม่มีลูกค้า</th><th class="text-right">ส่งมอบรถ Advance ของสาขาอื่น</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td><b>${r.b}</b> <span class="text-xs text-muted">${esc(BR[r.b].name)}</span></td><td class="num text-right">${r.n || '–'}</td><td class="num text-right">${r.sold || '–'}</td><td class="num text-right" ${r.left ? 'style="color:var(--warn);font-weight:700"' : ''}>${r.left || '–'}</td><td class="num text-right">${r.inOther || '–'}</td></tr>`).join('')}
    <tr><td><b>รวม</b></td><td class="num text-right"><b>${tot('n')}</b></td><td class="num text-right"><b>${tot('sold')}</b></td><td class="num text-right"><b>${tot('left')}</b></td><td class="num text-right"><b>${tot('inOther')}</b></td></tr></tbody></table></div>
    <div class="mt-2 border border-line rounded-lg divide-y divide-line">${L.map(x => `<div class="p-2 px-3 text-sm flex flex-wrap gap-x-3 gap-y-1 items-center">${vinLink(x.c)}<span>${esc(x.c.model || '')} ${esc(gradeShort(x.c.model, x.c.grade) || '')} ${esc(x.c.color || '')}</span>${advPath(x)}
      <span class="text-xs text-muted">ใบ Advance ${esc(x.a.inv)} ${fmtD(x.a.idate)}${x.re ? ` · ใบใหม่ ${esc(x.re.inv || '')} ${fmtD(x.re.idate)}${!isSales() || isMine(x.re.sales) ? ' · ' + esc(x.re.cust || '') : ''}${x.re.sales ? ' · เซลล์ ' + esc(x.re.sales) : ''}` : x.bk ? ` · ใบจอง ${esc(x.bk.cust || '')} · เซลล์ ${esc(x.bk.sales || '')}` : ''}</span></div>`).join('') || '<div class="p-3 text-sm text-muted">ยังไม่มีรถที่ตั้งเป็น Advance ไม่มีลูกค้าจริง</div>'}</div>
    <p class="text-xs text-muted mt-2">ใบ Advance นับเป็นยอดใบกำกับของสาขาและเดือนที่ออก · ใบที่ออกใหม่ให้ลูกค้าจริงไม่นับใบกำกับซ้ำ แต่นับยอดส่งมอบของสาขาและเซลล์ที่ขายจริง</p></section>`;
  const wait = `<section><h3 class="font-head font-semibold mb-2">ออกใบกำกับแล้ว ยังไม่ส่งมอบ ${fmtN(W.length)} คัน</h3>
    <div class="border border-line rounded-lg divide-y divide-line">${W.map(w => { const c = carAny(w.vin, D) || { vin: w.vin }; return `<div class="p-2 px-3 text-sm flex flex-wrap gap-x-3 gap-y-1 items-center">${w.vin ? vinLink({ vin: w.vin }) : '<span class="text-muted">ไม่มีเลขตัวถัง</span>'}
      <span>${esc(w.model || '')} ${esc(gradeShort(w.model, w.grade) || '')} ${esc(w.color || '')}</span><span class="text-muted">${esc(w.br)} · ใบกำกับ ${esc(w.inv || '')} ${fmtD(w.idate)}${!isSales() ? ' · ' + esc(w.cust || '') : ''}${w.sales ? ' · ' + esc(w.sales) : ''}</span>
      ${w.sheetDone && !(w.vin && (advOf(w.vin, w) || advRec(w.vin))) ? chip('ชีตฟอร์มบอกส่งมอบแล้ว แต่ IDS ยังไม่มีวันส่งมอบ', 'warn') : advChip(w, c)}<span class="ml-auto num ${w.age > 14 ? 'font-semibold' : 'text-muted'}" ${w.age > 14 ? 'style="color:var(--warn)"' : ''}>${w.age} วัน</span></div>`; }).join('') || '<div class="p-3 text-sm text-muted">ไม่มี</div>'}</div>
    <p class="text-xs text-muted mt-2">ตั้งว่าเป็นรถ Advance แบบไหน หรือกดส่งมอบ ได้ที่หน้า สต็อก หรือ อัปเดตข้อมูล IDS</p></section>`;
  return `<div class="flex items-start justify-between gap-3 mb-3"><h2 class="font-head text-xl font-semibold">รถ Advance และรถออกใบกำกับแล้ว ยังไม่ส่งมอบ</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>${sum}${wait}`;
}
Object.assign(ACTIONS, { 'adv-sum'() { S.modal = { kind: 'advsum' }; render(); } });
