-- Dana Honda role hierarchy and team-scoped access migration.
-- Existing Auth IDs and business records are preserved.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles add column if not exists supervisor_id uuid references public.profiles(id) on delete set null;
create index if not exists profiles_supervisor_id_idx on public.profiles(supervisor_id);

do $$
declare c record;
begin
  for c in select conname from pg_constraint
    where conrelid='public.profiles'::regclass and contype='c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop execute format('alter table public.profiles drop constraint %I', c.conname); end loop;
end $$;
alter table public.profiles add constraint profiles_role_check check (role in ('sales','supervisor','super_admin'));

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='super_admin' and is_active=true); $$;

create or replace function public.is_supervisor()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('supervisor','super_admin') and is_active=true); $$;

drop policy if exists "supervisor manages profiles" on public.profiles;
drop policy if exists "active supervisor manages profiles" on public.profiles;
drop policy if exists "profiles self or supervisor read" on public.profiles;
drop policy if exists "profiles self or active supervisor read" on public.profiles;
drop policy if exists "profiles self or management read" on public.profiles;
drop policy if exists "profiles hierarchy read" on public.profiles;
create policy "profiles hierarchy read" on public.profiles for select
using (id=auth.uid() or public.is_super_admin() or (role='sales' and supervisor_id=auth.uid() and public.is_supervisor()));

drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles delete own" on public.profiles;

update public.profiles p set role='super_admin', is_active=true, email='courageeternell@gmail.com'
from auth.users u where p.id=u.id and lower(u.email)='courageeternell@gmail.com';

create or replace function public.can_access_sales_data(target_user_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
 select auth.uid() is not null and exists (
   select 1 from public.profiles me where me.id=auth.uid() and me.is_active=true and (
     me.role='super_admin' or me.id=target_user_id or (
       me.role='supervisor' and exists (
         select 1 from public.profiles sales where sales.id=target_user_id
           and sales.role='sales' and sales.supervisor_id=me.id
       )
     )
   )
 );
$$;
revoke all on function public.can_access_sales_data(uuid) from public, anon;
grant execute on function public.can_access_sales_data(uuid) to authenticated;

-- SECURITY DEFINER helpers must not be callable by anonymous/public roles.
revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.is_supervisor() from public, anon;
revoke all on function public.is_active_user() from public, anon;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_supervisor() to authenticated;
grant execute on function public.is_active_user() to authenticated;

drop policy if exists "active users delete permitted prospects" on public.prospects;
drop policy if exists "active users read permitted prospects" on public.prospects;
drop policy if exists "active users update permitted prospects" on public.prospects;
drop policy if exists "hierarchy read prospects" on public.prospects;
drop policy if exists "hierarchy update prospects" on public.prospects;
drop policy if exists "hierarchy delete prospects" on public.prospects;
create policy "hierarchy read prospects" on public.prospects for select using (public.can_access_sales_data(user_id));
create policy "hierarchy update prospects" on public.prospects for update using (public.can_access_sales_data(user_id)) with check (public.can_access_sales_data(user_id));
create policy "hierarchy delete prospects" on public.prospects for delete using (public.can_access_sales_data(user_id));

drop policy if exists "active users delete permitted spk" on public.spk_records;
drop policy if exists "active users read permitted spk" on public.spk_records;
drop policy if exists "active users update permitted spk" on public.spk_records;
drop policy if exists "hierarchy read spk" on public.spk_records;
drop policy if exists "hierarchy update spk" on public.spk_records;
drop policy if exists "hierarchy delete spk" on public.spk_records;
create policy "hierarchy read spk" on public.spk_records for select using (public.can_access_sales_data(user_id));
create policy "hierarchy update spk" on public.spk_records for update using (public.can_access_sales_data(user_id)) with check (public.can_access_sales_data(user_id));
create policy "hierarchy delete spk" on public.spk_records for delete using (public.can_access_sales_data(user_id));

drop policy if exists "active users read permitted activity logs" on public.activity_logs;
drop policy if exists "hierarchy read activity logs" on public.activity_logs;
create policy "hierarchy read activity logs" on public.activity_logs for select
using (public.can_access_sales_data(actor_id));
