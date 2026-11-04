# ใบเสนอราคา AT Honda (Sale Calculator Pro V.64 v8) — เว็บ

เปิดที่ `<เว็บ AT stock>/quote/` ใช้อีเมลและรหัสผ่านเดียวกับเว็บ AT stock (ตาราง `members`)
- ผู้บริหาร (`exec`) = ผู้ดูแลระบบของใบเสนอราคา: เห็นแท็บ รายงาน และ หลังบ้าน และสลับดูแบบเซลล์ได้
- คนอื่น (เซลล์ แอดมิน ผู้จัดการ): เสนอราคา ตารางดอกเบี้ย เปรียบเทียบ ใบที่บันทึก
- ข้อมูลอยู่ในตาราง `docs`: `qcfg` (หลังบ้าน), `quotes` (ใบที่บันทึก), `qreq` (คำขอผูกบัญชี) — migration `supabase/migrations/20261104_quote.sql`
- ดึงจาก Google Sheet ผ่าน Edge Function `gsheet` (service account ของบริษัท ชีตต้องแชร์ให้ service account)

## ไฟล์
- `quote/index.html` หน้าเว็บที่สร้างแล้ว (React + Tailwind คอมไพล์ล่วงหน้า) · `quote/gate.js` ล็อกอินและตัวเชื่อม Supabase
- `quote/src/` ต้นฉบับ: `src.html` (เครื่องคิดเลขเดิม) + `v4/patch.py` (แก้ทั้งหมด) + `v4/cfg.js` `v4/admin.jsx` `v4/summary.jsx` + `snapshot.json` (ข้อมูลชีตที่ฝัง)

## สร้างใหม่ (ทำในเครื่องที่มี bun และ tailwindcss v4)
1. `python3 v4/patch.py src.html v4.html` แล้วคอมไพล์ JSX ใน `<script type="text/babel">` ด้วย `bun build --no-bundle --jsx-runtime=classic` → `app4.js`
2. `node tw_build.mjs app4.js tw.css && python3 tw_post.py tw.css tw.css`
3. `python3 make_web.py v4.html app4.js ../index.html` (ต้องมี `web/gate.css` ข้างสคริปต์ — คัดลอกจาก `../../web/gate.css`)
(`build_all.sh` คือขั้นตอนเดียวกันที่ใช้ตอนพัฒนา)
