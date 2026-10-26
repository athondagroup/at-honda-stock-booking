// ---------- แก้ไขเงินแคมเปญรายคัน + ประวัติแก้ไข (ขอ 26/10) — admin and up; after delivery a reason is required
// Only function declarations at the top level (files are concatenated).
const rptDelivered = (r, a) => rptKind(r && r.st) === 'del' || !!(a && poLocked(a));
function rptEditCan(br) { return campUpCan() && (!myBranch() || !br || br === myBranch()); }
// "ทางเลือก 2" on screen, the full text on hover / one click
function optTip(opt, pr) {
  const h = rptOptHead(opt);
  if (!h.no && !h.txt) return '–';
  if (pr) return esc(h.no || h.txt);
  const full = (h.no + ' ' + h.txt).trim();
  return h.no ? `<span class="opt-tip" tabindex="0" role="button" data-full="${esc(full)}">${esc(h.no)}</span>` : `<span class="opt-tip" tabindex="0" role="button" data-full="${esc(full)}">${esc(full.slice(0, 18))}…</span>`;
}
function optLegend(rows) {
  const seen = new Map(); rows.forEach(r => { const h = rptOptHead(r.opt); if (h.no && !seen.has(h.no + '|' + r.camp)) seen.set(h.no + '|' + r.camp, [r.camp, h.no, h.txt]); });
  if (!seen.size) return '';
  return `<table><thead><tr><th>แคมเปญ</th><th>ทางเลือก</th><th>เนื้อหา</th></tr></thead><tbody>${[...seen.values()].sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1])).map(x => `<tr><td>${esc(x[0])}</td><td>${esc(x[1])}</td><td>${esc(x[2])}</td></tr>`).join('')}</tbody></table>`;
}
function optPopHide() { const p = document.getElementById('opt-pop'); if (p) p.remove(); }
function optPopShow(el) {
  optPopHide();
  const p = document.createElement('div'); p.id = 'opt-pop'; p.className = 'opt-pop'; p.textContent = el.dataset.full || '';
  document.body.appendChild(p);
  const b = el.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
  p.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, b.left)) + 'px';
  p.style.top = (b.bottom + h + 12 > window.innerHeight ? Math.max(8, b.top - h - 6) : b.bottom + 6) + 'px';
}
document.addEventListener('mouseover', e => { const t = e.target.closest && e.target.closest('.opt-tip'); if (t) optPopShow(t); });
document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('.opt-tip')) optPopHide(); });
document.addEventListener('focusin', e => { const t = e.target.closest && e.target.closest('.opt-tip'); if (t) optPopShow(t); });
document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('.opt-tip')) optPopHide(); });
document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('.opt-tip'); if (t) optPopShow(t); else optPopHide(); }, true);
document.addEventListener('scroll', optPopHide, true);

// Honda's money against what the web has for the same car (the admin's pick counts)
function rptMoneyCheck(r, a, D, pr) {
  const T = (t, s) => pr ? s : chip(s, t);
  const d = a && a.rec && a.rec.deal;
  if (!a || !d || !d.at) return { html: T('muted', 'ไม่มีเงื่อนไขขายในเว็บ'), tone: 'muted' };
  const x = termsCtxAt(a, D), opts = campOptions(x).opts, out = [];
  let tone = 'good';
  if (!d.campaign_id || d.campaign_id === 'pending') {
    const m = campMatchText(opts.filter(y => y.ok && !['pending', 'none', 'other'].includes(y.value)), (r.camp || '') + ' ' + (r.opt || '') + ' ' + (r.name || '')).filter(h => h.pct >= 60)[0];
    out.push(T('warn', d.campaign_id === 'pending' ? 'แอดมินยังไม่เลือก (รอเลือกแคมเปญ)' : 'แอดมินยังไม่ระบุแคมเปญ'));
    if (m) out.push(pr ? 'แนะนำ: ' + campFull(m.opt) : `<div class="text-xs mt-1">แนะนำ: ${esc(campFull(m.opt))}${rptEditCan(a.br) && dealAdmin(a) ? ` <button type="button" class="btn btn-dark btn-sm" data-act="rpt-confirm" data-id="${esc(a.id)}" data-cid="${esc(m.opt.value)}">ยืนยัน</button>` : ''}</div>`);
    return { html: out.join(' '), tone: 'warn' };
  }
  const web = Number(d.margin_honda) || 0, hasPay = r.hasPay && r.pay;
  if (d.sales_camp_id && d.sales_camp_id !== d.campaign_id) { out.push(T('warn', 'เซลล์เลือกต่างจากแอดมิน (ใช้ตามแอดมิน)')); tone = 'warn'; }
  const co = opts.find(y => y.value === d.campaign_id), sup = co ? Number(co.sup) || 0 : null;
  if (hasPay) {
    if (Math.abs(r.pay - web) < 1) out.push(T('good', 'ตรงเว็บ')); else { out.push(T('bad', 'เว็บ ' + money(web))); tone = 'bad'; }
    if (sup !== null && Math.abs(r.pay - sup) >= 1) { out.push(T('warn', 'ตารางแคมเปญ ' + money(sup))); if (tone === 'good') tone = 'warn'; }
  } else out.push(T('muted', 'ยังไม่มีไฟล์เงิน'));
  return { html: out.join(' '), tone };
}
function rptEditBtn(r, a) {
  return rptEditCan(r.br || (a && a.br)) ? `<button type="button" class="btn btn-ghost btn-sm" data-act="rpt-edit" data-vin="${esc(r.vin)}">แก้ไข</button>` : '';
}

// ---- the edit window
function rptEditOpen(vin, cid) {
  const ms = rptMonths(), rep = (ms.includes(S.filters.rptRep) ? S.filters.rptRep : '') || (rptAll()[vin] || {}).rep || ms[0] || '', rows = rptRows(rep), r = rows.find(x => x.vin === vin) || { vin, acts: [], opt: '', pay: 0, hasPay: false, br: myBranch() || '', camp: '', name: '' };
  const a = rptByVin(derive()).get(vin), d = a && a.rec && a.rec.deal;
  S.modal = { kind: 'rptedit', vin, rep, a: a ? a.id : '', cid: cid || (d && d.campaign_id) || '', opt: r.opt || '', amt: r.hasPay ? String(r.pay) : '', acts: (r.acts || []).map(x => ({ name: x.name, amt: String(x.amt ?? '') })), setMargin: !!(d && r.hasPay && Math.abs((Number(d.margin_honda) || 0) - r.pay) >= 1), why: '', st: r.st || '', br: r.br || (a && a.br) || '', hasDir: !!r.hasDir };
  render();
}
function rptEditModal(m, D) {
  const a = m.a ? atById(m.a) : null, d = a && a.rec && a.rec.deal, locked = rptDelivered({ st: m.st }, a);
  const x = a ? termsCtxAt(a, D) : null, opts = x ? campOptions(x).opts.filter(y => y.ok) : [];
  const web = d ? `<div class="field"><label for="re-cid">แคมเปญในเงื่อนไขขาย (เว็บ)</label><select id="re-cid" data-modal="cid"><option value="">– ไม่เปลี่ยน –</option>${opts.map(y => `<option value="${esc(y.value)}" ${m.cid === y.value ? 'selected' : ''}>${esc(campFull(y))}${d.campaign_id === y.value ? ' (ปัจจุบัน)' : ''}</option>`).join('')}</select>
      <div class="text-xs text-muted mt-1">ตอนนี้: ${esc(d.campaign || '–')} · เงินช่วย Honda ในเว็บ ${money(d.margin_honda || 0)}${d.sales_camp ? ' · เซลล์เลือก: ' + esc(d.sales_camp) : ''}</div></div>` : '<p class="text-sm text-muted">ไม่มีเงื่อนไขขายในเว็บสำหรับ VIN นี้ (แก้ได้เฉพาะข้อมูลที่ Honda จ่าย)</p>';
  const acts = m.acts.map((q, i) => `<div class="flex gap-2 mb-1"><input class="flex-1 min-w-0" data-modal="acts.${i}.name" value="${esc(q.name)}" placeholder="ชื่อแคมเปญพิเศษ" aria-label="ชื่อแคมเปญพิเศษ"><input class="w-28" type="number" step="0.01" data-modal="acts.${i}.amt" value="${esc(q.amt)}" aria-label="จำนวนเงิน"><button type="button" class="btn btn-ghost btn-sm" data-act="rpt-edit-del" data-i="${i}" aria-label="ลบ">✕</button></div>`).join('');
  const hist = (((S.ref.get('honda_pay') || {}).v || {})[m.vin] || {}).hist || [];
  return `<div class="flex items-start justify-between gap-3 mb-2"><div><h2 class="font-head text-xl font-semibold">แก้ไขแคมเปญ / เงิน</h2>
    <div class="text-sm text-muted"><span class="code">${esc(m.vin)}</span>${a ? ' · ' + esc(a.cust) + ' · ' + esc(a.br) : ''} ${locked ? chip('ส่งมอบแล้ว · ต้องใส่เหตุผล', 'warn') : ''}</div></div>
    <button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="flex flex-col gap-3">${web}
    <div class="grid sm:grid-cols-2 gap-3"><div class="field"><label for="re-opt">ทางเลือกที่ Honda จ่าย (ตามไฟล์)</label><input id="re-opt" data-modal="opt" value="${esc(m.opt)}" autocomplete="off"></div>
      <div class="field"><label for="re-amt">เงินทางเลือกที่ Honda จ่าย (บาท)</label><input id="re-amt" type="number" step="0.01" inputmode="decimal" data-modal="amt" value="${esc(m.amt)}"></div></div>
    <div><div class="text-sm font-medium mb-1">แคมเปญพิเศษ</div>${acts || '<div class="text-xs text-muted mb-1">ไม่มี</div>'}<button type="button" class="btn btn-ghost btn-sm" data-act="rpt-edit-add">+ เพิ่มแคมเปญพิเศษ</button></div>
    ${d ? `<label class="flex items-center gap-2 text-sm"><input type="checkbox" data-modal="setMargin" ${m.setMargin ? 'checked' : ''}> ปรับ "เงินช่วย Honda" ในเงื่อนไขขายให้เท่ากับยอดที่ Honda จ่าย</label>` : ''}
    <div class="field"><label for="re-why" class="${locked ? 'req' : ''}">เหตุผลที่แก้${locked ? ' (บังคับ)' : ''}</label><input id="re-why" data-modal="why" value="${esc(m.why)}" autocomplete="off" placeholder="เช่น Honda แจ้งเปลี่ยนทางเลือก / บัญชีตรวจพบ"></div>
    ${hist.length ? `<details class="text-xs"><summary class="cursor-pointer text-muted">ประวัติแก้ไขที่ผ่านมา (${hist.length})</summary>${hist.slice().reverse().map(h => `<div class="mt-1">${fmtDT(h.at)} · ${who(h)} — ${esc(h.reason || '–')}<br>${(h.changes || []).map(c => esc(c.f) + ': ' + esc(c.old ?? '–') + ' → ' + esc(c.new ?? '–')).join(' · ')}</div>`).join('')}</details>` : ''}
    <div class="flex gap-2 justify-end"><button class="btn btn-ghost" data-act="close">ยกเลิก</button><button class="btn btn-dark" data-act="rpt-edit-save">บันทึก</button></div></div>`;
}
// the one place that changes the campaign of a booking's sale terms (keeps the old one in the history, with the reason)
async function rptApplyCamp(a, cid, how, why, extra, file) {
  const D = derive(), d = a.rec.deal, x = termsCtxAt(a, D), c = campOptions(x).opts.find(y => y.value === cid);
  if (!d || !c || !c.ok) { toast('แคมเปญนี้ใช้ไม่ได้กับใบจองนี้', 'bad'); return false; }
  const vals = termsRecord(x, { ...d, campaign_id: cid, margin_honda: extra && extra.margin_honda !== undefined ? extra.margin_honda : '', margin_priv: '' }, d.paint || 0);
  const rec = { ...d, ...vals, ...actor(), how, why: why || null, sales_camp_id: d.sales_camp_id ?? null, sales_camp: d.sales_camp ?? null, adm_mode: 'upload', adm_file: file || null, hist: [...(d.hist || []), dealOld(d)] };
  return saveFlow(a, { deal: rec }, 'เปลี่ยนแคมเปญแล้ว ' + (a.cust || ''));
}
Object.assign(ACTIONS, {
  'rpt-edit'(el) { if (!rptEditCan()) return; rptEditOpen(String(el.dataset.vin || '').toUpperCase()); },
  'rpt-edit-add'() { S.modal.acts.push({ name: '', amt: '' }); render(); },
  'rpt-edit-del'(el) { S.modal.acts.splice(Number(el.dataset.i), 1); render(); },
  async 'rpt-confirm'(el) {
    const a = atById(el.dataset.id); if (!a || !dealAdmin(a) || !rptEditCan(a.br)) { toast('แก้ไม่ได้', 'bad'); return; }
    if (poLocked(a)) { rptEditOpen(String(atVin(a) || '').toUpperCase(), el.dataset.cid); return; }
    if (await rptApplyCamp(a, el.dataset.cid, 'แอดมินยืนยันตามไฟล์ Honda', null, null, null)) render();
  },
  async 'rpt-edit-save'() {
    const m = S.modal; if (!m || m.kind !== 'rptedit' || !rptEditCan(m.br)) return;
    const a = m.a ? atById(m.a) : null, d = a && a.rec && a.rec.deal, locked = rptDelivered({ st: m.st }, a), why = String(m.why || '').trim();
    if (locked && !why) { toast('ส่งมอบแล้ว ต้องใส่เหตุผลที่แก้', 'bad'); $('#re-why')?.focus(); return; }
    const amt = m.amt === '' ? 0 : Number(m.amt); if (!isFinite(amt)) { toast('จำนวนเงินไม่ถูกต้อง', 'bad'); return; }
    const acts = m.acts.filter(q => String(q.name).trim()).map(q => ({ name: String(q.name).trim(), amt: Number(q.amt) || 0 }));
    const cur = S.ref.get('honda_pay') || { v: {} }, v = { ...(cur.v || {}) }, o = { ...(v[m.vin] || {}) }, ch = [];
    const old = { opt: o.opt_adj || o.opt || (rptAll()[m.vin] || {}).opt || '', amt: Number(o.amt) || 0, acts: (o.acts || []) };
    const nOpt = fixTh(m.opt || '').trim();
    if (nOpt !== fixTh(old.opt)) ch.push({ f: 'ทางเลือกที่ Honda จ่าย', old: old.opt, new: nOpt });
    if (amt !== old.amt) ch.push({ f: 'เงินทางเลือก', old: money(old.amt), new: money(amt) });
    const fa = l => l.map(q => q.name + ' ' + money(q.amt)).join(', ');
    if (fa(old.acts) !== fa(acts)) ch.push({ f: 'แคมเปญพิเศษ', old: fa(old.acts), new: fa(acts) });
    const cidChg = !!(a && d && m.cid && m.cid !== d.campaign_id), marg = !!(d && m.setMargin && Math.abs((Number(d.margin_honda) || 0) - amt) >= 1);
    if (!ch.length && !cidChg && !marg) { toast('ไม่มีอะไรเปลี่ยน', 'bad'); return; }
    if (ch.length) {
      const per = o.per || rptMonth(m.rep);
      Object.assign(o, { br: o.br || m.br, per, model: o.model || (rptAll()[m.vin] || {}).name || '', camp: o.camp || (rptAll()[m.vin] || {}).camp || '', opt_adj: nOpt, opt: o.opt || nOpt, amt, acts, hist: [...(o.hist || []), { ...actor(), reason: why || null, changes: ch }].slice(-50) });
      v[m.vin] = o;
      if (!(await write('ref', 'honda_pay', { ...cur, v }))) return;
    }
    if (cidChg) { if (!(await rptApplyCamp(a, m.cid, locked ? 'แอดมินแก้หลังส่งมอบ (รายงานสรุปแคมเปญ)' : 'แอดมินแก้ (รายงานสรุปแคมเปญ)', why, marg ? { margin_honda: String(amt) } : undefined, null))) return; }
    else if (marg) {
      const x = termsCtxAt(a, derive()), vals = termsRecord(x, { ...d, margin_honda: String(amt), margin_priv: '' }, d.paint || 0);
      if (!(await saveFlow(a, { deal: { ...d, ...vals, ...actor(), how: locked ? 'แอดมินแก้หลังส่งมอบ (รายงานสรุปแคมเปญ)' : 'แอดมินแก้ (รายงานสรุปแคมเปญ)', why: why || null, hist: [...(d.hist || []), dealOld(d)] } }, 'ปรับเงินช่วย Honda แล้ว'))) return;
    }
    toast('บันทึกแล้ว เก็บประวัติแก้ไขแล้ว'); S.modal = null; render();
  }
});

// ---------- back-office: every change to campaign / sale terms / reward money, for the executives
function moneyHistEvents(D) {
  const ev = [];
  const L = { price: 'ราคารถ', disc: 'ส่วนลด', down: 'ดาวน์', down_disc: 'ส่วนลดดาวน์', fin_amount: 'ยอดจัด', rate: 'ดอกเบี้ย', term: 'งวด', campaign: 'แคมเปญ', margin_car: 'Margin รถ', margin_at: 'Margin AT', margin_honda: 'เงินช่วย Honda', margin_priv: 'Margin สิทธิพิเศษ', privileges: 'สิทธิพิเศษ' };
  const f = (k, val) => val === null || val === undefined || val === '' ? '–' : ['campaign', 'privileges', 'rate', 'term'].includes(k) ? String(val) : money(val);
  for (const a of D.at) {
    const d = a.rec && a.rec.deal; if (!d || !(d.hist || []).length) continue;
    const chain = [...d.hist, d];
    for (let i = 1; i < chain.length; i++) {
      const o = chain[i - 1], n = chain[i], changes = Object.keys(L).filter(k => (o[k] ?? null) !== (n[k] ?? null)).map(k => ({ f: L[k], old: f(k, o[k]), new: f(k, n[k]) }));
      if (!changes.length) continue;
      ev.push({ at: n.at, by: n.by, role: n.role, kind: 'เงื่อนไขขาย', vin: String(atVin(a) || '').toUpperCase(), cust: a.cust, br: a.br, reason: n.why || n.how || '', how: n.how || '', changes, post: !!(a.flow && a.flow.done && a.flow.done.delivered) });
    }
  }
  Object.entries(rptPayAll()).forEach(([vin, p]) => (p.hist || []).forEach(h => ev.push({ at: h.at, by: h.by, role: h.role, kind: 'เงินรางวัล Honda', vin, cust: '', br: p.br, reason: h.reason || '', how: '', changes: h.changes || [] })));
  Object.entries(rptAll()).forEach(([vin, r]) => (r.prev || []).forEach(h => ev.push({ at: h.at || r.at, by: h.by, role: h.role, kind: 'ทางเลือกตามไฟล์ Honda', vin, cust: '', br: r.br, reason: 'ไฟล์ใหม่เปลี่ยนทางเลือก', how: '', changes: [{ f: 'ทางเลือก', old: h.opt || '–', new: r.opt || '–' }] })));
  ['camp', 'margin'].forEach(k => (cdbDoc(k).log || []).filter(h => (h.changes || []).length).forEach(h => ev.push({ at: h.at, by: h.by, role: h.role, kind: 'ตารางแคมเปญ', vin: '–', cust: k === 'camp' ? 'แคมเปญ Honda' : 'Margin มาตรฐาน', br: '', reason: h.act, how: '', changes: h.changes })));
  return ev.sort((x, y) => (y.at || '').localeCompare(x.at || ''));
}
function moneyHistFiltered(D) {
  const F = S.filters, q = String(F.mhQ || '').trim().toLowerCase();
  return moneyHistEvents(D).filter(e => (!F.mhBr || e.br === F.mhBr) && (!F.mhFrom || (e.at || '').slice(0, 10) >= F.mhFrom) && (!F.mhTo || (e.at || '').slice(0, 10) <= F.mhTo) && (!F.mhKind || e.kind === F.mhKind) &&
    (!q || [e.vin, e.cust, e.reason, e.how, S.profiles[e.by] || '', e.role].join(' ').toLowerCase().includes(q)));
}
function adminMoney(D) {
  const F = S.filters, ev = moneyHistFiltered(D);
  return `<div class="flex flex-wrap items-end gap-2 mb-3">
    <div class="field"><label for="mh-from">ตั้งแต่</label><input id="mh-from" type="date" data-filter="mhFrom" value="${esc(F.mhFrom || '')}"></div>
    <div class="field"><label for="mh-to">ถึง</label><input id="mh-to" type="date" data-filter="mhTo" value="${esc(F.mhTo || '')}"></div>
    <div class="field"><label for="mh-br">สาขา</label><select id="mh-br" data-filter="mhBr"><option value="">ทุกสาขา</option>${Object.keys(BR).map(b => `<option value="${esc(b)}" ${F.mhBr === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
    <div class="field"><label for="mh-kind">ประเภท</label><select id="mh-kind" data-filter="mhKind"><option value="">ทั้งหมด</option>${['เงื่อนไขขาย', 'เงินรางวัล Honda', 'ทางเลือกตามไฟล์ Honda', 'ตารางแคมเปญ'].map(k => `<option ${F.mhKind === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
    <div class="field flex-1 min-w-[160px]"><label for="mh-q">ค้นหา VIN / ลูกค้า / ผู้แก้ / เหตุผล</label><input id="mh-q" data-filter="mhQ" value="${esc(F.mhQ || '')}" autocomplete="off"></div>
    <button class="btn btn-ghost" data-act="mh-export" ${ev.length ? '' : 'disabled'}>ดาวน์โหลด Excel (${ev.length})</button></div>
  <div class="text-xs text-muted mb-2">ประวัติทุกการแก้เกี่ยวกับแคมเปญ / เงื่อนไขการขาย / เงินรางวัล · ${ev.length} รายการ</div>
  <div class="bg-surface border border-line rounded-lg divide-y divide-line">${ev.slice(0, 300).map(e => `<div class="p-3 md:px-4 text-sm"><div class="flex flex-wrap gap-x-4 gap-y-1"><span class="num text-muted w-32">${fmtDT(e.at)}</span><span>${who(e)}</span><span>${chip(e.kind, 'neutral')}</span>${e.post ? chip('หลังส่งมอบ', 'warn') : ''}<span class="code">${esc(e.vin)}</span><span class="text-muted">${esc(e.cust || '')} ${esc(e.br || '')}</span></div>
    <div class="mt-1">${e.changes.map(c => `${esc(c.f)}: ${esc(c.old)} → <b>${esc(c.new)}</b>`).join(' · ')}</div>${e.reason ? `<div class="text-xs text-muted">เหตุผล/วิธี: ${esc(e.reason)}</div>` : ''}</div>`).join('') || emptyBox('ยังไม่มีประวัติแก้ไข', 'ทุกการแก้แคมเปญ เงื่อนไขขาย และเงินรางวัลจะเก็บไว้ที่นี่')}</div>${ev.length > 300 ? '<p class="text-xs text-muted mt-2">แสดง 300 รายการล่าสุด · ดาวน์โหลด Excel เพื่อดูทั้งหมด</p>' : ''}`;
}
Object.assign(ACTIONS, {
  'mh-export'() {
    const ev = moneyHistFiltered(derive());
    const head = ['วันเวลา', 'ผู้แก้', 'บทบาท', 'ประเภท', 'VIN', 'ลูกค้า', 'สาขา', 'หลังส่งมอบ', 'รายการที่เปลี่ยน', 'เหตุผล/วิธี'];
    (async () => { try { const X = await loadXLSX(), wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([head, ...ev.map(e => [e.at, S.profiles[e.by] || '', e.role || '', e.kind, e.vin, e.cust, e.br, e.post ? 'ใช่' : '', e.changes.map(c => `${c.f}: ${c.old} → ${c.new}`).join(' | '), e.reason || e.how])]), 'ประวัติแก้ไข'); await docSave('ประวัติแก้ไขเงิน-แคมเปญ.xlsx', new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' })); } catch (e) { toast('ดาวน์โหลดไม่สำเร็จ', 'bad'); } })();
  }
});
