
        // =====================================================================
        // AT-CONFIG — หลังบ้าน: ข้อมูลจาก Google Sheet "ฐานข้อมูลของแถม และเงื่อนไขค่าคอม" ฝังในเว็บ
        // ลำดับที่ใช้: ข้อมูลที่แก้ในหลังบ้าน (ฐานข้อมูลของหน้านี้) > ข้อมูลที่ฝังมากับเว็บ (ดึงจากชีต) > ค่าในโค้ดเดิม
        // แคมเปญ / ดอกเบี้ยแคมเปญ / Margin / สิทธิพิเศษ / ค่าจด / ประกัน / FOC ทุกหน้าที่คำนวณอ่านจากชุดนี้
        // =====================================================================
        const AT_SHEET_ID_DEFAULT = '17pqWhpWAcj_rqg5jkzqCIVCGj3Awno__aqpIUZ_sSI8';
        const AT_SNAPSHOT = __SNAPSHOT__;
        const AT_TABLES = {
            camp: { tab: 'แคมเปญ Honda', head: 'เดือนแคมเปญ', cols: ['month', 'bookFrom', 'bookTo', 'deliverBy', 'code', 'group', 'model', 'gradeCond', 'no', 'name', 'rate', 'sup', 'freeIns', 'excl', 'ref', 'active'],
                heads: ['เดือนแคมเปญ', 'จองตั้งแต่ (ปี-เดือน-วัน)', 'จองถึง', 'ออกใบกำกับ / รับรถภายใน', 'รหัสทางเลือก', 'กลุ่มรุ่น', 'รุ่น', 'เกรด / เงื่อนไข', 'ทางเลือกที่', 'ชื่อทางเลือก (ขึ้นในรายการให้เลือก)', 'ดอกเบี้ยเริ่มต้น', 'Honda แคมเปญ เข้า Margin (บาท)', 'ฟรีประกัน (ปี)', 'ห้ามใช้ร่วมกับ', 'อ้างอิง', 'ใช้งาน'] },
            margin: { tab: 'Margin มาตรฐาน', head: 'เดือนแคมเปญ', cols: ['month', 'model', 'cash', 'fin', 'step1', 'step2', 'note', 'active'],
                heads: ['เดือนแคมเปญ', 'รุ่น', 'Margin รถ ซื้อสด %', 'Margin รถ ไฟแนนซ์ %', 'AT แคมเปญ Step ช่อง 1 (บาท)', 'AT แคมเปญ Step ช่อง 2 (บาท)', 'หมายเหตุ', 'ใช้งาน'] },
            priv: { tab: 'สิทธิพิเศษ Honda', head: 'เดือนแคมเปญ', cols: ['month', 'code', 'privName', 'mkey', 'model', 'a1', 'a2', 'toMargin', 'cond', 'active'],
                heads: ['เดือนแคมเปญ', 'รหัสสิทธิ์', 'ชื่อสิทธิ์', 'รหัสรุ่น', 'รุ่น', 'ยอด 1 คัน (บาท)', 'ยอด 2 คันขึ้นไป / สูงสุด (บาท)', 'เข้า Margin', 'เงื่อนไข', 'ใช้งาน'] },
            rates: { tab: 'ดอกเบี้ย', head: 'รหัสตาราง', cols: ['code', 'down', 't48', 't60', 't72', 't84', 't90', 't99'],
                heads: ['รหัสตาราง', 'ดาวน์ตั้งแต่ (%)', '48 งวด', '60 งวด', '72 งวด', '84 งวด', '90 งวด', '99 งวด'] },
            bind: { tab: 'ผูกดอกเบี้ย', head: 'ประเภท', cols: ['type', 'bank', 'grp', 'no', 'code'],
                heads: ['ประเภท', 'ธนาคาร (มาตรฐานเท่านั้น)', 'กลุ่มรุ่น / กลุ่มดอก', 'ทางเลือก', 'รหัสตาราง'] },
            reg: { tab: 'ค่าจดทะเบียน', head: 'รายการ / รุ่น', stopAtBlank: true, cols: ['label', 'grp', 'person', 'company', 'payer', 'active', 'note'],
                heads: ['รายการ / รุ่น', 'กลุ่มรุ่น (รหัส)', 'บุคคลธรรมดา (บาท)', 'นิติบุคคล (บาท)', 'คนจ่าย (ค่าตั้งต้น)', 'ใช้งาน', 'หมายเหตุ'] },
            ins: { tab: 'ประกันภัย', head: 'เดือนแคมเปญ', cols: ['month', 'model', 'grp', 'codeName', 'years', 'y1', 'y2', 'y3', 'total', 'active', 'note'],
                heads: ['เดือนแคมเปญ', 'รุ่น', 'กลุ่มรุ่น (รหัส)', 'ชื่อในโค้ด', 'ทำประกัน (ปี)', 'เบี้ยปีที่ 1', 'เบี้ยปีที่ 2', 'เบี้ยปีที่ 3', 'เบี้ยรวม', 'ใช้งาน', 'หมายเหตุ'] },
            gifts: { tab: 'ของแถมใช้บ่อย', cols: ['label', 'mode', 'cost', 'q', 'std', 'active'],
                heads: ['รายการ', 'วิธีคิดทุน (fix / foc)', 'ทุน fix (บาท)', 'คำค้นในรายการ FOC (คั่นด้วย |)', 'รายการเริ่มต้น (Y)', 'ใช้งาน'] },
            foc: { tab: 'รายการ FOC', cols: ['model', 'cat', 'part', 'vendor', 'name', 'cost', 'sale', 'note', 'pieces', 'src', 'active'],
                heads: ['รหัสรุ่น', 'หมวด', 'Part No.', 'ผู้ขาย', 'รายการ', 'ราคา FOC (ทุน)', 'ราคาขาย', 'หมายเหตุ', 'ชิ้นในชุด', 'ที่มา', 'ใช้งาน'] }
        };
        const AT_TABLE_ORDER = ['camp', 'margin', 'priv', 'rates', 'bind', 'reg', 'ins'];
        const AT_TABLE_WEB = ['gifts']; // แก้ในหลังบ้านเท่านั้น (ไม่มีในชีต)
        const AT_GIFT_DEFAULT = [["ฟรีค่าแรงเช็กระยะ 10,000 - 20,000 กม.", "fix", "0", "", "Y", "Y"], ["ช่วยเหลือฉุกเฉิน 24 ชม. 3 ปี หรือ 100,000 กม.", "fix", "0", "", "Y", "Y"], ["รับประกันคุณภาพรถใหม่ 3 ปี หรือ 100,000 กม.", "fix", "0", "", "Y", "Y"], ["รับประกันแบตเตอร์รี่ไฮบริด 10 ปี", "fix", "0", "", "", "Y"], ["รับประกันระบบไฮบริด 5 ปี", "fix", "0", "", "", "Y"], ["ฟิล์ม Xtra Cole", "foc", "", "xtra cole|ฟิล์ม", "", "Y"], ["พ่นกันสนิม 1 ครั้งก่อนส่งมอบ", "foc", "", "กันสนิม", "", "Y"], ["เคลือบสี 1 ครั้งก่อนส่งมอบ", "foc", "", "เคลือบ", "", "Y"], ["พ่นฆ่าเชื้อโรคก่อนส่งมอบ", "foc", "", "ฆ่าเชื้อ", "", "Y"], ["กล้องบันทึกหน้ารถ", "foc", "", "กล้อง", "", "Y"], ["พรมปูพื้น", "foc", "", "พรม", "", "Y"], ["ผ้ายางปูพื้น", "foc", "", "ผ้ายาง", "", "Y"], ["ถาดท้ายรถ", "foc", "", "ถาดท้าย", "", "Y"], ["เซ็นเซอร์ถอย", "foc", "", "สัญญาณกะระยะ|เซ็นเซอร์", "", "Y"], ["ชุดเซฟตี้", "foc", "", "safety set|เซฟตี้", "", "Y"], ["กรอบป้ายทะเบียน", "foc", "", "กรอบป้าย", "", "Y"], ["ม่านบังแดด", "foc", "", "ม่าน|บังแดด", "", "Y"], ["คิ้วกันสาด", "foc", "", "กันสาด", "", "Y"], ["คิ้วบันได", "foc", "", "บันได", "", "Y"], ["ผ้าคลุมรถ", "foc", "", "ผ้าคลุม", "", "Y"], ["สายพ่วงแบตเตอรี่", "foc", "", "สายพ่วง", "", "Y"], ["สายลากจูง", "foc", "", "สายลาก", "", "Y"], ["ไฟส่องเท้า", "foc", "", "ไฟส่องเท้า", "", "Y"], ["สเกิร์ตรอบคัน", "foc", "", "สเกิร์ต", "", "Y"], ["สปอยเลอร์หลัง", "foc", "", "สปอยเลอร์", "", "Y"], ["เคลือบเซรามิก", "foc", "", "เซรามิก", "", "Y"], ["Ultimate Care", "foc", "", "ultimate", "", "Y"], ["ฟรีเช็กระยะ (ค่าแรง+อะไหล่)", "foc", "", "เช็คระยะ|เช็กระยะ|ตรวจเช็ค", "", "Y"], ["พรบ.", "foc", "", "พรบ|พ.ร.บ", "", "Y"], ["บัตรน้ำมัน 1,000 บาท", "fix", "1000", "", "", "Y"], ["รถเก่าแลกรถใหม่ 15,000 บาท", "foc", "", "", "", "Y"]];
        const AT_GIFT_QUICK = [];
        const atStdGifts = () => AT_GIFT_QUICK.filter(g => g.std);
        const AT_GROUP_MKEY = {
            cityRec: 'New City', cityHbRec: 'New City Hatchback', city: 'New City Regular', cityHb: 'New City Hatchback Regular',
            civic: 'Civic eHEV', civicEL: 'Civic eHEV EL', hrv: 'HR-V eHEV', accord: 'Accord eHEV', crv: 'CR-V eHEV', crvHunt: 'CR-V eHEV',
            en2: 'eN2', step: 'StepWgn eHEV'
        };
        const cfgStr = (v) => (v === undefined || v === null) ? '' : String(v).trim();
        const cfgNum = (v) => { const t = cfgStr(v).replace(/[^\d.\-]/g, ''); const n = Number(t); return t && Number.isFinite(n) ? n : 0; };
        const cfgPct = (v) => { const s = cfgStr(v); if (!s) return 0; const n = cfgNum(s); return /%/.test(s) || n > 1 ? n / 100 : n; };
        const cfgOn = (v) => !/^(n|no|false|0|ไม่|ปิด|off)$/i.test(cfgStr(v));
        const cfgRowFromArray = (cols, arr) => Object.fromEntries(cols.map((c, i) => [c, cfgStr(Array.isArray(arr) ? arr[i] : '')]));
        const cfgRowToArray = (cols, row) => cols.map(c => cfgStr(row ? row[c] : ''));
        // ชีตทั้งแท็บ (มีหัวตาราง) → แถวข้อมูล
        const cfgParseTab = (key, values) => {
            const def = AT_TABLES[key];
            const vals = Array.isArray(values) ? values : [];
            let start = vals.findIndex(r => cfgStr(r && r[0]) === def.head);
            if (start < 0) start = -1;
            const out = [];
            for (let i = start + 1; i < vals.length; i++) {
                const r = vals[i] || [];
                const blank = !r.some(x => cfgStr(x) !== '');
                if (blank) { if (def.stopAtBlank && out.length) break; continue; }
                out.push(cfgRowFromArray(def.cols, r));
            }
            return out;
        };
        // CSV (ดาวน์โหลดจากแท็บใน Google Sheet หรือจากหลังบ้าน) → ตาราง
        const cfgParseCsv = (text) => {
            const rows = []; let row = [], cell = '', q = false;
            const s = String(text || '').replace(/^﻿/, '');
            for (let i = 0; i < s.length; i++) {
                const ch = s[i];
                if (q) {
                    if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
                    else cell += ch;
                } else if (ch === '"') q = true;
                else if (ch === ',') { row.push(cell); cell = ''; }
                else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
                else cell += ch;
            }
            if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
            return rows;
        };
        const cfgCsv = (key, rows) => {
            const def = AT_TABLES[key];
            const esc = v => { const t = cfgStr(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
            return '﻿' + [def.heads.map(esc).join(','), ...rows.map(r => cfgRowToArray(def.cols, r).map(esc).join(','))].join('\n');
        };
        // รหัสรุ่นในรายการ FOC จากชื่อรุ่นในชีต
        const cfgFocModelCode = (text) => {
            const t = cfgStr(text).toUpperCase();
            if (/HATCH|HATCB|\bHB\b/.test(t)) return 'CH';
            if (/CITY/.test(t)) return 'CT';
            if (/CIVIC/.test(t)) return 'CV';
            if (/ACCORD/.test(t)) return 'AC';
            if (/CR-?V/.test(t)) return 'CR';
            if (/HR-?V/.test(t)) return 'HR';
            if (/BR-?V/.test(t)) return 'BR';
            if (/E:?N2/.test(t)) return 'EN';
            if (/STEP/.test(t)) return 'SW';
            if (/JAZZ/.test(t)) return 'JZ';
            return 'OT';
        };
        // แท็บ อุปกรณ์แท้ / อุปกรณ์เทียบเคียง / DVP Package → รายการ FOC รูปแบบเดียวกับเว็บ AT สต็อก
        const cfgFocFromSheet = (genuine, atg, dvp) => {
            const out = [];
            const body = (vals, head) => { const v = Array.isArray(vals) ? vals : []; const i = v.findIndex(r => cfgStr(r && r[0]) === head); return i < 0 ? [] : v.slice(i + 1).filter(r => r && r.some(x => cfgStr(x))); };
            body(genuine, 'รหัส').forEach(r => {
                const [code, model, cat, part, name, , grades, before, withVat, note, active, check] = r.map(cfgStr);
                const price = cfgNum(withVat) || Math.round(cfgNum(before) * 1.07);
                const notes = [grades ? `เกรด ${grades}` : '', note, check && cfgOn(check) && /^y/i.test(check) ? 'ตรวจราคาก่อนใช้' : ''].filter(Boolean).join(' · ');
                out.push({ model: cfgFocModelCode(model), cat, part, vendor: 'Honda แท้', name, cost: price, sale: price, note: notes, pieces: '', src: `แท้ ${code}`, active: cfgOn(active) ? 'Y' : 'N' });
            });
            body(atg, 'หมายเลขอะไหล่').forEach(r => {
                const [part, , catName, modelCode, , name, , vendor, sale, foc, focCamp, active, note] = r.map(cfgStr);
                out.push({ model: modelCode || 'OT', cat: catName, part, vendor, name, cost: cfgNum(focCamp) || cfgNum(foc), sale: cfgNum(sale), note, pieces: '', src: `ATG ${part}`, active: cfgOn(active) ? 'Y' : 'N' });
            });
            let pack = null;
            const flush = () => {
                if (!pack) return;
                const names = pack.pieces.map(p => p.name);
                out.push({
                    model: cfgFocModelCode(pack.model), cat: 'DVP Package', part: pack.part, vendor: 'Honda แท้',
                    name: `ชุด ${pack.code} (${pack.model}): ${names.join(' + ')}`, cost: pack.cost, sale: pack.sale,
                    note: 'ราคาเดียวทั้งชุด · ' + pack.pieces.map(p => `${p.name} ${formatCurrency(p.price)}`).join(' / '),
                    pieces: pack.pieces.map(p => `${p.name}~${p.part}`).join('|'), src: `DVP ${pack.code}`, active: pack.active ? 'Y' : 'N'
                });
                pack = null;
            };
            body(dvp, 'รหัส').forEach(r => {
                const [code, partSet, model, focSet, saleSet, partPiece, namePiece, salePiece, active] = r.map(cfgStr);
                if (!pack || pack.code !== code) { flush(); pack = { code, part: partSet, model, cost: cfgNum(focSet), sale: cfgNum(saleSet), active: cfgOn(active || 'Y'), pieces: [] }; }
                if (namePiece) pack.pieces.push({ name: namePiece, part: partPiece, price: cfgNum(salePiece) });
            });
            flush();
            return out;
        };
        const AT_FOC_BASE_ROWS = (AT_FOC.rows || []).map(r => ({ ...cfgRowFromArray(AT_TABLES.foc.cols, r), active: 'Y' }));
        const AT_FOC_BASE_SRC = AT_FOC.src;
        const OPTION_DATA_BASE = Object.fromEntries(Object.entries(OPTION_DATA).map(([k, v]) => [k, v.map(o => ({ ...o }))]));
        const RATE_TABLE_MAP_BASE = Object.fromEntries(Object.entries(RATE_TABLE_MAP).map(([k, v]) => [k, { ...v }]));
        const AT_FEES_BASE = JSON.parse(JSON.stringify(AT_FEES));
        const AT_MARGIN_STD_BASE = JSON.parse(JSON.stringify(AT_MARGIN_STD));
        const AT_ACTIVE = { month: '', labels: {}, src: '', focSrc: AT_FOC_BASE_SRC, privRows: [], warn: '' };
        const cfgThisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
        const cfgMonthsOf = (rows) => [...new Set(rows.map(r => r.month).filter(m => /^\d{4}-\d{2}$/.test(m)))].sort();
        const cfgPickMonth = (months, want) => months.includes(want) ? want : (months.filter(m => m <= want).pop() || months[months.length - 1] || '');
        const cfgMarginMkey = (model) => {
            const m = cfgStr(model).toUpperCase();
            return /^CITY ?(HB|HATCH)/.test(m) ? 'cityHb' : m.startsWith('CITY') ? 'city' : m.startsWith('CIVIC') ? 'civic' : m.startsWith('HR-V') ? 'hrv'
                : m.startsWith('ACCORD') ? 'accord' : m.startsWith('CR-V') ? 'crv' : m.startsWith('E:N2') ? 'en2' : m.startsWith('STEP') ? 'step' : '';
        };
        const cfgRateTable = (rateRows, code) => {
            const t = {};
            rateRows.filter(r => r.code === code).forEach(r => {
                const row = {};
                [['t48', 48], ['t60', 60], ['t72', 72], ['t84', 84], ['t90', 90], ['t99', 99]].forEach(([k, term]) => { if (cfgStr(r[k]) !== '') row[term] = cfgNum(r[k]); });
                if (Object.keys(row).length) t[cfgNum(r.down)] = row;
            });
            return Object.keys(t).length ? t : null;
        };
        // ตารางทั้งหมด (จากฐานข้อมูลของหน้า ถ้ามี ไม่งั้นข้อมูลที่ฝัง)
        const cfgBuild = (docs) => {
            const cfg = { src: {}, at: {} };
            [...AT_TABLE_ORDER, ...AT_TABLE_WEB].forEach(k => {
                const d = docs && docs[k];
                if (d && Array.isArray(d.rows)) { cfg[k] = d.rows.map(a => cfgRowFromArray(AT_TABLES[k].cols, a)); cfg.src[k] = 'web'; cfg.at[k] = d.at || ''; }
                else { cfg[k] = (k === 'gifts' ? AT_GIFT_DEFAULT : (AT_SNAPSHOT[k] || [])).map(a => cfgRowFromArray(AT_TABLES[k].cols, a)); cfg.src[k] = 'snapshot'; cfg.at[k] = AT_SNAPSHOT.at; }
            });
            const parts = Object.keys(docs || {}).filter(k => /^foc_\d+$/.test(k)).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
            const meta = docs && docs.foc_meta;
            if (meta && parts.length) {
                cfg.foc = parts.slice(0, Number(meta.parts) || parts.length).flatMap(k => (docs[k].rows || []).map(a => cfgRowFromArray(AT_TABLES.foc.cols, a)));
                cfg.src.foc = 'web'; cfg.at.foc = meta.at || ''; cfg.focSrc = meta.src || 'แก้ในหลังบ้าน';
            } else { cfg.foc = AT_FOC_BASE_ROWS; cfg.src.foc = 'snapshot'; cfg.at.foc = ''; cfg.focSrc = AT_FOC_BASE_SRC; }
            const st = (docs && docs.staff && Array.isArray(docs.staff.rows)) ? docs.staff.rows : [];
            cfg.staff = st.filter(Boolean);
            cfg.settings = { sheetId: AT_SHEET_ID_DEFAULT, activeMonth: 'auto', ...((docs && docs.settings) || {}) };
            return cfg;
        };

        // ---------- หลังบ้านชุดเดียวกับเว็บ AT stock (บนเว็บจริง): แคมเปญ Margin สิทธิพิเศษ ค่าจด ประกัน FOC และราคารถ อ่านจาก ref/* ของเว็บ AT stock
        const AT_STOCK_KEYS = ['camp', 'margin', 'priv', 'reg', 'ins', 'foc'];
        const AT_STOCK_DOC = { camp: 'campaigns', margin: 'margins', priv: 'privileges', reg: 'fees', ins: 'fees', foc: 'foc' };
        const AT_STOCK_PAGE = { camp: 'หลังบ้าน → ตารางแคมเปญรายเดือน (แท็บ แคมเปญ Honda)', margin: 'หลังบ้าน → ตารางแคมเปญรายเดือน (แท็บ Margin มาตรฐาน)', priv: 'หลังบ้าน → ตารางแคมเปญรายเดือน (แท็บ สิทธิพิเศษ Honda)', reg: 'หลังบ้าน → ค่าจดทะเบียน / ประกัน / FOC', ins: 'หลังบ้าน → ค่าจดทะเบียน / ประกัน / FOC', foc: 'หลังบ้าน → ค่าจดทะเบียน / ประกัน / FOC' };
        const atPctTxt = (v) => (Math.round(Number(v || 0) * 1000) / 10) + '%';
        // แถวของเว็บ AT stock → แถวแบบชีต (ลำดับคอลัมน์เดียวกับแท็บในชีต ที่ใบเสนอราคาอ่านอยู่แล้ว)
        const atStockToSheet = {
            camp: (x) => [x.month, x.book_from || '', x.book_to || '', x.deliver_by || '', x.id, x.key, x.group || '', x.grade || '', x.no ?? '', x.name || '', x.rate || '', x.sup || 0, x.ins ?? '', x.excl || '', x.ref || '', x.active === false ? 'N' : 'Y'],
            margin: (x) => [x.month, x.model || x.mkey || '', atPctTxt(x.cash), atPctTxt(x.fin), x.step1 || 0, x.step2 || 0, x.note || '', x.active === false ? 'N' : 'Y'],
            priv: (x) => [x.month, x.priv, x.name || '', x.mkey || '', x.model || '', x.a1 || 0, x.a2 || 0, x.into || '', x.cond || '', x.active === false ? 'FALSE' : 'TRUE']
        };
        // ราคารถ: รุ่น/เกรดในใบเสนอราคา → ใบราคา Honda ในเว็บ AT stock [รุ่น, เกรด, ปีรุ่น, ชุดราคา (cur = ราคาปัจจุบัน, old = ราคาเดิม/ราคาช่วงแนะนำ)]
        const AT_PRICE_MAP = {
            'New City': { 'Turbo S': ['CITY', 'S', 2027, 'old'], 'e:HEV V': ['CITY e:HEV', 'e:HEV V', 2027, 'old'], 'e:HEV SV (ภายในสีดำ)': ['CITY e:HEV', 'e:HEV SV', 2027, 'old'], 'e:HEV SV (ภายในสีเทาแพลทินัม)': ['CITY e:HEV', 'e:HEV SV', 2027, 'old'], 'e:HEV RS': ['CITY e:HEV', 'e:HEV RS', 2027, 'old'] },
            'New City Regular': { 'S': ['CITY', 'S', 2027, 'cur'], 'e:HEV V': ['CITY e:HEV', 'e:HEV V', 2027, 'cur'], 'e:HEV SV (ภายในสีดำ)': ['CITY e:HEV', 'e:HEV SV', 2027, 'cur'], 'e:HEV SV (ภายในสีเทาแพลทินัม)': ['CITY e:HEV', 'e:HEV SV', 2027, 'cur'], 'e:HEV RS': ['CITY e:HEV', 'e:HEV RS', 2027, 'cur'] },
            'New City Hatchback': { 'Turbo S': ['CITY HATCHBACK', 'S', 2027, 'old'], 'e:HEV V': ['CITY HATCHBACK e:HEV', 'e:HEV V', 2027, 'old'], 'e:HEV SV': ['CITY HATCHBACK e:HEV', 'e:HEV SV', 2027, 'old'], 'e:HEV RS': ['CITY HATCHBACK e:HEV', 'e:HEV RS', 2027, 'old'] },
            'New City Hatchback Regular': { 'S': ['CITY HATCHBACK', 'S', 2027, 'cur'], 'e:HEV V': ['CITY HATCHBACK e:HEV', 'e:HEV V', 2027, 'cur'], 'e:HEV SV': ['CITY HATCHBACK e:HEV', 'e:HEV SV', 2027, 'cur'], 'e:HEV RS': ['CITY HATCHBACK e:HEV', 'e:HEV RS', 2027, 'cur'] },
            'Civic eHEV': { 'e:HEV EL+': ['CIVIC e:HEV', 'e:HEV EL+', 2027, 'cur'], 'e:HEV RS': ['CIVIC e:HEV', 'e:HEV RS', 2027, 'cur'] },
            'Civic eHEV EL': { 'e:HEV EL': ['CIVIC e:HEV', 'e:HEV EL', 2027, 'cur'] },
            'HR-V eHEV': { 'e:HEV EL': ['HR-V e:HEV', 'e:HEV EL', 2026, 'old'], 'e:HEV RS': ['HR-V e:HEV', 'e:HEV RS', 2026, 'old'], 'e:HEV E (New Price)': ['HR-V e:HEV', 'e:HEV E', 2026, 'cur'], 'e:HEV EL (New Price)': ['HR-V e:HEV', 'e:HEV EL', 2026, 'cur'], 'e:HEV HuNT (New Price)': ['HR-V e:HEV', 'e:HEV HuNT', 2026, 'cur'], 'e:HEV RS (New Price)': ['HR-V e:HEV', 'e:HEV RS', 2026, 'cur'] },
            'CR-V eHEV': { 'e:HEV E': ['CR-V e:HEV', 'e:HEV E', 2026, 'old'], 'e:HEV RS': ['CR-V e:HEV', 'e:HEV RS', 2026, 'old'], 'e:HEV E (New Price)': ['CR-V e:HEV', 'e:HEV E', 2026, 'cur'], 'e:HEV ES (New Price)': ['CR-V e:HEV', 'e:HEV ES', 2026, 'cur'], 'e:HEV HuNT (New Price)': ['CR-V e:HEV', 'e:HEV HuNT', 2026, 'cur'], 'e:HEV RS (New Price)': ['CR-V e:HEV', 'e:HEV RS', 2026, 'cur'], 'e:HEV RS 4WD (New Price)': ['CR-V e:HEV', 'e:HEV RS 4WD', 2026, 'cur'] },
            'Accord eHEV': { 'e:HEV RS': ['ACCORD e:HEV', 'e:HEV RS', 2025, 'cur'], 'e:HEV E (New Price)': ['ACCORD e:HEV', 'e:HEV E', 2026, 'cur'], 'e:HEV EL (New Price)': ['ACCORD e:HEV', 'e:HEV EL', 2026, 'cur'], 'e:HEV RS (New Price)': ['ACCORD e:HEV', 'e:HEV RS', 2026, 'cur'] },
            'eN2': { 'e:N2': ['e:N2', 'e:N2', 2026, 'cur'] },
            'StepWgn eHEV': { 'e:HEV SPADA': ['STEP WGN e:HEV', 'e:HEV SPADA', 2026, 'cur'] }
        };
        // ชื่อสีในใบเสนอราคา → รหัสสีในใบราคา Honda
        const AT_COLOR_CODE = [
            [/ทาฟเฟต้า|taffeta/i, 'TTW'], [/แพลทินัม|platinum white/i, 'PMW'], [/เมทิเออรอยด์|เมทิออรอยด์|meteoroid/i, 'MTG'], [/ดำคริสตัล|crystal black/i, 'CBL'],
            [/บริลเลียนท์|sporty blue/i, 'BSB'], [/แดงเบลซิ/i, 'BZR'], [/เออร์เบิน หลังคาดำ/i, 'UBB'], [/เออร์เบิน|urban gray/i, 'UBG'], [/แคนยอน|canyon/i, 'CYB'],
            [/lunar|ลูน่า/i, 'LUS'], [/ignite/i, 'IRB'], [/sunlight/i, 'PSW'], [/sand khaki/i, 'SKC'], [/ไดมอนด์|diamond/i, 'DMD'], [/twilight/i, 'TWB']
        ];
        const atColorCode = (name) => { const hit = AT_COLOR_CODE.find(([re]) => re.test(String(name || ''))); return hit ? hit[1] : ''; };
        // เก็บราคาเดิมในโค้ดไว้ (ใช้เมื่อใบราคาในเว็บ AT stock ไม่มีรุ่น/เกรดนั้น)
        const AT_GRADES_BASE = JSON.parse(JSON.stringify(GRADES_DATA));
        const AT_COLORS_BASE = JSON.parse(JSON.stringify(MODEL_COLORS));
        const AT_PRICE_STATUS = { on: false, matched: 0, missing: [], issue: null };
        const cfgApplyPrices = (catalog) => {
            Object.keys(AT_GRADES_BASE).forEach(mk => {
                (GRADES_DATA[mk] || []).forEach((g, i) => { const b = AT_GRADES_BASE[mk][i]; if (b && b.name === g.name) g.price = b.price; });
                (MODEL_COLORS[mk] || []).forEach((c, i) => { const b = (AT_COLORS_BASE[mk] || [])[i]; if (b && b.name === c.name) { c.price = b.price; if (b.priceByGrade) c.priceByGrade = { ...b.priceByGrade }; else delete c.priceByGrade; } });
            });
            AT_PRICE_STATUS.on = false; AT_PRICE_STATUS.matched = 0; AT_PRICE_STATUS.missing = []; AT_PRICE_STATUS.issue = null;
            const prices = catalog && Array.isArray(catalog.prices) ? catalog.prices : null;
            if (!prices || !prices.length) return;
            AT_PRICE_STATUS.on = true; AT_PRICE_STATUS.issue = catalog.price_issue || null;
            Object.keys(AT_PRICE_MAP).forEach(mk => {
                const colors = MODEL_COLORS[mk] || [];
                (GRADES_DATA[mk] || []).forEach(g => {
                    const m = AT_PRICE_MAP[mk][g.name];
                    if (!m) { AT_PRICE_STATUS.missing.push(`${mk} · ${g.name}`); return; }
                    const rows = prices.filter(p => p.model === m[0] && p.grade === m[1] && Number(p.year) === m[2] && (p.tier || 'cur') === m[3] && Number(p.price) > 0);
                    if (!rows.length) { AT_PRICE_STATUS.missing.push(`${mk} · ${g.name}`); return; }
                    const base = Math.min(...rows.map(p => Number(p.price)));
                    g.price = base;
                    colors.filter(c => !c.grades || c.grades.includes(g.name)).forEach(c => {
                        const hit = rows.find(p => p.color === atColorCode(c.name));
                        if (!hit) return;
                        c.priceByGrade = { ...(c.priceByGrade || {}), [g.name]: Number(hit.price) - base };
                    });
                    AT_PRICE_STATUS.matched++;
                });
            });
        };
        // ค่าจด / เบี้ยประกัน จากเว็บ AT stock ({reg: {กลุ่ม: [บุคคล, นิติ]}, ins: {กลุ่ม: {1: [..], 2: [..], 3: [..]}}}) → แถวแบบชีต
        const atFeesToRows = (fees) => {
            const fmt = (n) => (n === undefined || n === null || n === '') ? '' : String(n);
            const reg = (AT_SNAPSHOT.reg || []).map(r => { const v = fees.reg && fees.reg[r[1]]; return v ? [r[0], r[1], fmt(v[0]), fmt(v[1]), ...r.slice(4)] : r.slice(); });
            const ins = (AT_SNAPSHOT.ins || []).map(r => {
                const v = fees.ins && fees.ins[r[2]] && fees.ins[r[2]][String(r[4])];
                if (!v) return r.slice();
                const y = [0, 1, 2].map(i => fmt(v[i]));
                const total = v.reduce((s, x) => s + (Number(x) || 0), 0);
                return [fees.month || r[0], r[1], r[2], r[3], r[4], ...y, String(Math.round(total * 100) / 100), r[9] || 'Y', r[10] || ''];
            });
            return { reg, ins };
        };
        // stock = { campaigns, margins, privileges, fees, foc, catalog } (เอกสารของเว็บ AT stock หรือไฟล์ที่ติดมากับเว็บ)
        const cfgUseStock = (cfg, stock) => {
            cfg.stockOn = false;
            if (!stock) return cfg;
            const take = (k, doc) => {
                if (!doc || !Array.isArray(doc.rows) || !doc.rows.length) return;
                cfg[k] = doc.rows.map(x => cfgRowFromArray(AT_TABLES[k].cols, atStockToSheet[k](x)));
                cfg.src[k] = 'stock'; cfg.at[k] = doc.at || ''; cfg.stockOn = true;
            };
            take('camp', stock.campaigns); take('margin', stock.margins); take('priv', stock.privileges);
            if (stock.fees && (stock.fees.reg || stock.fees.ins)) {
                const f = atFeesToRows(stock.fees);
                cfg.reg = f.reg.map(a => cfgRowFromArray(AT_TABLES.reg.cols, a)); cfg.ins = f.ins.map(a => cfgRowFromArray(AT_TABLES.ins.cols, a));
                cfg.src.reg = cfg.src.ins = stock.fees.__file ? 'stockfile' : 'stock'; cfg.at.reg = cfg.at.ins = stock.fees.at || ''; cfg.stockOn = true;
            }
            if (stock.foc && Array.isArray(stock.foc.rows) && Array.isArray(stock.foc.cols)) {
                const ix = AT_TABLES.foc.cols.map(c => stock.foc.cols.indexOf(c));
                cfg.foc = stock.foc.rows.map(r => Object.fromEntries(AT_TABLES.foc.cols.map((c, i) => [c, c === 'active' ? (ix[i] >= 0 ? cfgStr(r[ix[i]]) || 'Y' : 'Y') : cfgStr(ix[i] >= 0 ? r[ix[i]] : '')])));
                cfg.src.foc = stock.foc.__file ? 'stockfile' : 'stock'; cfg.at.foc = stock.foc.at || ''; cfg.focSrc = stock.foc.src || 'เว็บ AT stock'; cfg.stockOn = true;
            }
            cfg.catalog = stock.catalog || null;
            return cfg;
        };
        // ใช้ตารางกับเครื่องคำนวณ (แทนค่าในตัวแปรกลางเดิม: OPTION_DATA, RATE_TABLE_MAP, Margin, สิทธิพิเศษ, ค่าจด, ประกัน, FOC)
        const cfgApply = (cfg) => {
            const months = cfgMonthsOf(cfg.camp.filter(r => cfgOn(r.active)));
            const want = /^\d{4}-\d{2}$/.test(cfg.settings.activeMonth || '') ? cfg.settings.activeMonth : cfgThisMonth();
            const month = cfgPickMonth(months, want);
            AT_ACTIVE.month = month;
            AT_ACTIVE.warn = month && month !== want ? `ยังไม่มีแคมเปญเดือน ${want} ในหลังบ้าน · ใช้ของเดือน ${month}` : '';
            AT_ACTIVE.labels = {};
            const byMkey = {};
            cfg.camp.filter(r => cfgOn(r.active) && r.month === month).forEach(r => {
                const mk = AT_GROUP_MKEY[r.group];
                if (!mk) return;
                (byMkey[mk] = byMkey[mk] || []).push(r);
                if (r.group !== 'crvHunt' && !AT_ACTIVE.labels[mk]) AT_ACTIVE.labels[mk] = r.model;
            });
            Object.keys(OPTION_DATA_BASE).forEach(mk => {
                const rows = byMkey[mk];
                if (!rows || !rows.length) {
                    OPTION_DATA[mk] = OPTION_DATA_BASE[mk].map(o => ({ ...o }));
                    RATE_TABLE_MAP[mk] = { ...(RATE_TABLE_MAP_BASE[mk] || {}) };
                    return;
                }
                const list = [], rates = {};
                rows.slice().sort((a, b) => (a.group === 'crvHunt') - (b.group === 'crvHunt') || String(a.code).localeCompare(String(b.code), 'en', { numeric: true }))
                    .forEach(r => {
                        const suffix = cfgStr(r.code).split('-').slice(1).join('-') || cfgStr(r.no);
                        const id = (r.group === 'crvHunt' ? 'H' : '') + suffix;
                        const promo = cfgStr(r.rate) !== '';
                        const b = cfg.bind.find(x => /แคมเปญ/.test(x.type) && x.grp === r.group && cfgStr(x.no) === cfgStr(r.no));
                        const table = b ? cfgRateTable(cfg.rates, b.code) : null;
                        const o = {
                            id, name: (r.group === 'crvHunt' ? 'HuNT · ' : '') + r.name, supportValue: cfgNum(r.sup), freeInsuranceYears: cfgNum(r.freeIns),
                            incompatibleWith: cfgStr(r.excl).split('/').map(x => x.trim()).filter(Boolean),
                            group: r.group, code: r.code, month: r.month, ref: r.ref, gradeCond: r.gradeCond, promoRate: r.rate, rateCode: b ? b.code : ''
                        };
                        if (promo && table) rates[id] = table;
                        if (promo && !table) { o.financeModes = ['campaign']; o.rateMissing = true; }
                        list.push(o);
                    });
                OPTION_DATA[mk] = list;
                RATE_TABLE_MAP[mk] = rates;
            });
            // Margin มาตรฐาน
            const mRows = cfg.margin.filter(r => cfgOn(r.active));
            const mMonth = cfgPickMonth(cfgMonthsOf(mRows), month || cfgThisMonth());
            Object.keys(AT_MARGIN_STD).forEach(k => delete AT_MARGIN_STD[k]);
            Object.assign(AT_MARGIN_STD, JSON.parse(JSON.stringify(AT_MARGIN_STD_BASE)));
            const seen = {};
            mRows.filter(r => r.month === mMonth).forEach(r => {
                const k = cfgMarginMkey(r.model);
                if (!k || seen[k]) return;
                seen[k] = 1;
                AT_MARGIN_STD[k] = { cash: cfgPct(r.cash), fin: cfgPct(r.fin), step1: cfgNum(r.step1), step2: cfgNum(r.step2) };
            });
            AT_ACTIVE.marginMonth = mMonth;
            // สิทธิพิเศษ Honda
            const pRows = cfg.priv.filter(r => cfgOn(r.active));
            const pMonth = cfgPickMonth(cfgMonthsOf(pRows), month || cfgThisMonth());
            AT_ACTIVE.privRows = pRows.filter(r => r.month === pMonth);
            AT_ACTIVE.privMonth = pMonth;
            AT_PRIV.gtg = {}; AT_PRIV.ln = {};
            AT_ACTIVE.privRows.forEach(r => {
                if (r.code === 'gtg') AT_PRIV.gtg[r.mkey] = [cfgNum(r.a1), cfgNum(r.a2)];
                if (r.code === 'ln') AT_PRIV.ln[r.mkey] = cfgNum(r.a1);
            });
            // ค่าจดทะเบียน
            AT_FEES.reg = JSON.parse(JSON.stringify(AT_FEES_BASE.reg));
            const regSeen = {};
            cfg.reg.filter(r => cfgOn(r.active) && r.grp).forEach(r => {
                if (regSeen[r.grp]) return;
                regSeen[r.grp] = 1;
                AT_FEES.reg[r.grp] = [cfgNum(r.person), cfgNum(r.company)];
            });
            // เบี้ยประกัน
            AT_FEES.ins = JSON.parse(JSON.stringify(AT_FEES_BASE.ins));
            const iRows = cfg.ins.filter(r => cfgOn(r.active));
            const iMonth = cfgPickMonth(cfgMonthsOf(iRows), month || cfgThisMonth());
            iRows.filter(r => r.month === iMonth && r.grp).forEach(r => {
                const y = String(Math.max(1, Math.min(3, cfgNum(r.years) || 1)));
                const t = AT_FEES.ins[r.grp] = AT_FEES.ins[r.grp] || {};
                t[y] = [r.y1, r.y2, r.y3].slice(0, Number(y)).map(cfgNum);
            });
            Object.keys(AT_FEE_GROUP).forEach(k => {
                const t = AT_FEES.ins && AT_FEES.ins[AT_FEE_GROUP[k].ins];
                if (t) INSURANCE_PREMIUMS[k] = { 1: t['1'], 2: t['2'], 3: t['3'] };
            });
            // รายการ FOC
            const items = cfg.foc.map(r => {
                const o = { ...r, cost: cfgNum(r.cost), sale: cfgNum(r.sale) };
                const m = /^ATG\s+(ATG-\S+)/.exec(o.src || '');
                if (m && !o.part) o.part = m[1];
                return o;
            });
            AT_FOC_ITEMS.splice(0, AT_FOC_ITEMS.length, ...items);
            cfgApplyPrices(cfg.catalog);
            AT_GIFT_QUICK.splice(0, AT_GIFT_QUICK.length, ...(cfg.gifts || []).filter(r => cfgStr(r.label) && cfgOn(r.active)).map(r => {
                const fix = /^fix/i.test(cfgStr(r.mode)) || /ทุน\s*fix|คงที่/.test(cfgStr(r.mode));
                return { l: cfgStr(r.label), c: fix ? cfgNum(r.cost) : undefined, q: fix ? '' : cfgStr(r.q), std: /^(y|yes|ใช่|1|true)$/i.test(cfgStr(r.std)) };
            }));
            AT_FOC.src = cfg.focSrc;
            AT_ACTIVE.focSrc = cfg.focSrc;
            return month;
        };
        const uiModelLabel = (m) => AT_ACTIVE.labels[MODEL_MAPPING[m]] || m;
        const cfgMonthText = (ym) => { const [y, m] = String(ym || '').split('-').map(Number); return y && m ? `${THAI_MONTHS[m - 1]} ${y + 543}` : (ym || '-'); };
        const cfgHashEmail = async (email) => {
            const e = cfgStr(email).toLowerCase();
            if (!e) return '';
            try {
                const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('at-honda|' + e));
                return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (err) { return ''; }
        };
        const cfgEmailHint = (email) => {
            const e = cfgStr(email).toLowerCase();
            const [u, d] = e.split('@');
            if (!u || !d) return e;
            return `${u.slice(0, Math.min(3, u.length))}${'•'.repeat(Math.max(2, u.length - 3))}@${d}`;
        };
        // ข้อมูลหลังบ้าน + ผู้ใช้ที่เปิดหน้านี้
        const useAtConfig = () => {
            const [docs, setDocs] = useState({});
            const [ready, setReady] = useState(false);
            const [dbOk, setDbOk] = useState(false);
            const [viewer, setViewer] = useState({ loaded: false, id: '', email: '', key: '', isOwner: false, canEdit: false, name: '' });
            const [reqs, setReqs] = useState([]);
            const [viewAs, setViewAsState] = useState(() => { try { return localStorage.getItem('at_honda_view_as') === 'sales' ? 'sales' : 'admin'; } catch (e) { return 'admin'; } });
            const setViewAs = (v) => { setViewAsState(v); try { localStorage.setItem('at_honda_view_as', v); } catch (e) { /* per-device only */ } };
            const [myReq, setMyReq] = useState(null);
            const dbRef = useRef(null);
            useEffect(() => {
                let unsub = null, unsubReq = null, unsubMine = null, cancelled = false;
                const timer = setTimeout(() => setReady(true), 10000);
                (async () => {
                    let db = null;
                    try { db = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('db') : null; } catch (e) { db = null; }
                    if (cancelled) return;
                    if (!db) { clearTimeout(timer); setReady(true); return; }
                    dbRef.current = db;
                    setDbOk(true);
                    unsub = db.collection('config').onSnapshot(snap => {
                        clearTimeout(timer);
                        const m = {};
                        snap.docs.forEach(d => { m[d.id] = d.data(); });
                        setDocs(m);
                        setReady(true);
                    }, () => { clearTimeout(timer); setReady(true); });
                    // คำขอผูกบัญชี (ผู้ดูแลเห็นทั้งหมด · คนอื่นอ่านไม่ได้ ไม่เป็นไร)
                    unsubReq = db.collection('staffreq').onSnapshot(snap => setReqs(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setReqs([]));
                })();
                (async () => {
                    let user = null;
                    try { user = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('user') : null; } catch (e) { user = null; }
                    if (cancelled) return;
                    if (!user) { setViewer(v => ({ ...v, loaded: true })); return; }
                    let me = null, id = '';
                    try { me = await user.me(); } catch (e) { me = null; }
                    try { id = (me && me.id) || (typeof user.id === 'function' ? await user.id() : '') || ''; } catch (e) { id = ''; }
                    const email = me && me.email ? me.email : '';
                    const key = email ? await cfgHashEmail(email) : '';
                    if (!cancelled) setViewer({ loaded: true, id, email, key, isOwner: !!(me && me.isOwner), canEdit: !!(me && me.canEdit), name: (me && me.name) || '' });
                    if (id) {
                        const waitDb = async () => { for (let i = 0; i < 50 && !dbRef.current && !cancelled; i++) await new Promise(r => setTimeout(r, 200)); return dbRef.current; };
                        const db = await waitDb();
                        if (db && !cancelled) {
                            try { unsubMine = db.collection('staffreq').doc(id).onSnapshot(d => setMyReq(d && d.exists ? d.data() : null), () => {}); } catch (e) {}
                        }
                    }
                })();
                return () => { cancelled = true; clearTimeout(timer); if (unsub) unsub(); if (unsubReq) unsubReq(); if (unsubMine) unsubMine(); };
            }, []);
            // บนเว็บจริง: อ่านหลังบ้านของเว็บ AT stock (ref/*) + ไฟล์ค่าจด/FOC ที่ติดมากับเว็บเมื่อยังไม่เคยแก้ในหลังบ้าน
            const [stock, setStock] = useState(null);
            useEffect(() => {
                if (window.__STOCK_PREVIEW) { setStock(window.__STOCK_PREVIEW); return; }
                if (!window.__QWEB) return;
                let off = null, cancelled = false;
                const files = {};
                const loadFile = async (k) => { try { const r = await fetch('../' + k + '.json', { cache: 'no-cache' }); if (r.ok) files[k] = { ...(await r.json()), __file: true }; } catch (e) { /* ไม่มีไฟล์ */ } };
                (async () => {
                    await Promise.all([loadFile('fees'), loadFile('foc')]);
                    let db = null;
                    try { db = await window.claude.use('db'); } catch (e) { db = null; }
                    if (!db || cancelled) { if (!cancelled) setStock({ ...files }); return; }
                    off = db.collection('atref').onSnapshot(snap => {
                        const m = { ...files };
                        snap.docs.forEach(d => { m[d.id] = d.data(); });
                        setStock(m);
                    }, () => setStock({ ...files }));
                })();
                return () => { cancelled = true; if (off) off(); };
            }, []);
            const cfg = useMemo(() => cfgUseStock(cfgBuild(docs), stock), [docs, stock]);
            const month = useMemo(() => cfgApply(cfg), [cfg]);
            const staffMe = useMemo(() => cfg.staff.find(s => s && s.active !== false && ((viewer.key && s.key === viewer.key) || (viewer.id && s.uid === viewer.id))) || null, [cfg, viewer.key, viewer.id]);
            // เว็บจริง (Supabase): ผู้ดูแล = ผู้บริหารในตาราง members เท่านั้น · ใน claude.ai: เจ้าของ หรือ staff ที่ตั้งเป็นผู้ดูแล
            const realAdmin = !!(window.__QPREVIEW || viewer.isOwner || (!window.__QWEB && staffMe && staffMe.role === 'admin'));
            const isAdmin = realAdmin && viewAs !== 'sales';
            const canWrite = !!dbRef.current && isAdmin && (viewer.isOwner || viewer.canEdit);
            const by = (staffMe && staffMe.name) || viewer.name || '';
            const write = async (id, data) => {
                if (!dbRef.current) throw new Error('หน้านี้ยังไม่ได้เชื่อมฐานข้อมูล (เปิดใน claude.ai)');
                await dbRef.current.collection('config').doc(id).set(JSON.parse(JSON.stringify(data)));
            };
            const remove = async (id) => { if (dbRef.current) await dbRef.current.collection('config').doc(id).delete(); };
            const saveTable = async (key, rows, src) => {
                const def = AT_TABLES[key];
                await write(key, { rows: rows.map(r => cfgRowToArray(def.cols, r)), at: new Date().toISOString(), by, src: src || 'แก้ในหลังบ้าน' });
            };
            const saveFoc = async (rows, src) => {
                const size = 350, n = Math.max(1, Math.ceil(rows.length / size));
                for (let i = 0; i < n; i++) await write(`foc_${i}`, { rows: rows.slice(i * size, (i + 1) * size).map(r => cfgRowToArray(AT_TABLES.foc.cols, r)) });
                await write('foc_meta', { parts: n, count: rows.length, at: new Date().toISOString(), by, src: src || `แก้ในหลังบ้าน ${new Date().toLocaleDateString('th-TH')}` });
                const old = Object.keys(docs).filter(k => /^foc_\d+$/.test(k) && Number(k.slice(4)) >= n);
                for (const k of old) await remove(k);
            };
            const resetTable = async (key) => {
                if (key === 'foc') { for (const k of Object.keys(docs).filter(k => /^foc_(\d+|meta)$/.test(k))) await remove(k); }
                else await remove(key);
            };
            const saveStaff = async (rows) => write('staff', { rows, at: new Date().toISOString(), by });
            const saveSettings = async (patch) => write('settings', { ...cfg.settings, ...patch, at: new Date().toISOString(), by });
            // ขอผูกบัญชี: ที่ปรึกษาใส่อีเมลที่ลงทะเบียนไว้ → ผู้ดูแลกดอนุมัติในหลังบ้าน
            const requestLink = async (email, name) => {
                if (!dbRef.current || !viewer.id) throw new Error('เปิดหน้านี้ใน claude.ai ก่อน');
                const k = await cfgHashEmail(email);
                await dbRef.current.collection('staffreq').doc(viewer.id).set({ key: k, hint: cfgEmailHint(email), name: cfgStr(name) || viewer.name || '', at: new Date().toISOString() });
            };
            const approveReq = async (req) => {
                const rows = cfg.staff.map(s => s.key === req.key ? { ...s, uid: req.id } : (s.uid === req.id ? { ...s, uid: '' } : s));
                await write('staff', { rows, at: new Date().toISOString(), by });
                await dbRef.current.collection('staffreq').doc(req.id).delete();
            };
            const rejectReq = async (req) => { await dbRef.current.collection('staffreq').doc(req.id).delete(); };
            return { cfg, month, ready, dbOk, viewer, staffMe, isAdmin, realAdmin, viewAs, setViewAs, canWrite, saveTable, saveFoc, resetTable, saveStaff, saveSettings, reqs, myReq, requestLink, approveReq, rejectReq, version: [docs, stock] };
        };
