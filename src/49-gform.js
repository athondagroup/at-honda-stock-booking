// ---------- trial period: a booking saved here opens the existing Google Form already filled in. The sales attaches the
// booking photo there and presses submit, so the form's Telegram messages, reports and archive keep running as before.
// The form's field ids come from a pre-filled link pasted once (stored in ref/gform).
const GF_FIELDS = [['br', 'สาขา'], ['sales', 'ชื่อเซลล์'], ['customer', 'ชื่อ-นามสกุลลูกค้า'], ['model', 'รุ่นรถที่จอง'], ['grade', 'เกรด'], ['color', 'สี'],
  ['purchase', 'เงื่อนไข'], ['insurance', 'ประกันภัย'], ['discount', 'ส่วนลด'], ['foc_total', 'FOC ที่ใช้ทั้งหมด'], ['note', 'หมายเหตุ'], ['booking_date', 'วันที่จอง'],
  ['source', 'แหล่งที่มาของการจอง'], ['lead_id', 'Lead ID จาก BOT'], ['web_id', 'รหัสใบจองเว็บ (ถ้าเพิ่มคำถามนี้ในฟอร์ม)']];
const GF_LEAD_ENTRY = 'entry.56565845';   // already used by the Lead BOT's pre-filled links
// the form's own wording for choices that the web names differently
const GF_MODEL = { 'HR-V e:HEV': 'HRV e:HEV', 'CR-V e:HEV': 'CRV e:HEV', 'STEP WGN e:HEV': 'STEP WGN' };
const GF_INSURANCE = { 'Honda แถม': 'ฮอนด้าแถม', 'AT แถม': 'เอที แถม', 'ไฟแนนซ์แถม': 'ไฟแนนซ์แถม' };
const GF_SOURCE = { 'Walk-in': 'Walk-in', 'ลูกค้าแนะนำ': 'ลูกค้าแนะนำ', 'Online ตัวเอง': 'Online – เซลล์หาเอง', 'Call': 'Call', 'ลูกค้าเก่า/Service': 'ลูกค้าเก่า' };
// the form lists some sales with their nickname in brackets; the pre-filled value has to be the form's exact wording
const GF_SALES = { 'คณิต จุ้ยทอง': 'คณิต จุ้ยทอง (ซิก)', 'ทัตพร น้อยอำแพง': 'ทัตพร น้อยอำแพง (หนึ่ง)', 'ปัณชญา ชนะพาล': 'ปัณชญา ชนะพาล (แบม)', 'นราวิชญ์ อุดมผล': 'นราวิชญ์ อุดมผล (เน็สท์)', 'ธีธัช ธนาวุฒิ': 'ธีธัช ธนาวุฒิ (อ๊อฟ)' };
const gformCfg = () => { const d = S.ref.get('gform'); return d && d.base && d.map ? d : null; };
// guess which pre-filled value belongs to which question; the person checks the guess before saving
function gformParse(link) {
  let u;
  try { u = new URL(String(link || '').trim()); } catch (e) { return { error: 'ลิงก์ไม่ถูกต้อง' }; }
  if (!/docs\.google\.com$/.test(u.hostname) || !/\/forms\//.test(u.pathname)) return { error: 'ต้องเป็นลิงก์ Google Form' };
  const base = u.origin + u.pathname.replace(/\/(formResponse|viewform)?$/, '') + '/viewform';
  const entries = [...u.searchParams.entries()].filter(([k]) => /^entry\.\d+$/.test(k)).map(([k, v]) => ({ entry: k, sample: v }));
  if (!entries.length) return { error: 'ลิงก์นี้ไม่มีค่าที่กรอกไว้ล่วงหน้า ใช้เมนู ⋮ → "รับลิงก์ที่กรอกไว้ล่วงหน้า" ในฟอร์ม' };
  const used = new Set(), guess = {};
  const take = (field, test) => { if (guess[field]) return; const e = entries.find(x => !used.has(x.entry) && test(x.sample, x.entry)); if (e) { guess[field] = e.entry; used.add(e.entry); } };
  const brNames = BRS.map(b => BR[b].name), models = new Set([...Object.keys(CATALOG), ...Object.values(GF_MODEL)]);
  take('lead_id', (v, k) => k === GF_LEAD_ENTRY);
  take('br', v => brNames.includes(v));
  take('sales', v => salesNames(true).includes(v) || Object.values(GF_SALES).includes(v) || /\S+ \S+ \(.+\)$/.test(v));
  take('model', v => models.has(v));
  take('purchase', v => v === 'ไฟแนนซ์' || v === 'ซื้อสด');
  take('insurance', v => Object.values(GF_INSURANCE).includes(v));
  take('source', v => Object.values(GF_SOURCE).includes(v) || /Lead Bot|Online|Facebook|Telegram/.test(v));
  take('booking_date', v => /^\d{4}-\d{2}-\d{2}$/.test(v));
  take('color', v => /^[A-Z]{3}$/.test(v));
  take('grade', v => /^(RS|SV|V|E|S|EL\+?|ES|RS 4WD|S\+|HuNT)$/.test(v));
  take('discount', v => /discount|ส่วนลด/i.test(v));
  take('note', v => /หมายเหตุ|หมายเหต|note/i.test(v));
  take('discount', v => /^\d[\d,]*$/.test(v));
  take('foc_total', v => /^\d[\d,]*$/.test(v));
  take('web_id', v => /^web$/i.test(v.trim()) || /รหัส/.test(v));
  take('customer', v => /name|ชื่อ/i.test(v));
  take('customer', () => true);
  take('note', () => true);
  return { base, entries: entries.map(x => ({ ...x, field: Object.keys(guess).find(f => guess[f] === x.entry) || '' })) };
}
function gformValue(field, a) {
  const r = a.rec;
  switch (field) {
    case 'br': return BR[r.br]?.name || '';
    case 'sales': return GF_SALES[r.sales] || r.sales || '';
    case 'customer': return r.customer || '';
    case 'model': return GF_MODEL[r.model] || r.model || '';
    case 'grade': return gradeShort(r.model, r.grade) || '';
    case 'color': return r.color || '';
    case 'purchase': return r.purchase || '';
    case 'insurance': return GF_INSURANCE[r.insurance] || '';
    case 'discount': return r.discount ?? '';
    case 'foc_total': return r.foc_total ?? '';
    case 'note': return [r.note, r.receipt_no ? `ใบเสร็จมัดจำ ${r.receipt_no}` : '', r.deposit ? `มัดจำ ${r.deposit}` : ''].filter(Boolean).join(' · ');
    case 'booking_date': return r.booking_date || '';
    case 'source': return GF_SOURCE[r.source] || r.source || '';
    case 'lead_id': return r.lead_id || '';
    case 'web_id': return a.id;
    default: return '';
  }
}
function gformUrl(a) {
  const c = gformCfg(); if (!c) return null;
  const q = new URLSearchParams({ usp: 'pp_url' });
  Object.entries(c.map).forEach(([field, entry]) => { const v = gformValue(field, a); if (entry && v !== '' && v !== null && v !== undefined) q.append(entry, String(v)); });
  return c.base + '?' + q.toString();
}
// shown at the top of a booking that was keyed on this page during the trial
const gformDue = a => !!((gformCfg() || notifyOk()) && !a.rec.imported && !a.cancelled && !(a.rec.gform && a.rec.gform.sent_at));
function gformBox(m, a) {
  if (a.rec.imported || a.cancelled) return '';
  const c = gformCfg(), sent = a.rec.gform && a.rec.gform.sent_at;
  if (sent) return `<div class="text-xs text-muted">${a.rec.gform.via === 'web' ? `ส่ง Telegram / ชีตจากเว็บแล้ว${notifyResText(a.rec.gform.res)}` : 'ส่งเข้า Google Form แล้ว'} ${fmtDT(a.rec.gform.sent_at)} · ${who(a.rec.gform)}</div>`;
  if (notifyOk()) return notifyBox(a, c);
  if (!c) return box('warn', `<b>ช่วงทดลอง: ส่งใบจองนี้เข้า Google Form ด้วย</b><div class="text-sm">ยังไม่ได้ตั้งค่าลิงก์ฟอร์ม ให้ผู้จัดการหรือแอดมินตั้งค่าที่หน้า "อัปเดตข้อมูล IDS" ก่อน</div>`);
  const can = canEditBooking(a) && perms().write;
  return box('warn', `<b>ช่วงทดลอง: ส่งใบจองนี้เข้า Google Form ด้วย</b>
    <div class="text-sm">เปิดฟอร์มที่กรอกข้อมูลให้แล้ว แนบรูป "หน้าใบจอง" แล้วกดส่งในฟอร์ม เพื่อให้ Telegram และรายงานเดิมทำงานเหมือนเดิม</div>
    ${can ? `<div class="flex flex-wrap gap-2 mt-2"><a class="btn btn-red btn-sm" href="${esc(gformUrl(a))}" target="_blank" rel="noopener" data-gform="${esc(a.id)}">เปิด Google Form ที่กรอกให้แล้ว</a>
      <button class="btn ${S.gformOpened && S.gformOpened[a.id] ? 'btn-dark' : 'btn-ghost'} btn-sm" data-act="gform-done" data-id="${esc(a.id)}">ส่งฟอร์มแล้ว</button></div>` : ''}`);
}
function gformSettings() {
  const c = gformCfg(), m = S.gform || {};
  const parsed = m.parsed;
  return `<section class="mb-5"><h2 class="font-head text-lg font-semibold mb-1">เชื่อม Google Form (ช่วงทดลอง)</h2>
    <p class="text-sm text-muted mb-2">ใบจองที่ลงในหน้านี้จะมีปุ่มเปิด Google Form เดิมที่กรอกข้อมูลให้แล้ว · ${c ? `ตั้งค่าแล้ว ${Object.keys(c.map).length} ช่อง เมื่อ ${fmtDT(c.at)} ${who(c)}` : '<span style="color:var(--warn)">ยังไม่ได้ตั้งค่า</span>'}</p>
    <div class="bg-surface border border-line rounded-lg p-4">
      <ol class="text-sm list-decimal pl-5 mb-3"><li>เปิดฟอร์มจองรถในโหมดแก้ไข กด ⋮ → "รับลิงก์ที่กรอกไว้ล่วงหน้า"</li><li>ใส่ค่าอะไรก็ได้ให้ครบทุกช่อง (เลือกตัวเลือกในช่องที่เป็นตัวเลือก) ช่อง "รหัสใบจองเว็บ" พิมพ์ WEB แล้วกด "รับลิงก์" → "คัดลอกลิงก์"</li><li>วางลิงก์ด้านล่าง ตรวจว่าแต่ละช่องตรงกับคำถามไหน แล้วกดบันทึก</li></ol>
      <div class="grid sm:grid-cols-[1fr_auto] gap-2 items-end"><div class="field"><label for="gf-link">ลิงก์ที่กรอกไว้ล่วงหน้า</label><input id="gf-link" data-gf="link" value="${esc(m.link || '')}" placeholder="https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.…"></div>
        <button class="btn btn-dark btn-sm" data-act="gform-parse">อ่านลิงก์</button></div>
      ${m.error ? `<p class="text-sm mt-2" style="color:var(--bad)">${esc(m.error)}</p>` : ''}
      ${parsed ? `<table class="tbl text-sm mt-3"><thead><tr><th>รหัสช่องในฟอร์ม</th><th>ค่าที่กรอกตัวอย่าง</th><th>ตรงกับข้อมูลใบจอง</th></tr></thead><tbody>
        ${parsed.entries.map((x, i) => `<tr><td class="code text-xs">${esc(x.entry)}</td><td>${esc(x.sample)}</td><td><select data-gf="field" data-i="${i}" aria-label="ช่องของ ${esc(x.entry)}"><option value="">ไม่ใช้</option>${GF_FIELDS.map(([k, t]) => `<option value="${k}" ${x.field === k ? 'selected' : ''}>${t}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>
        <div class="flex gap-2 mt-3"><button class="btn btn-red btn-sm" data-act="gform-save">บันทึกการตั้งค่า</button><span class="text-xs text-muted self-center">รูปหน้าใบจองแนบไว้ล่วงหน้าไม่ได้ เซลล์แนบเองในฟอร์ม</span></div>` : ''}
    </div></section>`;
}
function viewUpload(D) {
  // the Google Form box goes right under the page title
  const base = viewUploadBase(D), cut = base.indexOf('<section');
  const top = gsCan() ? gsBox(D) : '';
  return (cut > 0 ? base.slice(0, cut) + top + base.slice(cut) : top + base) + (perms().upload ? idsGsBox() + delivSyncBox(D) + sheetSyncBox(D) + gformSettings() : '');
}
