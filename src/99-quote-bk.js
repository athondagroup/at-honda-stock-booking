// ------------------------------------------------------------------ ใบจองจากหน้าใบเสนอราคา (quote/) (ขอ 24/11)
// 1. หน้าใบเสนอราคากด "ส่งเข้าเว็บ AT stock" → เก็บร่างใบจองไว้ในใบเสนอราคา (quotes/<id>.stock) แล้วเปิด ?qbk=<id>
//    ที่นี่เปิดฟอร์มใบจองที่กรอกไว้ให้: รุ่น เกรด สี ราคา เงื่อนไขการขาย FOC และรูปใบจองที่หน้าใบเสนอราคาสร้าง (แนบในข้อ 1)
//    เซลล์แนบสลิปมัดจำ ใส่เลขที่ใบจองแล้วบันทึกตามขั้นตอนเดิม · ใบจองเก็บ quote_id ไว้ ใบสั่งแต่งรถเริ่มจากของแถมในใบเสนอราคา
// 2. ?bk=<id> เปิดใบจองนั้น (ลิงก์จากประวัติในหน้าใบเสนอราคา)
// 3. สรุปรถว่างต่อสเปก (ref/avail) ให้หน้าใบเสนอราคาโชว์จำนวนรถในสต็อกตอนเลือกรุ่นและสี (ไม่มีชื่อลูกค้า มีแค่ตัวเลข)
// Only function declarations / ACTIONS / listeners here.
function qbkParam(k) { try { return new URLSearchParams(location.search).get(k) || ''; } catch (e) { return ''; } }
function qbkDropParam() { try { const u = new URL(location.href); ['qbk', 'bk'].forEach(k => u.searchParams.delete(k)); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) { /* old browser */ } }
async function qbkFetch(id) {
  if (window.__WEB && window.__WEB.quoteDoc) return window.__WEB.quoteDoc(id);
  if (DB) { const s = await DB.collection('quotes').doc(id).get(); return s.exists ? s.data() : null; }
  return null;
}
async function qbkImage(img) {
  if (!img) return null;
  try {
    if (window.__WEB && window.__WEB.assetBlob) return await window.__WEB.assetBlob(img);
    return await (await fetch(imgSrc(img))).blob();
  } catch (e) { return null; }
}
// the quotation's draft → the booking form (the same keys as newBookingDraft and the sale terms box)
async function qbkOpen(id) {
  S.qbk = { id, state: 'loading' }; S.view = 'book'; S.sub.book = 'new'; S.modal = null; render();
  let q = null; try { q = await qbkFetch(id); } catch (e) { q = null; }
  const st = q && q.stock, g = st && st.draft;
  if (!g) { S.qbk = { id, state: 'missing' }; toast('ไม่พบร่างใบจองจากใบเสนอราคานี้', 'bad'); render(); return; }
  if (!perms().book) { S.qbk = { id, state: 'denied' }; toast('บัญชีนี้ลงใบจองไม่ได้', 'bad'); render(); return; }
  resetBooking();
  const d = S.draft.booking, filled = [];
  const set = (k, v) => { if (v !== undefined && v !== null && v !== '') { d[k] = typeof v === 'number' ? String(v) : v; filled.push(k); } };
  set('customer', g.customer); set('model', g.model); set('grade', g.grade); set('color', g.color);
  set('purchase', g.purchase); set('finance', g.finance); set('deposit', g.deposit); set('discount', g.discount);
  set('insurance', g.insurance); set('insurance_kind', g.insurance_kind); set('foc_total', g.foc_total); set('note', g.note);
  if (g.booking_date && g.booking_date <= todayISO()) set('booking_date', g.booking_date);
  if (S.role.role !== 'sales' && g.sales) set('sales', fitSales(g.sales) || g.sales);
  if (!myBranch() && g.br && BR[g.br]) set('br', g.br);
  d.deal = JSON.parse(JSON.stringify(g.deal || {}));
  d.quote_id = id;
  d.quote = { id, at: st.at || null, by: st.by || null, sum: g.sum || null, po: Array.isArray(g.po) ? g.po : [] };
  d.aiFields = filled;
  const blob = await qbkImage(st.img);
  if (blob) S.files.bk.push({ blob, url: URL.createObjectURL(blob), name: 'ใบจองจากใบเสนอราคา.png', quote: true });
  S.qbk = { id, state: blob ? 'ready' : 'noimg' };
  qbkDropParam(); render(); window.scrollTo(0, 0);
}
// the banner over the booking form, and what goes to the accessories order later
function qbkHead(d) {
  if (!d || !d.quote_id) return S.qbk && S.qbk.state === 'loading' ? '<div class="p-3 rounded-lg text-sm" style="background:var(--surface-2)"><span class="spin"></span> กำลังดึงข้อมูลจากใบเสนอราคา…</div>' : '';
  const s = d.quote.sum || {}, img = S.files.bk.some(x => x.quote);
  return `<div class="p-4 rounded-lg border" style="border-color:var(--good);background:var(--good-soft, #ecfdf3)">
    <div class="flex flex-wrap items-start gap-3"><div class="flex-1 min-w-[220px]"><div class="font-head font-semibold">ใบจองจากใบเสนอราคา</div>
      <div class="text-sm mt-1">${esc([s.model, s.grade, s.color].filter(Boolean).join(' · '))}${s.net ? ` · ราคาสุทธิ <b class="num">${money(s.net)}</b>` : ''}${s.cash ? ' · ซื้อสด' : s.term ? ` · ดาวน์ <b class="num">${money(s.down)}</b> · ผ่อน ${esc(s.term)} งวด ${s.rate !== undefined && s.rate !== '' ? `ดอกเบี้ย ${esc(s.rate)}%` : ''}${s.monthly ? ` · งวดละ <b class="num">${money(s.monthly)}</b>` : ''}` : ''}</div>
      ${(() => { const p = typeof bookTermsPrice === 'function' ? bookTermsPrice(d) : null; return p && s.price && Math.abs(p.price - s.price) >= 1 ? `<div class="text-sm mt-1" style="color:var(--warn)">ราคารถในใบเสนอราคา <b class="num">${money(s.price)}</b>${s.tier === 'old' ? ' (ราคาเดิม)' : ''} ไม่ตรงกับใบราคาในเว็บ <b class="num">${money(p.price)}</b> · ยอดจัดและค่างวดด้านล่างคิดจากราคาในเว็บ ตรวจก่อนบันทึก</div>` : ''; })()}
      <div class="text-xs text-muted mt-1">ช่องที่มีแถบสีเขียวกรอกจากใบเสนอราคาแล้ว ตรวจอีกครั้ง · ${img ? 'รูปใบจองที่สร้างจากใบเสนอราคาแนบในข้อ 1 แล้ว' : '<span style="color:var(--warn)">ดึงรูปใบจองไม่ได้ แนบรูปเองในข้อ 1</span>'} · แนบสลิปมัดจำ ใส่เลขที่ใบจองแล้วกดบันทึก</div></div>
      <a class="btn btn-ghost btn-sm" href="quote/">กลับใบเสนอราคา</a></div></div>`;
}
function qbkPoBox(d) {
  if (!d || !d.quote_id) return '';
  const po = d.quote.po || [];
  return `<fieldset class="p-4 rounded-lg border border-line"><legend class="font-head font-semibold px-1">ใบสั่งแต่งรถ (จากของแถมในใบเสนอราคา)</legend>
    ${po.length ? `<table class="tbl text-sm"><thead><tr><th>ลำดับ</th><th>รายการ</th><th class="text-right">ทุน FOC</th><th>ลูกค้าชำระ</th></tr></thead><tbody>${po.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.name)}${x.part ? ` <span class="code text-xs">${esc(x.part)}</span>` : ''}</td><td class="num text-right">${x.cpay ? '–' : money(x.cost)}</td><td>${x.cpay ? `ชำระเพิ่ม ${money(x.cprice)}` : ''}</td></tr>`).join('')}</tbody></table>`
      : '<p class="text-sm text-muted">ใบเสนอราคาไม่มีรายการของแถม</p>'}
    <p class="text-xs text-muted mt-2">บันทึกใบจองแล้ว รายการนี้ขึ้นในใบสั่งแต่งรถของใบจองนี้ให้เลย (แก้เพิ่มได้ที่ขั้น "ใบสั่งแต่งรถ")</p></fieldset>`;
}
// the accessories order of a booking from the quotation starts from the quotation's gifts
function qbkPoItems(a) { const q = a && a.rec && a.rec.quote; return q && Array.isArray(q.po) ? q.po.map(x => ({ qty: 1, part: '', vendor: '', sale: 0, ...x, custom: true, cat: x.cat || 'จากใบเสนอราคา' })) : []; }
// ---- stock per spec for the quotation page: free cars, quota on the way, bookings waiting (counts only)
function qbkAvail(D) {
  const out = {};
  for (const [k, s] of Object.entries(D.specs || {})) {
    if (!(s.total || s.incoming || s.waiting)) continue;
    const b = {}; Object.entries(s.freeBy || {}).forEach(([br, n]) => { if (n) b[br] = n; });
    out[k] = { f: s.free || 0, i: s.incoming || 0, w: s.waiting || 0, ...(Object.keys(b).length ? { b } : {}) };
  }
  return out;
}
function qbkPublish() {
  if (!DB || S.mode !== 'shared' || !(typeof ltAllLoaded === 'function' ? ltAllLoaded() : S.colsLoaded)) return;
  if (S.qbkPubAt && Date.now() - S.qbkPubAt < 120000) return;
  S.qbkPubAt = Date.now();
  let specs; try { specs = qbkAvail(derive()); } catch (e) { return; }
  const cur = S.ref.get('avail');
  if (cur && JSON.stringify(cur.specs || {}) === JSON.stringify(specs)) return;
  write('ref', 'avail', { specs, at: new Date().toISOString(), ...actor() }).catch(() => { /* next round */ });
}
function qbkTick() {
  if (S.mode === 'connecting' || !S.me) return;
  const ready = S.mode !== 'shared' || (typeof ltAllLoaded === 'function' ? ltAllLoaded() : !!S.colsLoaded);
  if (!ready) return;
  if (!S.qbkDone) {
    S.qbkDone = true;
    const q = qbkParam('qbk'), b = qbkParam('bk');
    if (q) qbkOpen(q);
    else if (b) { qbkDropParam(); S.view = 'book'; S.sub.book = 'list'; S.modal = { kind: 'at', id: b }; render(); }
  }
  qbkPublish();
}
setInterval(qbkTick, 1500);
