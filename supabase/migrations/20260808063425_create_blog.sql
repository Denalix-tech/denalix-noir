-- Denalix blog: profiles, posts, RLS, and the blog-images storage bucket.
--
-- Authorization model:
--   * Reading a published post is public.
--   * Everything else requires an authenticated user whose profiles.role is
--     'admin'.
--   * The public client is given no way to write to profiles, so a user cannot
--     grant themselves the admin role. Roles are assigned out of band (see
--     README.md).

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  -- No default: granting admin must always be a deliberate, explicit act.
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin')),
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) between 1 and 120
  )
);

comment on table public.profiles is
  'Administrator profiles. A row here is what grants admin access; it is never created by public sign-up.';

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content text not null,
  cover_image_url text,
  cover_image_alt text,
  author_id uuid not null references auth.users (id),
  status text not null default 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint posts_status_check check (status in ('draft', 'published')),
  constraint posts_title_length check (char_length(title) between 1 and 160),
  constraint posts_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint posts_slug_length check (char_length(slug) between 1 and 160),
  constraint posts_excerpt_length check (char_length(excerpt) between 1 and 320),
  constraint posts_content_present check (char_length(btrim(content)) > 0),
  constraint posts_seo_title_length check (
    seo_title is null or char_length(seo_title) <= 60
  ),
  constraint posts_seo_description_length check (
    seo_description is null or char_length(seo_description) <= 160
  ),
  -- A cover image without alt text is an accessibility failure, so the
  -- database refuses the combination outright.
  constraint posts_cover_alt_required check (
    cover_image_url is null
    or (cover_image_alt is not null and char_length(btrim(cover_image_alt)) > 0)
  ),
  -- A published post must carry a publication timestamp.
  constraint posts_published_has_timestamp check (
    status <> 'published' or published_at is not null
  )
);

comment on table public.posts is 'Blog posts. Drafts are readable only by administrators.';

-- Look up a single post by slug (unique constraint already provides an index).
-- List published posts newest first, excluding future-dated ones at query time.
create index if not exists posts_published_at_idx
  on public.posts (published_at desc)
  where status = 'published';

-- Admin list ordering: most recently touched first.
create index if not exists posts_updated_at_idx
  on public.posts (updated_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Admin check
--
-- SECURITY DEFINER so the policy can read profiles without recursing through
-- the profiles RLS policies. search_path is pinned to prevent hijacking.
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
      and p.role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.posts enable row level security;

-- profiles ------------------------------------------------------------------

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles: admins read all" on public.profiles;
create policy "profiles: admins read all"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

-- Deliberately no insert/update/delete policies. With RLS enabled and no
-- permissive write policy, the anon and authenticated roles cannot write to
-- profiles at all, so self-promotion to admin is impossible from the public
-- client. Grant admin via the SQL in README.md.

-- posts ---------------------------------------------------------------------

drop policy if exists "posts: public reads published" on public.posts;
create policy "posts: public reads published"
  on public.posts
  for select
  to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

drop policy if exists "posts: admins read all" on public.posts;
create policy "posts: admins read all"
  on public.posts
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "posts: admins insert" on public.posts;
create policy "posts: admins insert"
  on public.posts
  for insert
  to authenticated
  with check (public.is_admin() and author_id = (select auth.uid()));

drop policy if exists "posts: admins update" on public.posts;
create policy "posts: admins update"
  on public.posts
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "posts: admins delete" on public.posts;
create policy "posts: admins delete"
  on public.posts
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Public author names
--
-- The public post page shows an author display name, but profiles RLS
-- deliberately hides that table from anonymous visitors. Rather than opening
-- profiles up (which would also expose which accounts hold the admin role),
-- this view runs as its owner and exposes exactly two harmless columns.
-- ---------------------------------------------------------------------------

create or replace view public.post_authors
with (security_invoker = false) as
  select id, display_name
  from public.profiles;

comment on view public.post_authors is
  'Read-only, column-limited projection of profiles for public attribution.';

grant select on public.post_authors to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: blog-images
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880, -- 5 MB, mirrored by the application-side check
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "blog-images: public read" on storage.objects;
create policy "blog-images: public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'blog-images');

drop policy if exists "blog-images: admins upload" on storage.objects;
create policy "blog-images: admins upload"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "blog-images: admins update" on storage.objects;
create policy "blog-images: admins update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'blog-images' and public.is_admin())
  with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "blog-images: admins delete" on storage.objects;
create policy "blog-images: admins delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'blog-images' and public.is_admin());
