// Booking notifications keep results per destination. A successful destination is never selected for retry.
function notifyOk() { return !!(window.__WEB && window.__WEB.notify); }
function notifyFields(a) {
  return [['br', 'สาขา'], ['sales', 'ชื่อเซลล์'], ['customer', 'ชื่อ-นามสกุลลูกค้า'], ['booking_date', 'วันที่จอง'], ['model', 'รุ่นรถที่จอง'], ['grade', 'เกรด'], ['color', 'สี'],
    ['purchase', 'เงื่อนไข'], ['insurance', 'ประกันภัย'], ['discount', 'ส่วนลด ระบุจำนวน ไม่มี ใส่ 0 บาท'], ['foc_total', 'FOC ที่ใช้ทั้งหมด'], ['note', 'หมายเหตุ'],
    ['source', 'แหล่งที่มาของการจอง'], ['lead_id', 'Lead ID จาก BOT (ถ้ามี)']].map(([k, t]) => [t, String(gformValue(k, a) ?? '')]);
}
function notifyResText(r) {
  if (!r) return '';
  const lab = { ok: 'ส่งแล้ว', error: 'ไม่สำเร็จ', off: 'ยังไม่ได้ตั้งค่า', unknown: 'รอตรวจผล' };
  return ` (กลุ่มผู้จัดการ ${lab[r.mgr] || 'รอส่ง'} · กลุ่มเซลล์ ${lab[r.sales] || 'รอส่ง'} · ชีต ${lab[r.sheet] || 'รอส่ง'}${r.drive && r.drive !== 'off' ? ` · รูปเข้า Drive ${lab[r.drive] || 'รอส่ง'}` : ''})`;
}
function notifyRequired(a) {
  const ready = window.__WEB?.notifyReady || {}, prev = a.rec.gform?.res || {};
  return ['mgr', 'sales', ...(ready.sheet || prev.sheet && prev.sheet !== 'off' ? ['sheet'] : []),
    ...(ready.drive && (a.rec.doc_imgs || []).length || prev.drive && prev.drive !== 'off' ? ['drive'] : [])];
}
function notifyPending(a) {
  const r = a.rec.gform?.res || {};
  return notifyRequired(a).filter(k => r[k] !== 'ok' && r[k] !== 'unknown');
}
function notifyComplete(a, res) { return notifyRequired(a).every(k => res[k] === 'ok'); }
function notifyBox(a, c) {
  const g = a.rec.gform || {}, r = g.res || {}, ready = window.__WEB?.notifyReady || {};
  const setup = ready.sales === false ? { sales: 'ยังไม่ได้ตั้งค่า ' + (ready.missingSales || ['TELEGRAM_SALES_BOT_TOKEN','TELEGRAM_SALES_CHAT_ID']).join(' / ') } : {};
  const details = { ...setup, ...(g.details || {}) }, pending = notifyPending(a);
  const can = canEditBooking(a) && perms().write, busy = S.notifyBusy?.[a.id];
  const complete = notifyComplete(a, r), unknown = notifyRequired(a).filter(k => r[k] === 'unknown');
  const label = { mgr: 'กลุ่มผู้จัดการ', sales: 'กลุ่มเซลล์', sheet: 'Google Sheet', drive: 'Google Drive' };
  const retryLabel = g.via === 'web' ? 'ส่งเฉพาะ ' + pending.map(k => label[k]).join(' / ') + ' ที่ค้าง' : 'ส่งจากเว็บเลย';
  return box(complete ? 'good' : 'warn', `<b>${complete ? 'ส่งครบทุกช่องทางแล้ว' : g.via === 'web' ? 'ใบจองนี้ยังส่งไม่ครบ' : 'ส่งใบจองเข้า Telegram และ Google Sheet'}</b>
    <div class="text-sm mt-1">${esc(notifyResText(r))}</div>
    ${Object.entries(details).filter(([k,v]) => v && r[k] !== 'ok').map(([k,v]) => `<div class="text-xs mt-1">${esc(label[k] || k)}: ${esc(v)}</div>`).join('')}
    ${unknown.length ? `<p class="text-xs mt-2">${unknown.map(k => label[k]).join(' / ')} ยังไม่ยืนยันผล ให้ตรวจข้อความหรือแถวเดิมก่อนส่งซ้ำ เพื่อไม่ให้เกิดรายการซ้ำ</p>` : ''}
    ${can && pending.length ? `<button class="btn btn-red btn-sm mt-2" data-act="bk-notify" data-id="${esc(a.id)}" ${busy ? 'disabled' : ''}>${busy ? '<span class="spin"></span> กำลังส่ง…' : esc(retryLabel)}</button>` : ''}
    ${can && g.via !== 'web' && c ? `<div class="mt-2"><a class="btn btn-ghost btn-sm" href="${esc(gformUrl(a))}" target="_blank" rel="noopener" data-gform="${esc(a.id)}">เปิด Google Form แบบเดิม</a><button class="btn btn-ghost btn-sm" data-act="gform-done" data-id="${esc(a.id)}">ส่งฟอร์มแล้ว</button></div>` : ''}`);
}
Object.assign(ACTIONS, {
  async 'bk-notify'(el) {
    const a = atById(el.dataset.id);
    if (!a || !notifyOk() || !canEditBooking(a) || !perms().write || S.notifyBusy?.[a.id]) return;
    const old = a.rec.gform || {};
    if (old.sent_at && old.via !== 'web') { toast('ใบจองนี้แจ้งว่าส่งผ่านฟอร์มแล้ว', 'bad'); return; }
    const channels = notifyPending(a);
    if (!channels.length) { toast('ไม่มีช่องทางที่ส่งซ้ำได้ ตรวจผลที่ยังไม่แน่นอนก่อน', 'bad'); return; }
    if (old.via !== 'web' && !(a.rec.doc_imgs || []).length && !confirm('ใบจองนี้ยังไม่มีรูปหน้าใบจอง ส่งต่อเลยไหม')) return;
    S.notifyBusy = { ...(S.notifyBusy || {}), [a.id]: true }; render();
    let res = { ...(old.res || {}) }, details = { ...(old.details || {}) };
    try {
      const f = notifyFields(a);
      const result = await window.__WEB.notify({ title: 'แบบฟอร์ม จอง เอทีฮอนด้า', fields: f, salesFields: f, channels,
        photos: [...(a.rec.doc_imgs || []), ...(a.rec.slip_imgs || [])], sheetId: gsCfg().id,
        sheetTab: (gsCfg().range || 'Booking!A2:U').split('!')[0], webId: a.id, photoNote: 'รูปอยู่ในเว็บ AT Honda',
        docImgs: a.rec.doc_imgs || [], driveName: `${a.rec.customer || 'ลูกค้า'} - ${a.rec.sales || ''} - เว็บ` });
      if (!result || result.code) throw new Error('unconfirmed');
      for (const k of channels) {
        if (res[k] === 'ok') continue;
        res[k] = ['ok','error','off','unknown'].includes(result[k]) ? result[k] : 'unknown';
        if (result.details?.[k]) details[k] = result.details[k]; else delete details[k];
      }
    } catch {
      for (const k of channels) if (res[k] !== 'ok') { res[k] = 'unknown'; details[k] = 'ยังไม่ได้รับผลยืนยันจากเซิร์ฟเวอร์ ให้ตรวจปลายทางก่อนส่งซ้ำ'; }
    }
    try {
      const complete = notifyComplete(a, res);
      const saved = await saveBk(a.id, 'ส่ง Telegram / ชีตจากเว็บ', notifyResText(res), x => {
        const existing = x.gform || {};
        if (existing.sent_at && existing.via !== 'web') return false;
        const merged = { ...(existing.res || {}), ...res };
        for (const k of Object.keys(existing.res || {})) if (existing.res[k] === 'ok') merged[k] = 'ok';
        x.gform = { ...existing, via: 'web', res: merged, details, sent_at: notifyComplete({ ...a, rec: x }, merged) ? existing.sent_at || new Date().toISOString() : null, attempted_at: new Date().toISOString(), ...actor() };
      });
      toast(saved ? (complete ? 'ส่งครบแล้ว' : 'ยังส่งไม่ครบ ตรวจผลแต่ละช่องทางในใบจอง') + notifyResText(res) : 'เก็บผลส่งไม่สำเร็จ ให้ตรวจปลายทางก่อนกดส่งใหม่', saved && complete ? 'good' : 'bad');
      return saved;
    } finally { S.notifyBusy[a.id] = false; render(); }
  }
});
