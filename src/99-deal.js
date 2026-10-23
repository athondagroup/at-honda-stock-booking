// ---------- the deal in the finance step (24/10): price, discounts, down payment, amount financed, rate, term
// the sales keys it once; after that only the branch admin, the manager or the executive can change it (history kept)
// the PO cannot change once the car is delivered (in this web or in the IDS DL file)
function poLocked(a) { const fl = a.flow || {}; return !!(fl.done && fl.done.delivered) || !!fl.lateUpdate || !!fl.history || !!a.done; }
function dealAdmin(a) { return perms().write && ((S.role.role === 'admin' && a.br === S.role.branch) || canApproveBr(a.br)); }
function dealLabel(k) { return ({ price: 'ราคารถ (ราคาเต็ม)', disc: 'ส่วนลดราคารถ', down: 'เงินดาวน์', down_disc: 'ส่วนลดดาวน์', fin_amount: 'ยอดจัด', rate: 'ดอกเบี้ย (% ต่อปี)', term: 'จำนวนงวด (เดือน)' })[k]; }
function dealKeys(r) { return isCash(r) ? ['price', 'disc'] : ['price', 'disc', 'down', 'down_disc', 'fin_amount', 'rate', 'term']; }
function dealMonthly(v) {
  const amt = num(v.fin_amount), rate = Number(v.rate), term = parseInt(v.term, 10);
  if (!amt || !term || !(rate >= 0)) return null;
  return Math.round(amt * (1 + rate / 100 * term / 12) / term);
}
function dealCalc(v, cash) {
  const net = num(v.price) - num(v.disc);
  const downNet = num(v.down) - num(v.down_disc);
  const out = [['ราคาหลังหักส่วนลด', money(net)]];
  if (!cash) {
    if (num(v.down)) out.push(['ดาวน์หลังหักส่วนลด', money(downNet)]);
    const mo = dealMonthly(v); if (mo) out.push(['ค่างวดโดยประมาณ (ดอกเบี้ยคงที่)', `${money(mo)} บาท / เดือน`]);
  }
  return out;
}
function dealBox(a, m) {
  const r = a.rec, d = r.deal, cash = isCash(r), keys = dealKeys(r);
  const first = !(d && d.at), mayFirst = first && perms().write && canEditBooking(a) && !a.cancelled;
  const mayEdit = !first && dealAdmin(a) && !a.cancelled && !(a.flow && a.flow.done.confirmed);
  const editing = m.deal && (mayFirst || (mayEdit && m.dealEdit));
  const title = `<div class="font-medium text-sm">${cash ? 'ราคารถ (ซื้อสด)' : 'ราคารถและเงื่อนไขไฟแนนซ์'}</div>`;
  if (!editing) {
    if (first) return mayFirst ? `<div class="mt-2 p-3 rounded-lg border border-line">${title}<div class="text-sm text-muted mt-1">ยังไม่ได้กรอก ${cash ? 'ราคารถและส่วนลด' : 'ราคารถ ส่วนลด ดาวน์ ยอดจัด ดอกเบี้ย และจำนวนงวด'} · ใบสำคัญรับส่วนลดจะดึงตัวเลขจากตรงนี้</div>
      <button class="btn btn-dark btn-sm mt-2" data-act="deal-open" data-id="${esc(a.id)}">กรอกราคารถ</button></div>` : '';
    const rows = keys.filter(k => d[k] !== null && d[k] !== undefined && d[k] !== '').map(k => [dealLabel(k), k === 'rate' ? `${d[k]} %` : k === 'term' ? `${d[k]} งวด` : money(d[k])]);
    const hist = d.hist || [];
    return `<div class="mt-2 p-3 rounded-lg border border-line">${title}
      <table class="tbl text-sm mt-1"><tbody>${[...rows, ...dealCalc(d, cash)].map(([k, v]) => `<tr><td class="text-muted nowrap">${k}</td><td class="num">${esc(v)}</td></tr>`).join('')}</tbody></table>
      <div class="text-xs text-muted mt-1">กรอกโดย ${who(d.first || d)} ${fmtDT((d.first || d).at)}${hist.length ? ` · แก้ไขล่าสุด ${who(d)} ${fmtDT(d.at)} (แก้ไข ${hist.length} ครั้ง)` : ''}</div>
      ${mayEdit ? `<button class="btn btn-ghost btn-sm mt-2" data-act="deal-open" data-id="${esc(a.id)}">แก้ไขราคา / เงื่อนไข</button>` : (!first && canEditBooking(a) && !dealAdmin(a) ? '<div class="text-xs text-muted mt-1">ต้องการแก้ตัวเลข แจ้งแอดมินสาขาหรือผู้จัดการ</div>' : '')}
      ${hist.length ? `<details class="mt-1"><summary class="text-xs cursor-pointer">ประวัติการแก้ไข</summary>${hist.slice().reverse().map(h => `<div class="text-xs text-muted">· ${fmtDT(h.at)} ${who(h)}: ${keys.filter(k => h[k] !== undefined && h[k] !== null && h[k] !== '').map(k => `${dealLabel(k).replace(/ \(.*\)/, '')} ${k === 'rate' || k === 'term' ? h[k] : money(h[k])}`).join(' · ')}</div>`).join('')}</details>` : ''}</div>`;
  }
  const v = m.deal, F = k => `<div class="field"><label for="dl-${k}" ${k === 'price' ? 'class="req"' : ''}>${dealLabel(k)}</label><input id="dl-${k}" type="number" min="0" ${k === 'rate' ? 'step="0.01" max="30"' : k === 'term' ? 'step="1" max="120"' : 'step="100"'} inputmode="decimal" data-modal="deal.${k}" value="${esc(v[k] ?? '')}"></div>`;
  const net = num(v.price) - num(v.disc) - num(v.down);
  const hint = !cash && num(v.price) && num(v.down) && num(v.fin_amount) && Math.abs(net - num(v.fin_amount)) >= 1 ? `<div class="text-xs mt-1" style="color:var(--warn)">ราคาหลังส่วนลด − ดาวน์ = ${money(net)} บาท ไม่เท่ากับยอดจัดที่ใส่ ตรวจอีกครั้ง (ถ้ามีรวมประกันหรือค่าอื่นในยอดจัด ใช้ได้)</div>` : '';
  return `<div class="mt-2 p-3 rounded-lg border border-line" style="background:var(--surface-2)">${title}
    <div class="grid sm:grid-cols-3 gap-3 mt-2">${keys.map(F).join('')}</div>
    <table class="tbl text-sm mt-2"><tbody>${dealCalc(v, cash).map(([k, x]) => `<tr><td class="text-muted nowrap">${k}</td><td class="num">${esc(x)}</td></tr>`).join('')}</tbody></table>${hint}
    <div class="text-xs text-muted mt-1">${first ? 'บันทึกครั้งแรกแล้ว เซลล์แก้เองไม่ได้ ถ้าต้องแก้ แอดมินสาขาหรือผู้จัดการเป็นคนแก้' : 'แก้ไขโดยแอดมินขึ้นไป ระบบเก็บตัวเลขเดิมไว้ในประวัติ'}</div>
    <div class="flex gap-2 mt-2"><button class="btn btn-dark btn-sm" data-act="deal-save" data-id="${esc(a.id)}">บันทึก</button><button class="btn btn-ghost btn-sm" data-act="deal-close">ยกเลิก</button></div></div>`;
}
// the commission form starts from the deal numbers (comm values the sales typed win)
function commDeal(a) {
  const dl = a.rec.deal || {}; if (!dl.at) return {};
  const o = { price: dl.price, discount: (num(dl.disc) + num(dl.down_disc)) || null, down: dl.down, fin_amount: dl.fin_amount, rate: dl.rate, term: dl.term };
  return Object.fromEntries(Object.entries(o).filter(([, x]) => x !== null && x !== undefined));
}
function dealCheck(v, keys) {
  for (const k of keys) {
    const x = v[k];
    if (x === '' || x === null || x === undefined) { if (k === 'price') return { err: 'ใส่ราคารถ', id: 'dl-price' }; continue; }
    const n = Number(x);
    if (!isFinite(n) || n < 0) return { err: `${dealLabel(k)} ต้องเป็นตัวเลข`, id: 'dl-' + k };
    if (k === 'rate' && n > 30) return { err: 'ดอกเบี้ยเกิน 30% ตรวจอีกครั้ง', id: 'dl-rate' };
    if (k === 'term' && (n < 1 || n > 120 || n !== Math.round(n))) return { err: 'จำนวนงวดต้องเป็นจำนวนเต็ม 1–120', id: 'dl-term' };
  }
  if (num(v.disc) > num(v.price)) return { err: 'ส่วนลดมากกว่าราคารถ', id: 'dl-disc' };
  if (num(v.down_disc) > num(v.down) && num(v.down)) return { err: 'ส่วนลดดาวน์มากกว่าเงินดาวน์', id: 'dl-down_disc' };
  return {};
}
Object.assign(ACTIONS, {
  'deal-open'(el) {
    const a = atById(el.dataset.id); if (!a) return;
    const d = a.rec.deal || {}, cm = a.rec.comm || {}, r = a.rec;
    // a first entry starts from what the booking or the commission data already has
    S.modal.deal = d.at ? Object.fromEntries(dealKeys(r).map(k => [k, d[k] ?? ''])) : { price: num(cm.price) || num(r.price) || '', disc: num(r.discount) || '', down: num(cm.down) || '', down_disc: '', fin_amount: num(cm.fin_amount) || '', rate: cm.rate ?? '', term: cm.term ?? '' };
    S.modal.dealEdit = true; render();
  },
  'deal-close'() { S.modal.deal = null; S.modal.dealEdit = false; render(); },
  async 'deal-save'(el) {
    const a = atById(el.dataset.id), v = S.modal.deal; if (!a || !v) return;
    const prev = a.rec.deal, first = !(prev && prev.at);
    if (first ? !(perms().write && canEditBooking(a)) : !dealAdmin(a)) { toast('แก้ราคาและเงื่อนไขได้เฉพาะแอดมินสาขาหรือผู้จัดการ', 'bad'); return; }
    const keys = dealKeys(a.rec), ck = dealCheck(v, keys);
    if (ck.err) { toast(ck.err, 'bad'); if (ck.id) $('#' + ck.id)?.focus(); return; }
    const vals = Object.fromEntries(keys.map(k => [k, v[k] === '' || v[k] === undefined ? null : (k === 'rate' ? Number(v[k]) : k === 'term' ? parseInt(v[k], 10) : num(v[k]))]));
    if (!first && keys.every(k => (prev[k] ?? null) === vals[k])) { S.modal.deal = null; S.modal.dealEdit = false; render(); return; }
    const old = first ? null : Object.fromEntries([...keys, 'at', 'by', 'role'].map(k => [k, prev[k] ?? null]));
    const rec = { ...vals, ...actor(), cash: isCash(a.rec), first: first ? actor() : prev.first || { at: prev.at, by: prev.by, role: prev.role }, hist: first ? [] : [...(prev.hist || []), old] };
    if (await saveFlow(a, { deal: rec }, first ? 'บันทึกราคารถแล้ว' : 'แก้ไขราคา / เงื่อนไขแล้ว')) { S.modal.deal = null; S.modal.dealEdit = false; render(); }
  },
  async 'po-skip'(el) {
    const a = atById(el.dataset.id); if (!a) return;
    if (!stepAllowed(a, 'po') || a.flow.next !== 'po' || poLocked(a)) { toast('ข้าม PO ได้ตอนที่ขั้นถัดไปคือ PO สั่งแต่ง', 'bad'); return; }
    await saveFlow(a, { flow: { po_skip: { ...actor() } } }, 'ข้าม PO ไว้ก่อนแล้ว ทำ PO ภายหลังได้จนถึงก่อนส่งมอบ');
  }
});
