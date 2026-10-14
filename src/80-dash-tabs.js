// ------------------------------------------------------------------ dashboard tabs ยอดจอง · ยอดขาย · รายบุคคล · บัญชี (ตกลง 14/10)
// ยอดจอง: the booking summary the team posts every evening (total, by branch, by model, by sales), branches compared,
//   model mix, cancellations and finance (moved here from วิเคราะห์).
// ยอดขาย: targets as before, plus sales by invoice or by delivery (switch), branches compared and which branch sells
//   which model best; lead time, old stock and trade-ins (moved here from วิเคราะห์).
// รายบุคคล: also who sells which model best. บัญชี: also branches compared.
// Only function declarations here: the first render runs before this part of the file.
function periodName(E) {
  if (E.from.slice(0, 7) === E.to.slice(0, 7) && E.from.slice(8) === '01') { const [y, m] = E.from.split('-').map(Number); return `เดือน ${TH_MON_FULL()[m - 1]} ${y}`; }
  return `${fmtD(E.from)} – ${fmtD(E.to)}`;
}
function TH_MON_FULL() { return ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']; }
function brsInScope() { return BRS.filter(b => inBr({ br: b })); }
// rows × columns count table; the biggest number in each row (or column) is marked, with its share of the row
function countMatrix(items, rowOf, colOf, o = {}) {
  const rows = {}, cols = {};
  items.forEach(x => { const r = rowOf(x) || 'ไม่ระบุ', c = colOf(x) || 'ไม่ระบุ'; ((rows[r] ||= {})[c] = (rows[r][c] || 0) + 1); cols[c] = (cols[c] || 0) + 1; });
  const colKeys = Object.keys(cols).sort((a, b) => cols[b] - cols[a]), rowKeys = o.rowOrder ? o.rowOrder.filter(r => rows[r]) : Object.keys(rows).sort((a, b) => Object.values(rows[b]).reduce((n, v) => n + v, 0) - Object.values(rows[a]).reduce((n, v) => n + v, 0));
  const rowTot = r => Object.values(rows[r] || {}).reduce((n, v) => n + v, 0);
  const colMax = c => Math.max(...rowKeys.map(r => (rows[r] || {})[c] || 0));
  const best = (r, c) => { const v = (rows[r] || {})[c] || 0; if (!v) return false; return o.byCol ? v === colMax(c) : v === Math.max(...Object.values(rows[r])); };
  return `<div class="scroll-x max-h-96 overflow-auto"><table class="tbl text-sm"><thead><tr><th>${o.rowLabel || ''}</th>${colKeys.map(c => `<th class="text-right nowrap">${esc(c)}</th>`).join('')}<th class="text-right">รวม</th></tr></thead><tbody>
    ${rowKeys.map(r => `<tr><td class="nowrap">${o.rowFmt ? o.rowFmt(r) : esc(r)}</td>${colKeys.map(c => { const v = (rows[r] || {})[c] || 0; return `<td class="num text-right" ${best(r, c) ? 'style="background:var(--good-soft);font-weight:600"' : ''} title="${v && rowTot(r) ? pctOf(v, rowTot(r)) + '% ของแถว' : ''}">${v || '<span class="text-muted">–</span>'}</td>`; }).join('')}<td class="num text-right font-semibold">${rowTot(r)}</td></tr>`).join('') || `<tr><td colspan="${colKeys.length + 2}" class="text-muted">ไม่มีข้อมูล</td></tr>`}
    ${rowKeys.length > 1 ? `<tr style="font-weight:600"><td>รวม</td>${colKeys.map(c => `<td class="num text-right">${cols[c]}</td>`).join('')}<td class="num text-right">${items.length}</td></tr>` : ''}</tbody></table></div>`;
}
// "PSC: HR-V e:HEV 12 คัน (30%)" — the best model of each row
function bestLines(items, rowOf, colOf, rowOrder, rowFmt) {
  const by = {}; items.forEach(x => { const r = rowOf(x) || 'ไม่ระบุ', c = colOf(x) || 'ไม่ระบุ'; ((by[r] ||= {})[c] = (by[r][c] || 0) + 1); });
  const keys = rowOrder ? rowOrder.filter(r => by[r]) : Object.keys(by);
  return keys.map(r => { const e = Object.entries(by[r]).sort((a, b) => b[1] - a[1]), tot = e.reduce((n, [, v]) => n + v, 0); return `<li><b>${rowFmt ? rowFmt(r) : esc(r)}</b>: ${e.slice(0, 3).map(([c, v], i) => `${i ? '' : '<span style="color:var(--good)">'}${esc(c)} ${v} คัน (${pctOf(v, tot)}%)${i ? '' : '</span>'}`).join(' · ')}</li>`; }).join('');
}
function brName(b) { return `${esc(b)} <span class="text-xs text-muted">${esc((BR[b] || {}).name || '')}</span>`; }

// ---- ยอดจอง
function dashBook(D) {
  const E = execData(D), A = dashAna(D, true), inR = d => !!d && d >= E.from && d <= E.to;
  const all = D.at.filter(a => !a.demo && inBr(a) && inR(a.date)), net = all.filter(a => !a.cancelled), cxl = all.filter(a => a.cancelled);
  const [pf, pt] = prevRange(E.from, E.to), prev = D.at.filter(a => !a.demo && !a.cancelled && inBr(a) && a.date && a.date >= pf && a.date <= pt);
  const brs = brsInScope(), now = new Date();
  const cnt = (list, f) => list.filter(f).length;
  const models = Object.entries(net.reduce((m, a) => { const k = a.model || 'ไม่ระบุ'; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const ppl = Object.values(net.reduce((m, a) => { const k = (a.sales || 'ไม่ระบุ') + '|' + (a.br || ''); (m[k] ||= { n: a.sales || 'ไม่ระบุ', br: a.br, c: 0 }).c++; return m; }, {})).sort((a, b) => b.c - a.c || a.n.localeCompare(b.n, 'th'));
  const summary = `<div class="text-sm leading-7">
    <div class="font-semibold text-base">📌 สรุปยอดจองรวม ${esc(periodName(E))}</div>
    <div class="text-muted">📅 อัปเดตวันที่ ${now.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })} · 🕒 ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
    <div class="text-lg font-semibold my-2">📊 ยอดจองรวมสุทธิ: <span class="num">${fmtN(net.length)}</span> คัน${cxl.length ? ` <span class="text-sm font-normal text-muted">(ยกเลิก ${fmtN(cxl.length)})</span>` : ''}</div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">${brs.map(b => `<div class="p-2 rounded-lg" style="background:var(--surface-2)"><div>🚗 ${esc(b)}</div><div class="num text-lg font-semibold">${cnt(net, a => a.br === b)} <span class="text-sm font-normal">คัน</span></div></div>`).join('')}</div>
    <div class="grid sm:grid-cols-2 gap-4">
      <div><div class="font-medium">🚘 รุ่นที่จอง</div><ul class="list-disc pl-5">${models.map(([m, n]) => `<li>${esc(m)}: <b class="num">${n}</b> คัน</li>`).join('') || '<li class="text-muted">ไม่มี</li>'}</ul></div>
      <div><div class="font-medium">👤 ยอดจองแยกเซลล์</div><ul class="list-disc pl-5">${ppl.map(p => `<li>${salesName(p.n)} (${esc(p.br || '–')}): <b class="num">${p.c}</b> คัน</li>`).join('') || '<li class="text-muted">ไม่มี</li>'}</ul></div></div></div>`;
  const brTable = `<div class="scroll-x"><table class="tbl text-sm"><thead><tr><th>สาขา</th><th class="text-right">จอง</th><th class="text-right">ยกเลิก</th><th class="text-right">สุทธิ</th><th class="text-right">สัดส่วน</th><th class="text-right">ช่วงก่อน</th><th class="text-right">เปลี่ยน</th></tr></thead><tbody>
    ${brs.map(b => { const n = cnt(net, a => a.br === b), p = cnt(prev, a => a.br === b), d = n - p; return `<tr><td class="nowrap">${brName(b)}</td><td class="num text-right">${cnt(all, a => a.br === b)}</td><td class="num text-right">${cnt(cxl, a => a.br === b) || '–'}</td><td class="num text-right font-semibold">${n}</td><td class="num text-right">${pctOf(n, net.length)}%</td><td class="num text-right text-muted">${p}</td><td class="num text-right" style="color:var(--${d > 0 ? 'good' : d < 0 ? 'bad' : 'muted'})">${d > 0 ? '+' : ''}${d}${p ? ` (${d > 0 ? '+' : ''}${Math.round(d / p * 100)}%)` : ''}</td></tr>`; }).join('')}
    <tr style="font-weight:600"><td>รวม</td><td class="num text-right">${all.length}</td><td class="num text-right">${cxl.length}</td><td class="num text-right">${net.length}</td><td class="num text-right">100%</td><td class="num text-right">${prev.length}</td><td class="num text-right">${net.length - prev.length > 0 ? '+' : ''}${net.length - prev.length}</td></tr></tbody></table></div>
    ${colChart('bk-br', brs.map(b => ({ k: b, label: b, test: () => true })), [{ name: 'ช่วงนี้', color: '--viz-1', values: brs.map(b => cnt(net, a => a.br === b)) }, { name: 'ช่วงก่อน', color: '--viz-2', values: brs.map(b => cnt(prev, a => a.br === b)) }], { label: 'ยอดจองแยกสาขา เทียบช่วงก่อน' })}`;
  const pplTable = `<div class="scroll-x max-h-96 overflow-auto"><table class="tbl text-sm"><thead><tr><th>เซลล์</th>${brs.length > 1 ? brs.map(b => `<th class="text-right">${b}</th>`).join('') : ''}<th class="text-right">สุทธิ</th><th class="text-right">ยกเลิก</th><th class="text-right">ช่วงก่อน</th></tr></thead><tbody>
    ${[...new Set(all.map(a => a.sales || 'ไม่ระบุ'))].map(n => ({ n, net: cnt(net, a => (a.sales || 'ไม่ระบุ') === n), cx: cnt(cxl, a => (a.sales || 'ไม่ระบุ') === n), pv: cnt(prev, a => (a.sales || 'ไม่ระบุ') === n) })).sort((a, b) => b.net - a.net || b.cx - a.cx).map(p => `<tr><td class="nowrap">${salesName(p.n)}</td>${brs.length > 1 ? brs.map(b => `<td class="num text-right">${cnt(net, a => (a.sales || 'ไม่ระบุ') === p.n && a.br === b) || '<span class="text-muted">–</span>'}</td>`).join('') : ''}<td class="num text-right font-semibold">${p.net}</td><td class="num text-right">${p.cx || '–'}</td><td class="num text-right text-muted">${p.pv}</td></tr>`).join('') || '<tr><td colspan="9" class="text-muted">ไม่มีข้อมูล</td></tr>'}</tbody></table></div>`;
  return `${pageHead('ยอดจอง', `ใบจอง AT Honda ตามวันที่จอง ${fmtD(E.from)} – ${fmtD(E.to)} · ช่วงก่อน ${fmtD(pf)} – ${fmtD(pt)} · สุทธิ = ไม่นับใบที่ยกเลิก`)}
  ${dashTabs()}${periodBar(E)}
  <div class="grid lg:grid-cols-2 gap-5 mb-5">${dCard('สรุปยอดจอง', summary, 'สาขาตามใบจอง · กดแท็บ "เดือนนี้" เพื่อดูสรุปแบบรายเดือน')}${dCard('เปรียบเทียบสาขา', brTable)}</div>
  <div class="grid lg:grid-cols-2 gap-5 mb-5">${dCard('สาขา × รุ่น (ยอดจองสุทธิ)', countMatrix(net, a => a.br, a => a.model, { rowLabel: 'สาขา', rowOrder: brs, rowFmt: brName }), 'ช่องสีเขียว = รุ่นที่จองมากที่สุดของสาขานั้น')}${dCard('ยอดจองรายบุคคล', pplTable)}</div>
  ${A.mix}
  <div class="grid lg:grid-cols-2 gap-5 my-5">${A.cx}${A.fin}</div>`;
}

// ---- ยอดขาย: extra cards under the targets
function saleBasis() { return S.filters.saleBasis === 'dv' ? 'dv' : 'inv'; }
function salesCompare(D, E) {
  const basis = saleBasis(), rows = carListRows(D, E, basis), [pf, pt] = prevRange(E.from, E.to), prev = carListRows(D, { ...E, from: pf, to: pt }, basis);
  const brs = brsInScope(), label = basis === 'inv' ? 'ใบกำกับ' : 'ส่งมอบ';
  const seg = `<div class="seg" role="group" aria-label="นับยอดขายจาก">${[['inv', 'ใบกำกับภาษี'], ['dv', 'ส่งมอบ']].map(([k, t]) => `<button data-act="sale-basis" data-k="${k}" aria-pressed="${basis === k}">${t}</button>`).join('')}</div>`;
  const cnt = (l, b) => l.filter(r => r.br === b).length;
  const brT = `<div class="scroll-x"><table class="tbl text-sm"><thead><tr><th>สาขา</th><th class="text-right">${label}</th><th class="text-right">สัดส่วน</th><th class="text-right">ช่วงก่อน</th><th class="text-right">เปลี่ยน</th></tr></thead><tbody>
    ${brs.map(b => { const n = cnt(rows, b), p = cnt(prev, b), d = n - p; return `<tr><td class="nowrap">${brName(b)}</td><td class="num text-right font-semibold">${n}</td><td class="num text-right">${pctOf(n, rows.length)}%</td><td class="num text-right text-muted">${p}</td><td class="num text-right" style="color:var(--${d > 0 ? 'good' : d < 0 ? 'bad' : 'muted'})">${d > 0 ? '+' : ''}${d}${p ? ` (${d > 0 ? '+' : ''}${Math.round(d / p * 100)}%)` : ''}</td></tr>`; }).join('')}
    <tr style="font-weight:600"><td>รวม</td><td class="num text-right">${rows.length}</td><td class="num text-right">100%</td><td class="num text-right">${prev.length}</td><td class="num text-right">${rows.length - prev.length > 0 ? '+' : ''}${rows.length - prev.length}</td></tr></tbody></table></div>
    ${colChart('sl-br', brs.map(b => ({ k: b, label: b, test: () => true })), [{ name: 'ช่วงนี้', color: '--viz-3', values: brs.map(b => cnt(rows, b)) }, { name: 'ช่วงก่อน', color: '--viz-2', values: brs.map(b => cnt(prev, b)) }], { label: `ยอดขาย (${label}) แยกสาขา เทียบช่วงก่อน` })}`;
  return `<div class="flex flex-wrap items-center gap-3 mb-3 mt-2"><h2 class="font-head text-lg font-semibold">ยอดขายเปรียบเทียบสาขา</h2>${seg}<span class="text-sm text-muted">${fmtD(E.from)} – ${fmtD(E.to)} · เทียบ ${fmtD(pf)} – ${fmtD(pt)} · ไม่รวมรถบริษัท</span></div>
  <div class="grid lg:grid-cols-2 gap-5 mb-5">${dCard(`เปรียบเทียบสาขา (${label})`, brT)}${dCard('สาขาไหนขายรุ่นไหนดี', `<ul class="text-sm leading-7 mb-3">${bestLines(rows, r => r.br, r => r.model, brs, brName) || '<li class="text-muted">ไม่มีข้อมูล</li>'}</ul>${countMatrix(rows, r => r.br, r => r.model, { rowLabel: 'สาขา', rowOrder: brs, rowFmt: brName })}`, 'ช่องสีเขียว = รุ่นที่ขายมากที่สุดของสาขานั้น · % = สัดส่วนในสาขา')}</div>`;
}

// ---- รายบุคคล: who sells which model best
function personModelCard(D) {
  const y = pmYear(D), mo = S.filters.pmMonth || '', basis = ['bk', 'dv', 'inv'].includes(S.filters.pmBasis) ? S.filters.pmBasis : 'dv';
  const st = pmStats(D, a => inBr(a), y), items = (mo ? [mo] : Object.keys(st)).flatMap(m => (st[m] || {})[basis] || []);
  const seg = `<div class="seg mb-3" role="group" aria-label="นับจาก">${[['bk', 'ยอดจอง'], ['dv', 'ส่งมอบ'], ['inv', 'ใบกำกับ']].map(([k, t]) => `<button data-act="pm-basis" data-k="${k}" aria-pressed="${basis === k}">${t}</button>`).join('')}</div>`;
  return dCard(`ใครขายรุ่นไหนเก่ง <span class="text-muted text-sm font-normal">${mo ? fmtM(mo) : 'ปี ' + y}</span>`, seg + countMatrix(items, a => a.sales, a => a.model, { rowLabel: 'เซลล์', rowFmt: n => salesName(n), byCol: true }),
    'ช่องสีเขียว = คนที่ขายรุ่นนั้นมากที่สุด · เลือกปีและเดือนได้ที่ด้านบน');
}
Object.assign(ACTIONS, {
  'sale-basis'(el) { S.filters.saleBasis = el.dataset.k; render(); },
  'pm-basis'(el) { S.filters.pmBasis = el.dataset.k; render(); }
});
