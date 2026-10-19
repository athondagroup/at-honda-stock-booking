// ------------------------------------------------------------------ AT Honda form ↔ IDS matching
// The AT form has no IDS booking number, so bookings are paired by customer name, then checked
// against model / grade / colour, branch and dates. The AT form is the reference for who the sales owner is.
const NAME_PREFIX = /^(นาย|นางสาว|นาง|น\.ส\.|นส\.|คุณ|ด\.ช\.|ด\.ญ\.|mr\.?|mrs\.?|ms\.?|miss)\s*/i;
// ranks and titles written before the name (ว่าที่ ร.ต.หญิง, พล.อ., พ.ต.ท., ดร., นพ. …); stripped repeatedly
const TITLE_RX = /^(ว่าที่|พลตำรวจ\S*|พลเอก|พลโท|พลตรี|พันเอก|พันโท|พันตรี|ร้อยเอก|ร้อยโท|ร้อยตรี|จ่าสิบ(?:เอก|โท|ตรี)|สิบ(?:เอก|โท|ตรี|ตำรวจ\S*)|ดร\.?|นพ\.|พญ\.|ทพ\.|ทพญ\.|ผศ\.|รศ\.|ศ\.|(?:พล|พ|ร|จ|ส|ด)\.(?:[ตทอ]\.)?(?:[ตทอ]\.)?(?:ต\.|ท\.|อ\.)?)\s*(หญิง)?\s*/;
function stripTitles(s) {
  let t = String(s || '').trim(), prev;
  do { prev = t; t = t.replace(NAME_PREFIX, '').replace(TITLE_RX, '').trim(); } while (t !== prev && t);
  return t;
}
const TONES = /[\u0E31\u0E47-\u0E4E]/g;   // ั ็ ่ ้ ๊ ๋ ์ ํ: typed inconsistently
function normName(s) {
  let t = stripTitles(String(s || '').toLowerCase());
  t = t.replace(/\(.*?\)/g, ' ').replace(/บริษัท|บจก\.?|หจก\.?|ห้างหุ้นส่วนจำกัด|ห้างหุ้นส่วน|จำกัด|มหาชน|\bco\.?|\bltd\.?|limited|company/g, ' ');
  t = t.replace(/^บ\./, '');
  return t.replace(/[^a-z฀-๿]/g, '');
}
const firstName = s => normName(stripTitles(s).split(/\s+/)[0]);
const nameKey = s => { const n = normName(s); return { n, f: firstName(s), t: n.replace(TONES, '') }; };
// a, b are nameKey() results
function keyScore(a, b) {
  const x = a.n, y = b.n;
  if (!x || !y) return 0;
  if (x === y) return 3;
  if (x.length >= 6 && y.length >= 6 && (x.includes(y) || y.includes(x))) return 2;
  if (x.length >= 8 && a.t === b.t) return 2;
  if (a.f.length >= 3 && a.f === b.f) return 1;
  return 0;
}
const nameScore = (a, b) => keyScore(nameKey(a), nameKey(b));
const MATCH_FROM = '2026-01-01';
// Returns per-AT-booking match results and the IDS bookings that have no AT form.
function matchForms(at, idsB, cars, inv) {
  const recs = [];
  idsB.forEach(b => { if (b.cust && !b.seed) recs.push({ kind: 'booking', key: b.key, name: b.cust, date: b.date, model: b.model, grade: b.grade, color: b.color, br: b.br, no: b.no, sales: b.sales, vin: b.vin, row: b }); });
  cars.forEach(c => {
    if (c.seed || c.company) return;
    const name = c.cust || (c.bknote && c.bknote.includes('/') ? c.bknote.split('/').slice(1).join('/') : null);
    if (name && (c.bkno || c.cust)) recs.push({ kind: 'stock', key: 'car:' + c.vin, name, date: c.bkdate || c.alloc || c.stockin, model: c.model, grade: c.grade, color: c.color, br: c.br, no: c.bkno || null, sales: null, vin: c.vin, row: c });
  });
  inv.forEach(i => { if (i.cust && !i.company) recs.push({ kind: 'dl', key: 'inv:' + i.br + ':' + i.inv, name: i.cust, date: i.idate, model: i.model, grade: i.grade, color: i.color, br: i.br, no: i.no, sales: i.sales, vin: i.vin, ddate: i.ddate, row: i }); });
  // every AT booking is compared with every record: a name typed with a rank or a typo at the start must still be found
  recs.forEach(r => { r.k = nameKey(r.name); r.n = r.k.n; });
  const pairs = [];
  for (const a of at) {
    if (a.cancelled || a.demo) continue;
    const ak = nameKey(a.cust);
    // a person confirmed the pairing (or said "not this one") on the booking itself
    const pick = a.rec.match_pick && a.rec.match_pick.key, skip = new Set(a.rec.match_skip || []);
    for (const r of recs) {
      if (skip.has(r.key)) continue;
      if (pick && r.key === pick) { pairs.push({ a, r, score: 1000, same: true, manual: true }); continue; }
      if (a.no && r.no && a.no === r.no) { pairs.push({ a, r, score: 100, same: true }); continue; }
      const ns = keyScore(ak, r.k);
      if (!ns) continue;
      const d = a.date && r.date ? daysBetween(a.date, r.date) : 0;
      const win = r.kind === 'dl' ? [-10, 300] : [-25, 200];
      if (d < win[0] || d > win[1]) continue;
      const same = a.model === r.model;
      if (ns === 1 && !(same && a.grade === r.grade)) continue;
      const score = ns * 10 + (same ? 6 : 0) + (a.grade === r.grade ? 2 : 0) + ((a.color || '') === (r.color || '') ? 1 : 0) + (a.br === r.br ? 1 : 0) - Math.abs(d) / 60 + (r.kind === 'dl' ? 0.5 : r.kind === 'stock' ? 0.3 : 0);
      pairs.push({ a, r, score, same });
    }
  }
  pairs.sort((x, y) => y.score - x.score);
  // a booking can show up in IDS booking, stock and DL at once: keep the most advanced record per AT booking,
  // but never let one IDS record be claimed by two AT bookings
  const usedRec = new Set(), byAt = new Map();
  for (const p of pairs) {
    if (usedRec.has(p.r.key)) continue;
    const cur = byAt.get(p.a.key);
    if (!cur) { byAt.set(p.a.key, { best: p, recs: [p] }); usedRec.add(p.r.key); continue; }
    if (cur.recs.some(q => q.r.kind === p.r.kind)) continue;
    if (cur.best.same && !p.same) continue;
    cur.recs.push(p); usedRec.add(p.r.key);
  }
  const result = new Map();
  const RANK = { dl: 3, stock: 2, booking: 1 };
  for (const [k, v] of byAt) {
    const recsK = v.recs.map(p => p.r).sort((x, y) => RANK[y.kind] - RANK[x.kind]);
    const top = recsK[0], bk = recsK.find(r => r.kind === 'booking'), dl = recsK.find(r => r.kind === 'dl');
    result.set(k, {
      status: v.best.same ? 'matched' : 'possible', manual: !!v.best.manual, kind: top.kind, recs: recsK,
      no: (bk && bk.no) || recsK.find(r => r.no)?.no || null, idsSales: (bk && bk.sales) || (dl && dl.sales) || null,
      idsBr: top.br, vin: recsK.find(r => r.vin)?.vin || null, ddate: dl ? dl.ddate : null, idate: dl ? dl.date : null,
      idsModel: top.model, idsGrade: top.grade, idsColor: top.color
    });
  }
  const matchedIds = new Set();
  for (const v of result.values()) v.recs.forEach(r => { if (r.kind === 'booking') matchedIds.add(r.row.key); });
  const idsOnly = idsB.filter(b => !b.seed && !b.skip && b.match !== 'cancel' && (b.date || '') >= MATCH_FROM && !matchedIds.has(b.key));
  // unmatched AT bookings: records anywhere in IDS (any branch, model or date) with the same or a contained name,
  // so the admin can see e.g. the customer already took a different car on another booking
  const claimedBy = new Map();
  for (const [k, v] of result) v.recs.forEach(r => claimedBy.set(r.key, k));
  const near = new Map();
  for (const a of at) {
    if (a.cancelled || a.demo || result.has(a.key)) continue;
    const ak = nameKey(a.cust), hits = [], skip = new Set(a.rec.match_skip || []);
    for (const r of recs) { if (skip.has(r.key)) continue; const ns = keyScore(ak, r.k); if (ns >= 2) hits.push({ key: r.key, ns, kind: r.kind, br: r.br, no: r.no, inv: r.kind === 'dl' ? r.row.inv : null, date: r.date, ddate: r.ddate || null, name: r.name, model: r.model, grade: r.grade, usedBy: claimedBy.get(r.key) || null }); }
    if (hits.length) near.set(a.key, hits.sort((x, y) => y.ns - x.ns || (y.kind === 'dl') - (x.kind === 'dl')).slice(0, 3));
  }
  return { result, idsOnly, near };
}
