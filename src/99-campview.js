
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
    const src = real ? 'admin' : pk && pk.cid ? 'file' : '';
    const mc = rptMoneyCheck(row, a, D, false), mism = !!(f && f.opt && real && campFeats(d.campaign) !== campFeats(f.opt));
    list.push({ vin, br: i.br, row, a, inv: i, delivered, adv: !delivered, src, nochoose: !src, mism, money: mc, cust: a ? a.cust : i.cust || '' });
  });
  const extra = fileRows.filter(r => r.hasDir && !inv.has(r.vin) && !(D.invByVin.get(r.vin) && D.invByVin.get(r.vin).idate)).map(r => { const a = at.get(r.vin); return { vin: r.vin, br: r.br, row: r, a, inv: null, extra: true, delivered: false, adv: false, src: '', cust: a ? a.cust : '', money: rptMoneyCheck(r, a, D, false) }; });
  return { from, to, months, fileRows, list, extra, rows: list.map(x => x.row) };
}
function ccCountTable(C) {
  const fd = C.fileRows.filter(r => rptKinds(r) === 'del').length, fa = C.fileRows.filter(r => rptKinds(r) === 'adv').length, wd = C.list.filter(x => x.delivered).length, wa = C.list.filter(x => x.adv).length;
  const df = (a, b) => a === b ? '0' : `<span class="text-bad">${b - a > 0 ? '+' : ''}${b - a}</span>`;
  return `<table class="tbl text-sm"><thead><tr><th></th><th class="text-right">ไฟล์ Honda</th><th class="text-right">เว็บ</th><th class="text-right">ต่าง</th></tr></thead><tbody>
    <tr><td>ส่งมอบ</td><td class="num text-right">${fd}</td><td class="num text-right">${wd}</td><td class="num text-right">${df(fd, wd)}</td></tr>
    <tr><td>Advance</td><td class="num text-right">${fa}</td><td class="num text-right">${wa}</td><td class="num text-right">${df(fa, wa)}</td></tr>
    <tr class="rpt-tot"><td><b>รวมใบกำกับ</b></td><td class="num text-right"><b>${fd + fa}</b></td><td class="num text-right"><b>${wd + wa}</b></td><td class="num text-right">${df(fd + fa, wd + wa)}</td></tr></tbody></table>`;
}
function ccCarsTable(C, D) {
  const F = S.filters.ccF || '', L = C.list, n = f => L.filter(f).length;
  const chips = [['', 'ทั้งหมด', L.length], ['nochoose', 'ยังไม่เลือกแคมเปญ', n(x => x.nochoose)], ['adv', 'Advanced', n(x => x.adv)], ['mism', 'เว็บไม่ตรงไฟล์', n(x => x.mism)], ['extra', 'มีในไฟล์ ยังไม่ออกใบกำกับ', C.extra.length]];
  const show = F === 'extra' ? C.extra : L.filter(x => !F || (F === 'nochoose' ? x.nochoose : F === 'adv' ? x.adv : x.mism));
  const srcChip = x => x.extra ? chip('มีในไฟล์ ยังไม่ออกใบกำกับ', 'warn') : x.mism ? chip('เว็บไม่ตรงไฟล์', 'warn') : x.src === 'admin' ? chip('แอดมินเลือก', 'neutral') : x.src === 'file' ? chip('จับคู่จากไฟล์', 'good') : chip('ยังไม่เลือก', 'muted');
  const body = show.map(x => { const r = x.row;
    return `<tr${x.extra ? ' style="background:var(--surface-2)"' : ''}><td><span class="vin-auto font-mono text-xs">${esc(x.vin)}</span><div class="text-xs text-muted">${esc(x.br || '')} ${esc(x.cust)}${r && r.name ? ' · ' + esc(r.name) : ''}</div></td>
      <td class="text-xs nowrap">${x.inv && x.inv.idate ? esc(fmtD(String(x.inv.idate).slice(0, 10))) : '–'}</td>
      <td class="nowrap">${x.extra ? chip('อยู่ในไฟล์เท่านั้น', 'muted') : x.adv ? chip('Advanced', 'warn') : chip('ส่งมอบ', 'good')}${r && r.toDel ? ' ' + chip('ปรับจาก Allocated', 'good') : ''}</td>
      <td>${r && r.opt ? optTip(r.opt, false) : '<span class="text-muted">–</span>'}</td>
      <td class="text-xs">${x.money.html}${r ? rptEditBtn(r, x.a) : ''}</td><td class="nowrap">${srcChip(x)}</td>
      <td class="text-right num">${r ? (r.pay ? money(r.pay) : r.est ? money(r.est) + '<div class="text-xs text-muted">ตามแคมเปญ</div>' : '–') : '–'}</td>
      <td class="text-xs">${r && r.acts.length ? r.acts.map(y => esc(String(y.name).replace(/^SP\d+\/\d+ ?: ?/, '').slice(0, 40)) + ' ' + money(y.amt)).join('<br>') : '–'}</td>
      <td class="text-right num"><b>${r && r.tot ? money(r.tot) : '–'}</b></td></tr>`; }).join('');
  const sh = show.filter(x => !x.extra);
  return `<div class="flex flex-wrap gap-1 mb-2" role="group" aria-label="กรอง">${chips.map(([v, t, c]) => `<button type="button" class="btn btn-sm ${F === v ? 'btn-dark' : 'btn-ghost'}" data-act="cc-f" data-f="${v}">${esc(t)} ${c}</button>`).join('')}</div>
  <div class="bg-surface border border-line rounded-lg overflow-x-auto"><table class="tbl"><thead><tr><th>VIN / ลูกค้า</th><th>ใบกำกับ (เว็บ)</th><th>สถานะ</th><th>ทางเลือกตามไฟล์</th><th>แคมเปญ / เทียบเว็บ</th><th>ที่มา</th><th class="text-right">เงินทางเลือก</th><th>แคมเปญพิเศษ</th><th class="text-right">รวมเงิน</th></tr></thead><tbody>${body || '<tr><td colspan="9" class="text-muted text-sm">ไม่มีรายการ</td></tr>'}
  ${F === 'extra' ? '' : `<tr class="rpt-tot"><td colspan="6"><b>รวม ${sh.length} คัน</b></td><td class="text-right num"><b>${money(sumBy(sh, x => x.row.pay + x.row.est))}</b></td><td></td><td class="text-right num"><b>${money(sumBy(sh, x => x.row.tot))}</b></td></tr>`}</tbody></table></div>`;
}
function viewCampSum(D) {
  if (!campUpCan()) return `${pageHead('รายงานสรุปแคมเปญ', '')}<p class="text-sm text-muted">เฉพาะแอดมินขึ้นไป</p>`;
  const C = ccData(D), rows = C.rows, nAdv = C.list.filter(x => x.adv).length, nSrc = s => C.list.filter(x => x.src === s).length, nNone = C.list.filter(x => x.nochoose).length;
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
    ${box('2. เงินรางวัลรวม', `<div class="num text-3xl font-semibold">${money(sumBy(rows, r => r.tot))} <span class="text-sm font-normal text-muted">บาท</span></div><div class="text-xs text-muted mt-1">ทางเลือก ${money(sumBy(rows, r => r.pay + r.est))} · พิเศษ ${money(sumBy(rows, r => r.actAmt))}</div><div class="text-xs mt-2">แอดมินเลือก ${nSrc('admin')} · จับคู่จากไฟล์ ${nSrc('file')} · <button type="button" class="underline" style="color:var(--bad)" data-act="cc-f" data-f="nochoose" data-t="rpt-cars">ยังไม่เลือก ${nNone}</button></div>${C.extra.length ? `<div class="text-xs text-muted mt-1">ไม่รวมคันที่อยู่ในไฟล์แต่ยังไม่ออกใบกำกับ ${C.extra.length} คัน (${money(exMoney)})</div>` : ''}`)}
    ${box('3. Advance', `<div class="flex gap-3"><div><div class="text-xs text-muted">ส่งมอบแล้ว</div><div class="num text-3xl font-semibold">${advDone}</div></div><button type="button" class="text-left" data-act="cc-f" data-f="adv" data-t="rpt-cars"><div class="text-xs text-muted">ยังไม่ส่งมอบ</div><div class="num text-3xl font-semibold">${nAdv}</div></button></div><div class="text-xs text-muted mt-1">Advance = ออกใบกำกับแล้วแต่ยังไม่ส่งมอบ (ไฟล์ Honda เรียก ALLOCATED)</div>`)}
  </div>
  <section class="mb-6">${rptCharts(rows, D)}${rptStatusNote(rows, D)}</section>
  <section class="mb-6" id="rpt-model" style="scroll-margin-top:72px"><h3 class="font-head font-semibold">5. เงินรางวัลแยกรุ่น</h3><p class="text-xs text-muted mb-2">กดที่รุ่นเพื่อดูแต่ละคัน · กราฟด้านบน (4) แยกสาขา</p>${rptModelTable(rows, D, false)}</section>
  <section class="mb-6" id="rpt-cars" style="scroll-margin-top:72px"><h3 class="font-head font-semibold">รายคัน — ทุกคันที่เว็บลงว่าออกใบกำกับ</h3><p class="text-xs text-muted mb-2">ยังไม่ได้เลือกแคมเปญเลือกได้ในแถวเลย · "ส่งออก Excel" / "พิมพ์รายงาน" ส่งบัญชีได้</p>${ccCarsTable(C, D)}${C.months.length === 1 ? `<div class="mt-3">${rptLetterBox(C.fileRows, fmtM(C.months[0]))}</div>` : ''}</section>`;
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
    C.list.forEach(x => { const r = x.row; aoa.push([x.br || '', r.name, x.vin, x.cust, x.inv ? String(x.inv.idate).slice(0, 10) : '', x.adv ? 'Advance' : 'ส่งมอบ', r.camp, fixTh(r.opt), x.src === 'admin' ? 'แอดมินเลือก' : x.src === 'file' ? 'จับคู่จากไฟล์' : 'ยังไม่เลือก', r.pay + r.est, r.acts.map(y => y.name).join(' / '), r.actAmt, r.tot]); });
    aoa.push(['รวม', '', '', '', '', '', '', '', '', sumBy(C.rows, r => r.pay + r.est), '', sumBy(C.rows, r => r.actAmt), sumBy(C.rows, r => r.tot)]);
    try {
      const X = await loadXLSX(), wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), 'สรุปแคมเปญ');
      const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
      await docSave(`สรุปแคมเปญ_${rptBr() || 'ทุกสาขา'}_${C.from}_${C.to}.xlsx`, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    } catch (e) { toast('ส่งออกไม่ได้ ใช้ "พิมพ์รายงาน" แทน', 'bad'); }
  }
});
