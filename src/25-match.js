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
  // one typo in a full name (a letter added, dropped, changed, or two side by side swapped: นรนม ↔ นรมน)
  if (x.length >= 8 && y.length >= 8 && Math.abs(x.length - y.length) <= 1 && osaDist(x, y, 1) <= 1) return 2;
  if (a.f.length >= 3 && a.f === b.f) return 1;
  return 0;
}
// optimal string alignment distance, stopping once it passes max
function osaDist(a, b, max) {
  const n = a.length, m = b.length; let p2 = null, p1 = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const c = [i]; let lo = i;
    for (let j = 1; j <= m; j++) {
      let v = Math.min(p1[j] + 1, c[j - 1] + 1, p1[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (p2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
      c.push(v); if (v < lo) lo = v;
    }
    if (lo > max) return max + 1;
    p2 = p1; p1 = c;
  }
  return p1[m];
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
  // a fake-advance invoice (made-up buyer, car free to sell) is not this customer's deal: its car and spec must not replace the booking's
  const advFakeInv = i => { const v = S.vehicles.get(i.vin), a = v && v.advance; return !!(a && a.kind === 'fake' && a.inv && String(a.inv).replace(/^0+/, '') === String(i.inv || '').replace(/^0+/, '')); };
  inv.forEach(i => { if (i.cust && !i.company && !advFakeInv(i)) recs.push({ kind: 'dl', key: 'inv:' + i.br + ':' + i.inv, name: i.cust, date: i.idate, model: i.model, grade: i.grade, color: i.color, br: i.br, no: i.no, sales: i.sales, vin: i.vin, ddate: i.ddate, row: i }); });
  // every AT booking is compared with every record: a name typed with a rank or a typo at the start must still be found
  recs.forEach(r => { r.k = nameKey(r.name); r.n = r.k.n; });
  const pairs = [];
  // IDS booking numbers a person marked as 'the old number of this same booking' (IDS re-issued it): they belong to that booking, never to a second one
  const altOf = new Map();
  at.forEach(a => ((a.rec && a.rec.ids_alt) || []).forEach(k => altOf.set(k, a.key)));
  for (const a of at) {
    if (a.cancelled || a.demo) continue;
    const ak = nameKey(a.cust);
    // a person confirmed the pairing (or said "not this one") on the booking itself
    const pick = a.rec.match_pick && a.rec.match_pick.key, skip = new Set(a.rec.match_skip || []);
    for (const r of recs) {
      if (skip.has(r.key) || altOf.has(r.key)) continue;
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
  altOf.forEach((ak, k) => { matchedIds.add(k); const res = result.get(ak), r = recs.find(x => x.key === k); if (res && r) (res.alt = res.alt || []).push(r); });
  let idsOnly = idsB.filter(b => !b.seed && !b.skip && b.match !== 'cancel' && (b.date || '') >= MATCH_FROM && !matchedIds.has(b.key));
  // a booking cancelled in the web whose IDS booking is still open (ตกลง 22/10): the IDS booking belongs to it — it is not a
  // booking without a form, it is waiting to be cancelled in IDS
  const idsCx = new Map();
  for (const a of at) {
    if (!a.cancelled || a.demo) continue;
    const pick = a.rec.match_pick && a.rec.match_pick.key, ak = nameKey(a.cust);
    const b = idsOnly.find(x => !idsCx.has(x.key) && (x.key === pick || (a.no && x.no === a.no)))
      || idsOnly.find(x => !idsCx.has(x.key) && keyScore(ak, nameKey(x.cust)) >= 2 && x.model === a.model && a.date && x.date && Math.abs(daysBetween(a.date, x.date)) <= 25);
    if (b) idsCx.set(b.key, a);
  }
  idsOnly = idsOnly.filter(b => !idsCx.has(b.key));
  // the same customer, model, grade, colour and branch twice in IDS: usually IDS re-issued the booking (e.g. 'postponed' then a new number
  // when the car came). A person confirms: same booking (old number kept as an alias) or two different bookings.
  const dupAsk = new Map();
  for (const a of at) {
    if (a.cancelled || a.demo) continue;
    const res = result.get(a.key), bk = res && res.recs.find(x => x.kind === 'booking'); if (!bk) continue;
    const no = new Set(a.rec.dup_no || []), ak = nameKey(bk.name || a.cust);
    const y = idsOnly.find(x => x.key !== bk.key && !no.has(x.key) && x.cust && keyScore(ak, nameKey(x.cust)) >= 2 && x.model === bk.model && x.grade === bk.grade
      && String(x.color || '').toUpperCase() === String(bk.color || '').toUpperCase() && x.br === bk.br);
    if (!y) continue;
    // sure case: one number is 'postponed' with no car, the other is live with a car: IDS re-issued the booking. No one needs to click.
    const live = r => !!((r.row && r.row.vin) || r.vin), post = r => !!(r.ids === 'เลื่อนการรับรถ' || (r.row && r.row.ids === 'เลื่อนการรับรถ')) && !live(r);
    const yr = recs.find(x => x.key === y.key);
    if (yr && ((post(y) && live(bk)) || (post(bk) && live(y)))) {
      if (post(bk)) {
        res.recs = res.recs.map(r => r === bk ? yr : r);
        res.no = yr.no || res.no; res.idsSales = yr.sales || res.idsSales; res.vin = res.recs.find(r => r.vin)?.vin || null;
        if (res.recs[0] === yr) { res.idsBr = yr.br; res.idsModel = yr.model; res.idsGrade = yr.grade; res.idsColor = yr.color; res.kind = 'booking'; }
      }
      const old = post(bk) ? bk : yr;
      (res.alt = res.alt || []).push(old); res.autoAlt = true; idsOnly = idsOnly.filter(x => x.key !== y.key);
      continue;
    }
    dupAsk.set(a.key, { bk, y }); y.dupOf = a;
  }
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
  return { result, idsOnly, near, idsCx, dupAsk };
}
