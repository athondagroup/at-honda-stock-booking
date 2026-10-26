// ---------- ตารางแคมเปญรายเดือน (ขอ 26/10): the monthly campaign table (ref/campaigns) and the standard margin table (ref/margins)
// The web copy is the master and is what every screen reads (fast, no Google call). It is filled by hand, by an uploaded campaign
// document, or pulled from the Google Sheet; rows changed here are marked "ยังไม่ส่งขึ้นชีต" and pushed to the sheet with the button.
// Sheet tabs: "แคมเปญ Honda" (A3:P) and "Margin มาตรฐาน" (A3:H). Only function declarations at the top level.
const CDB_SHEET = '17pqWhpWAcj_rqg5jkzqCIVCGj3Awno__aqpIUZ_sSI8';
const CDB_TAB = { camp: 'แคมเปญ Honda', margin: 'Margin มาตรฐาน', priv: 'สิทธิพิเศษ Honda' };
const CDB_LAST = { camp: 'P', margin: 'H', priv: 'J' };
const CDB_MKEY = { accord: 'Accord e:HEV', crv: 'CR-V e:HEV', city: 'City e:HEV', cityHb: 'City HB e:HEV', civic: 'Civic e:HEV', hrv: 'HR-V e:HEV', en2: 'e:N2', step: 'STEP WGN e:HEV' };
const CDB_PRIV = { gtg: 'Gen to Gen', ln: 'Local Native', hk: 'ฮอนด้าเคียงข้างคุณ', loyalty: 'Honda Loyalty (ลดดอกเบี้ย −0.15%)', fj: 'First Jobber (ลดดอกเบี้ย −0.10%)', yto: "You're the One (ลดดอกเบี้ย −0.15%)" };
const CDB_PRIVM = { city: 'New City', cityHb: 'City Hatchback', civic: 'New Civic', hrv: 'New HR-V', accord: 'New Accord', crv: 'New CR-V', en2: 'e:N2', step: 'STEP WGN', all: 'ทุกรุ่นที่ร่วม' };
const cdbDocId = k => k === 'camp' ? 'campaigns' : k === 'priv' ? 'privileges' : 'margins';
const cdbDoc = k => S.ref.get(cdbDocId(k)) || {};
const cdbCan = () => campUpCan();
const cdbSheetId = () => (S.ref.get('campaigns') || {}).sheet_id || CDB_SHEET;
const cdbTab = () => S.filters.cdbTab === 'margin' ? 'margin' : S.filters.cdbTab === 'priv' ? 'priv' : 'camp';
function cdbRows(k) {
  const d = cdbDoc(k);
  if (Array.isArray(d.rows) && d.rows.length) return d.rows;
  if (k === 'priv') return privRowsBuiltIn().map(r => ({ ...r, active: true }));
  return k === 'camp' ? campRowsBuiltIn().map(r => ({ ...r, no: Number(String(r.id).split('-').pop()) || null, active: true }))
    : marginRowsBuiltIn().map(r => ({ ...r, model: CDB_MKEY[r.mkey] || r.mkey, active: true }));
}
const cdbRowKey = (k, r) => k === 'priv' ? r.month + '|' + r.priv + '|' + r.mkey : k === 'camp' ? r.month + '|' + r.id : r.month + '|' + (r.model || r.mkey);
function cdbMkey(model) {
  const m = String(model || '').toUpperCase();
  return /^CITY ?(HB|HATCH)/.test(m) ? 'cityHb' : m.startsWith('CITY') ? 'city' : m.startsWith('CIVIC') ? 'civic' : m.startsWith('HR-V') ? 'hrv' : m.startsWith('ACCORD') ? 'accord' : m.startsWith('CR-V') ? 'crv' : m.startsWith('E:N2') ? 'en2' : m.startsWith('STEP') ? 'step' : '';
}
const cdbPct = s => { const t = String(s ?? '').replace(/[^\d.]/g, ''); return t ? Number(t) / 100 : 0; };
const cdbPctTxt = v => (Math.round(Number(v || 0) * 1000) / 10) + '%';
function cdbFromSheet(k, r, n) {
  const c = i => String(r[i] ?? '').trim();
  if (k === 'camp') { if (!c(0) || !c(4)) return null; return { month: c(0), book_from: c(1), book_to: c(2), deliver_by: c(3), id: c(4), key: c(5), group: c(6), grade: c(7), no: Number(c(8)) || null, name: c(9), rate: c(10), sup: gsNum(c(11)) || 0, ins: c(12), excl: c(13), ref: c(14), active: c(15).toUpperCase() !== 'N', srow: n }; }
  if (k === 'priv') { if (!/^\d{4}-\d{2}$/.test(c(0)) || !CDB_PRIV[c(1)]) return null; return { month: c(0), priv: c(1), name: c(2), mkey: c(3), model: c(4), a1: gsNum(c(5)) || 0, a2: gsNum(c(6)) || 0, into: c(7), cond: c(8), active: c(9).toUpperCase() !== 'FALSE', srow: n }; }
  if (!c(0) || !c(1)) return null;
  return { month: c(0), model: c(1), mkey: cdbMkey(c(1)), cash: cdbPct(c(2)), fin: cdbPct(c(3)), step1: gsNum(c(4)) || 0, step2: gsNum(c(5)) || 0, note: c(6), active: c(7).toUpperCase() !== 'N', srow: n };
}
function cdbToSheet(k, x) {
  if (k === 'priv') return [x.month, x.priv, x.name || CDB_PRIV[x.priv] || '', x.mkey, x.model || CDB_PRIVM[x.mkey] || '', x.a1 || '', x.a2 || '', x.into || (['gtg', 'ln', 'hk'].includes(x.priv) ? 'ใช่' : 'ไม่ (บันทึกไว้)'), x.cond || '', x.active === false ? 'FALSE' : 'TRUE'];
  if (k === 'camp') return [x.month, x.book_from || '', x.book_to || '', x.deliver_by || '', x.id, x.key, x.group || '', x.grade || '', x.no ?? '', x.name || '', x.rate || '', x.sup || 0, x.ins ?? '', x.excl || '', x.ref || '', x.active === false ? 'N' : 'Y'];
  return [x.month, x.model || CDB_MKEY[x.mkey] || x.mkey, cdbPctTxt(x.cash), cdbPctTxt(x.fin), x.step1 || 0, x.step2 || 0, x.note || '', x.active === false ? 'N' : 'Y'];
}
const CDB_F = { priv: [['month', 'เดือนแคมเปญ'], ['priv', 'สิทธิ์'], ['mkey', 'รุ่น'], ['a1', 'ยอด 1 คัน / รับเงิน (บาท)'], ['a2', 'ยอด 2 คันขึ้นไป (บาท)']],
   camp: [['month', 'เดือนแคมเปญ'], ['book_from', 'จองตั้งแต่'], ['book_to', 'จองถึง'], ['deliver_by', 'ออกใบกำกับภายใน'], ['key', 'กลุ่มรุ่น (รหัส)'], ['group', 'ชื่อกลุ่มรุ่น'], ['grade', 'เกรด'], ['no', 'ทางเลือกที่'], ['name', 'ชื่อทางเลือก'], ['rate', 'ดอกเบี้ย'], ['sup', 'Honda เข้า Margin (บาท)'], ['ins', 'ฟรีประกัน (ปี)'], ['excl', 'ห้ามใช้ร่วมกับ'], ['ref', 'อ้างอิง'], ['active', 'ใช้งาน']],
  margin: [['month', 'เดือนแคมเปญ'], ['model', 'รุ่น'], ['cash', 'Margin สด %'], ['fin', 'Margin ไฟแนนซ์ %'], ['step1', 'Step ช่อง 1 (บาท)'], ['step2', 'Step ช่อง 2 (บาท)'], ['note', 'หมายเหตุ'], ['active', 'ใช้งาน']] };
async function cdbCall(tool, args) {
  const mcp = await gsUse(); if (!mcp) throw { code: 'nomcp' };
  const res = await mcp.callTool('Google Sheets', tool, args, { cache: false });
  let p = res && res.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { /* keep */ } }
  return p;
}
async function cdbSave(k, rows, act, changes, extra) {
  const cur = cdbDoc(k), log = [...(cur.log || []), { ...actor(), act, changes: changes || [] }].slice(-300);
  return write('ref', cdbDocId(k), { ...cur, ...(extra || {}), rows, log, at: new Date().toISOString() });
}
const cdbDirty = k => cdbRows(k).filter(r => r.dirty).length;
const cdbDiff = (k, o, n) => CDB_F[k].filter(([f]) => String(o ? o[f] ?? '' : '') !== String(n[f] ?? '')).map(([f, t]) => ({ f: t, old: o ? String(o[f] ?? '–') : '–', new: String(n[f] ?? '–') }));

// ---- page
function cdbMonths(k) { return [...new Set(cdbRows(k).map(r => r.month))].sort().reverse(); }
function viewCampDb(D) {
  if (cdbTab() === 'priv') return cdbPrivView(D);
  const k = cdbTab(), can = cdbCan(), rows = cdbRows(k), ms = cdbMonths(k), M = ms.includes(S.filters.cdbMonth) ? S.filters.cdbMonth : ms[0] || '', B = S.cdb || {};
  const list = rows.filter(r => r.month === M), dirty = cdbDirty('camp') + cdbDirty('margin') + cdbDirty('priv'), d = cdbDoc(k);
  const tabBtn = (id, t) => `<button type="button" class="tab" aria-selected="${k === id}" data-act="cdb-tab" data-t="${id}">${t}</button>`;
  const head = k === 'camp' ? '<th>กลุ่มรุ่น</th><th>ทางเลือก</th><th>ชื่อทางเลือก</th><th class="text-right">Honda เข้า Margin</th><th>จอง</th><th>ใบกำกับภายใน</th><th>อ้างอิง</th><th>ใช้งาน</th>' : '<th>รุ่น</th><th class="text-right">สด %</th><th class="text-right">ไฟแนนซ์ %</th><th class="text-right">Step 1</th><th class="text-right">Step 2</th><th>หมายเหตุ</th><th>ใช้งาน</th>';
  const body = list.map(r => `<tr class="${r.active === false ? 'opacity-50' : ''}">${k === 'camp'
    ? `<td class="text-xs">${esc(r.group || r.key)}</td><td class="num">${esc(r.no ?? '')}</td><td class="text-sm" style="min-width:260px">${esc(String(r.name || '').replace(/^ทางเลือก ?\d+ ?: ?/, ''))}</td><td class="text-right num">${r.sup ? money(r.sup) : '–'}</td><td class="num text-xs nowrap">${r.book_from ? fmtD(r.book_from) + ' – ' + fmtD(r.book_to) : '–'}</td><td class="num text-xs nowrap">${r.deliver_by ? fmtD(r.deliver_by) : '–'}</td><td class="text-xs">${esc(r.ref || '')}</td>`
    : `<td>${esc(r.model || CDB_MKEY[r.mkey] || r.mkey)}</td><td class="text-right num">${cdbPctTxt(r.cash)}</td><td class="text-right num">${cdbPctTxt(r.fin)}</td><td class="text-right num">${money(r.step1 || 0)}</td><td class="text-right num">${money(r.step2 || 0)}</td><td class="text-xs">${esc(r.note || '')}</td>`}
    <td class="nowrap">${r.active === false ? chip('ปิด', 'neutral') : chip('ใช้', 'good')}${r.dirty ? ' ' + chip('ยังไม่ส่งขึ้นชีต', 'warn') : ''}</td>
    <td>${can ? `<button type="button" class="btn btn-ghost btn-sm" data-act="cdb-edit" data-k="${k}" data-key="${esc(cdbRowKey(k, r))}">แก้ไข</button>` : ''}</td></tr>`).join('');
  return `${pageHead('ตารางแคมเปญรายเดือน', 'ทางเลือกและเงินช่วย Honda ของแต่ละรุ่น + Margin มาตรฐาน · ข้อมูลในเว็บเป็นหลัก ทุกหน้าที่เทียบเงินอ่านจากตารางนี้')}
  <div class="flex gap-1 border-b border-line mb-3" role="tablist">${tabBtn('camp', 'แคมเปญ Honda')}${tabBtn('margin', 'Margin มาตรฐาน')}${tabBtn('priv', 'สิทธิพิเศษ Honda')}</div>
  <section class="bg-surface border border-line rounded-lg p-3 md:p-4 mb-4"><div class="flex flex-wrap items-end gap-2">
    <div class="field"><label for="cdb-m">เดือนแคมเปญ</label><select id="cdb-m" data-cdb-month>${ms.map(m => `<option value="${esc(m)}" ${m === M ? 'selected' : ''}>${esc(fmtM(m))}</option>`).join('') || '<option value="">–</option>'}</select></div>
    ${can ? `<button class="btn btn-dark btn-sm" data-act="cdb-add" data-k="${k}" data-m="${esc(M)}">+ เพิ่ม${k === 'camp' ? 'ทางเลือก' : 'รุ่น'}</button>
    <button class="btn btn-ghost btn-sm" data-act="cdb-copy" ${M ? '' : 'disabled'}>คัดลอกเดือนนี้ไปเดือนใหม่</button>
    ${k === 'camp' ? `<label class="btn btn-ghost btn-sm relative cursor-pointer">อัปโหลดเอกสารแคมเปญ<input type="file" accept="image/*,.xlsx,.xls,.csv,.txt" data-cdb-file class="absolute inset-0 opacity-0 cursor-pointer"></label>` : ''}
    <span class="ml-auto flex flex-wrap gap-2"><button class="btn btn-ghost btn-sm" data-act="cdb-pull" ${B.busy ? 'disabled' : ''}>ดึงจากชีต</button>
    <button class="btn btn-red btn-sm" data-act="cdb-push" ${B.busy || !dirty ? 'disabled' : ''}>ส่งขึ้นชีต${dirty ? ` (${dirty})` : ''}</button></span>` : ''}</div>
    ${B.busy ? `<p class="text-sm mt-2" role="status"><span class="spin"></span> ${esc(B.busy)}</p>` : ''}${B.err ? `<p class="text-sm mt-2" style="color:var(--bad)">${esc(B.err)}</p>` : ''}${B.done ? `<p class="text-sm mt-2" style="color:var(--good)">${esc(B.done)}</p>` : ''}
    <p class="text-xs text-muted mt-2">${d.synced_at ? `ดึงจากชีตล่าสุด ${fmtDT(d.synced_at)} · ` : d.rows ? '' : 'ยังใช้ตารางที่ฝังในระบบ (เดือน ต.ค.) · กด "ดึงจากชีต" หรือแก้ไขเพื่อเริ่มเก็บในฐานข้อมูล · '}ชีต: <a class="underline" target="_blank" rel="noopener" href="https://docs.google.com/spreadsheets/d/${esc(cdbSheetId())}/edit">เปิด Google Sheet</a> · เดือนที่ไม่มีในตารางจะใช้ของเดือนก่อนหน้าและมีคำเตือน</p></section>
  ${B.draft ? cdbDraftBox(B.draft) : ''}
  <div class="bg-surface border border-line rounded-lg overflow-x-auto"><table class="tbl"><thead><tr>${head}<th></th></tr></thead><tbody>${body || `<tr><td colspan="9" class="text-muted p-4">ยังไม่มีข้อมูลเดือนนี้ กด "คัดลอกเดือนนี้ไปเดือนใหม่" หรือ "+ เพิ่ม"</td></tr>`}</tbody></table></div>
  ${cdbLogBox(k)}`;
}
function cdbLogBox(k) {
  const log = (cdbDoc(k).log || []).slice().reverse().slice(0, 30); if (!log.length) return '';
  return `<details class="mt-4"><summary class="text-sm cursor-pointer">ประวัติแก้ไขตารางนี้ (${log.length} ล่าสุด)</summary><div class="mt-2 bg-surface border border-line rounded-lg divide-y divide-line">${log.map(h => `<div class="p-2 md:px-4 text-xs"><span class="num text-muted">${fmtDT(h.at)}</span> · ${who(h)} · <b>${esc(h.act)}</b>${(h.changes || []).length ? '<br>' + h.changes.slice(0, 8).map(c => `${esc(c.f)}: ${esc(c.old)} → <b>${esc(c.new)}</b>`).join(' · ') : ''}</div>`).join('')}</div></details>`;
}
// ---- special privileges (Gen to Gen / Local Native): kept in the web only (ref/privileges), not in the Google Sheet
function cdbPrivView(D) {
  const k = 'priv', can = cdbCan(), rows = cdbRows(k), ms = cdbMonths(k), M = ms.includes(S.filters.cdbMonth) ? S.filters.cdbMonth : ms[0] || '', list = rows.filter(r => r.month === M), d = cdbDoc(k);
  const tabBtn = (id, t) => `<button type="button" class="tab" aria-selected="${k === id}" data-act="cdb-tab" data-t="${id}">${t}</button>`;
  const body = list.map(r => `<tr class="${r.active === false ? 'opacity-50' : ''}"><td>${esc(r.name || CDB_PRIV[r.priv] || r.priv)}</td><td>${esc(r.model || CDB_PRIVM[r.mkey] || r.mkey)}</td><td class="text-right num">${r.a1 ? money(r.a1) : '–'}</td><td class="text-right num">${r.a2 ? money(r.a2) : '–'}</td>
    <td class="nowrap">${r.active === false ? chip('ปิด', 'neutral') : chip('ใช้', 'good')}${r.dirty ? ' ' + chip('ยังไม่ส่งขึ้นชีต', 'warn') : ''}</td><td>${can ? `<button type="button" class="btn btn-ghost btn-sm" data-act="cdb-edit" data-k="${k}" data-key="${esc(cdbRowKey(k, r))}">แก้ไข</button>` : ''}</td></tr>`).join('');
  return `${pageHead('ตารางแคมเปญรายเดือน', 'สิทธิพิเศษ Honda (Gen to Gen, Local Native, เคียงข้างคุณ, สิทธิลดดอกเบี้ย) ต่อรุ่น · ข้อมูลในเว็บเป็นตัวหลัก ส่งขึ้นชีตแท็บ "สิทธิพิเศษ Honda"')}
  <div class="flex gap-1 border-b border-line mb-3" role="tablist">${tabBtn('camp', 'แคมเปญ Honda')}${tabBtn('margin', 'Margin มาตรฐาน')}${tabBtn('priv', 'สิทธิพิเศษ Honda')}</div>
  <section class="bg-surface border border-line rounded-lg p-3 md:p-4 mb-4"><div class="flex flex-wrap items-end gap-2">
    <div class="field"><label for="cdb-m">เดือนแคมเปญ</label><select id="cdb-m" data-cdb-month>${ms.map(m => `<option value="${esc(m)}" ${m === M ? 'selected' : ''}>${esc(fmtM(m))}</option>`).join('') || '<option value="">–</option>'}</select></div>
    ${can ? `<button class="btn btn-dark btn-sm" data-act="cdb-add" data-k="${k}" data-m="${esc(M)}">+ เพิ่มสิทธิ์</button><button class="btn btn-ghost btn-sm" data-act="cdb-copy" ${M ? '' : 'disabled'}>คัดลอกเดือนนี้ไปเดือนใหม่</button>` : ''}
    ${can ? `<span class="ml-auto flex flex-wrap gap-2"><button class="btn btn-ghost btn-sm" data-act="cdb-pull" ${(S.cdb || {}).busy ? 'disabled' : ''}>ดึงจากชีต</button><button class="btn btn-red btn-sm" data-act="cdb-push" ${(S.cdb || {}).busy || !(cdbDirty('camp') + cdbDirty('margin') + cdbDirty('priv')) ? 'disabled' : ''}>ส่งขึ้นชีต${cdbDirty('camp') + cdbDirty('margin') + cdbDirty('priv') ? ` (${cdbDirty('camp') + cdbDirty('margin') + cdbDirty('priv')})` : ''}</button></span>` : ''}</div>
    ${(S.cdb || {}).busy ? `<p class="text-sm mt-2" role="status"><span class="spin"></span> ${esc(S.cdb.busy)}</p>` : ''}${(S.cdb || {}).err ? `<p class="text-sm mt-2" style="color:var(--bad)">${esc(S.cdb.err)}</p>` : ''}${(S.cdb || {}).done ? `<p class="text-sm mt-2" style="color:var(--good)">${esc(S.cdb.done)}</p>` : ''}
    <p class="text-xs text-muted mt-2">${d.rows ? '' : 'ยังใช้ตารางที่ฝังในระบบ (เดือน ต.ค.) · กด "ดึงจากชีต" เพื่อเอาข้อมูลครบจากชีต · '}เว็บคิดเงินเฉพาะ Gen to Gen และ Local Native · เคียงข้างคุณเป็นยอดที่เซลล์พิมพ์เองต่อคัน · สิทธิลดดอกเบี้ยเป็นหมายเหตุ ไม่คิดเงิน</p></section>
  <div class="bg-surface border border-line rounded-lg overflow-x-auto"><table class="tbl"><thead><tr><th>สิทธิ์</th><th>รุ่น</th><th class="text-right">1 คัน / รับเงิน</th><th class="text-right">2 คันขึ้นไป</th><th>สถานะ</th><th></th></tr></thead><tbody>${body || '<tr><td colspan="6" class="text-muted p-4">ยังไม่มีข้อมูลเดือนนี้ กด "คัดลอกเดือนนี้ไปเดือนใหม่" หรือ "+ เพิ่มสิทธิ์"</td></tr>'}</tbody></table></div>
  ${cdbLogBox(k)}`;
}
function cdbPrivModal(m) {
  const e = m.e, opt = (v, t, cur) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(t)}</option>`;
  return `<div class="flex items-start justify-between gap-3 mb-2"><h2 class="font-head text-xl font-semibold">${m.key ? 'แก้ไข' : 'เพิ่ม'}สิทธิพิเศษ Honda</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="flex flex-col gap-3"><div class="grid sm:grid-cols-2 gap-3">
    <div class="field"><label for="cp-month">เดือนแคมเปญ (ปี-เดือน)</label><input id="cp-month" data-modal="e.month" value="${esc(e.month || '')}" placeholder="2026-11"></div>
    <div class="field"><label for="cp-priv">สิทธิ์</label><select id="cp-priv" data-modal="e.priv">${Object.entries(CDB_PRIV).map(([kk, t]) => opt(kk, t, e.priv)).join('')}</select></div>
    <div class="field"><label for="cp-mkey">รุ่น</label><select id="cp-mkey" data-modal="e.mkey">${Object.entries(CDB_PRIVM).map(([kk, t]) => opt(kk, t, e.mkey)).join('')}</select></div><div class="field"><label for="cp-into">เข้า Margin</label><select id="cp-into" data-modal="e.into">${opt('ใช่', 'ใช่ (คิดเงิน)', e.into || 'ใช่')}${opt('ไม่ (บันทึกไว้)', 'ไม่ (บันทึกไว้เฉย ๆ)', e.into)}</select></div>
    <div class="field"><label for="cp-a1">${e.priv === 'gtg' ? 'ยอดรถฮอนด้าเดิม 1 คัน (บาท)' : e.priv === 'hk' ? 'ยอดต่ำสุด (บาท)' : 'ยอด / รับเงิน (บาท)'}</label><input id="cp-a1" type="number" inputmode="decimal" data-modal="e.a1" value="${esc(e.a1 ?? 0)}"></div>
    <div class="field"><label for="cp-a2">${e.priv === 'hk' ? 'ยอดสูงสุด (บาท)' : 'ยอดรถ 2 คันขึ้นไป (บาท) · เว้นว่างถ้าไม่มี'}</label><input id="cp-a2" type="number" inputmode="decimal" data-modal="e.a2" value="${esc(e.a2 || '')}"></div></div>
  <div class="field"><label for="cp-cond">เงื่อนไข</label><input id="cp-cond" data-modal="e.cond" value="${esc(e.cond || '')}"></div>
  <label class="flex items-center gap-2 text-sm"><input type="checkbox" data-modal="e.active" ${e.active === false ? '' : 'checked'}> ใช้งาน</label>
  <div class="flex gap-2 justify-end"><button class="btn btn-ghost" data-act="close">ยกเลิก</button><button class="btn btn-dark" data-act="cdb-save">บันทึก</button></div></div>`;
}
// ---- edit / add window
function cdbEditOpen(k, key, month) {
  const rows = cdbRows(k), r = key ? rows.find(x => cdbRowKey(k, x) === key) : null;
  const base = r ? { ...r } : k === 'priv' ? { month, priv: 'gtg', mkey: 'city', a1: 0, a2: 0, into: 'ใช่', cond: '', active: true } : k === 'camp' ? { month, active: true, no: '', sup: 0 } : { month, active: true, cash: 0.03, fin: 0.03, step1: 0, step2: 0 };
  if (k === 'margin') { base.cashP = cdbPctTxt(base.cash).replace('%', ''); base.finP = cdbPctTxt(base.fin).replace('%', ''); }
  S.modal = { kind: 'cdbedit', k, key: key || null, e: base };
  render();
}
function cdbEditModal(m, D) {
  if (m.k === 'priv') return cdbPrivModal(m);
  const k = m.k, e = m.e, fld = (f, t, type = 'text', extra = '') => `<div class="field"><label for="cd-${f}">${t}</label><input id="cd-${f}" type="${type}" ${type === 'number' ? 'step="any" inputmode="decimal"' : ''} data-modal="e.${f}" value="${esc(e[f] ?? '')}" autocomplete="off" ${extra}></div>`;
  const groups = [...new Map(cdbRows('camp').map(r => [r.key, r.group])).entries()];
  const fields = k === 'camp' ? `<div class="grid sm:grid-cols-2 gap-3">${fld('month', 'เดือนแคมเปญ (ปี-เดือน)', 'text', 'placeholder="2026-11"')}${fld('no', 'ทางเลือกที่', 'number')}${fld('book_from', 'จองตั้งแต่', 'date')}${fld('book_to', 'จองถึง', 'date')}${fld('deliver_by', 'ออกใบกำกับ / รับรถภายใน', 'date')}${fld('sup', 'Honda เข้า Margin (บาท)', 'number')}
      <div class="field"><label for="cd-key">กลุ่มรุ่น</label><select id="cd-key" data-modal="e.key"><option value="">– เลือก –</option>${groups.map(([kk, g]) => `<option value="${esc(kk)}" ${e.key === kk ? 'selected' : ''}>${esc(kk)} · ${esc(g)}</option>`).join('')}</select></div>${fld('grade', 'เกรด / เงื่อนไข')}</div>
    ${fld('name', 'ชื่อทางเลือก (ขึ้นในรายการให้เซลล์เลือก)')}<div class="grid sm:grid-cols-4 gap-3">${fld('rate', 'ดอกเบี้ย')}${fld('ins', 'ฟรีประกัน (ปี)')}${fld('ref', 'อ้างอิง (เช่น SP118/26)')}${fld('excl', 'ห้ามใช้ร่วมกับ')}</div>`
    : `<div class="grid sm:grid-cols-2 gap-3">${fld('month', 'เดือนแคมเปญ (ปี-เดือน)')}${fld('model', 'รุ่น')}${fld('cashP', 'Margin รถ ซื้อสด (%)', 'number')}${fld('finP', 'Margin รถ ไฟแนนซ์ (%)', 'number')}${fld('step1', 'AT Step ช่อง 1 (บาท)', 'number')}${fld('step2', 'AT Step ช่อง 2 (บาท)', 'number')}</div>${fld('note', 'หมายเหตุ')}`;
  return `<div class="flex items-start justify-between gap-3 mb-2"><h2 class="font-head text-xl font-semibold">${m.key ? 'แก้ไข' : 'เพิ่ม'}${k === 'camp' ? 'ทางเลือกแคมเปญ' : 'Margin มาตรฐาน'}</h2><button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="flex flex-col gap-3">${fields}<label class="flex items-center gap-2 text-sm"><input type="checkbox" data-modal="e.active" ${e.active === false ? '' : 'checked'}> ใช้งาน (เอาออกจากรายการให้เลือกโดยปิดช่องนี้ ไม่ลบแถว)</label>
  <div class="text-xs text-muted">บันทึกในเว็บทันที แล้วกด "ส่งขึ้นชีต" เพื่อให้ Google Sheet ตรงกัน</div>
  <div class="flex gap-2 justify-end"><button class="btn btn-ghost" data-act="close">ยกเลิก</button><button class="btn btn-dark" data-act="cdb-save">บันทึก</button></div></div>`;
}
// ---- upload a campaign document: read the lines "ทางเลือกที่ N …" into a draft the admin checks before adding
function cdbParseText(text) {
  const t = String(text || '').replace(/\r/g, '').replace(/ทางเลือหที่/g, 'ทางเลือกที่'), parts = t.split(/(?=ทางเลือก(?:ที่)?\s*\d+\s*[:：.\-–)]?)/).map(s => s.replace(/\s+/g, ' ').trim()).filter(s => /^ทางเลือก(?:ที่)?\s*\d+/.test(s)), seen = new Set(), out = [];
  for (const s of parts) {
    const no = Number(s.match(/^ทางเลือก(?:ที่)?\s*(\d+)/)[1]); if (seen.has(no)) continue; seen.add(no);
    const sup = (s.match(/ค่าช่วยเหลือ(?:การขาย)?\s*([\d,]+)\s*บาท/) || [])[1], rate = (s.match(/ดอกเบี้ย(?:พิเศษ)?\s*([\d.]+)\s*%/) || [])[1], ins = /ฟรีประกันภัย\s*(\d+)\s*ปี/.exec(s);
    out.push({ no, name: 'ทางเลือก ' + no + ': ' + s.replace(/^ทางเลือก(?:ที่)?\s*\d+\s*[:：.\-–)]?\s*/, '').slice(0, 220), sup: sup ? Number(sup.replace(/,/g, '')) : 0, rate: rate ? rate + '%' : '', ins: ins ? ins[1] : '' });
  }
  return out;
}
function cdbDraftBox(dr) {
  const M = dr.month || '', groups = [...new Map(cdbRows('camp').map(r => [r.key, r.group])).entries()];
  return `<section class="bg-surface border border-line rounded-lg p-3 md:p-4 mb-4"><div class="flex items-center gap-2 mb-2"><h3 class="font-head font-semibold">ตรวจรายการที่อ่านจากเอกสาร ${dr.file ? '· ' + esc(dr.file) : ''}</h3><button class="btn btn-ghost btn-sm ml-auto" data-act="cdb-draft-clear">ยกเลิก</button></div>
  ${dr.rows.length ? '' : '<p class="text-sm" style="color:var(--warn)">ไม่พบบรรทัด "ทางเลือกที่ N" ในเอกสาร เพิ่มเองด้วยปุ่ม + เพิ่มทางเลือก</p>'}
  <div class="grid sm:grid-cols-4 gap-2 mb-2"><div class="field"><label for="dr-m">เดือนแคมเปญ</label><input id="dr-m" data-cdb-dr="month" value="${esc(M)}" placeholder="2026-11"></div>
    <div class="field"><label for="dr-k">กลุ่มรุ่น</label><select id="dr-k" data-cdb-dr="key"><option value="">– เลือก –</option>${groups.map(([kk, g]) => `<option value="${esc(kk)}" ${dr.key === kk ? 'selected' : ''}>${esc(kk)} · ${esc(g)}</option>`).join('')}</select></div>
    <div class="field"><label for="dr-r">อ้างอิง (เช่น SP085/26)</label><input id="dr-r" data-cdb-dr="ref" value="${esc(dr.ref || '')}"></div>
    <div class="field"><label for="dr-d">ใบกำกับภายใน</label><input id="dr-d" type="date" data-cdb-dr="deliver_by" value="${esc(dr.deliver_by || '')}"></div></div>
  <div class="overflow-x-auto"><table class="tbl text-sm"><thead><tr><th>#</th><th>ชื่อทางเลือก</th><th class="text-right">Honda เข้า Margin</th><th>ดอกเบี้ย</th></tr></thead><tbody>${dr.rows.map((r, i) => `<tr><td class="num">${r.no}</td><td><input class="w-full" data-cdb-drrow="${i}.name" value="${esc(r.name)}"></td><td><input class="w-28 text-right" type="number" data-cdb-drrow="${i}.sup" value="${esc(r.sup)}"></td><td class="num">${esc(r.rate)}</td></tr>`).join('')}</tbody></table></div>
  <div class="flex justify-end mt-2"><button class="btn btn-dark btn-sm" data-act="cdb-draft-add" ${dr.rows.length ? '' : 'disabled'}>เพิ่ม ${dr.rows.length} ทางเลือกเข้าตาราง</button></div></section>`;
}
async function cdbReadFile(file) {
  const B = S.cdb || (S.cdb = {}); B.busy = 'กำลังอ่านเอกสาร…'; B.err = ''; B.done = ''; render();
  try {
    let text = '';
    if (/^image\//.test(file.type)) {
      const imgs = await shrink(file).catch(() => null);
      const res = await aiRead('This is a Honda sales campaign document from Thailand. Transcribe every campaign option line as plain text, keeping the words "ทางเลือกที่ N" at the start of each option, with interest rates, free insurance, sales support baht and conditions exactly as written. Return JSON only: {"text":"all lines joined by newline"}', [imgs || file]);
      text = String(res && res.text || '');
    } else { const X = await loadXLSX(), wb = /\.(csv|txt)$/i.test(file.name) ? X.read(await file.text(), { type: 'string' }) : X.read(await file.arrayBuffer(), { type: 'array' }); text = wb.SheetNames.map(n => X.utils.sheet_to_csv(wb.Sheets[n]).replace(/,/g, ' ')).join('\n'); }
    const rows = cdbParseText(text), ref = (text.match(/SP\d{3}\/\d{2}/) || [''])[0];
    B.draft = { rows, file: file.name, month: S.filters.cdbMonth || '', key: '', ref, deliver_by: '' }; B.busy = '';
  } catch (e) { B.busy = ''; B.err = 'อ่านเอกสารไม่ได้ ลองไฟล์อื่น หรือเพิ่มเอง'; }
  render();
}
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset) return;
  if (t.dataset.modal === 'e.priv' && S.modal && S.modal.kind === 'cdbedit') { render(); return; }
  if (t.dataset.cdbMonth !== undefined) { S.filters.cdbMonth = t.value; render(); }
  else if (t.dataset.cdbFile !== undefined) { const f = t.files && t.files[0]; t.value = ''; if (f) cdbReadFile(f); }
  else if (t.dataset.cdbDr !== undefined && S.cdb && S.cdb.draft) { S.cdb.draft[t.dataset.cdbDr] = t.value; if (t.tagName === 'SELECT') render(); }
  else if (t.dataset.cdbDrrow !== undefined && S.cdb && S.cdb.draft) { const [i, f] = t.dataset.cdbDrrow.split('.'); S.cdb.draft.rows[Number(i)][f] = f === 'sup' ? Number(t.value) || 0 : t.value; }
});
// ---- actions
Object.assign(ACTIONS, {
  'cdb-tab'(el) { S.filters.cdbTab = el.dataset.t; S.filters.cdbMonth = ''; render(); },
  'cdb-add'(el) { if (cdbCan()) cdbEditOpen(el.dataset.k, null, el.dataset.m || ''); },
  'cdb-edit'(el) { if (cdbCan()) cdbEditOpen(el.dataset.k, el.dataset.key); },
  'cdb-draft-clear'() { if (S.cdb) S.cdb.draft = null; render(); },
  async 'cdb-save'() {
    const m = S.modal; if (!m || m.kind !== 'cdbedit' || !cdbCan()) return; const k = m.k, e = { ...m.e }, rows = cdbRows(k).map(r => ({ ...r }));
    if (!/^\d{4}-\d{2}$/.test(String(e.month || '').trim())) { toast('ใส่เดือนแคมเปญเป็น ปี-เดือน เช่น 2026-11', 'bad'); return; }
    e.month = e.month.trim();
    if (k === 'priv') {
      if (!CDB_PRIV[e.priv] || !CDB_PRIVM[e.mkey]) { toast('เลือกสิทธิ์และรุ่น', 'bad'); return; }
      e.a1 = Number(e.a1) || 0; e.a2 = Number(e.a2) || 0; e.name = CDB_PRIV[e.priv]; e.model = CDB_PRIVM[e.mkey]; e.into = e.into || 'ใช่';
    } else if (k === 'camp') {
      if (!e.key || !e.name || !Number(e.no)) { toast('เลือกกลุ่มรุ่น ใส่ทางเลือกที่ และชื่อทางเลือก', 'bad'); return; }
      e.no = Number(e.no); e.sup = Number(e.sup) || 0; e.id = m.key ? e.id : e.key + '-' + e.no; e.group = e.group || (cdbRows('camp').find(r => r.key === e.key) || {}).group || e.key;
      if (!String(e.name).startsWith('ทางเลือก')) e.name = 'ทางเลือก ' + e.no + ': ' + e.name;
    } else { if (!e.model) { toast('ใส่ชื่อรุ่น', 'bad'); return; } e.cash = (Number(e.cashP) || 0) / 100; e.fin = (Number(e.finP) || 0) / 100; e.step1 = Number(e.step1) || 0; e.step2 = Number(e.step2) || 0; e.mkey = cdbMkey(e.model) || e.mkey || ''; delete e.cashP; delete e.finP; }
    e.active = e.active !== false;
    const nk = cdbRowKey(k, e), at = rows.findIndex(r => cdbRowKey(k, r) === (m.key || nk)), old = at >= 0 ? rows[at] : null;
    if (!m.key && at >= 0) { toast('มีทางเลือกนี้ในเดือนนี้แล้ว ให้แก้แถวเดิม', 'bad'); return; }
    if (m.key && nk !== m.key && rows.some(r => cdbRowKey(k, r) === nk)) { toast('ชื่อซ้ำกับแถวอื่น', 'bad'); return; }
    const ch = cdbDiff(k, old, e); if (old && !ch.length) { toast('ไม่มีอะไรเปลี่ยน', 'bad'); return; }
    const row = { ...(old || {}), ...e, dirty: true }; if (at >= 0) rows[at] = row; else rows.push(row);
    if (await cdbSave(k, rows, old ? 'แก้' : 'เพิ่ม', ch.length ? ch : [{ f: 'แถวใหม่', old: '–', new: nk }])) { S.filters.cdbMonth = e.month; S.modal = null; toast('บันทึกในเว็บแล้ว · อย่าลืมส่งขึ้นชีต'); render(); }
  },
  async 'cdb-draft-add'() {
    const dr = S.cdb && S.cdb.draft; if (!dr || !cdbCan()) return;
    if (!/^\d{4}-\d{2}$/.test(String(dr.month || ''))) { toast('ใส่เดือนแคมเปญเป็น ปี-เดือน', 'bad'); return; }
    if (!dr.key) { toast('เลือกกลุ่มรุ่น', 'bad'); return; }
    const rows = cdbRows('camp').map(r => ({ ...r })), grp = (rows.find(r => r.key === dr.key) || {}).group || dr.key, [y, mo] = dr.month.split('-').map(Number), last = new Date(y, mo, 0).getDate(), ch = [];
    for (const x of dr.rows) {
      const id = dr.key + '-' + x.no, row = { month: dr.month, book_from: dr.month + '-01', book_to: dr.month + '-' + String(last).padStart(2, '0'), deliver_by: dr.deliver_by || '', id, key: dr.key, group: grp, grade: '', no: x.no, name: x.name, rate: x.rate, sup: Number(x.sup) || 0, ins: x.ins, excl: '', ref: dr.ref || '', active: true, dirty: true };
      const at = rows.findIndex(r => r.month === dr.month && r.id === id); ch.push(...cdbDiff('camp', at >= 0 ? rows[at] : null, row).slice(0, 4).map(c => ({ ...c, f: id + ' ' + c.f })));
      if (at >= 0) rows[at] = { ...rows[at], ...row, srow: rows[at].srow }; else rows.push(row);
    }
    if (await cdbSave('camp', rows, 'เพิ่มจากเอกสาร ' + (dr.file || ''), ch)) { S.filters.cdbMonth = dr.month; S.cdb.draft = null; toast(`เพิ่ม ${dr.rows.length} ทางเลือกแล้ว ตรวจในตาราง แล้วส่งขึ้นชีต`); render(); }
  },
  async 'cdb-copy'() {
    const k = cdbTab(), M = S.filters.cdbMonth || cdbMonths(k)[0]; if (!M || !cdbCan()) return;
    const [y, mo] = M.split('-').map(Number), nm = new Date(y, mo, 1), N = nm.getFullYear() + '-' + String(nm.getMonth() + 1).padStart(2, '0');
    const rows = cdbRows(k).map(r => ({ ...r })); if (rows.some(r => r.month === N)) { toast(`มีข้อมูลเดือน ${fmtM(N)} แล้ว`, 'bad'); return; }
    const last = new Date(nm.getFullYear(), nm.getMonth() + 1, 0).getDate();
    rows.filter(r => r.month === M).forEach(r => { const c = { ...r, month: N, dirty: true }; delete c.srow; if (k === 'camp') { c.book_from = N + '-01'; c.book_to = N + '-' + String(last).padStart(2, '0'); c.deliver_by = ''; c.ref = ''; } rows.push(c); });
    if (await cdbSave(k, rows, `คัดลอกเดือน ${fmtM(M)} → ${fmtM(N)}`, [])) { S.filters.cdbMonth = N; toast(`คัดลอกไปเดือน ${fmtM(N)} แล้ว แก้ตัวเลขและวันที่ให้ตรงเอกสารใหม่`); render(); }
  },
  async 'cdb-pull'() {
    if (!cdbCan()) return; const B = S.cdb || (S.cdb = {}); B.busy = 'กำลังดึงจาก Google Sheet…'; B.err = ''; B.done = ''; render();
    try {
      let msgs = [];
      for (const k of ['camp', 'margin', 'priv']) {
        const p = await cdbCall('get_values', { spreadsheetId: cdbSheetId(), range: `'${CDB_TAB[k]}'!A3:${CDB_LAST[k]}` }), vals = p && Array.isArray(p.values) ? p.values : null;
        if (!vals) throw new Error('shape');
        const fromSheet = vals.map((r, i) => cdbFromSheet(k, r, i + 3)).filter(Boolean), local = new Map(cdbRows(k).map(r => [cdbRowKey(k, r), r]));
        let keep = 0, ch = [];
        const rows = fromSheet.map(s => { const l = local.get(cdbRowKey(k, s)); if (l && l.dirty) { keep++; return { ...l, srow: s.srow }; } const d = cdbDiff(k, l, s); if (l && d.length) ch.push(...d.map(c => ({ ...c, f: cdbRowKey(k, s) + ' ' + c.f }))); return s; });
        for (const l of local.values()) if (l.dirty && !l.srow && !fromSheet.some(s => cdbRowKey(k, s) === cdbRowKey(k, l))) { rows.push(l); keep++; }
        if (!(await cdbSave(k, rows, 'ดึงจากชีต', ch.slice(0, 40), { synced_at: new Date().toISOString(), sheet_id: cdbSheetId() }))) throw new Error('save');
        msgs.push(`${CDB_TAB[k]} ${fromSheet.length} แถว${keep ? ` (เก็บค่าที่แก้ในเว็บไว้ ${keep} แถว ยังไม่ส่งขึ้นชีต)` : ''}`);
      }
      B.busy = ''; B.done = 'ดึงจากชีตแล้ว: ' + msgs.join(' · ');
    } catch (e) { B.busy = ''; B.err = e && e.code === 'nomcp' ? 'มุมมองนี้ยังไม่ได้เชื่อม Google Sheets ใช้กรอกเองหรืออัปโหลดเอกสารแทน' : 'ดึงจากชีตไม่ได้ (ชีตไม่ได้แชร์ หรือชื่อแท็บไม่ตรง) ลองอีกครั้ง'; }
    render();
  },
  async 'cdb-push'() {
    if (!cdbCan()) return; const B = S.cdb || (S.cdb = {}); B.busy = 'กำลังส่งขึ้น Google Sheet…'; B.err = ''; B.done = ''; render();
    let sent = 0, failed = 0;
    try {
      for (const k of ['camp', 'margin', 'priv']) {
        const rows = cdbRows(k).map(r => ({ ...r })); if (!rows.some(r => r.dirty)) continue;
        for (const r of rows.filter(x => x.dirty)) {
          const arr = cdbToSheet(k, r);
          if (r.srow) await cdbCall('update_values', { spreadsheetId: cdbSheetId(), range: `'${CDB_TAB[k]}'!A${r.srow}:${CDB_LAST[k]}${r.srow}`, values: [arr] });
          else await cdbCall('append_values', { spreadsheetId: cdbSheetId(), range: `'${CDB_TAB[k]}'!A2:${CDB_LAST[k]}`, values: [arr] });
          r.dirty = false; sent++;
        }
        // read the tab back so every row knows its line in the sheet
        const p = await cdbCall('get_values', { spreadsheetId: cdbSheetId(), range: `'${CDB_TAB[k]}'!A3:${CDB_LAST[k]}` }), at = new Map(((p && p.values) || []).map((v, i) => [i + 3, v]));
        const pos = new Map(); at.forEach((v, n) => { const s = cdbFromSheet(k, v, n); if (s) pos.set(cdbRowKey(k, s), n); });
        // a row counts as sent only when the sheet now holds the same values (the live site's sheet reader may not be allowed to write yet)
        rows.forEach(r => { const n = pos.get(cdbRowKey(k, r)); if (n) r.srow = n; if (!n || cdbDiff(k, cdbFromSheet(k, at.get(n), n), r).length) { if (!r.dirty) sent--; r.dirty = true; failed++; } });
        await cdbSave(k, rows, 'ส่งขึ้นชีต', [], { synced_at: new Date().toISOString() });
      }
      B.busy = ''; if (failed) B.err = `ส่งขึ้นชีตไม่สำเร็จ ${failed} แถว (ชีตไม่รับการเขียน ต้องให้สิทธิ์แก้ไขชีตแก่ระบบก่อน) ข้อมูลยังอยู่ในเว็บ`; else B.done = `ส่งขึ้น Google Sheet แล้ว ${sent} แถว`;
    } catch (e) { B.busy = ''; B.err = (e && e.code === 'nomcp' ? 'มุมมองนี้ยังไม่ได้เชื่อม Google Sheets' : 'ส่งขึ้นชีตไม่สำเร็จ') + (sent ? ` (ส่งแล้ว ${sent} แถว ที่เหลือยังค้างอยู่ กดส่งอีกครั้ง)` : ''); }
    render();
  }
});
