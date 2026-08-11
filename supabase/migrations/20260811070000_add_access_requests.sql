-- Requests for admin access, reviewed by a superadmin.
--
-- Replaces the invite-code sign-up, which asked a stranger to choose a password
-- and create an auth account *before* anyone had agreed to give them access. That
-- left half-formed accounts lying around and put the password step in the wrong
-- place. The order is now: ask (email only) → a superadmin approves → the person
-- sets their own password via an invite link.
--
-- Nothing here creates an auth user. The row is a request, not an account, so a
-- declined request leaves no login behind.
--
-- Design notes:
--
--   * RLS on, and **no policy for anon**. Requests arrive through a Server Action
--     using the service role, so the validation cannot be skipped by posting at
--     PostgREST — the same reasoning as consultation_requests.
--   * One pending request per address, enforced by a partial unique index rather
--     than application code, so a refresh-spammer cannot fill the table.
--   * No password column, ever. The password is set by the person themselves
--     against Supabase Auth after approval, and never passes through this table.
--
-- Run after 20260811060000_add_consultation_requests.sql.

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),

  email text not null check (char_length(trim(email)) between 3 and 320),
  name text check (char_length(name) <= 120),
  -- Why they need access. Optional: a colleague forwarding a link should not be
  -- blocked on writing a justification, but it is the field that makes a
  -- superadmin's decision possible without a separate conversation.
  reason text check (char_length(reason) <= 1000),

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),

  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

-- One open request per address. Approved and declined rows are kept as history,
-- so this only constrains what is currently awaiting a decision.
create unique index if not exists access_requests_one_pending_per_email
  on public.access_requests (lower(trim(email)))
  where status = 'pending';

create index if not exists access_requests_status_requested_idx
  on public.access_requests (status, requested_at desc);

comment on table public.access_requests is
  'Admin-access requests from /admin/signup. Inserted by the server; reviewed by superadmins. Holds no credentials.';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.access_requests enable row level security;

revoke all on public.access_requests from anon;

-- Admins may read, so a plain admin can see the queue and tell a colleague it
-- arrived. Only owners act on it.
drop policy if exists "access_requests: admins read" on public.access_requests;
create policy "access_requests: admins read"
  on public.access_requests
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "access_requests: owners update" on public.access_requests;
create policy "access_requests: owners update"
  on public.access_requests
  for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());
