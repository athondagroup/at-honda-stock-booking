// ------------------------------------------------------------------ IDS data from a Google Sheet, as a backup to the Excel upload (ตกลง 14/10)
// The team's stock sheet keeps one tab per table per branch ("PSC" stock, "B PSC" booking, "10.2026 PSC" quota,
// "DL PSC" invoice). Every tab whose name has a branch code is read through the same reader as an Excel file
// (the reader knows the table by its headers and the branch from the data), then shows in the same list to check
// and save. Nothing is saved until someone presses บันทึก. Tabs without a branch code (summaries, DATA) are skipped.
// Web: through the Edge Function gsheet (the sheet is shared with the service account). claude.ai: the viewer's
// Google Sheets connector. Only function declarations here: the first render runs before this part of the file.
function idsGsId() { const d = S.ref.get('gsheet') || {}; return d.ids_sheet_id || '1pFTMyWnJLJdoeRsNEzENhguOePiYaX8_BsYIypHMMIY'; }
function idsGsIdOf(text) { const t = String(text || '').trim(), m = t.match(/\/d\/([A-Za-z0-9_-]{20,})/); return m ? m[1] : (/^[A-Za-z0-9_-]{20,}$/.test(t) ? t : null); }
function idsGsBox() {
  const G = S.idsGs || {}, can = perms().upload && perms().write, id = idsGsId();
  return `<section class="bg-surface border border-line rounded-lg p-4 md:p-5 mb-5"><h2 class="font-head text-lg font-semibold mb-1">ดึงข้อมูล IDS จาก Google Sheet (สำรอง)</h2>
    <p class="text-sm text-muted mb-3">ใช้แทนการอัปโหลดไฟล์ได้ ระบบอ่านทุกแท็บที่ชื่อมีรหัสสาขา (เช่น PSC, B PSC, 10.2026 PSC, DL PSC) รู้เองว่าเป็น Stock / Booking / Quota / Invoice จากหัวคอลัมน์ แล้วแสดงในรายการด้านบนให้ตรวจก่อนกดบันทึก${window.__WEB ? ' · ชีตต้องแชร์ให้อีเมล service account เดียวกับชีตคำตอบ Google Form (ผู้มีสิทธิ์อ่าน)' : ''}</p>
    <div class="flex flex-wrap gap-2 items-end">
      <div class="field grow" style="min-width:16rem"><label for="ids-gs">ลิงก์ Google Sheet</label><input id="ids-gs" data-idsgs="1" value="${esc(G.link ?? `https://docs.google.com/spreadsheets/d/${id}/edit`)}" ${can ? '' : 'disabled'}></div>
      <button class="btn btn-dark" data-act="ids-gs-run" ${can && !G.busy && !S.upl.busy ? '' : 'disabled'}>${G.busy ? '<span class="spin"></span> กำลังอ่าน…' : 'ดึงจาก Google Sheet'}</button></div>
    ${G.busy ? `<p class="text-sm mt-2" role="status">${esc(G.busy)}</p>` : ''}
    ${G.err ? `<p class="text-sm mt-2" style="color:var(--bad)">${esc(G.err)}</p>` : ''}
    ${G.done ? `<p class="text-sm mt-2" style="color:var(--good)">${esc(G.done)}</p>` : ''}</section>`;
}
function idsGsPayload(res) { let p = res && res.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = null; } } return p; }
async function idsGsRun() {
  if (!perms().upload || !perms().write) return;
  const G = S.idsGs || {}, id = idsGsIdOf(G.link) || idsGsId();
  S.idsGs = { ...G, busy: 'กำลังเปิดชีต…', err: null, done: null }; render();
  const mcp = await gsUse();
  if (!mcp) { S.idsGs = { ...S.idsGs, busy: null, err: 'มุมมองนี้อ่าน Google Sheet ไม่ได้ (ต้องเชื่อม Google Sheets) ใช้อัปโหลดไฟล์แทน' }; render(); return; }
  try {
    const meta = idsGsPayload(await mcp.callTool('Google Sheets', 'get_spreadsheet', { spreadsheetId: id, fields: ['sheets.properties.title'] }, { cache: false }));
    const titles = ((meta && meta.sheets) || []).map(s => s.properties && s.properties.title).filter(Boolean);
    if (!titles.length) throw new Error('notabs');
    const brOf = t => { const m = String(t).toUpperCase().match(/\b(PSC|ATE|SPH|KPA)\b/); return m ? m[1] : null; };
    const tabs = titles.filter(brOf);
    const results = []; let n = 0;
    // a few tabs at a time
    for (let i = 0; i < tabs.length; i += 4) {
      await Promise.all(tabs.slice(i, i + 4).map(async t => {
        const p = idsGsPayload(await mcp.callTool('Google Sheets', 'get_values', { spreadsheetId: id, range: `'${t.replace(/'/g, "''")}'!A1:BZ` }, { cache: false }));
        const rows = (p && p.values) || [];
        const r = rows.length ? IDS.parseSheet(rows, t, 'Google Sheet') : null;
        if (r) {
          if (r.br && brOf(t) && r.br !== brOf(t) && !r.error) r.warn.push(`ชื่อแท็บเป็นสาขา ${brOf(t)} แต่ข้อมูลเป็นสาขา ${r.br} ตรวจก่อนบันทึก`);
          r.order = titles.indexOf(t); results.push(r);
        }
        S.idsGs = { ...S.idsGs, busy: `อ่านแล้ว ${++n} จาก ${tabs.length} แท็บ` }; render();
      }));
    }
    results.sort((a, b) => a.order - b.order);
    if (!results.length) { S.idsGs = { ...S.idsGs, busy: null, err: 'ไม่พบตาราง Stock / Booking / Quota / Invoice-DL ในแท็บที่ชื่อมีรหัสสาขา' }; render(); return; }
    prepareUploads(results);
    S.upl.results = results;
    S.idsGs = { ...S.idsGs, busy: null, done: `อ่านได้ ${results.filter(r => !r.error).length} ตาราง จาก ${tabs.length} แท็บ ตรวจในรายการด้านบนแล้วกดบันทึก` };
    if (/^[A-Za-z0-9_-]{20,}$/.test(id) && id !== idsGsId() && perms().write) {
      const cur = S.ref.get('gsheet') || {};
      await write('ref', 'gsheet', { ...cur, ids_sheet_id: id, at: new Date().toISOString() });
    }
    render();
    const el = document.querySelector('[data-file="ids"]'); if (el) el.closest('section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    const code = e && e.code;
    S.idsGs = { ...S.idsGs, busy: null, err: code === 'not_granted' || code === 'permission_denied' ? 'ยังไม่ได้อนุญาตให้หน้านี้อ่าน Google Sheets' : 'อ่านชีตไม่ได้ ตรวจลิงก์ และว่าแชร์ชีตแล้ว (หรือใช้อัปโหลดไฟล์แทน)' };
    render();
  }
}
Object.assign(ACTIONS, { 'ids-gs-run'() { idsGsRun(); } });
document.addEventListener('input', ev => { const t = ev.target; if (t && t.dataset && t.dataset.idsgs) S.idsGs = { ...(S.idsGs || {}), link: t.value }; });
