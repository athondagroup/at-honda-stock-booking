// ------------------------------------------------------------------ new bookings from the Google Form's sheet (ตกลง 13/10: แบบ ก)
// The page reads the form's response sheet through the viewer's own Google Sheets connector (no tokens here):
// once after opening, for people who can import (admin, managers, executive), and again on the button.
// New rows are listed; nothing is written until someone presses "นำเข้า". A row is new when its booking photo id
// (the same id the earlier import used) is not in the system, and it was not sent from this page (web booking id).
// Only function declarations here: the first render runs before this part of the file.
function gsCfg() { const d = S.ref.get('gsheet') || {}; return { id: d.sheet_id || '1cMq1VlEf4htRhIp-oCKBFOEX1DiF6qM5no2Hi5jMdzs', range: d.range || 'Booking!A2:U' }; }
function gsCan() { return perms().write && (perms().upload || perms().approve); }
let gsMcp;
function gsUse() { if (gsMcp === undefined) gsMcp = (window.claude && typeof window.claude.use === 'function') ? window.claude.use('mcp').catch(() => null) : Promise.resolve(null); return gsMcp; }
// dd/mm/yyyy (Buddhist or Christian year) → yyyy-mm-dd ; "dd/mm/yyyy hh:mm:ss" (Bangkok) → ISO
function gsDate(s) { const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!m) return null; let y = Number(m[3]); if (y > 2400) y -= 543; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
function gsTs(s) { const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})/); if (!m) return null; let y = Number(m[3]); if (y > 2400) y -= 543; return new Date(Date.UTC(y, m[2] - 1, m[1], m[4] - 7, m[5], m[6])).toISOString(); }
function gsNum(s) { const t = String(s || '').replace(/[^\d.]/g, ''); return t ? Number(t) : null; }
function gsSales(raw) {
  const s = String(raw || '').replace(/\s*\(.*?\)\s*/g, ' ').trim(), nick = (S.ref.get('sales') || {}).nick || {};
  return nick[String(raw || '').trim()] || nick[s] || fitSales(s) || s;
}
function gsModel(raw, grade) {
  const inv = Object.fromEntries(Object.entries(GF_MODEL).map(([k, v]) => [norm(v), k]));
  let m = String(raw || '').trim(); m = inv[norm(m)] || m;
  const hy = /e:?HEV/i.test(m), g0 = String(grade || '').trim(), g = hy && g0 && !/^e:HEV/i.test(g0) ? 'e:HEV ' + g0 : g0;
  return { model: m, grade: g };
}
const GS_BR = { 'ภาษีเจริญ': 'PSC', 'เอกชัย-บางบอน': 'ATE', 'สามพราน': 'SPH', 'กำแพงแสน': 'KPA' };
function gsRow(r) {
  r = [...r]; while (r.length < 21) r.push('');
  const c = i => String(r[i] ?? '').trim();
  const m = c(15).match(/id=([A-Za-z0-9_\-]+)/); if (!m || !c(5)) return null;
  const tail = [c(19), c(20)], delivered = tail.some(x => /^DELIVERED/i.test(x)), cancelled = c(2) === 'ยกเลิก' || tail.includes('ยกเลิก');
  const webId = tail.find(x => x && !/^DELIVERED/i.test(x) && x !== 'ยกเลิก') || null;
  const demo = /ทดลองขับ|เทสไดร์/.test(c(6)) || c(2) === 'รถ Demon';
  const mg = gsModel(c(6), c(7)), fit = fitSpec({ model: mg.model, grade: mg.grade, color: c(8).slice(0, 3).toUpperCase(), text: `${c(6)} ${c(7)} ${c(8)}` });
  const sales = gsSales(c(4));
  return { id: 'F_' + m[1], webId, doc: {
    booking_no: null, booking_date: gsDate(c(14)) || gsDate(c(0)), br: GS_BR[c(3)] || null, sales, sales_raw: c(4) !== sales ? c(4) : null,
    customer: c(5), source: c(17) || null, model: fit.model || mg.model, grade: fit.grade || mg.grade, color: fit.color || c(8).slice(0, 3).toUpperCase(), model_text: `${c(6)} ${c(7)} ${c(8)}`,
    purchase: c(9) || null, finance: null, insurance: ({ 'ฮอนด้าแถม': 'Honda แถม', 'เอที แถม': 'AT แถม', 'ไฟแนนซ์แถม': 'ไฟแนนซ์แถม' })[c(10)] || c(10) || null,
    discount: gsNum(c(11)), foc_total: gsNum(c(12)), note: c(13) || null, lead_id: c(18) || null, doc_url: c(15), doc_imgs: [], slip_imgs: [], slip: false, deposit: null,
    demo, delivered_flag: delivered, status: cancelled ? 'cancelled' : 'active', imported: true,
    created_at: gsTs(c(0)) || new Date().toISOString(), created_by: S.me.id || null, created_role: 'นำเข้าจากฟอร์ม Google (ดึงจากหน้าเว็บ)', fin_status: null, delivery_date: null } };
}
async function gsCheck(manual) {
  if (!gsCan()) return;
  S.gs = { ...(S.gs || {}), busy: true, err: null }; render();
  const mcp = await gsUse();
  if (!mcp) { S.gs = { busy: false, err: 'unavailable' }; render(); return; }
  const cfg = gsCfg();
  try {
    const res = await mcp.callTool('Google Sheets', 'get_values', { spreadsheetId: cfg.id, range: cfg.range }, { cache: false });
    let p = res && res.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { /* keep text */ } }
    const vals = p && Array.isArray(p.values) ? p.values : null;
    if (!vals) { S.gs = { busy: false, err: 'shape', msg: 'อ่านข้อมูลจากชีตไม่ได้ (รูปแบบไม่ตรง)' }; render(); return; }
    const webIds = new Set(S.bookings.keys()), rows = [];
    let total = 0;
    S.gsSeenWeb = new Set();
    for (const r of vals) { const x = gsRow(r); if (!x) continue; total++; if (x.webId && webIds.has(x.webId)) S.gsSeenWeb.add(x.webId); if (S.bookings.has(x.id) || (x.webId && webIds.has(x.webId))) continue; rows.push(x); }
    rows.sort((a, b) => (b.doc.created_at || '').localeCompare(a.doc.created_at || ''));
    S.gs = { busy: false, at: new Date().toISOString(), total, rows, pick: Object.fromEntries(rows.map(x => [x.id, !x.doc.demo])) };
  } catch (e) {
    const code = e && e.code;
    S.gs = { busy: false, err: code || 'upstream_error', msg: e && e.message };
    if (manual && e && e.retryable) toast('Google Sheets ไม่ตอบ ลองอีกครั้งสักครู่', 'bad');
  }
  render();
}
// once after opening, when the data has arrived
function gsMaybe() {
  if (S.gsTried || !gsCan() || S.mode !== 'shared' || !S.bookings.size) return;
  S.gsTried = true; setTimeout(() => gsCheck(false), 1200);
}
function gsErrText(g) {
  return ({ unavailable: 'หน้านี้ใช้ Google Sheets ไม่ได้ในมุมมองนี้ เปิดจาก claude.ai และเชื่อม Google Sheets ไว้', server_not_connected: 'ยังไม่ได้เชื่อม Google Sheets กับ claude.ai: Settings → Connectors → เพิ่ม Google Sheets',
    needs_reauth: 'การเชื่อม Google Sheets หมดอายุ: เชื่อมใหม่ที่ claude.ai Settings → Connectors', not_in_manifest: 'ยังไม่ได้อนุญาตให้หน้านี้ใช้ Google Sheets (กดอนุญาตเมื่อมีหน้าต่างถาม หรือเปิดที่เมนูสิทธิ์ของหน้านี้)',
    not_granted: 'ยังไม่ได้อนุญาตให้หน้านี้ใช้ Google Sheets', blocked_by_policy: 'องค์กรไม่อนุญาตให้ใช้ Google Sheets จากหน้านี้', approval_required: 'ต้องกดอนุญาตก่อน กด "ตรวจใบจองใหม่" อีกครั้ง',
    tool_error: `Google Sheets ตอบว่าอ่านไม่ได้: ${g.msg || ''} (บัญชีที่เชื่อมต้องเปิดชีตฟอร์มจองได้)`, server_unavailable: 'Google Sheets ไม่ตอบชั่วคราว ลองอีกครั้ง', shape: g.msg })[g.err] || `ดึงข้อมูลไม่ได้ (${g.err})`;
}
// on the bookings page: full box when there is something to import or a problem, one line otherwise
function gsBookBox(D) {
  if (!gsCan()) return '';
  const g = S.gs || {};
  if ((g.rows && g.rows.length) || g.err) return gsBox(D);
  return `<div class="flex flex-wrap gap-2 items-center text-sm mb-3 text-muted">${g.busy ? '<span class="spin"></span> กำลังตรวจใบจองใหม่จาก Google Form…' : g.at ? `ใบจองใหม่จาก Google Form: ไม่มี (ตรวจล่าสุด ${fmtDT(g.at)})` : 'ใบจองใหม่จาก Google Form: ระบบตรวจให้เองเมื่อเปิดหน้า'}
    <button class="btn btn-ghost btn-sm" data-act="gs-check" ${g.busy ? 'disabled' : ''}>ตรวจอีกครั้ง</button></div>`;
}
function gsBox(D) {
  if (!gsCan()) return '';
  const g = S.gs || {};
  const rows = g.rows || [];
  return `<section class="mb-5"><h2 class="font-head text-lg font-semibold mb-1">ใบจองใหม่จาก Google Form</h2>
    <div class="bg-surface border border-line rounded-lg p-4">
      <div class="flex flex-wrap gap-3 items-center"><div class="flex-1 min-w-[220px] text-sm">${g.busy ? '<span class="spin"></span> กำลังอ่านชีตฟอร์มจอง…' : g.err ? `<span style="color:var(--bad)">${esc(gsErrText(g))}</span>` : g.at ? `อ่านชีตแล้ว ${fmtDT(g.at)} · ในชีต ${g.total} ใบ · <b>ใหม่ ${rows.length} ใบ</b>` : 'ระบบตรวจให้เองเมื่อเปิดหน้า หรือกดตรวจตอนนี้'}</div>
        <button class="btn btn-ghost btn-sm" data-act="gs-check" ${g.busy ? 'disabled' : ''}>ตรวจใบจองใหม่</button></div>
      ${rows.length ? `<div class="scroll-x mt-3"><table class="tbl text-sm"><thead><tr><th></th><th>ลงฟอร์มเมื่อ</th><th>ลูกค้า</th><th>เซลล์ / สาขา</th><th>รุ่น เกรด สี</th><th></th></tr></thead><tbody>
        ${rows.map(x => `<tr><td><input type="checkbox" class="w-5 h-5" data-gspick="${esc(x.id)}" ${g.pick && g.pick[x.id] ? 'checked' : ''} aria-label="เลือก ${esc(x.doc.customer)}"></td><td class="num nowrap">${fmtDT(x.doc.created_at)}</td><td>${esc(x.doc.customer)}${x.doc.status === 'cancelled' ? ' ' + chip('ยกเลิก', 'muted') : ''}${x.doc.demo ? ' ' + chip('รถทดลองขับ', 'muted') : ''}</td>
          <td class="nowrap">${esc(x.doc.sales || '')}${x.doc.sales_raw ? `<div class="text-xs text-muted">ในฟอร์ม: ${esc(x.doc.sales_raw)}</div>` : ''}<div class="text-xs text-muted">${esc(x.doc.br || '?')}</div></td>
          <td>${esc(x.doc.model)} ${esc(gradeShort(x.doc.model, x.doc.grade) || x.doc.grade || '')} ${esc(x.doc.color || '')}${CATALOG[x.doc.model] && (CATALOG[x.doc.model] || {})[x.doc.grade] ? '' : ` ${chip('รุ่น/เกรดไม่อยู่ในรายการ', 'warn')}`}</td>
          <td><a class="underline text-xs" href="${esc(x.doc.doc_url)}" target="_blank" rel="noopener">รูปใบจอง</a></td></tr>`).join('')}</tbody></table></div>
        <div class="flex gap-2 mt-3"><button class="btn btn-red btn-sm" data-act="gs-import" ${g.saving ? 'disabled' : ''}>${g.saving ? '<span class="spin"></span> กำลังนำเข้า…' : `นำเข้า ${rows.filter(x => g.pick && g.pick[x.id]).length} ใบ`}</button>
          <span class="text-xs text-muted self-center">นำเข้าแบบเดียวกับใบจองที่นำเข้าก่อนหน้า ระบบจับคู่กับ IDS และขึ้นคิวรอรถให้เอง</span></div>` : ''}
    </div></section>`;
}
Object.assign(ACTIONS, {
  'gs-check'() { gsCheck(true); },
  async 'gs-import'() {
    const g = S.gs; if (!g || !g.rows || g.saving || !gsCan()) return;
    const pick = g.rows.filter(x => g.pick && g.pick[x.id] && !S.bookings.has(x.id));
    if (!pick.length) { toast('เลือกใบจองที่จะนำเข้า', 'bad'); return; }
    g.saving = true; render();
    let n = 0;
    for (const x of pick) if (await write('bookings', x.id, { ...x.doc, log: [{ ...actor(), act: 'นำเข้าจากฟอร์ม Google', note: x.doc.sales_raw || '' }] })) n++;
    g.saving = false; g.rows = g.rows.filter(x => !S.bookings.has(x.id));
    toast(`นำเข้าแล้ว ${n} ใบ`); render();
  }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset || !t.dataset.gspick || !S.gs) return;
  S.gs.pick = { ...(S.gs.pick || {}), [t.dataset.gspick]: t.checked }; render();
});
