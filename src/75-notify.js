// ------------------------------------------------------------------ booking keyed on the website → Telegram + the form's sheet (ตกลง 13/10)
// Two ways, the sales picks: send from here in one press (Edge Function booking-notify: managers' group with photos,
// sales' group summary, one row in the response sheet), or open the pre-filled Google Form as before.
// Only on the AT Honda website; claude.ai keeps the Google Form way.
// Only function declarations here: the first render runs before this part of the file.
function notifyOk() { return !!(window.__WEB && window.__WEB.notifyReady); }
// the question titles of the Google Form (the same list the sales group's script sends)
function notifyFields(a) {
  return [['br', 'สาขา'], ['sales', 'ชื่อเซลล์'], ['customer', 'ชื่อ-นามสกุลลูกค้า'], ['booking_date', 'วันที่จอง'], ['model', 'รุ่นรถที่จอง'], ['grade', 'เกรด'], ['color', 'สี'],
    ['purchase', 'เงื่อนไข'], ['insurance', 'ประกันภัย'], ['discount', 'ส่วนลด ระบุจำนวน ไม่มี ใส่ 0 บาท'], ['foc_total', 'FOC ที่ใช้ทั้งหมด'], ['note', 'หมายเหตุ'],
    ['source', 'แหล่งที่มาของการจอง'], ['lead_id', 'Lead ID จาก BOT (ถ้ามี)']].map(([k, t]) => [t, String(gformValue(k, a) ?? '')]);
}
function notifyResText(r) {
  if (!r) return '';
  const lab = { ok: 'ส่งแล้ว', error: 'ไม่สำเร็จ', off: 'ยังไม่ได้ตั้งค่า' };
  return ` (กลุ่มผู้จัดการ ${lab[r.mgr] || '–'} · กลุ่มเซลล์ ${lab[r.sales] || '–'} · ชีต ${lab[r.sheet] || '–'}${r.drive && r.drive !== 'off' ? ` · รูปเข้า Drive ${lab[r.drive]}` : ''})`;
}
function notifyBox(a, c) {
  const can = canEditBooking(a) && perms().write, R = window.__WEB.notifyReady, busy = S.notifyBusy && S.notifyBusy[a.id];
  const parts = [R.mgr ? 'กลุ่มผู้จัดการ (พร้อมรูป)' : '', R.sales ? 'กลุ่มเซลล์' : '', R.sheet ? 'Google Sheet' : '', R.drive ? 'เก็บรูปเข้า Google Drive' : ''].filter(Boolean).join(' · ');
  const photos = (a.rec.doc_imgs || []).length;
  return box('warn', `<b>ส่งใบจองนี้เข้า Telegram และ Google Sheet</b>
    <div class="text-sm">เลือกได้ 2 แบบ: ส่งจากเว็บเลย (${esc(parts)}) หรือเปิด Google Form ที่กรอกให้แล้วแบบเดิม${photos ? '' : ' · <span style="color:var(--bad)">ใบจองนี้ยังไม่มีรูปหน้าใบจอง</span>'}</div>
    ${can ? `<div class="flex flex-wrap gap-2 mt-2"><button class="btn btn-red btn-sm" data-act="bk-notify" data-id="${esc(a.id)}" ${busy ? 'disabled' : ''}>${busy ? '<span class="spin"></span> กำลังส่ง…' : 'ส่งจากเว็บเลย'}</button>
      ${c ? `<a class="btn btn-ghost btn-sm" href="${esc(gformUrl(a))}" target="_blank" rel="noopener" data-gform="${esc(a.id)}">เปิด Google Form แบบเดิม</a>
      <button class="btn ${S.gformOpened && S.gformOpened[a.id] ? 'btn-dark' : 'btn-ghost'} btn-sm" data-act="gform-done" data-id="${esc(a.id)}">ส่งฟอร์มแล้ว</button>` : ''}</div>` : ''}`);
}
// parts of an earlier web send that did not go out but can now (e.g. the sales group was set up afterwards)
function notifyMissing(g) {
  const R = window.__WEB && window.__WEB.notifyReady;
  if (!R || !g || g.via !== 'web') return [];
  return ['mgr', 'sales', 'sheet'].filter(k => R[k] && (g.res || {})[k] !== 'ok');
}
function notifyMissingBtn(a) {
  const miss = notifyMissing(a.rec.gform);
  if (!miss.length || !canEditBooking(a) || !perms().write) return '';
  const lab = { mgr: 'กลุ่มผู้จัดการ', sales: 'กลุ่มเซลล์', sheet: 'Google Sheet' }, busy = S.notifyBusy && S.notifyBusy[a.id];
  return ` <button class="btn btn-ghost btn-sm ml-1" data-act="bk-notify" data-id="${esc(a.id)}" data-only="${miss.join(',')}" ${busy ? 'disabled' : ''}>${busy ? '<span class="spin"></span> กำลังส่ง…' : 'ส่งเพิ่ม: ' + esc(miss.map(k => lab[k]).join(' · '))}</button>`;
}
async function notifyRefresh(id) {
  try { if (DB) { const snap = await DB.collection('bookings').doc(id).get(); if (snap.exists) { S.bookings.set(id, snap.data()); S.dataV++; } } } catch (e) { /* the live update brings it anyway */ }
}
Object.assign(ACTIONS, {
  async 'bk-notify'(el) {
    const a = atById(el.dataset.id); if (!a || !notifyOk() || !canEditBooking(a)) return;
    const only = el.dataset.only ? el.dataset.only.split(',') : null;
    if (!only && a.rec.gform && a.rec.gform.sent_at) { toast('ใบจองนี้ส่งไปแล้ว', 'bad'); return; }
    if (!only && !(a.rec.doc_imgs || []).length && !(a.rec.doc_drive || []).length && !confirm('ใบจองนี้ยังไม่มีรูปหน้าใบจอง ส่งต่อเลยไหม')) return;
    S.notifyBusy = { ...(S.notifyBusy || {}), [a.id]: true }; render();
    let res = null;
    try {
      const f = notifyFields(a);
      res = await window.__WEB.notify({ title: 'แบบฟอร์ม จอง เอทีฮอนด้า', fields: f, salesFields: f, photos: [...(a.rec.doc_imgs || []), ...(a.rec.slip_imgs || [])],
        sheetId: gsCfg().id, sheetTab: (gsCfg().range || 'Booking!A2:U').split('!')[0], webId: a.id, photoNote: (a.rec.doc_drive || []).join(', ') || 'รูปอยู่ในเว็บ AT Honda',
        docImgs: a.rec.doc_imgs || [], driveName: `${a.rec.customer || 'ลูกค้า'} - ${a.rec.sales || ''} - เว็บ`, role: roleLabel(), only });
    } catch (e) { res = null; }
    S.notifyBusy[a.id] = false;
    if (res && res.code === 'already') { await notifyRefresh(a.id); toast('ใบจองนี้ส่งไปแล้ว', 'bad'); render(); return; }
    const parts = only || ['mgr', 'sales', 'sheet'];
    if (!res || !parts.some(k => res[k] === 'ok')) { toast(only ? 'ส่งเพิ่มไม่สำเร็จ ลองอีกครั้ง' : 'ส่งไม่สำเร็จ ลองอีกครั้ง หรือใช้ Google Form แบบเดิม', 'bad'); render(); return; }
    const bad = parts.some(k => res[k] === 'error');
    if (res.recorded) { await notifyRefresh(a.id); toast(`ส่งแล้ว${notifyResText(res)}`, bad ? 'bad' : 'good'); render(); return true; }
    // an older server that does not record the send itself
    const r = await saveBk(a.id, 'ส่ง Telegram / ชีตจากเว็บ', '', x => { x.gform = { ...(x.gform || {}), sent_at: (x.gform && x.gform.sent_at) || new Date().toISOString(), via: 'web', res: { ...((x.gform && x.gform.res) || {}), ...res }, ...actor() }; }, x => !!only || !(x.gform && x.gform.sent_at));
    toast(`ส่งแล้ว${notifyResText(res)}`, bad ? 'bad' : 'good');
    render(); return r;
  }
});
