                        {/* Hidden Sales Summary Card — เอกสารทางการ ขาวดำ */}
                        <div id="sales-summary-card" className="bg-white w-[1120px] h-auto relative text-black" style={{ padding: '36px 44px', fontFamily: "'Prompt', sans-serif" }}>
                            <style>{`
                                #sales-summary-card .doc-t { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
                                #sales-summary-card .doc-t td { white-space: normal; overflow-wrap: anywhere; }
                                #sales-summary-card .doc-t th, #sales-summary-card .doc-t td { border: 1px solid #000; padding: 5px 8px; vertical-align: top; }
                                #sales-summary-card .doc-t th { background: #e5e5e5; font-weight: 700; text-align: left; }
                                #sales-summary-card .doc-h { font-size: 14px; font-weight: 700; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 2px solid #000; }
                                #sales-summary-card .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
                            `}</style>
                            <div className="flex justify-between items-start pb-3" style={{ borderBottom: '3px double #000' }}>
                                <div className="flex items-center gap-4">
                                    <div style={{ width: 54, height: 54, border: '2px solid #000', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HondaNextLogo color="#000000" size={36} showWord={false} /></div>
                                    <div>
                                        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.02em' }}>AT HONDA GROUP</div>
                                        <div style={{ fontSize: 13 }}>ผู้จำหน่ายรถยนต์ฮอนด้าอย่างเป็นทางการ</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div style={{ fontSize: 22, fontWeight: 800 }}>ใบสรุปการขาย</div>
                                    <div style={{ fontSize: 12 }}>SALES SUMMARY</div>
                                    <div style={{ fontSize: 11, marginTop: 4, border: '1px solid #000', display: 'inline-block', padding: '1px 8px' }}>เอกสารภายใน · INTERNAL USE ONLY</div>
                                </div>
                            </div>

                            <table className="doc-t" style={{ marginTop: 12 }}>
                                <tbody>
                                    <tr>
                                        <th style={{ width: '16%' }}>เลขที่เอกสาร</th><td style={{ width: '34%' }}>SS-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}-{String((bookingData?.customerPhone || '').replace(/\D/g, '').slice(-4) || '0000')}</td>
                                        <th style={{ width: '16%' }}>วันที่</th><td>{formatThaiDate(new Date())}</td>
                                    </tr>
                                    <tr>
                                        <th>ชื่อลูกค้า</th><td>{bookingData?.customerName || customerName || pendingFileName || '-'}</td>
                                        <th>เบอร์โทรลูกค้า</th><td>{bookingData?.customerPhone || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>ที่ปรึกษาการขาย</th><td>{consultantName || '-'}</td>
                                        <th>ติดต่อ</th><td>{[consultantPhone, consultantLine ? `LINE ${consultantLine}` : ''].filter(Boolean).join(' · ') || '-'}</td>
                                    </tr>
                                    {bookingData?.bookingDate && (
                                        <tr><th>วันที่จอง</th><td>{formatThaiDate(bookingData.bookingDate)}</td><th>แคมเปญเดือน</th><td>{cfgMonthText(campaign?.month || AT_ACTIVE.month)}</td></tr>
                                    )}
                                </tbody>
                            </table>

                            <div className="doc-h">1. รายละเอียดรถยนต์และราคา</div>
                            <table className="doc-t">
                                <tbody>
                                    <tr><th style={{ width: '16%' }}>รุ่น</th><td style={{ width: '34%' }}>{uiModelLabel(uiModel)}</td><th style={{ width: '16%' }}>เกรด</th><td>{grade?.name || '-'}</td></tr>
                                    <tr><th>สี</th><td>{color?.name || '-'}</td><th>แคมเปญ</th><td style={{ fontSize: 12 }}>{campaign?.name || '-'}</td></tr>
                                </tbody>
                            </table>
                            <table className="doc-t" style={{ marginTop: 6 }}>
                                <thead><tr><th>รายการ</th><th className="num" style={{ width: '22%' }}>จำนวนเงิน (บาท)</th></tr></thead>
                                <tbody>
                                    <tr><td>ราคารถ</td><td className="num">{formatCurrency(carPrice)}</td></tr>
                                    <tr><td>ค่าสี</td><td className="num">{formatCurrency(colorPriceVal)}</td></tr>
                                    <tr><td>{priceAdjustment < 0 ? 'ส่วนลดราคารถ' : 'ปรับราคา / ซับดาวน์'}</td><td className="num">{priceAdjustment < 0 ? '-' : ''}{formatCurrency(Math.abs(priceAdjustment))}</td></tr>
                                    <tr><td style={{ fontWeight: 700 }}>ราคาสุทธิ</td><td className="num" style={{ fontWeight: 700 }}>{formatCurrency(netPrice)}</td></tr>
                                </tbody>
                            </table>

                            <div className="doc-h">2. เงื่อนไขการชำระเงิน</div>
                            <table className="doc-t">
                                <tbody>
                                    <tr><th style={{ width: '16%' }}>ประเภทการซื้อ</th><td style={{ width: '34%' }}>{salesSummaryPurchaseText}</td><th style={{ width: '16%' }}>สถาบันการเงิน</th><td>{salesSummaryFinanceCompany}</td></tr>
                                    {!salesSummaryIsCash && <tr><th>เงินดาวน์</th><td>{formatCurrency(downAmount)} บาท ({parseFloat(Number(downPct).toFixed(2))}%)</td><th>ยอดจัดไฟแนนซ์</th><td>{formatCurrency(financeAmount)} บาท</td></tr>}
                                    {!salesSummaryIsCash && <tr><th>จำนวนงวด</th><td>{salesSummaryTerm} งวด ({paymentType === 'beginning' ? 'ผ่อนต้นงวด' : 'ผ่อนปลายงวด'})</td><th>ดอกเบี้ย / ค่างวด</th><td>{salesSummaryRateText} · {salesSummaryMonthlyText}</td></tr>}
                                    {!salesSummaryIsCash && salesSummaryInstallment?.balloon > 0 && <tr><th>ชำระก้อนสุดท้าย</th><td>{formatCurrency(salesSummaryInstallment.balloon)} บาท</td><th>กลุ่มลูกค้า</th><td>{customerType === 'general' ? 'ทั่วไป' : (customerType === 'loyal_15' ? 'First Jobber' : (customerType === 'loyal_30' ? "You're the One" : customerType))}</td></tr>}
                                </tbody>
                            </table>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <div className="doc-h">3. ค่าใช้จ่ายวันรับรถ</div>
                                    <table className="doc-t">
                                        <tbody>
                                            {salesSummaryIsCash && <tr><td>ราคารถยนต์ (ซื้อสด)</td><td className="num">{formatCurrency(netPrice)}</td></tr>}
                                            {!salesSummaryIsCash && <tr><td>เงินดาวน์</td><td className="num">{formatCurrency(downAmount)}</td></tr>}
                                            <tr><td>ค่าเบี้ยประกันภัย</td><td className="num">{insuranceCosts.customer > 0 ? formatCurrency(insuranceCosts.customer) : (expenses.insurance || '-')}</td></tr>
                                            <tr><td>ค่าจดทะเบียน</td><td className="num">{registrationPayer === 'dealer' ? 'เอทีแถม' : formatCurrency(registrationCosts.customer)}</td></tr>
                                            <tr><td>ค่ามัดจำป้ายแดง</td><td className="num">{formatCurrency(expenses.redPlate)}</td></tr>
                                            <tr><td>ค่าอุปกรณ์ตกแต่ง (ลูกค้าซื้อเพิ่ม)</td><td className="num">{formatCurrency(expenses.accessories)}</td></tr>
                                            {getExpenseValue(expenses.vatDiscount) > 0 && <tr><td>VAT</td><td className="num">{formatCurrency(expenses.vatDiscount)}</td></tr>}
                                            {getExpenseValue(expenses.othersAdd) > 0 && <tr><td>{expenses.othersAddLabel || 'อื่นๆ'}</td><td className="num">{formatCurrency(expenses.othersAdd)}</td></tr>}
                                            {paymentType === 'beginning' && !salesSummaryIsCash && !isDSP && <tr><td>ค่างวดงวดแรก</td><td className="num">{formatCurrency(expenses.firstInstallment)}</td></tr>}
                                            <tr><td>หัก ส่วนลดเงินสด</td><td className="num">{docNeg(expenses.cashDiscount)}</td></tr>
                                            <tr><td>หัก มัดจำ</td><td className="num">{docNeg(expenses.deposit)}</td></tr>
                                            {getExpenseValue(expenses.othersDeduct) > 0 && <tr><td>หัก อื่นๆ</td><td className="num">{docNeg(expenses.othersDeduct)}</td></tr>}
                                            <tr><td style={{ fontWeight: 800 }}>รวมชำระวันรับรถ</td><td className="num" style={{ fontWeight: 800 }}>{formatCurrency(salesSummaryTotalOnDelivery)}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div>
                                    <div className="doc-h">4. Margin และ FOC (ภายใน)</div>
                                    <table className="doc-t">
                                        <tbody>
                                            <tr><td>Margin รถ {Math.round(atMarginPct * 1000) / 10}%</td><td className="num">{formatCurrency(marginCar3Pct)}</td></tr>
                                            <tr><td>AT แคมเปญ (Step)</td><td className="num">{formatCurrency(atStepAmount)}</td></tr>
                                            <tr><td>Honda แคมเปญ</td><td className="num">{formatCurrency(marginCampaign)}</td></tr>
                                            <tr><td>สิทธิพิเศษ Honda</td><td className="num">{formatCurrency(privAmount)}</td></tr>
                                            <tr><td>ซับดาวน์ / อัพราคา</td><td className="num">{formatCurrency(extraSubDownMargin)}</td></tr>
                                            <tr><td>Margin เพิ่มเติม</td><td className="num">{formatCurrency(atHondaMargin)}</td></tr>
                                            <tr><td style={{ fontWeight: 700 }}>รวม Margin</td><td className="num" style={{ fontWeight: 700 }}>{formatCurrency(totalMarginSum)}</td></tr>
                                            <tr><td>หัก ส่วนลดให้ลูกค้า</td><td className="num">{docNeg(customerTotalDiscount)}</td></tr>
                                            <tr><td>หัก FOC รวม (ของแถม {formatCurrency(totalGiftValue)} · ประกัน {formatCurrency(effectiveDealerInsuranceCost)} · จดทะเบียน {formatCurrency(effectiveDealerRegistrationCost)})</td><td className="num">{docNeg(totalFocExpense)}</td></tr>
                                            <tr><td style={{ fontWeight: 800 }}>กำไรคงเหลือสุทธิ</td><td className="num" style={{ fontWeight: 800 }}>{remainingMarginProfit < 0 ? '(' + formatCurrency(Math.abs(remainingMarginProfit)) + ')' : formatCurrency(remainingMarginProfit)}</td></tr>
                                        </tbody>
                                    </table>
                                    <table className="doc-t" style={{ marginTop: 6 }}>
                                        <thead><tr><th>ประกันภัยชั้น 1</th><th>ผู้รับผิดชอบ</th><th className="num">เบี้ย (บาท)</th></tr></thead>
                                        <tbody>
                                            {Array.from({ length: insuranceDuration }).map((_, i) => {
                                                const year = i + 1;
                                                const payer = insurancePayers[year] || 'customer';
                                                const premium = (INSURANCE_PREMIUMS[MODEL_MAPPING[uiModel]]?.[insuranceDuration] || [])[i] || 0;
                                                return <tr key={year}><td>ปีที่ {year}</td><td>{payer === 'honda' ? 'ฮอนด้าแถม' : payer === 'dealer' ? 'เอทีแถม' : 'ลูกค้าชำระ'}</td><td className="num">{formatCurrency(premium)}</td></tr>;
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="doc-h">5. รายการของแถม ({totalGiftCount} รายการ)</div>
                            <table className="doc-t">
                                <thead><tr><th style={{ width: 44 }}>ลำดับ</th><th>รายการ</th><th className="num" style={{ width: '18%' }}>ทุน FOC (บาท)</th></tr></thead>
                                <tbody>
                                    {gifts.filter(g => String(g || '').trim()).length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center' }}>— ไม่มีรายการของแถม —</td></tr>}
                                    {gifts.map((g, i) => ({ g, v: giftValues[i] })).filter(x => String(x.g || '').trim()).map((x, n) => (
                                        <tr key={n}><td style={{ textAlign: 'center' }}>{n + 1}</td><td>{x.g}</td><td className="num">{giftAutoKind(x.g) ? 'คิดในประกัน/จดทะเบียน' : formatCurrency(x.v)}</td></tr>
                                    ))}
                                </tbody>
                            </table>

                            {extraItems.length > 0 && (
                                <>
                                    <div className="doc-h">6. อุปกรณ์ที่ลูกค้าซื้อเพิ่ม ({extraItems.length} รายการ)</div>
                                    <table className="doc-t">
                                        <thead><tr><th style={{ width: 44 }}>ลำดับ</th><th>รายการ</th><th style={{ width: '18%' }}>Part No.</th><th className="num" style={{ width: '18%' }}>ราคา (บาท)</th></tr></thead>
                                        <tbody>
                                            {extraItems.map((x, n) => <tr key={n}><td style={{ textAlign: 'center' }}>{n + 1}</td><td>{x.name}</td><td>{x.part || '-'}</td><td className="num">{formatCurrency(x.price)}</td></tr>)}
                                            <tr><td colSpan={3} style={{ fontWeight: 700 }}>รวม</td><td className="num" style={{ fontWeight: 700 }}>{formatCurrency(extraTotal)}</td></tr>
                                        </tbody>
                                    </table>
                                </>
                            )}

                            <div className="grid grid-cols-3 gap-8" style={{ marginTop: 44 }}>
                                {['ที่ปรึกษาการขาย', 'ผู้จัดการฝ่ายขาย', 'ผู้อนุมัติ'].map((t, i) => (
                                    <div key={t} className="text-center" style={{ fontSize: 13 }}>
                                        <div style={{ borderBottom: '1px dotted #000', height: 36 }}></div>
                                        <div style={{ marginTop: 6 }}>( {i === 0 && consultantName ? consultantName : ' '.repeat(36)} )</div>
                                        <div style={{ fontWeight: 700, marginTop: 2 }}>{t}</div>
                                        <div style={{ marginTop: 2 }}>วันที่ ......../......../........</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ fontSize: 11, marginTop: 22, borderTop: '1px solid #000', paddingTop: 6 }}>
                                เอกสารนี้สรุปจากใบเสนอราคา ณ วันที่ {formatThaiDate(new Date())} ใช้ตรวจสอบรายการขาย ค่าใช้จ่ายลูกค้า Margin และ FOC ภายในบริษัท ห้ามส่งให้ลูกค้า
                            </div>
                        </div>
