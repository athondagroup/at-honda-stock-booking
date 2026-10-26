// ---------- one Quota slot in a window (ขอ 26/10): opened from the lock lists; Only function declarations at the top level
const QUOTA_ST = { waiting: ['รอรถ', 'warn'], vin: ['ได้เลขตัวถังแล้ว รอรถถึง', 'warn'], arrived: ['รถถึงแล้ว', 'good'], sold: ['ขายแล้ว', 'ink'] };
function quotaModal(m, D) {
  const q = D.quota.find(x => x.ref === m.ref);
  if (!q) return `<p>ไม่พบ Quota ${esc(m.ref)}</p><div class="flex justify-end mt-3"><button class="btn btn-ghost" data-act="close">ปิด</button></div>`;
  const row = (k, v) => v === null || v === undefined || v === '' ? '' : `<tr><td class="text-muted nowrap">${k}</td><td>${v}</td></tr>`;
  const ls = D.locks.filter(l => l.ref === q.ref || (q.vin && l.vin === q.vin));
  const st = QUOTA_ST[q.st] || [q.st || '–', 'neutral'], hideCust = isSales();
  return `<div class="flex items-start justify-between gap-3 mb-2"><div><h2 class="font-head text-xl font-semibold">Quota <span class="code">${esc(q.ref)}</span></h2>
    <div class="mt-1 flex flex-wrap gap-2">${chip(st[0], st[1])} ${chip(`${q.br || ''} ${BR[q.br]?.name || ''}`, 'neutral')} ${q.open ? chip('ว่าง ยังไม่มีใครจอง', 'good') : ''}</div></div>
    <button class="btn btn-ghost btn-sm" data-act="close">ปิด</button></div>
  <div class="grid md:grid-cols-2 gap-5"><table class="tbl text-sm"><tbody>
    ${row('รุ่น เกรด สี', specLabel(q.spec))}
    ${row('เดือนที่ส่ง', `${fmtM(q.m)}${q.week ? ' W' + q.week : ''}`)}
    ${row('จำนวน', q.qty ? `${q.qty} คัน` : '')}
    ${row('เลขตัวถัง', q.vin ? vinLink({ vin: q.vin }) : '')}
    ${row('ใบจอง', q.bk ? `<span class="code">${esc(q.bk)}</span>${q.booking && q.booking.cust && !hideCust ? ' · ' + esc(q.booking.cust) : ''}` : '')}
    ${row('ข้อความในชีต', q.vnote ? esc(q.vnote) : '')}
    </tbody></table>
    <div class="min-w-0"><h3 class="font-head font-semibold mb-2">ล็อก / คำขอ</h3>
      <div class="border border-line rounded-lg divide-y divide-line">${ls.map(l => lockRow(l, D, { compact: true })).join('') || '<div class="p-3 text-sm text-muted">ยังไม่มีคำขอล็อก</div>'}</div></div></div>
  <div class="flex justify-end mt-4"><button class="btn btn-ghost" data-act="close">ปิด</button></div>`;
}
Object.assign(ACTIONS, { 'quota-open'(el) { S.modal = { kind: 'quota', ref: el.dataset.ref }; render(); } });
