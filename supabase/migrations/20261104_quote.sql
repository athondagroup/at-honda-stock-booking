-- ใบเสนอราคา (Sale Calculator) บนเว็บเดียวกัน ใช้ล็อกอินและตาราง members เดียวกับเว็บ AT stock (4/11/2026)
--   qcfg   ข้อมูลหลังบ้านของใบเสนอราคา (แคมเปญ Margin สิทธิพิเศษ ดอกเบี้ย ค่าจด ประกัน FOC ของแถมใช้บ่อย ที่ปรึกษา ตั้งค่า)
--   quotes ใบเสนอราคาที่บันทึก
--   qreq   คำขอผูกบัญชีที่ปรึกษา
alter table public.docs drop constraint docs_col_check;
alter table public.docs add constraint docs_col_check check (col in ('bookings','locks','vehicles','receipts','ids','uploads','ref','qcfg','quotes','qreq'));
-- ข้อมูลหลังบ้านของใบเสนอราคา: ผู้บริหารเท่านั้นที่เพิ่ม แก้ ลบได้ (คนอื่นอ่านได้อย่างเดียว)
create policy docs_qcfg_insert on public.docs as restrictive for insert to authenticated with check (col <> 'qcfg' or (select public.is_exec()));
create policy docs_qcfg_update on public.docs as restrictive for update to authenticated using (col <> 'qcfg' or (select public.is_exec())) with check (col <> 'qcfg' or (select public.is_exec()));
create policy docs_quote_delete on public.docs for delete to authenticated using (col in ('qcfg','qreq') and (select public.is_exec()));
