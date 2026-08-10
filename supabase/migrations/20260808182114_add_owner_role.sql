-- Adds a two-tier role model so administrators can be managed from the app.
--
--   owner  — full post lifecycle, plus granting and revoking access
--   admin  — full post lifecycle only
--
-- Run this after 20260808063425_create_blog.sql.

-- ---------------------------------------------------------------------------
-- Widen the allowed roles
-- ---------------------------------------------------------------------------

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- Role predicates
--
-- is_admin() intentionally covers owners too: an owner can do everything an
-- admin can. Post policies keep calling is_admin() and need no changes.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'owner'
  );
$$;

revoke execute on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

-- ---------------------------------------------------------------------------
-- Bootstrap: make sure an owner exists
--
-- Without this, an existing single-admin install would have nobody able to
-- reach the people screen. Promotes the earliest profile only when no owner
-- exists yet; re-running is a no-op.
-- ---------------------------------------------------------------------------

update public.profiles
set role = 'owner'
where id = (
  select id from public.profiles order by created_at asc limit 1
)
and not exists (select 1 from public.profiles where role = 'owner');

-- ---------------------------------------------------------------------------
-- Owners may manage profiles through the normal authenticated client
--
-- Role changes therefore stay under RLS rather than relying on the
-- service-role key. Plain admins still have no write path, so they cannot
-- promote themselves.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles: owners insert" on public.profiles;
create policy "profiles: owners insert"
  on public.profiles
  for insert
  to authenticated
  with check (public.is_owner());

drop policy if exists "profiles: owners update" on public.profiles;
create policy "profiles: owners update"
  on public.profiles
  for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists "profiles: owners delete" on public.profiles;
create policy "profiles: owners delete"
  on public.profiles
  for delete
  to authenticated
  using (public.is_owner());

-- ---------------------------------------------------------------------------
-- Never allow the last owner to be removed
--
-- Enforced in the database rather than the UI, so it also holds for the
-- dashboard, the SQL editor, and the service-role key.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  remaining_owners integer;
begin
  if tg_op = 'UPDATE' then
    -- Only demotions of an owner are interesting.
    if old.role <> 'owner' or new.role = 'owner' then
      return new;
    end if;
  elsif tg_op = 'DELETE' then
    if old.role <> 'owner' then
      return old;
    end if;
  end if;

  -- The row being changed still counts as an owner at BEFORE time.
  select count(*) into remaining_owners
  from public.profiles
  where role = 'owner';

  if remaining_owners <= 1 then
    raise exception 'Cannot remove the last owner.'
      using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_last_owner on public.profiles;
create trigger profiles_protect_last_owner
  before update or delete on public.profiles
  for each row execute function public.prevent_last_owner_removal();
