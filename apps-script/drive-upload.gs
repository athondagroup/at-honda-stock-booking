/**
 * AT Honda — รับรูปหน้าใบจองจากเว็บ แล้วเก็บเข้า Google Drive โฟลเดอร์เดียวกับที่ Google Form เก็บ
 *
 * ติดตั้ง (ครั้งเดียว) ด้วยบัญชีเจ้าของโฟลเดอร์ (athondagroup@gmail.com):
 * 1. script.google.com → โปรเจกต์ใหม่ → วางโค้ดนี้แทนของเดิม → บันทึก
 * 2. ⚙ การตั้งค่าโปรเจกต์ → พร็อพเพอร์ตีสคริปต์ → เพิ่ม WEB_SECRET = รหัสลับยาว ๆ ที่ตั้งเอง
 * 3. ทำให้ใช้งานได้ → การทำให้ใช้งานได้รายการใหม่ → ประเภท: เว็บแอป
 *    ดำเนินการในฐานะ: ฉัน · ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน → ทำให้ใช้งานได้ → อนุญาตสิทธิ์ → คัดลอก URL เว็บแอป
 * 4. ใส่ URL และ WEB_SECRET ใน Supabase → Edge Functions → Secrets
 *    ชื่อ APPS_SCRIPT_URL และ APPS_SCRIPT_SECRET
 *
 * รูปที่เก็บเป็นไฟล์ส่วนตัวของเจ้าของโฟลเดอร์ (ไม่ได้แชร์ออก) เหมือนรูปที่มาจาก Google Form
 */
var FOLDER_ID = '1K4IRuX7E8o8t8xFY1onH7lfVn65AfJWHrqyc-WD99_yGGtnzljpvlLtq9BTv3C26vla1fPWo'; // โฟลเดอร์ "หน้าใบจอง" ของฟอร์ม

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('WEB_SECRET');
    if (!secret || p.secret !== secret) return json_({ error: 'denied' });
    var blob = Utilities.newBlob(Utilities.base64Decode(p.b64), p.mime || 'image/jpeg', p.name || 'booking.jpg');
    var file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    return json_({ id: file.getId(), url: 'https://drive.google.com/open?id=' + file.getId() });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
