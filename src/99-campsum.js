
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
const rptModel = n => { const u = String(n || '').toUpperCase(); return u.startsWith('CITY HATCHBACK') ? 'CITY HATCHBACK' : (u.split(' ')[0] || '–'); };
const rptOptHead = o => { const t = String(o || '').replace(/\s+/g, ' ').trim(), m = t.match(/^(ทางเลือก(?:ที่)? ?\d+)\s*(.*)$/); return m ? { no: m[1], txt: m[2] } : { no: '', txt: t }; };
// campaign document → option → count per model
function rptPivot(rows) {
  const models = {}, camps = new Map();
  rows.forEach(r => {
    const m = rptModel(r.name); models[m] = (models[m] || 0) + 1;
    if (!camps.has(r.camp)) camps.set(r.camp, new Map());
    const og = camps.get(r.camp), k = (campNo(r.opt) || '') + '|' + campFeats(r.opt);
    if (!og.has(k)) og.set(k, { opt: r.opt, by: {}, n: 0, del: 0, adv: 0 });
    const o = og.get(k); o.by[m] = (o.by[m] || 0) + 1; o.n++; rptKind(r.st) === 'adv' ? o.adv++ : o.del++;
  });
  const cols = Object.keys(models).sort((a, b) => models[b] - models[a] || a.localeCompare(b));
  return { cols, camps: [...camps.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([camp, og]) => ({ camp, opts: [...og.values()].sort((a, b) => campNo(a.opt).localeCompare(campNo(b.opt))) })) };
}
function rptPivotTable(rows, pr) {
  const { cols, camps } = rptPivot(rows), sum = (arr, f) => arr.reduce((t, x) => t + f(x), 0), c = n => n ? n : '<span class="text-muted">–</span>';
  const head = `<thead><tr><th>ทางเลือก</th>${cols.map(m => `<th class="text-right">${esc(m)}</th>`).join('')}<th class="text-right">ส่งมอบ</th><th class="text-right">Advance</th><th class="text-right">รวม</th></tr></thead>`;
  let body = '';
  camps.forEach(g => {
    body += `<tr class="rpt-grp"><td colspan="${cols.length + 4}"><b>${esc(g.camp || '–')}</b></td></tr>`;
    g.opts.forEach(o => { const h = rptOptHead(o.opt); body += `<tr><td><b>${esc(h.no)}</b> ${esc(h.txt)}</td>${cols.map(m => `<td class="text-right num">${c(o.by[m] || 0)}</td>`).join('')}<td class="text-right num">${c(o.del)}</td><td class="text-right num">${c(o.adv)}</td><td class="text-right num"><b>${o.n}</b></td></tr>`; });
    if (g.opts.length > 1) body += `<tr class="rpt-sub"><td>รวม ${esc((g.camp || '').split(' ')[0])}</td>${cols.map(m => `<td class="text-right num">${c(sum(g.opts, o => o.by[m] || 0))}</td>`).join('')}<td class="text-right num">${c(sum(g.opts, o => o.del))}</td><td class="text-right num">${c(sum(g.opts, o => o.adv))}</td><td class="text-right num"><b>${sum(g.opts, o => o.n)}</b></td></tr>`;
  });
  const all = camps.flatMap(g => g.opts);
  body += `<tr class="rpt-tot"><td><b>รวมทั้งหมด</b></td>${cols.map(m => `<td class="text-right num"><b>${sum(all, o => o.by[m] || 0)}</b></td>`).join('')}<td class="text-right num"><b>${sum(all, o => o.del)}</b></td><td class="text-right num"><b>${sum(all, o => o.adv)}</b></td><td class="text-right num"><b>${rows.length}</b></td></tr>`;
  return `<div class="${pr ? '' : 'bg-surface border border-line rounded-lg overflow-x-auto'}"><table class="${pr ? '' : 'tbl'}">${head}<tbody>${body}</tbody></table></div>`;
}
// the checks against the web: one row per check, the VINs under it
function rptChecks(D, rep, rows, cmp) {
  const byVin = new Map();
  for (const a of D.at) { const v = atVin(a); if (v && !a.cancelled) byVin.set(String(v).toUpperCase(), a); }
  const optDiff = rows.filter(r => { const a = byVin.get(r.vin), d = a && a.rec && a.rec.deal; return d && d.campaign_id && d.campaign_id !== 'pending' && campFeats(d.campaign) !== campFeats(r.opt); });
  const delOk = cmp.delHonda - cmp.notInWeb.length, al = k => cmp.adv.filter(r => r.kind === k);
  const L = [
    ['Honda ระบุ "ส่งมอบ"', `${cmp.delHonda} คัน`, `เว็บยืนยันส่งมอบแล้ว ${delOk} คัน`, cmp.notInWeb.length ? 'warn' : 'good', cmp.notInWeb.length ? `ต่างกัน ${cmp.notInWeb.length}` : 'ตรง', cmp.notInWeb.map(r => ({ vin: r.vin, t: `${r.name} · Honda ส่งมอบ ${fmtD(rptIso(r.date))}` })), 'Honda แจ้งส่งมอบ แต่เว็บไม่มีส่งมอบในเดือนนี้'],
    ['ทางเลือกในไฟล์ต่างจากที่เลือกไว้ในเว็บ', `${optDiff.length} คัน`, 'เทียบเฉพาะคันที่ลงเงื่อนไขขายแล้ว', optDiff.length ? 'warn' : 'good', optDiff.length ? 'ต้องตรวจ' : 'ตรง', optDiff.map(r => { const d = byVin.get(r.vin).rec.deal; return { vin: r.vin, t: `${r.name} · ไฟล์: ${rptOptHead(r.opt).no} · เว็บ: ${d.campaign}` }; }), ''],
    ['เว็บเลือกแคมเปญและส่งมอบเดือนนี้ แต่ไม่อยู่ในไฟล์', `${cmp.notInHonda.length} คัน`, 'อาจลืมเบิกแคมเปญ', cmp.notInHonda.length ? 'warn' : 'good', cmp.notInHonda.length ? 'ต้องตรวจ' : 'ตรง', cmp.notInHonda.map(r => ({ vin: r.vin, t: `เว็บส่งมอบ ${fmtD(r.d)}` })), ''],
    ['ALLOCATED = Advance: มีลูกค้า รอกดส่งมอบ', `${al('wait').length} คัน`, 'ออกใบกำกับแล้ว ยังไม่ส่งมอบ', al('wait').length ? 'warn' : 'good', al('wait').length ? 'รอส่งมอบ' : '–', al('wait').map(r => ({ vin: r.vin, t: `${r.name} · ${r.cust}` })), ''],
    ['ALLOCATED = Advance: มีลูกค้า ส่งมอบเดือนถัดไปแล้ว', `${al('next').length} คัน`, '', 'good', al('next').length ? 'ปกติ' : '–', al('next').map(r => ({ vin: r.vin, t: `${r.name} · ${r.cust} · ส่งมอบ ${fmtD(r.dd)}` })), ''],
    ['ALLOCATED = Advance: ไม่มีลูกค้า', `${al('free').length} คัน`, 'Advance ลอย', 'muted', al('free').length ? 'Advance ลอย' : '–', al('free').map(r => ({ vin: r.vin, t: r.name })), ''],
    ['ALLOCATED แต่ส่งมอบแล้วในเดือนเดียวกัน / ไม่พบใบกำกับ', `${al('early').length + al('miss').length} คัน`, 'ผิดปกติ', al('early').length + al('miss').length ? 'bad' : 'good', al('early').length + al('miss').length ? 'ผิดปกติ' : 'ตรง', [...al('early'), ...al('miss')].map(r => ({ vin: r.vin, t: `${r.name} · ${r.kind === 'miss' ? 'ไม่พบใบกำกับ' : 'ส่งมอบ ' + fmtD(r.dd)}` })), '']
  ];
  return L;
}
function rptChecksTable(L, pr) {
  const rowsHtml = L.map(([t, n, note, tone, st, items]) => `<tr><td><b>${esc(t)}</b>${note ? `<div class="text-xs text-muted">${esc(note)}</div>` : ''}${items.length ? (pr ? `<div class="text-xs">${items.map(i => esc(i.vin + ' ' + i.t)).join('<br>')}</div>` : `<details class="mt-1"><summary class="text-xs cursor-pointer">ดูรายคัน (${items.length})</summary><div class="flex flex-col gap-1 mt-1 text-xs">${items.map(i => `<div>${vinLink({ vin: i.vin })} <span class="text-muted">${esc(i.t)}</span></div>`).join('')}</div></details>`) : ''}</td><td class="text-right num nowrap">${esc(n)}</td><td class="nowrap">${pr ? esc(st) : chip(st, tone)}</td></tr>`).join('');
  return `<div class="${pr ? '' : 'bg-surface border border-line rounded-lg overflow-x-auto'}"><table class="${pr ? '' : 'tbl'}"><thead><tr><th>รายการตรวจ</th><th class="text-right">จำนวน</th><th>ผล</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}
function rptNoneTable(D, rep, pr) {
  const g = campNoneRows(D, rep), list = [['รอเลือกแคมเปญ', g.pend], ['ลงเงื่อนไขแล้ว ไม่ระบุแคมเปญ', g.none], ['ส่งมอบเดือนนี้ ยังไม่ลงเงื่อนไขขาย', g.nodeal]];
  const n = list.reduce((t, [, a]) => t + a.length, 0);
  if (!n) return `<p class="text-sm text-muted">ไม่มีคันที่ยังไม่เลือกแคมเปญ</p>`;
  const tr = list.flatMap(([t, a]) => a.map(r => `<tr><td class="nowrap">${pr ? esc(t) : chip(t, 'warn')}</td><td>${pr ? esc(r.a.cust) : `<button type="button" class="underline text-left" data-act="at-open" data-id="${esc(r.a.id)}">${esc(r.a.cust)}</button>`}</td><td>${esc(r.a.br)}</td><td>${esc(r.a.model)} ${esc(gradeShort(r.a.model, r.a.grade))} ${esc(r.a.color || '')}</td><td>${r.vin ? (pr ? esc(r.vin) : vinLink({ vin: r.vin })) : '–'}</td></tr>`)).join('');
  return `<div class="${pr ? '' : 'bg-surface border border-line rounded-lg overflow-x-auto'}"><table class="${pr ? '' : 'tbl'}"><thead><tr><th>สถานะ</th><th>ลูกค้า</th><th>สาขา</th><th>รุ่น</th><th>เลขตัวถัง</th></tr></thead><tbody>${tr}</tbody></table></div>`;
}
function rptDetailTable(D, rows, pr) {
  const byVin = new Map();
  for (const a of D.at) { const v = atVin(a); if (v && !a.cancelled) byVin.set(String(v).toUpperCase(), a); }
  const tr = rows.map((r, i) => { const a = byVin.get(r.vin), d = a && a.rec && a.rec.deal, h = rptOptHead(r.opt), adv = rptKind(r.st) === 'adv';
    const chk = !d || !d.campaign_id ? '–' : d.campaign_id === 'pending' ? 'รอเลือก' : campFeats(d.campaign) === campFeats(r.opt) ? 'ตรง' : 'ต่าง';
    return `<tr><td class="num">${i + 1}</td><td>${esc(r.br || '')}</td><td>${esc(r.name)}</td><td>${pr ? esc(r.vin) : vinLink({ vin: r.vin })}</td><td>${a ? esc(a.cust) : '<span class="text-muted">–</span>'}</td><td class="nowrap">${esc(fmtD(rptIso(r.date)))}</td><td><b>${esc(h.no)}</b> <span class="text-xs">${esc(h.txt)}</span></td><td class="nowrap">${pr ? esc(adv ? 'ALLOCATED (Advance)' : r.st) : adv ? chip('Advance', 'warn') : chip(r.st || '–', 'good')}</td><td class="nowrap">${pr ? esc(chk) : chk === 'ตรง' ? chip(chk, 'good') : chk === 'ต่าง' ? chip(chk, 'warn') : chk}</td></tr>`; }).join('');
  return `<div class="${pr ? '' : 'bg-surface border border-line rounded-lg overflow-x-auto'}"><table class="${pr ? '' : 'tbl'}"><thead><tr><th>#</th><th>สาขา</th><th>รุ่น</th><th>เลขตัวถัง</th><th>ลูกค้า</th><th>ส่งมอบ</th><th>ทางเลือก</th><th>สถานะ</th><th>เทียบเว็บ</th></tr></thead><tbody>${tr}</tbody></table></div>`;
}
function rptKpi(rows, cmp, nNone) {
  const nDel = rows.filter(r => rptKind(r.st) === 'del').length, nAdv = rows.filter(r => rptKind(r.st) === 'adv').length;
  return [['ยอดแจ้งขายรวม', rows.length, ''], ['ส่งมอบ (DELIVERED)', nDel, ''], ['ALLOCATED = Advance', nAdv, `${cmp.adv.filter(r => r.kind === 'wait').length} รอส่งมอบ · ${cmp.adv.filter(r => r.kind === 'next').length} ส่งมอบเดือนถัดไป`], ['ยังไม่เลือกแคมเปญ', nNone, 'ในเว็บ']];
}
function rptNoneCount(D, rep) { const g = campNoneRows(D, rep); return g.pend.length + g.none.length + g.nodeal.length; }
function rptSheet(D, rep, rows, cmp) {
  const k = rptKpi(rows, cmp, rptNoneCount(D, rep));
  return `<div class="sheet"><h1>รายงานสรุปแคมเปญ Honda ${esc(rep)}</h1><p class="sub">AT Honda ${rptBr() ? esc(BR[rptBr()].name) : 'ทุกสาขา'} · พิมพ์ ${esc(fmtD(todayISO()))}</p>
  <table><tbody><tr>${k.map(([t, n]) => `<th>${esc(t)}</th><td>${n}</td>`).join('')}</tr></tbody></table>
  <h2>1. สรุปตามแคมเปญและทางเลือก (แยกรุ่น)</h2>${rptPivotTable(rows, true)}
  <h2>2. เทียบกับข้อมูลในเว็บ</h2>${rptChecksTable(rptChecks(D, rep, rows, cmp), true)}
  <h2>3. คันที่ยังไม่เลือกแคมเปญ</h2>${rptNoneTable(D, rep, true)}
  <h2>4. รายคัน</h2>${rptDetailTable(D, rows, true)}</div>`;
}
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
function viewCampSum(D) {
  const months = rptMonths(), rep = S.filters.rptRep && months.includes(S.filters.rptRep) ? S.filters.rptRep : months[0];
  if (!campUpCan()) return `${pageHead('รายงานสรุปแคมเปญ', '')}<p class="text-sm text-muted">เฉพาะแอดมินขึ้นไป</p>`;
  if (!rep) return `${pageHead('รายงานสรุปแคมเปญ', 'สรุปแคมเปญที่ Honda แจ้งขาย ตามไฟล์ Dealer Incentive Report')}${emptyBox('ยังไม่มียอดแจ้งขายที่บันทึกไว้', 'อัปโหลดไฟล์ที่หน้า เพิ่มเติม › อัปเดตแคมเปญ แล้วกดบันทึก')}<button class="btn btn-red mt-3" data-act="go" data-view="campup">ไปหน้าอัปเดตแคมเปญ</button>`;
  const rows = rptRows(rep), cmp = rptCompare(D, rep, rows), k = rptKpi(rows, cmp, rptNoneCount(D, rep));
  const sec = (t, sub, body) => `<section class="mb-6"><h3 class="font-head font-semibold">${t}</h3>${sub ? `<p class="text-xs text-muted mb-2">${sub}</p>` : '<div class="mb-2"></div>'}${body}</section>`;
  return `${pageHead('รายงานสรุปแคมเปญ', 'ยอดแจ้งขายตามไฟล์ Dealer Incentive Report ของ Honda เทียบกับข้อมูลในเว็บ')}
  <style>.rpt-grp td{background:var(--surface-2);}.rpt-sub td{font-weight:600;border-top:1px solid var(--line);}.rpt-tot td{background:var(--surface-2);border-top:2px solid var(--line);}</style>
  <div class="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg border border-line bg-surface">${myBranch() ? `<span class="text-sm">สาขา ${esc(myBranch())}</span>` : `<label class="text-sm" for="rpt-br">สาขา</label><select id="rpt-br" data-rpt-br><option value="">ทุกสาขา</option>${BRS.map(b => `<option value="${b}" ${rptBr() === b ? 'selected' : ''}>${b} ${esc(BR[b].name)}</option>`).join('')}</select>`}
    <label class="text-sm" for="rpt-rep">เดือนรายงาน</label><select id="rpt-rep" data-rpt-rep>${months.map(m => `<option ${m === rep ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
    <button class="btn btn-red btn-sm ml-auto" data-act="rpt-print">พิมพ์รายงาน</button></div>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">${k.map(([t, n, sub]) => `<div class="p-3 rounded-lg border border-line bg-surface"><div class="text-xs text-muted">${esc(t)}</div><div class="num text-2xl font-semibold">${n}</div>${sub ? `<div class="text-xs text-muted">${esc(sub)}</div>` : ''}</div>`).join('')}</div>
  ${sec('1. สรุปตามแคมเปญและทางเลือก', 'จำนวนคันแยกตามรุ่น ส่งมอบ และ Advance (ALLOCATED)', rptPivotTable(rows, false))}
  ${sec('2. เทียบกับข้อมูลในเว็บ', 'กด "ดูรายคัน" เพื่อดูรายการที่ต้องตรวจ แล้วกดเลข VIN เพื่อเปิดรายละเอียด', rptChecksTable(rptChecks(D, rep, rows, cmp), false))}
  ${sec('3. คันที่ยังไม่เลือกแคมเปญ', 'รอเลือกแคมเปญ · ไม่ระบุแคมเปญ · ส่งมอบเดือนนี้แต่ยังไม่ลงเงื่อนไขขาย', rptNoneTable(D, rep, false))}
  ${sec(`4. รายคัน (${rows.length})`, '', rptDetailTable(D, rows, false))}`;
}
document.addEventListener('change', ev => { const t = ev.target; if (t && t.dataset && t.dataset.rptRep !== undefined) { S.filters.rptRep = t.value; render(); } else if (t && t.dataset && t.dataset.rptBr !== undefined) { S.filters.rptBr = t.value; S.filters.rptRep = ''; render(); } });
Object.assign(ACTIONS, {
  'rpt-print'() {
    const months = rptMonths(), rep = S.filters.rptRep && months.includes(S.filters.rptRep) ? S.filters.rptRep : months[0]; if (!rep) return;
    const rows = rptRows(rep);
    let root = document.getElementById('print-root'); if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
    const D = derive(); root.innerHTML = rptSheet(D, rep, rows, rptCompare(D, rep, rows));
    try { window.print(); } catch (e) { toast('เปิดหน้าพิมพ์ไม่ได้ ใช้ "บันทึกเป็น PDF" แทน', 'bad'); }
  }
});
