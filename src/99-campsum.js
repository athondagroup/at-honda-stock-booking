
// ---------- รายงานสรุปแคมเปญ (ขอ 26/10): the Honda Dealer Incentive Report saved per VIN, by month
// ALLOCATED in the Honda file means the same as an Advance car (invoiced to the dealer, not yet handed to the customer).
// The report is compared with what the web knows: delivered (IDS DL / handed over here) and Advance cars.
const rptMonth = rep => { const m = String(rep || '').match(/(\d{2})\/(\d{4})/); return m ? m[2] + '-' + m[1] : ''; };
const rptIso = d => { const t = String(d || ''); return /^\d{8}$/.test(t) ? t.slice(0, 4) + '-' + t.slice(4, 6) + '-' + t.slice(6) : t.slice(0, 10); };
const rptKind = st => /ALLOC/i.test(st || '') ? 'adv' : /DELIV/i.test(st || '') ? 'del' : 'other';
const rptBr = () => myBranch() || S.filters.rptBr || '';
const rptPayAll = () => (S.ref.get('honda_pay') || {}).v || {};
const rptKeyOf = rep => rptMonth(rep);
function rptMonths() {
  const set = new Set();
  Object.values(rptAll()).forEach(r => { if (r.rep && (!rptBr() || r.br === rptBr())) set.add(r.rep); });
  Object.values(rptPayAll()).forEach(r => { if (r.per && (!rptBr() || r.br === rptBr())) set.add(fmtM(r.per)); });
  return [...set].sort((a, b) => rptMonth(b).localeCompare(rptMonth(a)));
}
// one row per VIN for the month: the Dealer Incentive Report (status, date) merged with the payout files (baht, special campaigns)
function rptRows(rep) {
  const pay = rptPayAll(), by = new Map();
  Object.entries(rptAll()).forEach(([vin, r]) => { if (r.rep === rep && (!rptBr() || r.br === rptBr())) by.set(vin, { vin, ...r, opt: fixTh(r.opt), hasDir: true }); });
  Object.entries(pay).forEach(([vin, p]) => {
    if (fmtM(p.per) !== rep || (rptBr() && p.br !== rptBr())) return;
    const r = by.get(vin) || { vin, br: p.br, name: p.model || '', camp: p.camp || '', opt: fixTh(p.opt || ''), st: '', date: '', hasDir: false };
    if (p.opt_adj) { r.opt = fixTh(p.opt_adj); r.optAdj = true; }
    r.hasPay = true; r.pay = Number(p.amt) || 0; r.acts = p.acts || []; r.actAmt = r.acts.reduce((t, x) => t + (Number(x.amt) || 0), 0);
    if (!r.name) r.name = p.model || ''; if (!r.opt) { r.opt = fixTh(p.opt || ''); r.camp = r.camp || p.camp || ''; }
    by.set(vin, r);
  });
  // a car with no baht in Honda's money file but a campaign picked in this report: the campaign table's money counts as an estimate (est)
  const picks = (S.ref.get('honda_pay') || {}).picks || {};
  return [...by.values()].map(r => { const pk = !r.pay && picks[r.vin], est = pk ? Number(pk.sup) || 0 : 0; return { ...r, pay: r.pay || 0, est, actAmt: r.actAmt || 0, acts: r.acts || [], tot: (r.pay || 0) + est + (r.actAmt || 0) }; }).sort((a, b) => (a.camp + a.opt).localeCompare(b.camp + b.opt) || (a.name || '').localeCompare(b.name || ''));
}
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
const rptOptHead = o => { const t = fixTh(o).replace(/\s+/g, ' ').trim(), m = t.match(/^(ทางเลือก(?:ที่)? ?\d+)\s*(.*)$/); return m ? { no: m[1], txt: m[2] } : { no: '', txt: t }; };
const rptKinds = r => rptKind(r.st) === 'adv' ? 'adv' : 'del';
const sumBy = (arr, f) => arr.reduce((t, x) => t + (Number(f(x)) || 0), 0);
// campaign document → option → count per model
function rptPivot(rows) {
  rows = rows.filter(r => r.opt);
  const models = {}, camps = new Map();
  rows.forEach(r => {
    const m = rptModel(r.name); models[m] = (models[m] || 0) + 1;
    if (!camps.has(r.camp)) camps.set(r.camp, new Map());
    const og = camps.get(r.camp), k = (campNo(r.opt) || '') + '|' + campFeats(r.opt);
    if (!og.has(k)) og.set(k, { opt: r.opt, by: {}, n: 0, del: 0, adv: 0 });
    const o = og.get(k); o.by[m] = (o.by[m] || 0) + 1; o.n++; rptKinds(r) === 'adv' ? o.adv++ : o.del++;
  });
  const cols = Object.keys(models).sort((a, b) => models[b] - models[a] || a.localeCompare(b));
  return { cols, n: rows.length, camps: [...camps.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([camp, og]) => ({ camp, opts: [...og.values()].sort((a, b) => campNo(a.opt).localeCompare(campNo(b.opt))) })) };
}
function rptPivotTable(rows, pr) {
  const { cols, camps, n } = rptPivot(rows), c = v => v ? v : '<span class="text-muted">–</span>';
  const head = `<thead><tr><th>ทางเลือก</th>${cols.map(m => `<th class="text-right">${esc(m)}</th>`).join('')}<th class="text-right">ส่งมอบ</th><th class="text-right">Advance</th><th class="text-right">รวม</th></tr></thead>`;
  let body = '';
  camps.forEach(g => {
    body += `<tr class="rpt-grp"><td colspan="${cols.length + 4}"><b>${esc(g.camp || '–')}</b></td></tr>`;
    g.opts.forEach(o => { const h = rptOptHead(o.opt); h.txt = h.txt.replace(/\s*ดาวน์ ?\d+%.*$/, ''); body += `<tr><td>${pr ? '<b>' + esc(h.no) + '</b> ' + esc(h.txt) : optTip(o.opt)}</td>${cols.map(m => `<td class="text-right num">${c(o.by[m] || 0)}</td>`).join('')}<td class="text-right num">${c(o.del)}</td><td class="text-right num">${c(o.adv)}</td><td class="text-right num"><b>${o.n}</b></td></tr>`; });
    if (g.opts.length > 1) body += `<tr class="rpt-sub"><td>รวม ${esc((g.camp || '').split(' ')[0])}</td>${cols.map(m => `<td class="text-right num">${c(sumBy(g.opts, o => o.by[m] || 0))}</td>`).join('')}<td class="text-right num">${c(sumBy(g.opts, o => o.del))}</td><td class="text-right num">${c(sumBy(g.opts, o => o.adv))}</td><td class="text-right num"><b>${sumBy(g.opts, o => o.n)}</b></td></tr>`;
  });
  const all = camps.flatMap(g => g.opts);
  body += `<tr class="rpt-tot"><td><b>รวมทั้งหมด</b></td>${cols.map(m => `<td class="text-right num"><b>${sumBy(all, o => o.by[m] || 0)}</b></td>`).join('')}<td class="text-right num"><b>${sumBy(all, o => o.del)}</b></td><td class="text-right num"><b>${sumBy(all, o => o.adv)}</b></td><td class="text-right num"><b>${n}</b></td></tr>`;
  return `<div class="${pr ? '' : 'bg-surface border border-line rounded-lg overflow-x-auto'}"><table class="${pr ? '' : 'tbl'}">${head}<tbody>${body}</tbody></table></div>`;
}
// the checks against the web: one row per check, the VINs under it
function rptChecks(D, rep, rowsAll, cmp) {
  const rows = rowsAll.filter(r => r.hasDir), byVin = new Map();
  for (const a of D.at) { const v = atVin(a); if (v && !a.cancelled) byVin.set(String(v).toUpperCase(), a); }
  const optDiff = rows.filter(r => { const a = byVin.get(r.vin), d = a && a.rec && a.rec.deal; return d && d.campaign_id && d.campaign_id !== 'pending' && campFeats(d.campaign) !== campFeats(r.opt); });
  const delOk = cmp.delHonda - cmp.notInWeb.length, al = k => cmp.adv.filter(r => r.kind === k), bad = al('early').length + al('miss').length;
  return [
    ['Honda ระบุ "ส่งมอบ"', `${cmp.delHonda} คัน`, `เว็บยืนยันส่งมอบแล้ว ${delOk} คัน`, cmp.notInWeb.length ? 'warn' : 'good', cmp.notInWeb.length ? `ต่างกัน ${cmp.notInWeb.length}` : 'ตรง', cmp.notInWeb.map(r => ({ vin: r.vin, t: `${r.name} · Honda ส่งมอบ ${fmtD(rptIso(r.date))}` })), 'Honda แจ้งส่งมอบ แต่เว็บไม่มีส่งมอบในเดือนนี้'],
    ['ทางเลือกในไฟล์ต่างจากที่เลือกไว้ในเว็บ', `${optDiff.length} คัน`, 'เทียบเฉพาะคันที่ลงเงื่อนไขขายแล้ว', optDiff.length ? 'warn' : 'good', optDiff.length ? 'ต้องตรวจ' : 'ตรง', optDiff.map(r => { const d = byVin.get(r.vin).rec.deal; return { vin: r.vin, t: `${r.name} · ไฟล์: ${rptOptHead(r.opt).no} · เว็บ: ${d.campaign}` }; }), ''],
    ['เว็บเลือกแคมเปญและส่งมอบเดือนนี้ แต่ไม่อยู่ในไฟล์', `${cmp.notInHonda.length} คัน`, 'อาจลืมเบิกแคมเปญ', cmp.notInHonda.length ? 'warn' : 'good', cmp.notInHonda.length ? 'ต้องตรวจ' : 'ตรง', cmp.notInHonda.map(r => ({ vin: r.vin, t: `เว็บส่งมอบ ${fmtD(r.d)}` })), ''],
    ['ALLOCATED = Advance: มีลูกค้า รอกดส่งมอบ', `${al('wait').length} คัน`, 'ออกใบกำกับแล้ว ยังไม่ส่งมอบ', al('wait').length ? 'warn' : 'good', al('wait').length ? 'รอส่งมอบ' : '–', al('wait').map(r => ({ vin: r.vin, t: `${r.name} · ${r.cust}` })), ''],
    ['ALLOCATED = Advance: มีลูกค้า ส่งมอบเดือนถัดไปแล้ว', `${al('next').length} คัน`, '', 'good', al('next').length ? 'ปกติ' : '–', al('next').map(r => ({ vin: r.vin, t: `${r.name} · ${r.cust} · ส่งมอบ ${fmtD(r.dd)}` })), ''],
    ['ALLOCATED = Advance: ไม่มีลูกค้า', `${al('free').length} คัน`, 'Advance ลอย', 'muted', al('free').length ? 'Advance ลอย' : '–', al('free').map(r => ({ vin: r.vin, t: r.name })), ''],
    ['ALLOCATED แต่ส่งมอบแล้วในเดือนเดียวกัน / ไม่พบใบกำกับ', `${bad} คัน`, 'ผิดปกติ', bad ? 'bad' : 'good', bad ? 'ผิดปกติ' : 'ตรง', [...al('early'), ...al('miss')].map(r => ({ vin: r.vin, t: `${r.name} · ${r.kind === 'miss' ? 'ไม่พบใบกำกับ' : 'ส่งมอบ ' + fmtD(r.dd)}` })), '']
  ];
}
function rptChecksTable(L, pr) {
  const rowsHtml = L.map(([t, n, note, tone, st, items]) => `<tr><td><b>${esc(t)}</b>${note ? `<div class="text-xs text-muted">${esc(note)}</div>` : ''}${items.length ? (pr ? `<div class="text-xs">${items.map(i => esc(i.vin + ' ' + i.t)).join('<br>')}</div>` : `<details class="mt-1"><summary class="text-xs cursor-pointer">ดูรายคัน (${items.length})</summary><div class="flex flex-col gap-1 mt-1 text-xs">${items.map(i => `<div>${vinLink({ vin: i.vin })} <span class="text-muted">${esc(i.t)}</span></div>`).join('')}</div></details>`) : ''}</td><td class="text-right num nowrap">${esc(n)}</td><td class="nowrap">${pr ? esc(st) : chip(st, tone)}</td></tr>`).join('');
  return `<div class="${pr ? '' : 'bg-surface border border-line rounded-lg overflow-x-auto'}"><table class="${pr ? '' : 'tbl'}"><thead><tr><th>รายการตรวจ</th><th class="text-right">จำนวน</th><th>ผล</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
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
function rptNoneCount(D, rep) { const g = campNoneRows(D, rep); return g.pend.length + g.none.length + g.nodeal.length; }
// the same chooser as the per-car list: a row from the report when the car is in Honda's file, else a bare row with the VIN
function rptNoneChoose(r, D, rows, pr) {
  if (!r.vin) return '<span class="text-muted">ไม่มี VIN</span>';
  const row = (rows || []).find(x => x.vin === r.vin) || { vin: r.vin, opt: (rptAll()[r.vin] || {}).opt || '', camp: (rptAll()[r.vin] || {}).camp || '', name: r.a.model || '', hasPay: false, pay: 0, st: '' };
  return rptMoneyCheck(row, r.a, D, pr).html;
}
function rptNoneTable(D, rep, pr, rows) {
  const g = campNoneRows(D, rep), list = [['รอเลือกแคมเปญ', g.pend], ['ลงเงื่อนไขแล้ว ไม่ระบุแคมเปญ', g.none], ['ส่งมอบเดือนนี้ ยังไม่ลงเงื่อนไขขาย', g.nodeal]];
  if (!list.some(([, a]) => a.length)) return `<p class="text-sm text-muted">ไม่มีคันที่ยังไม่เลือกแคมเปญ</p>`;
  const tr = list.flatMap(([t, a]) => a.map(r => `<tr><td class="nowrap">${pr ? esc(t) : chip(t, 'warn')}</td><td>${pr ? esc(r.a.cust) : `<button type="button" class="underline text-left" data-act="at-open" data-id="${esc(r.a.id)}">${esc(r.a.cust)}</button>`}</td><td>${esc(r.a.br)}</td><td>${esc(r.a.model)} ${esc(gradeShort(r.a.model, r.a.grade))} ${esc(r.a.color || '')}</td><td>${r.vin ? (pr ? esc(r.vin) : vinLink({ vin: r.vin })) : '–'}</td><td style="min-width:240px">${rptNoneChoose(r, D, rows, pr)}</td></tr>`)).join('');
  return `<div class="${pr ? '' : 'bg-surface border border-line rounded-lg overflow-x-auto'}"><table class="${pr ? '' : 'tbl'}"><thead><tr><th>สถานะ</th><th>ลูกค้า</th><th>สาขา</th><th>รุ่น</th><th>เลขตัวถัง</th><th>เลือกแคมเปญ</th></tr></thead><tbody>${tr}</tbody></table></div>`;
}
// ---- charts: plain bars (no library), by branch when all branches are shown, by model when one branch is picked
// items carry n (cars); hovering a bar or a part shows the number of cars
function rptBars(title, items, segs, fmt) {
  const max = Math.max(1, ...items.map(i => sumBy(segs, s => i[s.k] || 0)));
  return `<div class="p-3 rounded-lg border border-line bg-surface"><div class="text-sm font-medium mb-2">${esc(title)}</div>
    <div class="flex flex-col gap-2">${items.map(i => { const tot = sumBy(segs, s => i[s.k] || 0); const tip = `${i.label} · ${i.n || 0} คัน`; return `<div class="flex items-center gap-2" title="${esc(tip)}"><div class="w-24 shrink-0 text-xs truncate" title="${esc(tip)}">${esc(i.label)}</div><div class="flex-1 min-w-0 flex h-5 rounded overflow-hidden" style="background:var(--surface-2)">${segs.map(s => (i[s.k] || 0) ? `<div style="width:${(i[s.k] / max * 100).toFixed(1)}%;background:${s.c}" title="${esc(i.label + ' · ' + s.n + ' ' + fmt(i[s.k]) + (i['n_' + s.k] !== undefined ? ' · ' + i['n_' + s.k] + ' คัน' : ' · ' + (i.n || 0) + ' คัน'))}"></div>` : '').join('')}</div><div class="w-20 shrink-0 text-right text-xs num" title="${esc(tip)}">${fmt(tot)}</div></div>`; }).join('')}</div>
    <div class="flex flex-wrap gap-3 mt-2 text-xs text-muted">${segs.map(s => `<span class="inline-flex items-center gap-1"><span style="width:10px;height:10px;border-radius:2px;background:${s.c};display:inline-block"></span>${esc(s.n)}</span>`).join('')}</div></div>`;
}
function rptCharts(rows) {
  const byBr = !rptBr(), keyOf = r => byBr ? (r.br || '–') : rptModel(r.name), labelOf = k => byBr && BR[k] ? `${k} ${BR[k].name}` : k, g = new Map();
  rows.forEach(r => { const k = keyOf(r); if (!g.has(k)) g.set(k, { label: labelOf(k), del: 0, adv: 0, pay: 0, act: 0, n: 0, n_pay: 0, n_act: 0 }); const x = g.get(k); x.n++; if (r.pay + r.est) x.n_pay++; if (r.actAmt) x.n_act++; rptKinds(r) === 'adv' ? x.adv++ : x.del++; x.pay += r.pay + r.est; x.act += r.actAmt; });
  g.forEach(x => { x.n_del = x.del; x.n_adv = x.adv; });
  const items = [...g.values()].sort((a, b) => (b.del + b.adv) - (a.del + a.adv));
  // reward money by model is always shown (by branch as well when all branches are on)
  const gm = new Map(); rows.forEach(r => { const k = rptModel(r.name); if (!gm.has(k)) gm.set(k, { label: k, pay: 0, act: 0, n: 0, n_pay: 0, n_act: 0 }); const x = gm.get(k); x.n++; if (r.pay + r.est) x.n_pay++; if (r.actAmt) x.n_act++; x.pay += r.pay + r.est; x.act += r.actAmt; });
  const byModel = byBr ? `<div class="md:col-span-2">${rptBars('เงินรางวัล (บาท) แยกรุ่น', [...gm.values()].sort((a, b) => (b.pay + b.act) - (a.pay + a.act)), [{ k: 'pay', n: 'ตามทางเลือกแคมเปญ', c: 'var(--red)' }, { k: 'act', n: 'แคมเปญพิเศษ', c: 'var(--warn)' }], v => money(v))}</div>` : '';
  return `<div class="grid md:grid-cols-2 gap-3">${rptBars(byBr ? 'จำนวนคัน แยกสาขา' : 'จำนวนคัน แยกรุ่น', items, [{ k: 'del', n: 'ส่งมอบ', c: 'var(--good)' }, { k: 'adv', n: 'Advance (ALLOCATED)', c: 'var(--warn)' }], v => String(v))}
    ${rptBars(byBr ? 'เงินรางวัล (บาท) แยกสาขา' : 'เงินรางวัล (บาท) แยกรุ่น', items, [{ k: 'pay', n: 'ตามทางเลือกแคมเปญ', c: 'var(--red)' }, { k: 'act', n: 'แคมเปญพิเศษ', c: 'var(--warn)' }], v => money(v))}${byModel}</div>`;
}
// ---- by model: tap a model to see each car's campaign and baht
function rptCarTable(list, pr, D, byVin) {
  const tr = list.map((r, i) => { const a = byVin.get(r.vin), d = a && a.rec && a.rec.deal, h = rptOptHead(r.opt), adv = rptKind(r.st) === 'adv';
    const chk = !r.hasDir ? '–' : !d || !d.campaign_id ? '–' : d.campaign_id === 'pending' ? 'รอเลือก' : campFeats(d.campaign) === campFeats(r.opt) ? 'ตรง' : 'ต่าง';
    const mc = rptMoneyCheck(r, a, D, pr); mc.txt = String(mc.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const stt = !r.hasDir ? '–' : adv ? 'ALLOCATED (Advance)' : (r.st || '–');
    return `<tr><td class="num">${i + 1}</td><td>${esc(r.br || '')}</td><td>${esc(r.name)}</td><td>${pr ? esc(r.vin) : vinLink({ vin: r.vin })}</td><td>${a ? esc(a.cust) : '<span class="text-muted">–</span>'}</td><td>${optTip(r.opt, pr)}${r.optAdj ? ' <span class="text-xs text-muted">(แก้)</span>' : ''}</td><td class="text-right num">${r.pay ? money(r.pay) : rptPickMoney(r, a, D, pr)}</td><td class="text-xs">${r.acts.length ? r.acts.map(x => esc(String(x.name).replace(/^SP\d+\/\d+ ?: ?/, '').slice(0, 60)) + ' ' + money(x.amt)).join('<br>') : '–'}</td><td class="text-right num"><b>${r.tot ? money(r.tot) : '–'}</b></td><td class="nowrap">${pr ? esc(stt) : !r.hasDir ? '–' : adv ? chip('Advance', 'warn') : chip(r.st || '–', 'good')}</td><td class="nowrap">${pr ? esc(chk) : chk === 'ตรง' ? chip(chk, 'good') : chk === 'ต่าง' ? chip(chk, 'warn') : chk}</td><td>${pr ? esc(mc.txt) : mc.html}</td>${pr ? '' : `<td>${rptEditBtn(r, a)}</td>`}</tr>`; }).join('');
  const tot = `<tr class="rpt-tot"><td colspan="6"><b>รวม ${list.length} คัน</b></td><td class="text-right num"><b>${money(sumBy(list, r => r.pay + r.est))}</b></td><td></td><td class="text-right num"><b>${money(sumBy(list, r => r.tot))}</b></td><td colspan="${pr ? 3 : 4}"></td></tr>`;
  return `<div class="${pr ? '' : 'bg-surface border border-line rounded-lg overflow-x-auto'}"><table class="${pr ? '' : 'tbl'}"><thead><tr><th>#</th><th>สาขา</th><th>รุ่น</th><th>เลขตัวถัง</th><th>ลูกค้า</th><th>ทางเลือก</th><th class="text-right">เงินทางเลือก</th><th>แคมเปญพิเศษ</th><th class="text-right">รวมเงิน</th><th>สถานะ</th><th>เทียบเว็บ</th><th>เทียบเงิน</th>${pr ? '' : '<th></th>'}</tr></thead><tbody>${tr}${tot}</tbody></table></div>`;
}
function rptByVin(D) { const m = new Map(); for (const a of D.at) { const v = atVin(a); if (v && !a.cancelled) m.set(String(v).toUpperCase(), a); } return m; }
function rptModelTable(rows, D, pr) {
  const g = new Map(); rows.forEach(r => { const k = rptModel(r.name); if (!g.has(k)) g.set(k, []); g.get(k).push(r); });
  const open = S.filters.rptOpen || {}, byVin = rptByVin(D), keys = [...g.keys()].sort((a, b) => g.get(b).length - g.get(a).length);
  const body = keys.map(k => { const l = g.get(k), isOpen = pr || open[k];
    return `<tr class="${pr ? '' : 'cursor-pointer'}" ${pr ? '' : `data-act="rpt-model" data-m="${esc(k)}"`}><td><b>${pr ? '' : (isOpen ? '▾ ' : '▸ ')}${esc(k)}</b></td><td class="text-right num">${l.length}</td><td class="text-right num">${l.filter(r => rptKinds(r) === 'del').length}</td><td class="text-right num">${l.filter(r => rptKinds(r) === 'adv').length}</td><td class="text-right num">${money(sumBy(l, r => r.pay + r.est))}</td><td class="text-right num">${sumBy(l, r => r.est) ? money(sumBy(l, r => r.est)) : '<span class="text-muted">–</span>'}</td><td class="text-right num">${money(sumBy(l, r => r.actAmt))}</td><td class="text-right num"><b>${money(sumBy(l, r => r.tot))}</b></td></tr>${isOpen ? `<tr><td colspan="8" class="p-0">${rptCarTable(l, pr, D, byVin)}</td></tr>` : ''}`; }).join('');
  const tot = `<tr class="rpt-tot"><td><b>รวม</b></td><td class="text-right num"><b>${rows.length}</b></td><td class="text-right num"><b>${rows.filter(r => rptKinds(r) === 'del').length}</b></td><td class="text-right num"><b>${rows.filter(r => rptKinds(r) === 'adv').length}</b></td><td class="text-right num"><b>${money(sumBy(rows, r => r.pay + r.est))}</b></td><td class="text-right num"><b>${sumBy(rows, r => r.est) ? money(sumBy(rows, r => r.est)) : '–'}</b></td><td class="text-right num"><b>${money(sumBy(rows, r => r.actAmt))}</b></td><td class="text-right num"><b>${money(sumBy(rows, r => r.tot))}</b></td></tr>`;
  return `<div class="${pr ? '' : 'bg-surface border border-line rounded-lg overflow-x-auto'}"><table class="${pr ? '' : 'tbl'}"><thead><tr><th>รุ่น</th><th class="text-right">คัน</th><th class="text-right">ส่งมอบ</th><th class="text-right">Advance</th><th class="text-right">เงินทางเลือก</th><th class="text-right" title="อยู่ในเงินทางเลือกแล้ว: คันที่ไฟล์เงินยังไม่มียอด ใช้ยอดตามตารางแคมเปญ">ตามตาราง (ประมาณ)</th><th class="text-right">แคมเปญพิเศษ</th><th class="text-right">รวมเงิน</th></tr></thead><tbody>${body}${tot}</tbody></table></div>`;
}
// the letter from Honda (total of the month's reward) typed in per branch, to check against the files
const rptLetterKey = (br, rep) => br + '|' + rptMonth(rep);
function rptLetterBox(rows, rep) {
  const br = rptBr(); if (!br) return '<p class="text-xs text-muted">เลือกสาขาเพื่อกรอกยอดตามจดหมายแจ้งผลรางวัลของ Honda แล้วเทียบกับยอดรวมจากไฟล์</p>';
  const letter = ((S.ref.get('honda_pay') || {}).letter || {})[rptLetterKey(br, rep)], total = sumBy(rows, r => r.tot), has = letter !== undefined && letter !== null && letter !== '';
  const diff = has ? Number(letter) - total : null;
  return `<div class="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-line bg-surface"><label class="text-sm" for="rpt-letter">ยอดรวมตามจดหมาย Honda (บาท)</label><input id="rpt-letter" type="number" step="0.01" inputmode="decimal" class="w-40" data-rpt-letter value="${has ? esc(letter) : ''}" ${campUpCan() ? '' : 'disabled'}>
    <span class="text-sm">ยอดรวมจากไฟล์ <b class="num">${money(total)}</b></span>${has ? (Math.abs(diff) < 0.5 ? chip('ตรงกัน', 'good') : chip('ต่าง ' + money(diff), 'bad')) : '<span class="text-xs text-muted">กรอกเพื่อเทียบ</span>'}</div>`;
}
function rptKpi(rows, cmp, nNone) {
  const nAdv = rows.filter(r => rptKinds(r) === 'adv').length;
  return [['จำนวนรถ', rows.length, `ส่งมอบ ${rows.length - nAdv} · Advance ${nAdv}`, 'rpt-s1'], ['เงินรางวัลรวม (บาท)', money(sumBy(rows, r => r.tot)), `ทางเลือก ${money(sumBy(rows, r => r.pay + r.est))}${sumBy(rows, r => r.est) ? ` (ตามตารางประมาณ ${money(sumBy(rows, r => r.est))})` : ''} · พิเศษ ${money(sumBy(rows, r => r.actAmt))}`, 'rpt-s4'], ['ALLOCATED = Advance', nAdv, `${cmp.adv.filter(r => r.kind === 'wait').length} รอส่งมอบ · ${cmp.adv.filter(r => r.kind === 'next').length} ส่งมอบเดือนถัดไป`, 'rpt-s2'], ['ยังไม่เลือกแคมเปญ', nNone, 'ในเว็บ', 'rpt-s3']];
}
function rptSheet(D, rep, rows, cmp) {
  const k = rptKpi(rows, cmp, rptNoneCount(D, rep));
  return `<div class="sheet"><h1>รายงานสรุปแคมเปญ Honda ${esc(rep)}</h1><p class="sub">AT Honda ${rptBr() ? esc(BR[rptBr()].name) : 'ทุกสาขา'} · พิมพ์ ${esc(fmtD(todayISO()))}</p>
  <table><tbody><tr>${k.map(([t, n]) => `<th>${esc(t)}</th><td>${n}</td>`).join('')}</tr></tbody></table>
  <h2>1. สรุปรายรุ่น</h2>${rptModelTable(rows, D, false).replace(/<tr class="cursor-pointer"[^>]*>/g, '<tr>').replace(/[▸▾] /g, '')}
  <h2>2. เทียบกับข้อมูลในเว็บ</h2>${rptChecksTable(rptChecks(D, rep, rows, cmp), true)}
  <h2>3. คันที่ยังไม่เลือกแคมเปญ</h2>${rptNoneTable(D, rep, true, rows)}
  <h2>4. รายคัน (ส่งบัญชีตรวจเทียบ)</h2>${rptCarTable(rows, true, D, rptByVin(D))}<h2>5. คำอธิบายทางเลือก</h2>${optLegend(rows)}</div>`;
}
function viewCampSum(D) {
  const months = rptMonths(), rep = S.filters.rptRep && months.includes(S.filters.rptRep) ? S.filters.rptRep : months[0];
  if (!campUpCan()) return `${pageHead('รายงานสรุปแคมเปญ', '')}<p class="text-sm text-muted">เฉพาะแอดมินขึ้นไป</p>`;
  const ctl = `<style>.rpt-grp td{background:var(--surface-2);}.rpt-sub td{font-weight:600;border-top:1px solid var(--line);}.rpt-tot td{background:var(--surface-2);border-top:2px solid var(--line);}</style>
  <div class="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg border border-line bg-surface">${myBranch() ? `<span class="text-sm">สาขา ${esc(myBranch())}</span>` : `<div class="flex flex-wrap gap-1" role="group" aria-label="สาขา">${[['', 'ทุกสาขา'], ...BRS.map(b => [b, b])].map(([b, t]) => `<button type="button" class="btn btn-sm ${rptBr() === b ? 'btn-dark' : 'btn-ghost'}" data-act="rpt-br" data-br="${b}">${t}</button>`).join('')}</div>`}
    ${months.length ? `<label class="text-sm ml-2" for="rpt-rep">เดือน</label><select id="rpt-rep" data-rpt-rep>${months.map(m => `<option ${m === rep ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>` : ''}
    ${rep ? `<span class="ml-auto flex gap-2"><button class="btn btn-ghost btn-sm" data-act="rpt-export">ส่งออก Excel</button><button class="btn btn-red btn-sm" data-act="rpt-print">พิมพ์รายงาน</button></span>` : ''}</div>`;
  if (!rep) return `${pageHead('รายงานสรุปแคมเปญ', 'ยอดแจ้งขายและเงินรางวัลตามไฟล์ของ Honda เทียบกับข้อมูลในเว็บ')}${ctl}${emptyBox(rptBr() ? `ยังไม่มีข้อมูลของสาขา ${rptBr()}` : 'ยังไม่มียอดแจ้งขายที่บันทึกไว้', 'อัปโหลดไฟล์ที่หน้า เพิ่มเติม › อัปเดตแคมเปญ แล้วกดบันทึก หรือเลือกสาขาอื่น')}<button class="btn btn-red mt-3" data-act="go" data-view="campup">ไปหน้าอัปเดตแคมเปญ</button>`;
  const rows = rptRows(rep), cmp = rptCompare(D, rep, rows.filter(r => r.hasDir)), k = rptKpi(rows, cmp, rptNoneCount(D, rep));
  // once per month / branch / file content: match the file to the campaigns by itself (never inside the draw)
  const ak = [rep, rptBr(), rows.length, Object.keys(rptAll()).length].join('|');
  if (S.rptAutoKey !== ak) { S.rptAutoKey = ak; setTimeout(() => { rptAutoRun(rep).catch(() => { /* the chooser stays for the admin */ }); }, 0); }
  let secN = 0; const sec = (t, sub, body) => `<section class="mb-6" id="rpt-s${++secN}" style="scroll-margin-top:72px"><h3 class="font-head font-semibold">${t}</h3>${sub ? `<p class="text-xs text-muted mb-2">${sub}</p>` : '<div class="mb-2"></div>'}${body}</section>`;
  // a section that can be hidden (the choice is kept while the page is open)
  const secH = (t, sub, body, key) => { const hid = !!S.filters[key]; secN++; return `<section class="mb-6" id="rpt-s${secN}" style="scroll-margin-top:72px"><div class="flex items-center gap-2"><h3 class="font-head font-semibold">${t}</h3><button type="button" class="btn btn-ghost btn-sm ml-auto" data-act="rpt-hide" data-k="${key}">${hid ? 'แสดง' : 'ซ่อน'}</button></div>${hid ? '<div class="mb-2"></div>' : `${sub ? `<p class="text-xs text-muted mb-2">${sub}</p>` : ''}${body}`}</section>`; };
  return `${pageHead('รายงานสรุปแคมเปญ', 'ยอดแจ้งขายและเงินรางวัลตามไฟล์ของ Honda เทียบกับข้อมูลในเว็บ')}${ctl}
  <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">${k.map(([t, n, sub, go]) => `<button type="button" class="p-3 rounded-lg border border-line bg-surface text-left hover:bg-surface2" data-act="rpt-go" data-t="${go}" title="กดเพื่อไปที่รายละเอียด"><div class="text-xs text-muted">${esc(t)}</div><div class="num text-2xl font-semibold">${n}</div>${sub ? `<div class="text-xs text-muted">${esc(sub)}</div>` : ''}<div class="text-xs underline mt-1">ดูรายละเอียด ↓</div></button>`).join('')}</div>
  <section class="mb-6">${rptCharts(rows)}</section>
  ${sec('1. สรุปรายรุ่น', 'กดที่รุ่นเพื่อดูว่าแต่ละคันเลือกแคมเปญอะไรและได้เงินเท่าไร', rptModelTable(rows, D, false))}
  ${sec('2. เทียบกับข้อมูลในเว็บ', 'เทียบเฉพาะคันที่มีในไฟล์ Dealer Incentive Report · กด "ดูรายคัน" แล้วกด VIN เพื่อเปิดรายละเอียดรถ', rptChecksTable(rptChecks(D, rep, rows, cmp), false))}
  ${secH('3. คันที่ยังไม่เลือกแคมเปญ', 'รอเลือกแคมเปญ · ไม่ระบุแคมเปญ · ส่งมอบเดือนนี้แต่ยังไม่ลงเงื่อนไขขาย · เลือกแคมเปญจากตารางได้เลย', rptNoneTable(D, rep, false, rows), 'rptHide3')}
  ${sec(`4. รายคัน (${rows.length}) สำหรับส่งบัญชีตรวจเทียบ`, 'เงินตามทางเลือกแคมเปญ + แคมเปญพิเศษ ต่อคัน กด "ส่งออก Excel" หรือ "พิมพ์รายงาน" ส่งบัญชีได้', `${rptCarTable(rows, false, D, rptByVin(D))}<div class="mt-3">${rptLetterBox(rows, rep)}</div>`)}`;
}
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset) return;
  if (t.dataset.rptRep !== undefined) { S.filters.rptRep = t.value; render(); }
  else if (t.dataset.rptPick !== undefined) rptPickSave(t.dataset.rptPick, t.value);
  else if (t.dataset.rptDraft !== undefined) { S.filters.rptDraft = { ...(S.filters.rptDraft || {}), [t.dataset.rptDraft]: t.value }; render(); }
  else if (t.dataset.rptLetter !== undefined) {
    const br = rptBr(), months = rptMonths(), rep = S.filters.rptRep && months.includes(S.filters.rptRep) ? S.filters.rptRep : months[0]; if (!br || !rep || !campUpCan()) return;
    const cur = S.ref.get('honda_pay') || { v: {} }, letter = { ...(cur.letter || {}) }, k = rptLetterKey(br, rep);
    if (t.value === '') delete letter[k]; else letter[k] = Number(t.value);
    write('ref', 'honda_pay', { ...cur, letter }).then(() => render());
  }
});
// a campaign picked in the report for a car with no sale terms in the web yet: kept in the report (ref/honda_pay.picks), the booking is not changed
async function rptPickSave(vin, cid) {
  const D = derive(), a = rptByVin(D).get(vin);
  if (!a || !dealAdmin(a) || !rptEditCan(a.br)) { toast('แก้ไม่ได้', 'bad'); return; }
  const y = cid ? campOptions(termsCtxAt(a, D)).opts.find(o => o.value === cid) : null;
  const cur = S.ref.get('honda_pay') || { v: {} }, picks = { ...(cur.picks || {}) };
  if (y && y.ok) picks[vin] = { cid, name: campFull(y), sup: Number(y.sup) || 0, ...actor() }; else picks[vin] = { manual: true, ...actor() };   // cleared by hand: the automatic match leaves it alone
  if (await write('ref', 'honda_pay', { ...cur, picks })) { toast(y ? 'เลือกแคมเปญในรายงานแล้ว (ยังไม่ได้ใส่เงื่อนไขการขายในใบจอง)' : 'ล้างตัวเลือกแล้ว'); render(); }
}
Object.assign(ACTIONS, {
  'rpt-hide'(el) { S.filters[el.dataset.k] = !S.filters[el.dataset.k]; render(); },
  'rpt-go'(el) { const e = document.getElementById(el.dataset.t); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  'rpt-pick-use'(el) { rptPickSave(String(el.dataset.vin || '').toUpperCase(), el.dataset.cid); },
  // open the booking and go straight into its sale-terms form (first entry, or the admin's edit), where the campaign and margin are keyed
  'rpt-terms'(el) {
    ACTIONS['so-open'](el);
    const a = atById(el.dataset.id); if (!a || !S.modal) return;
    const st = dealState(a), mode = st.mayFirst ? 'first' : st.mayAdmin ? 'admin' : '';
    if (mode) { ACTIONS['deal-open']({ dataset: { id: a.id, mode } }); setTimeout(() => { const b = document.querySelector('[data-deal-box]'); if (b) b.scrollIntoView({ block: 'start' }); }, 80); }
  },
  'rpt-br'(el) { S.filters.rptBr = el.dataset.br || ''; S.filters.rptRep = ''; S.filters.rptOpen = {}; render(); },
  'rpt-model'(el) { const o = { ...(S.filters.rptOpen || {}) }; o[el.dataset.m] = !o[el.dataset.m]; S.filters.rptOpen = o; render(); },
  'rpt-print'() {
    const months = rptMonths(), rep = S.filters.rptRep && months.includes(S.filters.rptRep) ? S.filters.rptRep : months[0]; if (!rep) return;
    const rows = rptRows(rep), D = derive();
    let root = document.getElementById('print-root'); if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
    root.innerHTML = rptSheet(D, rep, rows, rptCompare(D, rep, rows.filter(r => r.hasDir)));
    try { window.print(); } catch (e) { toast('เปิดหน้าพิมพ์ไม่ได้ ใช้ "บันทึกเป็น PDF" แทน', 'bad'); }
  },
  async 'rpt-export'() {
    const months = rptMonths(), rep = S.filters.rptRep && months.includes(S.filters.rptRep) ? S.filters.rptRep : months[0]; if (!rep) return;
    const rows = rptRows(rep), byVin = rptByVin(derive());
    const aoa = [['สาขา', 'รุ่น', 'เลขตัวถัง', 'ลูกค้า', 'แคมเปญ', 'ทางเลือก', 'เงินตามทางเลือก', 'แคมเปญพิเศษ', 'เงินแคมเปญพิเศษ', 'รวมเงิน', 'สถานะ Honda', 'วันส่งมอบ (Honda)', 'ที่มาของเงินทางเลือก']];
    rows.forEach(r => { const a = byVin.get(r.vin); aoa.push([r.br || '', r.name, r.vin, a ? a.cust : '', r.camp, fixTh(r.opt), r.pay + r.est, r.acts.map(x => x.name).join(' / '), r.actAmt, r.tot, rptKind(r.st) === 'adv' ? 'ALLOCATED (Advance)' : r.st, rptIso(r.date), r.est ? 'ตามตารางแคมเปญ (ประมาณ)' : r.pay ? 'ไฟล์เงิน Honda' : '']); });
    aoa.push(['รวม', '', '', '', '', '', sumBy(rows, r => r.pay + r.est), '', sumBy(rows, r => r.actAmt), sumBy(rows, r => r.tot), '', '', '']);
    try {
      const X = await loadXLSX(), wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), 'สรุปแคมเปญ');
      const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
      await docSave(`สรุปแคมเปญ_${rptBr() || 'ทุกสาขา'}_${rep.replace('/', '-')}.xlsx`, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    } catch (e) { toast('ส่งออกไม่ได้ ใช้ "พิมพ์รายงาน" แทน', 'bad'); }
  }
});
