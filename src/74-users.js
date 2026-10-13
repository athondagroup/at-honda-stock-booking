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
  return `${importBox()}<p class="text-sm text-muted mb-3">คนที่เข้าเว็บได้ต้องมีอีเมลในรายการนี้ (ล็อกอินด้วย Google หรือรับลิงก์ทางอีเมล) · เซลล์ต้องเลือกชื่อเซลล์ · แอดมินต้องเลือกสาขา · ปิดการใช้งานแทนการลบ</p>
  <div class="bg-surface border border-line rounded-lg p-4 mb-4"><h3 class="font-medium mb-2">เพิ่ม / แก้ผู้ใช้</h3>
    <div class="grid sm:grid-cols-5 gap-3 items-end">
      <div class="field"><label for="u-em">อีเมล</label><input id="u-em" type="email" data-users="email" value="${esc(d.email || '')}" ${d.edit ? 'readonly' : ''}></div>
      <div class="field"><label for="u-nm">ชื่อที่แสดง</label><input id="u-nm" data-users="name" value="${esc(d.name || '')}"></div>
      <div class="field"><label for="u-rl">บทบาท</label><select id="u-rl" data-users="role">${roleOpt(d.role || 'sales')}</select></div>
      <div class="field"><label for="u-br">สาขา</label><select id="u-br" data-users="branch">${brOpt(d.branch || '')}</select></div>
      <div class="field"><label for="u-sn">ชื่อเซลล์ (เฉพาะเซลล์)</label><select id="u-sn" data-users="sales_name">${salesOpt(d.sales_name || '')}</select></div>
    </div>
    <div class="flex flex-wrap gap-2 mt-3"><button class="btn btn-red btn-sm" data-act="users-save">${d.edit ? 'บันทึกการแก้' : '+ เพิ่มผู้ใช้'}</button>${d.edit ? '<button class="btn btn-ghost btn-sm" data-act="users-new">ยกเลิก</button>' : ''}</div></div>
  <div class="bg-surface border border-line rounded-lg scroll-x"><table class="tbl text-sm"><thead><tr><th>อีเมล</th><th>ชื่อ</th><th>บทบาท</th><th>สาขา</th><th>ชื่อเซลล์</th><th>สถานะ</th><th></th></tr></thead><tbody>
    ${U.list.map(u => `<tr ${u.active ? '' : 'class="text-muted"'}><td>${esc(u.email)}</td><td>${esc(u.name || '')}</td><td>${esc((ROLES[u.role] || {}).label || u.role)}</td><td>${esc(u.branch || '–')}</td><td>${esc(u.sales_name || '–')}</td>
      <td>${u.active ? (u.user_id ? chip('ใช้งาน', 'good') : chip('ยังไม่เคยเข้า', 'neutral')) : chip('ปิดแล้ว', 'muted')}</td>
      <td class="text-right nowrap"><button class="btn btn-ghost btn-sm" data-act="users-edit" data-email="${esc(u.email)}">แก้</button>${u.email === window.__WEB.email ? '' : `<button class="btn btn-ghost btn-sm" data-act="users-toggle" data-email="${esc(u.email)}">${u.active ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}</button>`}</td></tr>`).join('')}</tbody></table></div>`;
}
async function usersLoad() {
  S.webUsers = { list: [], draft: {}, loading: true };
  try { S.webUsers = { list: await window.__WEB.members.list(), draft: {} }; } catch (e) { S.webUsers = { err: 'โหลดรายชื่อไม่ได้: ' + (e.message || '') }; }
  render();
}
document.addEventListener('input', ev => { const t = ev.target; if (t && t.dataset && t.dataset.users && S.webUsers && S.webUsers.draft) S.webUsers.draft[t.dataset.users] = t.value; });
Object.assign(ACTIONS, {
  'users-reload'() { S.webUsers = null; render(); },
  'users-new'() { S.webUsers.draft = {}; render(); },
  'users-edit'(el) { const u = S.webUsers.list.find(x => x.email === el.dataset.email); if (u) { S.webUsers.draft = { ...u, edit: true }; render(); } },
  async 'users-save'() {
    const d = S.webUsers.draft, email = String(d.email || '').trim().toLowerCase(), role = d.role || 'sales';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('ใส่อีเมลให้ถูกต้อง', 'bad'); return; }
    if (role === 'sales' && !d.sales_name) { toast('เซลล์ต้องเลือกชื่อเซลล์', 'bad'); return; }
    if (role === 'admin' && !d.branch) { toast('แอดมินต้องเลือกสาขา', 'bad'); return; }
    const prev = S.webUsers.list.find(x => x.email === email);
    try {
      await window.__WEB.members.save({ email, name: String(d.name || '').trim() || null, role, branch: d.branch || (role === 'sales' ? salesBranch(d.sales_name) : null) || null, sales_name: role === 'sales' ? d.sales_name : null, active: prev ? prev.active : true });
      toast(prev ? 'บันทึกการแก้แล้ว' : `เพิ่ม ${email} แล้ว`); S.webUsers = null; render();
    } catch (e) { toast('บันทึกไม่ได้: ' + (e.message || ''), 'bad'); }
  },
  async 'users-toggle'(el) {
    const u = S.webUsers.list.find(x => x.email === el.dataset.email); if (!u) return;
    try { await window.__WEB.members.save({ email: u.email, name: u.name, role: u.role, branch: u.branch, sales_name: u.sales_name, active: !u.active }); toast(u.active ? 'ปิดการใช้งานแล้ว' : 'เปิดใช้งานแล้ว'); S.webUsers = null; render(); }
    catch (e) { toast('บันทึกไม่ได้: ' + (e.message || ''), 'bad'); }
  }
});

// ---- one-time move from the claude.ai version: an export file with every record and photo
function importBox() {
  const I = S.webImport || {};
  if (I.done) return `<div class="p-3 rounded-lg text-sm mb-4" style="background:var(--good-soft)">นำเข้าแล้ว: ${fmtN(I.done.docs)} รายการ · รูป ${fmtN(I.done.assets)} รูป</div>`;
  const plan = I.plan;
  return `<div class="bg-surface border border-line rounded-lg p-4 mb-4"><h3 class="font-medium mb-1">นำเข้าข้อมูลจากระบบเดิม (claude.ai)</h3>
    <p class="text-sm text-muted mb-2">ใช้ครั้งเดียวตอนย้ายระบบ เลือกไฟล์ข้อมูลที่ได้รับ (at-honda-data-….json) ระบบแสดงจำนวนก่อน แล้วกดนำเข้า รายการที่มีอยู่แล้วจะถูกแทนด้วยข้อมูลในไฟล์</p>
    ${I.busy ? `<p class="text-sm"><span class="spin"></span> ${esc(I.busy)}</p>` : plan ? `<div class="text-sm mb-2">ไฟล์ ${esc(plan.name)} · ส่งออกเมื่อ ${fmtDT(plan.at)}<br>${Object.entries(plan.cols).map(([c, n]) => `${c} ${fmtN(n.all)} (มีอยู่แล้ว ${fmtN(n.have)})`).join(' · ')} · รูป ${fmtN(plan.assets)} รูป</div>
      <div class="flex gap-2"><button class="btn btn-red btn-sm" data-act="import-run">นำเข้า</button><button class="btn btn-ghost btn-sm" data-act="import-cancel">ยกเลิก</button></div>`
      : `<label class="btn btn-ghost btn-sm relative">เลือกไฟล์ข้อมูล<input type="file" accept=".json,application/json" data-import-bundle class="absolute w-px h-px opacity-0"></label>`}
    ${I.err ? `<p class="text-sm mt-2" style="color:var(--bad)">${esc(I.err)}</p>` : ''}</div>`;
}
let IMPORT_DATA = null;
document.addEventListener('change', async ev => {
  const t = ev.target; if (!t || !t.dataset || t.dataset.importBundle === undefined) return;
  const f = t.files && t.files[0]; t.value = ''; if (!f) return;
  try {
    const b = JSON.parse(await f.text());
    if (b.kind !== 'at-honda-export' || !Array.isArray(b.docs)) throw new Error('ไม่ใช่ไฟล์ข้อมูล AT Honda');
    const cols = {}; b.docs.forEach(d => { const c = (cols[d.col] ||= { all: 0, have: 0 }); c.all++; if (S[d.col] && S[d.col].has && S[d.col].has(d.id)) c.have++; });
    IMPORT_DATA = b; S.webImport = { plan: { name: f.name, at: b.exported_at, cols, assets: Object.keys(b.assets || {}).length } };
  } catch (e) { S.webImport = { err: 'อ่านไฟล์ไม่ได้: ' + (e.message || '') }; }
  render();
});
Object.assign(ACTIONS, {
  'import-cancel'() { IMPORT_DATA = null; S.webImport = null; render(); },
  async 'import-run'() {
    const b = IMPORT_DATA; if (!b) return;
    const ids = Object.keys(b.assets || {}); let n = 0;
    try {
      for (const id of ids) {
        S.webImport = { busy: `กำลังอัปโหลดรูป ${++n}/${ids.length}` }; render();
        const a = b.assets[id], bin = Uint8Array.from(atob(a.b64), c => c.charCodeAt(0));
        await window.__WEB.importAsset(id, new Blob([bin], { type: a.type }), a.type);
      }
      await window.__WEB.importDocs(b.docs, k => { S.webImport = { busy: `กำลังนำเข้ารายการ ${k}/${b.docs.length}` }; render(); });
      S.webImport = { done: { docs: b.docs.length, assets: ids.length } }; IMPORT_DATA = null; toast('นำเข้าข้อมูลแล้ว');
    } catch (e) { S.webImport = { err: 'นำเข้าไม่สำเร็จ: ' + (e.message || '') + ' (กดเลือกไฟล์แล้วลองอีกครั้งได้ ข้อมูลที่เข้าไปแล้วจะไม่ซ้ำ)' }; }
    render();
  }
});
