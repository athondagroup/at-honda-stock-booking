-- ใบเสนอราคา (Sale Calculator) บนเว็บเดียวกัน ใช้ล็อกอินและตาราง members เดียวกับเว็บ AT stock (4/11/2026)
--   qcfg   ข้อมูลหลังบ้านของใบเสนอราคา (แคมเปญ Margin สิทธิพิเศษ ดอกเบี้ย ค่าจด ประกัน FOC ของแถมใช้บ่อย ที่ปรึกษา ตั้งค่า)
--   quotes ใบเสนอราคาที่บันทึก
--   qreq   คำขอผูกบัญชีที่ปรึกษา (ใช้ใน claude.ai เท่านั้น)
--   qprof  ข้อมูลของฉัน: เบอร์โทร / LINE ที่แต่ละคนใส่เอง (id = user id ของคนนั้น)
alter table public.docs drop constraint docs_col_check;
alter table public.docs add constraint docs_col_check check (col in ('bookings','locks','vehicles','receipts','ids','uploads','ref','qcfg','quotes','qreq','qprof'));
-- ข้อมูลหลังบ้านของใบเสนอราคา: ผู้บริหารเท่านั้นที่เพิ่ม แก้ ลบได้ (คนอื่นอ่านได้อย่างเดียว)
create policy docs_qcfg_insert on public.docs as restrictive for insert to authenticated with check (col <> 'qcfg' or (select public.is_exec()));
create policy docs_qcfg_update on public.docs as restrictive for update to authenticated using (col <> 'qcfg' or (select public.is_exec())) with check (col <> 'qcfg' or (select public.is_exec()));
create policy docs_quote_delete on public.docs for delete to authenticated using (col in ('qcfg','qreq') and (select public.is_exec()));
-- ข้อมูลของฉัน: แก้ได้เฉพาะของตัวเอง (ผู้บริหารแก้ได้ทุกคน) · ทุกคนในระบบอ่านได้ (ผู้ดูแลเห็นเบอร์ของเซลล์)
create policy docs_qprof_insert on public.docs as restrictive for insert to authenticated with check (col <> 'qprof' or id = (select auth.uid())::text or (select public.is_exec()));
create policy docs_qprof_update on public.docs as restrictive for update to authenticated using (col <> 'qprof' or id = (select auth.uid())::text or (select public.is_exec())) with check (col <> 'qprof' or id = (select auth.uid())::text or (select public.is_exec()));
