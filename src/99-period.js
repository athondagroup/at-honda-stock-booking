
// ---------- ช่วงเวลาของทุกหน้ารายงาน (27/10): รายปี · Ki · ไตรมาส (ตาม Ki) · เดือน · ช่วงวันที่
// Ki starts in April: Ki 103 = เม.ย. 2026 – มี.ค. 2027 (Ki = ปี ค.ศ. ที่เริ่ม − 1923). Quarters follow Ki: Q1 เม.ย.–มิ.ย. … Q4 ม.ค.–มี.ค.
// Kept in S.filters: pKind (y|ki|kq|mo|custom), pYear, pKi, pQ, pMon; custom uses eFrom / eTo.
function pKinds() { return [['y', 'รายปี'], ['ki', 'Ki'], ['kq', 'ไตรมาส'], ['mo', 'เดือน'], ['custom', 'ช่วงวันที่']]; }
function pNow() { const t = todayISO(), y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7)); return { y, m, ki: (m >= 4 ? y : y - 1) - 1923, q: m >= 4 ? Math.floor((m - 4) / 3) + 1 : 4 }; }
function pState() { const n = pNow(), f = S.filters; return { kind: pKinds().some(k => k[0] === f.pKind) ? f.pKind : 'mo', y: Number(f.pYear) || n.y, ki: Number(f.pKi) || n.ki, q: Number(f.pQ) || n.q, m: Number(f.pMon) || n.m }; }
function pPad(n) { return String(n).padStart(2, '0'); }
function pEnd(y, m) { return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); }
function pSpan() { const k = pState().kind; return k === 'y' || k === 'ki' ? 12 : k === 'kq' ? 3 : k === 'mo' ? 1 : 0; }
function periodRange(today) {
  const s = pState(); let from, to;
  if (s.kind === 'custom') { const f = S.filters.eFrom, t = S.filters.eTo; if (validDate(f) && validDate(t) && f <= t) return [f, t]; return [today.slice(0, 8) + '01', today]; }
  if (s.kind === 'y') { from = `${s.y}-01-01`; to = `${s.y}-12-31`; }
  else if (s.kind === 'ki') { const sy = 1923 + s.ki; from = `${sy}-04-01`; to = `${sy + 1}-03-31`; }
  else if (s.kind === 'kq') { let y0 = 1923 + s.ki, m0 = 4 + (s.q - 1) * 3; if (m0 > 12) { m0 -= 12; y0++; } from = `${y0}-${pPad(m0)}-01`; to = pEnd(y0, m0 + 2); }
  else { from = `${s.y}-${pPad(s.m)}-01`; to = pEnd(s.y, s.m); }
  if (to > today) to = today;          // the future has no data: stop at today
  if (from > to) to = from;
  return [from, to];
}
// the dropdowns: year / Ki / quarter / month / dates for the chosen kind
function periodPicker() {
  const s = pState(), n = pNow(), M = TH_MON_FULL(), sel = (key, val, opts) => `<select data-filter="${key}" aria-label="${key}">${opts.map(([v, t]) => `<option value="${v}" ${Number(v) === Number(val) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const years = [], kis = []; for (let y = 2024; y <= n.y + 3; y++) years.push([y, String(y)]); for (let sy = 2023; sy <= n.y + 2; sy++) kis.push([sy - 1923, `${sy - 1923} (เม.ย. ${sy} – มี.ค. ${sy + 1})`]);
  const QN = [[1, 'Q1 (เม.ย.–มิ.ย.)'], [2, 'Q2 (ก.ค.–ก.ย.)'], [3, 'Q3 (ต.ค.–ธ.ค.)'], [4, 'Q4 (ม.ค.–มี.ค.)']];
  let ctl = '';
  if (s.kind === 'y') ctl = `<div class="field"><label>ปี</label>${sel('pYear', s.y, years)}</div>`;
  else if (s.kind === 'ki') ctl = `<div class="field"><label>Ki</label>${sel('pKi', s.ki, kis)}</div>`;
  else if (s.kind === 'kq') ctl = `<div class="field"><label>Ki</label>${sel('pKi', s.ki, kis)}</div><div class="field"><label>ไตรมาส</label>${sel('pQ', s.q, QN)}</div>`;
  else if (s.kind === 'mo') ctl = `<div class="field"><label>ปี</label>${sel('pYear', s.y, years)}</div><div class="field"><label>เดือน</label>${sel('pMon', s.m, M.map((t, i) => [i + 1, t]))}</div>`;
  else { const f = S.filters.eFrom || '', t = S.filters.eTo || '', bad = f && t && f > t; ctl = `<div class="field"><label for="e-from">ตั้งแต่วันที่</label><input id="e-from" type="date" data-filter="eFrom" value="${esc(f)}" max="${todayISO()}"></div><div class="field"><label for="e-to">ถึงวันที่</label><input id="e-to" type="date" data-filter="eTo" value="${esc(t)}" max="${todayISO()}"></div>${bad ? '<span class="text-sm" style="color:var(--bad)">วันเริ่มต้องไม่หลังวันสิ้นสุด</span>' : !(f && t) ? '<span class="text-sm text-muted">เลือกทั้ง 2 วัน</span>' : ''}`; }
  return `<div class="flex flex-wrap gap-3 items-end"><div class="seg" role="group" aria-label="ช่วงเวลา">${pKinds().map(([k, t]) => `<button data-act="p-kind" data-k="${k}" aria-pressed="${s.kind === k}">${t}</button>`).join('')}</div>${ctl}</div>`;
}
// months (YYYY-MM) inside the range
function periodMonths(from, to) { return monthsIn(from, to); }
Object.assign(ACTIONS, {
  'p-kind'(el) { S.filters.pKind = el.dataset.k; if (el.dataset.k === 'custom' && !(S.filters.eFrom && S.filters.eTo)) { S.filters.eFrom = todayISO().slice(0, 8) + '01'; S.filters.eTo = todayISO(); } render(); }
});
