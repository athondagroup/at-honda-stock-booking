
        // =====================================================================
        // ใบเปรียบเทียบแบบ A4 (ตกลง 5/11): หน้าเดียวเสมอ · ตัวหนังสือย่อเองถ้าเนื้อหายาว (เช่น ของแถมเยอะ)
        // =====================================================================
        const A4C_COLORS = ['#b91c1c', '#1e3a8a', '#065f46', '#7c2d12', '#4c1d95'];
        const A4C_CSS = `
.a4c{width:794px;height:1123px;background:#fff;box-sizing:border-box;padding:22px 26px 16px;display:flex;flex-direction:column;overflow:hidden;position:relative;color:#111827;font-family:'Prompt','Noto Sans Thai',sans-serif;font-size:calc(12.5px * var(--k,1))}
.a4c *{box-sizing:border-box}.a4c>*{flex-shrink:0}
.a4c-bar{position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,#b91c1c,#ef4444,#b91c1c)}
.a4c-hd{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:.6em;border-bottom:1.5px solid #111827}
.a4c-hd .b{display:flex;gap:.8em;align-items:center}.a4c-hd h1{margin:0;font-size:1.55em;line-height:1.1;font-weight:700}.a4c-hd p{margin:0;font-size:.95em;font-weight:600;color:#374151}
.a4c-hd .c{text-align:right;font-size:.9em;line-height:1.4;color:#374151}.a4c-hd .c b{font-size:1.05em;color:#111}
.a4c-grid{display:grid}
.a4c-cards{gap:6px;margin-top:.6em}.a4c-card{border-radius:8px;color:#fff;padding:.45em .7em;min-width:0}
.a4c-card .t{font-size:.84em;opacity:.95}.a4c-card .g{font-size:1.05em;line-height:1.25}.a4c-card .g b{font-size:1.2em}
.a4c-tbl{margin-top:.5em;border:1px solid #d1d5db;border-radius:8px;overflow:hidden}
.a4c-r{border-top:1px solid #e5e7eb;align-items:center}.a4c-r:first-child{border-top:none}
.a4c-r>div{padding:.28em .7em;text-align:right;font-variant-numeric:tabular-nums;min-width:0}
.a4c-r>.l{text-align:left;font-weight:600;color:#1f2937;background:#f3f4f6;font-size:.96em;white-space:nowrap}
.a4c-r.em>div{font-size:1.12em}.a4c-m{font-size:1.12em;font-weight:700}.a4c small{font-size:.76em;color:#4b5563;font-weight:500}
.a4c-sh{background:#e5e7eb;font-size:.92em;font-weight:700;padding:.25em .7em;border-top:1px solid #d1d5db}
.a4c-sh small{font-weight:500}
.a4c-tot{background:#111827;color:#fff}.a4c-tot>.l{background:#111827;color:#fff}.a4c-tot>div{font-size:1.28em;font-weight:800;padding:.45em .7em}
.a4c-gift>div{text-align:left;align-self:start;padding:.4em .6em}.a4c-gift>.l{align-self:stretch}
.a4c ol{list-style:decimal;margin:0;padding-left:1.9em;font-size:.84em;line-height:1.32;color:#1f2937}.a4c-cnt{font-size:.76em;color:#6b7280;margin-top:2px}
.a4c-bad{color:#dc2626;font-size:.8em;font-weight:700;white-space:normal}
.a4c-ft{margin-top:auto;padding-top:.6em;font-size:.76em;color:#4b5563;line-height:1.45}
`;
        const CompareA4Sheet = ({ quotes, terms, consultant, h, sheetId }) => {
            const ref = useRef(null);
            const [k, setK] = useState(1);
            const fc = (v) => h.formatCurrency(v);
            const cols = `104px repeat(${quotes.length}, minmax(0, 1fr))`;
            const isCash = (q) => q.financeType === 'cash';
            // ย่อทั้งหน้าให้อยู่ใน A4 หน้าเดียว
            React.useLayoutEffect(() => {
                const el = ref.current; if (!el) return;
                const fits = (v) => { el.style.setProperty('--k', String(v)); return el.scrollHeight - el.clientHeight <= 1; };
                let kk = 1;
                if (!fits(1)) { let lo = 0.5, hi = 1; for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; } kk = lo; fits(kk); }
                if (Math.abs(kk - k) > 0.001) setK(kk);
            });
            const row = (label, cells, cls = '') => <div className={`a4c-grid a4c-r ${cls}`} style={{ gridTemplateColumns: cols }}><div className="l">{label}</div>{cells}</div>;
            const cell = (q, node) => <div key={q.id}>{node}</div>;
            const color = (i) => A4C_COLORS[i % A4C_COLORS.length];
            const expRows = [{ l: 'ค่ามัดจำป้ายแดง', k: 'redPlate' }, { l: 'ค่าอุปกรณ์ตกแต่ง', k: 'accessories' }, { l: 'VAT', k: 'vatDiscount' }, { l: 'อื่นๆ (บวก)', k: 'othersAdd' }]
                .filter(r => quotes.some(q => h.getExpenseValue(q.expenses?.[r.k]) > 0));
            const dedRows = [{ l: 'ส่วนลดเงินสด', k: 'cashDiscount' }, { l: 'หัก มัดจำ', k: 'deposit' }, { l: 'หัก อื่นๆ', k: 'othersDeduct' }]
                .filter(r => quotes.some(q => h.getExpenseValue(q.expenses?.[r.k]) > 0));
            const anyFin = quotes.some(q => !isCash(q));
            const anyDSP = quotes.some(q => q.isDSP || q.financeType === 'dsp');
            const anyExtra = quotes.some(q => (q.extraItems || []).length);
            const bank = [...new Set(quotes.filter(q => !isCash(q)).map(q => q.bankLabel).filter(Boolean))];
            const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
            return (
                <div id={sheetId} ref={ref} className="a4c" style={{ '--k': k }}>
                    <div className="a4c-bar"></div>
                    <div className="a4c-hd">
                        <div className="b"><HondaNextLogo color="#000000" size={38} showWord={false} /><div><h1>AT Honda Group</h1><p>ใบเปรียบเทียบข้อเสนอ</p></div></div>
                        <div className="c">{consultant.name && <b>{consultant.name}</b>}{consultant.phone && <> · {consultant.phone}</>}{consultant.line && <> · <span style={{ color: '#15803d' }}>LINE {consultant.line}</span></>}<br />{today}</div>
                    </div>
                    <div className="a4c-grid a4c-cards" style={{ gridTemplateColumns: cols }}>
                        <div></div>
                        {quotes.map((q, i) => (
                            <div key={q.id} className="a4c-card" style={{ background: color(i) }}>
                                <div className="t">ข้อเสนอ {i + 1} · {h.custFinLabel(q.financeLabel || (isCash(q) ? 'ซื้อสด' : q.isDSP ? 'Double Smile Plus' : 'ผ่อน'))}</div>
                                <div className="g">{h.uiModelShort(q.uiModel)} <b>{q.grade?.name || q.grade}</b></div>
                                <div className="t">{q.color?.name || '-'}</div>
                            </div>
                        ))}
                    </div>
                    <div className="a4c-tbl">
                        {row('ราคารถ', quotes.map(q => cell(q, fc(q.totalPrice))))}
                        {quotes.some(q => Number(q.priceAdjustment)) && row('ส่วนลด / ซับดาวน์', quotes.map(q => cell(q, Number(q.priceAdjustment) ? fc(q.priceAdjustment) : '–')))}
                        {row('ราคาสุทธิ', quotes.map((q, i) => cell(q, <b style={{ color: color(i) }}>{fc(q.netPrice)}</b>)), 'em')}
                        {anyFin && row('เงินดาวน์', quotes.map(q => cell(q, isCash(q) ? '–' : <>{fc(q.downAmount)} <small>{q.downPct}%</small></>)))}
                        {anyFin && row('ยอดจัด', quotes.map(q => cell(q, isCash(q) ? '–' : fc(q.financeAmount))))}
                        {anyFin && <div className="a4c-sh">ค่างวดต่อเดือน{bank.length ? ` · ${bank.join(' / ')}` : ''} <small>(ดอกเบี้ย · ดอกเบี้ยรวมตลอดสัญญา)</small></div>}
                        {anyFin && terms.map(t => row(`${t} งวด`, quotes.map((q, i) => {
                            const r = q.installments?.[t];
                            if (isCash(q)) return cell(q, '–');
                            if (r?.invalid) return cell(q, <span className="a4c-bad">{r.invalidReason || 'ไม่เข้าเงื่อนไข'}</span>);
                            if (!(r && r.monthly > 0)) return cell(q, '–');
                            return cell(q, <><span className="a4c-m" style={{ color: color(i) }}>{fc(r.monthly)}</span> <small style={{ display: quotes.length >= 4 ? 'block' : 'inline' }}>{r.rate}%{r.totalInterest > 0 ? ` · รวม ${fc(r.totalInterest)}` : ''}{q.isDSP && r.balloon > 0 ? ` · ก้อนสุดท้าย ${fc(r.balloon)}` : ''}</small></>);
                        })))}
                        <div className="a4c-sh">ค่าใช้จ่ายวันรับรถ</div>
                        {row('ค่าเบี้ยประกันภัย', quotes.map(q => { const t = h.quoteInsuranceText(q); return cell(q, /^\d/.test(String(t)) ? fc(t) : <span style={{ color: /แถม/.test(String(t)) ? '#15803d' : undefined, fontWeight: /แถม/.test(String(t)) ? 700 : 400 }}>{t}</span>); }))}
                        {row('ค่าจดทะเบียน', quotes.map(q => cell(q, h.quoteRegistrationText(q))))}
                        {expRows.map(r => <React.Fragment key={r.k}>{row(r.k === 'othersAdd' ? (quotes.find(q => q.expenses?.othersAddLabel)?.expenses?.othersAddLabel || r.l) : r.l, quotes.map(q => cell(q, h.getExpenseValue(q.expenses?.[r.k]) > 0 ? fc(q.expenses[r.k]) : '–')))}</React.Fragment>)}
                        {dedRows.map(r => <React.Fragment key={r.k}>{row(r.l, quotes.map(q => cell(q, h.getExpenseValue(q.expenses?.[r.k]) > 0 ? <span style={{ color: '#15803d' }}>-{fc(q.expenses[r.k])}</span> : '–')))}</React.Fragment>)}
                        {row('รวมจ่ายวันรับรถ', quotes.map(q => cell(q, fc(q.totalOnDelivery))), 'a4c-tot')}
                        <div className="a4c-sh">ของแถม</div>
                        <div className="a4c-grid a4c-r a4c-gift" style={{ gridTemplateColumns: cols }}>
                            <div className="l">รายการ</div>
                            {quotes.map(q => <div key={q.id}>{(q.gifts || []).length ? <><ol>{q.gifts.map((g, i) => <li key={i}>{g}</li>)}</ol><div className="a4c-cnt">{q.gifts.length} รายการ</div></> : '–'}</div>)}
                        </div>
                        {anyExtra && <>
                            <div className="a4c-sh">อุปกรณ์ซื้อเพิ่มเติม</div>
                            <div className="a4c-grid a4c-r a4c-gift" style={{ gridTemplateColumns: cols }}>
                                <div className="l">รายการ</div>
                                {quotes.map(q => <div key={q.id}>{(q.extraItems || []).length ? <ol>{q.extraItems.map((x, i) => <li key={i}>{x.name}{Number(x.price) ? ` · ${fc(x.price)}` : ''}</li>)}</ol> : '–'}</div>)}
                            </div>
                        </>}
                    </div>
                    <div className="a4c-ft">*ค่างวดและอัตราดอกเบี้ยเป็นการประมาณการ อาจเปลี่ยนแปลงตามเงื่อนไขไฟแนนซ์และแคมเปญ ณ วันที่จอง{anyDSP ? <><br />{DSP_EXTENSION_NOTE}</> : null}</div>
                </div>
            );
        };
        // หน้าจอ: ย่อแผ่น A4 ให้พอดีความกว้าง · สำหรับบันทึกรูปใช้แผ่นขนาดจริงที่ซ่อนไว้นอกจอ
        const CompareA4View = ({ quotes, terms, consultant, h, onEdit, onRemove, onGoQuote }) => {
            const wrap = useRef(null);
            const [w, setW] = useState(794);
            useEffect(() => {
                const el = wrap.current; if (!el) return;
                const fit = () => setW(Math.min(794, el.clientWidth));
                fit();
                const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
                if (ro) ro.observe(el); else window.addEventListener('resize', fit);
                return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', fit); };
            }, []);
            if (!quotes.length) return (
                <div className="bg-white rounded-2xl card-shadow p-6 text-center">
                    <i className="fa-solid fa-scale-balanced text-4xl text-gray-300 mb-4"></i>
                    <p className="text-gray-600 font-bold mb-1">ยังไม่มีใบเสนอราคาที่เลือกไว้</p>
                    <p className="text-sm text-gray-500 mb-3">ทำใบเสนอราคา แล้วกด “เพิ่มลงเปรียบเทียบ” ด้านล่างของแถบเสนอราคา</p>
                    <button type="button" onClick={onGoQuote} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold">ไปที่แถบเสนอราคา</button>
                </div>
            );
            const s = w / 794;
            return (
                <div className="space-y-3">
                    <style>{A4C_CSS}</style>
                    <div className="flex flex-wrap gap-2">
                        {quotes.map((q, i) => (
                            <div key={q.id} className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 pl-2 pr-1 py-1 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: A4C_COLORS[i % A4C_COLORS.length] }}></span>
                                <span className="font-bold text-gray-800">ข้อเสนอ {i + 1} · {h.uiModelShort(q.uiModel)} {q.grade?.name || q.grade}</span>
                                {q.data && <button type="button" onClick={() => onEdit(q)} className="px-2 py-1 rounded-lg bg-gray-100 font-bold text-gray-700">แก้ไข</button>}
                                <button type="button" onClick={() => onRemove(q.id)} className="px-2 py-1 rounded-lg bg-gray-100 font-bold text-red-600">เอาออก</button>
                            </div>
                        ))}
                    </div>
                    <div ref={wrap} className="w-full">
                        <div className="mx-auto rounded-xl overflow-hidden card-shadow" style={{ width: 794 * s, height: 1123 * s }}>
                            <div style={{ transform: `scale(${s})`, transformOrigin: 'top left', width: 794, height: 1123 }}>
                                <CompareA4Sheet quotes={quotes} terms={terms} consultant={consultant} h={h} sheetId="compare-saved-card" />
                            </div>
                        </div>
                    </div>
                    <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: 794, height: 1123, pointerEvents: 'none' }}>
                        <CompareA4Sheet quotes={quotes} terms={terms} consultant={consultant} h={h} sheetId="compare-a4-capture" />
                    </div>
                </div>
            );
        };
