-- AT Honda stock & booking — applied to Supabase project gvdqxuupaqqorbszgliq on 13/10/2026.
-- Records are JSON documents per collection (same shape as the claude.ai prototype).
create table public.members (
  email text primary key check (email = lower(email)),
  name text,
  role text not null check (role in ('sales','admin','aum','nuch','exec')),
  branch text check (branch in ('PSC','ATE','SPH','KPA')),
  sales_name text,
  active boolean not null default true,
  user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.members enable row level security;
create table public.docs (
  col text not null check (col in ('bookings','locks','vehicles','receipts','ids','uploads','ref')),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (col, id)
);
alter table public.docs enable row level security;
create index docs_col_idx on public.docs (col);
create or replace function public.my_member() returns public.members language sql stable security definer set search_path = '' as $$
  select m.* from public.members m where m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.active limit 1 $$;
create or replace function public.is_member() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.active) $$;
create or replace function public.is_exec() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.active and m.role = 'exec') $$;
revoke all on function public.my_member() from public, anon;
revoke all on function public.is_member() from public, anon;
revoke all on function public.is_exec() from public, anon;
grant execute on function public.my_member() to authenticated;
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_exec() to authenticated;
create policy members_read on public.members for select to authenticated using (email = lower(coalesce(auth.jwt() ->> 'email', '')) or (select public.is_member()));
create policy members_exec_insert on public.members for insert to authenticated with check ((select public.is_exec()));
create policy members_exec_update on public.members for update to authenticated using ((select public.is_exec())) with check ((select public.is_exec()));
create policy members_exec_delete on public.members for delete to authenticated using ((select public.is_exec()));
create policy docs_read on public.docs for select to authenticated using ((select public.is_member()));
create policy docs_insert on public.docs for insert to authenticated with check ((select public.is_member()));
create policy docs_update on public.docs for update to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create or replace function public.touch_doc() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;
create trigger docs_touch before insert or update on public.docs for each row execute function public.touch_doc();
create table public.docs_log (seq bigserial primary key, col text not null, id text not null, data jsonb, at timestamptz not null default now(), by uuid);
alter table public.docs_log enable row level security;
create policy docs_log_exec_read on public.docs_log for select to authenticated using ((select public.is_exec()));
create or replace function public.log_doc() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.docs_log (col, id, data, by) values (old.col, old.id, old.data, auth.uid()); return new; end $$;
create trigger docs_log_update after update on public.docs for each row execute function public.log_doc();
alter publication supabase_realtime add table public.docs;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assets', 'assets', false, 20971520, array['image/jpeg','image/png','image/webp','image/gif','application/pdf']);
create policy assets_read on storage.objects for select to authenticated using (bucket_id = 'assets' and (select public.is_member()));
create policy assets_insert on storage.objects for insert to authenticated with check (bucket_id = 'assets' and (select public.is_member()));
insert into public.members (email, name, role) values ('athonda.group@gmail.com', 'AT Honda (ผู้ดูแลระบบ)', 'exec');
-- lock down trigger functions; claim_member links a login to its row
revoke all on function public.log_doc() from public, anon, authenticated;
revoke all on function public.touch_doc() from public, anon, authenticated;
create or replace function public.claim_member() returns void language sql security definer set search_path = '' as $$
  update public.members set user_id = auth.uid(), updated_at = now()
  where email = lower(coalesce(auth.jwt() ->> 'email', '')) and (user_id is null or user_id <> auth.uid()) $$;
revoke all on function public.claim_member() from public, anon;
grant execute on function public.claim_member() to authenticated;
