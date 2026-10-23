// ---------- the sale terms in the finance step (24/10): price, discounts, down, instalments, campaign, margin
// Keyed on the booking (Google Form bookings: here, the first time, by the sales). After that the sales may change
// them once more, when the finance is approved (cash: before delivery), and the branch admin or a manager approves;
// the branch admin, the managers and the executive change them directly. Every change keeps the old values.
// The PO cannot change once the car is delivered (in this web or in the IDS DL file).
// Only function declarations here: the first render runs before this part of the file.
function poLocked(a) { const fl = a.flow || {}; return !!(fl.done && fl.done.delivered) || !!fl.lateUpdate || !!fl.history || !!a.done; }
function dealAdmin(a) { return perms().write && ((S.role.role === 'admin' && a.br === S.role.branch) || canApproveBr(a.br)); }
function dealMonthly(v) {
  const amt = num(v.fin_amount), rate = Number(v.rate), term = parseInt(v.term, 10);
  if (!amt || !term || !(rate >= 0)) return null;
  return Math.round(amt * (1 + rate / 100 * term / 12) / term);
}
// the car price comes from the web price list (model + grade + colour, as the booking price);
// the colour surcharge is split out because the margin is worked out on the price without it (23/10)
function dealWeb(a, D) {
  const p = bookPrice(a, D); if (!p || !p.price) return null;
  const v = atVin(a), car = v && D ? carAny(v, D) : null;
  const q = priceOf(a.model, a.grade, a.color, (car && car.year) || a.rec.list_price_year || null, carOldPrice(car) || !!a.rec.price_old);
  const paint = q && q.exact && q.extra > 0 && q.extra < p.price ? q.extra : 0;
  return { price: Number(p.price), src: p.src, paint, base: Number(p.price) - paint };
}
// who may do what with the terms of this booking
function dealState(a) {
  // after the manager confirmed for commission the sales cannot change anything; the admin and up still can (23/10)
  const d = a.rec.deal || {}, fl = a.flow || {}, conf = !!(fl.done && fl.done.confirmed), live = !a.cancelled && perms().write, open = live && !conf;
  const first = !d.at, admin = live && dealAdmin(a), own = open && canEditBooking(a);
  const reqOpen = !!(d.req && d.req.at);
  const salesWindow = isCash(a.rec) || !!(fl.done && fl.done.fin);
  return { d, first, admin, mayFirst: first && (own || admin), mayAdmin: !first && admin, mayReq: !first && own && !admin && !reqOpen && !d.sales_edit && salesWindow && !poLocked(a),
    usedReq: !!d.sales_edit, reqOpen, salesWindow };
}
function dealRows(d, cash) {
  const r = [['ราคารถ (ราคาเต็ม)', money(d.price)], ['ส่วนลดราคารถ', money(d.disc)]];
  if (!cash) r.push(['เงินดาวน์', money(d.down)], ['ส่วนลดดาวน์', money(d.down_disc)], ['ยอดจัด', money(d.fin_amount)], ['ดอกเบี้ย', d.rate !== null && d.rate !== undefined ? d.rate + ' %' : '–'], ['จำนวนงวด', d.term ? d.term + ' งวด' : '–']);
  const mo = cash ? null : dealMonthly(d); if (mo) r.push(['ค่างวดโดยประมาณ', `${money(mo)} บาท / เดือน`]);
  if (d.paint) r.push(['ค่าสี', money(d.paint)]);
  r.push(['แคมเปญ Honda', d.campaign || '–'], ['Margin รถ', money(d.margin_car)]);
  if (!cash) r.push([`AT แคมเปญ${d.at_step ? ` (Step ช่อง ${d.at_step})` : ''}`, money(d.margin_at)]);
  r.push(['Honda แคมเปญ', money(d.margin_honda)], ['รวม Margin', money(d.margin)]);
  return r;
}
function dealDiff(old, nw) {
  const L = { price: 'ราคารถ', disc: 'ส่วนลด', down: 'ดาวน์', down_disc: 'ส่วนลดดาวน์', fin_amount: 'ยอดจัด', rate: 'ดอกเบี้ย', term: 'งวด', campaign: 'แคมเปญ', margin_car: 'Margin รถ', margin_at: 'AT แคมเปญ', margin_honda: 'Honda แคมเปญ', margin: 'รวม Margin' };
  return Object.keys(L).filter(k => (old[k] ?? null) !== (nw[k] ?? null)).map(k => `${L[k]} ${k === 'campaign' || k === 'rate' || k === 'term' ? esc(old[k] ?? '–') : money(old[k])} → <b>${k === 'campaign' || k === 'rate' || k === 'term' ? esc(nw[k] ?? '–') : money(nw[k])}</b>`);
}
function dealBox(a, m, D) {
  const cash = isCash(a.rec), st = dealState(a), d = st.d, x = termsCtxAt(a, D), web = dealWeb(a, D);
  const title = `<div class="font-medium text-sm">เงื่อนไขการขาย (${cash ? 'ซื้อสด' : 'ไฟแนนซ์'})</div>`;
  const editing = m.deal && m.dealMode && ((m.dealMode === 'first' && st.mayFirst) || (m.dealMode === 'admin' && st.mayAdmin) || (m.dealMode === 'req' && st.mayReq));
  if (editing) {
    const lockPrice = !!web && !st.admin;
    const v = { ...m.deal, ...(lockPrice ? { price: web.price } : {}) };
    const paint = web && num(v.price) === web.price ? web.paint : 0;
    const priceNote = web ? `ดึงจากราคาในเว็บ (${esc(web.src)})${web.paint ? ` · รวมค่าสี ${money(web.paint)}` : ''}${!lockPrice && num(v.price) && num(v.price) !== web.price ? ` · <b style="color:var(--warn)">ไม่ตรงราคาในเว็บ ${money(web.price)}</b>` : ''}` : 'ยังไม่มีราคารุ่น/เกรด/สีนี้ในเว็บ ใส่เอง';
    const note = m.dealMode === 'first' ? 'บันทึกแล้ว เซลล์ขอแก้ได้อีก 1 ครั้งตอนไฟแนนซ์ผ่าน (แอดมินสาขาหรือผู้จัดการอนุมัติ)'
      : m.dealMode === 'req' ? 'ขอแก้ได้ครั้งเดียว · ส่งแล้วรอแอดมินสาขาหรือผู้จัดการอนุมัติ ตัวเลขเดิมยังใช้อยู่จนกว่าจะอนุมัติ' : 'แอดมินขึ้นไปแก้ได้เลย ระบบเก็บตัวเลขเดิมไว้ในประวัติ';
    return `<div class="mt-2 p-3 rounded-lg border border-line" style="background:var(--surface-2)">${title}<div class="mt-2">
      ${termsFields(x, v, { attr: 'data-modal', pre: 'deal', idp: 'dl', paint, priceDisc: true, lockPrice, priceNote })}</div>
      ${m.dealMode === 'req' ? `<div class="field mt-2"><label for="dl-why" class="req">เหตุผลที่ขอแก้</label><input id="dl-why" data-modal="dealWhy" value="${esc(m.dealWhy || '')}" autocomplete="off" placeholder="เช่น ไฟแนนซ์อนุมัติดาวน์ 25%"></div>` : ''}
      <div class="text-xs text-muted mt-2">${note}</div>
      <div class="flex gap-2 mt-2"><button class="btn btn-dark btn-sm" data-act="deal-save" data-id="${esc(a.id)}">${m.dealMode === 'req' ? 'ส่งขอแก้ไข' : 'บันทึก'}</button><button class="btn btn-ghost btn-sm" data-act="deal-close">ยกเลิก</button></div></div>`;
  }
  if (st.first) return st.mayFirst ? `<div class="mt-2 p-3 rounded-lg border border-line">${title}<div class="text-sm text-muted mt-1">ยังไม่ได้ใส่ราคา ส่วนลด ${cash ? '' : 'ดาวน์ ผ่อน '}แคมเปญ และ Margin (ใบจองจาก Google Form ใส่ที่นี่) · ใบสำคัญรับส่วนลดและค่าคอมใช้ตัวเลขชุดนี้</div>
      <button class="btn btn-dark btn-sm mt-2" data-act="deal-open" data-mode="first" data-id="${esc(a.id)}">ใส่เงื่อนไขการขาย</button></div>` : '';
  const hist = d.hist || [], req = d.req;
  return `<div class="mt-2 p-3 rounded-lg border border-line">${title}
    <table class="tbl text-sm mt-1"><tbody>${dealRows(d, cash).map(([k, v]) => `<tr><td class="text-muted nowrap">${k}</td><td class="${k === 'แคมเปญ Honda' ? '' : 'num'}">${esc(v)}</td></tr>`).join('')}</tbody></table>
    <div class="text-xs text-muted mt-1">ใส่โดย ${who(d.first || d)} ${fmtDT((d.first || d).at)}${d.src ? ` (${esc(d.src)})` : ''}${hist.length ? ` · แก้ไขล่าสุด ${who(d)} ${fmtDT(d.at)} (แก้ไข ${hist.length} ครั้ง)` : ''}${st.usedReq ? ' · เซลล์ใช้สิทธิ์ขอแก้ไขแล้ว' : ''}</div>
    ${!d.campaign_id ? `<div class="mt-2 p-2 rounded-lg text-sm" style="background:var(--warn-soft)">ยังไม่ได้เลือกแคมเปญและ Margin (ใส่ไว้ก่อนมีช่องนี้)${st.admin ? ' · กด "แก้ไขเงื่อนไข" เพื่อใส่ให้ครบ' : ' · แจ้งแอดมินสาขาหรือผู้จัดการให้ใส่ หรือกดขอแก้ไข'}</div>` : ''}
    ${req && req.at ? `<div class="mt-2 p-2 rounded-lg text-sm" style="background:var(--warn-soft)"><b>เซลล์ขอแก้ไข รออนุมัติ</b> · ${who(req)} ${fmtDT(req.at)}${req.why ? ` · เหตุผล: ${esc(req.why)}` : ''}
      <div class="mt-1">${dealDiff(d, req.vals).join(' · ') || 'ไม่มีตัวเลขเปลี่ยน'}</div>
      ${st.admin ? `<div class="flex gap-2 mt-2"><button class="btn btn-red btn-sm" data-act="deal-approve" data-id="${esc(a.id)}">อนุมัติ</button><button class="btn btn-ghost btn-sm" data-act="deal-reject" data-id="${esc(a.id)}">ไม่อนุมัติ</button></div>` : '<div class="text-xs mt-1">รอแอดมินสาขาหรือผู้จัดการอนุมัติ</div>'}</div>` : ''}
    <div class="flex flex-wrap gap-2 mt-2">${st.mayAdmin ? `<button class="btn btn-ghost btn-sm" data-act="deal-open" data-mode="admin" data-id="${esc(a.id)}">แก้ไขเงื่อนไข</button>` : ''}
      ${st.mayReq ? `<button class="btn btn-ghost btn-sm" data-act="deal-open" data-mode="req" data-id="${esc(a.id)}">ขอแก้ไขเงื่อนไข (เหลือ 1 ครั้ง · แอดมินอนุมัติ)</button>` : ''}</div>
    ${!st.admin && canEditBooking(a) && !st.reqOpen && !st.mayReq && !poLocked(a) ? `<div class="text-xs text-muted mt-1">${st.usedReq ? 'ใช้สิทธิ์ขอแก้ไขครบแล้ว ต้องแก้อีก แจ้งแอดมินสาขาหรือผู้จัดการ' : !st.salesWindow ? 'ขอแก้ไขได้ 1 ครั้งเมื่อไฟแนนซ์ผ่าน' : ''}</div>` : ''}
    ${hist.length ? `<details class="mt-1"><summary class="text-xs cursor-pointer">ประวัติการแก้ไข</summary>${hist.slice().reverse().map(h => `<div class="text-xs text-muted">· ${fmtDT(h.at)} ${who(h)}${h.how ? ` (${esc(h.how)})` : ''}: ราคา ${money(h.price)} · ส่วนลด ${money(h.disc)}${h.down !== null && h.down !== undefined ? ` · ดาวน์ ${money(h.down)} · ${h.rate ?? '–'}% ${h.term ?? '–'} งวด` : ''} · ${esc(h.campaign || '–')} · Margin ${money(h.margin)}</div>`).join('')}</details>` : ''}</div>`;
}
// the commission and the discount receipt read these
function commDeal(a) {
  const dl = a.rec.deal || {}; if (!dl.at) return {};
  const o = { price: dl.price, discount: dl.disc, down: dl.down, down_disc: dl.down_disc, fin_amount: dl.fin_amount, rate: dl.rate, term: dl.term, campaign: dl.campaign, margin: dl.margin, margin_car: dl.margin_car, margin_at: dl.margin_at, margin_honda: dl.margin_honda };
  return Object.fromEntries(Object.entries(o).filter(([, x]) => x !== null && x !== undefined));
}
function dealOld(d) { return Object.fromEntries(['price', 'disc', 'down', 'down_disc', 'fin_amount', 'rate', 'term', 'campaign_id', 'campaign', 'campaign_text', 'camp_month', 'at_step', 'margin_car', 'margin_at', 'margin_honda', 'margin', 'paint', 'at', 'by', 'role', 'how'].map(k => [k, d[k] ?? null])); }
Object.assign(ACTIONS, {
  'deal-open'(el) {
    const a = atById(el.dataset.id); if (!a) return;
    const d = a.rec.deal || {}, cm = a.rec.comm || {}, r = a.rec, web = dealWeb(a, derive());
    const keep = ['price', 'disc', 'down', 'down_disc', 'rate', 'term', 'campaign_id', 'campaign_text', 'at_step', 'margin_car', 'margin_at', 'margin_honda'];
    // a first entry starts from what the booking or the old commission data already has
    S.modal.deal = d.at ? Object.fromEntries(keep.map(k => [k, d[k] ?? ''])) : { price: (web && web.price) || num(cm.price) || num(r.price) || '', disc: num(r.discount) || num(cm.discount) || '', down: num(cm.down) || '', down_disc: num(cm.down_disc) || '', rate: cm.rate ?? '', term: cm.term ?? '', campaign_id: '', at_step: '' };
    S.modal.dealMode = el.dataset.mode || 'first'; S.modal.dealWhy = ''; render();
  },
  'deal-close'() { S.modal.deal = null; S.modal.dealMode = null; render(); },
  async 'deal-save'(el) {
    const a = atById(el.dataset.id), v = S.modal.deal, mode = S.modal.dealMode; if (!a || !v) return;
    const D = derive(), st = dealState(a), prev = st.d;
    if (!((mode === 'first' && st.mayFirst) || (mode === 'admin' && st.mayAdmin) || (mode === 'req' && st.mayReq))) { toast('แก้เงื่อนไขไม่ได้ในขั้นนี้', 'bad'); return; }
    const x = termsCtxAt(a, D), web = dealWeb(a, D);
    if (web && !st.admin) v.price = web.price;
    const ck = termsCheck(x, v); if (ck.err) { toast(ck.err, 'bad'); $('#dl-' + ck.id)?.focus(); return; }
    const paint = web && num(v.price) === web.price ? web.paint : 0;
    const vals = { ...termsRecord(x, v, paint), price_src: web && num(v.price) === web.price ? web.src : 'ใส่เอง', cash: isCash(a.rec) };
    if (mode === 'req') {
      const why = String(S.modal.dealWhy || '').trim(); if (!why) { toast('ใส่เหตุผลที่ขอแก้', 'bad'); $('#dl-why')?.focus(); return; }
      if (await saveFlow(a, { deal: { ...prev, req: { vals, why, ...actor() } } }, 'ส่งขอแก้ไขแล้ว รอแอดมินสาขาหรือผู้จัดการอนุมัติ')) { S.modal.deal = null; S.modal.dealMode = null; render(); }
      return;
    }
    const first = mode === 'first';
    const rec = { ...(first ? {} : prev), ...vals, ...actor(), how: first ? null : 'แอดมินแก้', first: first ? actor() : prev.first || { at: prev.at, by: prev.by, role: prev.role }, hist: first ? [] : [...(prev.hist || []), dealOld(prev)], src: first ? 'ขั้นไฟแนนซ์' : prev.src };
    if (await saveFlow(a, { deal: rec }, first ? 'บันทึกเงื่อนไขการขายแล้ว' : 'แก้ไขเงื่อนไขแล้ว')) { S.modal.deal = null; S.modal.dealMode = null; render(); }
  },
  async 'deal-approve'(el) {
    const a = atById(el.dataset.id); if (!a) return;
    const d = a.rec.deal || {}; if (!dealAdmin(a) || !(d.req && d.req.at)) return;
    const q = d.req;
    const rec = { ...d, ...q.vals, at: new Date().toISOString(), by: q.by, role: q.role, how: `เซลล์ขอแก้ · อนุมัติโดย ${roleLabel()}`, hist: [...(d.hist || []), dealOld(d)], req: null, sales_edit: { ...actor(), asked: q.at, why: q.why } };
    await saveFlow(a, { deal: rec }, 'อนุมัติแล้ว ใช้เงื่อนไขใหม่');
  },
  async 'deal-reject'(el) {
    const a = atById(el.dataset.id); if (!a) return;
    const d = a.rec.deal || {}; if (!dealAdmin(a) || !(d.req && d.req.at)) return;
    // a refused request does not use up the sales' one change
    await saveFlow(a, { deal: { ...d, req: null, rejected: [...(d.rejected || []), { ...d.req, rejected: actor() }] } }, 'ไม่อนุมัติ ใช้เงื่อนไขเดิม');
  },
  async 'po-skip'(el) {
    const a = atById(el.dataset.id); if (!a) return;
    if (!stepAllowed(a, 'po') || a.flow.next !== 'po' || poLocked(a)) { toast('ข้าม PO ได้ตอนที่ขั้นถัดไปคือ PO สั่งแต่ง', 'bad'); return; }
    await saveFlow(a, { flow: { po_skip: { ...actor() } } }, 'ข้าม PO ไว้ก่อนแล้ว ทำ PO ภายหลังได้จนถึงก่อนส่งมอบ');
  }
});
