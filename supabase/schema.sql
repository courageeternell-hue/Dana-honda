-- HONDA SALES REPORT: jalankan di Supabase SQL Editor.
-- Cron memakai service role key di server. JANGAN masukkan service role key ke NEXT_PUBLIC_.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  role text not null default 'sales' check (role in ('sales','supervisor','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  prospect_date date not null default current_date,
  customer_name text not null,
  phone text not null,
  source text,
  address text,
  follow_up text,
  lead_response text,
  deal_status text not null default 'Belum',
  status text not null default 'Belum Respon',
  unit_interest text,
  notes text,
  spk_created boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spk_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  prospect_id uuid unique references public.prospects(id),
  spk_date date not null default current_date,
  sales_name text,
  customer_name text not null,
  phone text not null,
  address text,
  source text,
  unit_type text not null,
  dp_cash text,
  leasing text,
  notes text,
  status text not null default 'Proses' check (status in ('Jual','Proses','Indent','Tolak','Batal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid not null,
  actor_id uuid not null references public.profiles(id),
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_reports (
  id bigint generated always as identity primary key,
  report_date date not null unique,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_targets (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id),
  target_month date not null,
  prospect_target integer not null default 0,
  spk_target integer not null default 0,
  unique(user_id,target_month)
);

create index if not exists prospects_user_date_idx on public.prospects(user_id,prospect_date);
create index if not exists spk_user_date_idx on public.spk_records(user_id,spk_date);

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path=public
as $ select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','supervisor') and is_active=true); $;

alter table public.profiles enable row level security;
alter table public.prospects enable row level security;
alter table public.spk_records enable row level security;
alter table public.activity_logs enable row level security;
alter table public.daily_reports enable row level security;
alter table public.sales_targets enable row level security;

drop policy if exists "profiles self or supervisor read" on public.profiles;
create policy "profiles self or manager read" on public.profiles for select
using (id=auth.uid() or public.is_manager());

drop policy if exists "prospects own or supervisor read" on public.prospects;
create policy "prospects own or manager read" on public.prospects for select
using (user_id=auth.uid() or public.is_manager());
create policy "prospects insert own" on public.prospects for insert
with check (user_id=auth.uid());
drop policy if exists "prospects update own or supervisor" on public.prospects;
create policy "prospects update own or manager" on public.prospects for update
using (user_id=auth.uid() or public.is_manager())
with check (user_id=auth.uid() or public.is_manager());
drop policy if exists "prospects delete own or supervisor" on public.prospects;
create policy "prospects delete own or manager" on public.prospects for delete
using (user_id=auth.uid() or public.is_manager());

drop policy if exists "spk own or supervisor read" on public.spk_records;
create policy "spk own or manager read" on public.spk_records for select
using (user_id=auth.uid() or public.is_manager());
create policy "spk insert own" on public.spk_records for insert
with check (user_id=auth.uid());
drop policy if exists "spk update own or supervisor" on public.spk_records;
create policy "spk update own or manager" on public.spk_records for update
using (user_id=auth.uid() or public.is_manager())
with check (user_id=auth.uid() or public.is_manager());
drop policy if exists "spk delete own or supervisor" on public.spk_records;
create policy "spk delete own or manager" on public.spk_records for delete
using (user_id=auth.uid() or public.is_manager());

drop policy if exists "logs own or supervisor read" on public.activity_logs;
create policy "logs own or manager read" on public.activity_logs for select
using (actor_id=auth.uid() or public.is_manager());
create policy "logs insert own" on public.activity_logs for insert
with check (actor_id=auth.uid());
drop policy if exists "reports supervisor only" on public.daily_reports;
create policy "reports manager only" on public.daily_reports for all
using (public.is_manager()) with check (public.is_manager());
drop policy if exists "targets own or supervisor read" on public.sales_targets;
create policy "targets own or manager read" on public.sales_targets for select
using (user_id=auth.uid() or public.is_manager());
drop policy if exists "targets supervisor manage" on public.sales_targets;
create policy "targets manager manage" on public.sales_targets for all
using (public.is_manager()) with check (public.is_manager());

-- Buat bucket private bernama daily-reports di Storage.
-- Tambahkan profile sales/supervisor secara terkontrol setelah akun Auth dibuat.
-- Untuk mengubah role jadi supervisor, lakukan dari SQL Editor oleh pemilik project:
-- update public.profiles set role='supervisor' where id='UUID-AKUN-ADMIN';


-- Admin and Supervisor profile management uses non-exposed helpers.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create or replace function private.is_manager()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','supervisor') and is_active=true); $$;
revoke all on function private.is_manager() from public, anon;
grant execute on function private.is_manager() to authenticated;
revoke update on public.profiles from authenticated;
grant update(phone) on public.profiles to authenticated;
drop policy if exists "admin manages profiles" on public.profiles;
drop policy if exists "active managers update profiles" on public.profiles;
drop policy if exists "active managers read profiles" on public.profiles;
create policy "active managers read profiles" on public.profiles for select to authenticated
using (private.is_manager());
create policy "active managers update profile phone" on public.profiles for update to authenticated
using (private.is_manager()) with check (private.is_manager());


-- Automatically audit every prospect and SPK insert/update/delete.
create or replace function public.log_sales_data_changes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_old jsonb;
  v_new jsonb;
  v_record_id uuid;
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new); v_record_id := new.id; v_action := 'insert';
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old); v_new := to_jsonb(new); v_record_id := new.id; v_action := 'update';
  else
    v_old := to_jsonb(old); v_record_id := old.id; v_action := 'delete';
  end if;
  if v_actor is not null then
    insert into public.activity_logs(table_name, record_id, actor_id, action, old_data, new_data)
    values (tg_table_name, v_record_id, v_actor, v_action, v_old, v_new);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists prospects_audit_changes on public.prospects;
create trigger prospects_audit_changes after insert or update or delete on public.prospects
for each row execute function public.log_sales_data_changes();

drop trigger if exists spk_records_audit_changes on public.spk_records;
create trigger spk_records_audit_changes after insert or update or delete on public.spk_records
for each row execute function public.log_sales_data_changes();
