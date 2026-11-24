import os, re
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(D)
def edit(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:80], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)
edit(os.path.join(D, 'patch.py'), [(
 '''PROF_BTN = """{window.__QWEB && (
    <button''',
 '''PROF_BTN = """{window.__QWEB && (
    <a href="../" title="ไปเว็บ AT stock" className="h-10 px-3 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap"><i className="fa-solid fa-warehouse"></i><span className="hidden sm:inline">ไปเว็บ AT stock</span><span className="sm:hidden">AT stock</span></a>
)}
{window.__QWEB && (
    <button''')])
edit(os.path.join(D, 'admin.jsx'), [(
 '''<button type="button" disabled={busy} onClick={save} className="w-full py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50">{busy ? 'กำลังบันทึก…' : 'บันทึกข้อมูลของฉัน'}</button>''',
 '''<div className="flex gap-2">
                                <button type="button" disabled={busy} onClick={save} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50"><i className="fa-solid fa-floppy-disk mr-1.5"></i>{busy ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}</button>
                                {window.__QWEB && window.__QWEB.logout && <button type="button" disabled={busy} onClick={() => window.__QWEB.logout()} className="flex-1 py-3 rounded-xl bg-white border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-50"><i className="fa-solid fa-right-from-bracket mr-1.5"></i>ออกจากระบบ</button>}
                            </div>''')])
p = os.path.join(R, 'web', 'gate.js'); s = open(p, encoding='utf-8').read()
i = s.index('  function footer(email) {'); j = s.index('  async function start(', i)
s = s[:i] + s[j:]
assert s.count('    footer(email);\n') == 1; s = s.replace('    footer(email);\n', '')
open(p, 'w', encoding='utf-8').write(s)
print('ok')
