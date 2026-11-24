// GENERATED from src/65-cellplan.js by tools/sync-cellplan.sh — edit that file, not this one
// deno-lint-ignore-file
// ------------------------------------------------------------------ where a lock goes in the IDS stock sheet (24/11)
// ONE rule, used by the server (Edge Function "gsheet", tool "lock_cell" — tools/sync-cellplan.sh copies this file there) and by
// the preview (dry-run: it reads the real sheet through the connector and shows the plan, never writes).
//  · a car with a frame number: look in ALL four stock tabs first. One row → write there. Any tab not readable → read_error
//    (never treated as "not found", nothing is written, the lock keeps waiting). The frame number in two rows → dup.
//  · after a stock row is written, the quota row of the same car (its frame number in "Vin Number", or its Ref when the row has no
//    other frame number) gets "VIN text" too — exactly one such row, else it is left alone and said why.
//  · no stock row (all tabs read) or no frame number yet: the quota row, found by frame number or else by Ref — exactly one row.
//  · stock_only (an IDS booking number over the lock's text): the stock row only, never the quota.
//  · a cell holding something else than the page expects (expect) is not overwritten: conflict + what it holds (unless force).
// data: { stock: { PSC: rows | null, ... }, quota: { "11.2026 PSC": rows | null, ... } | null }   (null = could not read)
function cellPlan(input, data) {
  const vin = String(input.vin || '').toUpperCase().trim(), ref = String(input.ref || '').toUpperCase().trim();
  const value = String(input.value == null ? '' : input.value).slice(0, 120), force = !!input.force;
  const expect = input.expect === undefined || input.expect === null ? undefined : String(input.expect);
  const nrm = x => String(x == null ? '' : x).replace(/\s+/g, '');
  const col = i => { let s = '', n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  // expect_quota: what the web believes the quota row holds (the text a lock was imported from), when it differs from the stock cell
  const expectQ = input.expect_quota === undefined || input.expect_quota === null ? expect : String(input.expect_quota);
  const okCur = (cur, ex = expect) => force || ex === undefined || nrm(cur) === nrm(ex) || nrm(cur) === nrm(value) || (ex === expectQ ? false : nrm(cur) === nrm(expectQ));
  const stripVin = (cur, v) => v ? String(cur).replace(new RegExp(v, 'i'), '').replace(/^[\s/\-]+|[\s/\-]+$/g, '') : String(cur);
  const STOCK = ['PSC', 'ATE', 'SPH', 'KPA'];
  // ---- quota rows: by frame number (contains), else by Ref (exact) when the row holds no other frame number
  const quotaFind = byRefToo => {
    const q = data.quota; if (!q) return { err: ['quota'] };
    const err = [], hits = [], refHits = [];
    for (const tab of Object.keys(q)) {
      const rows = q[tab]; if (!rows) { err.push(tab); continue; }
      const h = rows.findIndex(x => (x || []).some(v => /vin\s*number/i.test(String(v)))); if (h < 0) continue;
      const vi = rows[h].findIndex(v => /vin\s*number/i.test(String(v))), fi = rows[h].findIndex(v => /ref\.?\s*number/i.test(String(v)));
      rows.forEach((x, i) => {
        if (i <= h) return;
        const cell = String((x || [])[vi] || ''), up = cell.toUpperCase();
        if (vin && up.includes(vin)) hits.push({ tab, row: i + 1, col: col(vi), cur: cell.trim(), hasVin: true });
        else if (byRefToo && ref && fi >= 0 && String((x || [])[fi] || '').toUpperCase().trim() === ref) {
          const other = /[A-HJ-NPR-Z0-9]{17}/.test(up);   // the slot already holds another car's frame number
          refHits.push({ tab, row: i + 1, col: col(vi), cur: cell.trim(), hasVin: false, other });
        }
      });
    }
    if (err.length) return { err };
    if (hits.length) return { hits };
    return { hits: refHits.filter(x => !x.other), other: refHits.filter(x => x.other) };
  };
  const quotaWrite = (hit) => {
    const curT = hit.hasVin ? stripVin(hit.cur, vin) : hit.cur;
    if (!okCur(curT, expectQ)) return { code: 'conflict', current: curT, range: `'${hit.tab}'!${hit.col}${hit.row}`, tab: hit.tab };
    const nv = vin ? (value ? `${vin} ${value}` : vin) : value;
    return { code: 'ok', write: { kind: 'quota', tab: hit.tab, range: `'${hit.tab}'!${hit.col}${hit.row}`, prev: hit.cur, value: nv } };
  };
  // ---- 1. the stock tabs
  if (vin) {
    const err = [], hits = [];
    for (const tab of STOCK) {
      const rows = data.stock ? data.stock[tab] : null;
      if (!rows) { err.push(tab); continue; }
      const h = rows.findIndex(x => (x || []).some(v => String(v).includes('หมายเลขตัวถัง')) && (x || []).some(v => String(v).includes('เลขที่ใบสั่งจอง')));
      if (h < 0) { err.push(tab); continue; }
      const vi = rows[h].findIndex(v => String(v).includes('หมายเลขตัวถัง')), bi = rows[h].findIndex(v => String(v).includes('เลขที่ใบสั่งจอง'));
      rows.forEach((x, i) => { if (i > h && String((x || [])[vi] || '').toUpperCase().trim() === vin) hits.push({ tab, row: i + 1, range: `'${tab}'!${col(bi)}${i + 1}`, cur: String((x || [])[bi] == null ? '' : x[bi]).trim() }); });
    }
    if (err.length) return { code: 'read_error', tabs: err };
    if (hits.length > 1) return { code: 'dup', where: hits.map(x => x.range) };
    if (hits.length === 1) {
      const s = hits[0];
      if (!okCur(s.cur)) return { code: 'conflict', current: s.cur, range: s.range, tab: s.tab };
      const plan = { code: 'ok', writes: [{ kind: 'stock', tab: s.tab, range: s.range, prev: s.cur, value }] };
      // the quota row of the same car follows with "VIN text" (one row only); not for a stock-only write (an IDS booking number)
      if (input.stock_only) return plan;
      const qf = quotaFind(true);
      if (qf.err) plan.quota = { code: 'read_error', tabs: qf.err };
      else if (qf.hits.length > 1) plan.quota = { code: 'dup', where: qf.hits.map(x => `'${x.tab}'!${x.col}${x.row}`) };
      else if (qf.hits.length === 1) { const w = quotaWrite(qf.hits[0]); if (w.code === 'ok') plan.writes.push(w.write); else plan.quota = w; }
      return plan;
    }
  }
  // ---- 2. no stock row (every tab read) or no frame number yet: the quota row
  if (input.stock_only) return { code: 'not_found' };
  if (!vin && !ref) return { code: 'bad_request' };
  const qf = quotaFind(true);
  if (qf.err) return { code: 'read_error', tabs: qf.err };
  if (qf.hits.length > 1) return { code: 'dup', where: qf.hits.map(x => `'${x.tab}'!${x.col}${x.row}`) };
  if (!qf.hits.length) return { code: 'not_found', other: (qf.other || []).map(x => `'${x.tab}'!${x.col}${x.row}`) };
  const w = quotaWrite(qf.hits[0]);
  return w.code === 'ok' ? { code: 'ok', writes: [w.write] } : w;
}

// the quota tabs worth reading: this month back three months, and later months ("11.2026 PSC")
function cellQuotaTabs(titles, today) {
  const t = String(today || new Date().toISOString()).slice(0, 7), [y, m] = t.split('-').map(Number), from = (y * 12 + m - 1) - 3;
  return titles.filter(x => { const g = /^(\d{1,2})\.(\d{4})\s+(PSC|ATE|SPH|KPA)$/.exec(String(x).trim()); return g && (+g[2]) * 12 + (+g[1] - 1) >= from; });
}

export { cellPlan, cellQuotaTabs };
