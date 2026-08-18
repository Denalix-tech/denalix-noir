-- Remembers a post's previous addresses so a rename can redirect rather than 404.
--
-- Renaming a published post used to discard whatever ranking and inbound links
-- the old URL had earned, silently and permanently — the worst kind of SEO
-- failure, because nothing reports it. The old address simply started returning
-- 404 and the traffic stopped.
--
-- Recorded by a trigger rather than by application code, so a slug changed by any
-- route — the editor, a Server Action, the MCP server, or a hand-written SQL
-- statement — is captured. A history that depended on the app remembering to
-- write it would be empty exactly when someone edited the database directly.

create table if not exists public.post_slug_history (
  -- The old address is the lookup key, so it must be unique across all posts:
  -- two posts cannot both claim to have previously lived at the same URL.
  old_slug text primary key check (old_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists post_slug_history_post_id_idx
  on public.post_slug_history (post_id);

comment on table public.post_slug_history is
  'Previous slugs, so a renamed post 301s from its old URL instead of 404ing.';

-- ---------------------------------------------------------------------------
-- Capture renames
-- ---------------------------------------------------------------------------

create or replace function public.record_post_slug_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.slug is distinct from old.slug then
    -- If the old slug was itself a redirect target, repoint it at this post so a
    -- chain of renames stays one hop: a -> b -> c must send a straight to c.
    insert into public.post_slug_history (old_slug, post_id)
    values (old.slug, new.id)
    on conflict (old_slug) do update set post_id = excluded.post_id;

    update public.post_slug_history
       set post_id = new.id
     where post_id = new.id;

    -- A slug being reused by the post that now owns it is not a redirect.
    delete from public.post_slug_history where old_slug = new.slug;
  end if;

  return new;
end;
$$;

drop trigger if exists posts_record_slug_change on public.posts;
create trigger posts_record_slug_change
  after update of slug on public.posts
  for each row
  execute function public.record_post_slug_change();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Readable by everyone: resolving a redirect happens on a public page request,
-- before any session exists. The table holds no secrets — only the fact that one
-- public URL used to point at another.
-- ---------------------------------------------------------------------------

alter table public.post_slug_history enable row level security;

drop policy if exists "post_slug_history: public read" on public.post_slug_history;
create policy "post_slug_history: public read"
  on public.post_slug_history
  for select
  to anon, authenticated
  using (true);

-- Writes come from the trigger, which runs as its definer. Admins may also clear
-- an entry by hand if a slug needs to be freed for reuse.
drop policy if exists "post_slug_history: admins write" on public.post_slug_history;
create policy "post_slug_history: admins write"
  on public.post_slug_history
  for delete
  to authenticated
  using (public.is_admin());
