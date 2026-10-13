// ------------------------------------------------------------------ managers' and executive's dashboard tabs (13/10)
// ยอดขายและเป้า: target vs invoices (Honda's reward counts invoices), bookings vs deliveries (cars actually handed over),
// invoiced but not yet delivered. วิเคราะห์: booking mix and trend, sales ranking, cancellations, finance, stock age, trade-ins.
// Only function declarations here: the first render runs before this part of the file.
function dashTabs() {
  const r = S.role.role; if (r !== 'exec' && !MGR_OF[r]) return '';
  const cur = dashSub(), tabs = r === 'exec' ? [['exec', 'สรุปผู้บริหาร'], ['sales', 'ยอดขายและเป้า'], ['ana', 'วิเคราะห์'], ['ops', 'งานรออนุมัติและคิวรถ']] : [['ops', 'งานรออนุมัติและคิวรถ'], ['sales', 'ยอดขายและเป้า'], ['ana', 'วิเคราะห์']];
  return `<div class="seg mb-4" role="group" aria-label="มุมมอง">${tabs.map(([k, t]) => `<button data-act="sub" data-key="dash" data-sub="${k}" aria-pressed="${cur === k}">${t}</button>`).join('')}</div>`;
}
// a manager sees sales, targets and analysis only for the branches they look after; the executive sees all
function dashScoped(D, sub) {
  const own = MGR_OF[S.role.role], keep = S.br;
  if (own) { S.brScope = own; if (S.br && !own.includes(S.br)) S.br = ''; }
  try { return sub === 'sales' ? dashSalesTarget(D) : dashAna(D); } finally { S.brScope = null; if (own && keep && !own.includes(keep)) S.br = keep; }
}
function dashSub() { const s = S.sub.dash || 'exec'; if (S.role.role === 'exec') return s; return s === 'sales' || s === 'ana' ? s : 'ops'; }
function monthsIn(from, to) { const out = []; let d = from.slice(0, 7); while (d <= to.slice(0, 7)) { out.push(d); const [y, m] = d.split('-').map(Number); d = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; } return out; }
function dCard(title, body, note) { return `<section class="bg-surface border border-line rounded-lg p-4 min-w-0"><h2 class="font-head font-semibold mb-2">${title}</h2>${body}${note ? `<p class="text-xs text-muted mt-2">${note}</p>` : ''}</section>`; }
function pctOf(a, b) { return b ? Math.round(a / b * 100) : 0; }
function periodBar(E) { return `<div class="flex flex-wrap gap-3 items-end mb-4"><div class="seg" role="group" aria-label="ช่วงเวลา">${EXEC_PERIODS.map(([k, t]) => `<button data-act="exec-period" data-k="${k}" aria-pressed="${E.key === k}">${t}</button>`).join('')}</div>${rangeInputs(E)}</div>${brSeg()}`; }
function rangeInputs(E) {
  if (E.key !== 'custom') return '';
  const f = S.filters.eFrom || '', t = S.filters.eTo || '', bad = f && t && f > t;
  return `<div class="flex flex-wrap gap-2 items-end"><div class="field"><label for="e-from">ตั้งแต่วันที่</label><input id="e-from" type="date" data-filter="eFrom" value="${esc(f)}" max="${D0today()}"></div>
    <div class="field"><label for="e-to">ถึงวันที่</label><input id="e-to" type="date" data-filter="eTo" value="${esc(t)}" max="${D0today()}"></div>
    ${bad ? '<span class="text-sm" style="color:var(--bad)">วันเริ่มต้องไม่หลังวันสิ้นสุด</span>' : !(f && t) ? '<span class="text-sm text-muted">เลือกทั้ง 2 วัน (ระหว่างนี้แสดงทั้งปี)</span>' : ''}</div>`;
}
function D0today() { return todayISO(); }

// ---- target vs invoices, monthly, for the charts (also used on สรุปผู้บริหาร)
function tgtSeries(E) {
  const ms = monthsIn(E.from, E.to), bk = ms.map(k => ({ k, label: monLabel(k), test: x => x.slice(0, 7) === k }));
  const tv = ms.map(m => tgtOf(m)), iv = bk.map(b => E.count(E.invoiced, b));
  return { ms, bk, tv, iv };
}
function tgtChart(E, id) {
  const T = tgtSeries(E), has = T.tv.some(Boolean);
  const chart = colChart(id, T.bk, [{ name: 'เป้า (ใบกำกับ)', color: '--viz-1', values: T.tv }, { name: 'ยอดขาย (ใบกำกับภาษี)', color: '--viz-3', values: T.iv }], { label: 'เป้าเทียบยอดใบกำกับภาษี' });
  const pr = `<div class="scroll-x"><table class="tbl text-sm mt-2"><thead><tr><th></th>${T.bk.map(b => `<th class="text-right">${esc(b.label)}</th>`).join('')}</tr></thead><tbody><tr><td class="nowrap">% ทำได้</td>${T.tv.map((t, i) => `<td class="num text-right" ${t && T.iv[i] < t ? 'style="color:var(--bad)"' : t ? 'style="color:var(--good)"' : ''}>${t ? pctOf(T.iv[i], t) + '%' : '–'}</td>`).join('')}</tr></tbody></table></div>`;
  return chart + pr + (has ? '' : `<p class="text-sm mt-2" style="color:var(--warn)">ยังไม่ได้ใส่เป้าของช่วงนี้${tgtCanEdit() ? ' กด "ใส่ / แก้เป้า"' : ''}</p>`);
}
function bookDelivChart(E, id) {
  return colChart(id, E.buckets, [{ name: 'ยอดจอง', color: '--viz-1', values: E.buckets.map(b => E.count(E.booked, b)) }, { name: 'ยอดขาย (ส่งมอบ)', color: '--viz-2', values: E.buckets.map(b => E.count(E.sales, b)) }], { label: 'ยอดจองเทียบยอดส่งมอบ' });
}
// this month: target, invoices so far, projection and the pace needed (invoices only reach as far as the DL file)
function monthPace(D, E) {
  const m = D.today.slice(0, 7), t = tgtOf(m);
  const inv = D.X.inv.filter(i => !i.company && i.idate && i.idate.slice(0, 7) === m && inBr(i)).length;
  const dim = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();
  const asof = E.dlAsof && E.dlAsof.slice(0, 7) === m ? E.dlAsof : null;
  const day = asof ? Number(asof.slice(8)) : 0, left = dim - Number(D.today.slice(8)) + 1;
  const proj = day ? Math.round(inv / day * dim) : null, need = t && left > 0 ? Math.max(0, Math.ceil((t - inv) / left * 10) / 10) : null;
  return { m, t, inv, proj, need, asof, left };
}
function invWaitingList(D) {
  // the latest invoice per car only: a car invoiced again (e.g. a cancelled and re-issued invoice) counts once, by its newest invoice
  return D.X.inv.filter(i => !i.company && i.idate && !i.ddate && inBr(i) && (!i.vin || D.invByVin.get(i.vin) === i) && !(i.vin && (carBookingOf(i.vin, D) || {}).done)).map(i => ({ ...i, age: daysBetween(i.idate, D.today) })).sort((a, b) => b.age - a.age);
}
function dashSalesTarget(D) {
  const E = execData(D), P = monthPace(D, E), W = invWaitingList(D);
  const ms = monthsIn(E.from, E.to);
  const models = [...new Set([...tgtRows().filter(r => ms.includes(r.m) && inBr(r)).map(r => r.model), ...E.invoiced.map(s => s.model).filter(Boolean)])];
  // % of target only counts invoices in the months that have a target for that row
  const inTm = (s, f) => tgtOf(s.date.slice(0, 7), f.br, f.model) > 0;
  const mrow = models.map(md => ({ md, t: ms.reduce((n, m) => n + tgtOf(m, null, md), 0), i: E.invoiced.filter(s => s.model === md).length, it: E.invoiced.filter(s => s.model === md && inTm(s, { model: md })).length, d: E.sales.filter(s => s.model === md).length, b: E.booked.filter(a => a.model === md).length }))
    .sort((a, b) => b.t - a.t || b.i - a.i);
  const brRows = BRS.filter(b => inBr({ br: b })).map(b => ({ b, t: ms.reduce((n, m) => n + tgtOf(m, b), 0), i: E.invoiced.filter(s => s.br === b).length, it: E.invoiced.filter(s => s.br === b && inTm(s, { br: b })).length, d: E.sales.filter(s => s.br === b).length, bk: E.booked.filter(a => a.br === b).length }));
  const ageB = [[0, 7], [8, 14], [15, 30], [31, 9999]].map(([a, z]) => ({ l: z > 999 ? 'เกิน 30 วัน' : `${a}–${z} วัน`, n: W.filter(w => w.age >= a && w.age <= z).length, bad: a > 14 }));
  const tT = mrow.reduce((n, r) => n + r.t, 0), tI = E.invoiced.length, tIt = E.invoiced.filter(s => inTm(s, {})).length;
  const pctCell = (i, t) => t ? `<span style="color:var(--${i >= t ? 'good' : 'bad'})">${pctOf(i, t)}%</span>` : '–';
  return `${pageHead('ยอดขายและเป้า', `ใบกำกับภาษี = ยอดที่แจ้งขายกับฮอนด้า (ใช้คิดเงินรางวัล) · ส่งมอบ = รถที่ปล่อยให้ลูกค้าจริง · ${fmtD(E.from)} – ${fmtD(E.to)}`, tgtCanEdit() ? '<button class="btn btn-red" data-act="tgt-open">ใส่ / แก้เป้า</button>' : '')}
  ${dashTabs()}${periodBar(E)}
  ${tiles([
    tile(`เป้าเดือนนี้ (${monLabel(P.m)})`, P.t ? fmtN(P.t) : '–', { sub2: P.t ? 'คัน ใบกำกับภาษี' : 'ยังไม่ได้ใส่เป้า' }),
    tile('ใบกำกับเดือนนี้', fmtN(P.inv), { tone: P.t ? (P.inv >= P.t ? 'good' : '') : '', sub2: P.t ? `ทำได้ ${pctOf(P.inv, P.t)}% · ขาด ${fmtN(Math.max(0, P.t - P.inv))} คัน` : (P.asof ? `DL ถึง ${fmtD(P.asof)}` : 'ยังไม่มี DL ของเดือนนี้') }),
    tile('คาดการณ์สิ้นเดือน', P.proj === null ? '–' : fmtN(P.proj), { tone: P.t && P.proj !== null ? (P.proj >= P.t ? 'good' : 'bad') : '', sub2: P.asof ? `ตามอัตราถึง ${fmtD(P.asof)}` : 'ต้องอัปโหลด DL เดือนนี้' }),
    tile('ต้องออกใบกำกับต่อวัน', P.need === null ? '–' : fmtN(P.need), { sub2: P.need === null ? '' : `อีก ${P.left} วันรวมวันนี้${P.asof && P.asof < D.today ? ` · ใบกำกับนับถึง ${fmtD(P.asof)}` : !P.asof ? ' · ยังไม่มี DL เดือนนี้' : ''}` }),
    tile('ออกใบกำกับแล้ว ยังไม่ส่งมอบ', fmtN(W.length), { tone: W.some(w => w.age > 14) ? 'warn' : '', sub2: `เกิน 14 วัน ${fmtN(W.filter(w => w.age > 14).length)} คัน` })
  ], 'lg:grid-cols-5')}
  <div class="grid lg:grid-cols-2 gap-5 mb-5">
    ${dCard('เป้า เทียบ ยอดขาย (ใบกำกับภาษี)', tgtChart(E, 'tg1'), 'ใบกำกับนับตามวันที่ออกใบกำกับในไฟล์ DL ไม่รวมรถบริษัท')}
    ${dCard('ยอดจอง เทียบ ยอดขาย (ส่งมอบ)', bookDelivChart(E, 'tg2'), `ยอดจองนับจากฟอร์ม AT ตามวันที่จอง · ส่งมอบนับตามวันที่ส่งมอบ${E.dlAsof ? ` · DL ถึง ${fmtD(E.dlAsof)}` : ''}`)}
  </div>
  <div class="grid lg:grid-cols-2 gap-5 mb-5">
    ${dCard('แยกสาขา', `<div class="scroll-x"><table class="tbl text-sm"><thead><tr><th>สาขา</th><th class="text-right">เป้า</th><th class="text-right">ใบกำกับ</th><th class="text-right">% เป้า</th><th class="text-right">ส่งมอบ</th><th class="text-right">จอง</th></tr></thead><tbody>
      ${brRows.map(r => `<tr><td><b>${r.b}</b> <span class="text-xs text-muted">${BR[r.b].name}</span></td><td class="num text-right">${r.t ? fmtN(r.t) : '–'}</td><td class="num text-right font-semibold">${fmtN(r.i)}</td><td class="num text-right">${pctCell(r.it, r.t)}</td><td class="num text-right">${fmtN(r.d)}</td><td class="num text-right">${fmtN(r.bk)}</td></tr>`).join('')}</tbody></table></div>`, '% เป้า นับเฉพาะใบกำกับในเดือนที่มีเป้า')}
    ${dCard('ออกใบกำกับแล้ว ยังไม่ส่งมอบ', `<div class="flex flex-wrap gap-2 mb-2 text-sm">${ageB.map(a => `<span class="inline-flex items-center gap-1">${chip(a.l, a.bad && a.n ? 'warn' : 'neutral')}<b class="num">${a.n}</b></span>`).join('')}</div>
      <div class="border border-line rounded-lg divide-y divide-line max-h-72 overflow-auto">${W.slice(0, 30).map(w => `<div class="p-2 px-3 text-sm flex flex-wrap gap-x-3 items-center">${w.vin ? vinLink({ vin: w.vin }) : '<span class="text-muted">ไม่มีเลขตัวถัง</span>'}<span>${esc(w.model || '')} ${esc(gradeShort(w.model, w.grade) || '')}</span><span class="text-muted">${esc(w.br)} · ใบกำกับ ${fmtD(w.idate)}${isSales() ? '' : ` · ${esc(w.cust || '')}`} · ${esc(w.sales || '')}</span><span class="ml-auto flex items-center gap-2"><span class="num ${w.age > 14 ? 'font-semibold' : ''}" ${w.age > 14 ? 'style="color:var(--warn)"' : ''}>${w.age} วัน</span>${w.vin ? delivBtn(carAny(w.vin, D) || { vin: w.vin }, D) : ''}</span></div>`).join('') || '<div class="p-3 text-sm text-muted">ไม่มี</div>'}</div>`, 'กด "ส่งมอบ" เพื่อบันทึกการส่งมอบก่อนอัปเดตไฟล์ IDS · รายการเดียวกันอยู่ที่หน้าสต็อกด้วย')}
  </div>
  ${dCard(`แยกรุ่น <span class="text-muted text-sm font-normal">เป้า ${fmtN(tT)} · ใบกำกับในเดือนที่มีเป้า ${fmtN(tIt)} (${tT ? pctOf(tIt, tT) + '%' : '–'}) · ใบกำกับทั้งช่วง ${fmtN(tI)}</span>`, `<div class="scroll-x"><table class="tbl text-sm"><thead><tr><th>รุ่น</th><th class="text-right">เป้า</th><th class="text-right">ใบกำกับ</th><th class="text-right">% เป้า</th><th class="text-right">ส่งมอบ</th><th class="text-right">จอง</th></tr></thead><tbody>
    ${mrow.map(r => `<tr><td class="nowrap">${esc(r.md)}</td><td class="num text-right">${r.t ? fmtN(r.t) : '–'}</td><td class="num text-right font-semibold">${fmtN(r.i)}</td><td class="num text-right">${pctCell(r.it, r.t)}</td><td class="num text-right">${fmtN(r.d)}</td><td class="num text-right">${fmtN(r.b)}</td></tr>`).join('') || '<tr><td colspan="6" class="text-muted">ไม่มีข้อมูลในช่วงนี้</td></tr>'}</tbody></table></div>`)}`;
}

// ---- analysis: what customers book, who sells, what falls through, what sits in stock
function prevRange(from, to) { const n = daysBetween(from, to) + 1; const e = new Date(Date.parse(from + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10); const s = new Date(Date.parse(e + 'T00:00:00Z') - (n - 1) * 864e5).toISOString().slice(0, 10); return [s, e]; }
function mixTable(rows, title) {
  const tot = rows.reduce((n, r) => n + r.n, 0);
  return `<div class="min-w-0"><h3 class="font-medium mb-1">${title}</h3><table class="tbl text-sm"><thead><tr><th></th><th class="text-right">จอง</th><th class="text-right">%</th><th class="text-right">ช่วงก่อน</th><th class="text-right">เปลี่ยน</th></tr></thead><tbody>
    ${rows.slice(0, 12).map(r => { const d = r.n - r.p; return `<tr><td class="truncate" style="max-width:200px">${esc(r.k)}</td><td class="num text-right font-semibold">${fmtN(r.n)}</td><td class="num text-right text-muted">${pctOf(r.n, tot)}%</td><td class="num text-right text-muted">${fmtN(r.p)}</td><td class="num text-right" style="color:var(--${d > 0 ? 'good' : d < 0 ? 'bad' : 'muted'})">${d > 0 ? '+' : ''}${d}${r.p ? ` (${d > 0 ? '+' : ''}${Math.round(d / r.p * 100)}%)` : ''}</td></tr>`; }).join('') || '<tr><td colspan="5" class="text-muted">ไม่มีข้อมูล</td></tr>'}</tbody></table></div>`;
}
function mixOf(cur, prev, key) {
  const c = {}, p = {}; cur.forEach(a => { const k = key(a) || 'ไม่ระบุ'; c[k] = (c[k] || 0) + 1; }); prev.forEach(a => { const k = key(a) || 'ไม่ระบุ'; p[k] = (p[k] || 0) + 1; });
  return [...new Set([...Object.keys(c), ...Object.keys(p)])].map(k => ({ k, n: c[k] || 0, p: p[k] || 0 })).sort((a, b) => b.n - a.n || b.p - a.p);
}
// the finance company: what the sales confirmed, the booking form, or the invoice in DL (old form bookings have none)
function finKey(a, D) { if (isCash(a.rec)) return 'ซื้อสด'; const v = atVin(a), i = v && D && D.invByVin.get(v); return String((a.rec.flow && a.rec.flow.fin && a.rec.flow.fin.company) || a.rec.finance || (i && i.fin) || 'ไฟแนนซ์ (ยังไม่ระบุบริษัท)').toUpperCase(); }
function atVin(a) { return (a.match && a.match.vin) || (a.rec.flow && a.rec.flow.assign && a.rec.flow.assign.vin) || null; }
function dashAna(D) {
  const E = execData(D), [pf, pt] = prevRange(E.from, E.to), inR = d => !!d && d >= E.from && d <= E.to;
  const all = D.at.filter(a => !a.demo && inBr(a));
  const cur = all.filter(a => inR(a.date)), curOk = cur.filter(a => !a.cancelled);
  const prev = all.filter(a => !a.cancelled && a.date && a.date >= pf && a.date <= pt);
  // sales ranking: bookings by booking date, invoices and deliveries by their own dates
  const ppl = {};
  const P = n => (ppl[n] ||= { n, bk: 0, cx: 0, inv: 0, dv: 0 });
  cur.forEach(a => { const p = P(a.sales || 'ไม่ระบุ'); if (a.cancelled) p.cx++; else p.bk++; });
  all.forEach(a => { if (a.cancelled) return; const v = atVin(a), i = v && D.invByVin.get(v); if (i && !i.company && inR(i.idate)) P(a.sales || 'ไม่ระบุ').inv++; if (inR(a.flow.deliveredDate)) P(a.sales || 'ไม่ระบุ').dv++; });
  const rank = Object.values(ppl).filter(p => p.bk || p.cx || p.inv || p.dv).sort((a, b) => b.dv - a.dv || b.inv - a.inv || b.bk - a.bk);
  // cancellations
  const cx = cur.filter(a => a.cancelled), cxR = {}, cxM = {};
  cx.forEach(a => { const r = (a.rec.cancel && a.rec.cancel.reason) || 'ไม่ระบุ (ฟอร์มเดิม)'; cxR[r] = (cxR[r] || 0) + 1; cxM[a.model || '?'] = (cxM[a.model || '?'] || 0) + 1; });
  // finance: of the finance bookings in the period, passed / failed / still waiting, and days booking → delivery
  const fin = {};
  cur.filter(a => !isCash(a.rec)).forEach(a => {
    const k = finKey(a, D), x = (fin[k] ||= { k, n: 0, ok: 0, no: 0 }); x.n++;
    const f = a.rec.flow && a.rec.flow.fin;
    if ((f && f.ok) || a.done) x.ok++; else if (a.rec.fin_status === 'ไม่ผ่าน' || (f && f.status === 'ไม่ผ่าน') || (a.cancelled && a.rec.cancel && a.rec.cancel.reason === 'ไฟแนนซ์ไม่ผ่าน')) x.no++;
  });
  const finRows = Object.values(fin).sort((a, b) => b.n - a.n);
  const lead = {};
  all.filter(a => !a.cancelled && inR(a.flow.deliveredDate) && a.date).forEach(a => { const d = daysBetween(a.date, a.flow.deliveredDate); if (d >= 0) (lead[a.model || '?'] ||= []).push(d); });
  const med = l => { const s = l.slice().sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
  const leadRows = Object.entries(lead).map(([k, l]) => ({ k, n: l.length, avg: Math.round(l.reduce((a, b) => a + b, 0) / l.length), med: med(l) })).sort((a, b) => b.n - a.n);
  const allLead = Object.values(lead).flat();
  // stock: old cars by spec, and specs with free cars that nobody is waiting for
  const cars = [...D.cars.values()].filter(c => inBr(c) && !c.company);
  const old = {}; cars.filter(c => (c.age ?? 0) > 60).forEach(c => { const o = (old[c.spec] ||= { s: c.spec, n60: 0, n90: 0, max: 0, free: 0 }); o.n60++; if (c.age > 90) o.n90++; o.max = Math.max(o.max, c.age); if (c.status === 'free' || c.status === 'temp') o.free++; });
  const oldRows = Object.values(old).sort((a, b) => b.n90 - a.n90 || b.n60 - a.n60);
  const idle = {}; cars.filter(c => c.status === 'free' || c.status === 'temp').forEach(c => { const sp = D.specs[c.spec]; if (sp && sp.waiting) return; const o = (idle[c.spec] ||= { s: c.spec, n: 0, max: 0 }); o.n++; o.max = Math.max(o.max, c.age ?? 0); });
  const idleRows = Object.values(idle).sort((a, b) => b.n - a.n || b.max - a.max);
  return `${pageHead('วิเคราะห์', `ยอดจองตามวันที่จอง ${fmtD(E.from)} – ${fmtD(E.to)} เทียบช่วงก่อนหน้าที่ยาวเท่ากัน (${fmtD(pf)} – ${fmtD(pt)}) · ไม่นับใบที่ยกเลิก`)}
  ${dashTabs()}${periodBar(E)}
  ${tiles([
    tile('ยอดจอง', fmtN(curOk.length), { sub2: `ช่วงก่อน ${fmtN(prev.length)} (${curOk.length >= prev.length ? '+' : ''}${curOk.length - prev.length})` }),
    tile('ยกเลิก', `${pctOf(cx.length, cur.length)}%`, { tone: pctOf(cx.length, cur.length) > 10 ? 'bad' : '', sub2: `${fmtN(cx.length)} จาก ${fmtN(cur.length)} ใบ` }),
    tile('ไฟแนนซ์ / สด', `${pctOf(curOk.filter(a => !isCash(a.rec)).length, curOk.length)}%`, { sub2: `สด ${fmtN(curOk.filter(a => isCash(a.rec)).length)} ใบ` }),
    tile('จองถึงส่งมอบ (มัธยฐาน)', allLead.length ? `${med(allLead)} วัน` : '–', { sub2: allLead.length ? `เฉลี่ย ${Math.round(allLead.reduce((a, b) => a + b, 0) / allLead.length)} วัน · ${allLead.length} คัน` : '' }),
    tile('รถเกิน 90 วัน', fmtN(cars.filter(c => (c.age ?? 0) > 90).length), { tone: 'warn', view: 'stock', sub2: `เกิน 60 วัน ${fmtN(cars.filter(c => (c.age ?? 0) > 60).length)} คัน` })
  ], 'lg:grid-cols-5')}
  ${dCard('การจองแยกตามรุ่น เกรด สี ไฟแนนซ์ และช่องทาง', `<div class="grid lg:grid-cols-2 gap-5">
    ${mixTable(mixOf(curOk, prev, a => a.model), 'รุ่น')}
    ${mixTable(mixOf(curOk, prev, a => `${a.model || ''} ${gradeShort(a.model, a.grade) || a.grade || ''}`.trim()), 'รุ่น + เกรด')}
    ${mixTable(mixOf(curOk, prev, a => a.color), 'สี')}
    ${mixTable(mixOf(curOk, prev, a => finKey(a, D)), 'ไฟแนนซ์ / ซื้อสด')}
    ${mixTable(mixOf(curOk, prev, a => a.rec.source), 'ช่องทางลูกค้า')}
    ${mixTable(mixOf(curOk, prev, a => a.spec ? specLabelText(a.spec) : ''), 'รุ่น เกรด สี (สเปก)')}</div>`, 'เปลี่ยน = เทียบช่วงก่อนหน้าที่ยาวเท่ากัน ใช้ดูว่ารุ่นหรือสีไหนคนจองเพิ่มขึ้นหรือลดลง')}
  <div class="grid lg:grid-cols-2 gap-5 my-5">
    ${dCard('อันดับเซลล์', `<div class="scroll-x max-h-96 overflow-auto"><table class="tbl text-sm"><thead><tr><th>เซลล์</th><th class="text-right">จอง</th><th class="text-right">ยกเลิก</th><th class="text-right">% ยกเลิก</th><th class="text-right">ใบกำกับ</th><th class="text-right">ส่งมอบ</th></tr></thead><tbody>
      ${rank.map((p, i) => `<tr><td class="nowrap"><span class="text-muted num">${i + 1}.</span> ${salesName(p.n)}</td><td class="num text-right">${fmtN(p.bk)}</td><td class="num text-right">${fmtN(p.cx)}</td><td class="num text-right" ${pctOf(p.cx, p.bk + p.cx) > 20 ? 'style="color:var(--bad)"' : ''}>${p.bk + p.cx ? pctOf(p.cx, p.bk + p.cx) + '%' : '–'}</td><td class="num text-right">${fmtN(p.inv)}</td><td class="num text-right font-semibold">${fmtN(p.dv)}</td></tr>`).join('') || '<tr><td colspan="6" class="text-muted">ไม่มีข้อมูล</td></tr>'}</tbody></table></div>`, 'เรียงตามส่งมอบ · ใบกำกับและส่งมอบนับจากใบจอง AT ที่ผูกกับรถ')}
    ${dCard(`ยกเลิก <span class="text-muted text-sm font-normal">${fmtN(cx.length)} ใบ</span>`, `<h3 class="font-medium mb-1 text-sm">เหตุผล</h3>${barList(Object.entries(cxR).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v, pct: pctOf(v, cx.length) })), '--viz-2', 'ใบ')}
      <h3 class="font-medium mt-3 mb-1 text-sm">รุ่น (อัตรายกเลิก)</h3>${barList(Object.entries(cxM).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ k, v, pct: pctOf(v, cur.filter(a => a.model === k).length) })), '--viz-2', 'ใบ')}`)}
    ${dCard('ไฟแนนซ์ ผ่าน / ไม่ผ่าน', `<div class="scroll-x"><table class="tbl text-sm"><thead><tr><th>บริษัท</th><th class="text-right">ยื่น (จอง)</th><th class="text-right">ผ่าน</th><th class="text-right">ไม่ผ่าน</th><th class="text-right">รอผล</th><th class="text-right">% ผ่าน</th></tr></thead><tbody>
      ${finRows.map(r => `<tr><td>${esc(r.k)}</td><td class="num text-right">${fmtN(r.n)}</td><td class="num text-right">${fmtN(r.ok)}</td><td class="num text-right" ${r.no ? 'style="color:var(--bad)"' : ''}>${fmtN(r.no)}</td><td class="num text-right text-muted">${fmtN(r.n - r.ok - r.no)}</td><td class="num text-right font-semibold">${r.ok + r.no ? pctOf(r.ok, r.ok + r.no) + '%' : '–'}</td></tr>`).join('') || '<tr><td colspan="6" class="text-muted">ไม่มีข้อมูล</td></tr>'}</tbody></table></div>`, '% ผ่าน = ผ่าน ÷ (ผ่าน + ไม่ผ่าน) · ใบจองจากฟอร์มเดิมที่ไม่ได้บันทึกผลไฟแนนซ์นับเป็นรอผล จนกว่าจะส่งมอบ')}
    ${dCard('จำนวนวันจากจองถึงส่งมอบ', `<div class="scroll-x"><table class="tbl text-sm"><thead><tr><th>รุ่น</th><th class="text-right">ส่งมอบ</th><th class="text-right">เฉลี่ย (วัน)</th><th class="text-right">มัธยฐาน (วัน)</th></tr></thead><tbody>
      ${leadRows.map(r => `<tr><td>${esc(r.k)}</td><td class="num text-right">${fmtN(r.n)}</td><td class="num text-right">${r.avg}</td><td class="num text-right font-semibold">${r.med}</td></tr>`).join('') || '<tr><td colspan="4" class="text-muted">ไม่มีข้อมูล</td></tr>'}</tbody></table></div>`, 'นับใบจอง AT ที่ส่งมอบในช่วงนี้ · ใช้ตอบลูกค้าว่ารุ่นนี้รอรถประมาณกี่วัน')}
    ${dCard('รถค้างสต็อก (เกิน 60 วัน)', `<div class="scroll-x max-h-80 overflow-auto"><table class="tbl text-sm"><thead><tr><th>รุ่น เกรด สี</th><th class="text-right">เกิน 60</th><th class="text-right">เกิน 90</th><th class="text-right">เก่าสุด (วัน)</th><th class="text-right">ยังว่าง</th></tr></thead><tbody>
      ${oldRows.map(r => `<tr><td class="nowrap">${specLabel(r.s)}</td><td class="num text-right">${r.n60}</td><td class="num text-right" ${r.n90 ? 'style="color:var(--bad)"' : ''}>${r.n90 || '–'}</td><td class="num text-right">${r.max}</td><td class="num text-right">${r.free || '–'}</td></tr>`).join('') || '<tr><td colspan="5" class="text-muted">ไม่มีรถเกิน 60 วัน</td></tr>'}</tbody></table></div>`, 'อายุรถนับจากวันผลิต (ถ้าไม่มี นับจากวันฝากศูนย์หรือวันเข้าสต็อก) · ไม่นับรถบริษัท')}
    ${dCard('สเปกที่มีรถว่าง แต่ไม่มีคนรอ', `<div class="scroll-x max-h-80 overflow-auto"><table class="tbl text-sm"><thead><tr><th>รุ่น เกรด สี</th><th class="text-right">รถว่าง</th><th class="text-right">เก่าสุด (วัน)</th></tr></thead><tbody>
      ${idleRows.map(r => `<tr><td class="nowrap">${specLabel(r.s)}</td><td class="num text-right font-semibold">${r.n}</td><td class="num text-right" ${r.max > 90 ? 'style="color:var(--bad)"' : ''}>${r.max}</td></tr>`).join('') || '<tr><td colspan="3" class="text-muted">ทุกสเปกที่มีรถว่างมีคนรอ</td></tr>'}</tbody></table></div>`, 'ไม่มีใบจองรอสเปกนี้เลย เป็นสเปกที่ควรทำโปรหรือแนะนำลูกค้า')}
  </div>
  ${tradeCard(E, dCard, pctOf)}`;
}
