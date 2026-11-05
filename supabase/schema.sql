-- HONDA SALES REPORT: jalankan di Supabase SQL Editor.
-- Cron memakai service role key di server. JANGAN masukkan service role key ke NEXT_PUBLIC_.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  phone text,
  role text not null default 'sales' check (role in ('sales','supervisor')),
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

create or replace function public.is_supervisor()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='supervisor'); $$;

alter table public.profiles enable row level security;
alter table public.prospects enable row level security;
alter table public.spk_records enable row level security;
alter table public.activity_logs enable row level security;
alter table public.daily_reports enable row level security;
alter table public.sales_targets enable row level security;

create policy "profiles self or supervisor read" on public.profiles for select
using (id=auth.uid() or public.is_supervisor());
create policy "supervisor manages profiles" on public.profiles for all
using (public.is_supervisor()) with check (public.is_supervisor());

create policy "prospects own or supervisor read" on public.prospects for select
using (user_id=auth.uid() or public.is_supervisor());
create policy "prospects insert own" on public.prospects for insert
with check (user_id=auth.uid());
create policy "prospects update own or supervisor" on public.prospects for update
using (user_id=auth.uid() or public.is_supervisor())
with check (user_id=auth.uid() or public.is_supervisor());
create policy "prospects delete own or supervisor" on public.prospects for delete
using (user_id=auth.uid() or public.is_supervisor());

create policy "spk own or supervisor read" on public.spk_records for select
using (user_id=auth.uid() or public.is_supervisor());
create policy "spk insert own" on public.spk_records for insert
with check (user_id=auth.uid());
create policy "spk update own or supervisor" on public.spk_records for update
using (user_id=auth.uid() or public.is_supervisor())
with check (user_id=auth.uid() or public.is_supervisor());
create policy "spk delete own or supervisor" on public.spk_records for delete
using (user_id=auth.uid() or public.is_supervisor());

create policy "logs own or supervisor read" on public.activity_logs for select
using (actor_id=auth.uid() or public.is_supervisor());
create policy "logs insert own" on public.activity_logs for insert
with check (actor_id=auth.uid());
create policy "reports supervisor only" on public.daily_reports for all
using (public.is_supervisor()) with check (public.is_supervisor());
create policy "targets own or supervisor read" on public.sales_targets for select
using (user_id=auth.uid() or public.is_supervisor());
create policy "targets supervisor manage" on public.sales_targets for all
using (public.is_supervisor()) with check (public.is_supervisor());

-- Buat bucket private bernama daily-reports di Storage.
-- Tambahkan profile sales/supervisor secara terkontrol setelah akun Auth dibuat.
-- Untuk mengubah role jadi supervisor, lakukan dari SQL Editor oleh pemilik project:
-- update public.profiles set role='supervisor' where id='UUID-AKUN-ADMIN';


-- Admin and Supervisor profile management uses non-exposed helpers.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and is_active=true); $$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;
create or replace function private.is_manager()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','supervisor') and is_active=true); $$;
revoke all on function private.is_manager() from public, anon;
grant execute on function private.is_manager() to authenticated;
drop policy if exists "admin manages profiles" on public.profiles;
create policy "admin manages profiles" on public.profiles for all to authenticated
using (private.is_admin()) with check (private.is_admin());
drop policy if exists "active managers update profiles" on public.profiles;
create policy "active managers update profiles" on public.profiles for update to authenticated
using (private.is_manager()) with check (private.is_manager());
