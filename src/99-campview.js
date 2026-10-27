
// ---------- รายงานสรุปแคมเปญ (บัญชี › รายงานสรุปแคมเปญ), 27/10
// Base = every car the WEB says was invoiced in the chosen period (no waiting for Honda's file). The Honda file (Dealer Incentive Report
// + payout files) is joined by VIN. Campaign comes from two places: the one the admin chose (sale terms) and the match from the file
// (ref/honda_pay.picks, also what "ใช้แคมเปญจากไฟล์" saves when the file is imported).
function ccRef() { return S.ref.get("honda_pay") || { v: {} }; }
function ccData(D) {
  const [from, to] = periodRange(D.today), months = periodMonths(from, to), br = rptBr(), at = rptByVin(D), picks = ccRef().picks || {};
  const fileRows = months.flatMap(m => rptRows(fmtM(m))), fileBy = new Map(fileRows.map(r => [r.vin, r]));
  const inv = new Map();
  (D.X.inv || []).forEach(i => { const d = i.idate ? String(i.idate).slice(0, 10) : ''; if (i.vin && !i.company && d && d >= from && d <= to && (!br || i.br === br)) inv.set(String(i.vin).toUpperCase(), i); });
  const list = [];
  inv.forEach((i, vin) => {
    const f = fileBy.get(vin) || null, a = at.get(vin), d = a && a.rec && a.rec.deal, pk = picks[vin], delivered = rptWebDelivered(D, vin);
    const row = f ? { ...f } : { vin, br: i.br, name: (a && a.model) || i.model || '', camp: '', opt: '', st: delivered ? 'DELIVERED' : 'ALLOCATED', date: i.idate, hasDir: false, hasPay: false, pay: 0, est: 0, acts: [], actAmt: 0, toDel: false };
    const real = d && d.at && d.campaign_id && !['pending', 'none'].includes(d.campaign_id);
    if (!row.pay && !row.est && real) row.est = Number(d.margin_honda) || 0;      // the admin's campaign: its money from the sale terms
    row.tot = row.pay + row.est + row.actAmt;
    const src = real ? 'admin' : pk && pk.cid ? 'file' : '', pend = !src && !!d && d.campaign_id === 'pending';
    const mc = rptMoneyCheck(row, a, D, false), mism = !!(f && f.opt && real && campFeats(d.campaign) !== campFeats(f.opt));
    // the campaign that fits the option written in Honda's file (only for the admin who may apply it)
    let sug = null;
    if ((!src || mism) && a && f && f.opt && rptEditCan(a.br) && dealAdmin(a)) { const opts = campOptions(termsCtxAt(a, D)).opts.filter(y => y.ok && !['pending', 'none', 'other'].includes(y.value)); sug = rptSuggestOne(opts, f.opt, f.camp, a.model); }
    list.push({ vin, br: i.br, row, a, inv: i, delivered, adv: !delivered, src, pend, nochoose: !src && !pend, mism, sug, money: mc, cust: a ? a.cust : i.cust || '' });
  });
  // in Honda's file for the period but not among the web's invoices of the period: no invoice in the web at all, or invoiced on another date
  const extra = fileRows.filter(r => !inv.has(r.vin)).map(r => { const a = at.get(r.vin), w = D.invByVin.get(r.vin), wd = w && w.idate ? String(w.idate).slice(0, 10) : '';
    return { vin: r.vin, br: r.br, row: r, a, inv: null, webInv: wd, extra: true, delivered: false, adv: false, src: '', cust: a ? a.cust : (w && w.cust) || '', money: rptMoneyCheck(r, a, D, false) }; });
  return { from, to, months, fileRows, list, extra, rows: list.map(x => x.row) };
}
function ccNum(n, k, extra) { return n ? `<button type="button" class="num underline decoration-dotted" data-act="cc-drill" data-k="${k}" title="กดดูเลขตัวถัง">${n}</button>` : `<span class="num">${n}</span>`; }
function ccCountTable(C) {
  const fd = C.fileRows.filter(r => rptKinds(r) === 'del').length, fa = C.fileRows.filter(r => rptKinds(r) === 'adv').length, wd = C.list.filter(x => x.delivered).length, wa = C.list.filter(x => x.adv).length;
  const df = (a, b, k) => a === b ? '0' : `<button type="button" class="num underline decoration-dotted text-bad" data-act="cc-drill" data-k="${k}" title="กดดูว่าคันไหนต่าง">${b - a > 0 ? '+' : ''}${b - a}</button>`;
  return `<table class="tbl text-sm"><thead><tr><th></th><th class="text-right">ไฟล์ Honda</th><th class="text-right">เว็บ</th><th class="text-right">ต่าง</th></tr></thead><tbody>
    <tr><td>ส่งมอบ</td><td class="text-right">${ccNum(fd, 'fd')}</td><td class="text-right">${ccNum(wd, 'wd')}</td><td class="text-right">${df(fd, wd, 'dd')}</td></tr>
    <tr><td>Advance</td><td class="text-right">${ccNum(fa, 'fa')}</td><td class="text-right">${ccNum(wa, 'wa')}</td><td class="text-right">${df(fa, wa, 'da')}</td></tr>
    <tr class="rpt-tot"><td><b>รวมใบกำกับ</b></td><td class="text-right"><b>${ccNum(fd + fa, 'ft')}</b></td><td class="text-right"><b>${ccNum(wd + wa, 'wt')}</b></td><td class="text-right">${df(fd + fa, wd + wa, 'dt')}</td></tr></tbody></table>`;
}
// the cars behind a number (frame numbers, open one for its details)
function ccDrillItems(C, k) {
  const fk = r => rptKinds(r), inFile = new Set(C.fileRows.map(r => r.vin)), inWeb = new Set(C.list.map(x => x.vin));
  const L = C.list, fromRow = (r, note) => ({ vin: r.vin, br: r.br, who: r.name, date: '', note });
  const fromX = (x, note) => ({ vin: x.vin, br: x.br, who: `${x.cust || ''}${x.row && x.row.name ? ' · ' + x.row.name : ''}`, date: x.inv && x.inv.idate ? String(x.inv.idate).slice(0, 10) : '', note });
  const fileOnly = k0 => C.fileRows.filter(r => !inWeb.has(r.vin) && (!k0 || fk(r) === k0)).map(r => { const x = C.extra.find(e => e.vin === r.vin); return { vin: r.vin, br: r.br, who: `${x && x.cust ? x.cust + ' · ' : ''}${r.name || ''}`, date: '', note: `อยู่ในไฟล์ (${fk(r) === 'adv' ? 'Advance' : 'ส่งมอบ'}) · ${x && x.webInv ? 'เว็บลงใบกำกับ ' + fmtD(x.webInv) + ' (นอกช่วง)' : 'เว็บไม่มีใบกำกับ'}` }; });
  const webOnly = pred => L.filter(x => pred(x) && !inFile.has(x.vin)).map(x => fromX(x, 'ใบกำกับในเว็บ ไม่อยู่ในไฟล์'));
  const T = {
    fd: ['ส่งมอบ ตามไฟล์ Honda', C.fileRows.filter(r => fk(r) === 'del').map(r => fromRow(r, r.st || ''))],
    fa: ['Advance ตามไฟล์ Honda', C.fileRows.filter(r => fk(r) === 'adv').map(r => fromRow(r, r.st || ''))],
    ft: ['ใบกำกับทั้งหมด ตามไฟล์ Honda', C.fileRows.map(r => fromRow(r, r.st || ''))],
    wd: ['ส่งมอบ ตามเว็บ', L.filter(x => x.delivered).map(x => fromX(x, ''))],
    wa: ['Advance ตามเว็บ (ยังไม่ส่งมอบ)', L.filter(x => x.adv).map(x => fromX(x, ''))],
    wt: ['ใบกำกับทั้งหมด ตามเว็บ', L.map(x => fromX(x, ''))],
    dd: ['ส่งมอบ: คันที่ไฟล์กับเว็บไม่ตรงกัน', [...fileOnly('del'), ...webOnly(x => x.delivered)]],
    da: ['Advance: คันที่ไฟล์กับเว็บไม่ตรงกัน', [...fileOnly('adv'), ...webOnly(x => x.adv)]],
    dt: ['ใบกำกับ: คันที่ไฟล์กับเว็บไม่ตรงกัน', [...fileOnly(''), ...webOnly(() => true)]],
    admin: ['แอดมินเลือกแคมเปญแล้ว', L.filter(x => x.src === 'admin').map(x => fromX(x, ''))],
    file: ['จับคู่แคมเปญจากไฟล์แล้ว', L.filter(x => x.src === 'file').map(x => fromX(x, ''))],
    pend: ['รอเลือกแคมเปญ', L.filter(x => x.pend).map(x => fromX(x, ''))],
    none: ['ยังไม่เลือกแคมเปญ', L.filter(x => x.nochoose).map(x => fromX(x, ''))],
    advdone: ['Advance ที่ส่งมอบแล้ว', L.filter(x => x.delivered && x.row.hasDir && (rptKinds(x.row) === 'adv' || x.row.toDel)).map(x => fromX(x, 'ไฟล์เคยเป็น Allocated'))],
    advnot: ['Advance ที่ยังไม่ส่งมอบ', L.filter(x => x.adv).map(x => fromX(x, ''))]
  };
  return T[k] || null;
}
function ccDrillPanel(C) {
  const k = S.filters.ccDrill, t = k && ccDrillItems(C, k); if (!t) return '';
  return `<section class="bg-surface border border-line rounded-lg p-4 mb-4" id="rpt-drill" style="scroll-margin-top:72px"><div class="flex items-center gap-2 mb-2"><h3 class="font-head font-semibold">${esc(t[0])} · ${t[1].length} คัน</h3><button type="button" class="btn btn-ghost btn-sm ml-auto" data-act="cc-drill" data-k="">ปิด</button></div>
    <div class="overflow-x-auto max-h-[50vh] overflow-y-auto"><table class="tbl text-sm"><thead><tr><th>เลขตัวถัง</th><th>สาขา</th><th>ลูกค้า / รุ่น</th><th>ใบกำกับ (เว็บ)</th><th>หมายเหตุ</th></tr></thead><tbody>${t[1].map(r => `<tr><td>${vinLink({ vin: r.vin })}</td><td>${esc(r.br || '')}</td><td class="text-xs">${esc(r.who)}</td><td class="text-xs nowrap">${r.date ? esc(fmtD(r.date)) : '–'}</td><td class="text-xs">${esc(r.note)}</td></tr>`).join('') || '<tr><td colspan="5" class="text-muted">ไม่มีรายการ</td></tr>'}</tbody></table></div></section>`;
}
function ccCarsTable(C, D) {
  const F = S.filters.ccF || '', L = C.list, n = f => L.filter(f).length, sel = S.filters.ccSel || {};
  const chips = [['', 'ทั้งหมด', L.length], ['chosen', 'เลือกแคมเปญแล้ว', n(x => !!x.src)], ['pend', 'รอเลือกแคมเปญ', n(x => x.pend)], ['nochoose', 'ยังไม่เลือกแคมเปญ', n(x => x.nochoose)], ['adv', 'Advanced', n(x => x.adv)], ['mism', 'เว็บไม่ตรงไฟล์', n(x => x.mism)], ['extra', 'มีในไฟล์ ยังไม่ออกใบกำกับ', C.extra.length]];
  const base = F === 'extra' ? C.extra : F === '' ? [...L, ...C.extra] : L.filter(x => F === 'chosen' ? !!x.src : F === 'pend' ? x.pend : F === 'nochoose' ? x.nochoose : F === 'adv' ? x.adv : x.mism);
  const show = base, canSug = show.filter(x => x.sug), nSel = Object.keys(sel).filter(v => sel[v] && L.some(x => x.vin === v && x.sug)).length;
  const srcChip = x => x.extra ? chip('มีในไฟล์ ไม่มีใบกำกับในช่วงนี้', 'warn') : x.mism ? chip('เว็บไม่ตรงไฟล์', 'bad') : x.src === 'admin' ? chip('แอดมินเลือก', 'neutral') : x.src === 'file' ? chip('จับคู่จากไฟล์', 'good') : x.pend ? chip('รอเลือกแคมเปญ', 'warn') : chip('ยังไม่เลือก', 'muted');
  const SUG = /<button[^>]*data-act="(?:rpt-pick-use|rpt-confirm)"[^>]*>[^<]*<\/button>/;
  const body = show.map(x => { const r = x.row;
    // the "use the suggested" button goes on the same line as แก้ไข / เงิน Honda
    const mm = String(x.money.html).match(SUG), sugBtn = mm ? mm[0].replace('<button ', '<button style="padding:1px 8px;min-height:0;font-size:12px;line-height:1.6" ') : '', mhtml = String(x.money.html).replace(SUG, '');
    return `<tr${x.extra ? ' style="background:var(--surface-2)"' : x.mism ? ' style="box-shadow:inset 4px 0 0 var(--bad)"' : ''}><td class="w-8">${x.sug ? `<input type="checkbox" data-cc-sel="${esc(x.vin)}" ${sel[x.vin] ? 'checked' : ''} aria-label="เลือก ${esc(x.vin)} ใช้ตามที่แนะนำ" title="ติ๊กเพื่อใช้ตามที่แนะนำ">` : ''}</td>
      <td>${vinLink({ vin: x.vin })}<div class="text-xs text-muted">${esc(x.br || '')} ${esc(x.cust)}${r && r.name ? ' · ' + esc(r.name) : ''}</div></td>
      <td class="text-xs nowrap">${x.inv && x.inv.idate ? esc(fmtD(String(x.inv.idate).slice(0, 10))) : '–'}</td>
      <td class="nowrap">${x.extra ? chip('อยู่ในไฟล์เท่านั้น', 'muted') : x.adv ? chip('Advanced', 'warn') : chip('ส่งมอบ', 'good')}${r && r.toDel ? ' ' + chip('ปรับจาก Allocated', 'good') : ''}${x.extra ? `<div class="text-xs text-muted">${x.webInv ? 'เว็บลงใบกำกับ ' + esc(fmtD(x.webInv)) + ' (นอกช่วง)' : 'เว็บไม่มีใบกำกับ'}</div>` : ''}</td>
      <td>${r && r.opt ? optTip(r.opt, false) : '<span class="text-muted">–</span>'}</td>
      <td class="text-xs">${x.mism ? `<div class="px-2 py-1 mb-1 rounded text-xs font-semibold" style="background:var(--bad);color:#fff">แคมเปญที่แอดมินเลือกไม่ตรงกับไฟล์</div>` : ''}${mhtml}${r ? rptEditBtn(r, x.a, sugBtn) : ''}</td><td class="nowrap">${srcChip(x)}</td>
      <td class="text-right num">${r ? (r.pay ? money(r.pay) : r.est ? money(r.est) + '<div class="text-xs text-muted">ตามแคมเปญ</div>' : '–') : '–'}</td>
      <td class="text-xs">${r && r.acts.length ? r.acts.map(y => esc(String(y.name).replace(/^SP\d+\/\d+ ?: ?/, '').slice(0, 40)) + ' ' + money(y.amt)).join('<br>') : '–'}</td>
      <td class="text-right num"><b>${r && r.tot ? money(r.tot) : '–'}</b></td></tr>`; }).join('');
  const sh = show.filter(x => !x.extra);
  const bulk = canSug.length ? `<div class="flex flex-wrap items-center gap-2 mb-2 text-sm"><span class="text-muted">มีคำแนะนำ ${canSug.length} คัน</span><button type="button" class="btn btn-ghost btn-sm" data-act="cc-selall">ติ๊กทั้งหมดที่มีคำแนะนำ</button><button type="button" class="btn btn-ghost btn-sm" data-act="cc-selnone">ไม่เลือก</button><button type="button" class="btn btn-red btn-sm" data-act="cc-apply" ${nSel ? '' : 'disabled'}>ใช้ตามที่แนะนำ (${nSel} คัน)</button></div>` : '';
  return `<div class="flex flex-wrap gap-1 mb-2" role="group" aria-label="กรอง">${chips.map(([v, t, c]) => `<button type="button" class="btn btn-sm ${F === v ? 'btn-dark' : 'btn-ghost'}" data-act="cc-f" data-f="${v}">${esc(t)} ${c}</button>`).join('')}</div>${bulk}
  <div class="bg-surface border border-line rounded-lg overflow-x-auto"><table class="tbl"><thead><tr><th></th><th>VIN / ลูกค้า</th><th>ใบกำกับ (เว็บ)</th><th>สถานะ</th><th>ทางเลือกตามไฟล์</th><th>แคมเปญ / เทียบเว็บ</th><th>ที่มา</th><th class="text-right">เงินทางเลือก</th><th>แคมเปญพิเศษ</th><th class="text-right">รวมเงิน</th></tr></thead><tbody>${body || '<tr><td colspan="10" class="text-muted text-sm">ไม่มีรายการ</td></tr>'}
  ${F === 'extra' ? '' : `<tr class="rpt-tot"><td></td><td colspan="6"><b>รวม ${sh.length} คัน</b></td><td class="text-right num"><b>${money(sumBy(sh, x => x.row.pay + x.row.est))}</b></td><td></td><td class="text-right num"><b>${money(sumBy(sh, x => x.row.tot))}</b></td></tr>`}</tbody></table></div>`;
}
function viewCampSum(D) {
  if (!campUpCan()) return `${pageHead('รายงานสรุปแคมเปญ', '')}<p class="text-sm text-muted">เฉพาะแอดมินขึ้นไป</p>`;
  const C = ccData(D), rows = C.rows, nAdv = C.list.filter(x => x.adv).length, nSrc = s => C.list.filter(x => x.src === s).length, nNone = C.list.filter(x => x.nochoose).length, nPend = C.list.filter(x => x.pend).length;
  // once per period / branch / file content: match the file to the campaigns by itself (never inside the draw)
  const ak = [C.from, C.to, rptBr(), C.fileRows.length, Object.keys(rptAll()).length].join('|');
  if (S.rptAutoKey !== ak) { S.rptAutoKey = ak; setTimeout(async () => { for (const m of C.months.filter(m => C.fileRows.some(r => rptMonth(r.rep) === m))) { try { await rptAutoRun(fmtM(m)); } catch (e) { /* the chooser stays */ } } }, 0); }
  S.filters.rptRep = C.months.length === 1 ? fmtM(C.months[0]) : '';
  const ctl = `<style>.rpt-grp td{background:var(--surface-2);}.rpt-sub td{font-weight:600;border-top:1px solid var(--line);}.rpt-tot td{background:var(--surface-2);border-top:2px solid var(--line);}</style>
  <div class="flex flex-wrap items-end gap-3 mb-4 p-3 rounded-lg border border-line bg-surface">${periodPicker()}
    ${myBranch() ? `<span class="text-sm">สาขา ${esc(myBranch())}</span>` : `<div class="flex flex-wrap gap-1" role="group" aria-label="สาขา">${[['', 'ทุกสาขา'], ...BRS.map(b => [b, b])].map(([b, t]) => `<button type="button" class="btn btn-sm ${rptBr() === b ? 'btn-dark' : 'btn-ghost'}" data-act="rpt-br" data-br="${b}">${t}</button>`).join('')}</div>`}
    <span class="ml-auto flex gap-2"><button class="btn btn-ghost btn-sm" data-act="rpt-export">ส่งออก Excel</button><button class="btn btn-red btn-sm" data-act="rpt-print">พิมพ์รายงาน</button></span></div>`;
  const box = (t, body, id) => `<section class="bg-surface border border-line rounded-lg p-4 min-w-0" ${id ? `id="${id}" style="scroll-margin-top:72px"` : ''}><h3 class="font-head font-semibold mb-2">${t}</h3>${body}</section>`;
  const advDone = C.list.filter(x => x.delivered && x.row.hasDir && (rptKinds(x.row) === 'adv' || x.row.toDel)).length;
  const exMoney = sumBy(C.extra, x => x.row.tot);
  return `${pageHead('รายงานสรุปแคมเปญ', `ใบกำกับภาษีที่เว็บลงไว้ ${fmtD(C.from)} – ${fmtD(C.to)} เทียบไฟล์ Honda · เงินรางวัลจ่ายตามเดือนที่ออกใบกำกับ`)}${ctl}
  <div class="grid lg:grid-cols-3 gap-4 mb-4">
    ${box('1. ใบกำกับภาษี: ไฟล์ Honda vs เว็บ', ccCountTable(C))}
    ${box('2. เงินรางวัลรวม', `<div class="num text-3xl font-semibold">${money(sumBy(rows, r => r.tot))} <span class="text-sm font-normal text-muted">บาท</span></div><div class="text-xs text-muted mt-1">ทางเลือก ${money(sumBy(rows, r => r.pay + r.est))} · พิเศษ ${money(sumBy(rows, r => r.actAmt))}</div><div class="text-xs mt-2">แอดมินเลือก ${ccNum(nSrc('admin'), 'admin')} · จับคู่จากไฟล์ ${ccNum(nSrc('file'), 'file')}${nPend ? ` · รอเลือก ${ccNum(nPend, 'pend')}` : ''} · <span style="color:var(--bad)">ยังไม่เลือก ${ccNum(nNone, 'none')}</span></div>${C.extra.length ? `<div class="text-xs text-muted mt-1">ไม่รวมคันที่อยู่ในไฟล์แต่ยังไม่ออกใบกำกับ ${C.extra.length} คัน (${money(exMoney)})</div>` : ''}`)}
    ${box('3. Advance', `<div class="flex gap-3"><div><div class="text-xs text-muted">ส่งมอบแล้ว</div><div class="num text-3xl font-semibold">${ccNum(advDone, 'advdone')}</div></div><div><div class="text-xs text-muted">ยังไม่ส่งมอบ</div><div class="num text-3xl font-semibold">${ccNum(nAdv, 'advnot')}</div></div></div><div class="text-xs text-muted mt-1">Advance = ออกใบกำกับแล้วแต่ยังไม่ส่งมอบ (ไฟล์ Honda เรียก ALLOCATED)</div>`)}
  </div>
  ${ccDrillPanel(C)}
  <section class="mb-6">${rptCharts(rows, D)}${rptStatusNote(rows, D)}</section>
  <section class="mb-6" id="rpt-model" style="scroll-margin-top:72px"><h3 class="font-head font-semibold">5. เงินรางวัลแยกรุ่น</h3><p class="text-xs text-muted mb-2">กดที่รุ่นเพื่อดูแต่ละคัน · กราฟด้านบน (4) แยกสาขา</p>${rptModelTable(rows, D, false)}</section>
  <section class="mb-6" id="rpt-cars" style="scroll-margin-top:72px"><h3 class="font-head font-semibold">รายคัน — ออกใบกำกับ ${esc(fmtD(C.from))} – ${esc(fmtD(C.to))}</h3><p class="text-xs text-muted mb-2">ยังไม่ได้เลือกแคมเปญเลือกได้ในแถวเลย · "ส่งออก Excel" / "พิมพ์รายงาน" ส่งบัญชีได้</p>${ccCarsTable(C, D)}${C.months.length === 1 ? `<div class="mt-3">${rptLetterBox(C.fileRows, fmtM(C.months[0]))}</div>` : ''}</section>`;
}
function ccSheet(D, C) {
  const k = [['ใบกำกับ (เว็บ)', C.list.length], ['เงินรางวัลรวม', money(sumBy(C.rows, r => r.tot))], ['Advance (ยังไม่ส่งมอบ)', C.list.filter(x => x.adv).length], ['ยังไม่เลือกแคมเปญ', C.list.filter(x => x.nochoose).length]];
  return `<div class="sheet"><h1>รายงานสรุปแคมเปญ Honda ${esc(fmtD(C.from))} – ${esc(fmtD(C.to))}</h1><p class="sub">AT Honda ${rptBr() ? esc(BR[rptBr()].name) : 'ทุกสาขา'} · พิมพ์ ${esc(fmtD(todayISO()))}</p>
  <table><tbody><tr>${k.map(([t, n]) => `<th>${esc(t)}</th><td>${n}</td>`).join('')}</tr></tbody></table>
  <h2>1. ใบกำกับ ไฟล์ Honda vs เว็บ</h2>${ccCountTable(C)}
  <h2>2. สรุปรายรุ่น</h2>${rptModelTable(C.rows, D, false).replace(/<tr class="cursor-pointer"[^>]*>/g, '<tr>').replace(/[▸▾] /g, '')}
  <h2>3. รายคัน</h2>${rptCarTable(C.rows, true, D, rptByVin(D))}<h2>4. คำอธิบายทางเลือก</h2>${optLegend(C.rows)}</div>`;
}
Object.assign(ACTIONS, {
  'cc-drill'(el) { S.filters.ccDrill = el.dataset.k && S.filters.ccDrill !== el.dataset.k ? el.dataset.k : ''; render(); if (S.filters.ccDrill) setTimeout(() => { const e = document.getElementById('rpt-drill'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60); },
  'cc-selall'() { const C = ccData(derive()), o = {}; C.list.forEach(x => { if (x.sug) o[x.vin] = true; }); S.filters.ccSel = o; render(); },
  'cc-selnone'() { S.filters.ccSel = {}; render(); },
  // use the suggested campaign for the ticked cars: no sale terms yet -> kept in the report (like picking), terms with no/other campaign -> applied to the sale terms
  async 'cc-apply'() {
    const D = derive(), C = ccData(D), sel = S.filters.ccSel || {}, todo = C.list.filter(x => sel[x.vin] && x.sug);
    if (!todo.length) return;
    const cur = S.ref.get('honda_pay') || { v: {} }, picks = { ...(cur.picks || {}) }; let nPick = 0, nApply = 0, nSkip = 0;
    for (const x of todo) {
      const a = x.a, d = a.rec && a.rec.deal;
      if (!d || !d.at) { picks[x.vin] = { cid: x.sug.value, name: campFull(x.sug), sup: Number(x.sug.sup) || 0, ...actor() }; nPick++; }
      else if (poLocked(a)) nSkip++;
      else if (await rptApplyCamp(a, x.sug.value, 'ใช้ตามที่แนะนำ (รายงานสรุปแคมเปญ)', null, null, 'ไฟล์ Honda')) nApply++; else nSkip++;
    }
    if (nPick) await write('ref', 'honda_pay', { ...(S.ref.get('honda_pay') || cur), picks });
    S.filters.ccSel = {};
    toast(`ใช้ตามที่แนะนำแล้ว ${nPick + nApply} คัน${nSkip ? ` · ข้าม ${nSkip} คัน (ส่งมอบแล้วแก้เงื่อนไขไม่ได้ หรือใช้ไม่ได้)` : ''}`, nSkip ? 'warn' : undefined); render();
  },
  'cc-f'(el) { S.filters.ccF = el.dataset.f || ''; render(); if (el.dataset.t) setTimeout(() => { const e = document.getElementById(el.dataset.t); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); },
  'rpt-print'() {
    const D = derive(), C = ccData(D); if (!C.list.length) return;
    let root = document.getElementById('print-root'); if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
    root.innerHTML = ccSheet(D, C);
    try { window.print(); } catch (e) { toast('เปิดหน้าพิมพ์ไม่ได้ ใช้ "บันทึกเป็น PDF" แทน', 'bad'); }
  },
  async 'rpt-export'() {
    const D = derive(), C = ccData(D); if (!C.list.length) return;
    const aoa = [['สาขา', 'รุ่น', 'เลขตัวถัง', 'ลูกค้า', 'วันที่ใบกำกับ (เว็บ)', 'สถานะ', 'แคมเปญ (ไฟล์)', 'ทางเลือก (ไฟล์)', 'ที่มาของแคมเปญ', 'เงินตามทางเลือก', 'แคมเปญพิเศษ', 'เงินแคมเปญพิเศษ', 'รวมเงิน']];
    C.list.forEach(x => { const r = x.row; aoa.push([x.br || '', r.name, x.vin, x.cust, x.inv ? String(x.inv.idate).slice(0, 10) : '', x.adv ? 'Advance' : 'ส่งมอบ', r.camp, fixTh(r.opt), x.src === 'admin' ? 'แอดมินเลือก' : x.src === 'file' ? 'จับคู่จากไฟล์' : x.pend ? 'รอเลือกแคมเปญ' : 'ยังไม่เลือก', r.pay + r.est, r.acts.map(y => y.name).join(' / '), r.actAmt, r.tot]); });
    aoa.push(['รวม', '', '', '', '', '', '', '', '', sumBy(C.rows, r => r.pay + r.est), '', sumBy(C.rows, r => r.actAmt), sumBy(C.rows, r => r.tot)]);
    try {
      const X = await loadXLSX(), wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), 'สรุปแคมเปญ');
      const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
      await docSave(`สรุปแคมเปญ_${rptBr() || 'ทุกสาขา'}_${C.from}_${C.to}.xlsx`, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    } catch (e) { toast('ส่งออกไม่ได้ ใช้ "พิมพ์รายงาน" แทน', 'bad'); }
  }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset || t.dataset.ccSel === undefined) return;
  S.filters.ccSel = { ...(S.filters.ccSel || {}), [String(t.dataset.ccSel).toUpperCase()]: t.checked }; render();
});

// red bar: the campaign in Honda's file is not the one the admin chose
function ccRedBar(web, file) { return `<div class="px-3 py-1.5 rounded text-sm font-semibold" style="background:var(--bad);color:#fff">แคมเปญในไฟล์ไม่ตรงกับที่แอดมินเลือก<div class="text-xs font-normal">แอดมินเลือก: ${esc(web || '–')} · ไฟล์ Honda: ${esc(file || '–')}</div></div>`; }
