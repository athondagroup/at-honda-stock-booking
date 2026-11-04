import json, os, re, sys
D = os.path.dirname(os.path.abspath(__file__))
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
rd = lambda n: open(os.path.join(D, n), encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit(f"anchor count {n} != {count}: {old[:100]!r}")
    s = s.replace(old, new)

def resub(pat, new, count=1, flags=0):
    global s
    found = len(re.findall(pat, s, flags))
    if found != count:
        raise SystemExit(f"regex count {found} != {count}: {pat[:100]!r}")
    s = re.sub(pat, new, s, flags=flags)

# ---------- 1. config module + admin panel + helpers (top level, after the quote log hook)
snap = json.load(open(os.path.join(D, '..', 'snapshot.json'), encoding='utf-8'))
cfg_js = rd('cfg.js').replace('__SNAPSHOT__', json.dumps(snap, ensure_ascii=False, separators=(',', ':')))
helpers = '''
        // ของแถมที่ดึงข้อมูลจากใบเสนอราคา (ประกันภัย / ค่าจดทะเบียน) · ทางเลือกแคมเปญตามเกรด · ชื่อการชำระที่ลูกค้าเห็น
        const giftAutoKind = (g) => { const t = String(g || ''); if (/พ\\.?\\s?ร\\.?\\s?บ/.test(t)) return null; if (/ประกันภัย|ประกันชั้น/.test(t)) return 'ins'; if (/จดทะเบียน|ค่าจด/.test(t)) return 'reg'; return null; };
        const campaignOptionsFor = (mKey, gradeName) => {
            const list = OPTION_DATA[mKey] || [];
            if (!list.some(o => o.group === 'crvHunt')) return list;
            const hunt = /HuNT/i.test(gradeName || '');
            const f = list.filter(o => (o.group === 'crvHunt') === hunt);
            return f.length ? f : list;
        };
        const docNeg = (v) => getExpenseValue(v) > 0 ? '-' + formatCurrency(v) : '–';
        const custFinLabel = (l) => l === 'ดอกเบี้ยแคมเปญ' ? 'ผ่อนชำระ' : (l || '');
'''
anchor = '            return { entries, mode, ready, add, update, remove };\n        };\n'
rep(anchor, anchor + cfg_js + helpers + rd('admin.jsx'))
rep("                    <span className=\"text-[10px] text-slate-400\">Margin มาตรฐาน เดือน {fmtMonth(AT_MARGIN_MONTH)}",
    "                    <span className=\"text-[10px] text-slate-400\">Margin มาตรฐาน เดือน {fmtMonth(AT_ACTIVE.marginMonth || AT_MARGIN_MONTH)}", 0) if False else None
resub(r'Margin มาตรฐาน เดือน \{fmtMonth\(AT_MARGIN_MONTH\)\} · ตาราง AT สต็อก', 'Margin มาตรฐาน เดือน {fmtMonth(AT_ACTIVE.marginMonth || AT_MARGIN_MONTH)} · ตารางหลังบ้าน')

# ---------- 2. App: config hook first, new state
rep('        const App = () => {\n', '        const App = () => {\n            const atCfg = useAtConfig();\n')
rep("            const [privHk, setPrivHk] = useState('');\n", """            const [privHk, setPrivHk] = useState('');
            const [privExtra, setPrivExtra] = useState({});
            const [extraItems, setExtraItems] = useState([]);
            const [extraQuery, setExtraQuery] = useState('');
            const [extraName, setExtraName] = useState('');
            const [extraPrice, setExtraPrice] = useState('');
""")
rep("                        if (d.privHk) setPrivHk(d.privHk);\n", "                        if (d.privHk) setPrivHk(d.privHk);\n                        if (d.privExtra) setPrivExtra(d.privExtra);\n                        if (Array.isArray(d.extraItems)) setExtraItems(d.extraItems);\n")
rep("                customerName, atStep, privGtg, privLn, privHk, viewMode\n", "                customerName, atStep, privGtg, privLn, privHk, viewMode, privExtra, extraItems\n", 2)
rep("                customerName, atStep, privGtg, privLn, privHk, atHondaMargin\n", "                customerName, atStep, privGtg, privLn, privHk, atHondaMargin, privExtra, extraItems\n")
rep("setAtStep(d.atStep || 'none'); setPrivGtg(d.privGtg || ''); setPrivLn(!!d.privLn); setPrivHk(d.privHk || '');",
    "setAtStep(d.atStep || 'none'); setPrivGtg(d.privGtg || ''); setPrivLn(!!d.privLn); setPrivHk(d.privHk || ''); setPrivExtra(d.privExtra || {}); setExtraItems(Array.isArray(d.extraItems) ? d.extraItems : []);")

# campaign list follows the back office (and CR-V HuNT grade)
rep("                const options = OPTION_DATA[mKey] || [];\n", "                const options = campaignOptionsFor(mKey, grade?.name);\n")
rep("            }, [uiModel, grade?.name, campaign]);\n", "            }, [uiModel, grade?.name, campaign, atCfg.version]);\n")

# privileges from the back office (Margin part 4)
resub(r"            const privBlockedNow = \(\(\) => \{.*?\n            const privAmount = .*?\+ getExpenseValue\(privHk\);\n", """            const privBlockedNow = (() => {
                const ex = (Array.isArray(campaign?.incompatibleWith) ? campaign.incompatibleWith : []).join(' / ');
                const m = String(campaign?.name || '').match(/ไม่ร่วม([^)]*)/);
                const t = ex + ' ' + (m ? m[1] : '');
                return { gtg: /Gen to Gen/i.test(t), ln: /Local Native/i.test(t), td: /Test Drive/i.test(t) };
            })();
            const privOthers = (AT_ACTIVE.privRows || []).filter(r => !['gtg', 'ln', 'hk', 'loyalty', 'fj', 'yto'].includes(r.code) && /^ใช่/.test(r.toMargin || '') && (r.mkey === atMkey || r.mkey === 'all') && cfgNum(r.a1) > 0);
            const privAmount = (!privBlockedNow.gtg && AT_PRIV.gtg[atMkey] ? (privGtg === '1' ? AT_PRIV.gtg[atMkey][0] : privGtg === '2' ? AT_PRIV.gtg[atMkey][1] : 0) : 0)
                + (!privBlockedNow.ln && privLn ? (AT_PRIV.ln[atMkey] || 0) : 0)
                + getExpenseValue(privHk)
                + privOthers.reduce((sum, r) => sum + (privExtra[r.code] && !privBlockedNow[r.code] ? cfgNum(r.a1) : 0), 0);
""", flags=re.S)

# campaign option with no rate table yet: no installment until the back office binds one (or a manual rate is typed)
rep("                if (civicPromoIssue) return makeInvalidInstallment(term, civicPromoIssue);\n            }\n",
    "                if (civicPromoIssue) return makeInvalidInstallment(term, civicPromoIssue);\n                if (getCampaignOption(rawModelKeyForRate, campaignId)?.rateMissing) return makeInvalidInstallment(term, 'ทางเลือกนี้ยังไม่มีตารางดอกเบี้ยแคมเปญ · ตั้งที่หลังบ้าน → ผูกดอกเบี้ย หรือใส่ดอกเบี้ยกำหนดเอง');\n            }\n")

# save to comparison: every detail incl. accessories
rep("                    customerName: (customerName || '').trim(),\n", "                    customerName: (customerName || '').trim(),\n                    extraItems: extraItems.map(x => ({ name: x.name, price: Number(x.price) || 0, part: x.part || '' })),\n")

# ---------- 3. helpers inside App (before render)
pre = '''            // V4 — ผู้ใช้จากหลังบ้าน / ของแถมที่ดึงจากใบเสนอราคา / อุปกรณ์ซื้อเพิ่ม
            const needLink = atCfg.viewer.loaded && !atCfg.staffMe && atCfg.cfg.staff.length > 0 && !atCfg.isAdmin;
            const consultantLocked = !!atCfg.staffMe || needLink;
            const [linkEmail, setLinkEmail] = useState('');
            const [linkName, setLinkName] = useState('');
            const [linkSent, setLinkSent] = useState(false);
            useEffect(() => {
                const st = atCfg.staffMe;
                if (!consultantLocked) return;
                const name = st ? (st.name || '') : '', phone = st ? (st.phone || '') : '', line = st ? (st.line || '') : '';
                if (consultantName !== name) setConsultantName(name);
                if (consultantPhone !== phone) setConsultantPhone(phone);
                if (consultantLine !== line) setConsultantLine(line);
            }, [atCfg.staffMe, consultantLocked, consultantName, consultantPhone, consultantLine]);
            const insPayerText = { honda: 'ฮอนด้าแถม', dealer: 'เอทีแถม', customer: 'ลูกค้าซื้อเอง' };
            const insYears = Array.from({ length: insuranceDuration }, (_, i) => insurancePayers[i + 1] || 'customer');
            const insGiftLabel = insYears.every(p => p === insYears[0])
                ? (insYears[0] === 'customer' ? `ประกันภัยชั้น 1 ${insYears.length} ปี (ลูกค้าซื้อเอง)` : `ฟรีประกันภัยชั้น 1 ${insYears.length} ปี (${insPayerText[insYears[0]]})`)
                : 'ประกันภัยชั้น 1 · ' + insYears.map((p, i) => `ปีที่ ${i + 1} ${insPayerText[p]}`).join(' · ');
            const regGiftLabel = registrationPayer === 'dealer' ? 'ฟรีค่าจดทะเบียน (เอทีแถม)' : 'ค่าจดทะเบียน (ลูกค้าชำระเอง)';
            useEffect(() => {
                const idx = [];
                gifts.forEach((g, i) => { if (giftAutoKind(g)) idx.push(i); });
                if (!idx.length) return;
                const next = gifts.slice();
                let changed = false;
                idx.forEach(i => { const lab = giftAutoKind(gifts[i]) === 'ins' ? insGiftLabel : regGiftLabel; if (next[i] !== lab) { next[i] = lab; changed = true; } });
                if (changed) setGifts(next);
                if (idx.some(i => String(giftValues[i] || '') !== '')) setGiftValues(prev => prev.map((v, i) => idx.includes(i) ? '' : v));
            }, [gifts, giftValues, insGiftLabel, regGiftLabel]);
            const extraTotal = extraItems.reduce((sum, x) => sum + (Number(x.price) || 0), 0);
            const extraPrevRef = useRef(0);
            useEffect(() => {
                if (extraItems.length) {
                    const v = String(extraTotal);
                    setExpenses(p => String(p.accessories || '') === v ? p : { ...p, accessories: v });
                } else if (extraPrevRef.current > 0) {
                    setExpenses(p => ({ ...p, accessories: '' }));
                }
                extraPrevRef.current = extraItems.length;
            }, [extraTotal, extraItems.length]);
            const extraHits = useMemo(() => {
                const q = extraQuery.trim().toLowerCase();
                if (!q) return [];
                const codes = [...(AT_MODEL_CODES[selectedModelKey] || []), 'OT', 'ALL'];
                return AT_FOC_ITEMS.filter(x => codes.includes(x.model) && cfgOn(x.active) && Number(x.sale) > 0 && (String(x.name || '').toLowerCase().includes(q) || String(x.part || '').toLowerCase().includes(q) || String(x.cat || '').toLowerCase().includes(q))).slice(0, 40);
            }, [extraQuery, selectedModelKey, atCfg.version]);
            const addExtra = (x) => setExtraItems(prev => [...prev, x]);
            const removeExtra = (i) => setExtraItems(prev => prev.filter((_, k) => k !== i));

'''
rep('            // V3-UI — ข้อมูลช่วยแสดงผล', pre + '            // V3-UI — ข้อมูลช่วยแสดงผล')
rep(".filter(x => codes.includes(x.model) && (String(x.name || '').toLowerCase().includes(q)", ".filter(x => codes.includes(x.model) && cfgOn(x.active) && (String(x.name || '').toLowerCase().includes(q)")
rep("            }, [focQuery, selectedModelKey]);\n", "            }, [focQuery, selectedModelKey, atCfg.version]);\n")

# rate table: new model goes on top
rep("                setCompareList([...compareList, createCompareItem({\n", "                setCompareList(prev => [createCompareItem({\n")
rep("                    customerType: normalizeCustomerType(customerType), isSpecialOcc, isHondaLoyalty, isHondaCareSupport, paymentType\n                })]);\n",
    "                    customerType: normalizeCustomerType(customerType), isSpecialOcc, isHondaLoyalty, isHondaCareSupport, paymentType\n                }), ...prev]);\n                window.scrollTo({ top: 0, behavior: 'smooth' });\n")
rep("setCompareList([...compareList, createCompareItem({ id: Date.now() })])", "setCompareList([createCompareItem({ id: Date.now() }), ...compareList])")

# tabs: back office for admins
rep("                { key: 'report', label: 'รายงาน', icon: 'fa-chart-column' }\n            ];",
    "                { key: 'report', label: 'รายงาน', icon: 'fa-chart-column' },\n                ...(atCfg.isAdmin ? [{ key: 'admin', label: 'หลังบ้าน', icon: 'fa-gear' }] : [])\n            ];")
rep('<nav className="container mx-auto px-1 sm:px-4 grid grid-cols-4 sm:flex sm:gap-1" aria-label="แถบการทำงาน">',
    '<nav className={`container mx-auto px-1 sm:px-4 grid ${atCfg.isAdmin ? \'grid-cols-5\' : \'grid-cols-3\'} sm:flex sm:gap-1`} aria-label="แถบการทำงาน">')
rep("Sale Calculator Pro V.64 v8 · แคมเปญ ต.ค. 2569", "Sale Calculator Pro V.64 v8 · แคมเปญ {cfgMonthText(atCfg.month)}")
rep("{UI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}", "{UI_MODELS.map(m => <option key={m} value={m}>{uiModelLabel(m)}</option>)}")
rep("{UI_MODELS.map(m=><option key={m} value={m}>{m}</option>)}", "{UI_MODELS.map(m=><option key={m} value={m}>{uiModelLabel(m)}</option>)}")

# consultant fields locked to the back office
rep('placeholder="ชื่อที่ปรึกษาการขาย" value={consultantName} onChange={(e) => setConsultantName(e.target.value)}', 'placeholder="ชื่อที่ปรึกษาการขาย" value={consultantName} readOnly={consultantLocked} onChange={(e) => !consultantLocked && setConsultantName(e.target.value)}')
rep('placeholder="เบอร์โทรศัพท์" value={consultantPhone} onChange={(e) => setConsultantPhone(e.target.value)}', 'placeholder="เบอร์โทรศัพท์" value={consultantPhone} readOnly={consultantLocked} onChange={(e) => !consultantLocked && setConsultantPhone(e.target.value)}')
rep('placeholder="Line ID" value={consultantLine} onChange={(e) => setConsultantLine(e.target.value)}', 'placeholder="Line ID" value={consultantLine} readOnly={consultantLocked} onChange={(e) => !consultantLocked && setConsultantLine(e.target.value)}')
resub(r'(<p className="col-span-3 text-right text-xs text-gray-400 md:mt-1">\{new Date\(\)\.toLocaleDateString\(\'th-TH\', \{ dateStyle: \'long\' \}\)\}</p>)',
      r'''\1
                                            {needLink && (
                                                <div className="hide-in-image no-print col-span-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 text-left md:max-w-xs md:ml-auto space-y-1.5">
                                                    {(atCfg.myReq || linkSent) ? <p><i className="fa-solid fa-clock mr-1"></i>ส่งคำขอผูกบัญชีแล้ว รอผู้ดูแลอนุมัติ</p> : (<>
                                                        <p>บัญชีนี้ยังไม่ได้ผูกกับรายชื่อที่ปรึกษาการขาย · ใส่อีเมลที่ผู้ดูแลลงทะเบียนให้ แล้วกดขอผูกบัญชี</p>
                                                        <input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="ชื่อของคุณ" className="w-full border border-amber-200 rounded px-2 py-1 bg-white text-gray-800" />
                                                        <div className="flex gap-1"><input type="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} placeholder="อีเมล" className="flex-1 min-w-0 border border-amber-200 rounded px-2 py-1 bg-white text-gray-800" /><button type="button" onClick={async () => { if (!linkEmail.trim()) return; try { await atCfg.requestLink(linkEmail, linkName); setLinkSent(true); } catch (e) { alert('ส่งคำขอไม่สำเร็จ: ' + (e && e.message ? e.message : '')); } }} className="px-2 py-1 rounded bg-amber-600 text-white font-bold shrink-0">ขอผูกบัญชี</button></div>
                                                    </>)}
                                                </div>
                                            )}
                                            {atCfg.staffMe && <p className="hide-in-image no-print col-span-3 md:text-right text-[10px] text-gray-400"><i className="fa-solid fa-lock mr-1"></i>ข้อมูลผู้ขายตามหลังบ้าน</p>}''')

# ---------- 4. quotation: finance block before expenses on phones
rep('''                                            </div>
                                        </div>
                                    </div>

                                    {/* เงื่อนไขการเงินและแคมเปญ */}
                                    <div className="mt-5 rounded-xl border border-gray-200 overflow-hidden">''', '''                                            </div>
                                        </div>

                                    {/* เงื่อนไขการเงินและแคมเปญ (มือถือ: อยู่ก่อนค่าใช้จ่ายวันรับรถ) */}
                                    <div className="order-2 md:order-3 md:col-span-2 rounded-xl border border-gray-200 overflow-hidden">''')
rep('''                                            )}
                                        </div>
                                    </div>

                                    {/* รายการของแถม */}''', '''                                            )}
                                        </div>
                                    </div>
                                    </div>

                                    {/* รายการของแถม */}''')
rep('''                                        {/* ซ้าย: รถยนต์และราคา */}
                                        <div className="space-y-2 md:border-r md:border-gray-100 md:pr-5 min-w-0">''', '''                                        {/* ซ้าย: รถยนต์และราคา */}
                                        <div className="order-1 space-y-2 md:border-r md:border-gray-100 md:pr-5 min-w-0">''')
rep('''                                        {/* ขวา: ค่าใช้จ่ายวันรับรถ */}
                                        <div className="min-w-0">''', '''                                        {/* ขวา: ค่าใช้จ่ายวันรับรถ */}
                                        <div className="order-3 md:order-2 min-w-0">''')

# campaign list per grade + warning when an option has no rate table
resub(r"\{OPTION_DATA\[MODEL_MAPPING\[uiModel\]\]\?\.map\(c => <option key=\{c\.id\} value=\{c\.id\}>\{c\.name\}</option>\)\}</select>\n(\s*)</label>",
      r'''{campaignOptionsFor(MODEL_MAPPING[uiModel], grade?.name).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
\1</label>
\1{campaign?.rateMissing && <div className="hide-in-image no-print rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] font-bold text-amber-800"><i className="fa-solid fa-triangle-exclamation mr-1.5"></i>ทางเลือกนี้ยังไม่มีตารางดอกเบี้ยแคมเปญ · ผู้ดูแลตั้งได้ที่หลังบ้าน → ผูกดอกเบี้ย (หรือใส่ดอกเบี้ยกำหนดเอง)</div>}
\1{AT_ACTIVE.warn && <p className="hide-in-image no-print text-[11px] text-amber-700">{AT_ACTIVE.warn}</p>}''')

# expenses: accessories follow the purchased list
rep("<span className=\"text-gray-600 whitespace-nowrap\">{i.l}</span><input type=\"text\" value={expenses[i.k]} onChange={(e) => setExpenses({ ...expenses, [i.k]: e.target.value })}",
    "<span className=\"text-gray-600 whitespace-nowrap\">{i.k === 'accessories' && extraItems.length ? 'ค่าอุปกรณ์ซื้อเพิ่ม' : i.l}</span><input type=\"text\" readOnly={i.k === 'accessories' && extraItems.length > 0} value={expenses[i.k]} onChange={(e) => setExpenses({ ...expenses, [i.k]: e.target.value })}")

# gifts: insurance / registration lines read the quotation above
rep('''                                                            <input type="text" value={r.name} title={r.name} onChange={(e) => editGiftName(r.i, e.target.value)} className="flex-1 min-w-0 bg-transparent outline-none text-sm sm:text-base text-gray-700 text-ellipsis" />
                                                            <span className="hide-in-image no-print flex items-center gap-1 shrink-0">
                                                                <input type="number" value={r.cost}''', '''                                                            {giftAutoKind(r.name)
                                                                ? <span className="flex-1 min-w-0 text-sm sm:text-base text-gray-700">{r.name}<span className="hide-in-image no-print ml-1 text-[10px] text-blue-600 whitespace-nowrap">· ตามใบเสนอราคา</span></span>
                                                                : <input type="text" value={r.name} title={r.name} onChange={(e) => editGiftName(r.i, e.target.value)} className="flex-1 min-w-0 bg-transparent outline-none text-sm sm:text-base text-gray-700 text-ellipsis" />}
                                                            <span className="hide-in-image no-print flex items-center gap-1 shrink-0">
                                                                {giftAutoKind(r.name) ? <span className="w-16 sm:w-20 text-[10px] text-gray-400 text-right leading-tight">FOC คิดใน{giftAutoKind(r.name) === 'ins' ? 'ประกัน' : 'ค่าจด'}</span> : <input type="number" value={r.cost}''')
rep('''placeholder="ทุน" title="ทุน FOC (บาท) ใช้คิด FOC ภายใน" />''', '''placeholder="ทุน" title="ทุน FOC (บาท) ใช้คิด FOC ภายใน" />}''')
rep('''                                                    <span className="text-[10px] text-gray-400 self-center shrink-0">ใช้บ่อย:</span>''', '''                                                    <span className="text-[10px] text-gray-400 self-center shrink-0">ใช้บ่อย:</span>
                                                    <button type="button" onClick={() => addGift(insGiftLabel)} className="shrink-0 whitespace-nowrap px-2.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[11px] text-blue-700 font-bold">+ ประกันภัย (ตามใบเสนอราคา)</button>
                                                    <button type="button" onClick={() => addGift(regGiftLabel)} className="shrink-0 whitespace-nowrap px-2.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[11px] text-blue-700 font-bold">+ ค่าจดทะเบียน (ตามใบเสนอราคา)</button>''')

# purchased accessories section (customer sees name + price)
extra_jsx = '''                                    {/* อุปกรณ์ที่ลูกค้าซื้อเพิ่ม */}
                                    {(extraItems.length > 0 || true) && (
                                    <div className={`mt-5 ${extraItems.length ? '' : 'hide-in-image no-print'}`}>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <h4 className="font-bold text-gray-800 flex items-center gap-2 text-base uppercase"><i className="fa-solid fa-cart-plus text-gray-400"></i> อุปกรณ์ซื้อเพิ่มเติม <span className="text-sm font-normal text-gray-400 normal-case">({extraItems.length} รายการ)</span></h4>
                                            {extraItems.length > 0 && <span className="font-bold text-gray-900">{formatCurrency(extraTotal)} บาท</span>}
                                        </div>
                                        <div className="bg-white rounded-xl border border-gray-100 p-3">
                                            {extraItems.length > 0 && (
                                                <ol className="divide-y divide-gray-50">
                                                    {extraItems.map((x, n) => (
                                                        <li key={n} className="flex items-center gap-2 py-1.5 min-w-0">
                                                            <span className="text-xs text-gray-300 w-5 sm:w-6 font-mono text-right shrink-0">{n + 1}.</span>
                                                            <span className="flex-1 min-w-0 text-sm sm:text-base text-gray-700">{x.name}{x.part ? <span className="text-[11px] text-gray-400"> · {x.part}</span> : null}</span>
                                                            <span className="font-bold text-gray-800 whitespace-nowrap">{formatCurrency(x.price)}</span>
                                                            <button type="button" onClick={() => removeExtra(n)} className="hide-in-image no-print w-8 h-8 sm:w-6 sm:h-6 text-gray-300 hover:text-red-600 shrink-0" title="ลบ"><i className="fa-solid fa-xmark text-xs"></i></button>
                                                        </li>
                                                    ))}
                                                </ol>
                                            )}
                                            <div className="hide-in-image no-print mt-2 rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2">
                                                <div className="relative">
                                                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                                    <input value={extraQuery} onChange={(e) => setExtraQuery(e.target.value)} placeholder="ค้นหาอุปกรณ์ (ราคาขาย) เช่น ฟิล์ม กล้อง ถาด" className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-red-500" />
                                                </div>
                                                <div className="flex gap-2 min-w-0">
                                                    <input value={extraName} onChange={(e) => setExtraName(e.target.value)} placeholder="หรือพิมพ์ชื่ออุปกรณ์" className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-red-500" />
                                                    <input value={extraPrice} onChange={(e) => setExtraPrice(e.target.value)} inputMode="decimal" placeholder="ราคา" className="w-24 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-right outline-none focus:border-red-500" />
                                                    <button type="button" onClick={() => { if (!extraName.trim()) return; addExtra({ name: extraName.trim(), price: getExpenseValue(extraPrice), part: '' }); setExtraName(''); setExtraPrice(''); }} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold shrink-0">เพิ่ม</button>
                                                </div>
                                                {extraQuery.trim() && (
                                                    <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                                                        {extraHits.length === 0 ? <p className="text-xs text-gray-400 px-3 py-3">ไม่พบ "{extraQuery}" · พิมพ์ชื่อและราคาเองได้</p> : extraHits.map((x, k) => (
                                                            <button key={k} type="button" onClick={() => addExtra({ name: String(x.name || '').trim(), price: Number(x.sale) || 0, part: x.part || '', genuine: x.vendor === 'Honda แท้' })} className="w-full text-left px-3 py-2.5 hover:bg-red-50 flex items-start gap-3">
                                                                <span className="flex-1 min-w-0"><span className="block text-sm text-gray-800">{x.name}</span><span className="block text-[10px] text-gray-400">{[x.model, x.cat, x.part, x.vendor].filter(Boolean).join(' · ')}</span></span>
                                                                <span className="text-xs font-bold text-gray-800 shrink-0">{formatCurrency(x.sale)}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-gray-400">ยอดรวมเข้า “ค่าอุปกรณ์ซื้อเพิ่ม” ในค่าใช้จ่ายวันรับรถ · ไม่นับเป็น FOC</p>
                                            </div>
                                        </div>
                                    </div>
                                    )}

'''
rep('                                    {/* ข้อมูลภายใน: ไม่ออกในรูป */}', extra_jsx + '                                    {/* ข้อมูลภายใน: ไม่ออกในรูป */}')

# internal: other Honda privileges from the back office (e.g. e:N2 Test Drive)
resub(r"(\n\s*)\{\(privBlockedNow\.gtg \|\| privBlockedNow\.ln\) && <p className=\"text-\[10px\] text-amber-700\">แคมเปญที่เลือกไม่ร่วม \{\[privBlockedNow\.gtg && 'Gen to Gen', privBlockedNow\.ln && 'Local Native'\]\.filter\(Boolean\)\.join\(' / '\)\}</p>\}",
      r'''\1{privOthers.map(r => (
                                                    <label key={r.code} className="flex justify-between items-center gap-2">
                                                        <span className="text-slate-500">{r.privName} (รับเงิน {formatCurrency(cfgNum(r.a1))})</span>
                                                        <input type="checkbox" checked={!!privExtra[r.code] && !privBlockedNow[r.code]} disabled={!!privBlockedNow[r.code]} onChange={(e) => setPrivExtra({ ...privExtra, [r.code]: e.target.checked })} className="w-4 h-4 accent-red-600" />
                                                    </label>
                                                ))}\1{(privBlockedNow.gtg || privBlockedNow.ln || privBlockedNow.td) && <p className="text-[10px] text-amber-700">แคมเปญที่เลือกไม่ร่วม {[privBlockedNow.gtg && 'Gen to Gen', privBlockedNow.ln && 'Local Native', privBlockedNow.td && 'Test Drive'].filter(Boolean).join(' / ')}</p>}''')

# ---------- 5. Offer Studio removed
resub(r"\n[^\n]*handleOpenSticker\('ตารางดอกเบี้ย'\)[^\n]*", '')
resub(r"\n[^\n]*handleOpenSticker\('ใบเปรียบเทียบ'\)[^\n]*", '')
resub(r"\n[^\n]*\{ k: 'offer',[^\n]*", '')
rep('<div className="no-print mb-3 grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2">', '<div className="no-print mb-3 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">')

# ---------- 6. comparison: no campaign for the customer; purchased accessories row
resub(r"\n\s*<tr className=\"bg-yellow-50/40\"><td className=\"py-2 px-3 font-bold text-gray-700 sticky left-0 bg-yellow-50 border-r align-top\">แคมเปญ</td>[^\n]*", '')
rep("{q.financeLabel || (q.financeType === 'cash' ? 'ซื้อสด' : q.isDSP ? 'Double Smile Plus' : 'ผ่อน')}", "{custFinLabel(q.financeLabel || (q.financeType === 'cash' ? 'ซื้อสด' : q.isDSP ? 'Double Smile Plus' : 'ผ่อน'))}")
resub(r'(\n(\s*)<tr className="bg-gray-100"><td className="py-1\.5 px-3 font-bold text-gray-700 text-xs sticky left-0 bg-gray-100" colSpan=\{savedQuotes\.length \+ 1\}>ดอกเบี้ยรวมตลอดสัญญา</td></tr>)',
      r'''
\2{savedQuotes.some(q => (q.extraItems || []).length) && (<>
\2<tr className="bg-gray-100"><td className="py-1.5 px-3 font-bold text-gray-700 text-xs sticky left-0 bg-gray-100" colSpan={savedQuotes.length + 1}><i className="fa-solid fa-cart-plus mr-1"></i>อุปกรณ์ซื้อเพิ่มเติม</td></tr>
\2<tr><td className="py-2 px-3 text-gray-600 sticky left-0 bg-white border-r align-top">รายการ</td>{savedQuotes.map(q => <td key={q.id} className="py-2 px-3 align-top text-left">{(q.extraItems || []).length ? <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-gray-700 whitespace-normal">{q.extraItems.map((x, i) => <li key={i}>{x.name} <b>{formatCurrency(x.price)}</b></li>)}</ol> : <span className="text-xs text-gray-400">-</span>}</td>)}</tr>
\2</>)}\1''')

# ---------- 7. back office tab
rep("                    </main>\n\n                    {/* V3-ACTION-BAR", "                        {viewMode === 'admin' && (atCfg.isAdmin ? <AdminPanel api={atCfg} /> : <div className=\"max-w-xl mx-auto text-center py-16 text-gray-500\">หน้านี้สำหรับผู้ดูแลระบบ</div>)}\n                    </main>\n\n                    {/* V3-ACTION-BAR")


# ---------- 7b. sales: report and back office only for admins; saved list shows the viewer's own quotes
rep("                { key: 'report', label: 'รายงาน', icon: 'fa-chart-column' },\n                ...(atCfg.isAdmin ? [{ key: 'admin', label: 'หลังบ้าน', icon: 'fa-gear' }] : [])",
    "                ...(atCfg.isAdmin ? [{ key: 'report', label: 'รายงาน', icon: 'fa-chart-column' }, { key: 'admin', label: 'หลังบ้าน', icon: 'fa-gear' }] : [])")
rep("quoteLog.add({ kind: 'saved',", "quoteLog.add({ uid: atCfg.viewer.id || '', kind: 'saved',")
rep("quoteLog.add({ kind: 'image',", "quoteLog.add({ uid: atCfg.viewer.id || '', kind: 'image',")
rep("savedQuotes.forEach(q => quoteLog.add({\n", "savedQuotes.forEach(q => quoteLog.add({ uid: atCfg.viewer.id || '',\n")
resub(r"quoteLog\.add\(\{\n(\s*)kind: 'booking',", r"quoteLog.add({\n\1uid: atCfg.viewer.id || '', kind: 'booking',")
rep("const history = useMemo(() => quoteLog.entries.filter(e => e.data).map(e => ({", "const history = useMemo(() => quoteLog.entries.filter(e => e.data && (atCfg.isAdmin || (e.uid && e.uid === atCfg.viewer.id))).map(e => ({")
resub(r"\}\)\), \[quoteLog\.entries\]\);", "})), [quoteLog.entries, atCfg.isAdmin, atCfg.viewer.id]);")
rep("                        {viewMode === 'report' && (", "                        {viewMode === 'report' && !atCfg.isAdmin && <div className=\"max-w-xl mx-auto text-center py-16 text-gray-500\">รายงานสำหรับผู้ดูแลระบบ</div>}\n                        {viewMode === 'report' && atCfg.isAdmin && (")
rep("            // V3-UI — ข้อมูลช่วยแสดงผล", "            useEffect(() => { if (atCfg.viewer.loaded && !atCfg.isAdmin && (viewMode === 'report' || viewMode === 'admin')) setViewMode('quotation'); }, [atCfg.viewer.loaded, atCfg.isAdmin, viewMode]);\n            // V3-UI — ข้อมูลช่วยแสดงผล")


# ---------- 7c. header: admins can switch what they see (ผู้ดูแล / เซลล์)
SWITCH = '{atCfg.realAdmin && (\n    <div className="flex items-center rounded-full bg-gray-100 p-0.5 text-[11px] font-bold shrink-0" role="group" aria-label="สลับมุมมอง" title="สลับดูหน้าจอแบบผู้ดูแลหรือแบบเซลล์">\n        {[[\'admin\', \'ผู้ดูแล\'], [\'sales\', \'เซลล์\']].map(([k, l]) => <button key={k} type="button" onClick={() => atCfg.setViewAs(k)} aria-pressed={atCfg.viewAs === k} className={`px-2.5 sm:px-3 py-1.5 rounded-full transition ${atCfg.viewAs === k ? (k === \'admin\' ? \'bg-gray-900 text-white\' : \'bg-red-600 text-white\') : \'text-gray-600\'}`}>{l}</button>)}\n    </div>\n)}\n'
_a = '<button onClick={() => setShowHistory(true)} className="h-10 min-w-10'
assert s.count(_a) == 1
s = s.replace(_a, SWITCH + '                                ' + _a)


# ---------- 7d. gifts start from the standard items only; old saved lists are cleared once
STD_GIFTS = "        const STANDARD_GIFTS = ['ฟรีค่าแรงเช็กระยะ 10,000 - 20,000 กม.', 'ช่วยเหลือฉุกเฉิน 24 ชม. 3 ปี หรือ 100,000 กม.', 'รับประกันคุณภาพรถใหม่ 3 ปี หรือ 100,000 กม.'];\n        const GIFT_RESET_KEY = 'at_honda_gift_reset_v1';\n        const DB_COLLECTION ="
rep("        const DB_COLLECTION =", STD_GIFTS)
rep("""                SUGGESTED_GIFTS.slice(0, 21).forEach((gift, index) => {
                     if (index < 26) initialGifts[index] = gift;
                });""", """                STANDARD_GIFTS.forEach((gift, index) => { initialGifts[index] = gift; });
                let giftReset = false;
                try { giftReset = localStorage.getItem(GIFT_RESET_KEY) !== '1'; localStorage.setItem(GIFT_RESET_KEY, '1'); } catch (e) { giftReset = false; }""")
rep("""                        setGifts(d.gifts || initialGifts);
                        setGiftValues(d.giftValues || Array(26).fill('')); // <--- เพิ่มบรรทัดนี้""", """                        setGifts(giftReset ? initialGifts : (d.gifts || initialGifts));
                        setGiftValues(giftReset ? Array(26).fill('') : (d.giftValues || Array(26).fill('')));""")
rep("on: () => { setCustomerName(''); setBookingData(null); setPendingFileName(''); }",
    "on: () => { setCustomerName(''); setBookingData(null); setPendingFileName(''); const g = Array(26).fill(''); STANDARD_GIFTS.forEach((x, i) => { g[i] = x; }); setGifts(g); setGiftValues(Array(26).fill('')); setExtraItems([]); }")
rep("ของแถมมาตรฐานเดิมของใบเสนอราคา ({SUGGESTED_GIFTS.length} รายการ)", "รายการของแถมที่ใช้บ่อย ({SUGGESTED_GIFTS.length} รายการ · ใส่ทุน FOC เองหลังเพิ่ม)")


# ---------- 7e. merged quick gifts: one list, picking fills FOC cost automatically
GQ_CONST = """        const GIFT_QUICK = [
            { l: 'ฟรีค่าแรงเช็กระยะ 10,000 - 20,000 กม.', c: 0 },
            { l: 'ช่วยเหลือฉุกเฉิน 24 ชม. 3 ปี หรือ 100,000 กม.', c: 0 },
            { l: 'รับประกันคุณภาพรถใหม่ 3 ปี หรือ 100,000 กม.', c: 0 },
            { l: 'รับประกันแบตเตอร์รี่ไฮบริด 10 ปี', c: 0 },
            { l: 'รับประกันระบบไฮบริด 5 ปี', c: 0 },
            { l: 'ฟิล์ม Xtra Cole', q: 'xtra cole|ฟิล์ม' },
            { l: 'พ่นกันสนิม 1 ครั้งก่อนส่งมอบ', q: 'กันสนิม' },
            { l: 'เคลือบสี 1 ครั้งก่อนส่งมอบ', q: 'เคลือบ' },
            { l: 'พ่นฆ่าเชื้อโรคก่อนส่งมอบ', q: 'ฆ่าเชื้อ' },
            { l: 'กล้องบันทึกหน้ารถ', q: 'กล้อง' },
            { l: 'พรมปูพื้น', q: 'พรม' },
            { l: 'ผ้ายางปูพื้น', q: 'ผ้ายาง' },
            { l: 'ถาดท้ายรถ', q: 'ถาดท้าย' },
            { l: 'เซ็นเซอร์ถอย', q: 'สัญญาณกะระยะ|เซ็นเซอร์' },
            { l: 'ชุดเซฟตี้', q: 'safety set|เซฟตี้' },
            { l: 'กรอบป้ายทะเบียน', q: 'กรอบป้าย' },
            { l: 'ม่านบังแดด', q: 'ม่าน|บังแดด' },
            { l: 'คิ้วกันสาด', q: 'กันสาด' },
            { l: 'คิ้วบันได', q: 'บันได' },
            { l: 'ผ้าคลุมรถ', q: 'ผ้าคลุม' },
            { l: 'สายพ่วงแบตเตอรี่', q: 'สายพ่วง' },
            { l: 'สายลากจูง', q: 'สายลาก' },
            { l: 'ไฟส่องเท้า', q: 'ไฟส่องเท้า' },
            { l: 'สเกิร์ตรอบคัน', q: 'สเกิร์ต' },
            { l: 'สปอยเลอร์หลัง', q: 'สปอยเลอร์' },
            { l: 'เคลือบเซรามิก', q: 'เซรามิก' },
            { l: 'Ultimate Care', q: 'ultimate' },
            { l: 'ฟรีเช็กระยะ (ค่าแรง+อะไหล่)', q: 'เช็คระยะ|เช็กระยะ|ตรวจเช็ค' },
            { l: 'พรบ.', q: 'พรบ|พ.ร.บ' },
            { l: 'บัตรน้ำมัน 1,000 บาท', c: 1000 },
            { l: 'รถเก่าแลกรถใหม่ 15,000 บาท' },
        ];
        const focMatch = (query, modelKey) => {
            const terms = String(query || '').toLowerCase().split('|').map(t => t.trim()).filter(Boolean);
            if (!terms.length) return [];
            const codes = [...(AT_MODEL_CODES[modelKey] || []), 'OT', 'ALL'];
            return AT_FOC_ITEMS
                .filter(x => codes.includes(x.model) && cfgOn(x.active) && terms.some(q => String(x.name || '').toLowerCase().includes(q) || String(x.part || '').toLowerCase().includes(q) || String(x.cat || '').toLowerCase().includes(q)))
                .sort((x, y) => (/^(DVP|แพ็คเกจ)/.test(y.cat || '')) - (/^(DVP|แพ็คเกจ)/.test(x.cat || '')));
        };
"""
_a = '        const AT_POFREQ = ['
assert s.count(_a) == 1
s = s.replace(_a, GQ_CONST + _a)

_a = """                const codes = [...(AT_MODEL_CODES[selectedModelKey] || []), 'OT', 'ALL'];
                return AT_FOC_ITEMS
                    .filter(x => codes.includes(x.model) && cfgOn(x.active) && (String(x.name || '').toLowerCase().includes(q) || String(x.part || '').toLowerCase().includes(q) || String(x.cat || '').toLowerCase().includes(q)))
                    .sort((x, y) => (/^(DVP|แพ็คเกจ)/.test(y.cat || '')) - (/^(DVP|แพ็คเกจ)/.test(x.cat || '')))
                    .slice(0, 40);"""
assert s.count(_a) == 1
s = s.replace(_a, "                return focMatch(q, selectedModelKey).slice(0, 40);")

_a = "            const removeGift = (i) => setGiftList(giftRows.filter(r => r.i !== i));"
assert s.count(_a) == 1
s = s.replace(_a, """            const pickQuick = (f) => {
                if (f.c !== undefined) { addGift(f.l, f.c); return; }
                const exact = findFocCost(f.l, selectedModelKey);
                if (exact) { addGift(f.l, exact.cost); return; }
                const hits = focMatch(f.q || f.l, selectedModelKey);
                if (hits.length === 1) { addGift(String(hits[0].name || '').trim(), hits[0].cost); return; }
                if (hits.length > 1) { setFocQuery(f.q || f.l); return; }
                addGift(f.l);
                alert(`ไม่พบ "${f.l}" ในฐาน FOC ของรุ่นนี้ · เพิ่มแล้ว กรุณาใส่ทุนเอง`);
            };
""" + _a)

import re as _re
_m = _re.search(r"\{AT_POFREQ\.map\(f => <button[^\n]*\n", s)
assert _m
s = s[:_m.start()] + """{GIFT_QUICK.map(f => <button key={f.l} type="button" onClick={() => pickQuick(f)} title={f.c !== undefined ? `ทุน ${formatCurrency(f.c)}` : 'เลือกแล้วใส่ทุนจากฐาน FOC อัตโนมัติ'} className="shrink-0 whitespace-nowrap px-2.5 py-1.5 rounded-full bg-white border border-gray-200 text-[11px] text-gray-600 hover:border-red-300 active:bg-red-50">+ {f.l}</button>)}
""" + s[_m.end():]
_m = _re.search(r"\n[ ]*<details>\n[ ]*<summary[^\n]*รายการของแถมที่ใช้บ่อย[^\n]*\n[^\n]*SUGGESTED_GIFTS\.map[^\n]*\n[ ]*</details>", s)
assert _m
s = s[:_m.start()] + s[_m.end():]
_a = '<span className="text-[10px] text-gray-400 self-center shrink-0">ใช้บ่อย:</span>'
assert s.count(_a) == 1
s = s.replace(_a, '<span className="text-[10px] text-gray-400 self-center shrink-0">ใช้บ่อย (ใส่ทุนให้อัตโนมัติ):</span>')


# ---------- 7f. quick gifts from back office (fix cost / pick from FOC), expandable list, standard items
_i = s.index('        const GIFT_QUICK = [')
_j = s.index('        ];\n', _i) + len('        ];\n')
s = s[:_i] + s[_j:]
rep("                if (f.c !== undefined) { addGift(f.l, f.c); return; }",
    "                if (f.c !== undefined) { addGift(f.l, String(f.c)); return; }")
rep("            const pickQuick = (f) => {",
    """            const [giftAll, setGiftAllState] = useState(() => { try { return localStorage.getItem('at_gift_quick_all') === '1'; } catch (e) { return false; } });
            const setGiftAll = (v) => { setGiftAllState(v); try { localStorage.setItem('at_gift_quick_all', v ? '1' : '0'); } catch (e) { /* per-device */ } };
            const pickQuick = (f) => {""")
rep("""<div className="flex gap-1.5 overflow-x-auto sm:flex-wrap pb-1 -mx-1 px-1">
                                                    <span className="text-[10px] text-gray-400 self-center shrink-0">ใช้บ่อย (ใส่ทุนให้อัตโนมัติ):</span>""",
    """<div className="flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-bold text-gray-500">รายการที่ใช้บ่อย · ใส่ทุนให้อัตโนมัติ ({GIFT_QUICK.length})</span>
                                                    <button type="button" onClick={() => setGiftAll(!giftAll)} aria-expanded={giftAll} className="shrink-0 px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[11px] font-bold text-gray-600">{giftAll ? 'ย่อเป็นแถวเดียว' : 'แสดงทั้งหมด'} <i className={`fa-solid ${giftAll ? 'fa-chevron-up' : 'fa-chevron-down'} text-[9px] ml-0.5`}></i></button>
                                                </div>
                                                <div className={`flex gap-1.5 pb-1 -mx-1 px-1 ${giftAll ? 'flex-wrap' : 'overflow-x-auto'}`}>""")
rep("""title={f.c !== undefined ? `ทุน ${formatCurrency(f.c)}` : 'เลือกแล้วใส่ทุนจากฐาน FOC อัตโนมัติ'} className="shrink-0 whitespace-nowrap px-2.5 py-1.5 rounded-full bg-white border border-gray-200 text-[11px] text-gray-600 hover:border-red-300 active:bg-red-50">+ {f.l}</button>)}""",
    """title={f.c !== undefined ? `ทุน ${formatCurrency(f.c)}` : 'เลือกแล้วใส่ทุนจากฐาน FOC อัตโนมัติ'} className={`shrink-0 px-2.5 py-1.5 rounded-full bg-white border border-gray-200 text-[11px] text-gray-600 hover:border-red-300 active:bg-red-50 ${giftAll ? 'text-left' : 'whitespace-nowrap'}`}>+ {f.l}{f.c !== undefined && f.c > 0 && <span className="text-gray-400"> · {formatCurrency(f.c)}</span>}</button>)}""")
# standard items: names + fixed cost from back office
s = s.replace("        const STANDARD_GIFTS = [", "        const STANDARD_GIFTS_OLD = [", 1)
rep("                STANDARD_GIFTS.forEach((gift, index) => { initialGifts[index] = gift; });",
    "                atStdGifts().slice(0, 26).forEach((g, index) => { initialGifts[index] = g.l; });")
rep("const g = Array(26).fill(''); STANDARD_GIFTS.forEach((x, i) => { g[i] = x; }); setGifts(g); setGiftValues(Array(26).fill(''));",
    "const g = Array(26).fill(''), gv = Array(26).fill(''); atStdGifts().slice(0, 26).forEach((x, i) => { g[i] = x.l; gv[i] = x.c !== undefined ? String(x.c) : ((findFocCost(x.l, selectedModelKey) || {}).cost ?? ''); }); setGifts(g); setGiftValues(gv);")
assert 'STANDARD_GIFTS.' not in s and 'STANDARD_GIFTS)' not in s
rep("                atStdGifts().slice(0, 26).forEach((g, index) => { initialGifts[index] = g.l; });",
    "                const initialValues = Array(26).fill('');\n                atStdGifts().slice(0, 26).forEach((g, index) => { initialGifts[index] = g.l; initialValues[index] = g.c !== undefined ? String(g.c) : ''; });")
rep("setGiftValues(giftReset ? Array(26).fill('') : (d.giftValues || Array(26).fill('')));", "setGiftValues(giftReset ? initialValues : (d.giftValues || initialValues));")
rep("""                } else {
                    setGifts(initialGifts);
                    setDraftLoaded(true);""", """                } else {
                    setGifts(initialGifts); setGiftValues(initialValues);
                    setDraftLoaded(true);""")
rep("            const editGiftCost = (i, value) => { const v = [...giftValues]; v[i] = value; setGiftValues(v); };",
    """            const editGiftCost = (i, value) => { const v = [...giftValues]; v[i] = value; setGiftValues(v); };
            // รายการที่หลังบ้านกำหนด "ทุน fix" ใส่ทุนให้เองเมื่อช่องทุนยังว่าง
            useEffect(() => {
                setGiftValues(prev => {
                    let ch = false;
                    const next = prev.map((v, i) => {
                        const nm = String(gifts[i] || '').trim();
                        if (!nm || String(v ?? '') !== '') return v;
                        const f = AT_GIFT_QUICK.find(x => x.l === nm && x.c !== undefined);
                        if (!f) return v;
                        ch = true; return String(f.c);
                    });
                    return ch ? next : prev;
                });
            }, [gifts, giftValues, atCfg.version]);""")
assert s.count('{GIFT_QUICK.') == 2
s = s.replace('{GIFT_QUICK.', '{AT_GIFT_QUICK.')


# ---------- 7g. car price from the grade table (ราคาจากใบราคาในเว็บ AT stock เมื่อมี)
rep("            const carPrice = grade.price;", "            const carPrice = (GRADES_DATA[MODEL_MAPPING[uiModel]] || []).find(g => g.name === grade.name)?.price ?? grade.price;")


# ---------- 7h. my profile (ข้อมูลของฉัน): header button on the website; sales fill their phone / LINE themselves
PROF_BTN = """{window.__QWEB && (
    <button type="button" onClick={() => setShowProfile(true)} title="ข้อมูลของฉัน (เบอร์โทร / LINE)" aria-label="ข้อมูลของฉัน" className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${atCfg.myProfile && atCfg.myProfile.phone ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'}`}><i className="fa-solid fa-user"></i></button>
)}
{showProfile && <ProfileModal api={atCfg} onClose={() => setShowProfile(false)} />}
"""
_a = '<button onClick={() => setShowHistory(true)} className="h-10 min-w-10'
assert s.count(_a) == 1
s = s.replace(_a, PROF_BTN + '                                ' + _a)
rep("            const needLink = atCfg.viewer.loaded &&", """            const [showProfile, setShowProfile] = useState(false);
            // เซลล์ที่ยังไม่ได้ใส่เบอร์: เปิด "ข้อมูลของฉัน" ให้ครั้งเดียวต่อเครื่อง
            useEffect(() => {
                if (!window.__QWEB || window.__QWEB.role !== 'sales' || !atCfg.ready || !atCfg.viewer.id) return;
                if (atCfg.myProfile && atCfg.myProfile.phone) return;
                const k = 'at_q_prof_ask_' + atCfg.viewer.id;
                let asked = false; try { asked = localStorage.getItem(k) === '1'; localStorage.setItem(k, '1'); } catch (e) { asked = false; }
                if (!asked) setShowProfile(true);
            }, [atCfg.ready, atCfg.viewer.id, !!(atCfg.myProfile && atCfg.myProfile.phone)]);
            const needLink = atCfg.viewer.loaded &&""")


# ---------- 7i. AT Honda logos (header: colour · documents: black, no background) + model name without the price-period suffix
import base64 as _b64
_L = lambda n: 'data:image/png;base64,' + _b64.b64encode(open(os.path.join(D, '..', 'logo', n), 'rb').read()).decode()
LOGO_CONST = "        const AT_LOGO_COLOR = '" + _L('logo_color.png') + "';\n        const AT_LOGO_BLACK = '" + _L('logo_black.png') + "';\n" \
    "        // ชื่อรุ่นในเอกสาร (ใบเสนอราคา / ใบจอง / ใบสรุป): ตัดวงเล็บช่วงราคา-แคมเปญออก เช่น \"City (ราคาช่วงแนะนำ – แคมเปญ พ.ย.–ธ.ค.)\" → \"City\"\n" \
    "        const uiModelShort = (m) => String(uiModelLabel(m) || m || '').replace(/\\s*\\(.*\\)\\s*$/, '').replace(/\\s+ราคา(ช่วงแนะนำ|แนะนำ|ปกติ)[\\s\\S]*$/, '').trim();\n"
_a = '        const AT_POFREQ = ['
assert s.count(_a) == 1
s = s.replace(_a, LOGO_CONST + _a)
rep('<div className="w-9 h-9 sm:w-10 sm:h-10 bg-honda rounded-lg flex items-center justify-center text-white shrink-0"><HondaNextLogo color="#ffffff" size={25} showWord={false} /></div>',
    '<img src={AT_LOGO_COLOR} alt="AT Honda Automobile Group" className="h-10 sm:h-12 w-auto shrink-0" />')
_old = '<div className="w-11 h-11 sm:w-14 sm:h-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0"><HondaNextLogo color="#000000" size={37} showWord={false} /></div>'
assert s.count(_old) == 3, s.count(_old)
s = s.replace(_old, '<div className="w-11 sm:w-14 flex items-center justify-center shrink-0"><HondaNextLogo color="#000000" size={44} showWord={false} /></div>')
rep("""<select id="q-model" value={uiModel} onChange={(e) => setUiModel(e.target.value)} className={`${QSEL} text-lg`}>{UI_MODELS.map(m => <option key={m} value={m}>{uiModelLabel(m)}</option>)}</select>""",
    """<div className="relative min-w-0"><div className={`${QSEL} text-lg flex items-center gap-2 pointer-events-none`}><span className="truncate flex-1">{uiModelShort(uiModel)}</span><i data-html2canvas-ignore="true" className="fa-solid fa-chevron-down text-[11px] text-gray-400"></i></div><select id="q-model" aria-label="รุ่น" value={uiModel} onChange={(e) => setUiModel(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">{UI_MODELS.map(m => <option key={m} value={m}>{uiModelLabel(m)}</option>)}</select></div>""")
rep("setPendingFileName(name || `${uiModel} ${grade?.name || ''}`.trim());", "setPendingFileName(name || `${uiModelShort(uiModel)} ${grade?.name || ''}`.trim());")

# ---------- 8. formal black-and-white sales summary
a = s.index('                        {/* Hidden Sales Summary Card */}')
b = s.index('                    </div>\n\n                </div>\n            );\n        };\n\n        const root')
s = s[:a] + rd('summary.jsx') + s[b:]

# 7i (ต่อ): ใบสรุปการขายใช้ชื่อรุ่นแบบสั้น
rep("<td style={{ width: '34%' }}>{uiModelLabel(uiModel)}</td>", "<td style={{ width: '34%' }}>{uiModelShort(uiModel)}</td>")
# 7j: ชื่อรุ่นแบบสั้นทุกหน้าที่ออกให้ลูกค้า / ชื่อไฟล์ / ข้อความแจ้ง (ค่าที่เลือกและการคำนวณยังใช้ชื่อเต็ม)
for _o, _n in [('${uiModel} ${grade', '${uiModelShort(uiModel)} ${grade'), ('${uiModel}_${grade', '${uiModelShort(uiModel)}_${grade'),
               ('{e.uiModel}', '{uiModelShort(e.uiModel)}'), ('{q.uiModel}', '{uiModelShort(q.uiModel)}'),
               ('{item.data.uiModel}', '{uiModelShort(item.data.uiModel)}'), ('{item.model}', '{uiModelShort(item.model)}'),
               ('<span className="text-xl font-bold">{uiModel}', '<span className="text-xl font-bold">{uiModelShort(uiModel)}')]:
    assert _o in s, _o
    s = s.replace(_o, _n)
s = s.replace('<i data-html2canvas-ignore="true" className="fa-solid fa-chevron-down', '<i className="hide-in-image fa-solid fa-chevron-down')
# ใบเปรียบเทียบ: ตัวหนังสือหัวตารางและแถวชัดขึ้น
rep('<span className="text-[11px] font-light text-gray-300">ข้อเสนอ {idx + 1}</span>', '<span className="text-[11px] font-semibold text-red-300">ข้อเสนอ {idx + 1}</span>')
rep('<span className="text-xs font-light text-gray-300">{uiModelShort(q.uiModel)}</span>', '<span className="text-sm font-semibold text-white">{uiModelShort(q.uiModel)}</span>')
# แชร์ไม่ได้ (เช่น เปิดใน claude.ai หรือเบราว์เซอร์ที่ไม่รองรับ) → บันทึกไฟล์แทน
rep("""                    } else {
                        alert("อุปกรณ์นี้ไม่รองรับการแชร์ไฟล์โดยตรง กรุณาใช้ปุ่ม 'บันทึก (Download)'");
                    }
                } catch (e) { alert("แชร์ไม่ได้: " + e.message); }""", """                    } else {
                        await handleManualDownload();
                    }
                } catch (e) { if (e && e.name === 'AbortError') return; await handleManualDownload(); }""")
open(out, 'w', encoding='utf-8').write(s)
print('patched', len(s))
