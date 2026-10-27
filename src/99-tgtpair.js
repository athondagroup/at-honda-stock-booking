// ------------------------------------------------------------------ target vs invoices by branch (27/10): the branch pairs PSC+ATE and KPA+SPH
// A row per branch and a row for the pair; several months = a chip per month (sold − target), one month = a card per model.
// Colour: under 80% red · 80–99% yellow · 100% and over green. The month in progress is measured against the pace to today.
// Only function declarations here: the first render runs before this part of the file.
function tgtTone(p) { return p === null ? 'muted' : p >= 100 ? 'good' : p >= 80 ? 'warn' : 'bad'; }
// the model order of the target file (27/10); anything else after them
function tgtOrder() { return ['CITY', 'CITY E:HEV', 'CITY HATCHBACK', 'CITY HATCHBACK E:HEV', 'CIVIC E:HEV', 'ACCORD E:HEV', 'HR-V E:HEV', 'CR-V E:HEV', 'E:N1', 'E:N2', 'STEP WGN E:HEV']; }
function tgtRank(m) { const i = tgtOrder().indexOf(String(m || '').toUpperCase().replace(/\s+/g, ' ').trim()); return i < 0 ? 999 : i; }
function tgtPct(a, t) { return t > 0 ? Math.round(a / t * 100) : null; }
function tgtPace(m, D) {   // share of the month gone: only the month in progress, from the DL file date when it is in that month
  const cur = D.today.slice(0, 7); if (m !== cur) return null;
  const E = execData(D), asof = E.dlAsof && E.dlAsof.slice(0, 7) === m ? E.dlAsof : D.today, dim = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();
  return Math.min(1, Number(asof.slice(8)) / dim);
}
function tgtBlock(lab, t, a, o) {   // t, a: numbers; o: { chips: html, pace, tot, drill }
  const need = o.pace ? Math.round(t * o.pace) : t, p = tgtPct(a, need), tone = tgtTone(p), shown = tgtPct(a, t);
  const sold = o.drill ? drillNum(a, o.drill) : fmtN(a);
  const tick = o.pace && t ? `<div style="position:absolute;left:${(o.pace * 100).toFixed(0)}%;top:-3px;height:34px;border-left:2px dashed var(--bad)" title="แนวที่ควรได้ถึงวันนี้"></div>` : '';
  return `<div class="rounded-lg p-3 mb-2.5" style="border:${o.tot ? '2px solid var(--ink)' : '1px solid var(--line)'};background:${o.tot ? 'var(--surface-2)' : 'var(--surface)'}">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1"><div style="min-width:150px">${lab}</div>
      <div class="flex-1 relative" style="min-width:180px;height:26px;background:var(--surface-2);border:1px solid var(--line);border-radius:6px"><div style="width:${t ? Math.min(100, a * 100 / t) : 0}%;height:100%;background:var(--${p === null ? 'line' : tone});border-radius:5px"></div>${tick}
        <span class="absolute text-xs" style="left:8px;top:4px;color:${p !== null && a * 100 / (t || 1) > 14 ? '#fff' : 'var(--fg)'}">ขาย ${sold}</span><span class="absolute text-xs ${p !== null && a * 100 / (t || 1) > 88 ? '' : 'text-muted'}" style="right:8px;top:4px;${p !== null && a * 100 / (t || 1) > 88 ? 'color:#fff' : ''}">เป้า ${t ? fmtN(t) : '–'}</span></div>
      <div class="text-right" style="min-width:56px;font-weight:700;font-size:17px;color:var(--${tone === 'muted' ? 'muted' : tone})">${shown === null ? '–' : shown + '%'}</div>
      <div class="text-xs text-muted" style="min-width:140px">${!t ? 'ยังไม่มีเป้า' : o.pace ? `ตามแนวควรได้ ${fmtN(need)} · <b style="color:var(--${tone})">${a - need > 0 ? '+' : ''}${a - need}</b>` : `ขาดอีก ${fmtN(Math.max(0, t - a))} คัน`}</div></div>
    ${o.chips || ''}</div>`;
}
function tgtChip(top, sub, d, p) { const tn = tgtTone(p); return `<div class="text-center text-xs text-muted min-w-0"><div class="rounded font-bold mb-0.5" style="padding:2px 0;background:var(--${tn === 'muted' ? 'surface-2' : tn + '-soft'});color:var(--${tn === 'muted' ? 'muted' : tn})">${top}</div>${sub}</div>`; }
function tgtBranchView(E) {
  const D = derive(), ms = monthsIn(E.from, E.to), PAIRS = [['PSC', 'ATE'], ['KPA', 'SPH']];
  const inv = E.invoiced, one = ms.length === 1, paceOf = m => tgtPace(m, D);
  const cell = (b, m) => ({ t: tgtOf(m, b), a: inv.filter(s => s.br === b && s.date.slice(0, 7) === m).length });
  let models = [];
  if (one) models = [...new Set([...tgtRows().filter(r => r.m === ms[0]).map(r => r.model), ...inv.map(s => s.model || 'ไม่ระบุ')])];
  const modelOf = (brs, md) => ({ t: brs.reduce((n, b) => n + tgtOf(ms[0], b, md), 0), a: inv.filter(s => brs.includes(s.br) && (s.model || 'ไม่ระบุ') === md).length });
  const detail = brs => {
    const pace = paceOf(ms[0]);
    if (one) {
      const mo = models.map(md => ({ md, ...modelOf(brs, md) })).filter(x => x.t || x.a).sort((x, y) => tgtRank(x.md) - tgtRank(y.md) || y.t - x.t || y.a - x.a || x.md.localeCompare(y.md));
      return `<div class="grid gap-1.5 mt-2" style="grid-template-columns:repeat(auto-fill,minmax(165px,1fr))">${mo.map(x => { const need = pace ? Math.round(x.t * pace) : x.t, p = tgtPct(x.a, need), tn = tgtTone(p), d = x.a - need;
        const n = brs.length === 1 ? drillNum(x.a, { m: 'invoiced', from: E.from, to: E.to, br: brs[0], model: x.md, label: x.md }) : fmtN(x.a);
        return `<div class="rounded-md p-1.5 text-xs" style="border:1px solid var(--line);background:var(--surface)"><div class="text-muted truncate" title="${esc(x.md)}">${esc(x.md)}</div><div class="flex justify-between items-baseline"><b style="font-size:15px">${n}<span class="text-muted font-normal" style="font-size:11px">/${x.t ? fmtN(x.t) : '–'}</span></b>${x.t ? `<b class="rounded px-1" style="background:var(--${tn}-soft);color:var(--${tn})">${d > 0 ? '+' : ''}${d}</b>` : ''}</div><div style="height:4px;background:var(--surface-2);border-radius:2px;margin-top:3px"><div style="width:${x.t ? Math.min(100, x.a * 100 / x.t) : 0}%;height:4px;background:var(--${tn === 'muted' ? 'line' : tn});border-radius:2px"></div></div></div>`; }).join('')}</div>`;
    }
    return `<div class="grid gap-1 mt-2" style="grid-template-columns:repeat(${ms.length},minmax(0,1fr))">${ms.map(m => { const t = brs.reduce((n, b) => n + tgtOf(m, b), 0), a = brs.reduce((n, b) => n + cell(b, m).a, 0), pc = paceOf(m), need = pc ? Math.round(t * pc) : t;
      return tgtChip(t ? (a - need > 0 ? '+' : '') + (a - need) : '–', `${a}/${t || '–'} · ${esc(monLabel(m))}`, a - need, tgtPct(a, need)); }).join('')}</div>`;
  };
  const sum = (brs, f) => ms.reduce((n, m) => n + brs.reduce((k, b) => k + cell(b, m)[f], 0), 0);
  const pace1 = one ? paceOf(ms[0]) : null;
  const blocks = PAIRS.map(pr => {
    const vis = pr.filter(b => inBr({ br: b })); if (!vis.length) return '';
    const row = (brs, lab, tot) => tgtBlock(lab, sum(brs, 't'), sum(brs, 'a'), { chips: detail(brs), pace: pace1, tot, drill: brs.length === 1 ? { m: 'invoiced', from: E.from, to: E.to, br: brs[0], label: 'ใบกำกับ' } : null });
    return `<div class="mb-3"><div class="font-semibold text-sm mb-1.5" style="color:var(--ink)">คู่ ${pr.join(' + ')}</div>${vis.map(b => row([b], `<b>${b}</b> <span class="text-xs text-muted">${esc(BR[b].name)}</span>`, false)).join('')}${vis.length > 1 ? row(vis, `<b>รวม ${vis.join(' + ')}</b>`, true) : ''}</div>`;
  }).join('');
  const lg = `<div class="flex flex-wrap gap-3 text-xs text-muted mb-2"><span><i class="inline-block rounded-sm" style="width:10px;height:10px;background:var(--bad)"></i> ต่ำกว่า 80%</span><span><i class="inline-block rounded-sm" style="width:10px;height:10px;background:var(--warn)"></i> 80–99%</span><span><i class="inline-block rounded-sm" style="width:10px;height:10px;background:var(--good)"></i> 100% ขึ้นไป</span><span>${one ? 'ช่องล่าง = ขาย/เป้า ต่อรุ่น (ป้าย = ขาย − เป้า)' : 'ช่องล่าง = ขาย − เป้า ต่อเดือน (สีตาม % ของเดือนนั้น)'}</span>${pace1 ? '<span>เส้นประแดง = แนวที่ควรได้ถึงวันนี้ · สีวัดเทียบแนวนี้</span>' : ''}</div>`;
  const has = tgtRows().some(r => ms.includes(r.m));
  return lg + blocks + (has ? '' : `<p class="text-sm mt-2" style="color:var(--warn)">ยังไม่ได้ใส่เป้าของช่วงนี้${tgtCanEdit() ? ' กด "ใส่ / แก้เป้า" ที่หน้าใบจอง' : ''}</p>`);
}
