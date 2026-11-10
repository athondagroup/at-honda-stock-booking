// ------------------------------------------------------------------ Google Sheet: take only what was edited in the sheet (ตกลง 11/11)
// "ดึงเฉพาะที่แก้ในชีต" reads the stock tabs (PSC ATE SPH KPA) and the quota tabs, and compares only the cells people type in the
// sheet: on a car the booking no. / the name typed there / the customer / the allocation date; on a quota slot the VIN and the name
// typed there. Changed cells go into what is stored; nothing else changes (no car added or dropped). Then the typed names become
// locks by the same rules as before; a name cleared in the sheet lets go of the lock that came from it.
// Only function declarations / ACTIONS here: the first render runs before this part of the file.
const GSE_STOCK = ['bkno', 'bknote', 'cust', 'alloc', 'bkdate'], GSE_QUOTA = ['vin', 'vnote'];
const GSE_T = { bkno: 'เลขที่ใบจอง', bknote: 'ข้อความในช่องใบจอง', cust: 'ชื่อลูกค้า', alloc: 'วันที่จัดสรร', bkdate: 'วันที่ใบสั่งจอง', vin: 'VIN', vnote: 'ข้อความในชีต' };
const gseN = v => String(v ?? '').replace(/\s+/g, ' ').trim();
async function gseRun() {
  if (!perms().upload || !perms().write) return;
  const G = S.idsGs || {}, id = idsGsIdOf(G.link) || idsGsId();
  S.idsGs = { ...G, busy: 'กำลังอ่านเฉพาะช่องที่แก้ในชีต…', err: null, done: null, edits: null }; render();
  const mcp = await gsUse();
  if (!mcp) { S.idsGs = { ...S.idsGs, busy: null, err: 'มุมมองนี้อ่าน Google Sheet ไม่ได้' }; render(); return; }
  try {
    const meta = idsGsPayload(await mcp.callTool('Google Sheets', 'get_spreadsheet', { spreadsheetId: id, fields: ['sheets.properties.title'] }, { cache: false }));
    const titles = ((meta && meta.sheets) || []).map(s => s.properties && s.properties.title).filter(Boolean);
    const tabs = titles.filter(t => /^(PSC|ATE|SPH|KPA)$/.test(t.trim()) || /^\d{1,2}\.\d{4}\s+(PSC|ATE|SPH|KPA)$/.test(t.trim()));
    const edits = [], texts = new Map(); let n = 0, newCars = 0;
    // a quota slot with the frame number of a stock car is the same car: one unit, not a duplicate (11/11)
    const seen = (t, br, unit, vin) => { const k = sheetNorm(t); if (!k || !t.includes('/')) return; const L = texts.get(k) || texts.set(k, []).get(k); const id = vin || unit; if (!L.some(u => u.id === id)) L.push({ br, unit, id }); };
    const sheetStock = new Map(), qNames = [];
    for (const t of tabs) {
      const p = idsGsPayload(await mcp.callTool('Google Sheets', 'get_values', { spreadsheetId: id, range: `'${t.replace(/'/g, "''")}'!A1:BZ` }, { cache: false }));
      const r = p && p.values && p.values.length ? IDS.parseSheet(p.values, t, 'Google Sheet') : null;
      S.idsGs = { ...S.idsGs, busy: `อ่านแล้ว ${++n} จาก ${tabs.length} แท็บ` }; render();
      if (!r || r.error || !r.br) continue;
      if (r.src === 'stock') {
        const docId = idsDocId('stock', r.br), old = new Map(unpack(S.ids.get(docId)).map(x => [x.vin, x]));
        for (const x of r.rows) {
          sheetStock.set(x.vin, { br: r.br, x }); if (x.bknote) seen(x.bknote, r.br, x.vin, x.vin);
          const o = old.get(x.vin); if (!o) { newCars++; continue; }
          const ch = GSE_STOCK.filter(f => gseN(x[f]) !== gseN(o[f])).map(f => ({ f, from: o[f] ?? null, to: x[f] ?? null }));
          if (ch.length) edits.push({ src: 'stock', docId, br: r.br, key: x.vin, ch });
        }
      } else if (r.src === 'quota') {
        for (const m of r.months || []) {
          const docId = idsDocId('quota', r.br, m), old = new Map(unpack(S.ids.get(docId)).map(x => [x.ref, x]));
          for (const x of r.rows.filter(y => y.m === m)) {
            if (x.vnote) { seen(x.vnote, r.br, 'Quota ' + x.ref, x.vin || null); if (x.vin) qNames.push({ br: r.br, ref: x.ref, vin: x.vin, text: x.vnote }); }
            const o = old.get(x.ref); if (!o) continue;
            const ch = GSE_QUOTA.filter(f => gseN(x[f]) !== gseN(o[f])).map(f => ({ f, from: o[f] ?? null, to: x[f] ?? null }));
            if (ch.length) edits.push({ src: 'quota', docId, br: r.br, key: x.ref, ch });
          }
        }
      }
    }
    // the same name typed on two cars / quota slots: shown on the row, and the manager of the seller's branch is told after saving
    edits.forEach(e => { e.on = true; const c = e.ch.find(c => c.f === 'bknote' || c.f === 'vnote'); const k = c && c.to ? sheetNorm(c.to) : ''; const me = e.src === 'quota' ? 'Quota ' + e.key : e.key;
      const myId = e.src === 'quota' ? ((e.ch.find(c => c.f === 'vin') || {}).to || (unpack(S.ids.get(e.docId)).find(x => x.ref === e.key) || {}).vin || me) : e.key;
      e.dup = k && texts.has(k) ? texts.get(k).filter(u => u.id !== myId && u.unit !== me) : []; });
    // a name on a quota slot whose car is already in stock, the stock row still empty (lock forgotten): match it to the car
    for (const q of qNames) {
      const st = sheetStock.get(q.vin); if (!st) continue;
      if (gseN(st.x.bkno) || (gseN(st.x.bknote) && sheetNorm(st.x.bknote) !== sheetNorm(q.text))) { if (!gseN(st.x.bkno) && gseN(st.x.bknote)) edits.push({ src: 'warn', br: st.br, key: q.vin, ch: [{ f: 'bknote', from: st.x.bknote, to: q.text }], note: `Quota ${q.ref} มีชื่อ "${q.text}" แต่แถว Stock มี "${st.x.bknote}" ผู้จัดการตัดสิน`, on: false }); continue; }
      if (gseN(st.x.bknote)) continue;   // both sheets already hold it
      edits.push({ src: 'match', docId: idsDocId('stock', st.br), br: st.br, key: q.vin, ref: q.ref, text: q.text, ch: [{ f: 'bknote', from: null, to: q.text }], on: true, dup: [] });
    }
    S.idsGs = { ...S.idsGs, busy: null, edits, newCars, done: edits.length ? null : `ไม่มีช่องที่แก้ในชีต (การจัดสรร / ล็อกคิว ตรงกับเว็บแล้ว)${newCars ? ` · มีรถในชีตที่ยังไม่อยู่ในเว็บ ${newCars} คัน (ใช้ "ดึงจาก Google Sheet" แบบเต็ม)` : ''}` };
    render();
  } catch (e) { S.idsGs = { ...S.idsGs, busy: null, err: `อ่านชีตไม่ได้${e && e.status ? ` (Google ตอบ ${e.status})` : ''}` }; render(); }
}
function gseBox() {
  const G = S.idsGs || {}, E = G.edits; if (!E || !E.length) return '';
  const v = x => x === null || x === '' ? '<span class="text-muted">(ว่าง)</span>' : esc(String(x));
  return `<div class="mt-3 p-3 rounded-lg" style="background:var(--surface-2)"><b>ช่องที่แก้ในชีต ${E.length} รายการ</b> <span class="text-sm text-muted">บันทึกแล้วเปลี่ยนเฉพาะช่องเหล่านี้ · ข้อความที่พิมพ์กลายเป็นล็อกตามกติกาเดิม · ช่องที่ถูกลบ ปล่อยล็อกที่มาจากข้อความนั้น</span>
    <div class="scroll-x mt-2 max-h-80 overflow-auto"><table class="tbl text-sm"><thead><tr><th><input type="checkbox" data-gseall="1" ${E.every(e => e.on) ? 'checked' : ''} aria-label="เลือกทั้งหมด"></th><th>สาขา</th><th>รถ / Quota</th><th>ช่อง</th><th>ในเว็บ</th><th>ในชีตตอนนี้</th></tr></thead><tbody>
    ${E.flatMap((e, ei) => e.ch.map((c, ci) => `<tr${e.on ? '' : ' style="opacity:.5"'}><td>${ci || e.src === 'warn' ? '' : `<input type="checkbox" data-gse="${ei}" ${e.on ? 'checked' : ''} aria-label="นำเข้า">`}</td><td>${esc(e.br)}</td><td class="code nowrap">${esc(e.src === 'quota' ? 'Quota ' + e.key : e.key)}${e.src === 'match' ? `<div class="text-xs" style="color:var(--good);font-family:inherit">match จาก Quota ${esc(e.ref)} → Stock · ล็อกที่รถทันที</div>` : e.src === 'warn' ? `<div class="text-xs" style="color:var(--bad);font-family:inherit">${esc(e.note)}</div>` : ''}</td><td class="nowrap">${GSE_T[c.f] || c.f}</td><td>${v(c.from)}</td><td><b>${v(c.to)}</b>${(c.f === 'bknote' || c.f === 'vnote') && e.dup && e.dup.length ? `<div class="text-xs" style="color:var(--bad)">ชื่อซ้ำกับ ${e.dup.map(u => esc(u.br + ' ' + u.unit)).join(', ')}</div>` : ''}</td></tr>`)).join('')}</tbody></table></div>
    ${G.newCars ? `<p class="text-xs text-muted mt-1">มีรถในชีตที่ยังไม่อยู่ในเว็บ ${G.newCars} คัน ไม่ได้เพิ่ม (ใช้ "ดึงจาก Google Sheet" แบบเต็ม)</p>` : ''}
    <div class="flex gap-2 mt-2"><button class="btn btn-red btn-sm" data-act="gse-save" ${G.saving ? 'disabled' : ''}>${G.saving ? '<span class="spin"></span> กำลังบันทึก…' : `นำเข้า ${E.filter(e => e.on && e.src !== 'warn').length} รายการที่เลือก`}</button><button class="btn btn-ghost btn-sm" data-act="gse-cancel">ยกเลิก</button></div></div>`;
}
async function gseSave() {
  const G = S.idsGs || {}, all = (G.edits || []).filter(e => e.on && e.src !== 'warn'), E = all.filter(e => e.src !== 'match'), M = all.filter(e => e.src === 'match'); if (!all.length || !perms().write) return;
  S.idsGs = { ...G, saving: true }; render();
  const byDoc = new Map(); [...E, ...M].forEach(e => (byDoc.get(e.docId) || byDoc.set(e.docId, []).get(e.docId)).push(e));
  const cleared = [];
  for (const [docId, es] of byDoc) {
    const doc = S.ids.get(docId); if (!doc) continue;
    const src = es[0].src === 'match' ? 'stock' : es[0].src, key = src === 'stock' ? 'vin' : 'ref', rows = unpack(doc), m = new Map(es.map(e => [e.key, e]));
    const out = rows.map(x => { const e = m.get(x[key]); if (!e) return x; const y = { ...x }; e.ch.forEach(c => { y[c.f] = c.to; if ((c.f === 'bknote' || c.f === 'vnote') && gseN(c.from)) cleared.push({ vin: src === 'stock' ? x.vin : null, ref: src === 'quota' ? x.ref : null, text: c.from }); }); return y; });
    if (!await write('ids', docId, { ...doc, ...pack(src, out), n: out.length, edited: { ...actor(), n: es.length, from: 'Google Sheet' } })) { S.idsGs = { ...S.idsGs, saving: false }; render(); return; }
  }
  await write('uploads', newId('uploads'), { src: 'sheetedit', br: null, m: null, asof: todayISO(), file: 'Google Sheet', sheet: 'เฉพาะที่แก้ในชีต', n: E.length, out: [], inN: 0, mode: 'edits', changes: E.slice(0, 200), ...actor() });
  // a name cleared or changed in the sheet lets go of the lock that came from it (a changed name then becomes a new lock request)
  let rel = 0;
  for (const c of cleared) {
    for (const [lid, l] of S.locks) {
      if (!['pending', 'approved'].includes(l.status) || gseN(l.sheet_text) !== gseN(c.text) || !((c.vin && l.vin === c.vin) || (c.ref && !l.vin && l.ref === c.ref))) continue;
      const now = new Date().toISOString();
      await saveLock(lid, { ...l, status: l.status === 'pending' ? 'withdrawn' : 'released', rel: { at: now, by: roleLabel(), self: false, reason: 'ลบ / แก้ข้อความในชีต' }, sheet_cleared: now, notices: [...(l.notices || []), { k: 'rel', at: now, by: S.me.id || null, role: 'แก้จากชีต' }] }, 'ปล่อยล็อก (ลบ / แก้ในชีต)', `"${c.text}"`); rel++;
    }
  }
  // the matched quota names lock their car at once (11/11): a lock already made for the quota slot moves to the car, else a new one
  let mt = 0;
  for (const e of M) {
    const D = derive(), c = D.cars.get(e.key); if (!c) continue;
    const ql = [...S.locks.entries()].find(([, l]) => !l.vin && l.ref === e.ref && ['pending', 'approved', 'allocated'].includes(l.status));
    if (ql) { if (await saveLock(ql[0], { ...ql[1], vin: c.vin, car_br: c.br, sheet_text: e.text }, 'ย้ายล็อกจาก Quota มาที่รถ (match จากชีต)', `Quota ${e.ref} → ${c.vin}`)) { mt++; ltSheet(ql[0], e.text, ''); } continue; }
    const f = sheetLockFields({ vin: c.vin, ref: c.ref || null, br: c.br, spec: c.spec, text: e.text }, D), now = new Date().toISOString(), days = LOCK_DAYS_BY[f.type] || 15;
    const l = { ...f, reason: 'match จาก Quota ในชีต', status: 'approved', start: todayISO(), end: addDays(todayISO(), days), approved_at: now, requested_at: now, requested_by: S.me.id || null, requested_role: roleLabel(), ext: 0, history: [], convert_from: null, notices: [{ k: 'new', at: now, by: S.me.id || null, role: 'match จากชีต' }] };
    const id = newId('locks'); if (await saveLock(id, l, 'ล็อก (match จาก Quota ในชีต)', `"${e.text}" · หมด ${fmtD(l.end)}`)) { mt++; if (l.type !== 'temp') await settleUnit(derive(), l, id); ltSheet(id, e.text, ''); }
  }
  const sh = await syncSheetLocks();
  S.idsGs = { ...S.idsGs, saving: false, edits: null, done: `บันทึกช่องที่แก้ในชีตแล้ว ${all.length} รายการ${mt ? ` · ล็อกรถจาก Quota ${mt} คัน` : ''}${sh.made ? ` · คำขอล็อกใหม่ ${sh.made}` : ''}${sh.updated ? ` · อัปเดตคำขอ ${sh.updated}` : ''}${rel ? ` · ปล่อยล็อกที่ลบ / แก้ในชีต ${rel}` : ''}` };
  render();
}
Object.assign(ACTIONS, {
  'gse-run'() { gseRun(); },
  'gse-save'() { gseSave(); },
  'gse-cancel'() { S.idsGs = { ...(S.idsGs || {}), edits: null }; render(); }
});

document.addEventListener('change', ev => {
  const t = ev.target, G = S.idsGs; if (!t || !t.dataset || !G || !G.edits) return;
  if (t.dataset.gse !== undefined) { const e = G.edits[Number(t.dataset.gse)]; if (e) e.on = t.checked; render(); }
  if (t.dataset.gseall) { G.edits.forEach(e => { e.on = t.checked; }); render(); }
});
