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
    const edits = []; let n = 0, newCars = 0;
    for (const t of tabs) {
      const p = idsGsPayload(await mcp.callTool('Google Sheets', 'get_values', { spreadsheetId: id, range: `'${t.replace(/'/g, "''")}'!A1:BZ` }, { cache: false }));
      const r = p && p.values && p.values.length ? IDS.parseSheet(p.values, t, 'Google Sheet') : null;
      S.idsGs = { ...S.idsGs, busy: `อ่านแล้ว ${++n} จาก ${tabs.length} แท็บ` }; render();
      if (!r || r.error || !r.br) continue;
      if (r.src === 'stock') {
        const docId = idsDocId('stock', r.br), old = new Map(unpack(S.ids.get(docId)).map(x => [x.vin, x]));
        for (const x of r.rows) {
          const o = old.get(x.vin); if (!o) { newCars++; continue; }
          const ch = GSE_STOCK.filter(f => gseN(x[f]) !== gseN(o[f])).map(f => ({ f, from: o[f] ?? null, to: x[f] ?? null }));
          if (ch.length) edits.push({ src: 'stock', docId, br: r.br, key: x.vin, ch });
        }
      } else if (r.src === 'quota') {
        for (const m of r.months || []) {
          const docId = idsDocId('quota', r.br, m), old = new Map(unpack(S.ids.get(docId)).map(x => [x.ref, x]));
          for (const x of r.rows.filter(y => y.m === m)) {
            const o = old.get(x.ref); if (!o) continue;
            const ch = GSE_QUOTA.filter(f => gseN(x[f]) !== gseN(o[f])).map(f => ({ f, from: o[f] ?? null, to: x[f] ?? null }));
            if (ch.length) edits.push({ src: 'quota', docId, br: r.br, key: x.ref, ch });
          }
        }
      }
    }
    S.idsGs = { ...S.idsGs, busy: null, edits, newCars, done: edits.length ? null : `ไม่มีช่องที่แก้ในชีต (การจัดสรร / ล็อกคิว ตรงกับเว็บแล้ว)${newCars ? ` · มีรถในชีตที่ยังไม่อยู่ในเว็บ ${newCars} คัน (ใช้ "ดึงจาก Google Sheet" แบบเต็ม)` : ''}` };
    render();
  } catch (e) { S.idsGs = { ...S.idsGs, busy: null, err: `อ่านชีตไม่ได้${e && e.status ? ` (Google ตอบ ${e.status})` : ''}` }; render(); }
}
function gseBox() {
  const G = S.idsGs || {}, E = G.edits; if (!E || !E.length) return '';
  const v = x => x === null || x === '' ? '<span class="text-muted">(ว่าง)</span>' : esc(String(x));
  return `<div class="mt-3 p-3 rounded-lg" style="background:var(--surface-2)"><b>ช่องที่แก้ในชีต ${E.length} รายการ</b> <span class="text-sm text-muted">บันทึกแล้วเปลี่ยนเฉพาะช่องเหล่านี้ · ข้อความที่พิมพ์กลายเป็นล็อกตามกติกาเดิม · ช่องที่ถูกลบ ปล่อยล็อกที่มาจากข้อความนั้น</span>
    <div class="scroll-x mt-2 max-h-80 overflow-auto"><table class="tbl text-sm"><thead><tr><th>สาขา</th><th>รถ / Quota</th><th>ช่อง</th><th>ในเว็บ</th><th>ในชีตตอนนี้</th></tr></thead><tbody>
    ${E.flatMap(e => e.ch.map(c => `<tr><td>${esc(e.br)}</td><td class="code nowrap">${esc(e.src === 'quota' ? 'Quota ' + e.key : e.key)}</td><td class="nowrap">${GSE_T[c.f] || c.f}</td><td>${v(c.from)}</td><td><b>${v(c.to)}</b></td></tr>`)).join('')}</tbody></table></div>
    ${G.newCars ? `<p class="text-xs text-muted mt-1">มีรถในชีตที่ยังไม่อยู่ในเว็บ ${G.newCars} คัน ไม่ได้เพิ่ม (ใช้ "ดึงจาก Google Sheet" แบบเต็ม)</p>` : ''}
    <div class="flex gap-2 mt-2"><button class="btn btn-red btn-sm" data-act="gse-save" ${G.saving ? 'disabled' : ''}>${G.saving ? '<span class="spin"></span> กำลังบันทึก…' : `บันทึก ${E.length} รายการ`}</button><button class="btn btn-ghost btn-sm" data-act="gse-cancel">ยกเลิก</button></div></div>`;
}
async function gseSave() {
  const G = S.idsGs || {}, E = G.edits; if (!E || !E.length || !perms().write) return;
  S.idsGs = { ...G, saving: true }; render();
  const byDoc = new Map(); E.forEach(e => (byDoc.get(e.docId) || byDoc.set(e.docId, []).get(e.docId)).push(e));
  const cleared = [];
  for (const [docId, es] of byDoc) {
    const doc = S.ids.get(docId); if (!doc) continue;
    const src = es[0].src, key = src === 'stock' ? 'vin' : 'ref', rows = unpack(doc), m = new Map(es.map(e => [e.key, e]));
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
  const sh = await syncSheetLocks();
  S.idsGs = { ...S.idsGs, saving: false, edits: null, done: `บันทึกช่องที่แก้ในชีตแล้ว ${E.length} รายการ${sh.made ? ` · คำขอล็อกใหม่ ${sh.made}` : ''}${sh.updated ? ` · อัปเดตคำขอ ${sh.updated}` : ''}${rel ? ` · ปล่อยล็อกที่ลบ / แก้ในชีต ${rel}` : ''}` };
  render();
}
Object.assign(ACTIONS, {
  'gse-run'() { gseRun(); },
  'gse-save'() { gseSave(); },
  'gse-cancel'() { S.idsGs = { ...(S.idsGs || {}), edits: null }; render(); }
});
