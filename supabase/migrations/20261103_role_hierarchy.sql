-- Dana Honda role hierarchy migration. Apply in Supabase SQL Editor after reviewing.
-- Keeps existing user IDs and business records intact.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists is_active boolean not null default true;

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('sales','supervisor','super_admin'));

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and is_active = true
  );
$$;

create or replace function public.is_supervisor()
returns boolean language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('supervisor','super_admin') and is_active = true
  );
$$;

-- Only the server-side service-role API may mutate profile roles.
drop policy if exists "supervisor manages profiles" on public.profiles;
drop policy if exists "profiles self or supervisor read" on public.profiles;
create policy "profiles self or management read" on public.profiles for select
using (id = auth.uid() or public.is_supervisor());

-- Remove self-service profile mutation policies if present.
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles delete own" on public.profiles;

-- Existing supervisor-only data policies now include the super admin because
-- public.is_supervisor() recognizes both elevated roles.
-- Promote the known owner account only when that Auth user already exists.
update public.profiles p
set role = 'super_admin', is_active = true, email = 'courageeternell@gmail.com'
from auth.users u
where p.id = u.id
  and lower(u.email) = 'courageeternell@gmail.com';

