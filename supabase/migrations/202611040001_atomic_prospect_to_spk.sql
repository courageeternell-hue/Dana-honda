-- Atomic Prospects -> SPK conversion. Apply only after reviewing on a non-production database.
-- SECURITY INVOKER keeps the caller's RLS policies in force.
create or replace function public.convert_prospect_to_spk(
  p_prospect_id uuid,
  p_spk_date date,
  p_customer_name text,
  p_phone text,
  p_address text default null,
  p_source text default null,
  p_unit_type text default null,
  p_dp_cash text default null,
  p_leasing text default null,
  p_notes text default null,
  p_status text default 'Proses'
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_owner_id uuid;
  v_spk_created boolean;
  v_sales_name text;
  v_spk_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sesi login tidak ditemukan.' using errcode = '42501';
  end if;
  if p_customer_name is null or length(trim(p_customer_name)) < 2 or length(trim(p_customer_name)) > 100
     or p_phone is null or length(trim(p_phone)) < 5 or length(trim(p_phone)) > 30
     or p_unit_type is null or length(trim(p_unit_type)) < 2 or length(trim(p_unit_type)) > 80
     or p_spk_date is null
     or coalesce(p_status, 'Proses') not in ('Jual', 'Proses', 'Indent', 'Tolak', 'Batal')
     or length(coalesce(p_address, '')) > 500
     or length(coalesce(p_source, '')) > 120
     or length(coalesce(p_dp_cash, '')) > 80
     or length(coalesce(p_leasing, '')) > 100
     or length(coalesce(p_notes, '')) > 2000 then
    raise exception 'Data SPK tidak valid atau melebihi batas karakter.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_active = true
  ) then
    raise exception 'Akun tidak aktif.' using errcode = '42501';
  end if;

  select user_id, coalesce(spk_created, false)
    into v_owner_id, v_spk_created
    from public.prospects
    where id = p_prospect_id
    for update;

  if not found then
    raise exception 'Prospek tidak ditemukan atau tidak dapat diakses.' using errcode = 'P0002';
  end if;
  if v_owner_id <> (select auth.uid()) then
    raise exception 'Hanya Sales pemilik prospek yang dapat mengonversinya.' using errcode = '42501';
  end if;
  if v_spk_created then
    raise exception 'Prospek ini sudah pernah dikonversi menjadi SPK.' using errcode = '23505';
  end if;

  select coalesce(full_name, '') into v_sales_name
    from public.profiles where id = (select auth.uid());

  insert into public.spk_records (
    user_id, prospect_id, sales_name, spk_date, customer_name, phone,
    address, source, unit_type, dp_cash, leasing, notes, status
  ) values (
    (select auth.uid()), p_prospect_id, coalesce(nullif(v_sales_name, ''), ''),
    p_spk_date, trim(p_customer_name), trim(p_phone),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_source, '')), ''),
    trim(p_unit_type),
    nullif(trim(coalesce(p_dp_cash, '')), ''),
    nullif(trim(coalesce(p_leasing, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(nullif(trim(p_status), ''), 'Proses')
  ) returning id into v_spk_id;

  update public.prospects
    set spk_created = true, status = 'Deal', deal_status = 'Deal', updated_at = now()
    where id = p_prospect_id;

  return v_spk_id;
end;
$$;

revoke all on function public.convert_prospect_to_spk(uuid,date,text,text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.convert_prospect_to_spk(uuid,date,text,text,text,text,text,text,text,text,text) to authenticated;
