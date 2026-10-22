// ---------- stock by spec: what each number holds, open quota, why a car is taken (ตกลง 22/10)
// Only function declarations at the top level: the first render runs before this file.
// one plain sentence on what holds this car, shown at the top of the car window
function carWhyBox(c, D, inv, bk, hideCust) {
  const l = c.lock, name = v => hideCust ? 'ลูกค้า (ของเซลล์อื่น)' : esc(v || '–');
  const ib = D.idsB.find(b => b.vin === c.vin && b.match !== 'cancel');
  const t = {
    free: 'ว่าง: ไม่มีใบจองใน IDS ไม่มีล็อกในเว็บ ไม่มีชื่อในชีต ขายหรือขอล็อกได้',
    temp: `ว่าง แต่มีล็อกชั่วคราว (7 วัน) ของ ${name(l && (l.owner || l.sales_nick))}${l && l.end ? ` หมด ${fmtD(l.end)}` : ''} · ถ้ามีใบจองจริงขอล็อกได้ ล็อกชั่วคราวจะหลุด`,
    noted: `มีชื่อพิมพ์ไว้ในชีต Stock: "${esc(c.bknote || '')}" · ยังไม่ใช่ล็อกจนกว่าผู้จัดการอนุมัติคำขอ`,
    booked: `IDS จัดสรรให้ใบจอง ${esc(c.bk || (ib && ib.no) || '')} · ลูกค้า ${name(c.cust || (ib && ib.cust))}${ib && ib.sales ? ` · เซลล์ใน IDS ${esc(ib.sales)}` : ''}${c.alloc ? ` · จัดสรร ${fmtD(c.alloc)}` : ''}`,
    sold: `แจ้งขายใน IDS แล้ว${c.cust ? ` · ลูกค้า ${name(c.cust)}` : ''} · รอใบกำกับ / ส่งมอบ`,
    invoiced: `ออกใบกำกับแล้ว${inv ? ` เลข ${esc(inv.inv)} วันที่ ${fmtD(inv.idate)}` : ''}${inv && inv.cust ? ` · ${name(inv.cust)}` : ''} · ยังไม่ส่งมอบ (กด "ส่งมอบ" เมื่อลูกค้ารับรถ)`,
    company: `รถบริษัท: ใน IDS ลูกค้าคือบริษัท AT Honda เอง${c.cust ? ` ("${esc(c.cust)}")` : ''}${c.bk ? ` ใบจอง ${esc(c.bk)}` : ''} เช่น รถทดลองขับ / รถใช้งาน / ออกใบกำกับในนามบริษัท · ไม่นับเป็นรถว่าง และไม่นับยอดขาย`,
    pending: `มีคำขอล็อกรออนุมัติ${l ? ` · ${l.type === 'dealer' ? 'ดีลเลอร์ ' + esc(l.dealer_name || '') : 'ให้ ' + name(l.owner || l.sales_nick)}` : ''}`,
    locked: `ล็อกในเว็บนี้แล้ว${l ? ` · ${l.type === 'dealer' ? 'ดีลเลอร์ ' + esc(l.dealer_name || '') : l.type === 'temp' ? 'ชั่วคราว ' + name(l.owner || l.sales_nick) : 'ใบจองของ ' + name(l.owner)}${l.hold ? ' · ถือไว้จนส่งมอบ' : l.end ? ` · หมด ${fmtD(l.end)}` : ''}` : ''} · IDS ยังไม่จัดสรร`,
    allocated: 'แอดมินแจ้งว่าจัดสรรใน IDS แล้ว รอไฟล์ IDS รอบหน้ายืนยัน',
    assigned: `จัดสรรให้ใบจอง AT แล้ว${bk ? ` · ${name(bk.cust)} (${esc(bk.sales || '')})` : ''} รอส่งมอบ`
  }[c.status] || (CAR_STATUS[c.status] || [c.status])[0];
  return `<div class="p-3 rounded-lg text-sm mb-3" style="background:var(--surface-2)"><b>รถคันนี้ติดอะไร:</b> ${t}
    ${bk && (!isSales() || isMine(bk.sales)) ? `<div class="mt-1"><button class="btn btn-ghost btn-sm" data-act="at-open" data-id="${esc(bk.id)}">เปิดใบจอง ${esc(bk.cust)}</button></div>` : ''}</div>`;
}
function specQuotaModal(m, D) {
  const qs = D.quota.filter(q => q.open && q.spec === m.key && (!S.br || q.br === S.br)).sort((a, b) => String(a.m || '').localeCompare(String(b.m || '')) || String(a.ref).localeCompare(String(b.ref)));
  const p = perms(), s = D.specs[m.key];
  return `<div class="flex items-start justify-between gap-3 mb-2"><div><h2 class="font-head text-xl font-semibold">Quota ว่าง</h2><p class="text-sm text-muted">${specLabel(m.key)}${s ? ` · รอรถ ${s.waiting} · ว่าง ${s.free}` : ''}</p></div><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <p class="text-xs text-muted mb-2">Quota ว่าง = รถที่จะเข้า (Honda จัดให้แล้ว) ยังไม่มีใบจอง ไม่มีล็อก · ขอล็อกคิวให้ใบจองได้เลย ผู้จัดการอนุมัติเหมือนล็อกรถปกติ</p>
  <div class="scroll-x"><table class="tbl text-sm"><thead><tr><th>Ref</th><th>เดือนส่ง</th><th>สาขา</th><th>สถานะ</th><th></th></tr></thead><tbody>
    ${qs.map(q => `<tr><td class="code nowrap">${esc(q.ref)}</td><td class="nowrap">${q.m ? fmtM(q.m) : '–'}</td><td>${esc(q.br)}</td><td>${statusChip(QUOTA_STATUS, q.st)}${q.vin ? `<div class="text-xs code">${esc(q.vin)}</div>` : ''}${(q.temps || []).length ? `<div class="text-xs" style="color:var(--warn)">มีล็อกชั่วคราว ${q.temps.length}</div>` : ''}</td>
      <td class="text-right">${p.write && p.request ? `<button class="btn btn-red btn-sm" data-act="lock-open" data-ref="${esc(q.ref)}">ขอล็อกคิว</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="text-muted">ไม่มี Quota ว่างของสเปกนี้</td></tr>'}</tbody></table></div>`;
}
Object.assign(ACTIONS, {
  speccat(el) { S.filters.specOpen = el.dataset.key; S.filters.specCat = el.dataset.cat || ''; render(); },
  specquota(el) { S.modal = { kind: 'specquota', key: el.dataset.key }; render(); },
  carwhy(el) { ACTIONS['car-open']({ dataset: { vin: el.dataset.vin } }); }
});
