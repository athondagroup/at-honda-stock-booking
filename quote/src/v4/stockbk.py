# ---------- 7m. ใบจอง → เว็บ AT stock (ขอ 24/11) + จำนวนรถในสต็อกตอนเลือกรุ่น/สี
# exec'd at the end of patch.py (uses rep / s from there)

# 1. stock per spec (ref/avail from the AT stock web): global + lookup through the price map (quote grade → Honda model/grade, colour → code)
rep("        const atColorCode = (name) => { const hit = AT_COLOR_CODE.find(([re]) => re.test(String(name || ''))); return hit ? hit[1] : ''; };",
"""        const atColorCode = (name) => { const hit = AT_COLOR_CODE.find(([re]) => re.test(String(name || ''))); return hit ? hit[1] : ''; };
        // รถในสต็อกต่อสเปก จากเว็บ AT stock (ref/avail): f = ว่าง · i = Quota กำลังมา · w = ใบจองรอรถ · b = ว่างแยกสาขา
        const AT_AVAIL = { specs: null, at: '' };
        const atSpecOf = (uiModel, gradeName, colorName) => {
            const m = (AT_PRICE_MAP[MODEL_MAPPING[uiModel]] || {})[gradeName], code = atColorCode(colorName);
            return m && code ? { model: m[0], grade: m[1], color: code } : null;
        };
        const atAvailOf = (uiModel, gradeName, colorName) => {
            if (!AT_AVAIL.specs) return null;
            const sp = atSpecOf(uiModel, gradeName, colorName); if (!sp) return null;
            return AT_AVAIL.specs[`${sp.model}|${sp.grade}|${sp.color}`] || { f: 0, i: 0, w: 0 };
        };""")
rep("            cfg.catalog = stock.catalog || null;\n            return cfg;",
    "            AT_AVAIL.specs = (stock.avail && stock.avail.specs) || null; AT_AVAIL.at = (stock.avail && stock.avail.at) || '';\n            cfg.catalog = stock.catalog || null;\n            return cfg;")

# 2. colour swatches: free cars as a badge, and one line for the chosen colour (not in the image / print)
rep("""                                                    <button key={c.name} type="button" title={c.name} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition ${color?.name === c.name ? 'border-red-600 scale-110' : 'border-gray-200 hover:border-gray-400'}`} style={{ backgroundColor: c.code }}></button>
                                                ))}
                                            </div>""",
"""                                                    <button key={c.name} type="button" title={(() => { const av = atAvailOf(uiModel, grade.name, c.name); return av ? `${c.name} · ว่าง ${av.f} คัน` : c.name; })()} onClick={() => setColor(c)} className={`relative w-8 h-8 rounded-full border-2 transition ${color?.name === c.name ? 'border-red-600 scale-110' : 'border-gray-200 hover:border-gray-400'}`} style={{ backgroundColor: c.code }}>
                                                        {(() => { const av = atAvailOf(uiModel, grade.name, c.name); return av ? <span className={`absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center text-white ring-2 ring-white ${av.f > 0 ? 'bg-green-600' : av.i > 0 ? 'bg-amber-500' : 'bg-gray-400'}`}>{av.f}</span> : null; })()}
                                                    </button>
                                                ))}
                                            </div>
                                            {AT_AVAIL.specs && color && (() => {
                                                const av = atAvailOf(uiModel, grade.name, color.name);
                                                if (!av) return <div className="hide-in-image no-print text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5"><i className="fa-solid fa-warehouse mr-1"></i>ยังจับคู่สต็อกของรุ่น/สีนี้ไม่ได้</div>;
                                                const short = av.f + av.i <= av.w;
                                                const br = av.b ? Object.entries(av.b).map(([k, n]) => `${k} ${n}`).join(' · ') : '';
                                                const t = AT_AVAIL.at ? new Date(AT_AVAIL.at) : null;
                                                return (
                                                    <div className={`hide-in-image no-print text-xs rounded-lg px-2.5 py-1.5 border ${av.f > 0 && !short ? 'bg-green-50 border-green-200 text-green-800' : short ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                                                        <div className="font-bold"><i className="fa-solid fa-warehouse mr-1"></i>สต็อก AT: ว่าง {av.f} คัน{br ? ` (${br})` : ''} · Quota กำลังมา {av.i} · ใบจองรอรถ {av.w}</div>
                                                        <div className="opacity-80">{short ? 'รถไม่พอคิว ถ้าจองต้องรอ Honda จัดสรรเพิ่ม' : av.f > 0 ? 'มีรถว่าง จองแล้วล็อกรถได้' : 'ไม่มีรถว่างตอนนี้ รอ Quota ที่กำลังมา'}{t ? ` · อัปเดต ${t.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</div>
                                                    </div>
                                                );
                                            })()}""")

# 3. the quote log tells the id of the record it just added
rep("            const dbRef = useRef(null);\n            useEffect(() => {\n                let unsub = null, cancelled = false;\n                const timer = setTimeout(() => setReady(true), 10000);",
    "            const dbRef = useRef(null);\n            const lastId = useRef(null);\n            useEffect(() => {\n                let unsub = null, cancelled = false;\n                const timer = setTimeout(() => setReady(true), 10000);")
rep("                    try { await dbRef.current.collection('quotes').doc().set(rec); return 'db'; }",
    "                    try { const r = dbRef.current.collection('quotes').doc(); await r.set(rec); lastId.current = r.id; return 'db'; }")
rep("                writeLocal(list => [{ id: 'L' + Date.now() + Math.floor(Math.random() * 1000), ...rec }, ...list]);\n                return 'local';",
    "                const lid = 'L' + Date.now() + Math.floor(Math.random() * 1000); lastId.current = lid;\n                writeLocal(list => [{ id: lid, ...rec }, ...list]);\n                return 'local';")
rep("            return { entries, mode, ready, add, update, remove };", "            return { entries, mode, ready, add, update, remove, lastId: () => lastId.current };")

# 4. the booking: remember which quote record it is; send its draft + image to the AT stock web
_i = s.index("                quoteLog.add({\n                    uid: atCfg.viewer.id || '', kind: 'booking'")
_j = s.index("                });", _i)
s = s[:_i] + s[_i:_j] + "                }).then(() => setStockBkId(quoteLog.lastId()));" + s[_j + len("                });"):]
rep("                handleLoad(item); const d = item.data;", "                handleLoad(item); setStockBkId(item.id); const d = item.data;")
rep("            const generateBookingImage = async (formData) => {",
r"""            const [stockBkId, setStockBkId] = useState(null);
            const [stockSending, setStockSending] = useState('');
            // ร่างใบจองสำหรับเว็บ AT stock: ช่องเดียวกับฟอร์มใบจอง (เงื่อนไขการขาย / FOC / ใบสั่งแต่งรถ)
            const STOCK_FIN = { 'ฮอนด้า ลีสซิ่ง': 'HLTC', 'กรุงศรี': 'BAY', 'ไทยพาณิชย์': 'SCB', 'ธนชาต': 'TTB', 'ทหารไทยธนชาต': 'TTB', 'เกียรตินาคิน': 'KKP' };
            const STOCK_WHO = { honda: 'Honda แถม', dealer: 'AT แถม', customer: 'ลูกค้าซื้อ' };
            const stockDraft = () => {
                const b = bookingData || {}, cash = b.isCash || financeType === 'cash', sp = atSpecOf(uiModel, grade?.name, color?.name) || {};
                const finName = b.financeOption === 'อื่นๆ' ? (b.customFinance || '') : (b.financeOption || '');
                const term = parseInt(b.selectedTerm || terms[0] || 48), inst = calculatedInstallments?.[term] || {};
                const disc = (priceAdjustment < 0 ? -priceAdjustment : 0) + getExpenseValue(expenses.cashDiscount);
                const xp = [];
                if (getExpenseValue(expenses.vatDiscount) > 0) xp.push({ l: 'VAT', v: getExpenseValue(expenses.vatDiscount) });
                if (getExpenseValue(expenses.othersAdd) > 0) xp.push({ l: expenses.othersAddLabel || 'อื่น ๆ', v: getExpenseValue(expenses.othersAdd) });
                const po = [
                    ...gifts.map((g, i) => ({ g: String(g || '').trim(), v: parseFloat(giftValues[i]) || 0 })).filter(x => x.g && !giftAutoKind(x.g) && !atStdGifts().some(t => t.l === x.g)).map(x => ({ name: x.g, cost: x.v })),
                    ...(extraItems || []).filter(x => x && String(x.name || '').trim()).map(x => ({ name: x.name, part: x.part || '', cpay: true, cprice: Number(x.price) || 0, sale: Number(x.price) || 0, cost: 0 }))
                ];
                const remark = [b.remark, b.dspExtensionDetails, b.deliveryMonth && b.deliveryYear ? `รับรถ ${b.deliveryMonth}/${b.deliveryYear}` : ''].filter(Boolean).join(' · ');
                return {
                    customer: (b.customerName || customerName || '').trim(), sales: consultantName || '', br: (window.__QWEB && window.__QWEB.branch) || '',
                    model: sp.model || '', grade: sp.grade || '', color: sp.color || '', booking_date: b.bookingDate || '',
                    ...(() => { const m = (AT_PRICE_MAP[MODEL_MAPPING[uiModel]] || {})[grade?.name]; return m ? { price_tier: m[3], price_year: m[2] } : {}; })(),
                    purchase: cash ? 'ซื้อสด' : 'ไฟแนนซ์', finance: cash ? '' : (STOCK_FIN[finName] || 'อื่น ๆ'),
                    deposit: getExpenseValue(expenses.deposit) || '', discount: disc || '', insurance: STOCK_WHO[insurancePayers[1] || 'customer'],
                    foc_total: Math.round(totalGiftValue) || 0,
                    note: [STOCK_FIN[finName] || cash ? '' : `ไฟแนนซ์ ${finName}`, remark].filter(Boolean).join(' · '),
                    deal: {
                        ...(cash ? {} : { down: Math.round(downAmount) || 0, rate: inst.rate !== undefined && inst.rate !== '-' ? Number(inst.rate) : '', term, adv_inst: paymentType === 'beginning' }),
                        ...(priceAdjustment > 0 ? { price_add: priceAdjustment } : {}),
                        campaign_id: campaign && campaign.code && campaign.month ? `${campaign.month}|${campaign.code}` : '',
                        at_step: cash ? '' : atStep === 'step1' ? '1' : atStep === 'step2' ? '2' : '',
                        priv_gtg: privGtg || '', priv_ln: privLn ? 'cash' : '', priv_hk: privHk || '',
                        ins2_by: insuranceDuration >= 2 ? STOCK_WHO[insurancePayers[2] || 'customer'] : '', ins3_by: insuranceDuration >= 3 ? STOCK_WHO[insurancePayers[3] || 'customer'] : '',
                        reg_by: registrationPayer === 'dealer' ? 'AT แถม' : 'ลูกค้าซื้อ', reg_type: registrationType === 'corporate' ? 'นิติบุคคล' : 'บุคคลธรรมดา',
                        extra_pay: xp
                    },
                    po,
                    sum: { model: uiModelShort(uiModel), grade: grade?.name || '', color: color?.name || '', price: carPrice + colorPriceVal, tier: ((AT_PRICE_MAP[MODEL_MAPPING[uiModel]] || {})[grade?.name] || [])[3] || '', net: netPrice, cash, down: cash ? 0 : downAmount, term: cash ? '' : term, rate: inst.rate, monthly: inst.monthly, campaign: campaign?.name || '' }
                };
            };
            const sendToStock = async (imageUrl) => {
                const q = window.__QWEB;
                if (!q || !q.uploadImage) return;
                if (!bookingData) { alert('สร้างใบจองก่อน แล้วค่อยส่งเข้าเว็บ AT stock'); return; }
                setStockSending('กำลังส่งเข้าเว็บ AT stock…');
                try {
                    const blob = await (await fetch(imageUrl)).blob();
                    const img = await q.uploadImage(blob);
                    const db = await window.claude.use('db');
                    const stock = { at: new Date().toISOString(), by: q.email, img, draft: JSON.parse(JSON.stringify(stockDraft())) };
                    let id = stockBkId;
                    if (id && !String(id).startsWith('L')) await db.collection('quotes').doc(id).update({ stock });
                    else {
                        const r = db.collection('quotes').doc();
                        await r.set(JSON.parse(JSON.stringify({ uid: atCfg.viewer.id || '', kind: 'booking', name: bookingData.customerName || quoteFileName, ...quoteSummary(), at: new Date().toISOString(), data: { ...collectState(), bookingData }, stock })));
                        id = r.id; setStockBkId(id);
                    }
                    const go = '../?qbk=' + encodeURIComponent(id) + '#book/new';
                    if (typeof window.__QGO === 'function') { window.__QGO(go); setStockSending(''); } else location.href = go;
                } catch (e) { setStockSending(''); alert('ส่งเข้าเว็บ AT stock ไม่สำเร็จ: ' + (e && e.message ? e.message : 'ลองใหม่อีกครั้ง')); }
            };

            const generateBookingImage = async (formData) => {""")
rep("canCreateSalesSummary={!!bookingData}", "canCreateSalesSummary={!!bookingData} onSendStock={sendToStock} sendState={stockSending}")
rep("        const ImagePreviewModal = ({ imageUrl, name, onClose, onCreateSalesSummary, canCreateSalesSummary, previewType }) => {",
    "        const ImagePreviewModal = ({ imageUrl, name, onClose, onCreateSalesSummary, canCreateSalesSummary, previewType, onSendStock, sendState }) => {")
_i = s.index("        const BookingFormModal = (")
_k = s.rindex("                            </div>\n                        </div>\n                    </div>\n                </div>\n            );\n        };", 0, _i)
s = s[:_k] + """                            </div>
                            {previewType === 'booking-card' && window.__QWEB && onSendStock && (
                                <>
                                    <button onClick={() => onSendStock(imageUrl)} disabled={!!sendState} className="w-full flex items-center justify-center py-3 rounded-xl font-bold bg-gray-900 text-white hover:bg-black transition disabled:opacity-60"><i className="fa-solid fa-paper-plane mr-2"></i>{sendState || 'ส่งเข้าเว็บ AT stock (ลงใบจองต่อ)'}</button>
                                    <p className="text-[11px] text-gray-500 text-center leading-relaxed">รุ่น ราคา เงื่อนไขการขาย FOC ของแถม (ไปใบสั่งแต่งรถ) และรูปใบจองนี้ จะกรอกในฟอร์มใบจองของเว็บ AT stock ให้ · แนบสลิปมัดจำ ใส่เลขที่ใบจอง แล้วกดบันทึกที่นั่น</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            );
        };""" + s[_k + len("                            </div>\n                        </div>\n                    </div>\n                </div>\n            );\n        };"):]

# 5. history: the AT stock booking made from this quote
rep("                data: e.data, createdAt: new Date(e.at)\n            })), [quoteLog.entries, atCfg.isAdmin, atCfg.viewer.id]);",
    "                data: e.data, createdAt: new Date(e.at), stock: e.stock ? { at: e.stock.at } : null\n            })), [quoteLog.entries, atCfg.isAdmin, atCfg.viewer.id]);")
_i = s.index("        const HistoryModal = ({ history, onLoad, onDelete, onClose, onToggleStar, onEditName, onViewBooking, loading }) => {")
_i = s.index("\n", _i) + 1
s = s[:_i] + """            const [bkMap, setBkMap] = useState({});
            const stockIds = history.filter(h => h.stock).map(h => h.id).join(',');
            useEffect(() => {
                if (!stockIds || !window.__QWEB || !window.__QWEB.bookingsFor) return;
                let on = true; window.__QWEB.bookingsFor(stockIds.split(',')).then(m => on && setBkMap(m || {}), () => {});
                return () => { on = false; };
            }, [stockIds]);
""" + s[_i:]
rep("""                                                        <span>{new Date(item.createdAt).toLocaleDateString('th-TH', {day:'numeric', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit'})}</span>
                                                    </div>""",
"""                                                        <span>{new Date(item.createdAt).toLocaleDateString('th-TH', {day:'numeric', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit'})}</span>
                                                        {item.stock && (() => {
                                                            const b = bkMap[item.id];
                                                            const t = !b ? ['ส่งเข้า AT stock แล้ว · รอแนบสลิปและบันทึก', 'bg-amber-50 text-amber-700 border-amber-200']
                                                                : b.cancelled ? ['ใบจองถูกยกเลิก', 'bg-gray-100 text-gray-500 border-gray-200']
                                                                : b.receipt ? [`จองแล้ว · เลขที่ ${b.no || b.receipt}`, 'bg-green-50 text-green-700 border-green-200']
                                                                : ['บันทึกใบจองแล้ว · รอเลขที่ใบเสร็จมัดจำ', 'bg-blue-50 text-blue-700 border-blue-200'];
                                                            return <a href={b ? `../?bk=${encodeURIComponent(b.id)}` : `../?qbk=${encodeURIComponent(item.id)}#book/new`} className={`mt-1 self-start px-2 py-0.5 rounded-full border text-[11px] font-bold ${t[1]}`}><i className="fa-solid fa-warehouse mr-1"></i>{t[0]}</a>;
                                                        })()}
                                                    </div>""")
