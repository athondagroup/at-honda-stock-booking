
// ---------- รายงานสรุปแคมเปญ (ขอ 26/10): the Honda Dealer Incentive Report saved per VIN, by month
// ALLOCATED in the Honda file means the same as an Advance car (invoiced to the dealer, not yet handed to the customer).
// The report is compared with what the web knows: delivered (IDS DL / handed over here) and Advance cars.
const rptMonth = rep => { const m = String(rep || '').match(/(\d{2})\/(\d{4})/); return m ? m[2] + '-' + m[1] : ''; };
const rptIso = d => { const t = String(d || ''); return /^\d{8}$/.test(t) ? t.slice(0, 4) + '-' + t.slice(4, 6) + '-' + t.slice(6) : t.slice(0, 10); };
const rptKind = st => /ALLOC/i.test(st || '') ? 'adv' : /DELIV/i.test(st || '') ? 'del' : 'other';
const rptBr = () => myBranch() || S.filters.rptBr || '';
function rptMonths() { return [...new Set(Object.values(rptAll()).filter(r => !rptBr() || r.br === rptBr()).map(r => r.rep).filter(Boolean))].sort((a, b) => rptMonth(b).localeCompare(rptMonth(a))); }
function rptRows(rep) { return Object.entries(rptAll()).filter(([, r]) => r.rep === rep && (!rptBr() || r.br === rptBr())).map(([vin, r]) => ({ vin, ...r })).sort((a, b) => (a.camp + a.opt).localeCompare(b.camp + b.opt) || a.name.localeCompare(b.name)); }
// what the web knows for the same month
function rptWeb(D, ym) {
  const del = new Map();
  const br = rptBr();
  (D.X.inv || []).forEach(i => { if (i.vin && !i.company && i.ddate && i.ddate.slice(0, 7) === ym && (!br || !i.br || i.br === br)) del.set(String(i.vin).toUpperCase(), i.ddate); });
  (D.deliveredOut || []).forEach(c => { const d = c.handed && c.handed.date; if (c.vin && d && String(d).slice(0, 7) === ym && (!br || !c.br || c.br === br)) del.set(String(c.vin).toUpperCase(), String(d).slice(0, 10)); });
  return { del, adv: v => !!(advRec(v) || (D.cars.get(v) && D.cars.get(v).advance)) };
}
function rptCompare(D, rep, rows) {
  const ym = rptMonth(rep), w = rptWeb(D, ym), withDeal = new Set(D.at.filter(a => a.rec && a.rec.deal && a.rec.deal.campaign_id && !a.cancelled && atVin(a)).map(a => String(atVin(a)).toUpperCase())), H = { del: rows.filter(r => rptKind(r.st) === 'del'), adv: rows.filter(r => rptKind(r.st) === 'adv') };
  const hd = new Set(H.del.map(r => r.vin));
  return {
    delHonda: H.del.length, delWeb: w.del.size, advHonda: H.adv.length,
    notInWeb: H.del.filter(r => !w.del.has(r.vin)),                                  // Honda says delivered, the web has no delivery in that month
    notInHonda: [...w.del.entries()].filter(([v]) => withDeal.has(v) && !hd.has(v) && !H.adv.some(r => r.vin === v)).map(([vin, d]) => ({ vin, d })),   // delivered in the web, not reported
    // ALLOCATED = Advance = invoiced, not handed over: with a customer (waiting to deliver / delivered next month) or without a customer
    adv: H.adv.map(r => {
      const i = D.invByVin.get(r.vin), cust = i && i.cust ? i.cust : '', dd = i && i.ddate ? String(i.ddate).slice(0, 10) : '', next = dd && dd.slice(0, 7) > ym;
      const kind = !i ? 'miss' : dd && !next ? 'early' : cust ? (next ? 'next' : 'wait') : 'free';
      return { ...r, cust, dd, kind, web: w.adv(r.vin) };
    })
  };
}
function rptGroups(rows) {
  const g = new Map();
  rows.forEach(r => { const k = r.camp + '||' + (campNo(r.opt) || '') + '||' + campFeats(r.opt); if (!g.has(k)) g.set(k, { camp: r.camp, opt: r.opt, n: 0, del: 0, adv: 0, models: new Map() }); const x = g.get(k); x.n++; rptKind(r.st) === 'adv' ? x.adv++ : x.del++; x.models.set(r.name, (x.models.get(r.name) || 0) + 1); });
  return [...g.values()].sort((a, b) => a.camp.localeCompare(b.camp) || campNo(a.opt).localeCompare(campNo(b.opt)));
}
function rptSheet(rep, rows, cmp) {
  const gs = rptGroups(rows);
  return `<div class="sheet"><h1>สรุปแคมเปญ Honda ${esc(rep)}</h1><p class="sub">AT Honda ${rptBr() ? esc(BR[rptBr()].name) : 'ทุกสาขา'} · ยอดแจ้งขาย ${rows.length} คัน (ส่งมอบ ${rows.filter(r => rptKind(r.st) === 'del').length} · ALLOCATED/Advance ${rows.filter(r => rptKind(r.st) === 'adv').length})</p>
  <h2>สรุปตามแคมเปญและทางเลือก</h2><table><thead><tr><th>แคมเปญ</th><th>ทางเลือก</th><th>รวม</th><th>ส่งมอบ</th><th>Advance</th></tr></thead><tbody>${gs.map(g => `<tr><td>${esc(g.camp)}</td><td>${esc(g.opt)}</td><td>${g.n}</td><td>${g.del}</td><td>${g.adv}</td></tr>`).join('')}</tbody></table>
  <h2>รายคัน</h2><table><thead><tr><th>#</th><th>รุ่น</th><th>เลขตัวถัง</th><th>สาขา</th><th>ส่งมอบ</th><th>ทางเลือก</th><th>สถานะ</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${esc(r.vin)}</td><td>${esc(r.br || '')}</td><td>${esc(fmtD(rptIso(r.date)))}</td><td>${esc(r.opt)}</td><td>${esc(rptKind(r.st) === 'adv' ? 'ALLOCATED (Advance)' : r.st)}</td></tr>`).join('')}</tbody></table>
  ${cmp ? `<h2>เทียบกับยอดจริงในเว็บ</h2><table><tbody><tr><th>Honda แจ้งส่งมอบ</th><td>${cmp.delHonda}</td><th>เว็บส่งมอบในเดือน</th><td>${cmp.delWeb}</td></tr><tr><th>ALLOCATED: มีลูกค้ารอส่งมอบ / ส่งมอบเดือนถัดไป / ไม่มีลูกค้า</th><td>${cmp.adv.filter(r => r.kind === 'wait').length} / ${cmp.adv.filter(r => r.kind === 'next').length} / ${cmp.adv.filter(r => r.kind === 'free').length}</td><th>Honda แจ้งแต่เว็บไม่มี</th><td>${cmp.notInWeb.length}</td></tr><tr><th></th><td></td><th>เว็บเลือกแคมเปญแต่ไม่อยู่ในไฟล์</th><td>${cmp.notInHonda.length}</td></tr></tbody></table>` : ''}</div>`;
}
// cars whose campaign is not chosen: "รอเลือกแคมเปญ", no campaign at all on the terms, or delivered this month with no terms keyed
function campNoneRows(D, rep) {
  const br = rptBr(), w = rptWeb(D, rptMonth(rep)), out = { pend: [], none: [], nodeal: [] };
  for (const a of D.at) {
    if (a.cancelled || (br && a.br !== br)) continue;
    const d = a.rec && a.rec.deal, vin = atVin(a) ? String(atVin(a)).toUpperCase() : '';
    if (d && d.at) { if (d.campaign_id === 'pending') out.pend.push({ a, vin }); else if (!d.campaign_id) out.none.push({ a, vin }); }
    else if (vin && w.del.has(vin)) out.nodeal.push({ a, vin });
  }
  return out;
}
function campNoneBox(D, rep) {
  const g = campNoneRows(D, rep), row = r => `<div class="flex flex-wrap items-center gap-2"><button type="button" class="underline text-left" data-act="at-open" data-id="${esc(r.a.id)}">${esc(r.a.cust)}</button><span class="text-xs text-muted">${esc(r.a.br)} · ${esc(r.a.model)} ${esc(gradeShort(r.a.model, r.a.grade))} ${esc(r.a.color || '')}</span>${r.vin ? vinLink({ vin: r.vin }) : '<span class="text-xs text-muted">ยังไม่มี VIN</span>'}</div>`;
  const sec = (t, arr, note) => `<details class="mb-2 bg-surface border border-line rounded-lg p-3" ${arr.length ? 'open' : ''}><summary class="text-sm cursor-pointer"><b>${t}</b> ${chip(String(arr.length), arr.length ? 'warn' : 'good')}</summary>${note ? `<div class="text-xs text-muted mt-1">${note}</div>` : ''}${arr.length ? `<div class="mt-2 flex flex-col gap-1 text-sm">${arr.map(row).join('')}</div>` : ''}</details>`;
  return `<h3 class="font-head font-semibold mt-4 mb-2">คันที่ยังไม่เลือกแคมเปญ</h3>
  ${sec('เลือกว่า "รอเลือกแคมเปญ"', g.pend, 'ลงเงื่อนไขขายแล้วแต่ยังไม่ตัดสินใจ กดเปิดใบจองเพื่อเลือกแคมเปญ')}
  ${sec('ลงเงื่อนไขขายแล้ว แต่ไม่ระบุแคมเปญ', g.none)}
  ${sec('ส่งมอบเดือนนี้ แต่ยังไม่ลงเงื่อนไขการขาย (ไม่มีแคมเปญ)', g.nodeal)}`;
}
function viewCampSum(D) {
  const months = rptMonths(), rep = S.filters.rptRep && months.includes(S.filters.rptRep) ? S.filters.rptRep : months[0];
  if (!campUpCan()) return `${pageHead('รายงานสรุปแคมเปญ', '')}<p class="text-sm text-muted">เฉพาะแอดมินขึ้นไป</p>`;
  if (!rep) return `${pageHead('รายงานสรุปแคมเปญ', 'สรุปแคมเปญที่ Honda แจ้งขาย ตามไฟล์ Dealer Incentive Report')}${emptyBox('ยังไม่มียอดแจ้งขายที่บันทึกไว้', 'อัปโหลดไฟล์ที่หน้า เพิ่มเติม › อัปเดตแคมเปญ แล้วกดบันทึก')}<button class="btn btn-red mt-3" data-act="go" data-view="campup">ไปหน้าอัปเดตแคมเปญ</button>`;
  const rows = rptRows(rep), cmp = rptCompare(D, rep, rows), gs = rptGroups(rows), nDel = rows.filter(r => rptKind(r.st) === 'del').length, nAdv = rows.filter(r => rptKind(r.st) === 'adv').length;
  const list = (title, arr, f) => `<details class="mb-2 bg-surface border border-line rounded-lg p-3" ${arr.length ? 'open' : ''}><summary class="text-sm cursor-pointer"><b>${title}</b> ${chip(String(arr.length), arr.length ? 'warn' : 'good')}</summary>${arr.length ? `<div class="mt-2 flex flex-col gap-1 text-sm">${arr.map(f).join('')}</div>` : '<div class="text-xs text-muted mt-1">ตรงกันทั้งหมด</div>'}</details>`;
  return `${pageHead('รายงานสรุปแคมเปญ', 'สรุปแคมเปญที่ Honda แจ้งขาย ตามไฟล์ Dealer Incentive Report ที่บันทึกไว้ เทียบกับยอดจริงในเว็บ พิมพ์เป็นรายเดือนได้')}
  <div class="flex flex-wrap items-center gap-2 mb-4">${myBranch() ? `<span class="text-sm">สาขา ${esc(myBranch())}</span>` : `<label class="text-sm" for="rpt-br">สาขา</label><select id="rpt-br" data-rpt-br><option value="">ทุกสาขา</option>${BRS.map(b => `<option value="${b}" ${rptBr() === b ? 'selected' : ''}>${b} ${esc(BR[b].name)}</option>`).join('')}</select>`}<label class="text-sm" for="rpt-rep">เดือนรายงาน</label><select id="rpt-rep" data-rpt-rep>${months.map(m => `<option ${m === rep ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
    <button class="btn btn-red btn-sm ml-auto" data-act="rpt-print">พิมพ์รายงาน</button></div>
  <div class="grid grid-cols-3 gap-2 mb-4"><div class="p-3 rounded-lg border border-line bg-surface"><div class="text-xs text-muted">ยอดแจ้งขายรวม</div><div class="num text-xl font-semibold">${rows.length}</div></div><div class="p-3 rounded-lg border border-line bg-surface"><div class="text-xs text-muted">ส่งมอบ (DELIVERED)</div><div class="num text-xl font-semibold">${nDel}</div></div><div class="p-3 rounded-lg border border-line bg-surface"><div class="text-xs text-muted">ALLOCATED = Advance</div><div class="num text-xl font-semibold">${nAdv}</div></div></div>
  <h3 class="font-head font-semibold mb-2">เทียบกับยอดจริงในเว็บ</h3>
  <p class="text-sm text-muted mb-2">ไฟล์นี้คือแคมเปญที่ขอเบิก ไม่ใช่ใบส่งมอบ จึงเทียบเฉพาะคันที่เกี่ยวกับแคมเปญ · Honda ระบุส่งมอบ ${cmp.delHonda} คัน · เว็บมีส่งมอบทุกคันในเดือน ${cmp.delWeb} คัน</p>
  ${list('Honda แจ้งส่งมอบ แต่เว็บไม่มีส่งมอบในเดือนนี้', cmp.notInWeb, r => `<div>${vinLink({ vin: r.vin })} <span class="text-xs text-muted">${esc(r.name)} · Honda ส่งมอบ ${esc(fmtD(rptIso(r.date)))}</span></div>`)}
  ${list('เว็บเลือกแคมเปญไว้และส่งมอบเดือนนี้ แต่ไม่อยู่ในไฟล์แคมเปญ', cmp.notInHonda, r => `<div>${vinLink({ vin: r.vin })} <span class="text-xs text-muted">เว็บส่งมอบ ${esc(fmtD(r.d))}</span></div>`)}
  <h4 class="font-medium text-sm mt-3 mb-1">ALLOCATED = Advance (ออกใบกำกับแล้ว ยังไม่ส่งมอบ) ${cmp.adv.length} คัน</h4>
  ${[['wait', 'มีลูกค้า รอกดส่งมอบ', 'warn'], ['next', 'มีลูกค้า ส่งมอบเดือนถัดไปแล้ว', 'good'], ['free', 'ไม่มีลูกค้า (Advance ลอย)', 'muted'], ['early', 'ส่งมอบในเดือนเดียวกัน แต่ Honda ยังแจ้ง ALLOCATED', 'bad'], ['miss', 'ไม่พบใบกำกับของ VIN นี้ในเว็บ', 'bad']].map(([k, t, tone]) => { const arr = cmp.adv.filter(r => r.kind === k); return arr.length ? `<details class="mb-2 bg-surface border border-line rounded-lg p-3" open><summary class="text-sm cursor-pointer"><b>${t}</b> ${chip(String(arr.length), tone)}</summary><div class="mt-2 flex flex-col gap-1 text-sm">${arr.map(r => `<div>${vinLink({ vin: r.vin })} <span class="text-xs text-muted">${esc(r.name)}${r.cust ? ' · ' + esc(r.cust) : ''}${r.dd ? ' · ส่งมอบ ' + esc(fmtD(r.dd)) : ''}</span></div>`).join('')}</div></details>` : ''; }).join('')}
  ${campNoneBox(D, rep)}
  <h3 class="font-head font-semibold mt-4 mb-2">สรุปตามแคมเปญและทางเลือก</h3>
  <div class="bg-surface border border-line rounded-lg overflow-x-auto"><table class="tbl"><thead><tr><th>แคมเปญ</th><th>ทางเลือก</th><th class="text-right">รวม</th><th class="text-right">ส่งมอบ</th><th class="text-right">Advance</th></tr></thead><tbody>${gs.map(g => `<tr><td class="text-xs">${esc(g.camp)}</td><td>${esc(g.opt)}<div class="text-xs text-muted">${[...g.models].map(([k, v]) => esc(k) + ' ' + v).join(' · ')}</div></td><td class="text-right num">${g.n}</td><td class="text-right num">${g.del}</td><td class="text-right num">${g.adv}</td></tr>`).join('')}</tbody></table></div>
  <h3 class="font-head font-semibold mt-4 mb-2">รายคัน (${rows.length})</h3>
  <div class="bg-surface border border-line rounded-lg overflow-x-auto"><table class="tbl"><thead><tr><th>รุ่น</th><th>เลขตัวถัง</th><th>ส่งมอบ</th><th>ทางเลือก</th><th>สถานะ</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${vinLink({ vin: r.vin })}</td><td class="nowrap">${esc(fmtD(rptIso(r.date)))}</td><td class="text-xs">${esc(r.opt)}</td><td>${rptKind(r.st) === 'adv' ? chip('ALLOCATED (Advance)', 'warn') : chip(r.st || '–', 'good')}</td></tr>`).join('')}</tbody></table></div>`;
}
document.addEventListener('change', ev => { const t = ev.target; if (t && t.dataset && t.dataset.rptRep !== undefined) { S.filters.rptRep = t.value; render(); } else if (t && t.dataset && t.dataset.rptBr !== undefined) { S.filters.rptBr = t.value; S.filters.rptRep = ''; render(); } });
Object.assign(ACTIONS, {
  'rpt-print'() {
    const months = rptMonths(), rep = S.filters.rptRep && months.includes(S.filters.rptRep) ? S.filters.rptRep : months[0]; if (!rep) return;
    const rows = rptRows(rep);
    let root = document.getElementById('print-root'); if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
    root.innerHTML = rptSheet(rep, rows, rptCompare(derive(), rep, rows));
    try { window.print(); } catch (e) { toast('เปิดหน้าพิมพ์ไม่ได้ ใช้ "บันทึกเป็น PDF" แทน', 'bad'); }
  }
});
