// ---------- ส่งมอบ / แจ้งขาย: cars invoiced or delivered, to check and fix the sale terms in one place (24/10)
// who sees what follows the booking list: sales their own, a branch admin the branch, managers and exec their branches
function soldSt() { return [['', 'ทั้งหมด'], ['none', 'ยังไม่ใส่เงื่อนไข'], ['nocamp', 'ยังไม่เลือกแคมเปญ'], ['req', 'มีคำขอแก้รออนุมัติ'], ['wait', 'รอผู้จัดการยืนยัน'], ['done', 'ยืนยันแล้ว']]; }
function soldInv(a, D) {
  const vin = atVin(a); if (!vin) return null;
  const adv = advRec(vin); if (adv) return { idate: adv.idate, inv: adv.inv, adv: true };
  const i = D.invByVin.get(vin);
  return i && !i.company ? { idate: i.idate, inv: i.inv, ddate: i.ddate } : null;
}
function soldStatus(a) {
  const d = a.rec.deal || {}, fl = a.flow || {};
  if (!d.at) return 'none';
  if (!d.campaign_id) return 'nocamp';
  if (d.req && d.req.at) return 'req';
  if (fl.done && fl.done.confirmed) return 'done';
  return 'wait';
}
function soldRows(D) {
  const out = [];
  for (const a of D.at) {
    if (a.cancelled || a.demo || !inBr(a) || !atVisible(a)) continue;
    const inv = soldInv(a, D), fl = a.flow || {}, dd = fl.deliveredDate || (inv && inv.ddate) || null;
    if (!inv && !dd) continue;
    out.push({ a, idate: inv ? inv.idate : null, adv: !!(inv && inv.adv), ddate: dd, st: soldStatus(a), vin: atVin(a) || '' });
  }
  return out;
}
function soldList(D) {
  const f = S.filters, by = f.soBy || 'inv';
  const all = soldRows(D);
  const mOf = r => String((by === 'deliv' ? r.ddate || r.idate : r.idate || r.ddate) || '').slice(0, 7);
  const months = [...new Set(all.map(mOf).filter(Boolean))].sort().reverse();
  const month = f.soMonth === undefined ? todayISO().slice(0, 7) : f.soMonth;
  const q = norm(f.soQ || '');
  const base = all.filter(r => (!month || mOf(r) === month) && (!f.soSales || r.a.sales === f.soSales)
    && (!q || norm(r.a.cust).includes(q) || norm(r.vin).includes(q)));
  const list = base.filter(r => !f.soSt || r.st === f.soSt).sort((x, y) => String(y.idate || y.ddate || '').localeCompare(String(x.idate || x.ddate || '')));
  const sales = [...new Set(all.map(r => r.a.sales).filter(Boolean))].sort((x, y) => x.localeCompare(y, 'th'));
  const cnt = k => base.filter(r => !k || r.st === k).length;
  const tone = { none: 'var(--bad)', nocamp: 'var(--warn)', req: 'var(--warn)', wait: 'var(--muted)', done: 'var(--good)' };
  const stChip = k => `<span class="text-xs font-medium nowrap" style="color:${tone[k]}">● ${soldSt().find(s => s[0] === k)[1]}</span>`;
  const mLabel = m => { const [y, mm] = m.split('-'); return `${TH_MON_FULL()[Number(mm) - 1]} ${Number(y) + 543}`; };
  if (!months.includes(month) && month) months.unshift(month);
  return `<p class="text-sm text-muted mb-3">รถที่ออกใบกำกับภาษีแล้วหรือส่งมอบแล้ว ดูและแก้เงื่อนไขการขาย (ส่วนลด ดาวน์ แคมเปญ Margin) ได้ที่นี่ · กดแถวเพื่อเปิดใบจองที่ช่องเงื่อนไขการขาย</p>
  <div class="flex flex-wrap gap-2 items-end mb-3">
    <div class="field"><label for="so-by">นับเดือนจาก</label><select id="so-by" data-filter="soBy"><option value="inv" ${by === 'inv' ? 'selected' : ''}>วันออกใบกำกับ</option><option value="deliv" ${by === 'deliv' ? 'selected' : ''}>วันส่งมอบ</option></select></div>
    <div class="field"><label for="so-m">เดือน</label><select id="so-m" data-filter="soMonth"><option value="" ${!month ? 'selected' : ''}>ทุกเดือน</option>${months.map(m => `<option value="${m}" ${m === month ? 'selected' : ''}>${mLabel(m)}</option>`).join('')}</select></div>
    ${isSales() ? '' : `<div class="field"><label for="so-s">เซลล์</label><select id="so-s" data-filter="soSales"><option value="">ทุกคน</option>${sales.map(s => `<option ${s === f.soSales ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>`}
    <div class="field flex-1" style="min-width:200px"><label for="so-q">ค้นหา</label><input id="so-q" type="search" data-filter="soQ" value="${esc(f.soQ || '')}" placeholder="ชื่อลูกค้า หรือ เลขตัวถัง"></div>
  </div>
  <div class="flex flex-wrap gap-2 mb-3" role="group" aria-label="สถานะเงื่อนไข">${soldSt().map(([k, t]) => `<button class="btn btn-sm ${(f.soSt || '') === k ? 'btn-dark' : 'btn-ghost'}" data-act="so-st" data-k="${k}" aria-pressed="${(f.soSt || '') === k}">${t} <span class="badge" style="background:var(--surface-2);color:var(--fg)">${cnt(k)}</span></button>`).join('')}</div>
  ${list.length ? `<div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl">
    <thead><tr><th>ออกใบกำกับ</th><th>ส่งมอบ</th><th>ลูกค้า</th><th>รุ่น / เกรด / สี</th><th>เลขตัวถัง</th><th>เซลล์</th><th>แคมเปญ</th><th class="text-right">Margin รวม</th><th>สถานะ</th></tr></thead>
    <tbody>${list.slice(0, 400).map(r => { const a = r.a, d = a.rec.deal || {}; return `<tr class="cursor-pointer hover:bg-surface2" data-act="so-open" data-id="${esc(a.id)}" tabindex="0">
      <td class="num nowrap">${fmtD(r.idate)}${r.adv ? ' <span class="text-xs text-muted">Advance</span>' : ''}</td><td class="num nowrap">${fmtD(r.ddate)}</td>
      <td style="min-width:140px">${esc(a.cust || '')}<div class="text-xs text-muted">${isCash(a.rec) ? 'ซื้อสด' : esc(a.rec.finance || 'ไฟแนนซ์')}</div></td>
      <td class="nowrap">${specLabel(a.spec)}</td><td class="code nowrap">${esc(r.vin)}</td>
      <td class="nowrap">${esc(a.sales || '')}<div class="text-xs text-muted">${esc(a.br || '')}</div></td>
      <td style="min-width:160px;max-width:260px" class="text-sm">${esc(d.campaign || (d.at ? '–' : ''))}</td>
      <td class="num text-right nowrap">${d.at ? money(d.margin) : '–'}</td><td>${stChip(r.st)}</td></tr>`; }).join('')}</tbody></table></div>
    ${list.length > 400 ? `<p class="text-xs text-muted mt-2">แสดง 400 คันแรก จาก ${list.length} คัน เลือกเดือนหรือค้นหาเพื่อดูคันอื่น</p>` : ''}`
    : `<div class="bg-surface border border-line rounded-lg">${emptyBox('ไม่มีรถในเงื่อนไขนี้', 'ลองเปลี่ยนเดือน สาขา หรือสถานะ')}</div>`}`;
}
RERENDER_ON_CHANGE.add('soQ');
Object.assign(ACTIONS, {
  'so-st'(el) { S.filters.soSt = el.dataset.k; render(); },
  // open the booking and bring the sale-terms box into view
  'so-open'(el) {
    ACTIONS['at-open'](el);
    setTimeout(() => {
      const box = [...document.querySelectorAll('[data-deal-box]')][0];
      if (box) box.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 60);
  }
});
