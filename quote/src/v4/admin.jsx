
        // =====================================================================
        // ADMIN-PANEL — หลังบ้าน (ผู้ดูแลระบบ): ตารางแคมเปญรายเดือน / ค่าจดทะเบียน ประกัน FOC / ผู้ใช้งาน / ตั้งค่า
        // =====================================================================
        const ADMIN_LISTS = {
            camp: { title: 'แคมเปญ Honda', monthly: true, cols: [['model', 'กลุ่มรุ่น', 'w-40'], ['no', 'ทางเลือก', 'w-16 text-center'], ['name', 'ชื่อทางเลือก', ''], ['sup', 'เข้า Margin', 'w-24 text-right'], ['rate', 'ดอกเบี้ย', 'w-20 text-right']],
                fields: [['month', 'เดือนแคมเปญ (ปี-เดือน)', 'month'], ['code', 'รหัสทางเลือก (กลุ่ม-ลำดับ เช่น crv-3)', 'text'], ['group', 'กลุ่มรุ่น (รหัส)', 'group'], ['model', 'รุ่น (ชื่อที่แสดง)', 'text'], ['gradeCond', 'เกรด / เงื่อนไข', 'text'], ['no', 'ทางเลือกที่', 'text'], ['name', 'ชื่อทางเลือก (ขึ้นในรายการให้เลือก)', 'textarea'], ['rate', 'ดอกเบี้ยเริ่มต้น (ว่าง = ดอกเบี้ยมาตรฐาน)', 'text'], ['sup', 'Honda แคมเปญ เข้า Margin (บาท)', 'number'], ['freeIns', 'ฟรีประกัน (ปี)', 'number'], ['excl', 'ห้ามใช้ร่วมกับ (คั่นด้วย /)', 'text'], ['bookFrom', 'จองตั้งแต่', 'date'], ['bookTo', 'จองถึง', 'date'], ['deliverBy', 'ออกใบกำกับ / รับรถภายใน', 'date'], ['ref', 'อ้างอิง (เลขที่หนังสือ)', 'text']] },
            margin: { title: 'Margin มาตรฐาน', monthly: true, cols: [['model', 'รุ่น', ''], ['cash', 'ซื้อสด %', 'w-20 text-right'], ['fin', 'ไฟแนนซ์ %', 'w-20 text-right'], ['step1', 'Step 1', 'w-24 text-right'], ['step2', 'Step 2', 'w-24 text-right']],
                fields: [['month', 'เดือนแคมเปญ', 'month'], ['model', 'รุ่น', 'text'], ['cash', 'Margin รถ ซื้อสด %', 'text'], ['fin', 'Margin รถ ไฟแนนซ์ %', 'text'], ['step1', 'AT แคมเปญ Step ช่อง 1 (บาท)', 'number'], ['step2', 'AT แคมเปญ Step ช่อง 2 (บาท)', 'number'], ['note', 'หมายเหตุ', 'text']] },
            priv: { title: 'สิทธิพิเศษ Honda', monthly: true, cols: [['privName', 'สิทธิ์', ''], ['model', 'รุ่น', 'w-32'], ['a1', '1 คัน', 'w-20 text-right'], ['a2', '2 คันขึ้นไป / สูงสุด', 'w-24 text-right'], ['toMargin', 'เข้า Margin', 'w-20']],
                fields: [['month', 'เดือนแคมเปญ', 'month'], ['code', 'รหัสสิทธิ์ (gtg, ln, hk, td, loyalty, fj, yto)', 'text'], ['privName', 'ชื่อสิทธิ์', 'text'], ['mkey', 'รหัสรุ่น (city, cityHb, civic, hrv, accord, crv, en2, step, all)', 'text'], ['model', 'รุ่น', 'text'], ['a1', 'ยอด 1 คัน (บาท)', 'number'], ['a2', 'ยอด 2 คันขึ้นไป / สูงสุด (บาท)', 'number'], ['toMargin', 'เข้า Margin (ใช่ / ไม่)', 'text'], ['cond', 'เงื่อนไข', 'textarea']] },
            rates: { title: 'ตารางดอกเบี้ยแคมเปญ', cols: [['code', 'รหัสตาราง', 'w-40'], ['down', 'ดาวน์ตั้งแต่ %', 'w-24 text-right'], ['t48', '48', 'text-right'], ['t60', '60', 'text-right'], ['t72', '72', 'text-right'], ['t84', '84', 'text-right'], ['t90', '90', 'text-right'], ['t99', '99', 'text-right']],
                fields: [['code', 'รหัสตาราง (เช่น CP-crv-2)', 'text'], ['down', 'ดาวน์ตั้งแต่ (%)', 'number'], ['t48', '48 งวด (%)', 'text'], ['t60', '60 งวด (%)', 'text'], ['t72', '72 งวด (%)', 'text'], ['t84', '84 งวด (%)', 'text'], ['t90', '90 งวด (%)', 'text'], ['t99', '99 งวด (%)', 'text']] },
            bind: { title: 'ผูกทางเลือกกับตารางดอกเบี้ย', cols: [['type', 'ประเภท', 'w-24'], ['bank', 'ธนาคาร', 'w-24'], ['grp', 'กลุ่มรุ่น', 'w-28'], ['no', 'ทางเลือก', 'w-20 text-center'], ['code', 'รหัสตาราง', '']],
                fields: [['type', 'ประเภท (แคมเปญ / มาตรฐาน)', 'text'], ['bank', 'ธนาคาร (มาตรฐานเท่านั้น)', 'text'], ['grp', 'กลุ่มรุ่น', 'group'], ['no', 'ทางเลือกที่', 'text'], ['code', 'รหัสตาราง', 'text']] },
            reg: { title: 'ค่าจดทะเบียน', cols: [['label', 'รายการ / รุ่น', ''], ['grp', 'กลุ่ม', 'w-24'], ['person', 'บุคคลธรรมดา', 'w-28 text-right'], ['company', 'นิติบุคคล', 'w-28 text-right'], ['payer', 'คนจ่าย', 'w-24']],
                fields: [['label', 'รายการ / รุ่น', 'text'], ['grp', 'กลุ่มรุ่น (รหัส)', 'text'], ['person', 'บุคคลธรรมดา (บาท)', 'number'], ['company', 'นิติบุคคล (บาท)', 'number'], ['payer', 'คนจ่าย (ค่าตั้งต้น)', 'text'], ['note', 'หมายเหตุ', 'text']] },
            ins: { title: 'เบี้ยประกัน', monthly: true, cols: [['model', 'รุ่น', ''], ['grp', 'กลุ่ม', 'w-24'], ['years', 'ปี', 'w-12 text-center'], ['y1', 'ปีที่ 1', 'w-24 text-right'], ['y2', 'ปีที่ 2', 'w-24 text-right'], ['y3', 'ปีที่ 3', 'w-24 text-right']],
                fields: [['month', 'เดือนแคมเปญ', 'month'], ['model', 'รุ่น', 'text'], ['grp', 'กลุ่มรุ่น (รหัส: city, cityTurbo, cityHb, civic, civicEL, hrv, accord, crv, en2, step)', 'text'], ['codeName', 'ชื่อในโค้ด', 'text'], ['years', 'ทำประกัน (ปี)', 'number'], ['y1', 'เบี้ยปีที่ 1', 'number'], ['y2', 'เบี้ยปีที่ 2', 'number'], ['y3', 'เบี้ยปีที่ 3', 'number'], ['note', 'หมายเหตุ', 'text']] },
            gifts: { title: 'ของแถมใช้บ่อย', cols: [['label', 'รายการ', ''], ['mode', 'วิธีคิดทุน', 'w-32'], ['cost', 'ทุน fix', 'w-24 text-right'], ['q', 'คำค้นใน FOC', 'w-40'], ['std', 'รายการเริ่มต้น', 'w-24 text-center']],
                fields: [['label', 'ชื่อรายการ (ขึ้นบนปุ่ม และในใบเสนอราคา)', 'textarea'], ['mode', 'วิธีคิดทุน', 'mode'], ['cost', 'ทุน fix (บาท) · ใช้เมื่อเลือก “ทุน fix”', 'number'], ['q', 'คำค้นในรายการ FOC (หลายคำคั่นด้วย | เช่น ม่าน|บังแดด) · ใช้เมื่อเลือก “เลือกจาก FOC” · ว่าง = ใช้ชื่อรายการ', 'text'], ['std', 'รายการเริ่มต้น (ใส่ให้อัตโนมัติในใบเสนอราคาใหม่)', 'yn']] },
            foc: { title: 'รายการ FOC', cols: [['name', 'รายการ', ''], ['model', 'รุ่น', 'w-14'], ['cat', 'หมวด', 'w-28'], ['cost', 'ทุน FOC', 'w-24 text-right'], ['sale', 'ราคาขาย', 'w-24 text-right']],
                fields: [['name', 'รายการ', 'textarea'], ['model', 'รหัสรุ่น (CT, CH, CV, HR, CR, AC, EN, SW, BR, OT = ทุกรุ่น)', 'text'], ['cat', 'หมวด', 'text'], ['part', 'Part No.', 'text'], ['vendor', 'ผู้ขาย', 'text'], ['cost', 'ราคา FOC / ทุน (บาท)', 'number'], ['sale', 'ราคาขาย (บาท)', 'number'], ['note', 'หมายเหตุ', 'text'], ['src', 'ที่มา / รหัส', 'text']] }
        };
        const ADMIN_GROUPS = Object.keys(AT_GROUP_MKEY);
        const adminFmt = (k, v) => {
            if (k === 'mode') return /^fix/i.test(cfgStr(v)) ? 'ทุน fix' : 'เลือกจาก FOC';
            if (k === 'std') return /^(y|yes|ใช่|1|true)$/i.test(cfgStr(v)) ? '✓ เริ่มต้น' : '–';
            if (['sup', 'a1', 'a2', 'step1', 'step2', 'person', 'company', 'y1', 'y2', 'y3', 'cost', 'sale'].includes(k)) { const n = cfgNum(v); return cfgStr(v) === '' ? '–' : formatCurrency(n); }
            return cfgStr(v) || '–';
        };

        const AdminPanel = ({ api }) => {
            const { cfg, canWrite } = api;
            const [sec, setSec] = useState('campaign');
            const [sub, setSub] = useState('camp');
            const [fsub, setFsub] = useState('reg');
            const listKey = sec === 'campaign' ? sub : sec === 'fees' ? fsub : sec;
            const def = ADMIN_LISTS[listKey];
            const allRows = !def ? [] : listKey === 'foc' ? cfg.foc : (Array.isArray(cfg[listKey]) ? cfg[listKey] : []);
            const months = useMemo(() => [...new Set(allRows.map(r => r.month).filter(Boolean))].sort().reverse(), [allRows]);
            const [month, setMonth] = useState(api.month || '');
            const curMonth = def && def.monthly ? (months.includes(month) ? month : (months[0] || '')) : '';
            const [q, setQ] = useState('');
            const [edit, setEdit] = useState(null);
            const [busy, setBusy] = useState(false);
            const [note, setNote] = useState('');
            const [copyTo, setCopyTo] = useState('');
            const [confirm, setConfirm] = useState('');
            const [importDraft, setImportDraft] = useState(null);
            const [limit, setLimit] = useState(150);
            const fileRef = useRef(null);
            // ---------- ดึงข้อมูลจาก Google Sheet (ผ่าน Google Sheets ที่เชื่อมใน claude.ai ของผู้กด)
            const [pull, setPull] = useState(null);
            const PULL_RANGES = { camp: 'A1:P1500', margin: 'A1:H600', priv: 'A1:J600', rates: 'A1:H1500', bind: 'A1:F600', reg: 'A1:G120', ins: 'A1:K600' };
            const mcpErrText = (e) => {
                const c = e && e.code;
                if (c === 'server_not_connected') return 'ยังไม่ได้เชื่อม Google Sheets ในบัญชี claude.ai นี้ · เพิ่มที่ Settings → Connectors แล้วกดใหม่';
                if (c === 'needs_reauth') return 'Google Sheets ต้องเข้าสู่ระบบใหม่ · เชื่อมต่อใหม่ที่ Settings → Connectors แล้วกดใหม่';
                if (c === 'not_granted' || c === 'capability_disabled' || c === 'not_in_manifest' || c === 'blocked_by_policy' || c === 'approval_required') return 'หน้านี้ยังไม่ได้รับอนุญาตให้ใช้ Google Sheets · อนุญาตจากเมนูสิทธิ์ของหน้านี้แล้วกดใหม่';
                if (c === 'tool_error') return 'ชีตตอบกลับผิดพลาด: ' + (e.message || '') + ' · ตรวจว่า ID ชีตถูกต้องและบัญชีนี้เปิดชีตได้';
                return 'ดึงจากชีตไม่สำเร็จ: ' + ((e && e.message) || 'ไม่ทราบสาเหตุ');
            };
            const pullFromSheet = async () => {
                setPull({ busy: true, step: 'เชื่อมต่อ Google Sheets' });
                let mcp = null;
                try { mcp = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('mcp') : null; } catch (e) { mcp = null; }
                if (!mcp) { setPull({ err: 'หน้านี้เรียก Google Sheets ไม่ได้ · เปิดหน้านี้ใน claude.ai และอนุญาต Google Sheets ให้หน้านี้' }); return; }
                // ดึงทีละช่วง 60 แถว ให้ได้ครบทุกแถวแม้แท็บจะใหญ่
                const call = async (range) => {
                    const r = await mcp.callTool('Google Sheets', 'get_values', { spreadsheetId: cfg.settings.sheetId, range });
                    let p = r && r.payload;
                    if ((!p || typeof p !== 'object') && r && Array.isArray(r.content)) {
                        const t = r.content.find(x => x && x.type === 'text');
                        try { p = JSON.parse(t.text); } catch (e) { throw new Error('อ่านข้อมูลช่วง ' + range + ' ไม่ได้'); }
                    }
                    return (p && Array.isArray(p.values)) ? p.values : [];
                };
                const counts = {};
                const get = async (tab, cols) => {
                    const firstCol = cols.split(':')[0].replace(/\d+/g, '');
                    const lastCol = cols.split(':')[1].replace(/\d+/g, '');
                    const out = [];
                    const size = 60;
                    for (let start = 1; start < 6000; start += size) {
                        setPull({ busy: true, step: `${tab} · แถว ${start}–${start + size - 1}` });
                        const vals = await call(`'${tab}'!${firstCol}${start}:${lastCol}${start + size - 1}`);
                        if (!vals.length && start > 1) break;
                        for (let k = 0; k < size; k++) out.push(vals[k] || []);
                    }
                    while (out.length && !out[out.length - 1].some(x => String(x ?? '').trim())) out.pop();
                    counts[tab] = out.filter(r => r.some(x => String(x ?? '').trim())).length;
                    return out;
                };
                try {
                    const data = {};
                    for (const k of AT_TABLE_ORDER) {
                        setPull({ busy: true, step: AT_TABLES[k].tab });
                        data[k] = cfgParseTab(k, await get(AT_TABLES[k].tab, PULL_RANGES[k]));
                    }
                    setPull({ busy: true, step: 'อุปกรณ์แท้ / อุปกรณ์เทียบเคียง / DVP Package' });
                    const g = await get('อุปกรณ์แท้', 'A1:M3000'), a = await get('อุปกรณ์เทียบเคียง', 'A1:N4000'), d = await get('DVP Package', 'A1:I1500');
                    data.foc = cfgFocFromSheet(g, a, d);
                    data.focParts = { genuine: data.foc.filter(x => /^แท้/.test(x.src)).length, atg: data.foc.filter(x => /^ATG/.test(x.src)).length, dvp: data.foc.filter(x => /^DVP/.test(x.src)).length };
                    data.counts = counts;
                    setPull({ data, at: new Date() });
                } catch (e) { setPull({ err: mcpErrText(e) }); }
            };
            const savePulled = async () => {
                const data = pull && pull.data;
                if (!data) return;
                const stamp = `ดึงจากชีต ${new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}`;
                setPull({ ...pull, saving: true });
                try {
                    for (const k of AT_TABLE_ORDER) if (data[k] && data[k].length) await api.saveTable(k, data[k], stamp);
                    if (data.foc && data.foc.length) await api.saveFoc(data.foc, stamp);
                    await api.saveSettings({ pulledAt: new Date().toISOString() });
                    setPull(null);
                    show('ดึงข้อมูลจากชีตเข้าเว็บแล้ว · ใบเสนอราคาใช้ข้อมูลใหม่ทันที');
                } catch (e) { setPull({ ...pull, saving: false, err: 'บันทึกไม่สำเร็จ: ' + ((e && e.message) || 'ไม่มีสิทธิ์เขียน') }); }
            };

            const show = (t) => { setNote(t); };
            const run = async (fn, okText) => {
                setBusy(true);
                try { await fn(); show(okText); } catch (e) { show('บันทึกไม่สำเร็จ: ' + (e && e.message ? e.message : 'ไม่มีสิทธิ์เขียน')); }
                setBusy(false);
            };
            const saveRows = (key, rows, okText, src) => run(() => key === 'foc' ? api.saveFoc(rows, src) : api.saveTable(key, rows, src), okText);

            const visible = useMemo(() => {
                const t = q.trim().toLowerCase();
                return allRows.map((r, i) => ({ r, i })).filter(({ r }) => {
                    if (def && def.monthly && curMonth && r.month !== curMonth) return false;
                    if (t && !Object.values(r).join(' ').toLowerCase().includes(t)) return false;
                    return true;
                });
            }, [allRows, curMonth, q, listKey]);

            const optionInfo = (r) => {
                if (listKey !== 'camp') return null;
                const promo = cfgStr(r.rate) !== '';
                const b = cfg.bind.find(x => /แคมเปญ/.test(x.type) && x.grp === r.group && cfgStr(x.no) === cfgStr(r.no));
                const ok = !promo || (b && cfgRateTable(cfg.rates, b.code));
                return { promo, code: b ? b.code : '', ok };
            };

            const openNew = () => {
                const blank = Object.fromEntries((listKey === 'foc' ? AT_TABLES.foc.cols : AT_TABLES[listKey].cols).map(c => [c, '']));
                if (def.monthly) blank.month = curMonth || cfgThisMonth();
                if ('active' in blank) blank.active = 'Y';
                if (listKey === 'foc') { blank.model = 'OT'; blank.vendor = ''; }
                if (listKey === 'bind') blank.type = 'แคมเปญ';
                setEdit({ key: listKey, index: -1, row: blank });
            };
            const saveEdit = () => {
                const rows = allRows.slice();
                const row = { ...edit.row };
                if (edit.index >= 0) rows[edit.index] = row; else rows.unshift(row);
                saveRows(edit.key, rows, edit.index >= 0 ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มรายการแล้ว');
                setEdit(null);
            };
            const deleteEdit = () => {
                const rows = allRows.filter((_, i) => i !== edit.index);
                saveRows(edit.key, rows, 'ลบรายการแล้ว');
                setEdit(null);
            };
            const toggleActive = (i) => {
                const rows = allRows.slice();
                rows[i] = { ...rows[i], active: cfgOn(rows[i].active) ? 'N' : 'Y' };
                saveRows(listKey, rows, cfgOn(rows[i].active) ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว');
            };
            const copyMonth = () => {
                if (!/^\d{4}-\d{2}$/.test(copyTo)) { show('ใส่เดือนใหม่แบบ ปี-เดือน เช่น 2026-12'); return; }
                const src = allRows.filter(r => r.month === curMonth);
                if (!src.length) return;
                const rows = [...src.map(r => ({ ...r, month: copyTo })), ...allRows.filter(r => r.month !== copyTo)];
                saveRows(listKey, rows, `คัดลอก ${src.length} แถวไปเดือน ${cfgMonthText(copyTo)} แล้ว`);
                setMonth(copyTo); setCopyTo('');
            };
            const downloadCsv = () => {
                const blob = new Blob([cfgCsv(listKey, allRows)], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${AT_TABLES[listKey].tab}.csv`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 4000);
            };
            const onFile = async (e) => {
                const f = e.target.files && e.target.files[0];
                e.target.value = '';
                if (!f) return;
                const text = await f.text();
                const vals = cfgParseCsv(text);
                const d = AT_TABLES[listKey];
                let rows;
                if (listKey === 'foc') {
                    const i = vals.findIndex(r => cfgStr(r[0]) === d.heads[0]);
                    rows = (i >= 0 ? vals.slice(i + 1) : vals).filter(r => r.some(x => cfgStr(x))).map(r => cfgRowFromArray(d.cols, r));
                } else rows = cfgParseTab(listKey, vals);
                if (!rows.length) { show(`ไม่พบหัวตาราง "${d.head || d.heads[0]}" ในไฟล์ · ใช้ไฟล์ CSV ของแท็บ ${d.tab}`); return; }
                setImportDraft({ key: listKey, rows, name: f.name });
            };

            const secBtn = (k, label) => <button key={k} type="button" onClick={() => { setSec(k); setQ(''); setEdit(null); setNote(''); setConfirm(''); }} className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${sec === k ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>{label}</button>;
            const subBtn = (cur, set, k, label) => <button key={k} type="button" onClick={() => { set(k); setQ(''); setNote(''); setConfirm(''); setLimit(150); }} className={`shrink-0 px-3 sm:px-4 py-2.5 text-sm font-bold border-b-[3px] ${cur === k ? 'border-red-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>;
            const srcText = (k) => cfg.src[k] === 'web' ? `แก้ล่าสุดในหลังบ้าน ${cfg.at[k] ? new Date(cfg.at[k]).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : ''}` : `ใช้ข้อมูลที่ฝังมากับเว็บ (ดึงจากชีต ${new Date(AT_SNAPSHOT.at).toLocaleDateString('th-TH', { dateStyle: 'medium' })})`;

            const field = ([k, label, type]) => {
                const v = edit.row[k] ?? '';
                const set = (val) => setEdit({ ...edit, row: { ...edit.row, [k]: val } });
                const cls = 'mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-red-500';
                return (
                    <label key={k} className={`block text-xs font-bold text-gray-500 ${type === 'textarea' ? 'sm:col-span-2' : ''}`}>{label}
                        {type === 'textarea' ? <textarea rows={3} value={v} onChange={e => set(e.target.value)} className={cls}></textarea>
                            : type === 'mode' ? <select value={/^fix/i.test(v) ? 'fix' : 'foc'} onChange={e => set(e.target.value)} className={cls}><option value="fix">ทุน fix (ใส่ทุนตามที่กำหนด)</option><option value="foc">เลือกจาก FOC (ดึงทุนจากรายการ FOC ของรุ่นนั้น)</option></select>
                            : type === 'yn' ? <select value={/^(y|yes|ใช่|1|true)$/i.test(v) ? 'Y' : ''} onChange={e => set(e.target.value)} className={cls}><option value="">ไม่ใช่</option><option value="Y">ใช่ · ใส่ให้ทุกใบเสนอราคาใหม่</option></select>
                            : type === 'group' ? <select value={v} onChange={e => set(e.target.value)} className={cls}><option value="">เลือก</option>{ADMIN_GROUPS.map(g => <option key={g} value={g}>{g} · {AT_GROUP_MKEY[g]}</option>)}</select>
                            : <input type={type === 'date' ? 'date' : 'text'} inputMode={type === 'number' ? 'decimal' : undefined} value={v} placeholder={type === 'month' ? '2026-12' : ''} onChange={e => set(e.target.value)} className={cls} />}
                    </label>
                );
            };

            // ---------- ผู้ใช้งาน ----------
            const [staffEdit, setStaffEdit] = useState(null);
            const saveStaffEdit = async () => {
                const s = staffEdit;
                if (!s.name.trim()) { show('ใส่ชื่อที่ปรึกษาการขาย'); return; }
                let key = s.key, hint = s.hint;
                if (s.email.trim()) { key = await cfgHashEmail(s.email); hint = cfgEmailHint(s.email); }
                if (!key) { show('ใส่อีเมลที่ใช้เข้า claude.ai'); return; }
                const row = { key, hint, name: s.name.trim(), phone: s.phone.trim(), line: s.line.trim(), role: s.role, branch: s.branch.trim(), active: s.active !== false, uid: s.uid || '' };
                const rows = cfg.staff.filter((x, i) => i !== s.index && x.key !== key);
                rows.push(row);
                rows.sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'));
                await run(() => api.saveStaff(rows), s.index >= 0 ? 'บันทึกผู้ใช้แล้ว' : 'เพิ่มผู้ใช้แล้ว');
                setStaffEdit(null);
            };

            const readOnlyNote = !canWrite && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs px-3 py-2"><i className="fa-solid fa-lock mr-1"></i>ดูได้อย่างเดียว · การบันทึกต้องเป็นเจ้าของหน้านี้หรือผู้ที่ได้รับสิทธิ์ Editor จากเมนู Share</div>
            );

            return (
                <div className="max-w-6xl mx-auto space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {secBtn('campaign', 'ตารางแคมเปญ')}
                        {secBtn('fees', 'ค่าจดทะเบียน/ประกัน/FOC')}
                        {secBtn('staff', 'ผู้ใช้งาน')}
                        {secBtn('settings', 'ตั้งค่า')}
                    </div>
                    {readOnlyNote}
                    {pull && (
                        <div className={`rounded-2xl border p-4 space-y-3 ${pull.err ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
                            <div className="flex items-center gap-2">
                                <i className={`fa-solid ${pull.busy ? 'fa-circle-notch fa-spin' : pull.err ? 'fa-triangle-exclamation text-red-600' : 'fa-table-list text-blue-700'}`}></i>
                                <b className="flex-1 text-sm text-gray-900">{pull.busy ? `กำลังดึงจากชีต: ${pull.step}` : pull.err ? 'ดึงจากชีตไม่สำเร็จ' : 'ข้อมูลจากชีต (ยังไม่บันทึก)'}</b>
                                {!pull.busy && <button type="button" onClick={() => setPull(null)} className="text-xs underline text-gray-600">ปิด</button>}
                            </div>
                            {pull.err && <p className="text-sm text-red-700">{pull.err}</p>}
                            {pull.data && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                                        {[...AT_TABLE_ORDER, 'foc'].map(k => {
                                            const n = (pull.data[k] || []).length, cur = (k === 'foc' ? cfg.foc : cfg[k]).length;
                                            return (
                                                <div key={k} className="flex justify-between gap-2 bg-white rounded-lg border border-blue-100 px-3 py-1.5">
                                                    <span className="text-gray-700">{ADMIN_LISTS[k].title}</span>
                                                    <span className={n ? 'font-bold text-gray-900' : 'font-bold text-red-600'}>{n ? `${n} แถว` : 'ไม่พบหัวตาราง · ไม่แทน'} <span className="font-normal text-gray-400">(เดิม {cur})</span></span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {pull.data.focParts && <p className="text-xs text-gray-700">รายการ FOC: อุปกรณ์แท้ {pull.data.focParts.genuine} · เทียบเคียง {pull.data.focParts.atg} · DVP {pull.data.focParts.dvp} ชุด (รวมรายการที่ปิดใช้งานในชีต)</p>}
                                    {pull.data.counts && <p className="text-[11px] text-gray-500">แถวที่มีข้อมูลในชีต (รวมหัวตาราง): {Object.entries(pull.data.counts).map(([t, n]) => `${t} ${n}`).join(' · ')}</p>}
                                    <p className="text-xs text-blue-900">กด “บันทึกเข้าเว็บ” เพื่อแทนข้อมูลในเว็บด้วยข้อมูลจากชีต (ตารางที่แก้ในหลังบ้านแต่ยังไม่ได้แก้ในชีตจะถูกแทน)</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" disabled={!canWrite || pull.saving} onClick={savePulled} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">{pull.saving ? 'กำลังบันทึก…' : 'บันทึกเข้าเว็บ'}</button>
                                        <button type="button" onClick={() => setPull(null)} className="px-4 py-2 rounded-xl bg-white border border-blue-200 text-sm font-bold text-blue-700">ยกเลิก</button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {note && <div className="rounded-xl bg-gray-900 text-white text-sm px-3 py-2 flex items-start gap-2"><span className="flex-1">{note}</span><button type="button" onClick={() => setNote('')} className="text-xs underline shrink-0">ปิด</button></div>}

                    {(sec === 'campaign' || sec === 'fees') && def && (
                        <>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{sec === 'campaign' ? 'ตารางแคมเปญรายเดือน' : 'ค่าจดทะเบียน / ประกัน / FOC'}</h2>
                                <p className="text-sm text-gray-500 mt-1">{sec === 'campaign' ? 'ทางเลือกและเงินช่วย Honda ของแต่ละรุ่น + Margin มาตรฐาน + ดอกเบี้ยแคมเปญ · ข้อมูลในเว็บเป็นหลัก ใบเสนอราคาและ Margin อ่านจากตารางนี้' : 'ใช้คิดค่าจดทะเบียน เบี้ยประกัน (เอทีแถมเข้า FOC) และทุนของแถมในใบเสนอราคา'}</p>
                            </div>
                            <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
                                {sec === 'campaign'
                                    ? [['camp', 'แคมเปญ Honda'], ['margin', 'Margin มาตรฐาน'], ['priv', 'สิทธิพิเศษ Honda'], ['rates', 'ดอกเบี้ยแคมเปญ'], ['bind', 'ผูกดอกเบี้ย']].map(([k, l]) => subBtn(sub, setSub, k, l))
                                    : [['reg', 'ค่าจดทะเบียน'], ['ins', 'เบี้ยประกัน'], ['foc', 'รายการ FOC'], ['gifts', 'ของแถมใช้บ่อย']].map(([k, l]) => subBtn(fsub, setFsub, k, l))}
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
                                <div className="flex flex-wrap items-end gap-2">
                                    {def.monthly && (
                                        <label className="text-xs text-gray-500">เดือนแคมเปญ
                                            <select value={curMonth} onChange={e => setMonth(e.target.value)} className="mt-1 block border border-gray-200 rounded-xl px-3 py-2 text-base font-medium bg-white">
                                                {months.map(m => <option key={m} value={m}>{cfgMonthText(m)}{m === api.month && listKey === 'camp' ? ' · ใช้อยู่' : ''}</option>)}
                                            </select>
                                        </label>
                                    )}
                                    {!def.monthly && (
                                        <div className="relative flex-1 min-w-[200px]">
                                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                            <input value={q} onChange={e => { setQ(e.target.value); setLimit(150); }} placeholder="ค้นหา" className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-red-500" />
                                        </div>
                                    )}
                                    {canWrite && <button type="button" onClick={openNew} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold">+ {listKey === 'camp' ? 'เพิ่มทางเลือก' : 'เพิ่มรายการ'}</button>}
                                    {canWrite && def.monthly && (
                                        <span className="flex items-center gap-1">
                                            <input value={copyTo} onChange={e => setCopyTo(e.target.value)} placeholder="เดือนใหม่ 2026-12" className="w-36 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                                            <button type="button" onClick={copyMonth} disabled={busy} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700">คัดลอกเดือนนี้ไปเดือนใหม่</button>
                                        </span>
                                    )}
                                    <span className="flex-1"></span>
                                    {canWrite && <button type="button" onClick={pullFromSheet} disabled={pull && pull.busy} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 disabled:opacity-50"><i className="fa-solid fa-rotate mr-1"></i>ดึงจากชีต</button>}
                                    <button type="button" onClick={downloadCsv} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700"><i className="fa-solid fa-download mr-1"></i>ดาวน์โหลด Excel (CSV)</button>
                                    {canWrite && <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700"><i className="fa-solid fa-upload mr-1"></i>นำเข้า CSV</button>}
                                    <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
                                </div>
                                {def.monthly && (
                                    <div className="relative">
                                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาในเดือนนี้" className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-red-500" />
                                    </div>
                                )}
                                <p className="text-xs text-gray-500">{cfg.settings.pulledAt ? `ดึงจากชีตล่าสุด ${new Date(cfg.settings.pulledAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} · ` : ''}{srcText(listKey)} · ชีต: <a href={`https://docs.google.com/spreadsheets/d/${cfg.settings.sheetId}/edit`} target="_blank" rel="noopener" className="underline">เปิด Google Sheet</a>{listKey === 'camp' ? ` · ใบเสนอราคาใช้แคมเปญเดือน ${cfgMonthText(api.month)}` : ''}{listKey === 'rates' ? ' · ตารางดอกเบี้ยมาตรฐานของไฟแนนซ์ยังใช้ค่าในโค้ด' : ''}</p>
                                {importDraft && importDraft.key === listKey && (
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 flex flex-wrap items-center gap-2">
                                        <span className="flex-1">ไฟล์ {importDraft.name}: {importDraft.rows.length} แถว · แทนตาราง {def.title} ทั้งหมด ({allRows.length} แถวเดิม)</span>
                                        <button type="button" onClick={() => { saveRows(listKey, importDraft.rows, `นำเข้า ${importDraft.rows.length} แถวแล้ว`, `นำเข้าไฟล์ ${importDraft.name}`); setImportDraft(null); }} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs">ยืนยันนำเข้า</button>
                                        <button type="button" onClick={() => setImportDraft(null)} className="px-3 py-1.5 rounded-lg bg-white text-blue-700 font-bold text-xs border border-blue-200">ยกเลิก</button>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="table-responsive">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-600 text-xs">
                                            <tr>{def.cols.map(([k, l, w]) => <th key={k} className={`py-2.5 px-3 text-left font-bold ${w}`}>{l}</th>)}{AT_TABLES[listKey].cols.includes('active') && <th className="py-2.5 px-3 w-16 text-center font-bold">ใช้งาน</th>}</tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {visible.slice(0, limit).map(({ r, i }) => {
                                                const info = optionInfo(r);
                                                const off = AT_TABLES[listKey].cols.includes('active') && !cfgOn(r.active);
                                                return (
                                                    <tr key={i} onClick={() => setEdit({ key: listKey, index: i, row: { ...r } })} className={`cursor-pointer hover:bg-red-50/40 align-top ${off ? 'opacity-50' : ''} ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                                                        {def.cols.map(([k, , w]) => (
                                                            <td key={k} className={`py-2.5 px-3 ${w}`} style={['name', 'model', 'privName', 'label', 'cat'].includes(k) ? { whiteSpace: 'normal', minWidth: k === 'name' ? 260 : 110 } : undefined}>
                                                                {adminFmt(k, r[k])}
                                                                {k === 'name' && info && info.promo && (info.ok ? <span className="block text-[10px] text-emerald-700 mt-0.5">ตารางดอกเบี้ย {info.code}</span> : <span className="block text-[10px] text-red-600 font-bold mt-0.5">ยังไม่มีตารางดอกเบี้ย · ตั้งที่ “ผูกดอกเบี้ย”</span>)}
                                                                {k === 'name' && listKey === 'foc' && r.note && <span className="block text-[10px] text-gray-400">{r.note}</span>}
                                                            </td>
                                                        ))}
                                                        {AT_TABLES[listKey].cols.includes('active') && (
                                                            <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                                                                <button type="button" disabled={!canWrite || busy} onClick={() => toggleActive(i)} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfgOn(r.active) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{cfgOn(r.active) ? 'ใช้' : 'ปิด'}</button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                            {!visible.length && <tr><td colSpan={def.cols.length + 1} className="py-10 text-center text-gray-400">ไม่มีข้อมูล</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                                {visible.length > limit && <div className="p-3 text-center"><button type="button" onClick={() => setLimit(limit + 300)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">แสดงเพิ่ม ({visible.length - limit})</button></div>}
                                <div className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100">{visible.length} แถว · แตะแถวเพื่อแก้ไข</div>
                            </div>
                        </>
                    )}

                    {sec === 'staff' && (
                        <>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">ผู้ใช้งาน</h2>
                                <p className="text-sm text-gray-500 mt-1">เพิ่มที่ปรึกษาด้วยอีเมลที่ใช้เข้า claude.ai · ที่ปรึกษาเปิดหน้านี้แล้วกด “ขอผูกบัญชี” (ใส่อีเมลเดียวกัน) → กดอนุมัติที่นี่ · จากนั้นชื่อ เบอร์โทร และ LINE ในใบเสนอราคาล็อกตามที่ตั้งไว้ แก้เองไม่ได้</p>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                                {canWrite && <button type="button" onClick={() => setStaffEdit({ index: -1, key: '', hint: '', email: '', name: '', phone: '', line: '', role: 'sales', branch: '', active: true })} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold">+ เพิ่มผู้ใช้</button>}
                                <span className="text-xs text-gray-500">คุณ: {api.viewer.email ? cfgEmailHint(api.viewer.email) : 'ไม่ทราบอีเมล'}{api.staffMe ? ` · ${api.staffMe.name}` : ' · ยังไม่ได้ลงทะเบียน'}</span>
                            </div>
                            {api.reqs.length > 0 && (
                                <div className="bg-amber-50 rounded-2xl border border-amber-200 p-3 space-y-2">
                                    <div className="font-bold text-amber-900 text-sm">คำขอผูกบัญชี ({api.reqs.length})</div>
                                    {api.reqs.map(r => {
                                        const match = cfg.staff.find(s => s.key === r.key);
                                        return (
                                            <div key={r.id} className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-amber-100 px-3 py-2 text-sm">
                                                <span className="flex-1 min-w-[180px]"><b>{r.name || 'ไม่ระบุชื่อ'}</b> · {r.hint} {match ? <span className="text-emerald-700">→ ตรงกับ {match.name}</span> : <span className="text-red-600">· ยังไม่มีอีเมลนี้ในรายชื่อ เพิ่มผู้ใช้ก่อน</span>}</span>
                                                {canWrite && match && <button type="button" onClick={() => run(() => api.approveReq(r), `ผูกบัญชีกับ ${match.name} แล้ว`)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">อนุมัติ</button>}
                                                {canWrite && <button type="button" onClick={() => run(() => api.rejectReq(r), 'ลบคำขอแล้ว')} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-600">ลบคำขอ</button>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="table-responsive">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-600 text-xs"><tr><th className="py-2.5 px-3 text-left">ชื่อที่ปรึกษาการขาย</th><th className="py-2.5 px-3 text-left">อีเมล</th><th className="py-2.5 px-3 text-left">เบอร์โทร</th><th className="py-2.5 px-3 text-left">LINE ID</th><th className="py-2.5 px-3 text-left">สาขา</th><th className="py-2.5 px-3 text-left">สิทธิ์</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {cfg.staff.map((s, i) => (
                                                <tr key={s.key || i} onClick={() => canWrite && setStaffEdit({ index: i, email: '', ...s, active: s.active !== false })} className={`${canWrite ? 'cursor-pointer hover:bg-red-50/40' : ''} ${s.active === false ? 'opacity-50' : ''}`}>
                                                    <td className="py-2.5 px-3 font-bold text-gray-800">{s.name}{api.staffMe && api.staffMe.key === s.key && <span className="ml-1 text-[10px] text-emerald-700">(คุณ)</span>}</td>
                                                    <td className="py-2.5 px-3 text-gray-500">{s.hint}{s.uid ? <span className="block text-[10px] text-emerald-700">ผูกบัญชีแล้ว</span> : null}</td>
                                                    <td className="py-2.5 px-3">{s.phone || '–'}</td>
                                                    <td className="py-2.5 px-3 text-green-700">{s.line || '–'}</td>
                                                    <td className="py-2.5 px-3">{s.branch || '–'}</td>
                                                    <td className="py-2.5 px-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.role === 'admin' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>{s.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ฝ่ายขาย'}</span></td>
                                                </tr>
                                            ))}
                                            {!cfg.staff.length && <tr><td colSpan={6} className="py-10 text-center text-gray-400">ยังไม่มีผู้ใช้ · เพิ่มที่ปรึกษาการขายด้วยอีเมลที่ใช้เข้า claude.ai</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">ทุกคนต้องเปิดหน้านี้ใน claude.ai และได้รับแชร์หน้านี้ (เมนู Share) · ผู้ที่ต้องแก้หลังบ้านต้องได้สิทธิ์ Editor · ระบบเก็บอีเมลแบบเข้ารหัส แสดงเฉพาะบางส่วน</p>
                        </>
                    )}

                    {sec === 'settings' && (
                        <div className="space-y-4">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">ตั้งค่า</h2>
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
                                <label className="block text-sm font-bold text-gray-700">เดือนแคมเปญที่ใช้ในใบเสนอราคา
                                    <select disabled={!canWrite || busy} value={cfg.settings.activeMonth || 'auto'} onChange={e => run(() => api.saveSettings({ activeMonth: e.target.value }), 'บันทึกแล้ว')} className="mt-1 block w-full sm:w-80 border border-gray-200 rounded-xl px-3 py-2 text-base bg-white">
                                        <option value="auto">อัตโนมัติ (เดือนปัจจุบัน ถ้าไม่มีใช้เดือนล่าสุด) · ตอนนี้ {cfgMonthText(api.month)}</option>
                                        {cfgMonthsOf(cfg.camp).slice().reverse().map(m => <option key={m} value={m}>{cfgMonthText(m)}</option>)}
                                    </select>
                                </label>
                                {AT_ACTIVE.warn && <p className="text-xs text-amber-700">{AT_ACTIVE.warn}</p>}
                                <label className="block text-sm font-bold text-gray-700">Google Sheet ต้นทาง (ID)
                                    <input disabled={!canWrite} defaultValue={cfg.settings.sheetId} onBlur={e => e.target.value.trim() && e.target.value.trim() !== cfg.settings.sheetId && run(() => api.saveSettings({ sheetId: e.target.value.trim() }), 'บันทึกแล้ว')} className="mt-1 block w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono" />
                                </label>
                                <a href={`https://docs.google.com/spreadsheets/d/${cfg.settings.sheetId}/edit`} target="_blank" rel="noopener" className="inline-block text-sm underline text-blue-700">เปิด Google Sheet</a>
                                <div className="flex flex-wrap items-center gap-2">
                                    {canWrite && <button type="button" onClick={pullFromSheet} disabled={pull && pull.busy} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-50"><i className="fa-solid fa-rotate mr-1"></i>ดึงข้อมูลทั้งหมดจากชีต</button>}
                                    <span className="text-xs text-gray-500">{cfg.settings.pulledAt ? `ดึงจากชีตล่าสุด ${new Date(cfg.settings.pulledAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}` : 'ยังไม่เคยดึงจากชีตในเว็บ (ใช้ข้อมูลที่ฝังมา)'}</span>
                                </div>
                                <p className="text-xs text-gray-500">ปุ่มดึงจากชีตใช้ Google Sheets ที่เชื่อมไว้ในบัญชี claude.ai ของคนที่กด · ดึงแท็บ แคมเปญ Honda, Margin มาตรฐาน, สิทธิพิเศษ Honda, ดอกเบี้ย, ผูกดอกเบี้ย, ค่าจดทะเบียน, ประกันภัย, อุปกรณ์แท้, อุปกรณ์เทียบเคียง และ DVP Package · หรือดาวน์โหลดแท็บเป็น CSV แล้วกด “นำเข้า CSV” ในตารางนั้น</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 font-bold text-gray-800 border-b border-gray-100">แหล่งข้อมูลแต่ละตาราง</div>
                                <div className="divide-y divide-gray-100">
                                    {[...AT_TABLE_ORDER, 'foc', ...AT_TABLE_WEB].map(k => (
                                        <div key={k} className="px-4 py-2.5 flex flex-wrap items-center gap-2 text-sm">
                                            <span className="font-bold text-gray-800 w-48">{ADMIN_LISTS[k].title}</span>
                                            <span className="text-xs text-gray-500 flex-1">{srcText(k)} · {(k === 'foc' ? cfg.foc : cfg[k]).length} แถว</span>
                                            {canWrite && cfg.src[k] === 'web' && (confirm === k
                                                ? <span className="flex gap-1"><button type="button" onClick={() => { run(() => api.resetTable(k), 'กลับไปใช้ข้อมูลที่ฝังมากับเว็บแล้ว'); setConfirm(''); }} className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-bold">ยืนยัน</button><button type="button" onClick={() => setConfirm('')} className="px-2 py-1 rounded-lg bg-gray-100 text-xs font-bold">ยกเลิก</button></span>
                                                : <button type="button" onClick={() => setConfirm(k)} className="px-2 py-1 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">ใช้ข้อมูลที่ฝังมากับเว็บ</button>)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {edit && (
                        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={() => setEdit(null)}>
                            <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900">{edit.index >= 0 ? 'แก้ไข' : 'เพิ่ม'} · {ADMIN_LISTS[edit.key].title}</h3>
                                    <button type="button" onClick={() => setEdit(null)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500"><i className="fa-solid fa-xmark"></i></button>
                                </div>
                                <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {ADMIN_LISTS[edit.key].fields.map(field)}
                                    {'active' in edit.row && (
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 sm:col-span-2">
                                            <input type="checkbox" checked={cfgOn(edit.row.active)} onChange={e => setEdit({ ...edit, row: { ...edit.row, active: e.target.checked ? 'Y' : 'N' } })} className="w-4 h-4 accent-red-600" /> ใช้งาน
                                        </label>
                                    )}
                                </div>
                                <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-2 justify-end" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
                                    {edit.index >= 0 && canWrite && (confirm === 'del'
                                        ? <><button type="button" onClick={() => { deleteEdit(); setConfirm(''); }} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold">ยืนยันลบ</button><button type="button" onClick={() => setConfirm('')} className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-bold">ยกเลิก</button></>
                                        : <button type="button" onClick={() => setConfirm('del')} className="px-4 py-2 rounded-xl border border-gray-200 text-red-600 text-sm font-bold mr-auto">ลบแถวนี้</button>)}
                                    <button type="button" onClick={() => setEdit(null)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">ปิด</button>
                                    {canWrite && <button type="button" disabled={busy} onClick={saveEdit} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold">บันทึก</button>}
                                </div>
                            </div>
                        </div>
                    )}

                    {staffEdit && (
                        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={() => setStaffEdit(null)}>
                            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900">{staffEdit.index >= 0 ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'}</h3>
                                    <button type="button" onClick={() => setStaffEdit(null)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500"><i className="fa-solid fa-xmark"></i></button>
                                </div>
                                <div className="p-4 overflow-y-auto space-y-3">
                                    {[['email', staffEdit.index >= 0 ? `อีเมล (เดิม ${staffEdit.hint}) · ว่างไว้ = ไม่เปลี่ยน` : 'อีเมลที่ใช้เข้า claude.ai', 'email'], ['name', 'ชื่อที่ปรึกษาการขาย', 'text'], ['phone', 'เบอร์โทรศัพท์', 'tel'], ['line', 'LINE ID', 'text'], ['branch', 'สาขา (PSC ATE SPH KPA)', 'text']].map(([k, l, t]) => (
                                        <label key={k} className="block text-xs font-bold text-gray-500">{l}
                                            <input type={t} value={staffEdit[k] || ''} onChange={e => setStaffEdit({ ...staffEdit, [k]: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-red-500" />
                                        </label>
                                    ))}
                                    <label className="block text-xs font-bold text-gray-500">สิทธิ์
                                        <select value={staffEdit.role} onChange={e => setStaffEdit({ ...staffEdit, role: e.target.value })} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                                            <option value="sales">ฝ่ายขาย</option>
                                            <option value="admin">ผู้ดูแลระบบ (เห็นหลังบ้าน)</option>
                                        </select>
                                    </label>
                                    {api.viewer.id && (
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700"><input type="checkbox" checked={staffEdit.uid === api.viewer.id} onChange={e => setStaffEdit({ ...staffEdit, uid: e.target.checked ? api.viewer.id : '' })} className="w-4 h-4 accent-red-600" /> ผูกกับบัญชีที่เปิดหน้านี้อยู่ (บัญชีของฉัน)</label>
                                    )}
                                    {staffEdit.uid && staffEdit.uid !== api.viewer.id && <p className="text-xs text-emerald-700">ผูกกับบัญชีที่ปรึกษาแล้ว</p>}
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700"><input type="checkbox" checked={staffEdit.active !== false} onChange={e => setStaffEdit({ ...staffEdit, active: e.target.checked })} className="w-4 h-4 accent-red-600" /> ใช้งาน</label>
                                </div>
                                <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-2 justify-end" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
                                    {staffEdit.index >= 0 && (confirm === 'sdel'
                                        ? <><button type="button" onClick={async () => { await run(() => api.saveStaff(cfg.staff.filter((_, i) => i !== staffEdit.index)), 'ลบผู้ใช้แล้ว'); setStaffEdit(null); setConfirm(''); }} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold">ยืนยันลบ</button><button type="button" onClick={() => setConfirm('')} className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-bold">ยกเลิก</button></>
                                        : <button type="button" onClick={() => setConfirm('sdel')} className="px-4 py-2 rounded-xl border border-gray-200 text-red-600 text-sm font-bold mr-auto">ลบผู้ใช้</button>)}
                                    <button type="button" onClick={() => setStaffEdit(null)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">ปิด</button>
                                    <button type="button" disabled={busy} onClick={saveStaffEdit} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold">บันทึก</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        };
