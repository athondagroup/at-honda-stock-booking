# AT Honda สต็อก จอง และล็อกรถ

เว็บแอปสำหรับ 4 สาขา (PSC ATE SPH KPA): สต็อกรถ Quota ล็อกรถ ใบจอง ขั้นตอนส่งมอบ เป้าการขาย และรายงาน
ติดตั้งบนมือถือได้ (เปิดเว็บแล้วกด "เพิ่มลงหน้าจอโฮม")

## โครงสร้าง
- `src/` โค้ดแอป (ไฟล์ JS แยกส่วน ใช้ร่วมกับเวอร์ชันใน claude.ai)
- `web/` หน้าเข้าสู่ระบบและตัวเชื่อม Supabase (`gate.js`), ไอคอน, PWA
- `supabase/migrations/` ตารางฐานข้อมูลและสิทธิ์ (RLS)
- `supabase/functions/ai-read` AI อ่านรูป (ต้องตั้ง secret `ANTHROPIC_API_KEY`)
- `supabase/functions/gsheet` ดึงใบจองจาก Google Form (ต้องตั้ง secret `GOOGLE_SERVICE_ACCOUNT`)
- `tools/build.sh` สร้าง `dist/index.html` (เว็บ) และ `dist/artifact.html` (claude.ai)

## สร้างและขึ้นเว็บ
push เข้า `main` แล้ว GitHub Actions สร้างและขึ้น GitHub Pages ให้เอง
ทดลองในเครื่อง: `bash tools/build.sh` แล้วเปิด `dist/` ด้วยเว็บเซิร์ฟเวอร์ใดก็ได้

## ข้อมูลและสิทธิ์
- ทุกคนต้องล็อกอิน (Google หรือลิงก์ทางอีเมล) และต้องมีอีเมลในตาราง `members` (ผู้บริหารเพิ่มได้ที่ หลังบ้าน → ผู้ใช้งานเว็บ)
- บทบาทและสาขามาจากตาราง `members` ไม่ได้เลือกเอง
- ข้อมูลอยู่ในตาราง `docs` เปลี่ยนแปลงทุกครั้งเก็บประวัติใน `docs_log` ไม่มีการลบจากแอป
- รูปอยู่ใน Storage bucket `assets` แบบส่วนตัว
