
// ---------- อัปเดตข้อมูลแคมเปญ (ขอ 26/10): its own page, like the IDS update
// Upload the campaign file (photo / Excel / CSV). The file is read to text, compared with the campaign each booking already
// chose, and shows ตรง / ไม่ตรง / ไม่พบ. Nothing is changed by itself: the person picks which campaign a booking uses.
const campUpCan = () => perms().write && (perms().upload || perms().approve);
// the parts of an option that decide it: interest, Exclusive Care years, Ultimate Care, free insurance, support baht, e-coupon
// Honda's own files spell "ทางเลือก" wrong in places (ทางเลือห): always read and show the right spelling
const fixTh = t => String(t == null ? '' : t).replace(/ทางเลือห/g, 'ทางเลือก');
function campFeats(t) {
  t = fixTh(t);
  const f = [], m = (re, k) => { const r = t.match(re); if (r) f.push(k + (r[1] ? r[1] : '')); };
  m(/ดอกเบี้ยพิเศษ ?([\d.]+) ?%/, 'rate'); m(/Exclusive Care ?(\d+)/i, 'exc'); if (/Ultimate Care/i.test(t)) f.push('ult');
  if (/ประกัน/.test(t)) f.push('ins'); if (/ค่าช่วยเหลือ/.test(t)) f.push('help'); if (/e-?coupon/i.test(t)) f.push('cpn');
  return f.sort().join(',');
}
const campNo = t => { const r = fixTh(t).match(/ทางเลือก(?:ที่)? ?(\d+)/); return r ? r[1] : ''; };
// the Honda "Dealer Incentive Report": one row per VIN with the campaign, the option, delivery date and status
function campParseDIR(X, wb) {
  for (const n of wb.SheetNames) {
    const rows = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' });
    const hi = rows.findIndex(r => r.some(c => String(c).includes('หมายเลขตัวถัง')));
    if (hi < 0) continue;
    const h = rows[hi].map(c => String(c).trim()), ix = k => h.findIndex(c => c.includes(k));
    const iV = ix('หมายเลขตัวถัง'), iC = ix('เคมเปญ') >= 0 ? ix('เคมเปญ') : ix('แคมเปญ'), iO = ix('ทางเลือก'), iD = ix('วันที่ส่งมอบ'), iN = ix('ชื่อ MTOC'), iS = ix('สถานะ'), iM = ix('รหัส MTOC'), iT = ix('ประเภทการขาย');
    const items = new Map();
    for (const r of rows.slice(hi + 1)) {
      const vin = String(r[iV] || '').trim().toUpperCase(); if (!/^[A-Z0-9]{17}$/.test(vin)) continue;
      items.set(vin, { vin, camp: String(r[iC] || '').trim(), opt: fixTh(r[iO]).replace(/\s+/g, ' ').trim(), date: String(r[iD] || '').trim(), name: String(r[iN] || '').trim(), st: String(r[iS] || '').trim(), mtoc: String(r[iM] || '').trim(), typ: String(r[iT] || '').trim() });
    }
    if (items.size) { const head = rows.slice(0, hi).map(r => r.join(' ')).join(' '), rep = head.match(/(\d{2}\/\d{4})/); return { items, report: rep ? rep[1] : '', br: BRS.find(b => head.includes(BR[b].name)) || '' }; }
  }
  return null;
}
// Honda payout files (per dealer, per incentive month): the option file with the baht per VIN, and the special-campaign file (Gen to Gen, Loyalty ...)
const campBrOf = t => /กำแพงแสน|KAMP/i.test(t) ? 'KPA' : /สามพราน|SAMPRAN/i.test(t) ? 'SPH' : /ภาษีเจริญ|PASI/i.test(t) ? 'PSC' : /เอกชัย|บางบอน|EKACHAI|BANGBON/i.test(t) ? 'ATE' : '';
const campPer = t => { const m = String(t || '').match(/^(\d{4})(\d{2})$/); return m ? m[1] + '-' + m[2] : ''; };
const campAmt = t => { const n = parseFloat(String(t == null ? '' : t).replace(/,/g, '')); return isNaN(n) ? 0 : n; };
function campParsePay(X, wb) {
  for (const n of wb.SheetNames) {
    const rows = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }).map(r => r.map(c => String(c == null ? '' : c).trim()));
    const hi = rows.findIndex(r => r.some(c => /^Frame No/i.test(c)) || r.some(c => /^Activity Name/i.test(c)));
    if (hi < 0) continue;
    const h = rows[hi], ix = k => h.findIndex(c => c.includes(k)), kind = ix('Frame No') >= 0 ? 'pay' : 'act', out = [];
    let br = '', per = '';
    for (const r of rows.slice(hi + 1)) {
      const j = r.join(' '); if (!br) br = campBrOf(j);
      const vin = r.find(c => /^[A-Z0-9]{17}$/i.test(c)); if (!vin) continue;
      if (kind === 'pay') {
        const p = campPer(r[ix('Incentive Period')]); if (p) per = per || p;
        out.push({ vin: vin.toUpperCase(), per: p || per, model: r[ix('Model')] || '', camp: r[ix('แคมเปญเดือน')] || '', opt: fixTh(r[ix('ทางเลือก')]).replace(/\s+/g, ' ').trim(), amt: campAmt(r[ix('รวมจำนวน')]), note: r[ix('หมายเหตุ')] || '' });
      } else {
        const vi = r.indexOf(vin), p = campPer(r[ix('Month')]); if (p) per = per || p;
        const after = r.slice(vi + 1).filter(c => c !== '');
        out.push({ vin: vin.toUpperCase(), per: p || per, act: r[ix('Activity Name')] || '', model: r.find(c => /^(CITY|CIVIC|HR-V|CR-V|ACCORD|E:N|STEP|BR-V|WR-V)/i.test(c)) || '', cust: r.find(c => /^(นาย|นาง|นางสาว|น\.ส\.|คุณ|บริษัท|ห้าง)/.test(c)) || '', amt: campAmt(after[after.length - 1]) });
      }
    }
    if (out.length) return { kind, rows: out, br, per };
  }
  return null;
}
function campUpPayView(D) {
  const U = S.campUp, P = U.pay, can = campUpCan(), byVin = new Map();
  for (const a of D.at) { const v = atVin(a); if (v && !a.cancelled) byVin.set(String(v).toUpperCase(), a); }
  const total = P.rows.reduce((t, r) => t + r.amt, 0), saved = (S.ref.get('honda_pay') || {}).v || {};
  const tr = P.rows.map(r => { const a = byVin.get(r.vin), sv = saved[r.vin]; return `<tr><td>${vinLink({ vin: r.vin })}</td><td>${esc(r.model)}</td><td>${P.kind === 'pay' ? esc(rptOptHead(r.opt).no) + ' <span class="text-xs text-muted">' + esc(rptOptHead(r.opt).txt) + '</span>' : esc(r.act)}</td><td>${a ? esc(a.cust) : esc(r.cust || '–')}</td><td class="text-right num">${money(r.amt)}</td><td>${sv ? chip('มีข้อมูลแล้ว', 'good') : ''}</td></tr>`; }).join('');
  return `<section class="bg-surface border border-line rounded-lg p-4 mb-4"><div class="flex flex-wrap items-center gap-2"><h3 class="font-head font-semibold">${P.kind === 'pay' ? 'เงินรางวัลตามทางเลือกแคมเปญ' : 'เงินแคมเปญพิเศษ (Gen to Gen, Loyalty ฯลฯ)'} · งวด ${esc(P.per ? fmtM(P.per) : '–')}</h3>
    <span class="ml-auto text-sm">${P.rows.length} รายการ · รวม <b class="num">${money(total)}</b> บาท</span></div>
    <div class="mt-3 flex flex-wrap items-center gap-2 text-sm"><label for="cu-br2" class="font-medium">ไฟล์นี้เป็นของสาขา</label><select id="cu-br2" data-campup-br ${myBranch() ? 'disabled' : ''}><option value="">เลือกสาขา…</option>${BRS.map(b => `<option value="${b}" ${U.br === b ? 'selected' : ''}>${b} ${esc(BR[b].name)}</option>`).join('')}</select>${U.br ? '' : '<span class="text-xs" style="color:var(--bad)">ต้องเลือกสาขาก่อนบันทึก</span>'}
      <button class="btn btn-red btn-sm ml-auto" data-act="campup-paysave" ${can && U.br && P.per ? '' : 'disabled'}>บันทึกเงินรางวัล ${P.rows.length} รายการ</button></div>
    <div class="text-xs text-muted mt-1">เก็บที่ VIN แต่ละคัน (แอดมินขึ้นไป) ใช้ในรายงานสรุปแคมเปญเพื่อส่งบัญชีตรวจเทียบ · ไฟล์ทางเลือกกับไฟล์แคมเปญพิเศษอัปโหลดแยกกันได้</div></section>
    <div class="bg-surface border border-line rounded-lg overflow-x-auto"><table class="tbl"><thead><tr><th>เลขตัวถัง</th><th>รุ่น</th><th>${P.kind === 'pay' ? 'ทางเลือก' : 'แคมเปญ'}</th><th>ลูกค้า</th><th class="text-right">จำนวนเงิน</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>`;
}
function campUpRows(D) {
  const U = S.campUp || {}, out = [];
  for (const a of D.at) {
    const d = a.rec && a.rec.deal; if (!d || !d.at || a.cancelled) continue;
    const x = termsCtxAt(a, D), opts = campOptions(x).opts.filter(y => y.ok && y.value !== 'other');
    if (S.br && a.br !== S.br) continue;
    if (U.items) continue;
    const found = U.text ? campMatchText(opts, U.text) : [], top = found[0];
    const mine = found.find(h => h.opt.value === d.campaign_id);
    const state = !U.text ? 'none' : !top ? 'miss' : (top.opt.value === d.campaign_id || (mine && mine.pct >= top.pct)) ? 'ok' : 'diff';
    out.push({ a, d, opts, found, top, state });
  }
  const ord = { diff: 0, miss: 1, ok: 2, none: 3 };
  return out.sort((p, q) => ord[p.state] - ord[q.state] || (p.a.br || '').localeCompare(q.a.br || ''));
}
// ---- the Honda report, one row per VIN in the file (whether or not the web has sale terms for it)
const rptAll = () => (S.ref.get('honda_rpt') || {}).v || {};
function campUpVinRows(D) {
  const U = S.campUp, byVin = new Map(), saved = rptAll(), out = [];
  for (const a of D.at) { const v = atVin(a); if (v && !a.cancelled) byVin.set(String(v).toUpperCase(), a); }
  for (const it of U.items.values()) {
    const a = byVin.get(it.vin), d = a && a.rec && a.rec.deal && a.rec.deal.at ? a.rec.deal : null, sv = saved[it.vin];
    const opts = a ? campOptions(termsCtxAt(a, D)).opts.filter(y => y.ok && y.value !== 'other') : [];
    const ff = campFeats(it.opt);
    let state = 'new', found = [];
    if (d) {
      state = ff && ff === campFeats(d.campaign) ? 'ok' : 'diff';
      if (state === 'diff') found = opts.filter(y => ff && campFeats(y.name) === ff && (!campNo(it.opt) || campNo(y.name) === campNo(it.opt))).map(y => ({ opt: y, pct: 100 }));
    }
    const done = !!(sv && sv.opt === it.opt && sv.rep === U.report && sv.br === U.br);
    out.push({ a, d, it, opts, found, state, done, chg: !!(sv && sv.rep === U.report && sv.br === U.br && sv.opt !== it.opt), old: sv });
  }
  const ord = { diff: 0, new: 1, ok: 2 };
  return out.sort((p, q) => ord[p.state] - ord[q.state]);
}
function campUpVinRow(r) {
  const { a, d, it, opts, found, state, done, chg, old } = r, U = S.campUp, pick = (U.pick || {})[it.vin] || '';
  const can = campUpCan(), canEdit = a && d && dealAdmin(a);
  const tone = state === 'ok' ? 'good' : state === 'diff' ? 'warn' : 'muted';
  const label = state === 'ok' ? 'ตรง' : state === 'diff' ? 'ไม่ตรง' : 'ยังไม่มีข้อมูลในเว็บ';
  const fix = state !== 'diff' ? '' : !canEdit ? `<span class="text-xs text-muted">${a && poLocked(a) ? 'ส่งมอบแล้ว แก้เงื่อนไขในเว็บไม่ได้' : 'แก้ได้เฉพาะแอดมิน/ผู้จัดการสาขา ' + esc(a ? a.br : '')}</span>` : `<div class="flex flex-col gap-2">
      ${found.map(h => `<div class="flex flex-wrap items-center gap-2"><span class="text-sm flex-1 min-w-[180px]">เปลี่ยนในเว็บเป็น: ${esc(campFull(h.opt))}</span><button type="button" class="btn btn-dark btn-sm" data-act="campup-use" data-id="${esc(a.id)}" data-cid="${esc(h.opt.value)}">ใช้ตามไฟล์</button></div>`).join('')}
      <div class="flex flex-wrap items-center gap-2"><select class="min-w-0 flex-1" data-campup-pick="${esc(it.vin)}"><option value="">เลือกแคมเปญเอง…</option>${opts.map(y => `<option value="${esc(y.value)}" ${pick === y.value ? 'selected' : ''}>${esc(campFull(y))}</option>`).join('')}</select>
        <button type="button" class="btn btn-ghost btn-sm" data-act="campup-use" data-id="${esc(a.id)}" data-cid="${esc(pick)}" ${pick ? '' : 'disabled'}>ใช้ตัวที่เลือก</button></div></div>`;
  const tick = can && !done ? `<input type="checkbox" class="mr-1" data-campup-sel="${esc(it.vin)}" ${U.sel && U.sel.has(it.vin) ? 'checked' : ''} aria-label="เลือก ${esc(it.vin)}">` : '';
  const sv = '';
  const chgBox = chg ? `<div class="p-2 rounded-lg text-sm" style="background:var(--warn-soft);color:var(--warn)"><b>ทางเลือกเปลี่ยน</b> จากที่บันทึกไว้: ${esc(old.opt || '–')} → ${esc(it.opt || '–')}<div class="text-xs">ติ๊กเลือกเพื่อบันทึกตามไฟล์ใหม่ ค่าเก่าเก็บไว้ในประวัติ</div></div>` : '';
  return `<div class="p-3 rounded-lg border border-line bg-surface flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2">${tick}${vinLink({ vin: it.vin })}<span class="text-xs text-muted">${esc(it.name)}${a ? ' · ' + esc(a.cust) + ' · ' + esc(a.br) : ' · ไม่พบใบจองที่ผูกกับ VIN นี้'}</span>${a ? `<button type="button" class="text-xs underline" data-act="at-open" data-id="${esc(a.id)}">เปิดใบจอง</button>` : ''}<span class="ml-auto flex gap-1">${done ? chip('บันทึกแล้ว', 'good') : ''}${chip(label, tone)}</span></div>
    <div class="text-sm p-2 rounded-lg" style="background:var(--surface-2)">ในไฟล์ Honda: <b>${esc(it.opt || '–')}</b><div class="text-xs text-muted">${esc(it.camp)}${it.date ? ' · ส่งมอบ ' + esc(it.date) : ''}${it.st ? ' · ' + esc(it.st) : ''}</div></div>
    ${d ? `<div class="text-sm">เงื่อนไขขายในเว็บ: <b>${esc(d.campaign || '–')}</b></div>` : ''}
    ${chgBox}${fix}${sv}</div>`;
}
function campUpRptBox(vr) {
  const U = S.campUp, by = {}, st = {};
  vr.forEach(r => { const m = r.it.name.split(' ')[0] || '–'; by[m] = (by[m] || 0) + 1; st[r.it.st || '–'] = (st[r.it.st || '–'] || 0) + 1; });
  const todo = vr.filter(r => !r.done).length, nSel = vr.filter(r => !r.done && U.sel && U.sel.has(r.it.vin)).length, nChg = vr.filter(r => r.chg).length;
  return `<section class="bg-surface border border-line rounded-lg p-4 mb-4"><div class="flex flex-wrap items-center gap-2"><h3 class="font-head font-semibold">ยอดแจ้งขาย Honda${U.br ? ' สาขา ' + esc(U.br) : ''}${U.report ? ' ' + esc(U.report) : ''}: ${vr.length} คัน</h3>
    <span class="text-sm text-muted">${Object.entries(st).map(([k, v]) => esc(k) + ' ' + v).join(' · ')}</span>
    ${campUpCan() ? `<span class="ml-auto flex flex-wrap gap-2"><button class="btn btn-ghost btn-sm" data-act="campup-selall" ${todo ? '' : 'disabled'}>เลือกทั้งหมด (${todo})</button><button class="btn btn-ghost btn-sm" data-act="campup-selnone">ไม่เลือก</button><button class="btn btn-red btn-sm" data-act="campup-save" ${nSel && U.br ? '' : 'disabled'}>${todo ? `บันทึกที่เลือก (${nSel} คัน)` : 'บันทึกครบแล้ว'}</button></span>` : ''}</div>
    ${nChg ? `<div class="text-sm mt-2" style="color:var(--warn)">มี ${nChg} คันที่ทางเลือกเปลี่ยนจากที่บันทึกไว้ ตรวจแล้วติ๊กเลือกเองก่อนบันทึก</div>` : ''}<div class="text-xs text-muted mt-1">รุ่น: ${Object.entries(by).map(([k, v]) => esc(k) + ' ' + v).join(' · ')} · บันทึกแล้วเก็บไว้ที่ VIN แต่ละคัน (เห็นเฉพาะแอดมินขึ้นไป) ไม่เปลี่ยนเงื่อนไขขายในใบจอง · ดูสรุปที่ รายงาน › รายงานสรุปแคมเปญ</div></section>`;
}
function campUpRow(r) {
  const { a, d, opts, found, state, it, why } = r, U = S.campUp, pick = (U.pick || {})[a.id] || '';
  const can = dealAdmin(a);
  const tone = state === 'ok' ? 'good' : state === 'diff' ? 'warn' : state === 'miss' ? 'bad' : 'muted';
  const label = state === 'ok' ? 'ตรง' : state === 'diff' ? 'ไม่ตรง' : state === 'miss' ? 'ไม่พบในไฟล์' : 'ยังไม่เทียบ';
  const sugg = found.filter(h => h.opt.value !== d.campaign_id);
  const act = !can ? `<span class="text-xs text-muted">${'แก้ได้เฉพาะแอดมิน/ผู้จัดการสาขา ' + esc(a.br)}</span>` : state === 'ok' ? '' : `<div class="flex flex-col gap-2">
      ${sugg.map(h => `<div class="flex flex-wrap items-center gap-2"><span class="text-sm flex-1 min-w-[180px]">${esc(campFull(h.opt))} ${chip(h.pct + '% ตรง', h.pct >= 80 ? 'good' : 'warn')}</span><button type="button" class="btn btn-dark btn-sm" data-act="campup-use" data-id="${esc(a.id)}" data-cid="${esc(h.opt.value)}">ใช้ตัวนี้</button></div>`).join('')}
      <div class="flex flex-wrap items-center gap-2"><select class="min-w-0 flex-1" data-campup-pick="${esc(a.id)}"><option value="">เลือกแคมเปญเอง…</option>${opts.map(y => `<option value="${esc(y.value)}" ${pick === y.value ? 'selected' : ''}>${esc(campFull(y))}</option>`).join('')}</select>
        <button type="button" class="btn btn-ghost btn-sm" data-act="campup-use" data-id="${esc(a.id)}" data-cid="${esc(pick)}" ${pick ? '' : 'disabled'}>ใช้ตัวที่เลือก</button></div></div>`;
  return `<div class="p-3 rounded-lg border border-line bg-surface flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2"><b>${esc(a.cust)}</b><span class="text-xs text-muted">${esc(a.br)} · ${esc(a.model)} ${esc(gradeShort(a.model, a.grade))} ${esc(a.color || '')}${a.rec.sales ? ' · ' + esc(a.rec.sales) : ''}</span><span class="ml-auto">${chip(label, tone)}</span></div>
    ${it ? `<div class="text-sm p-2 rounded-lg" style="background:var(--surface-2)">ในไฟล์ Honda: <b>${esc(it.opt || '–')}</b><div class="text-xs text-muted">${esc(it.camp)}${it.date ? ' · ส่งมอบ ' + esc(it.date) : ''}${it.st ? ' · ' + esc(it.st) : ''}</div></div>` : why ? `<div class="text-xs text-muted">${esc(why)}</div>` : ''}
    <div class="text-sm">แคมเปญที่เลือกไว้: <b>${esc(d.campaign || '–')}</b>${d.adm_file ? ` <span class="text-xs text-muted">(ไฟล์ ${esc(d.adm_file)})</span>` : ''}</div>
    ${act}</div>`;
}
function campUpExtra(rows) {
  const have = new Set(rows.map(r => String(atVin(r.a) || '').toUpperCase())), U = S.campUp;
  const left = [...U.items.values()].filter(i => !have.has(i.vin));
  if (!left.length) return '';
  return `<details class="mb-4 bg-surface border border-line rounded-lg p-3"><summary class="text-sm cursor-pointer">VIN ในไฟล์ที่ไม่มีเงื่อนไขการขายในเว็บ (${left.length})</summary><div class="mt-2 flex flex-col gap-1 text-sm">${left.map(i => `<div><span class="code">${esc(i.vin)}</span> <span class="text-xs text-muted">${esc(i.name)} · ${esc(i.opt)}</span></div>`).join('')}</div></details>`;
}
function campUpItems(D) {
  const vr = campUpVinRows(D);
  return `${campUpRptBox(vr)}<h3 class="font-head font-semibold mb-2">รายคันในไฟล์ (${vr.length})</h3><div class="flex flex-col gap-2">${vr.map(campUpVinRow).join('')}</div>`;
}
function viewCampUp(D) {
  const U = S.campUp || (S.campUp = { text: '', file: '', busy: false, msg: '', pick: {} }), can = campUpCan();
  const rows = U.items ? campUpVinRows(D) : campUpRows(D), n = s => rows.filter(r => r.state === s).length;
  return `${pageHead('อัปเดตข้อมูลแคมเปญ', 'อัปโหลดไฟล์แคมเปญของ Honda: Dealer Incentive Report (เทียบรายคันตามเลข VIN) หรือไฟล์เงินรางวัลรายเดือน (ทางเลือก / แคมเปญพิเศษ) ระบบเทียบรายคันตามเลข VIN กับแคมเปญที่เลือกไว้ในแต่ละใบจอง (รูปหรือไฟล์อื่นเทียบจากข้อความ) ถ้าไม่ตรงหรือไม่พบ กดเลือกเองว่าใบนั้นใช้แคมเปญอะไร')}
  <section class="bg-surface border border-line rounded-lg p-4 md:p-5 mb-5">
    <label class="drop relative ${can && !U.busy ? '' : 'opacity-50'}">
      <input type="file" accept="image/*,.xlsx,.xls,.csv,.txt" data-campup-file ${can && !U.busy ? '' : 'disabled'} class="absolute inset-0 opacity-0 cursor-pointer">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="color:var(--red)">${ICON.upload}</svg>
      <span class="font-medium">${U.busy ? '<span class="spin"></span> กำลังอ่านไฟล์…' : 'เลือกไฟล์แคมเปญ (รูป / .xlsx / .csv)'}</span>
      <span class="text-xs text-muted">${can ? 'อ่านในเครื่อง ไม่เก็บไฟล์ในระบบ · ระบบเทียบกับแคมเปญของเดือนที่ใบจองนั้นใช้' : 'เฉพาะแอดมินและผู้จัดการ'}</span>
    </label>
    ${U.msg ? `<p class="mt-3 text-sm" style="color:var(--bad)">${esc(U.msg)}</p>` : ''}
    ${U.items ? `<div class="mt-3 flex flex-wrap items-center gap-2 text-sm"><label for="cu-br" class="font-medium">ไฟล์นี้เป็นของสาขา</label><select id="cu-br" data-campup-br ${myBranch() ? 'disabled' : ''}><option value="">เลือกสาขา…</option>${BRS.map(b => `<option value="${b}" ${U.br === b ? 'selected' : ''}>${b} ${esc(BR[b].name)}</option>`).join('')}</select>${U.brAuto && U.br ? '<span class="text-xs text-muted">อ่านจากหัวไฟล์ ตรวจให้ถูกก่อนบันทึก</span>' : !U.br ? '<span class="text-xs" style="color:var(--bad)">ต้องเลือกสาขาก่อนบันทึก</span>' : ''}</div>` : ''}
    ${U.pay ? `<div class="mt-3 flex flex-wrap items-center gap-2 text-sm">ไฟล์ <b>${esc(U.file)}</b><button class="btn btn-ghost btn-sm ml-auto" data-act="campup-clear">ล้างไฟล์</button></div>` : ''}
    ${U.text || U.items ? `<div class="mt-3 flex flex-wrap items-center gap-2 text-sm">ไฟล์ <b>${esc(U.file)}</b>${U.report ? ` (รายงาน ${esc(U.report)})` : ''} ${chip('ตรง ' + n('ok'), 'good')}${chip('ไม่ตรง ' + n('diff'), 'warn')}${(U.items ? chip('ยังไม่มีข้อมูล ' + n('new'), 'muted') : chip('ไม่พบ ' + n('miss'), 'bad'))}<button class="btn btn-ghost btn-sm ml-auto" data-act="campup-clear">ล้างไฟล์</button></div>` : ''}
  </section>
  ${U.pay ? campUpPayView(D) : U.items ? campUpItems(D) : `<h3 class="font-head font-semibold mb-2">ใบจองที่ลงเงื่อนไขการขายแล้ว (${rows.length})</h3>
  <div class="flex flex-col gap-2">${rows.map(campUpRow).join('') || emptyBox('ยังไม่มีใบจองที่ลงเงื่อนไขการขาย', 'ใบจองที่ผ่านขั้นไฟแนนซ์และลงเงื่อนไขแล้วจะขึ้นที่นี่')}</div>`}`;
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
      const dir = campParseDIR(X, wb);
      if (dir) { Object.assign(U, { pay: null, items: dir.items, report: dir.report, text: '', file: file.name, pick: {}, br: myBranch() || dir.br || '', brAuto: !!dir.br }); U.sel = new Set(campUpVinRows(derive()).filter(r => !r.done && !r.chg).map(r => r.it.vin)); U.busy = false; render(); return; }
      const pay = campParsePay(X, wb);
      if (pay) { Object.assign(U, { pay, items: null, text: '', file: file.name, br: myBranch() || pay.br || '' }); U.busy = false; render(); return; }
      text = wb.SheetNames.map(n => X.utils.sheet_to_csv(wb.Sheets[n])).join(' ');
    }
    if (!text.trim()) U.msg = 'อ่านข้อความจากไฟล์ไม่ได้ ลองไฟล์อื่น';
    else { U.text = text; U.items = null; U.pay = null; U.report = ''; U.file = file.name; U.pick = {}; }
  } catch (e) { U.msg = 'อ่านไฟล์ไม่ได้ ลองไฟล์อื่น'; }
  U.busy = false; render();
}
document.addEventListener('change', ev => {
  const t = ev.target; if (!t || !t.dataset) return;
  if (t.dataset.campupFile !== undefined) { const f = t.files && t.files[0]; t.value = ''; if (f) campUpRead(f); }
  else if (t.dataset.campupSel !== undefined) { const U = S.campUp; U.sel = U.sel || new Set(); t.checked ? U.sel.add(t.dataset.campupSel) : U.sel.delete(t.dataset.campupSel); render(); }
  else if (t.dataset.campupBr !== undefined) { S.campUp.br = t.value; render(); }
  else if (t.dataset.campupPick !== undefined) { const U = S.campUp; U.pick[t.dataset.campupPick] = t.value; render(); }
});
Object.assign(ACTIONS, {
  async 'campup-paysave'() {
    const U = S.campUp, P = U && U.pay; if (!P || !campUpCan() || !U.br || !P.per) return;
    const cur = S.ref.get('honda_pay') || { v: {} }, v = { ...(cur.v || {}) }, now = new Date().toISOString();
    for (const r of P.rows) {
      const o = { ...(v[r.vin] || {}), br: U.br, per: r.per || P.per, model: r.model || (v[r.vin] || {}).model || '' };
      if (P.kind === 'pay') Object.assign(o, { camp: r.camp, opt: r.opt, amt: r.amt, note: r.note, file: U.file, ...actor(), at: now });
      else { const acts = (o.acts || []).filter(x => x.name !== r.act); acts.push({ name: r.act, amt: r.amt, cust: r.cust, file: U.file, at: now }); o.acts = acts; }
      v[r.vin] = o;
    }
    if (await write('ref', 'honda_pay', { ...cur, v })) { toast(`บันทึกเงินรางวัล ${P.rows.length} รายการแล้ว`); render(); }
  },
  'campup-selall'() { const U = S.campUp; U.sel = new Set(campUpVinRows(derive()).filter(r => !r.done).map(r => r.it.vin)); render(); },
  'campup-selnone'() { S.campUp.sel = new Set(); render(); },
  async 'campup-save'() {
    const U = S.campUp; if (!U || !U.items || !campUpCan()) return;
    if (!U.br) { toast('เลือกสาขาของไฟล์ก่อน', 'bad'); return; }
    const cur = S.ref.get('honda_rpt') || { v: {} }, v = { ...(cur.v || {}) }, now = new Date().toISOString(); let n = 0, ch = 0;
    for (const it of U.items.values()) {
      if (!U.sel || !U.sel.has(it.vin)) continue;
      const sv = v[it.vin]; if (sv && sv.opt === it.opt && sv.rep === U.report && sv.br === U.br) continue;
      const prev = sv ? [...(sv.prev || []), { opt: sv.opt, camp: sv.camp, date: sv.date, st: sv.st, rep: sv.rep, file: sv.file, at: sv.at, role: sv.role }].slice(-5) : [];
      v[it.vin] = { camp: it.camp, opt: it.opt, date: it.date, st: it.st, name: it.name, mtoc: it.mtoc, typ: it.typ, br: U.br, rep: U.report, file: U.file, ...actor(), at: now, prev }; n++; if (sv) ch++;
    }
    if (!n) { toast('ยังไม่ได้เลือกคัน', 'bad'); return; }
    if (await write('ref', 'honda_rpt', { ...cur, v })) { U.sel = new Set(); toast(`บันทึกยอดแจ้งขาย ${n} คันเข้า VIN แล้ว${ch ? ` (ทางเลือกเปลี่ยน ${ch} คัน เก็บค่าเก่าในประวัติ)` : ''}`); render(); }
  },
  'campup-clear'() { S.campUp = { pay: null, items: null, text: '', file: '', busy: false, msg: '', pick: {} }; render(); },
  async 'campup-use'(el) {
    const a = atById(el.dataset.id), cid = el.dataset.cid, U = S.campUp; if (!a || !cid) return;
    const D = derive(), d = a.rec.deal;
    if (!d || !dealAdmin(a)) { toast('แก้ไม่ได้', 'bad'); return; }
    if (poLocked(a)) { rptEditOpen(String(atVin(a) || '').toUpperCase(), cid); return; }  // delivered: the edit window asks for the reason
    const x = termsCtxAt(a, D), c = campOptions(x).opts.find(y => y.value === cid);
    if (!c || !c.ok) { toast('แคมเปญนี้ใช้ไม่ได้กับใบจองนี้', 'bad'); return; }
    const vals = termsRecord(x, { ...d, campaign_id: cid, margin_honda: '', margin_priv: '' }, d.paint || 0);
    const rec = { ...d, ...vals, ...actor(), how: 'แอดมินแก้ (อัปเดตข้อมูลแคมเปญ)', sales_camp_id: d.sales_camp_id ?? null, sales_camp: d.sales_camp ?? null, adm_mode: 'upload', adm_file: U.file || null, hist: [...(d.hist || []), dealOld(d)] };
    if (await saveFlow(a, { deal: rec }, 'เปลี่ยนแคมเปญแล้ว ' + (a.cust || ''))) { delete U.pick[a.id]; delete U.pick[String(atVin(a) || '').toUpperCase()]; render(); }
  }
});

// on the car: what Honda reported for this VIN (from the Dealer Incentive Report), admin and up only
function rptBox(c) {
  if (!campUpCan()) return '';
  const r = rptAll()[String(c.vin || '').toUpperCase()]; if (!r) return '';
  return `<div class="p-3 rounded-lg border border-line text-sm" style="background:var(--surface-2)"><b>แจ้งขาย Honda${r.rep ? ' ' + esc(r.rep) : ''}</b>: ${esc(r.opt || '–')}<div class="text-xs text-muted">${esc(r.camp)}${r.date ? ' · ส่งมอบ ' + esc(r.date) : ''}${r.st ? ' · ' + esc(r.st) : ''} · บันทึก ${fmtD((r.at || '').slice(0, 10))} โดย ${esc(r.role || '')}</div>${(r.prev || []).length ? `<details class="mt-1"><summary class="text-xs cursor-pointer">ประวัติก่อนหน้า (${r.prev.length})</summary>${r.prev.slice().reverse().map(p => `<div class="text-xs text-muted">${esc(p.rep || '')} · ${esc(p.opt || '–')} · ${fmtD((p.at || '').slice(0, 10))}</div>`).join('')}</details>` : ''}</div>`;
}
