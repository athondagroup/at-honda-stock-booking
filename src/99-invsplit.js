// ---------- ยอดขาย (ใบกำกับ): Honda (ไฟล์รายงาน) · IDS (DL) · เว็บ (ล่วงหน้า), 4/11
// Honda counts a car in the month of its FIRST invoice. A car whose invoice was cancelled and issued again is "ซ้ำ" in the new month
// (not counted again) and is added back ("ย้อนเติม") to the old month from Honda's report history. No report for the month = "รออัปไฟล์", never a guess.
function ivsOldRep(vin, ym) {
  const sv = rptAll()[vin]; if (!sv) return '';
  const h = [sv, ...(sv.prev || [])].filter(x => x && x.rep && rptMonth(x.rep) && rptMonth(x.rep) < ym).sort((a, b) => rptMonth(b.rep).localeCompare(rptMonth(a.rep)))[0];
  return h ? h.rep : '';
}
function ivsData(D, E) {
  const ms = monthsIn(E.from, E.to), d10 = v => v ? String(v).slice(0, 10) : '', dl = D.X.inv.filter(i => i.idate && !i.other && inBr(i) && d10(i.idate) >= E.from && d10(i.idate) <= E.to).map(i => ({ ...i, date: d10(i.idate) })), dec = ((S.ref.get('inv_count') || {}).v) || {};   // straight from the DL rows: E.invoiced swaps the Advance-document cars for a document row
  const itS = (s, note) => ({ ym: s.date.slice(0, 7), vin: s.vin || '', br: s.br, who: `${s.cust ? s.cust + ' · ' : ''}${s.model || ''}`, date: d10(s.idate || s.date), ddate: d10(s.ddate), note });
  const itR = (r, w, note) => ({ vin: r.vin, br: r.br, who: `${w && w.cust ? w.cust + ' · ' : ''}${r.name || ''}`, date: d10(w && w.idate), ddate: d10(w && w.ddate), note });
  const out = { ms: [], L: { new: [], dup: [], miss: [], back: [], gone: [], alloc: [], deliv: [], pend: [], hadv: [], okc: [], xc: [] }, hondaN: 0, idsN: 0, dlN: 0, dupN: 0, tFile: 0, nFile: 0, nWait: 0, dlWait: 0 };
  ms.forEach(ym => {
    const all = rptRows(fmtM(ym)), rows = all.filter(r => inBr({ br: r.br })), mi = dl.filter(s => s.date.slice(0, 7) === ym), m = { ym, has: all.length > 0, n: mi.length, honda: 0, nNew: 0, nDup: 0, nMiss: 0, nBack: 0, nGone: 0, nOk: 0, nX: 0 };
    if (m.has) {
      const fileBy = new Map(rows.map(r => [r.vin, r])), dlv = new Set(mi.map(s => s.vin));
      mi.forEach(s => { const f = s.vin && fileBy.get(s.vin);
        if (f) { m.nNew++; out.L.new.push(itS(s, `ไฟล์ Honda ${fmtM(ym)}: ${rptKinds(f) === 'adv' ? 'Advance' : 'ส่งมอบ'}`)); }
        else { const o = s.vin && ivsOldRep(s.vin, ym); if (o) { m.nDup++; out.L.dup.push(itS(s, `ออกใบกำกับซ้ำ · ไฟล์ Honda นับไปแล้วเดือน ${o}`)); } else { const d = dec[(s.vin || '') + '|' + ym], by = d && (d.by_name || d.role || '');
            if (d && d.count) { m.nOk++; out.L.okc.push(itS(s, `แอดมินยืนยันนับเป็นยอด: ${d.reason}`)); } else if (d) { m.nX++; out.L.xc.push(itS(s, `แอดมินยืนยันไม่นับ: ${d.reason}`)); } else { m.nMiss++; out.L.miss.push(itS(s, s.vin ? 'ไม่มีในไฟล์ Honda และไม่มีประวัติเดือนเก่า → ตรวจสอบ (เช่น แคมเปญพิเศษ) แล้วกดนับ/ไม่นับ' : 'ไม่มีเลขตัวถัง')); } } } });
      rows.filter(r => !dlv.has(r.vin)).forEach(r => { const w = D.invByVin.get(r.vin);
        if (w && w.idate && d10(w.idate).slice(0, 7) !== ym && !w.other) { m.nBack++; out.L.back.push(itR(r, w, `ไฟล์ Honda ${fmtM(ym)} · เว็บออกใบกำกับใหม่ ${fmtD(d10(w.idate))}`)); }
        else { m.nGone++; out.L.gone.push(itR(r, w, w ? `ไฟล์ Honda ${fmtM(ym)} · ใบกำกับในเว็บ ${fmtD(d10(w.idate))} ไม่เข้าเงื่อนไขนับ (สาขาอื่น/รถบริษัท)` : `ไฟล์ Honda ${fmtM(ym)} · ไม่พบใบกำกับในเว็บ`)); } });
      rows.filter(r => rptKinds(r) === 'adv').forEach(r => { const w = D.invByVin.get(r.vin); out.L.hadv.push(itR(r, w, `ไฟล์ Honda ${fmtM(ym)}: ALLOCATED (Advance)`)); });
      m.honda = rows.length; out.nFile++; out.hondaN += m.honda; out.idsN += m.nNew + m.nBack + m.nOk; out.dlN += m.n; out.dupN += m.nDup; out.tFile += tgtOf(ym);
    } else out.dlWait += m.n;
    out.ms.push(m);
  });
  dl.forEach(s => { if (s.ddate || (s.vin && rptWebDelivered(D, String(s.vin).toUpperCase()))) return; out.L.pend.push(itS(s, `ออกใบกำกับแล้ว ยังไม่ส่งมอบ · ${daysBetween(d10(s.idate || s.date), D.today)} วัน`)); });
  out.nDl = dl.length;
  out.all = out.nFile === ms.length && ms.length > 0; out.none = out.nFile === 0;
  // the web layer: what the web knows that IDS has not told yet (right now)
  const W = D.at.filter(a => !a.cancelled && !a.demo && inBr(a)), vOf = a => { const v = atVin(a); return v ? String(v).toUpperCase() : ''; };
  W.filter(a => a.active && vOf(a) && !D.invByVin.has(vOf(a))).forEach(a => out.L.alloc.push({ vin: vOf(a), br: a.br, who: `${a.cust || ''} · ${a.model || ''}`, date: '', ddate: '', note: 'จัดสรรในเว็บแล้ว ยังไม่มีใบกำกับใน DL' }));
  W.filter(a => a.done && a.flow && a.flow.done && a.flow.done.delivered && vOf(a) && !(D.invByVin.get(vOf(a)) || {}).ddate).forEach(a => { const i = D.invByVin.get(vOf(a)); out.L.deliv.push({ vin: vOf(a), br: a.br, who: `${a.cust || ''} · ${a.model || ''}`, date: d10(i && i.idate), ddate: d10(a.flow.done.delivered.date), note: i ? 'ส่งมอบในเว็บแล้ว DL ยังไม่มีวันส่งมอบ' : 'ส่งมอบในเว็บแล้ว ยังไม่มีใบกำกับใน DL' }); });
  return out;
}
const ivsNum = (n, k, tone) => n ? `<button type="button" class="num underline decoration-dotted" ${tone ? `style="color:var(--${tone})"` : ''} data-act="ivs-drill" data-k="${k}" title="กดดูรายคัน">${n}</button>` : `<span class="num">${n}</span>`;
function ivsCard(D, E) {
  const V = ivsData(D, E), ms = V.ms, many = ms.length > 1, row = (t, v, cls) => `<div class="flex justify-between items-baseline py-1.5 border-t border-line text-sm ${cls || ''}"><span>${t}</span><span class="num">${v}</span></div>`;
  const pct = V.tFile ? pctOf(V.hondaN, V.tFile) : 0, wait = `<span class="text-xs rounded-full px-2 py-0.5 ml-1" style="background:var(--surface-2);color:var(--warn,#8a4b00)">รออัปไฟล์</span>`;
  const hon = V.none ? `<div class="text-2xl font-bold" style="color:var(--warn,#8a4b00)">รออัปไฟล์</div><div class="text-xs text-muted">อัปไฟล์รายงาน Honda ${ms.length === 1 ? 'เดือน ' + esc(fmtM(ms[0].ym)) : 'ของช่วงนี้'} (อัปเดตรายงานแคมเปญ) เพื่อดูยอด</div>`
    : `<div class="text-3xl font-bold num">${V.hondaN} <span class="text-base font-semibold">คัน</span></div><div class="text-xs text-muted">ตามไฟล์รายงาน Honda${V.all ? '' : ` · ไฟล์ ${V.nFile}/${ms.length} เดือน (นับเฉพาะเดือนที่อัปแล้ว)`}${V.tFile ? ` · เป้า ${fmtN(V.tFile)} คัน` : ''}</div>${V.L.hadv.length || V.hondaN ? `<div class="text-sm mt-2">ในจำนวนนี้ ส่งมอบแล้ว <b class="num">${V.hondaN - V.L.hadv.length}</b> · ยังไม่ส่งมอบ (Advance) <b class="num">${ivsNum(V.L.hadv.length, 'hadv')}</b> คัน</div>` : ''}${V.tFile ? `<div class="mt-2 h-2 rounded-full overflow-hidden" style="background:var(--line)"><div style="width:${Math.min(100, pct)}%;height:100%;background:var(--${pct >= 100 ? 'good' : 'warn,#b5832a'})"></div></div><div class="text-xs text-muted mt-1">ทำได้ ${pct}% · ขาด ${fmtN(Math.max(0, V.tFile - V.hondaN))} คัน</div>` : ''}`;
  const dif = V.hondaN - V.idsN;
  const ids = V.none ? `<div class="text-sm">ออกใบกำกับในเว็บ (DL) <b class="num">${V.dlWait}</b> คัน ${wait}</div><div class="text-xs text-muted">ยังไม่แยกใหม่/ซ้ำ เพราะต้องใช้ไฟล์รายงานเทียบประวัติ · นับตาม DL ไม่รวมรถขายสาขาอื่น</div>`
    : `<div class="text-sm">ยอดขาย (ใบกำกับ) IDS <b class="num text-lg">${V.idsN}</b> คัน</div>
      ${row('ใบกำกับตาม DL (เดือนที่มีไฟล์)', V.dlN)}${row('ใหม่ <span class="text-muted">(อยู่ในไฟล์ Honda)</span>', ivsNum(V.L.new.length, 'new'), 'pl-3')}${row('ซ้ำ <span class="text-muted">(ออกใหม่ ไม่นับยอด)</span>', ivsNum(V.dupN, 'dup'), 'pl-3 text-muted')}${V.L.okc.length ? row('นับเป็นยอด โดยแอดมิน <span class="text-muted">(ไม่อยู่ในไฟล์ Honda)</span>', ivsNum(V.L.okc.length, 'okc'), 'pl-3') : ''}${V.L.xc.length ? row('ไม่นับ โดยแอดมิน <span class="text-muted">(ระบุเหตุผลแล้ว)</span>', ivsNum(V.L.xc.length, 'xc'), 'pl-3 text-muted') : ''}${V.L.miss.length ? row('ไม่อยู่ในไฟล์ Honda และไม่มีประวัติ <span class="text-muted">(ตรวจสอบ)</span>', ivsNum(V.L.miss.length, 'miss', 'bad'), 'pl-3') : ''}
      ${row('ย้อนเติมจากประวัติ <span class="text-muted">(ใบแรกถูกยกเลิก)</span>', V.L.back.length ? '+' + ivsNum(V.L.back.length, 'back') : '0')}${row('<b>ยอด IDS = ใหม่ + ย้อนเติม' + (V.L.okc.length ? ' + นับเอง' : '') + '</b>', `<b>${V.idsN}</b>`)}
      ${row('ส่วนต่างกับ Honda', dif === 0 ? `<span style="color:var(--good)">0 · ตรงกัน</span>` : `<span style="color:var(--bad)">${dif > 0 ? '+' : ''}${dif}</span>${V.L.gone.length ? ' ' + ivsNum(V.L.gone.length, 'gone', 'bad') : ''}`)}`;
  const pend = `<div class="mt-2 p-2 rounded-lg text-sm" style="background:var(--surface-2)">ออกใบกำกับตาม DL ${V.nDl} คัน · ส่งมอบแล้ว <b class="num">${V.nDl - V.L.pend.length}</b> · <b>ยังไม่ส่งมอบ <span class="num">${ivsNum(V.L.pend.length, 'pend', V.L.pend.some(r => /(\d+) วัน/.test(r.note) && +RegExp.$1 > 14) ? 'warn' : '')}</span> คัน</b></div>`;
  const cur = E.from.slice(0, 7) <= D.today.slice(0, 7) && E.to.slice(0, 7) >= D.today.slice(0, 7);
  const web = cur ? `<div class="mt-3 p-3 rounded-lg border border-dashed border-line text-sm" style="background:var(--surface-2)"><div class="text-muted text-xs mb-1">ล่วงหน้า · ในเว็บ ยังไม่เข้า IDS (ไม่รวมในยอดข้างบน)</div>
      <div class="flex justify-between py-1"><span>จัดสรรแล้ว รอออกใบกำกับ</span><span class="num text-muted">${ivsNum(V.L.alloc.length, 'alloc')} คัน</span></div>
      <div class="flex justify-between py-1"><span>ส่งมอบในเว็บแล้ว รอเข้า DL</span><span class="num text-muted">${ivsNum(V.L.deliv.length, 'deliv')} คัน</span></div>
      <div class="text-xs text-muted">เมื่อใบกำกับ/DL เข้ามา รถจะย้ายขึ้นไปนับในยอด IDS</div></div>` : '';
  const per = many ? `<div class="mt-3 text-sm"><div class="text-muted text-xs mb-1">รายเดือน</div>${ms.map(m => `<div class="flex justify-between border-t border-line py-1"><span>${esc(fmtM(m.ym))}</span><span class="num ${m.has ? '' : 'text-muted'}">${m.has ? `Honda ${m.honda} · IDS ${m.nNew + m.nBack + m.nOk}` : `รออัปไฟล์ · เว็บ ${m.n}`}</span></div>`).join('')}</div>` : '';
  return `<section class="bg-surface border border-line rounded-lg p-4 mb-5"><h2 class="font-head font-semibold mb-2">ยอดขาย (ใบกำกับ) · Honda เทียบ IDS</h2><div class="grid md:grid-cols-2 gap-5"><div>${hon}${per}</div><div>${ids}${pend}</div></div>${web}</section>${ivsDrillPanel(V)}`;
}
function ivsDrillPanel(V) {
  const k = S.filters.ivsDrill, T = { new: 'ใหม่ (อยู่ในไฟล์ Honda)', dup: 'ซ้ำ (ออกใหม่ ไม่นับยอด)', miss: 'ไม่อยู่ในไฟล์ Honda และไม่มีประวัติ', back: 'ย้อนเติมจากประวัติ', gone: 'ส่วนต่าง: ในไฟล์ Honda แต่ IDS ไม่นับ', hadv: 'ไฟล์ Honda: ยังไม่ส่งมอบ (Advance)', pend: 'ออกใบกำกับแล้ว ยังไม่ส่งมอบ (ตาม DL / เว็บ)', okc: 'นับเป็นยอด โดยแอดมิน (ไม่อยู่ในไฟล์ Honda)', xc: 'ไม่นับ โดยแอดมิน', alloc: 'จัดสรรในเว็บ รอออกใบกำกับ', deliv: 'ส่งมอบในเว็บ รอเข้า DL' };
  if (!k || !T[k]) return '';
  const l = k === 'dup' ? V.L.dup : V.L[k], man = ['miss', 'okc', 'xc'].includes(k) && typeof campUpCan === 'function' && campUpCan();
  return `<section class="bg-surface border border-line rounded-lg p-4 mb-5" id="ivs-drill" style="scroll-margin-top:72px"><div class="flex items-center gap-2 mb-2"><h3 class="font-head font-semibold">${esc(T[k])} · ${l.length} คัน</h3><button type="button" class="btn btn-ghost btn-sm ml-auto" data-act="ivs-drill" data-k="">ปิด</button></div>
    <div class="overflow-x-auto max-h-[50vh] overflow-y-auto"><table class="tbl text-sm"><thead><tr><th>เลขตัวถัง</th><th>สาขา</th><th>ลูกค้า / รุ่น</th><th>วันที่ออกใบกำกับ</th><th>วันที่ส่งมอบ</th><th>หมายเหตุ</th>${man ? '<th>นับเป็นยอดหรือไม่</th>' : ''}</tr></thead><tbody>${l.map(r => `<tr><td>${r.vin ? vinLink({ vin: r.vin }) : '–'}</td><td>${esc(r.br || '')}</td><td class="text-xs">${esc(r.who)}</td><td class="text-xs nowrap">${r.date ? esc(fmtD(r.date)) : '–'}</td><td class="text-xs nowrap">${r.ddate ? esc(fmtD(r.ddate)) : '–'}</td><td class="text-xs">${esc(r.note)}</td>${man ? `<td style="min-width:210px"><input id="ivs-r-${esc(r.vin)}" class="w-full border border-line rounded px-2 py-1 text-xs mb-1" placeholder="เหตุผล เช่น ขอแคมเปญพิเศษ" value="${k === 'miss' ? '' : esc(String(r.note).replace(/^[^:]*: /, ''))}"><div class="flex gap-1 flex-wrap">${k !== 'okc' ? `<button type="button" class="btn btn-sm btn-dark" data-act="ivs-mark" data-vin="${esc(r.vin)}" data-ym="${esc(r.ym)}" data-v="1">นับเป็นยอด</button>` : ''}${k !== 'xc' ? `<button type="button" class="btn btn-sm btn-ghost" data-act="ivs-mark" data-vin="${esc(r.vin)}" data-ym="${esc(r.ym)}" data-v="0">ไม่นับ</button>` : ''}${k !== 'miss' ? `<button type="button" class="btn btn-sm btn-ghost" data-act="ivs-mark" data-vin="${esc(r.vin)}" data-ym="${esc(r.ym)}" data-v="clear">ล้างการตัดสิน</button>` : ''}</div></td>` : ''}</tr>`).join('') || '<tr><td colspan="7" class="text-muted">ไม่มีรายการ</td></tr>'}</tbody></table></div></section>`;
}
Object.assign(ACTIONS, {
  async 'ivs-mark'(el) { const vin = el.dataset.vin, ym = el.dataset.ym, v = el.dataset.v; if (!vin || !ym || !campUpCan()) return;
    const inp = document.getElementById('ivs-r-' + vin), reason = (inp && inp.value || '').trim();
    if (v !== 'clear' && reason.length < 3) { toast('ใส่เหตุผลก่อน (อย่างน้อย 3 ตัวอักษร)'); if (inp) inp.focus(); return; }
    const cur = S.ref.get('inv_count') || { v: {} }, m = { ...(cur.v || {}) }, k = vin + '|' + ym;
    if (v === 'clear') delete m[k]; else m[k] = { count: v === '1', reason, ...actor() };
    if (await write('ref', 'inv_count', { ...cur, v: m })) { toast(v === 'clear' ? 'ล้างการตัดสินแล้ว' : v === '1' ? 'บันทึก: นับเป็นยอด' : 'บันทึก: ไม่นับเป็นยอด'); render(); } },
  'ivs-drill'(el) { S.filters.ivsDrill = el.dataset.k && S.filters.ivsDrill !== el.dataset.k ? el.dataset.k : ''; render(); if (S.filters.ivsDrill) setTimeout(() => { const e = document.getElementById('ivs-drill'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); }
});
