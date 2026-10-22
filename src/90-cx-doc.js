// ------------------------------------------------------------------ one form for a cancelled booking (ตกลง 19/10)
// "ใบอนุมัติยกเลิกการจอง และขอคืนเงินจอง" replaces the separate cancel form and refund form:
//   1 the booking (with the customer's phone for CR) · 2 the cancel request · 3 the branch manager's approval (in the web)
//   4 the refund account (refund only) · 5 CR's phone check, by hand (refund only) · 6 customer, sales, manager sign
//   7 the executive signs (always on paper). No refund / deposit moved to a new booking: no 4 and no 5.
// When the paper is complete the executive presses "อนุมัติจ่าย" / "อนุมัติ" in the web so the sales knows.
// Each form gets a number CX-<branch>-<yymm>-<nnn> the first time it is printed (kept on the booking).
// Only function declarations here: the first render runs before this part of the file.
function cxCompany(br) { const n = (BR[br] || {}).name; return n ? `บริษัท เอที ฮอนด้า ออโตโมบิล (${n}) จำกัด` : 'บริษัท เอที ฮอนด้า ออโตโมบิล จำกัด'; }
function cxWho(h) { if (!h) return ''; const n = h.by ? S.profiles[h.by] : ''; return n ? `${n} (${h.role || ''})` : h.role || ''; }
function cxWhen(at) { return at ? fmtDT(at) : ''; }
// Thai words for a baht amount, for the refund line
function bahtText(n) {
  n = Math.round(Number(n) || 0); if (!n) return 'ศูนย์บาทถ้วน';
  const D = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'], P = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  const six = x => { const s = String(x); let out = ''; for (let i = 0; i < s.length; i++) { const d = +s[i], pos = s.length - i - 1; if (!d) continue;
    out += (pos === 1 && d === 1) ? 'สิบ' : (pos === 1 && d === 2) ? 'ยี่สิบ' : (pos === 0 && d === 1 && s.length > 1) ? 'เอ็ด' : D[d] + P[pos]; } return out; };
  let out = '', m = n; const parts = []; while (m > 0) { parts.unshift(m % 1000000); m = Math.floor(m / 1000000); }
  parts.forEach((p, i) => { out += six(p) + (i < parts.length - 1 ? 'ล้าน' : ''); });
  return out + 'บาทถ้วน';
}
function cxRefund(a) { const c = a.rec.cancel || {}; return c.refund === 'refund'; }
// the form's number: given once, the next free number of the branch and month
async function cxEnsureNo(a) {
  const c = a.rec.cancel || {}; if (c.doc_no) return c.doc_no;
  const ym = (c.at || new Date().toISOString()).slice(2, 7).replace('-', ''), pre = `CX-${a.br}-${ym}-`;
  let max = 0; for (const r of S.bookings.values()) { const no = r.cancel && r.cancel.doc_no; if (no && no.startsWith(pre)) max = Math.max(max, Number(no.slice(pre.length)) || 0); }
  const no = pre + String(max + 1).padStart(3, '0');
  const r = await saveBk(a.id, 'ออกเลขที่เอกสารยกเลิก', no, x => { if (!x.cancel || x.cancel.doc_no) return false; x.cancel.doc_no = no; }, x => x.status === 'cancelled');
  const now = atById(a.id);
  return (r && r.cancel && r.cancel.doc_no) || (now && now.rec.cancel && now.rec.cancel.doc_no) || no;
}
async function printCancelDoc(a) {
  const no = await cxEnsureNo(a), fresh = atById(a.id) || a;
  const c = fresh.rec.cancel || {}, req = c.req || null, rf = fresh.rec.refund || {}, refund = cxRefund(fresh);
  const to = c.to ? derive().at.find(x => x.id === c.to) : null;
  const res = c.refund === 'refund' ? 'อนุมัติยกเลิก · คืนมัดจำ' : c.refund === 'transfer' ? `อนุมัติยกเลิก · โอนมัดจำไปใบจอง ${to ? `${to.no || ''} ${to.cust || ''}`.trim() : '(ค้างไว้ รอใบจองใหม่)'}` : 'อนุมัติยกเลิก · ไม่คืนมัดจำ';
  const mgrName = cxWho(c);
  const blocks = [
    { sec: 1, h: 'ข้อมูลใบจอง' },
    { kv: [['เลขที่ใบจอง IDS', fresh.no || fresh.rec.booking_no || '', 'วันที่จอง', fmtD(fresh.date)], ['ชื่อผู้จอง', fresh.cust || '', 'เบอร์โทรลูกค้า', c.phone || fresh.rec.phone || ''],
      ['พนักงานขาย', fresh.sales || '', 'สาขา', `${fresh.br} ${(BR[fresh.br] || {}).name || ''}`], ['รุ่นรถ', `${fresh.model || ''} ${fresh.grade || ''}`, 'สี', fresh.color || ''],
      ['เลขที่ใบจองสาขา', fresh.rec.paper_no || '–', 'กำหนดส่งมอบรถ', fresh.rec.delivery_plan ? fmtD(fresh.rec.delivery_plan) : '–'],
      ['เลขที่ใบเสร็จ', fresh.rec.receipt_no || '', 'จำนวนเงินจอง', (fresh.rec.deposit || fresh.deposit) ? money(fresh.rec.deposit || fresh.deposit) + ' บาท' : '–']] },
    { sec: 2, h: 'คำขอถอนจอง / ยกเลิก', by: req ? `ส่งในระบบ ${cxWho(req)} ${cxWhen(req.at)}` : `ผู้จัดการยกเลิกในระบบ ${cxWhen(c.at)}` },
    { kv: [['วันที่ลูกค้าขอ', c.req_date ? fmtD(c.req_date) : '–', 'เหตุผล', c.reason || ''],
      ...((c.fin_tried || []).length ? [['ยื่นไฟแนนซ์ไม่ผ่าน', c.fin_tried.join(', ')]] : []),
      ['รายละเอียด', [req ? c.req_note : c.note].filter(Boolean).join(' · ') || '–'],
      ...cxDocList(c).map(([k, t], i) => [i ? '' : 'เอกสารแนบ (ตรวจจากกระดาษ)', `${(c.docs || {})[k] || (k === 'passbook' && rf.passbook_ok) ? '[✓]' : '[  ]'} ${t}`])] },
    { small: 'เงื่อนไขการถอนจอง: 1. บริษัทขอสงวนสิทธิ์ในการโอนเงิน ตามเลขที่บัญชีในนาม "ชื่อลูกค้า" ที่ระบุในใบจองเท่านั้น  2. เมื่อถอนจองแล้ว บริษัทจะยกเลิกการจองและเงื่อนไขทั้งหมดทันที · ข้าพเจ้าได้รับทราบเงื่อนไขของบริษัทฯ และยืนยันที่จะถอนจอง' },
    { sec: 3, h: 'ผู้จัดการสาขาอนุมัติยกเลิก', by: 'อนุมัติในระบบ' },
    { kv: [['ผล', res, 'ผู้อนุมัติ', `${mgrName} · ${cxWhen(c.at)}`], ['หมายเหตุผู้จัดการ', (req ? c.note : '') || '–']] }
  ];
  let n = 4;
  if (refund) {
    blocks.push({ sec: n++, h: 'ขอคืนเงินจองเข้าบัญชีลูกค้า', by: rf.at ? `กรอกในระบบ ${cxWho(rf)} ${cxWhen(rf.at)}` : 'ยังไม่ได้กรอกบัญชี' },
      { kv: [['ยอดเงินคืน', `${money(c.amount)} บาท (${bahtText(c.amount)})`, 'ธนาคาร', rf.bank === 'อื่น ๆ' ? rf.bank_other || '' : rf.bank || ''],
        ['เลขที่บัญชี', rf.account_no || '', 'ชื่อบัญชี', `${rf.account_name || ''}${rf.account_name && nameOk(rf.account_name, fresh.cust) ? ' ✓ ตรงชื่อผู้จอง' : ''}`]] },
      { sec: n++, h: 'CR โทรตรวจสอบกับลูกค้า' }, { cr: true });
  }
  blocks.push({ sec: n++, h: 'ลายเซ็น' },
    { sign3: [{ t: refund ? 'ลูกค้า (ผู้รับเงิน)' : 'ลูกค้า (ผู้จอง)', name: fresh.cust }, { t: 'พนักงานขาย', name: fresh.sales }, { t: 'ผู้จัดการสาขา', name: (c.by && S.profiles[c.by]) || '' }] },
    { sec: n++, h: refund ? 'ผู้บริหารอนุมัติจ่าย' : 'ผู้บริหารอนุมัติ' },
    { exec: refund ? { ok: 'อนุมัติจ่ายคืนเงินจอง ตามยอดและบัญชีในข้อ 4', foot: 'ส่งฝ่ายบัญชีทำจ่ายเมื่อมีลายเซ็นผู้บริหาร (ไม่ต้องมีลายเซ็นฝ่ายบัญชี)', label: 'ผู้บริหาร (ผู้อนุมัติจ่าย)' }
      : { ok: c.refund === 'transfer' ? 'อนุมัติยกเลิกการจอง (โอนมัดจำไปใบจองใหม่)' : 'อนุมัติยกเลิกการจอง (ไม่คืนมัดจำ)', foot: 'ส่งฝ่ายบัญชีบันทึกยอดมัดจำตามผลอนุมัติ', label: 'ผู้บริหาร (ผู้อนุมัติ)' } },
    ...(refund ? [{ sec: n++, h: 'สำหรับเจ้าหน้าที่ฝ่ายบัญชี (ต้องมีใบลดหนี้แนบเท่านั้น)' }, { acct: true }] : []),
    { small: `เลขที่เอกสารระบบออกให้อัตโนมัติ ใช้อ้างอิงกับบัญชี · เมื่อเอกสารครบ ผู้บริหารกด "${refund ? 'อนุมัติจ่าย' : 'อนุมัติ'}" ในระบบเพื่อแจ้งเซลล์` });
  const title = refund ? 'ใบอนุมัติยกเลิกการจอง และขอคืนเงินจอง' : 'ใบอนุมัติยกเลิกการจอง';
  const spec = { title, compact: true, sub: cxCompany(fresh.br), meta: [`เลขที่เอกสาร ${no}`, `พิมพ์จากระบบ ${fmtDT(new Date().toISOString())}`], blocks };
  openDoc(spec, docName(title, fresh.cust, todayISO()), S.modal && S.modal.kind === 'at' ? { ...S.modal, refund: null } : null);
}
// the executive presses this once the paper form is complete; the sales is told
function cxExecBox(a) {
  const c = a.rec.cancel || {}, refund = cxRefund(a), rf = a.rec.refund || null, ex = c.exec_ok || null;
  const ready = !refund || (rf && rf.at);
  if (ex) return `<div class="mt-2 text-sm" style="color:var(--good)">✓ ผู้บริหาร${refund ? 'อนุมัติจ่ายแล้ว ส่งบัญชีทำจ่าย' : 'อนุมัติแล้ว'} · ${who(ex)} ${fmtDT(ex.at)}${ex.note ? ' · ' + esc(ex.note) : ''}</div>`;
  if (S.role.role === 'exec' && perms().write && ready)
    return `<div class="mt-2 flex flex-wrap gap-2 items-center"><button class="btn btn-red btn-sm" data-act="cx-exec" data-id="${esc(a.id)}">${refund ? 'อนุมัติจ่าย (เอกสารเซ็นครบแล้ว)' : 'อนุมัติ (เอกสารเซ็นครบแล้ว)'}</button><span class="text-xs text-muted">กดเมื่อเอกสารกระดาษเซ็นครบ เซลล์จะได้รับแจ้ง</span></div>`;
  return `<div class="mt-2 text-xs" style="color:var(--warn)">${ready ? 'รอเอกสารเซ็นครบ แล้วผู้บริหารกดอนุมัติ' + (refund ? 'จ่าย' : '') : 'เซลล์กรอกบัญชีคืนเงินก่อน แล้วพิมพ์เอกสาร'}</div>`;
}
Object.assign(ACTIONS, {
  async 'cx-print'(el) { const a = atById(el.dataset.id); if (a && a.cancelled) await printCancelDoc(a); },
  async 'cx-exec'(el) {
    const a = atById(el.dataset.id); if (!a || !a.cancelled || S.role.role !== 'exec') return;
    const refund = cxRefund(a);
    if (!confirm(`${refund ? 'อนุมัติจ่ายคืนเงินจอง' : 'อนุมัติยกเลิก'} ${a.cust}${refund ? ` ${money((a.rec.cancel || {}).amount)} บาท` : ''} (เอกสารเซ็นครบแล้ว)?`)) return;
    const r = await saveBk(a.id, refund ? 'ผู้บริหารอนุมัติจ่ายคืนเงินจอง' : 'ผู้บริหารอนุมัติเอกสารยกเลิก', (a.rec.cancel || {}).doc_no || '', x => { if (!x.cancel || x.cancel.exec_ok) return false; x.cancel.exec_ok = { ...actor() }; }, x => x.status === 'cancelled');
    if (!r) return;
    if (window.__WEB && window.__WEB.tgText) window.__WEB.tgText({ text: `${refund ? '💰 ผู้บริหารอนุมัติจ่ายคืนเงินจองแล้ว' : '✅ ผู้บริหารอนุมัติเอกสารยกเลิกแล้ว'}\n${a.cust} · ${a.model} ${a.grade || ''} · เซลล์ ${a.sales || ''} · สาขา ${a.br}${refund ? ` · คืน ${money((a.rec.cancel || {}).amount)} บาท` : ''}${(a.rec.cancel || {}).doc_no ? ' · ' + a.rec.cancel.doc_no : ''}`, to: ['sales', 'mgr'] }).catch(() => null);
    toast(refund ? 'อนุมัติจ่ายแล้ว แจ้งเซลล์แล้ว' : 'อนุมัติแล้ว แจ้งเซลล์แล้ว'); render();
  }
});
