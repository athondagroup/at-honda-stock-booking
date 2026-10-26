
// ---------- อัปเดตข้อมูลแคมเปญ (ขอ 26/10): its own page, like the IDS update
// Upload the campaign file (photo / Excel / CSV). The file is read to text, compared with the campaign each booking already
// chose, and shows ตรง / ไม่ตรง / ไม่พบ. Nothing is changed by itself: the person picks which campaign a booking uses.
const campUpCan = () => perms().write && (perms().upload || perms().approve);
function campUpRows(D) {
  const U = S.campUp || {}, out = [];
  for (const a of D.at) {
    const d = a.rec && a.rec.deal; if (!d || !d.at || a.cancelled) continue;
    const x = termsCtxAt(a, D), opts = campOptions(x).opts.filter(y => y.ok && y.value !== 'other');
    if (S.br && a.br !== S.br) continue;
    const found = U.text ? campMatchText(opts, U.text) : [], top = found[0];
    const mine = found.find(h => h.opt.value === d.campaign_id);
    const state = !U.text ? 'none' : !top ? 'miss' : (top.opt.value === d.campaign_id || (mine && mine.pct >= top.pct)) ? 'ok' : 'diff';
    out.push({ a, d, opts, found, top, state });
  }
  const ord = { diff: 0, miss: 1, ok: 2, none: 3 };
  return out.sort((p, q) => ord[p.state] - ord[q.state] || (p.a.br || '').localeCompare(q.a.br || ''));
}
function campUpRow(r) {
  const { a, d, opts, found, state } = r, U = S.campUp, pick = (U.pick || {})[a.id] || '';
  const can = dealAdmin(a) && !poLocked(a);
  const tone = state === 'ok' ? 'good' : state === 'diff' ? 'warn' : state === 'miss' ? 'bad' : 'muted';
  const label = state === 'ok' ? 'ตรง' : state === 'diff' ? 'ไม่ตรง' : state === 'miss' ? 'ไม่พบในไฟล์' : 'ยังไม่เทียบ';
  const sugg = found.filter(h => h.opt.value !== d.campaign_id);
  const act = !can ? `<span class="text-xs text-muted">${poLocked(a) ? 'ส่งมอบแล้ว แก้ไม่ได้' : 'แก้ได้เฉพาะแอดมิน/ผู้จัดการสาขา ' + esc(a.br)}</span>` : state === 'ok' ? '' : `<div class="flex flex-col gap-2">
      ${sugg.map(h => `<div class="flex flex-wrap items-center gap-2"><span class="text-sm flex-1 min-w-[180px]">${esc(campFull(h.opt))} ${chip(h.pct + '% ตรง', h.pct >= 80 ? 'good' : 'warn')}</span><button type="button" class="btn btn-dark btn-sm" data-act="campup-use" data-id="${esc(a.id)}" data-cid="${esc(h.opt.value)}">ใช้ตัวนี้</button></div>`).join('')}
      <div class="flex flex-wrap items-center gap-2"><select class="min-w-0 flex-1" data-campup-pick="${esc(a.id)}"><option value="">เลือกแคมเปญเอง…</option>${opts.map(y => `<option value="${esc(y.value)}" ${pick === y.value ? 'selected' : ''}>${esc(campFull(y))}</option>`).join('')}</select>
        <button type="button" class="btn btn-ghost btn-sm" data-act="campup-use" data-id="${esc(a.id)}" data-cid="${esc(pick)}" ${pick ? '' : 'disabled'}>ใช้ตัวที่เลือก</button></div></div>`;
  return `<div class="p-3 rounded-lg border border-line bg-surface flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2"><b>${esc(a.cust)}</b><span class="text-xs text-muted">${esc(a.br)} · ${esc(a.model)} ${esc(gradeShort(a.model, a.grade))} ${esc(a.color || '')}${a.rec.sales ? ' · ' + esc(a.rec.sales) : ''}</span><span class="ml-auto">${chip(label, tone)}</span></div>
    <div class="text-sm">แคมเปญที่เลือกไว้: <b>${esc(d.campaign || '–')}</b>${d.adm_file ? ` <span class="text-xs text-muted">(ไฟล์ ${esc(d.adm_file)})</span>` : ''}</div>
    ${act}</div>`;
}
function viewCampUp(D) {
  const U = S.campUp || (S.campUp = { text: '', file: '', busy: false, msg: '', pick: {} }), can = campUpCan();
  const rows = campUpRows(D), n = s => rows.filter(r => r.state === s).length;
  return `${pageHead('อัปเดตข้อมูลแคมเปญ', 'อัปโหลดไฟล์แคมเปญของ Honda (รูป, Excel หรือ CSV) ระบบเทียบกับแคมเปญที่เลือกไว้ในแต่ละใบจอง ถ้าไม่ตรงหรือไม่พบ กดเลือกเองว่าใบนั้นใช้แคมเปญอะไร')}
  <section class="bg-surface border border-line rounded-lg p-4 md:p-5 mb-5">
    <label class="drop relative ${can && !U.busy ? '' : 'opacity-50'}">
      <input type="file" accept="image/*,.xlsx,.xls,.csv,.txt" data-campup-file ${can && !U.busy ? '' : 'disabled'} class="absolute inset-0 opacity-0 cursor-pointer">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="color:var(--red)">${ICON.upload}</svg>
      <span class="font-medium">${U.busy ? '<span class="spin"></span> กำลังอ่านไฟล์…' : 'เลือกไฟล์แคมเปญ (รูป / .xlsx / .csv)'}</span>
      <span class="text-xs text-muted">${can ? 'อ่านในเครื่อง ไม่เก็บไฟล์ในระบบ · ระบบเทียบกับแคมเปญของเดือนที่ใบจองนั้นใช้' : 'เฉพาะแอดมินและผู้จัดการ'}</span>
    </label>
    ${U.msg ? `<p class="mt-3 text-sm" style="color:var(--bad)">${esc(U.msg)}</p>` : ''}
    ${U.text ? `<div class="mt-3 flex flex-wrap items-center gap-2 text-sm">ไฟล์ <b>${esc(U.file)}</b> ${chip('ตรง ' + n('ok'), 'good')}${chip('ไม่ตรง ' + n('diff'), 'warn')}${chip('ไม่พบ ' + n('miss'), 'bad')}<button class="btn btn-ghost btn-sm ml-auto" data-act="campup-clear">ล้างไฟล์</button></div>` : ''}
  </section>
  <h3 class="font-head font-semibold mb-2">ใบจองที่ลงเงื่อนไขการขายแล้ว (${rows.length})</h3>
  <div class="flex flex-col gap-2">${rows.map(campUpRow).join('') || emptyBox('ยังไม่มีใบจองที่ลงเงื่อนไขการขาย', 'ใบจองที่ผ่านขั้นไฟแนนซ์และลงเงื่อนไขแล้วจะขึ้นที่นี่')}</div>`;
}
async function campUpRead(file) {
  const U = S.campUp || (S.campUp = { pick: {} }); U.busy = true; U.msg = ''; render();
  try {
    let text = '';
    if (/^image\//.test(file.type)) {
      const res = await aiRead('This is a photo or screenshot of a Honda sales campaign sheet from a Honda dealer in Thailand. Transcribe every campaign line as plain text (interest rates, free insurance, support baht, conditions) exactly as written in Thai. Return JSON only: {"text":"all lines joined by newline"}', [await shrink(file)]);
      text = String(res && res.text || '');
    } else {
      const X = await loadXLSX(), wb = /\.(csv|txt)$/i.test(file.name) ? X.read(await file.text(), { type: 'string' }) : X.read(await file.arrayBuffer(), { type: 'array' });
      text = wb.SheetNames.map(n => X.utils.sheet_to_csv(wb.Sheets[n])).join(' ');
    }
    if (!text.trim()) U.msg = 'อ่านข้อความจากไฟล์ไม่ได้ ลองไฟล์อื่น';
    else { U.text = text; U.file = file.name; U.pick = {}; }
  } catch (e) { U.msg = 'อ่านไฟล์ไม่ได้ ลองไฟล์อื่น'; }
  U.busy = false; render();
}
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset) return;
  if (t.dataset.campupFile !== undefined) { const f = t.files && t.files[0]; t.value = ''; if (f) campUpRead(f); }
  else if (t.dataset.campupPick !== undefined) { const U = S.campUp; U.pick[t.dataset.campupPick] = t.value; render(); }
});
Object.assign(ACTIONS, {
  'campup-clear'() { S.campUp = { text: '', file: '', busy: false, msg: '', pick: {} }; render(); },
  async 'campup-use'(el) {
    const a = atById(el.dataset.id), cid = el.dataset.cid, U = S.campUp; if (!a || !cid) return;
    const D = derive(), d = a.rec.deal;
    if (!d || !dealAdmin(a) || poLocked(a)) { toast('แก้ไม่ได้', 'bad'); return; }
    const x = termsCtxAt(a, D), c = campOptions(x).opts.find(y => y.value === cid);
    if (!c || !c.ok) { toast('แคมเปญนี้ใช้ไม่ได้กับใบจองนี้', 'bad'); return; }
    const vals = termsRecord(x, { ...d, campaign_id: cid, margin_honda: '', margin_priv: '' }, d.paint || 0);
    const rec = { ...d, ...vals, ...actor(), how: 'แอดมินแก้ (อัปเดตข้อมูลแคมเปญ)', sales_camp_id: d.sales_camp_id ?? null, sales_camp: d.sales_camp ?? null, adm_mode: 'upload', adm_file: U.file || null, hist: [...(d.hist || []), dealOld(d)] };
    if (await saveFlow(a, { deal: rec }, 'เปลี่ยนแคมเปญแล้ว ' + (a.cust || ''))) { delete U.pick[a.id]; render(); }
  }
});
