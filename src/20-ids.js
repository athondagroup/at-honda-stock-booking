// ------------------------------------------------------------------ IDS export parser (same rules as the web app)
// Columns are found by header name first. When the values under a header do not fit it (data pasted one or more
// columns off), each field is re-found from the data itself: unique patterns (VIN, Ref, booking no., model text,
// colour code, status words) anywhere in the row, dates within 3 columns, everything else only under its own header.
// Every column read this way is listed for the admin to check; a file that still does not fit is rejected.
const IDS = (() => {
  const clean = v => {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[ ​﻿]/g, ' ').replace(/\s+/g, ' ').trim();
  };
  const normH = v => clean(v).toLowerCase();
  const fixY = y => y > 2400 ? y - 543 : y < 100 ? y + 2000 : y;
  const iso = (y, m, d) => {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCMonth() === m - 1 ? dt.toISOString().slice(0, 10) : null;
  };
  const serial = n => (n > 20000 && n < 80000) ? new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 864e5).toISOString().slice(0, 10) : null;
  function date(v) {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date) return isNaN(v) ? null : iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
    if (typeof v === 'number') return serial(v);
    const s = clean(v);
    if (!s) return null;
    let m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
    if (m) return iso(fixY(+m[3]), +m[2], +m[1]);
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return iso(fixY(+m[1]), +m[2], +m[3]);
    if (/^\d+(\.\d+)?$/.test(s)) return serial(parseFloat(s));
    return null;
  }
  function month(v) {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date) { const d = date(v); return d ? d.slice(0, 7) : null; }
    const s = clean(v);
    const m = s.match(/^(\d{1,2})[./](\d{4})$/);
    if (m) { const mo = +m[1], y = fixY(+m[2]); return mo >= 1 && mo <= 12 ? `${y}-${String(mo).padStart(2, '0')}` : null; }
    const d = date(s);
    return d ? d.slice(0, 7) : null;
  }
  const int = v => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return Math.trunc(v);
    const s = clean(v).replace(/,/g, '');
    return /^-?\d+(\.0+)?$/.test(s) ? Math.trunc(parseFloat(s)) : null;
  };
  const findVin = v => (clean(v).toUpperCase().match(/\b([A-HJ-NPR-Z0-9]{17})\b/) || [])[1] || null;
  const findRef = v => (clean(v).toUpperCase().match(/\b([A-Z]{3}\d{2}[1-9OND]\d{4})\b/) || [])[1] || null;
  const isVin = v => VIN_RE.test(clean(v).toUpperCase());
  const BK_NO = /^\d{8,12}$/;
  const isCompany = n => { const s = clean(n).replace(/\s+/g, ' '); return s.includes('เอที ฮอนด้า') || s.includes('เอทีฮอนด้า'); };
  const dealerBr = v => DEALER[clean(v).replace(/\D/g, '').replace(/^0+/, '')] || null;
  // "CITY e:HEV'27 e:HEV RS (RB(Z)) ราคาเดิม" -> model "CITY e:HEV", year 2027, grade "e:HEV RS", body "RB(Z)", note "ราคาเดิม"
  function mto(name) {
    const s = clean(name);
    const out = { model: null, year: null, grade: null, body: null, note: null };
    if (!s) return out;
    const m = s.match(/^(.+?)'(\d{2})\s*(.*)$/);
    if (!m) { out.model = s; return out; }
    out.model = m[1].trim(); out.year = 2000 + +m[2];
    const rest = m[3], p = rest.indexOf('(');
    if (p === -1) { out.grade = rest.trim() || null; return out; }
    out.grade = rest.slice(0, p).trim() || null;
    let depth = 0, end = -1;
    for (let i = p; i < rest.length; i++) {
      if (rest[i] === '(') depth++;
      else if (rest[i] === ')') { depth--; if (!depth) { end = i; break; } }
    }
    if (end === -1) { out.body = rest.slice(p + 1).trim() || null; return out; }
    out.body = rest.slice(p + 1, end).trim() || null;
    out.note = rest.slice(end + 1).trim() || null;
    return out;
  }

  // kind: text | date | int | vin | month | dmonth | dealer
  const SPECS = {
    stock: {
      dealer: ['dealer', ['รหัสผู้จำหน่าย', 'ตัวแทนจำหน่าย', 'dealer code', 'dealer']],
      consign_date: ['date', ['วันที่รถฝากศูนย์']],
      prestock_date: ['date', ['วันที่ pre stock', 'วันที่prestock']],
      stockin_date: ['date', ['วันที่ stock in', 'วันที่stock in']],
      age_days: ['int', ['อายุของสินค้า']],
      model_code: ['text', ['model']],
      mto: ['text', ['mto en name']],
      color: ['text', ['รหัสสี']],
      vin: ['vin', ['หมายเลขตัวถัง']],
      engine_no: ['text', ['หมายเลขตัวเครื่อง']],
      booking_no: ['text', ['เลขที่ใบสั่งจอง']],
      production_date: ['date', ['วันที่ผลิต', 'วันผลิต']],
      customer_name: ['text', ['ชื่อลูกค้า']],
      ref_no: ['text', ['เลขที่ใบสั่งซื้อศูนย์']],
      alloc_date: ['date', ['วันที่จัดสรร']],
      sale_status: ['text', ['รายละเอียดสถานะแจ้งขาย', 'สถานะแจ้งขาย']],
      booking_date: ['date', ['วันที่ใบสั่งจอง']]
    },
    booking: {
      dealer: ['dealer', ['ตัวแทนจำหน่าย', 'รหัสผู้จำหน่าย', 'dealer code']],
      booking_date: ['date', ['วันที่ใบจอง']],
      aging_days: ['int', ['back order aging']],
      booking_no: ['text', ['เลขที่ใบจอง']],
      mto: ['text', ['mto en name']],
      color: ['text', ['รหัสสี']],
      vin_raw: ['text', ['หมายเลขตัวถัง']],
      wholesale_ref: ['text', ['wholesale order']],
      customer_name: ['text', ['ชื่อลูกค้า']],
      alloc_date: ['date', ['วันที่จัดสรร']],
      sales_name: ['text', ['ชื่อที่ปรึกษาขาย']],
      est_first: ['month', ['วันรับรถโดยประมาณครั้งแรก']],
      est_last: ['month', ['วันรับรถโดยประมาณล่าสุด']],
      status_date: ['dmonth', ['วันที่ปรับปรุงสถานะ']],
      status: ['text', ['สถานะใบจอง']]
    },
    quota: {
      status: ['text', ['status']],
      ref_no: ['text', ['ref. number', 'ref number', 'ref no']],
      model: ['text', ['model']],
      grade: ['text', ['grade']],
      color: ['text', ['color']],
      vin_raw: ['text', ['vin number', 'vin no', 'vin']],
      delivery_month: ['month', ['delivery']],
      w1: ['int', ['w1']], w2: ['int', ['w2']], w3: ['int', ['w3']], w4: ['int', ['w4']],
      create_date: ['date', ['create date']],
      ndc_out_date: ['date', ['ndc out date']],
      dealer_stockin_date: ['date', ['dealer stock in date']],
      qty: ['int', ['qty']],
      order_type: ['text', ['order type']],
      ws_order_no: ['text', ['w/sales order no.', 'w/sales order no']]
    },
    invoice: {
      dealer: ['dealer', ['ตัวแทนจำหน่าย', 'รหัสผู้จำหน่าย']],
      booking_date: ['date', ['วันที่ใบจอง']],
      booking_no: ['text', ['เลขที่ใบจอง']],
      invoice_no: ['text', ['เลขที่ใบกำกับภาษี']],
      invoice_date: ['date', ['วันที่ใบกำกับภาษี']],
      delivery_date: ['date', ['วันที่ส่งมอบรถ']],
      mto: ['text', ['mto en name']],
      color: ['text', ['รหัสสี']],
      vin: ['vin', ['หมายเลขตัวถัง']],
      engine_no: ['text', ['หมายเลขตัวเครื่อง']],
      customer_name: ['text', ['ชื่อลูกค้า']],
      sales_name: ['text', ['ชื่อที่ปรึกษาขาย']],
      finance_company: ['text', ['บริษัทไฟแนนซ์']],
      sale_status: ['text', ['สถานะแจ้งขาย']]
    }
  };
  const REQUIRED = {
    stock: ['vin', 'stockin_date', 'mto', 'color'],
    booking: ['booking_no', 'booking_date', 'mto', 'status'],
    quota: ['ref_no', 'model', 'grade', 'color', 'delivery_month'],
    invoice: ['invoice_no', 'vin', 'invoice_date', 'delivery_date']
  };
  const KEY_CHECKED = { stock: ['vin', 'stockin_date'], booking: ['booking_date'], quota: ['delivery_month'], invoice: ['vin', 'invoice_date'] };
  const CHECKED = {
    stock: ['vin', 'consign_date', 'prestock_date', 'stockin_date', 'alloc_date', 'booking_date', 'age_days'],
    booking: ['booking_date', 'alloc_date', 'status_date', 'est_first', 'est_last', 'aging_days'],
    quota: ['delivery_month', 'create_date', 'ndc_out_date', 'dealer_stockin_date'],
    invoice: ['vin', 'booking_date', 'invoice_date', 'delivery_date']
  };
  const KIND_TH = { date: 'วันที่', int: 'ตัวเลข', vin: 'เลขตัวถัง 17 หลัก', month: 'เดือน/ปี', dmonth: 'วันที่' };

  function matchCols(header, src) {
    const spec = SPECS[src], nh = header.map(normH), found = {}, used = new Set();
    for (const [col, [, aliases]] of Object.entries(spec)) {
      for (const a of aliases) {
        const i = nh.findIndex((h, j) => !used.has(j) && h === a);
        if (i >= 0) { found[col] = i; used.add(i); break; }
      }
    }
    // some exports leave the dealer-code header blank in column A
    if (spec.dealer && !('dealer' in found) && !used.has(0)) found.dealer = 0;
    return found;
  }
  function locate(rows) {
    let best = null;
    const better = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (!row || !row.some(x => clean(x))) continue;
      for (const src of Object.keys(SPECS)) {
        const cols = matchCols(row, src);
        const hits = REQUIRED[src].filter(r => r in cols).length;
        const score = [hits === REQUIRED[src].length ? 1 : 0, hits, Object.keys(cols).length];
        if (!best || better(score, best.score)) best = { score, src, hdr: i, cols };
      }
    }
    return best && best.score[0] ? best : null;
  }
  const check = (kind, v) => kind === 'date' ? date(v) !== null : kind === 'int' ? int(v) !== null : kind === 'vin' ? isVin(v)
    : kind === 'month' ? month(v) !== null : kind === 'dmonth' ? (date(v) !== null || month(v) !== null) : true;
  const convert = (kind, v) => kind === 'date' ? date(v) : kind === 'int' ? int(v) : kind === 'vin' ? (clean(v).toUpperCase() || null)
    : kind === 'month' ? month(v) : kind === 'dmonth' ? (date(v) || (month(v) ? month(v) + '-01' : null)) : (clean(v) || null);
  function inferAsof(pairs) {
    const cnt = new Map();
    pairs.forEach(([d, a]) => { if (d && a !== null && a !== undefined && a >= 0 && a < 5000) { const k = addDays(d, a); cnt.set(k, (cnt.get(k) || 0) + 1); } });
    let best = null, n = 0;
    cnt.forEach((v, k) => { if (v > n) { best = k; n = v; } });
    return best && best > todayISO() ? todayISO() : best;
  }
  function branchFromDealer(res, recs) {
    const c = {};
    recs.forEach(r => { const b = dealerBr(r.dealer); if (b) c[b] = (c[b] || 0) + 1; });
    const bs = Object.keys(c);
    if (!bs.length) { res.error = 'ไม่พบรหัสผู้จำหน่ายของสาขา (220 / 1630 / 1350 / 1400) ในคอลัมน์แรก'; return false; }
    if (bs.length > 1) { res.error = `ตารางเดียวมีหลายสาขา (${bs.sort().join(', ')}) กรุณา export แยกสาขา`; return false; }
    res.br = bs[0];
    return true;
  }
  const POST = {
    stock(res, recs) {
      if (!branchFromDealer(res, recs)) return;
      const seen = new Set();
      for (const r of recs) {
        if (!r.vin) continue;
        if (!isVin(r.vin)) { res.warn.push(`ข้ามแถว ${r._n}: '${String(r.vin).slice(0, 30)}' ไม่ใช่เลขตัวถัง 17 หลัก`); continue; }
        if (seen.has(r.vin)) { res.warn.push(`VIN ${r.vin} ซ้ำในตาราง (แถว ${r._n}) ใช้แถวแรก`); continue; }
        seen.add(r.vin);
        const m = mto(r.mto), bn = r.booking_no || '', st = r.sale_status || '';
        res.rows.push({
          vin: r.vin, model: m.model, grade: m.grade, color: (r.color || '').toUpperCase() || null, year: m.year, note: m.note,
          consign: r.consign_date, stockin: r.stockin_date, prod: r.production_date, age_ids: r.age_days,
          ref: r.ref_no ? findRef(r.ref_no) : null, bkno: BK_NO.test(bn) ? bn : null, bknote: bn && !BK_NO.test(bn) ? bn : null,
          cust: r.customer_name, sold: st.startsWith('แจ้งขาย') || date(st) !== null, company: isCompany(r.customer_name),
          alloc: r.alloc_date, bkdate: r.booking_date, engine: r.engine_no
        });
      }
      res.asof = inferAsof(res.rows.map(x => [x.stockin, x.age_ids]));
      if (res.rows.length && !res.rows.some(x => x.prod)) res.note = 'ไฟล์ไม่มีวันผลิต ระบบนับอายุรถจากวันที่รถฝากศูนย์แทน';
    },
    booking(res, recs) {
      if (!branchFromDealer(res, recs)) return;
      const seen = new Set();
      for (const r of recs) {
        const bn = r.booking_no;
        if (!bn) continue;
        if (seen.has(bn)) { res.warn.push(`เลขใบจอง ${bn} ซ้ำในตาราง (แถว ${r._n}) ใช้แถวแรก`); continue; }
        seen.add(bn);
        const m = mto(r.mto), raw = r.vin_raw || '', vin = findVin(raw);
        res.rows.push({
          no: bn, date: r.booking_date, model: m.model, grade: m.grade, color: (r.color || '').toUpperCase() || null, year: m.year,
          sales: r.sales_name, ids: r.status || 'ใหม่', vin, ref: vin ? null : findRef(raw), ws: r.wholesale_ref ? findRef(r.wholesale_ref) : null,
          cust: r.customer_name, alloc: r.alloc_date, aging: r.aging_days, est: r.est_last || r.est_first
        });
      }
      res.asof = inferAsof(res.rows.map(x => [x.date, x.aging]));
    },
    quota(res, recs) {
      const c = {}, seen = new Set();
      for (const r of recs) {
        const ref = findRef(r.ref_no);
        if (!ref) continue;
        if (seen.has(ref)) { res.warn.push(`Ref ${ref} ซ้ำในตาราง (แถว ${r._n}) ใช้แถวแรก`); continue; }
        seen.add(ref);
        c[ref.slice(0, 3)] = (c[ref.slice(0, 3)] || 0) + 1;
        const raw = r.vin_raw || '', vin = findVin(raw);
        // text typed in the VIN column (e.g. "ตั๊ก / ชาคริต" or "PSC") is how branches mark a unit as held today
        const vnote = (vin ? raw.toUpperCase().replace(vin, '') : raw).replace(/^[\s/\-]+|[\s/\-]+$/g, '') || null;
        res.rows.push({
          ref, m: r.delivery_month, model: r.model, grade: r.grade, color: (r.color || '').toUpperCase() || null, vin, vnote,
          qty: r.qty ?? 1, week: [1, 2, 3, 4].find(i => (r['w' + i] || 0) > 0) || null,
          cdate: r.create_date, ndc: r.ndc_out_date, dstock: r.dealer_stockin_date, ws: r.ws_order_no, otype: r.order_type
        });
      }
      if (!res.rows.length) { res.error = 'ไม่พบเลข Ref ของโควต้า (เช่น PSC26O0028) ในคอลัมน์ Ref. Number'; return; }
      const bs = Object.keys(c).filter(b => BR[b]);
      if (!bs.length) { res.error = 'Ref ในตารางไม่ได้ขึ้นต้นด้วย PSC / ATE / SPH / KPA'; return; }
      if (bs.length > 1) { res.error = `ตารางโควต้าเดียวมีหลายสาขา (${bs.sort().join(', ')}) กรุณา export แยกสาขา`; return; }
      res.br = bs[0];
      const noMonth = res.rows.filter(x => !x.m);
      if (noMonth.length) { res.error = `มี ${noMonth.length} แถวที่ไม่มีเดือน Delivery (เช่น Ref ${noMonth[0].ref})`; return; }
      res.months = [...new Set(res.rows.map(x => x.m))].sort();
      res.asof = null;
    },
    invoice(res, recs) {
      if (!branchFromDealer(res, recs)) return;
      const seen = new Set();
      for (const r of recs) {
        const inv = r.invoice_no;
        if (!inv) continue;
        if (!isVin(r.vin || '')) { res.warn.push(`ข้ามแถว ${r._n}: ใบกำกับ ${inv} ไม่มีเลขตัวถังที่ถูกต้อง`); continue; }
        if (seen.has(inv)) { res.warn.push(`เลขใบกำกับ ${inv} ซ้ำในตาราง (แถว ${r._n}) ใช้แถวแรก`); continue; }
        seen.add(inv);
        const m = mto(r.mto);
        res.rows.push({
          inv, idate: r.invoice_date, ddate: r.delivery_date, vin: r.vin, no: r.booking_no, cust: r.customer_name, sales: r.sales_name,
          fin: r.finance_company, company: isCompany(r.customer_name), model: m.model, grade: m.grade, color: (r.color || '').toUpperCase() || null
        });
      }
      const ds = res.rows.flatMap(x => [x.idate, x.ddate]).filter(d => d && d <= todayISO()).sort();
      res.asof = ds.at(-1) || null;
    }
  };

  const STATUS_RX = /รอ|เลื่อน|ยกเลิก|ใหม่|จัดสรร|ส่งมอบ|แจ้งขาย|ยืนยัน|ปกติ|ค้าง/;
  const FIT = {
    dealer: v => !!dealerBr(v),
    vin: v => isVin(v),
    ref: v => !!findRef(v),
    bkno: v => BK_NO.test(clean(v)),
    mto: v => /'\d{2}/.test(clean(v)),
    color: v => /^[A-Z]{2,4}$/.test(clean(v).toUpperCase()),
    engine: v => /^[A-Z0-9]{8,14}$/.test(clean(v).toUpperCase()) && !isVin(v) && !BK_NO.test(clean(v)),
    monthOnly: v => /^\d{1,2}[./]\d{4}$/.test(clean(v)),
    date: v => date(v) !== null,
    month: v => month(v) !== null,
    name: v => { const t = clean(v); return /[ก-๙A-Za-z]{2}/.test(t) && date(v) === null && !STATUS_RX.test(t); },
    bstatus: v => STATUS_RX.test(clean(v)),
    sstatus: v => /แจ้งขาย/.test(clean(v)),
    qstatus: v => /^[A-Z]{1,2}$/.test(clean(v)),
    code: v => /^[A-Z]{2,5}$/.test(clean(v)),
    wsno: v => /^\d{6}$/.test(clean(v)),
    invno: v => /^\d{6,10}$/.test(clean(v)) && !BK_NO.test(clean(v)),
    qty: v => { const n = int(v); return n !== null && n >= 0 && n <= 20; }
  };
  // [validator, how far to look]: 'all' = anywhere in the row, number = that many columns either side, 0 = own column only
  const FIND = {
    stock: { dealer: ['dealer', 'all'], consign_date: ['date', 3], prestock_date: ['date', 3], stockin_date: ['date', 3], mto: ['mto', 'all'], color: ['color', 'all'],
      vin: ['vin', 'all'], engine_no: ['engine', 'all'], production_date: ['date', 3], customer_name: ['name', 2], ref_no: ['ref', 'all'], alloc_date: ['date', 3],
      sale_status: ['sstatus', 'all'], booking_date: ['date', 3] },
    booking: { dealer: ['dealer', 'all'], booking_date: ['date', 3], booking_no: ['bkno', 'all'], mto: ['mto', 'all'], color: ['color', 'all'], wholesale_ref: ['ref', 3],
      customer_name: ['name', 2], alloc_date: ['date', 3], sales_name: ['name', 2], est_first: ['month', 3], est_last: ['month', 3], status_date: ['date', 3], status: ['bstatus', 'all'] },
    quota: { status: ['qstatus', 'all'], ref_no: ['ref', 'all'], color: ['color', 'all'], delivery_month: ['monthOnly', 'all'], create_date: ['date', 3], ndc_out_date: ['date', 3],
      dealer_stockin_date: ['date', 3], order_type: ['code', 3], ws_order_no: ['wsno', 3], qty: ['qty', 0] },
    invoice: { dealer: ['dealer', 'all'], booking_date: ['date', 3], booking_no: ['bkno', 'all'], invoice_no: ['invno', 3], invoice_date: ['date', 3], delivery_date: ['date', 3],
      mto: ['mto', 'all'], color: ['color', 'all'], vin: ['vin', 'all'], engine_no: ['engine', 'all'], customer_name: ['name', 2], sales_name: ['name', 2], sale_status: ['sstatus', 3] }
  };
  // share of filled cells in column j that pass a validator; null when the column is empty
  function fitOf(body, j, fn) {
    let n = 0, ok = 0;
    for (const { r } of body) { const v = r[j]; if (!clean(v)) continue; n++; if (fn(v)) ok++; }
    return n ? ok / n : null;
  }
  function realign(src, cols, body, header) {
    const find = FIND[src], spec = SPECS[src], width = Math.max(header.length, ...body.slice(0, 200).map(x => x.r.length));
    const out = { ...cols }, claimed = new Set(), moved = [], dropped = [];
    const good = (f, j) => { const x = fitOf(body, j, FIT[find[f][0]]); return x !== null && x >= 0.8; };
    const label = f => spec[f][1][0];
    // 1) fields whose own column fits keep it
    for (const f of Object.keys(find)) if (f in cols && good(f, cols[f])) claimed.add(cols[f]);
    const special = src === 'quota' ? ['w1', 'w2', 'w3', 'w4'] : [];
    for (const f of Object.keys(out)) if (!(f in find) && !special.includes(f) && f in cols) claimed.add(cols[f]);   // header-only fields stay where they are
    // 2) misfits look for their data: unique patterns first, then nearby dates and names
    const order = Object.keys(find).filter(f => !(f in cols) || !good(f, cols[f])).sort((a, b) => (find[a][1] === 'all' ? 0 : 1) - (find[b][1] === 'all' ? 0 : 1));
    for (const f of order) {
      const home = f in cols ? cols[f] : null, reach = find[f][1];
      // nothing under this header in any row: leave it empty, unless the field has a pattern unique enough to find anywhere
      if (home !== null && fitOf(body, home, () => true) === null && reach !== 'all') continue;
      const cand = [];
      for (let j = 0; j < width; j++) {
        if (claimed.has(j) || j === home) continue;
        if (reach !== 'all' && (home === null || Math.abs(j - home) > reach)) continue;
        const x = fitOf(body, j, FIT[find[f][0]]);
        if (x !== null && x >= 0.8) cand.push({ j, x, d: home === null ? j : Math.abs(j - home) });
      }
      cand.sort((a, b) => b.x - a.x || a.d - b.d);
      if (cand.length) { out[f] = cand[0].j; claimed.add(cand[0].j); moved.push({ f, from: home, to: cand[0].j }); }
      else if (home !== null) { delete out[f]; dropped.push(f); }
    }
    // 3) quota weeks: four 0/1 columns side by side
    if (src === 'quota') {
      const is01 = v => { const n = int(v); return n === 0 || n === 1; };
      const okW = j => ['w1', 'w2', 'w3', 'w4'].every((w, k) => { const x = fitOf(body, j + k, is01); return x !== null && x === 1; });
      if (!('w1' in cols) || !okW(cols.w1)) {
        const start = [...Array(width).keys()].find(j => okW(j) && ![0, 1, 2, 3].some(k => claimed.has(j + k)));
        ['w1', 'w2', 'w3', 'w4'].forEach((w, k) => { if (start !== undefined) out[w] = start + k; else delete out[w]; });
        moved.push({ f: 'w1', from: cols.w1 ?? null, to: start ?? null });
      }
    }
    const hdr = j => j === null || j === undefined ? '–' : clean(header[j]) || `คอลัมน์ ${j + 1}`;
    const notes = moved.filter(m => m.to !== null).map(m => `'${label(m.f)}' อ่านจากข้อมูลใต้หัว '${hdr(m.to)}'`);
    if (dropped.length) notes.push(`ไม่พบข้อมูลของ ${dropped.map(f => `'${label(f)}'`).join(', ')} ระบบเว้นว่าง`);
    return { cols: out, notes };
  }
  function checkCols(src, cols, body, res) {
    const spec = SPECS[src], problems = [];
    for (const col of CHECKED[src]) {
      if (!(col in cols)) continue;
      const kind = spec[col][0], key = KEY_CHECKED[src].includes(col), label = spec[col][1][0];
      const vals = body.map(({ n, r }) => [n, r[cols[col]]]).filter(([, v]) => clean(v));
      if (!vals.length) continue;
      const bad = vals.filter(([, v]) => !check(kind, v));
      const max = Math.max(1, Math.floor(vals.length * (key ? (kind === 'vin' ? 0.02 : 0.10) : 0.50)));
      if (bad.length > max) problems.push(`คอลัมน์ '${label}' มีค่าที่ไม่ใช่${KIND_TH[kind]} ${bad.length} จาก ${vals.length} แถว (เช่นแถว ${bad[0][0]}: '${clean(bad[0][1]).slice(0, 40)}')`);
      else if (bad.length && !key && res) res.warn.push(`คอลัมน์ '${label}' มี ${bad.length} ค่าที่อ่านไม่ได้ (เช่นแถว ${bad[0][0]}: '${clean(bad[0][1]).slice(0, 30)}') ระบบเว้นว่างไว้`);
    }
    for (const r of REQUIRED[src]) if (!(r in cols)) problems.push(`ไม่พบคอลัมน์ '${spec[r][1][0]}'`);
    return problems;
  }
  function parseSheet(rows, sheet, file) {
    const loc = locate(rows);
    if (!loc) return null;
    const { src, hdr } = loc, spec = SPECS[src];
    const res = { file, sheet, src, br: null, rows: [], warn: [], note: null, error: null, asof: null, months: [] };
    const body = [];
    for (let i = hdr + 1; i < rows.length; i++) { const r = rows[i]; if (r && r.some(x => clean(x))) body.push({ n: i + 1, r }); }
    if (!body.length) { res.error = 'มีแต่หัวตาราง ไม่มีข้อมูล'; return res; }
    let cols = loc.cols;
    let problems = checkCols(src, cols, body, null);
    if (problems.length) {
      // values do not fit their headers: try reading each field from the data instead
      const fixed = realign(src, cols, body, rows[hdr] || []);
      const again = checkCols(src, fixed.cols, body, null);
      if (!again.length) { cols = fixed.cols; problems = []; res.shifted = fixed.notes; res.warn.push('หัวตารางไม่ตรงกับข้อมูล ระบบอ่านตามข้อมูลแทน ตรวจให้แน่ใจก่อนบันทึก: ' + fixed.notes.join(' · ')); }
    }
    if (problems.length) { res.error = 'คอลัมน์ไม่ตรงกับหัวตาราง อาจถูกวางหรือแก้คอลัมน์ผิด: ' + problems.join('; '); return res; }
    checkCols(src, cols, body, res);
    const recs = body.map(({ n, r }) => {
      const d = { _n: n };
      for (const [col, i] of Object.entries(cols)) d[col] = convert(spec[col][0], r[i]);
      return d;
    });
    POST[src](res, recs);
    if (!res.error && !res.rows.length) res.error = 'ไม่พบแถวข้อมูลที่ใช้ได้';
    return res;
  }
  function parseWorkbook(buf, file) {
    const wb = window.XLSX.read(buf, { type: 'array', raw: true, cellDates: false });
    const out = [];
    for (const name of wb.SheetNames) {
      const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: true });
      const r = parseSheet(rows, name, file);
      if (r) out.push(r);
    }
    return out;
  }
  return { clean, date, month, int, findVin, findRef, isVin, mto, dealerBr, isCompany, parseSheet, parseWorkbook };
})();

let xlsxLoading = null;
function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (xlsxLoading) return xlsxLoading;
  xlsxLoading = new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = XLSX_URL; s.async = true;
    s.onload = () => window.XLSX ? ok(window.XLSX) : fail(new Error('xlsx'));
    s.onerror = () => { xlsxLoading = null; fail(new Error('xlsx')); };
    document.head.appendChild(s);
  });
  return xlsxLoading;
}

// ------------------------------------------------------------------ stored IDS tables: one db document per table, rows packed as arrays
const PACK = {
  stock: ['vin', 'model', 'grade', 'color', 'year', 'note', 'consign', 'stockin', 'prod', 'ref', 'bkno', 'bknote', 'cust', 'sold', 'company', 'alloc', 'bkdate', 'engine'],
  booking: ['no', 'date', 'model', 'grade', 'color', 'year', 'sales', 'ids', 'vin', 'ref', 'ws', 'cust', 'alloc', 'aging', 'est'],
  quota: ['ref', 'm', 'model', 'grade', 'color', 'vin', 'vnote', 'qty', 'week', 'cdate', 'ndc', 'dstock', 'ws', 'otype'],
  invoice: ['inv', 'idate', 'ddate', 'vin', 'no', 'cust', 'sales', 'fin', 'company', 'model', 'grade', 'color']
};
const pack = (src, rows) => ({ cols: PACK[src], rows: rows.map(r => PACK[src].map(c => r[c] ?? null)) });
const unpack = doc => !doc || !doc.cols ? [] : doc.rows.map(r => { const o = {}; doc.cols.forEach((c, i) => { o[c] = r[i] ?? null; }); return o; });
const idsDocId = (src, br, m) => src === 'quota' ? `quota_${br}_${m}` : `${src}_${br}`;
const docMeta = d => d ? { asof: d.asof, file: d.file, sheet: d.sheet, at: d.at, by: d.by, role: d.role, n: d.n } : null;

// Current IDS data: uploaded tables where they exist, otherwise the sample snapshot for that branch.
function idsData() {
  const cv = S.idsV + '|' + ((S.ref.get('catalog') || {}).at || '');
  if (S.cache && S.cache.v === cv) return S.cache.d;
  const d = { cars: [], bookings: [], quota: [], inv: [], src: {} };
  const docs = [...S.ids.values()];
  for (const b of BRS) {
    const st = S.ids.get('stock_' + b), bk = S.ids.get('booking_' + b), dl = S.ids.get('invoice_' + b);
    const qs = docs.filter(x => x.src === 'quota' && x.br === b).sort((x, y) => (x.m || '').localeCompare(y.m || ''));
    d.src[b] = { stock: docMeta(st), booking: docMeta(bk), invoice: docMeta(dl), quota: qs.map(q => ({ ...docMeta(q), m: q.m })) };
    if (st) unpack(st).forEach(r => d.cars.push({ ...r, br: b }));
    else SEED.cars.filter(c => c.br === b).forEach(c => d.cars.push({ ...c, seed: true }));
    if (bk) unpack(bk).forEach(r => d.bookings.push({ ...r, br: b }));
    else SEED.bookings.filter(x => x.br === b).forEach(x => d.bookings.push({ ...x, seed: true }));
    if (qs.length) qs.forEach(q => unpack(q).forEach(r => d.quota.push({ ...r, br: b })));
    else SEED.quota.filter(x => x.br === b).forEach(x => d.quota.push({ ...x, seed: true }));
    if (dl) unpack(dl).forEach(r => d.inv.push({ ...r, br: b }));
  }
  CATALOG = buildCatalog([d.cars, d.quota, d.bookings, SEED.cars, SEED.quota, ...catalogLists()]);
  BOOK_CATALOG = buildBookCatalog(d);
  S.cache = { v: cv, d };
  return d;
}
const usingSample = () => { const X = idsData(); return BRS.filter(b => !X.src[b].stock); };
