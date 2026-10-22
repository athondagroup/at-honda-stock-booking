// ------------------------------------------------------------------ website users: who may sign in, and as what (13/10)
// Only on the AT Honda website, only for the executive. Signing in needs a row here; the role and branch come from it.
// Only function declarations here: the first render runs before this part of the file.
function adminUsers() {
  const U = S.webUsers;
  if (!U) { usersLoad(); return '<p class="text-sm text-muted">กำลังโหลดรายชื่อผู้ใช้…</p>'; }
  if (U.err) return `<p class="text-sm" style="color:var(--bad)">${esc(U.err)}</p><button class="btn btn-ghost btn-sm" data-act="users-reload">ลองอีกครั้ง</button>`;
  const d = U.draft;
  const roleOpt = cur => Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(v.label)}</option>`).join('');
  const brOpt = cur => `<option value="">–</option>${BRS.map(b => `<option ${b === cur ? 'selected' : ''}>${b}</option>`).join('')}`;
  const salesOpt = cur => `<option value="">–</option>${salesNames().map(s => `<option ${s === cur ? 'selected' : ''}>${esc(s)}</option>`).join('')}`;
  return `${importBox()}<p class="text-sm text-muted mb-3">คนที่เข้าเว็บได้ต้องมีอีเมลในรายการนี้ · ครั้งแรกเข้าด้วยลิงก์ทางอีเมล แล้วตั้งรหัสผ่าน ครั้งต่อไปใช้อีเมล + รหัสผ่าน · เซลล์ต้องเลือกชื่อเซลล์ · แอดมินต้องเลือกสาขา · ผู้จัดการ (พี่อั้ม / นุช) สาขามากับบทบาท ไม่ต้องเลือก · ปิดการใช้งานแทนการลบ</p>
  <div class="bg-surface border border-line rounded-lg p-4 mb-4"><h3 class="font-medium mb-2">เพิ่ม / แก้ผู้ใช้</h3>
    <div class="grid sm:grid-cols-5 gap-3 items-end">
      <div class="field"><label for="u-em">อีเมล</label><input id="u-em" type="email" data-users="email" value="${esc(d.email || '')}">${d.edit && d.orig && String(d.email || '').trim().toLowerCase() !== d.orig ? `<span class="text-xs" style="color:var(--warn)">เปลี่ยนจาก ${esc(d.orig)} · ครั้งแรกต้องเข้าด้วยอีเมลใหม่</span>` : ''}</div>
      <div class="field"><label for="u-nm">ชื่อที่แสดง</label><input id="u-nm" data-users="name" value="${esc(d.name || '')}"></div>
      <div class="field"><label for="u-rl">บทบาท</label><select id="u-rl" data-users="role">${roleOpt(d.role || 'sales')}</select></div>
      <div class="field"><label for="u-br">สาขา</label>${usersBrFixed(d.role || 'sales') ? `<div class="text-sm py-2" id="u-br">${usersBrFixed(d.role || 'sales')} <span class="text-muted">(ตามบทบาท)</span></div>` : `<select id="u-br" data-users="branch">${brOpt(d.branch || '')}</select>`}</div>
      <div class="field"><label for="u-sn">ชื่อเซลล์ (เฉพาะเซลล์)</label><select id="u-sn" data-users="sales_name">${salesOpt(d.sales_name || '')}</select></div>
    </div>
    <div class="flex flex-wrap gap-2 mt-3"><button class="btn btn-red btn-sm" data-act="users-save">${d.edit ? 'บันทึกการแก้' : '+ เพิ่มผู้ใช้'}</button>${d.edit ? '<button class="btn btn-ghost btn-sm" data-act="users-new">ยกเลิก</button>' : ''}</div></div>
  <div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl text-sm"><thead><tr><th>อีเมล</th><th>ชื่อ</th><th>บทบาท</th><th>สาขา</th><th>ชื่อเซลล์</th><th>สถานะ</th><th></th></tr></thead><tbody>
    ${U.list.map(u => `<tr ${u.active ? '' : 'class="text-muted"'}><td>${esc(u.email)}</td><td>${esc(u.name || '')}</td><td>${esc((ROLES[u.role] || {}).label || u.role)}</td><td>${esc(usersBrFixed(u.role) || u.branch || '–')}</td><td>${esc(u.sales_name || '–')}</td>
      <td>${u.active ? (u.user_id ? chip('ใช้งาน', 'good') : chip('ยังไม่เคยเข้า', 'neutral')) : chip('ปิดแล้ว', 'muted')}</td>
      <td class="text-right nowrap"><button class="btn btn-ghost btn-sm" data-act="users-edit" data-email="${esc(u.email)}">แก้</button>${u.email === window.__WEB.email ? '' : `<button class="btn btn-ghost btn-sm" data-act="users-toggle" data-email="${esc(u.email)}">${u.active ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}</button>`}</td></tr>`).join('')}</tbody></table></div>`;
}
async function usersLoad() {
  S.webUsers = { list: [], draft: {}, loading: true };
  try { S.webUsers = { list: await window.__WEB.members.list(), draft: {} }; } catch (e) { S.webUsers = { err: 'โหลดรายชื่อไม่ได้: ' + (e.message || '') }; }
  render();
}
document.addEventListener('input', ev => { const t = ev.target; if (t && t.dataset && t.dataset.users && S.webUsers && S.webUsers.draft) { S.webUsers.draft[t.dataset.users] = t.value; if (t.dataset.users === 'role') render(); } });
// managers' branches come with the role (พี่อั้ม: PSC, ATE · นุช: SPH, KPA); the executive sees every branch
function usersBrFixed(role) { return MGR_OF[role] ? MGR_OF[role].join(', ') : role === 'exec' ? 'ทุกสาขา' : ''; }
Object.assign(ACTIONS, {
  'users-reload'() { S.webUsers = null; render(); },
  'users-new'() { S.webUsers.draft = {}; render(); },
  'users-edit'(el) { const u = S.webUsers.list.find(x => x.email === el.dataset.email); if (u) { S.webUsers.draft = { ...u, edit: true, orig: u.email }; render(); } },
  async 'users-save'() {
    const d = S.webUsers.draft, email = String(d.email || '').trim().toLowerCase(), role = d.role || 'sales';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('ใส่อีเมลให้ถูกต้อง', 'bad'); return; }
    if (role === 'sales' && !d.sales_name) { toast('เซลล์ต้องเลือกชื่อเซลล์', 'bad'); return; }
    if (role === 'admin' && !d.branch) { toast('แอดมินต้องเลือกสาขา', 'bad'); return; }
    // a changed e-mail (ตกลง 22/10): the person gets a row under the new address; the old row is switched off and kept,
    // so names in past history still show
    const orig = d.edit ? d.orig : null, moved = !!(orig && orig !== email);
    if (moved && S.webUsers.list.some(x => x.email === email)) { toast(`มีอีเมล ${email} ในรายการแล้ว`, 'bad'); return; }
    if (moved && orig === window.__WEB.email) { toast('เปลี่ยนอีเมลของตัวเองที่นี่ไม่ได้ (จะเข้าเว็บไม่ได้) ให้ผู้บริหารอีกคนเปลี่ยนให้', 'bad'); return; }
    const prev = S.webUsers.list.find(x => x.email === (moved ? orig : email));
    if (moved && !confirm(`เปลี่ยนอีเมล ${orig} → ${email}?\nอีเมลเดิมจะเข้าเว็บไม่ได้ ครั้งแรกให้เข้าด้วยอีเมลใหม่ (ลิงก์ทางอีเมล หรือ Google)`)) return;
    try {
      await window.__WEB.members.save({ email, name: String(d.name || '').trim() || null, role, branch: usersBrFixed(role) ? null : (d.branch || (role === 'sales' ? salesBranch(d.sales_name) : null) || null), sales_name: role === 'sales' ? d.sales_name : null, active: prev ? prev.active : true });
      if (moved && prev) await window.__WEB.members.save({ email: orig, name: prev.name, role: prev.role, branch: prev.branch, sales_name: prev.sales_name, active: false });
      toast(moved ? `เปลี่ยนอีเมลเป็น ${email} แล้ว (อีเมลเดิมปิดใช้งาน)` : prev ? 'บันทึกการแก้แล้ว' : `เพิ่ม ${email} แล้ว`); S.webUsers = null; render();
    } catch (e) { toast('บันทึกไม่ได้: ' + (e.message || ''), 'bad'); }
  },
  async 'users-toggle'(el) {
    const u = S.webUsers.list.find(x => x.email === el.dataset.email); if (!u) return;
    try { await window.__WEB.members.save({ email: u.email, name: u.name, role: u.role, branch: u.branch, sales_name: u.sales_name, active: !u.active }); toast(u.active ? 'ปิดการใช้งานแล้ว' : 'เปิดใช้งานแล้ว'); S.webUsers = null; render(); }
    catch (e) { toast('บันทึกไม่ได้: ' + (e.message || ''), 'bad'); }
  }
});

// ---- moving data from the claude.ai version: an export file; the executive picks which parts to bring over (ตกลง 14/10)
// Default: only the sales list and the models / grades / colours (with prices). Bookings, locks and IDS files already
// come in on the web by themselves (Google Sheet, IDS upload), so they are left unticked.
function importGroups() {
  return [
    ['sales', 'รายชื่อเซลล์', d => d.col === 'ref' && d.id === 'sales', true],
    ['catalog', 'รุ่น เกรด สี (และราคาถ้ามี)', d => d.col === 'ref' && d.id === 'catalog', true],
    ['foc', 'รายการของแถม (FOC)', d => d.col === 'ref' && d.id === 'foc', false],
    ['fees', 'ค่าธรรมเนียม', d => d.col === 'ref' && d.id === 'fees', false],
    ['refo', 'ตั้งค่าอื่น (Google Form, ชื่อผู้ใช้เดิม)', d => d.col === 'ref' && !['sales', 'catalog', 'foc', 'fees'].includes(d.id), false],
    ['bookings', 'ใบจอง', d => d.col === 'bookings', false],
    ['locks', 'ล็อกรถ', d => d.col === 'locks', false],
    ['ids', 'ไฟล์ IDS (สต็อก ใบจอง ใบกำกับ Quota)', d => d.col === 'ids', false],
    ['receipts', 'ใบเสร็จ', d => d.col === 'receipts', false],
    ['other', 'อื่น ๆ', d => !['ref', 'bookings', 'locks', 'ids', 'receipts'].includes(d.col), false]
  ];
}
function importBox() {
  const I = S.webImport || {};
  const doneBox = I.done ? `<div class="p-3 rounded-lg text-sm mb-3" style="background:var(--good-soft)">นำเข้าแล้ว: ${esc(I.done.what || '')} · ${fmtN(I.done.docs)} รายการ${I.done.assets ? ` · รูป ${fmtN(I.done.assets)} รูป` : ''}</div>` : '';
  const plan = I.plan, pick = (plan && plan.pick) || {};
  const groups = plan ? importGroups().map(([k, t, f]) => { const ds = IMPORT_DATA.docs.filter(f); return { k, t, n: ds.length, have: ds.filter(d => S[d.col] && S[d.col].has && S[d.col].has(d.id)).length }; }).filter(g => g.n) : [];
  return `<div class="bg-surface border border-line rounded-lg p-4 mb-4"><h3 class="font-medium mb-1">ดึงข้อมูลจากระบบเดิม (claude.ai)</h3>
    <p class="text-sm text-muted mb-2">เลือกไฟล์ข้อมูล (at-honda-data-….json) แล้วติ๊กเฉพาะส่วนที่ต้องการดึง ส่วนที่ติ๊กจะแทนข้อมูลเดิมในเว็บ ส่วนที่ไม่ติ๊กไม่ถูกแตะ</p>
    ${doneBox}
    ${I.busy ? `<p class="text-sm"><span class="spin"></span> ${esc(I.busy)}</p>` : plan ? `<div class="text-sm mb-2">ไฟล์ ${esc(plan.name)} · ส่งออกเมื่อ ${fmtDT(plan.at)}</div>
      <div class="grid sm:grid-cols-2 gap-1 mb-3">${groups.map(g => `<label class="flex items-center gap-2 text-sm py-1"><input type="checkbox" class="w-5 h-5" data-import-pick="${g.k}" ${pick[g.k] ? 'checked' : ''}> ${esc(g.t)} <span class="text-muted">${fmtN(g.n)} รายการ${g.have ? ` · ในเว็บมีแล้ว ${fmtN(g.have)} (จะถูกแทน)` : ''}</span></label>`).join('')}
        ${plan.assets ? `<label class="flex items-center gap-2 text-sm py-1"><input type="checkbox" class="w-5 h-5" data-import-pick="imgs" ${pick.imgs ? 'checked' : ''}> รูปใบจอง / สลิป <span class="text-muted">${fmtN(plan.assets)} รูป</span></label>` : ''}</div>
      <div class="flex gap-2"><button class="btn btn-red btn-sm" data-act="import-run" ${Object.values(pick).some(Boolean) ? '' : 'disabled'}>ดึงข้อมูลที่เลือก</button><button class="btn btn-ghost btn-sm" data-act="import-cancel">ยกเลิก</button></div>`
      : `<label class="btn btn-ghost btn-sm relative">เลือกไฟล์ข้อมูล<input type="file" accept=".json,application/json" data-import-bundle class="absolute w-px h-px opacity-0"></label>`}
    ${I.err ? `<p class="text-sm mt-2" style="color:var(--bad)">${esc(I.err)}</p>` : ''}</div>`;
}
let IMPORT_DATA = null;
document.addEventListener('change', async ev => {
  const t = ev.target; if (!t || !t.dataset) return;
  if (t.dataset.importPick !== undefined && S.webImport && S.webImport.plan) { S.webImport.plan.pick[t.dataset.importPick] = t.checked; render(); return; }
  if (t.dataset.importBundle === undefined) return;
  const f = t.files && t.files[0]; t.value = ''; if (!f) return;
  try {
    const b = JSON.parse(await f.text());
    if (b.kind !== 'at-honda-export' || !Array.isArray(b.docs)) throw new Error('ไม่ใช่ไฟล์ข้อมูล AT Honda');
    const pick = {}; importGroups().forEach(([k, , , on]) => { pick[k] = on; }); pick.imgs = false;
    IMPORT_DATA = b; S.webImport = { plan: { name: f.name, at: b.exported_at, pick, assets: Object.keys(b.assets || {}).length } };
  } catch (e) { S.webImport = { err: 'อ่านไฟล์ไม่ได้: ' + (e.message || '') }; }
  render();
});
Object.assign(ACTIONS, {
  'import-cancel'() { IMPORT_DATA = null; S.webImport = null; render(); },
  async 'import-run'() {
    const b = IMPORT_DATA, plan = S.webImport && S.webImport.plan; if (!b || !plan) return;
    const gs = importGroups().filter(([k]) => plan.pick[k]), docs = b.docs.filter(d => gs.some(([, , f]) => f(d)));
    const ids = plan.pick.imgs ? Object.keys(b.assets || {}) : []; let n = 0;
    const what = [...gs.map(([, t]) => t), ...(ids.length ? ['รูป'] : [])].join(', ');
    try {
      for (const id of ids) {
        S.webImport = { busy: `กำลังอัปโหลดรูป ${++n}/${ids.length}` }; render();
        const a = b.assets[id], bin = Uint8Array.from(atob(a.b64), c => c.charCodeAt(0));
        await window.__WEB.importAsset(id, new Blob([bin], { type: a.type }), a.type);
      }
      if (docs.length) await window.__WEB.importDocs(docs, k => { S.webImport = { busy: `กำลังนำเข้ารายการ ${k}/${docs.length}` }; render(); });
      S.webImport = { done: { docs: docs.length, assets: ids.length, what } }; IMPORT_DATA = null; S.cache = null; toast('ดึงข้อมูลแล้ว: ' + what);
    } catch (e) { S.webImport = { err: 'นำเข้าไม่สำเร็จ: ' + (e.message || '') + ' (กดเลือกไฟล์แล้วลองอีกครั้งได้ ข้อมูลที่เข้าไปแล้วจะไม่ซ้ำ)' }; }
    render();
  }
});
