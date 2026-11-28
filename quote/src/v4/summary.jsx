                        {/* Hidden Sales Summary Card — ใบสรุปการขาย (ฝ่ายขาย) ขาวดำ · แบบรายละเอียดใบจองฝ่ายขาย (ขอ 26/11)
                            หน้าใบเสนอราคา = ใบสรุปชั่วคราว รอผู้จัดการอนุมัติ · ใบอนุมัติเบิกค่าคอม ออกจากเว็บ AT stock หลังผู้จัดการยืนยัน */}
                        {(() => {
                            const mk = MODEL_MAPPING[uiModel];
                            const money = (v) => { const n = Number(v) || 0; return n < 0 ? `(${formatCurrency(-n)})` : formatCurrency(n); };
                            const dash = (v) => (Number(v) || 0) ? money(v) : '-';
                            const isCash = salesSummaryIsCash;
                            const listPrice = carPrice + colorPriceVal;
                            const cashDisc = customerTotalDiscount;
                            const invPrice = netPrice;
                            // ของแถม: แยก Honda แท้ / Sub ตามรายการ FOC · บริการมาตรฐานไม่มีทุน · ประกัน/จดทะเบียนไปอยู่ "แถมอื่น ๆ"
                            const rows = gifts.map((g, i) => ({ g: String(g || '').trim(), v: parseFloat(giftValues[i]) || 0 })).filter(x => x.g && !giftAutoKind(x.g)).map(x => {
                                const hit = findFocCost(x.g, mk);
                                const std = atStdGifts().some(t => t.l === x.g);
                                const grp = hit && /honda/i.test(hit.vendor || '') ? 'honda' : std && !x.v ? 'std' : 'sub';
                                return { ...x, code: hit ? (hit.part || '') : '', vendor: hit ? (hit.vendor || '') : '', grp };
                            });
                            const sumOf = (g) => rows.filter(r => r.grp === g).reduce((s, r) => s + r.v, 0);
                            const focHonda = sumOf('honda'), focSub = sumOf('sub');
                            const premiums = (INSURANCE_PREMIUMS[mk]?.[insuranceDuration] || []);
                            const others = [
                                ...(cashDisc > 0 ? [{ code: 'DISC', g: isCash ? 'ส่วนลดเงินสด' : 'ส่วนลดราคารถ / ส่วนลดเงินดาวน์', v: cashDisc }] : []),
                                ...premiums.map((p, i) => ({ year: i + 1, p, by: insurancePayers[i + 1] || 'customer' })).filter(x => x.by !== 'customer').map(x => ({ code: 'INS-' + x.year, g: `ฟรีประกันภัยชั้น 1 ปีที่ ${x.year} (${x.by === 'honda' ? 'Honda แถม · ไม่หัก Margin' : 'AT แถม'})`, v: x.by === 'dealer' ? (insuranceCosts.dealer > 0 && effectiveDealerInsuranceCost !== insuranceCosts.dealer ? Math.round(x.p * effectiveDealerInsuranceCost / insuranceCosts.dealer) : x.p) : 0 })),
                                ...(registrationPayer === 'dealer' ? [{ code: 'REG-F', g: 'ฟรีค่าจดทะเบียน', v: effectiveDealerRegistrationCost }] : [])
                            ];
                            const focOther = others.reduce((s, r) => s + r.v, 0);
                            const focUsed = focHonda + focSub + focOther;
                            const left = totalMarginSum - focUsed;
                            const accSold = extraTotal;
                            const branch = (window.__QWEB && window.__QWEB.branch) || '';
                            // คอม FN (ตกลง 28/11): ยอดจัด × ดอกเบี้ยลูกค้า (สุทธิ) × ปี (สูงสุด 6) × คอม FN % ที่เซลล์กรอก · เซลล์ได้ 20% (เข้าค่าคอมเซลล์) เฉพาะ STEP ช่อง 1 · ดอกเบี้ย 0% = 0
                            // ค่าประกันคุ้มครองสินเชื่อ: แบบเดียวกับเงื่อนไขไฟแนนซ์ในใบจอง AT stock · หักจากดาวน์ = ยอดจัดเพิ่ม · ลูกค้าชำระ = บวกในค่าใช้จ่ายวันรับรถ
                            const creditIns = isCash ? 0 : getExpenseValue(bookingData?.creditIns);
                            const creditInDown = creditIns > 0 && bookingData?.creditInsBy !== 'pay';
                            const finAmt = financeAmount + (creditInDown ? creditIns : 0);
                            const fnPct = parseFloat(bookingData?.fnPct) || 0;
                            const fnRate = Number(salesSummaryInstallment?.rate) || 0;
                            const fnYears = Math.min(6, (salesSummaryTerm || 0) / 12);
                            const fnTotal = isCash ? 0 : Math.round(finAmt * fnRate / 100 * fnYears * fnPct / 100);
                            const fnStep1 = atStep === 'step1';
                            const fnAt = fnStep1 ? Math.round(fnTotal * 0.2) : 0;
                            const docNo = `SS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String((bookingData?.customerPhone || '').replace(/\D/g, '').slice(-4) || '0000')}`;
                            const KV = ({ k, v, b }) => <div className="ss-kv"><span>{k}</span><span className={`num${b ? ' b' : ''}`}>{v}</span></div>;
                            let no = 0;
                            const ItemRow = ({ r, sale, k }) => { no += 1; return (
                                <tr key={k}><td className="c">{no}</td><td className="code">{r.code || '-'}</td><td>{r.g}{r.vendor && !/honda/i.test(r.vendor) ? <span className="muted"> · {r.vendor}</span> : null}</td><td className="c">1</td>
                                    <td className="num">{sale ? formatCurrency(r.price) : ''}</td><td className="num">{sale ? formatCurrency(r.price) : ''}</td>
                                    <td className="num">{sale ? '' : (r.v ? formatCurrency(r.v) : '-')}</td><td className="num">{sale ? '' : (r.v ? formatCurrency(r.v) : '-')}</td></tr>
                            ); };
                            const SubTotal = ({ label, v, sale }) => <tr className="st"><td colSpan={sale ? 5 : 7} className="r">{label}</td><td className="num b">{formatCurrency(v)}</td>{sale ? <><td></td><td></td></> : null}</tr>;
                            const Group = ({ title }) => <tr className="grp"><td></td><td colSpan={7}>{title}</td></tr>;
                            return (
                        <div id="sales-summary-card" className="bg-white w-[1120px] h-auto relative text-black" style={{ padding: '28px 40px', fontFamily: "'Prompt', sans-serif" }}>
                            <style>{`
                                #sales-summary-card { font-size: 12.5px; line-height: 1.38; }
                                #sales-summary-card .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
                                #sales-summary-card .b { font-weight: 700; }
                                #sales-summary-card .muted { color: #555; }
                                #sales-summary-card .box { border: 1px solid #000; }
                                #sales-summary-card .sec { font-size: 13.5px; font-weight: 700; margin: 10px 0 4px; padding-bottom: 2px; border-bottom: 1.5px solid #000; display: flex; justify-content: space-between; align-items: baseline; }
                                #sales-summary-card .info { display: grid; grid-template-columns: 1.25fr 1fr 1fr; column-gap: 18px; }
                                #sales-summary-card .info > div { padding: 1.5px 0; display: flex; gap: 8px; }
                                                                                                #sales-summary-card .info .k { color: #444; white-space: nowrap; min-width: 92px; }
                                #sales-summary-card .info .v { font-weight: 600; overflow-wrap: anywhere; }
                                #sales-summary-card .cols { display: grid; grid-template-columns: 1fr 1fr 1fr; }
                                #sales-summary-card .cols > div { padding: 0 14px; border-right: 1px solid #999; }
                                #sales-summary-card .cols > div:first-child { padding-left: 0; }
                                #sales-summary-card .cols > div:last-child { border-right: 0; padding-right: 0; }
                                #sales-summary-card .cols h4 { font-size: 12px; font-weight: 700; margin: 0 0 2px; text-decoration: underline; }
                                #sales-summary-card .ss-kv { display: flex; justify-content: space-between; gap: 10px; padding: 1px 0; }
                                #sales-summary-card .ss-kv.line { border-top: 1px solid #000; margin-top: 3px; padding-top: 4px; }
                                #sales-summary-card .it { width: 100%; border-collapse: collapse; table-layout: fixed; }
                                #sales-summary-card .it th { background: #e5e5e5; font-weight: 700; padding: 3px 6px; border-top: 1px solid #000; border-bottom: 1px solid #000; text-align: left; font-size: 11.5px; }
                                #sales-summary-card .it td { padding: 1px 6px; vertical-align: top; overflow-wrap: anywhere; }
                                #sales-summary-card .it .c { text-align: center; }
                                #sales-summary-card .it .r { text-align: right; }
                                #sales-summary-card .it .code { font-size: 11.5px; }
                                #sales-summary-card .it .grp td { font-weight: 700; text-decoration: underline; padding-top: 4px; }
                                #sales-summary-card .it .st td { font-weight: 600; }
                                #sales-summary-card .it .st td.num { border-top: 1px solid #000; }
                                #sales-summary-card .it .tot td { font-weight: 800; border-top: 2px solid #000; padding-top: 5px; }
                                #sales-summary-card .stamp { border: 3px double #000; padding: 4px 12px; text-align: center; font-weight: 800; }
                            `}</style>

                            {/* หัวเอกสาร */}
                            <div className="flex justify-between items-start pb-2" style={{ borderBottom: '2px solid #000' }}>
                                <div>
                                    <div style={{ fontSize: 17, fontWeight: 800 }}>{AT_COMPANY[branch] || 'บริษัท เอที ฮอนด้า ออโตโมบิล จำกัด'}</div>
                                    <div style={{ fontSize: 15, fontWeight: 700 }}>ใบสรุปการขาย (ฝ่ายขาย) <span style={{ fontSize: 12, fontWeight: 400 }}>· SALES SUMMARY · เอกสารภายใน ห้ามส่งให้ลูกค้า</span></div>
                                </div>
                                <div className="stamp">
                                    <div style={{ fontSize: 17 }}>ใบสรุปชั่วคราว</div>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>รอผู้จัดการอนุมัติ · ยังใช้เบิกค่าคอมไม่ได้</div>
                                </div>
                            </div>

                            {/* ข้อมูลเอกสาร / ลูกค้า */}
                            <div className="info" style={{ marginTop: 8 }}>
                                <div><span className="k">เลขที่</span><span className="v">{docNo}</span></div>
                                <div><span className="k">วันที่</span><span className="v">{formatThaiDate(new Date())}</span></div>
                                <div><span className="k">วันที่จอง</span><span className="v">{bookingData?.bookingDate ? formatThaiDate(bookingData.bookingDate) : '-'}</span></div>
                                <div><span className="k">ชื่อลูกค้า</span><span className="v">{bookingData?.customerName || customerName || '-'}</span></div>
                                <div><span className="k">โทรศัพท์</span><span className="v">{bookingData?.customerPhone || '-'}</span></div>
                                <div><span className="k">กำหนดรับรถ</span><span className="v">{bookingData?.deliveryMonth && bookingData?.deliveryYear ? `${bookingData.deliveryMonth}/${bookingData.deliveryYear}` : '-'}</span></div>
                                <div><span className="k">ที่ปรึกษาการขาย</span><span className="v">{consultantName || '-'}</span></div>
                                <div><span className="k">ติดต่อ</span><span className="v">{[consultantPhone, consultantLine ? `LINE ${consultantLine}` : ''].filter(Boolean).join(' · ') || '-'}</span></div>
                                <div><span className="k">เลขที่จอง (IDS)</span><span className="v">-</span></div>
                            </div>

                            {/* รถ */}
                            <div className="sec"><span>รายละเอียดรถยนต์</span><span style={{ fontWeight: 400, fontSize: 12 }}>แคมเปญเดือน {cfgMonthText(campaign?.month || AT_ACTIVE.month)}</span></div>
                            <div className="info" style={{ gridTemplateColumns: '1.25fr 1fr 1fr' }}>
                                <div><span className="k">แบบ (รุ่น)</span><span className="v">{uiModelShort(uiModel)} {grade?.name || ''}</span></div>
                                <div><span className="k">สี</span><span className="v">{color?.name || '-'}</span></div>
                                <div><span className="k">เงินจอง</span><span className="v">{getExpenseValue(expenses.deposit) ? `${formatCurrency(expenses.deposit)} บาท` : '-'}</span></div>
                            </div>

                            {/* ราคา / Margin / FOC */}
                            <div className="sec"><span>ราคา · Margin · FOC</span><span style={{ fontWeight: 400, fontSize: 12 }}>หน่วย: บาท</span></div>
                            <div className="cols">
                                <div>
                                    <h4>ราคารถ</h4>
                                    <KV k="ราคา (ตามใบราคา)" v={formatCurrency(carPrice)} />
                                    <KV k="ค่าสี" v={dash(colorPriceVal)} />
                                    <KV k="อัพราคา / ซับดาวน์" v={dash(extraSubDownMargin)} />
                                    <KV k={isCash ? 'ส่วนลดเงินสด' : 'ส่วนลดราคารถ / ดาวน์'} v={cashDisc ? `-${formatCurrency(cashDisc)}` : '-'} />
                                    <div className="ss-kv line"><span className="b">ราคารถขาย (Inv.)</span><span className="num b">{formatCurrency(invPrice - getExpenseValue(expenses.cashDiscount))}</span></div>
                                    <KV k="ขายอุปกรณ์ (ลูกค้าซื้อ)" v={dash(accSold)} />
                                </div>
                                <div>
                                    <h4>Margin</h4>
                                    <KV k={`Margin รถ ${Math.round(atMarginPct * 1000) / 10}%`} v={dash(marginCar3Pct)} />
                                    <KV k="AT แคมเปญ (Step)" v={dash(atStepAmount)} />
                                    <KV k="Honda แคมเปญ (RS Honda)" v={dash(marginCampaign)} />
                                    <KV k="สิทธิพิเศษ Honda" v={dash(privAmount)} />
                                    <KV k="อัพราคา / ซับดาวน์" v={dash(extraSubDownMargin)} />
                                    <KV k="Margin เพิ่มเติม" v={dash(atHondaMargin)} />
                                    <div className="ss-kv line"><span className="b">รวม Margin</span><span className="num b">{formatCurrency(totalMarginSum)}</span></div>
                                </div>
                                <div>
                                    <h4>FOC</h4>
                                    <KV k="รวม Margin" v={formatCurrency(totalMarginSum)} />
                                    <KV k="FOC (Honda)" v={dash(focHonda)} />
                                    <KV k="FOC (Sub)" v={dash(focSub)} />
                                    <KV k="FOC อื่น ๆ" v={dash(focOther)} />
                                    <KV k="FOC ใช้ไป" v={formatCurrency(focUsed)} b />
                                    <div className="ss-kv line" style={{ fontSize: 14 }}><span className="b">Margin คงเหลือ</span><span className="num b">{money(left)}</span></div>
                                </div>
                            </div>

                            {/* เงื่อนไขการซื้อ */}
                            <div className="sec"><span>เงื่อนไขการซื้อ</span></div>
                            <div className="info">
                                <div style={{ gridColumn: 'span 3' }}><span className="k">เงื่อนไข</span><span className="v">{isCash ? 'ซื้อสด' : `จัดไฟแนนซ์ · ${salesSummaryPurchaseText} ${salesSummaryRateText} · ยอดจัด ${formatCurrency(finAmt)} บาท${creditIns ? ` · ประกันคุ้มครองสินเชื่อ ${formatCurrency(creditIns)} บาท (${creditInDown ? 'หักจากเงินดาวน์ · รวมในยอดจัดแล้ว' : 'ลูกค้าชำระวันรับรถ'})` : ''}`}</span></div>
                                <div><span className="k">สถาบันการเงิน</span><span className="v">{salesSummaryFinanceCompany}</span></div>
                                <div><span className="k">ดาวน์</span><span className="v">{isCash ? '-' : `${parseFloat(Number(downPct).toFixed(2))}% · ${formatCurrency(downAmount)} บาท`}</span></div>
                                <div><span className="k">ดอกเบี้ย / งวด</span><span className="v">{isCash ? '-' : `${salesSummaryRateText} · ${salesSummaryTerm} งวด`}</span></div>
                                <div><span className="k">ค่างวด</span><span className="v">{isCash ? '-' : `${creditInDown && financeAmount > 0 && salesSummaryInstallment?.monthly ? `${formatCurrency(Math.round(salesSummaryInstallment.monthly * finAmt / financeAmount))} บาท/เดือน` : salesSummaryMonthlyText} · ${paymentType === 'beginning' ? 'ผ่อนต้นงวด' : 'ผ่อนปลายงวด'}`}</span></div>
                                <div style={{ gridColumn: 'span 2' }}><span className="k">คอม FN</span><span className="v">{isCash ? '-' : !fnPct ? <span style={{ fontWeight: 400 }}>ยังไม่กรอก คอม FN %</span> : !fnRate ? <span>0 <span style={{ fontWeight: 400 }}>(ดอกเบี้ย 0%)</span></span> : <span>{formatCurrency(fnTotal)} บาท <span style={{ fontWeight: 400 }}>({formatCurrency(finAmt)} × {fnRate}% × {fnYears} ปี × {fnPct}%)</span> · เซลล์ได้ 20% (เข้าค่าคอม): {fnStep1 ? `${formatCurrency(fnAt)} บาท` : <span style={{ fontWeight: 400 }}>0 (ไม่ใช่ STEP ช่อง 1)</span>}</span>}</span></div>
                            </div>
                            <div style={{ padding: '1.5px 0' }}><span style={{ color: '#444' }}>รายละเอียดแคมเปญ</span>&nbsp;&nbsp;<b>{campaign?.name || 'ไม่ใช้แคมเปญ Honda'}</b>{!isCash && salesSummaryInstallment?.balloon > 0 ? ` · ชำระก้อนสุดท้าย ${formatCurrency(salesSummaryInstallment.balloon)} บาท` : ''}</div>

                            {/* รายการ */}
                            <div className="sec"><span>รายการอุปกรณ์และของแถม</span></div>
                            <table className="it">
                                <colgroup><col style={{ width: 44 }} /><col style={{ width: 150 }} /><col /><col style={{ width: 44 }} /><col style={{ width: 92 }} /><col style={{ width: 92 }} /><col style={{ width: 92 }} /><col style={{ width: 100 }} /></colgroup>
                                <thead><tr><th className="c">ลำดับ</th><th>รหัส</th><th>คำอธิบาย</th><th className="c">Qty</th><th className="r">ราคา/หน่วย</th><th className="r">จำนวนเงิน</th><th className="r">FOC/หน่วย</th><th className="r">มูลค่า FOC</th></tr></thead>
                                <tbody>
                                    {extraItems.length > 0 && <>
                                        <Group title="ขายอุปกรณ์ (ลูกค้าซื้อเพิ่ม)" />
                                        {extraItems.map((x, i) => ItemRow({ k: 'x' + i, sale: true, r: { g: x.name, code: x.part, price: Number(x.price) || 0 } }))}
                                        <SubTotal sale label="รวมขายอุปกรณ์" v={accSold} />
                                    </>}
                                    {rows.some(r => r.grp === 'honda') && <>
                                        <Group title="แถมอุปกรณ์ Honda" />
                                        {rows.filter(r => r.grp === 'honda').map((r, i) => ItemRow({ k: 'h' + i, r: r }))}
                                        <SubTotal label="รวมมูลค่าแถมอุปกรณ์ Honda" v={focHonda} />
                                    </>}
                                    {rows.some(r => r.grp === 'sub') && <>
                                        <Group title="แถมอุปกรณ์ Sub" />
                                        {rows.filter(r => r.grp === 'sub').map((r, i) => ItemRow({ k: 's' + i, r: r }))}
                                        <SubTotal label="รวมมูลค่าแถมอุปกรณ์ Sub" v={focSub} />
                                    </>}
                                    {others.length > 0 && <>
                                        <Group title="แถมอื่น ๆ" />
                                        {others.map((r, i) => ItemRow({ k: 'o' + i, r: r }))}
                                        <SubTotal label="รวมมูลค่าแถมอื่น ๆ" v={focOther} />
                                    </>}
                                    {rows.some(r => r.grp === 'std') && <tr className="grp"><td></td><td colSpan={7} style={{ textDecoration: 'none' }}><u>บริการมาตรฐาน (ไม่มีทุน)</u> <span style={{ fontWeight: 400 }}>{rows.filter(r => r.grp === 'std').map(r => r.g).join(' · ')}</span></td></tr>}
                                    {!rows.length && !others.length && !extraItems.length && <tr><td colSpan={8} className="c muted" style={{ padding: 10 }}>— ไม่มีรายการ —</td></tr>}
                                    <tr className="tot"><td colSpan={7} className="r">รวมมูลค่า FOC ทั้งหมด</td><td className="num">{formatCurrency(focUsed)}</td></tr>
                                </tbody>
                            </table>

                            {/* ค่าใช้จ่ายวันรับรถ */}
                            <div className="sec"><span>ค่าใช้จ่ายลูกค้าวันรับรถ</span><span style={{ fontWeight: 400, fontSize: 12 }}>รวมชำระ <b style={{ fontSize: 14 }}>{formatCurrency(salesSummaryTotalOnDelivery + (creditIns > 0 && !creditInDown ? creditIns : 0))}</b> บาท</span></div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', columnGap: 22 }}>
                                {[
                                    [isCash ? 'ราคารถ (ซื้อสด)' : 'เงินดาวน์', isCash ? netPrice : downAmount],
                                    ['ค่าเบี้ยประกันภัย', insuranceCosts.customer > 0 ? insuranceCosts.customer : null, insuranceCosts.customer > 0 ? null : (insuranceCosts.freeYears ? `แถม ${insuranceCosts.freeYears} ปี` : (expenses.insurance || '-'))],
                                    ['ค่าจดทะเบียน', registrationPayer === 'dealer' ? null : registrationCosts.customer, registrationPayer === 'dealer' ? 'AT แถม' : null],
                                    ['มัดจำป้ายแดง', getExpenseValue(expenses.redPlate)],
                                    ...(creditIns > 0 && !creditInDown ? [['ประกันคุ้มครองสินเชื่อ', creditIns]] : []),
                                    ['อุปกรณ์ (ลูกค้าซื้อ)', getExpenseValue(expenses.accessories)],
                                    ...(getExpenseValue(expenses.vatDiscount) > 0 ? [['VAT', getExpenseValue(expenses.vatDiscount)]] : []),
                                    ...(getExpenseValue(expenses.othersAdd) > 0 ? [[expenses.othersAddLabel || 'อื่น ๆ', getExpenseValue(expenses.othersAdd)]] : []),
                                    ...(paymentType === 'beginning' && !isCash && !isDSP ? [['ค่างวดงวดแรก', getExpenseValue(expenses.firstInstallment)]] : []),
                                    ['หัก ส่วนลดเงินสด', -getExpenseValue(expenses.cashDiscount)],
                                    ['หัก เงินจอง', -getExpenseValue(expenses.deposit)],
                                    ...(getExpenseValue(expenses.othersDeduct) > 0 ? [['หัก อื่น ๆ', -getExpenseValue(expenses.othersDeduct)]] : [])
                                ].map(([k, v, t]) => <div key={k} className="ss-kv"><span>{k}</span><span className="num">{t || (v ? (v < 0 ? `-${formatCurrency(-v)}` : formatCurrency(v)) : '-')}</span></div>)}
                            </div>

                            {/* ลายเซ็น */}
                            <div className="grid grid-cols-3 gap-8" style={{ marginTop: 30 }}>
                                {[['ที่ปรึกษาการขาย', consultantName], ['ผู้จัดการฝ่ายขาย (อนุมัติ)', ''], ['ผู้บริหาร (อนุมัติ)', '']].map(([t, n]) => (
                                    <div key={t} className="text-center">
                                        <div style={{ borderBottom: '1px dotted #000', height: 36 }}></div>
                                        <div style={{ marginTop: 6 }}>( {n || ' '.repeat(36)} )</div>
                                        <div style={{ fontWeight: 700, marginTop: 2 }}>{t}</div>
                                        <div style={{ marginTop: 2 }}>วันที่ ......../......../........</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ fontSize: 10.5, marginTop: 14, borderTop: '1px solid #000', paddingTop: 4 }}>
                                ใบสรุปชั่วคราวจากหน้าใบเสนอราคา ณ {formatThaiDate(new Date())} · ตัวเลขอาจเปลี่ยนได้จนกว่าผู้จัดการยืนยันในเว็บ AT stock · ใบอนุมัติเบิกค่าคอมออกจากเว็บ AT stock หลังผู้จัดการยืนยันแล้ว · เอกสารภายใน ห้ามส่งให้ลูกค้า
                            </div>
                        </div>
                            );
                        })()}
