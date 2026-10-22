// ------------------------------------------------------------------ printed forms as a PDF or a picture
// The page runs inside claude.ai, where the browser's print dialog is not available. Each form is drawn onto a canvas
// (A4, with the page's Thai font) and handed to the viewer as a PDF or a PNG through the downloads capability.
// No outside library: the PDF holds one JPEG per A4 page.
const DOC_W = 794, DOC_PAGE_H = 1123, DOC_SCALE = 2, DOC_M = 46;   // A4 at 96 dpi, drawn at 2× for sharp text
const DOC_FONT = '"IBM Plex Sans Thai", "Noto Sans Thai", Loma, Tahoma, sans-serif';
const docSeg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
function docWrap(ctx, text, w) {
  const parts = docSeg ? [...docSeg.segment(String(text ?? ''))].map(s => s.segment) : [...String(text ?? '')];
  const lines = []; let cur = '';
  for (const p of parts) {
    if (p === '\n') { lines.push(cur); cur = ''; continue; }
    if (ctx.measureText(cur + p).width > w && cur) { lines.push(cur.trimEnd()); cur = p.trimStart(); }
    else cur += p;
  }
  lines.push(cur);
  return lines.length ? lines : [''];
}
// a stored photo as a same-origin address, so drawing it keeps the canvas exportable
const docImg = id => (S.assetUrls[id] && /^(blob:|data:)/.test(S.assetUrls[id])) ? S.assetUrls[id] : '/_blob/' + id;
const docLoadImg = src => new Promise(ok => { if (!src) { ok(null); return; } const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; setTimeout(() => ok(im.complete && im.naturalWidth ? im : null), 6000); });
// spec: { title, sub, blocks: [{ kv: [[th, td, th, td] | [th, td]] }, { h }, { items: { cols, widths, rows } }, { img, label }, { note }, { sign: [..] }] }
async function docCanvas(spec) {
  try { await document.fonts.load(`16px ${DOC_FONT}`); await document.fonts.load(`600 16px ${DOC_FONT}`); } catch (e) { /* use what is there */ }
  const imgs = await Promise.all(spec.blocks.map(b => b.img && !spec.noImg ? docLoadImg(b.img) : null));
  // two passes: measure, then draw on a canvas of the right height
  const run = (ctx, draw) => {
    const W = DOC_W - DOC_M * 2, LH = spec.compact ? 18 : 20, PAD = spec.compact ? 4 : 6;
    let y = DOC_M;
    const font = (sz, wt = 400) => { ctx.font = `${wt} ${sz}px ${DOC_FONT}`; };
    const text = (t, x, yy, opts = {}) => { if (draw) { ctx.fillStyle = '#000'; ctx.textAlign = opts.align || 'left'; ctx.textBaseline = 'top'; ctx.fillText(t, x, yy); } };
    const line = (x1, y1, x2, y2) => { if (draw) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); } };
    // a table row: cells [{ t, w, bold }]; returns the row height
    const row = cells => {
      const fs = spec.compact ? 12 : 13;
      const hs = cells.map(c => { font(fs, c.bold ? 600 : 400); return docWrap(ctx, c.t, c.w - PAD * 2).length; });
      const h = Math.max(...hs, 1) * LH + PAD * 2 - 4;
      let x = DOC_M;
      cells.forEach(c => {
        font(fs, c.bold ? 600 : 400);
        docWrap(ctx, c.t, c.w - PAD * 2).forEach((ln, i) => text(ln, x + PAD, y + PAD + i * LH));
        if (draw) ctx.strokeRect(x, y, c.w, h);
        x += c.w;
      });
      y += h; return h;
    };
    if (spec.compact) y -= 16;
    font(22, 600); text(spec.title, DOC_W / 2, y, { align: 'center' }); y += 34;
    if (spec.sub) { font(13); docWrap(ctx, spec.sub, W).forEach(ln => { text(ln, DOC_W / 2, y, { align: 'center' }); y += LH; }); y += 10; }
    if (spec.meta) { font(12); if (draw) ctx.fillStyle = '#000'; text(spec.meta[0] || '', DOC_M, y); text(spec.meta[1] || '', DOC_W - DOC_M, y, { align: 'right' }); y += LH + 4; }
    const dots = (x1, x2, yy) => { if (draw) { ctx.save(); ctx.setLineDash([1, 2]); line(x1, yy, x2, yy); ctx.restore(); } };
    const box = (x, yy) => { if (draw) ctx.strokeRect(x, yy + 3, 12, 12); };
    // a signature line with its label, the name in brackets and a date line
    const signAt = (x, w, yy, label, name) => { line(x, yy, x + w, yy); font(12); text(label, x + w / 2, yy + 6, { align: 'center' }); text(`( ${name || '................................................'} )`, x + w / 2, yy + 24, { align: 'center' }); text('วันที่ ........../........../..........', x + w / 2, yy + 42, { align: 'center' }); };
    spec.blocks.forEach((b, bi) => {
      if (b.h && !b.sec) { y += 8; font(15, 600); text(b.h, DOC_M, y); y += 26; }
      // a numbered section heading, with who / when on the right
      if (b.sec) {
        y += 6;
        if (draw) { ctx.beginPath(); ctx.arc(DOC_M + 10, y + 10, 10, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill(); ctx.fillStyle = '#fff'; font(12, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.sec), DOC_M + 10, y + 11); }
        if (b.runs) { let x = DOC_M + 28; b.runs.forEach(r => { font(14, r.b ? 700 : 400); text(r.t, x, y + 1); x += ctx.measureText(r.t).width; }); }
        else { font(15, 600); text(b.h || '', DOC_M + 28, y); }
        if (b.by) { font(11); if (draw) { ctx.fillStyle = '#444'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText(b.by, DOC_W - DOC_M, y + 3); } }
        y += spec.compact ? 24 : 28;
      }
      if (b.small) { font(11); docWrap(ctx, b.small, W).forEach(ln => { if (draw) { ctx.fillStyle = '#333'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(ln, DOC_M, y); } y += 16; }); y += 4; }
      // CR: the phone check filled in by hand
      if (b.cr) {
        const top = y; y += 10; font(13);
        text('วันที่โทร', DOC_M + 10, y); dots(DOC_M + 70, DOC_M + 230, y + 16); text('เวลา', DOC_M + 240, y); dots(DOC_M + 275, DOC_M + 360, y + 16); text('เบอร์ที่โทร', DOC_M + 370, y); dots(DOC_M + 445, DOC_M + W - 10, y + 16); y += 28;
        box(DOC_M + 10, y); text('ลูกค้ายืนยันยกเลิก ยอดเงินคืนและบัญชีถูกต้อง', DOC_M + 28, y); box(DOC_M + 330, y); text('ไม่ตรง / ติดต่อไม่ได้ (ระบุในหมายเหตุ)', DOC_M + 348, y); y += 28;
        text('หมายเหตุ CR', DOC_M + 10, y); dots(DOC_M + 90, DOC_M + W - 10, y + 16); y += (spec.onePage ? 30 : 26);
        if (!spec.onePage) { dots(DOC_M + 10, DOC_M + W - 10, y + 16); y += 34; }
        text('ลงชื่อ CR', DOC_M + W - 330, y); dots(DOC_M + W - 270, DOC_M + W - 130, y + 16); text('วันที่', DOC_M + W - 120, y); dots(DOC_M + W - 85, DOC_M + W - 10, y + 16); y += 30;
        if (draw) ctx.strokeRect(DOC_M, top, W, y - top); y += 10;
      }
      // accounting: credit note, transfer date and amount, filled in by hand
      if (b.acct) {
        const top = y; y += 10; font(13);
        text('เลขที่ใบลดหนี้', DOC_M + 10, y); dots(DOC_M + 100, DOC_M + 300, y + 16); text('กำหนดการโอนเงินเข้าบัญชีตามเอกสารแนบ', DOC_M + 310, y); y += 28;
        text('จำนวน', DOC_M + 10, y); dots(DOC_M + 60, DOC_M + 250, y + 16); text('บาท', DOC_M + 255, y); text('วันที่โอน', DOC_M + 310, y); dots(DOC_M + 370, DOC_M + W - 10, y + 16); y += 34;
        text('ลงชื่อเจ้าหน้าที่ฝ่ายบัญชี', DOC_M + W - 380, y); dots(DOC_M + W - 220, DOC_M + W - 10, y + 16); y += 30;
        if (draw) ctx.strokeRect(DOC_M, top, W, y - top); y += 10;
      }
      // signatures with the names printed under the line
      if (b.sign3) {
        y += spec.onePage ? 30 : spec.compact ? 38 : 50; const n = b.sign3.length, gap = 24, w = (W - gap * (n - 1)) / n;
        b.sign3.forEach((s, i) => signAt(DOC_M + i * (w + gap), w, y, s.t, s.name));
        y += 66;
      }
      // the executive's approval, signed by hand
      if (b.exec) {
        const top = y, e = b.exec, rx = DOC_M + W * 0.6; y += 14; font(13);
        box(DOC_M + 10, y); text(e.ok, DOC_M + 28, y); font(13); const okW = ctx.measureText(e.ok).width; box(DOC_M + 46 + okW, y); text('ไม่อนุมัติ', DOC_M + 64 + okW, y); y += 30;
        text('หมายเหตุ', DOC_M + 10, y); dots(DOC_M + 70, rx - 20, y + 16); y += 28;
        font(11); docWrap(ctx, e.foot || '', rx - DOC_M - 30).forEach(ln => { if (draw) { ctx.fillStyle = '#333'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(ln, DOC_M + 10, y); } y += 16; });
        y = Math.max(y + 6, top + (spec.onePage ? 104 : 120));
        signAt(rx, DOC_M + W - rx - 10, top + 50, e.label, '');
        if (draw) ctx.strokeRect(DOC_M, top, W, y - top); y += 10;
      }
      if (b.kv) { const th = W * 0.19, td = W / 2 - th; b.kv.forEach(r => row(r.length === 2 ? [{ t: r[0], w: th, bold: true }, { t: r[1], w: W - th }] : [{ t: r[0], w: th, bold: true }, { t: r[1], w: td }, { t: r[2], w: th, bold: true }, { t: r[3], w: td }])); y += spec.compact ? 4 : 10; }
      if (b.items) { row(b.items.cols.map((c, i) => ({ t: c, w: W * b.items.widths[i], bold: true }))); b.items.rows.forEach(r => row(r.map((c, i) => ({ t: c, w: W * b.items.widths[i] })))); y += 10; }
      if (b.note) { font(13); docWrap(ctx, b.note, W).forEach(ln => { text(ln, DOC_M, y); y += LH; }); y += 6; }
      if (b.label !== undefined || b.img) {
        if (b.label) { font(12); text(b.label, DOC_M, y); y += LH; }
        const im = imgs[bi];
        if (im) { const s = Math.min(W / im.naturalWidth, (b.maxH || 300) / im.naturalHeight, 1), w = im.naturalWidth * s, h = im.naturalHeight * s; if (draw) { ctx.drawImage(im, DOC_M, y, w, h); ctx.strokeRect(DOC_M, y, w, h); } y += h + 10; }
      }
      if (b.sign) {
        y += 60; const n = b.sign.length, gap = 18, w = (W - gap * (n - 1)) / n;
        font(12); b.sign.forEach((s, i) => { const x = DOC_M + i * (w + gap); line(x, y, x + w, y); text(s, x + w / 2, y + 6, { align: 'center' }); text('วันที่ ........../........../..........', x + w / 2, y + 26, { align: 'center' }); });
        y += 50;
      }
    });
    return y + DOC_M;
  };
  const probe = document.createElement('canvas').getContext('2d');
  const need = Math.ceil(run(probe, false));
  // onePage: the whole form shrinks to fit one A4 sheet (ตกลง 22/10), otherwise a tall form runs onto more pages
  const k = spec.onePage && need > DOC_PAGE_H ? DOC_PAGE_H / need : 1;
  const H = spec.onePage ? DOC_PAGE_H : Math.max(DOC_PAGE_H, need);
  const cv = document.createElement('canvas');
  cv.width = DOC_W * DOC_SCALE; cv.height = H * DOC_SCALE;
  const ctx = cv.getContext('2d');
  ctx.scale(DOC_SCALE, DOC_SCALE); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, DOC_W, H);
  if (k < 1) { ctx.translate(DOC_W * (1 - k) / 2, 0); ctx.scale(k, k); }
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  run(ctx, true);
  return cv;
}
const docBlob = (cv, type, q) => new Promise(ok => cv.toBlob(b => ok(b), type, q));
// a PDF with one JPEG per A4 page (a tall form is cut into pages)
async function docPdf(cv) {
  const pw = cv.width, ph = Math.round(pw * DOC_PAGE_H / DOC_W), pages = [];
  for (let top = 0; top < cv.height - 2; top += ph) {
    const pc = document.createElement('canvas'); pc.width = pw; pc.height = ph;
    const c2 = pc.getContext('2d'); c2.fillStyle = '#fff'; c2.fillRect(0, 0, pw, ph); c2.drawImage(cv, 0, top, pw, Math.min(ph, cv.height - top), 0, 0, pw, Math.min(ph, cv.height - top));
    pages.push(new Uint8Array(await (await docBlob(pc, 'image/jpeg', 0.92)).arrayBuffer()));
  }
  const enc = new TextEncoder(), chunks = [], offs = [];
  let len = 0;
  const put = x => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; };
  const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n`); body(); put('\nendobj\n'); };
  const W = 595.28, Hh = 841.89, n = pages.length;
  put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, () => put('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => put(`<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`));
  pages.forEach((jpg, i) => {
    const p = 3 + i * 3, c = p + 1, im = p + 2, draw = `q ${W} 0 0 ${Hh} 0 0 cm /Im0 Do Q`;
    obj(p, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${Hh}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${c} 0 R >>`));
    obj(c, () => put(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
    obj(im, () => { put(`<< /Type /XObject /Subtype /Image /Width ${pw} /Height ${ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); put(jpg); put('\nendstream'); });
  });
  const xref = len, total = 3 + n * 3;
  put(`xref\n0 ${total}\n0000000000 65535 f \n${offs.slice(1, total).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`);
  put(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}
async function docSave(filename, blob) {
  const dl = S.cap.downloads;
  if (dl) {
    try { await dl.save({ filename, data: blob }); toast('บันทึกไฟล์แล้ว'); return; }
    catch (e) {
      if (e && e.code === 'declined') return;
      if (e && e.code === 'rate_limited') { toast('มีหน้าต่างบันทึกไฟล์เปิดอยู่ รอสักครู่', 'bad'); return; }
      if (!e || !['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(e.code)) { toast('บันทึกไฟล์ไม่สำเร็จ ลองอีกครั้ง', 'bad'); return; }
    }
  }
  // outside claude.ai (the file opened directly): an ordinary browser download
  try { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000); }
  catch (e) { toast('มุมมองนี้บันทึกไฟล์ไม่ได้', 'bad'); }
}
// the window that shows the form and saves it; back = the modal to return to
async function openDoc(spec, filename, back) {
  S.modal = { kind: 'doc', spec, filename, back: back || null, png: null, busy: true };
  render();
  const make = async sp => { const cv = await docCanvas(sp); return { cv, png: cv.toDataURL('image/png') }; };
  let out = null;
  try { out = await make(spec); }
  catch (e) { try { out = await make({ ...spec, noImg: true }); } catch (e2) { out = null; } }   // a photo that cannot be drawn is left out
  if (!S.modal || S.modal.kind !== 'doc' || S.modal.spec !== spec) return;
  if (out) Object.assign(S.modal, out); else S.modal.err = true;
  S.modal.busy = false; render();
}
function docModal(m) {
  return `<div class="flex items-start justify-between gap-3 mb-3"><h2 class="font-head text-xl font-semibold">${esc(m.spec.title)}</h2><button class="btn btn-ghost btn-sm" data-act="doc-close">${m.back ? 'กลับ' : 'ปิด'}</button></div>
  <div class="flex flex-wrap gap-2 mb-3 items-center">
    <button class="btn btn-red" data-act="doc-save" data-fmt="pdf" ${m.cv ? '' : 'disabled'}>บันทึกเป็น PDF</button>
    <button class="btn btn-dark" data-act="doc-save" data-fmt="png" ${m.cv ? '' : 'disabled'}>บันทึกเป็นรูป (PNG)</button>
    ${S.mode === 'local' ? '<button class="btn btn-ghost" data-act="doc-print">พิมพ์</button>' : ''}
    <span class="text-xs text-muted">${m.busy ? '<span class="spin"></span> กำลังจัดหน้า…' : m.err ? '<span style="color:var(--bad)">สร้างเอกสารไม่สำเร็จ ลองอีกครั้ง</span>' : 'บันทึก PDF แล้วเปิดพิมพ์จากไฟล์ หรือส่งรูปทางไลน์ได้'}</span>
  </div>
  <div class="border border-line rounded-lg overflow-auto" style="max-height:66vh;background:#fff">${m.png ? `<img src="${m.png}" alt="${esc(m.spec.title)}" style="width:100%;max-width:${DOC_W}px;display:block;margin:0 auto">` : '<div class="p-10 text-center text-sm" style="color:#555">กำลังเตรียมเอกสาร…</div>'}</div>`;
}
Object.assign(ACTIONS, {
  'doc-close'() { const b = S.modal && S.modal.back; S.modal = b || null; render(); },
  async 'doc-save'(el) {
    const m = S.modal; if (!m || !m.cv) return;
    const pdf = el.dataset.fmt === 'pdf';
    m.busy = true; render();
    try { const blob = pdf ? await docPdf(m.cv) : await docBlob(m.cv, 'image/png'); await docSave(`${m.filename}.${pdf ? 'pdf' : 'png'}`, blob); }
    finally { if (S.modal === m) { m.busy = false; render(); } }
  },
  'doc-print'() {
    const m = S.modal; if (!m || !m.png) return;
    let root = document.getElementById('print-root');
    if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
    root.innerHTML = `<img src="${m.png}" alt="" style="width:100%">`;
    try { window.print(); } catch (e) { toast('เปิดหน้าพิมพ์ไม่ได้ ใช้ "บันทึกเป็น PDF" แทน', 'bad'); }
  }
});
const docName = (...parts) => parts.filter(Boolean).join('_').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
