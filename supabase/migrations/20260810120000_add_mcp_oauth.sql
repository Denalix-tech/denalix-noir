-- OAuth 2.1 authorization-server storage, so an external AI client (ChatGPT)
-- can reach the MCP endpoint at /api/mcp with a scoped bearer token.
--
-- Why these tables exist at all: ChatGPT connectors cannot present a static API
-- key or a custom header — they support OAuth or nothing — and they register
-- themselves via RFC 7591 Dynamic Client Registration, so a hand-created
-- client_id is not an option. That forces a real authorization server.
--
-- Design notes:
--
--   * Tokens are OPAQUE, not JWTs. The authorization server and the resource
--     server are the same deployment sharing this database, so signature
--     verification would buy nothing while adding key management and delaying
--     revocation until expiry. A hash lookup here is instant and revocation is
--     immediate.
--   * Only SHA-256 hashes are stored. A dump of this database does not yield a
--     usable token, the same reason password hashes exist.
--   * RLS is enabled with NO policies on all three tables. That denies anon and
--     authenticated outright; only the service-role key reaches them, which is
--     what the OAuth route handlers use. Do not add a policy here without a
--     specific reason — "no policies" is the intended access model.
--   * Human identity is delegated to Supabase Auth. `user_id` references
--     profiles, so an issued token is always traceable to an admin account that
--     passed the same check as the admin portal.
--
-- Run after 20260809212929_add_post_source.sql.

-- ---------------------------------------------------------------------------
-- Registered clients (RFC 7591 dynamic client registration)
-- ---------------------------------------------------------------------------

create table if not exists public.oauth_clients (
  client_id text primary key,
  client_name text,
  -- Exact-match allowlist. Redirect URIs are never prefix-matched: a prefix
  -- match is how authorization codes get exfiltrated to an attacker's path.
  redirect_uris text[] not null check (array_length(redirect_uris, 1) >= 1),
  grant_types text[] not null default array['authorization_code', 'refresh_token'],
  response_types text[] not null default array['code'],
  -- 'none' means a public client authenticating with PKCE instead of a secret,
  -- which is what ChatGPT is. Confidential clients are not supported.
  token_endpoint_auth_method text not null default 'none'
    check (token_endpoint_auth_method = 'none'),
  scope text,
  client_uri text,
  logo_uri text,
  software_id text,
  software_version text,
  -- The registration document as received, for debugging a client that
  -- misbehaves. Never read back as an authorization input.
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.oauth_clients is
  'OAuth clients registered dynamically (RFC 7591). Public clients only; PKCE is mandatory.';

-- ---------------------------------------------------------------------------
-- Authorization codes
-- ---------------------------------------------------------------------------

create table if not exists public.oauth_authorization_codes (
  code_hash text primary key,
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  -- S256 only. 'plain' is permitted by OAuth 2.0 and forbidden by 2.1, and
  -- accepting it would let a network observer replay an intercepted code.
  code_challenge_method text not null default 'S256'
    check (code_challenge_method = 'S256'),
  scopes text[] not null,
  -- RFC 8707 resource indicator. Bound here so the resulting token cannot be
  -- replayed against a different resource server.
  resource text,
  expires_at timestamptz not null,
  -- Single-use. Set on first exchange; a second attempt must be rejected.
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists oauth_authorization_codes_expires_at_idx
  on public.oauth_authorization_codes (expires_at);

comment on table public.oauth_authorization_codes is
  'Short-lived, single-use authorization codes bound to a PKCE challenge.';

-- ---------------------------------------------------------------------------
-- Access and refresh tokens
-- ---------------------------------------------------------------------------

create table if not exists public.oauth_tokens (
  token_hash text primary key,
  kind text not null check (kind in ('access', 'refresh')),
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scopes text[] not null,
  resource text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  -- Refresh-rotation lineage: the refresh token this one replaced. Lets a
  -- replayed old refresh token be detected and the whole chain revoked.
  parent_hash text,
  created_at timestamptz not null default now()
);

create index if not exists oauth_tokens_user_id_idx on public.oauth_tokens (user_id);
create index if not exists oauth_tokens_client_id_idx on public.oauth_tokens (client_id);
create index if not exists oauth_tokens_expires_at_idx on public.oauth_tokens (expires_at);
create index if not exists oauth_tokens_parent_hash_idx on public.oauth_tokens (parent_hash);

comment on table public.oauth_tokens is
  'Opaque access and refresh tokens, stored as SHA-256 hashes. Never store the token itself.';

-- ---------------------------------------------------------------------------
-- RLS: deny everything except the service role
--
-- Enabling RLS with no policies is the access model, not an oversight. These
-- tables hold credential material and are touched only by the OAuth route
-- handlers, which use the service-role key.
-- ---------------------------------------------------------------------------

alter table public.oauth_clients enable row level security;
alter table public.oauth_authorization_codes enable row level security;
alter table public.oauth_tokens enable row level security;

revoke all on public.oauth_clients from anon, authenticated;
revoke all on public.oauth_authorization_codes from anon, authenticated;
revoke all on public.oauth_tokens from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Housekeeping
--
-- Expired rows are useless but not harmful; nothing depends on this running.
-- Call it from a scheduled job if you want, or ignore it.
-- ---------------------------------------------------------------------------

create or replace function public.purge_expired_oauth_artifacts()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.oauth_authorization_codes
  where expires_at < now() - interval '1 day';

  delete from public.oauth_tokens
  where expires_at < now() - interval '30 days';
end;
$$;

comment on function public.purge_expired_oauth_artifacts is
  'Deletes long-expired authorization codes and tokens. Safe to run at any time.';
