// ------------------------------------------------------------------ IDS booking status report (ตกลง 11/11)
// The IDS report with "สถานะใบจอง" and "เหตุผลการลดหนี้เงินจอง" (one row per booking, also bookings that left the Booking file) is pasted
// in the same box as the other IDS tables, but it does NOT replace the Booking table: it is kept apart (ids/bkstat_<br>) and only checks.
//   สถานะใบจอง = รอการยกเลิกออกจากระบบ → the web booking with that number should be cancelled: a task for admin / manager to cancel it
//   เหตุผล = ยกเลิกเพื่อจำหน่ายรถยนต์ (deposit credited to the sale) → the booking must be in DL; not in DL = wrong, a task to check
// Only function declarations / ACTIONS / listeners here.
function bkstatParse(rows) {
  const norm = x => String(x == null ? '' : x).replace(/\s+/g, ' ').trim();
  let h = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) { const r = (rows[i] || []).map(norm); if (r.includes('เลขที่ใบจอง') && (r.includes('เหตุผลการลดหนี้เงินจอง') || r.includes('เลขที่ใบเงินจอง'))) { h = i; break; } }
  if (h < 0) return null;
  const H = rows[h].map(norm), col = n => H.indexOf(n);
  const c = { date: col('วันที่ใบจอง'), mto: col('MTO EN NAME'), color: col('รหัสสี'), st: col('สถานะใบจอง'), no: col('เลขที่ใบจอง'), cust: col('ชื่อลูกค้า'), sales: col('ชื่อที่ปรึกษาขาย'), reason: col('เหตุผลการลดหนี้เงินจอง'), dealer: col('รหัสผู้จำหน่าย'), dep: col('เลขที่ใบเงินจอง') };
  const brOf = v => { const n = parseInt(String(v || '').replace(/\D/g, ''), 10); return BRS.find(b => parseInt(BR[b].code, 10) === n) || null; };
  const out = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i] || [], g = k => c[k] >= 0 ? norm(r[c[k]]) : '';
    const no = g('no').replace(/\D/g, ''); if (!no) continue;
    const dm = g('date').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    out.push({ no, date: dm ? `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}` : null, mto: g('mto'), color: g('color'), st: g('st'), cust: g('cust'), sales: g('sales'), reason: g('reason'), dep: g('dep'), br: brOf(g('dealer')) });
  }
  const brs = [...new Set(out.map(x => x.br).filter(Boolean))];
  return { rows: out, brs, noBr: out.filter(x => !x.br).length };
}
const bkstatSold = x => /ยกเลิกเพื่อจำหน่าย/.test(x.reason || '');
const bkstatCx = x => (x.st || '') === CANCEL;
// the booking numbers a web booking is known by
function bkstatNos(a) { return [a.rec && a.rec.booking_no, a.ids && a.ids.no, a.idsLeft && a.idsLeft.no, a.idsGone && a.idsGone.no, ...((a.match && a.match.recs) || []).map(x => x.no)].filter(Boolean).map(x => String(x).replace(/\D/g, '')); }
function bkstatRows(D) { return BRS.flatMap(b => { const d = S.ids.get('bkstat_' + b); return d && Array.isArray(d.list) ? d.list.map(x => ({ ...x, br: b, asof: d.at })) : []; }); }
// the checks: cancelled in IDS but alive in the web · deposit credited to a sale but not in DL
function bkstatCheck(rows, D) {
  const dl = new Set(D.X.inv.filter(i => i.no).map(i => String(i.no).replace(/\D/g, '')));
  const byNo = new Map(); for (const a of D.at) for (const n of bkstatNos(a)) if (!byNo.has(n)) byNo.set(n, a);
  const cx = [], noDl = [];
  for (const x of rows) {
    const a = byNo.get(x.no) || null;
    if (bkstatCx(x) && a && !a.cancelled && !(a.flow && a.flow.done && a.flow.done.delivered)) cx.push({ x, a });
    if (bkstatSold(x) && !bkstatCx(x) && !dl.has(x.no)) noDl.push({ x, a });
  }
  return { cx, noDl, n: rows.length };
}
function bkstatPanel(D) {
  const P = S.bkstat; if (!P) return '';
  const ck = bkstatCheck(P.rows, D), line = (o, extra) => `<div class="py-1 border-b border-line text-sm"><span class="code">${esc(o.x.no)}</span> · ${esc(o.x.cust || '–')} · ${esc(o.x.mto || '')} ${esc(o.x.color || '')} · ${esc(o.x.sales || '')} · ${esc(o.x.br || '')}${extra || ''}${o.a ? ` <button class="underline text-xs" data-act="at-open" data-id="${esc(o.a.id)}">เปิดใบจองในเว็บ</button>` : ' <span class="text-xs text-muted">(ไม่มีใบจองในเว็บ)</span>'}</div>`;
  return `<div class="mt-3 p-3 rounded-lg border border-line" style="background:var(--surface)">
    <div class="font-medium">สถานะใบจอง IDS (ไม่แทนตาราง Booking) · ${fmtN(P.rows.length)} ใบ · สาขา ${esc(P.brs.join(', ') || '–')}${P.noBr ? ` · ไม่รู้สาขา ${P.noBr} ใบ` : ''}</div>
    <div class="text-xs text-muted mb-2">ใช้ตรวจ 2 อย่าง: ใบจองที่ IDS รอยกเลิก แต่เว็บยังไม่ยกเลิก · ใบที่ลดหนี้เงินจอง "ยกเลิกเพื่อจำหน่ายรถยนต์" แต่ไม่อยู่ใน DL (ผิด ต้องตรวจ)</div>
    <div class="font-medium text-sm mt-2" style="color:var(--bad)">IDS รอการยกเลิกออกจากระบบ แต่เว็บยังไม่ยกเลิก ${ck.cx.length}</div>
    ${ck.cx.map(o => line(o)).join('') || '<div class="text-sm text-muted">ไม่มี</div>'}
    <div class="font-medium text-sm mt-3" style="color:var(--warn)">ยกเลิกเพื่อจำหน่ายรถยนต์ แต่ไม่พบใน DL ${ck.noDl.length}</div>
    <div class="max-h-72 overflow-auto">${ck.noDl.map(o => line(o, ` · จอง ${o.x.date ? fmtD(o.x.date) : '–'}`)).join('') || '<div class="text-sm text-muted">ไม่มี · ทุกใบอยู่ใน DL แล้ว</div>'}</div>
    <div class="flex flex-wrap gap-2 mt-3"><button class="btn btn-red btn-sm" data-act="bkstat-save" ${P.brs.length ? '' : 'disabled'}>บันทึก (ขึ้นงานตรวจให้แอดมิน / ผู้จัดการ)</button><button class="btn btn-ghost btn-sm" data-act="bkstat-cancel">ยกเลิก</button></div></div>`;
}
// tasks after saving: they stay until the booking is cancelled in the web / the DL file has the booking
function bkstatNotices(D, add) {
  const rows = bkstatRows(D); if (!rows.length) return;
  const ck = bkstatCheck(rows, D);
  for (const o of ck.cx) add('bkscx:' + o.x.no, { br: o.a.br || o.x.br, roles: ['admin', 'manager'] }, 'bad', 'IDS ยกเลิกใบจองแล้ว (รอการยกเลิกออกจากระบบ) · ยกเลิกในเว็บด้วย',
    `${o.a.cust || o.x.cust} · ใบจอง IDS ${o.x.no} · ${o.a.model || ''} ${o.a.color || ''} · เซลล์ ${o.a.sales || o.x.sales || ''}`, { act: 'at-open', id: o.a.id, label: 'เปิดใบจอง' });
  for (const o of ck.noDl) add('bksdl:' + o.x.no, { br: (o.a && o.a.br) || o.x.br, roles: ['admin', 'manager'] }, 'warn', 'ตรวจสอบ: IDS ลดหนี้เงินจองเพื่อจำหน่ายรถแล้ว แต่ไม่พบใน DL',
    `${o.x.cust || ''} · ใบจอง ${o.x.no} · ${o.x.mto || ''} ${o.x.color || ''} · เซลล์ ${o.x.sales || ''} · อัปโหลด DL ล่าสุด หรือตรวจใบจองนี้ใน IDS`, o.a ? { act: 'at-open', id: o.a.id, label: 'เปิดใบจอง' } : null);
}
Object.assign(ACTIONS, {
  'bkstat-cancel'() { S.bkstat = null; render(); },
  async 'bkstat-save'() {
    const P = S.bkstat; if (!P || !perms().upload || !perms().write) return;
    let ok = 0;
    for (const b of P.brs) {
      const list = P.rows.filter(x => x.br === b).map(({ br, ...x }) => x);
      if (await write('ids', 'bkstat_' + b, { src: 'bkstat', br: b, n: list.length, list, ...actor() })) ok++;
    }
    if (ok) { S.bkstat = null; toast(`บันทึกสถานะใบจอง IDS ${ok} สาขาแล้ว · ขึ้นงานตรวจที่ "งานวันนี้"`); render(); }
  }
});
