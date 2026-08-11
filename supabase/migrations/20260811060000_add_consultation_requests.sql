-- Consultation requests from the public contact form.
--
-- This reverses a deliberate earlier decision. `src/app/contact/page.tsx` used to
-- say "deliberately no form: this page keeps the existing mailto flow and collects
-- no personal data". A form is now wanted, which means the site starts holding
-- personal data — so the storage is built to keep that footprint small and the
-- access narrow.
--
-- Design notes:
--
--   * **RLS is enabled and anon gets NO policy at all.** Submissions do not go
--     through PostgREST; they go through a Server Action using the service-role
--     key. If anon could insert directly, the honeypot and the length validation
--     would be trivially bypassed by posting straight at the REST endpoint, and
--     the table would be an open write target on a public marketing site.
--   * Admins read and update. Nobody deletes through the app: a request someone
--     sent is archived, not silently dropped.
--   * Length limits are CHECK constraints as well as Zod, so the ceiling holds
--     even if a future caller forgets to validate.
--   * No IP address or user agent is stored. It would be the obvious thing to add
--     for spam forensics, and it is also personal data this business has no
--     stated reason to keep. Add it only with a reason.
--
-- Run after 20260810120000_add_mcp_oauth.sql.

create table if not exists public.consultation_requests (
  id uuid primary key default gen_random_uuid(),

  name text not null check (char_length(trim(name)) between 1 and 120),
  email text not null check (char_length(trim(email)) between 3 and 320),
  -- Optional: asking for a company or phone number should never block a genuine
  -- enquiry from a sole trader who has neither.
  company text check (char_length(company) <= 160),
  phone text check (char_length(phone) <= 40),

  -- The two questions that make a first reply useful rather than "tell us more".
  business_description text not null check (char_length(trim(business_description)) between 10 and 2000),
  help_needed text not null check (char_length(trim(help_needed)) between 10 and 2000),

  status text not null default 'new' check (status in ('new', 'contacted', 'archived')),

  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references public.profiles(id) on delete set null
);

create index if not exists consultation_requests_status_created_idx
  on public.consultation_requests (status, created_at desc);

comment on table public.consultation_requests is
  'Public contact-form submissions. Inserted only by the server (service role); read and triaged by admins.';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.consultation_requests enable row level security;

-- Deliberately no INSERT policy: the only writer is the Server Action, which uses
-- the service-role key and bypasses RLS. Adding an anon INSERT policy here would
-- reopen the direct-to-PostgREST path this design exists to close.
revoke all on public.consultation_requests from anon;

drop policy if exists "consultation_requests: admins read" on public.consultation_requests;
create policy "consultation_requests: admins read"
  on public.consultation_requests
  for select
  to authenticated
  using (public.is_admin());

-- Triage only. The column CHECK constrains status to the three known values, so
-- this cannot be used to write arbitrary state.
drop policy if exists "consultation_requests: admins update" on public.consultation_requests;
create policy "consultation_requests: admins update"
  on public.consultation_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
