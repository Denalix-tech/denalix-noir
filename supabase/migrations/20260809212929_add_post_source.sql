-- Records where a draft came from, so an editor can always tell at a glance
-- whether a post was written by hand or produced by the AI-assisted drafting
-- workflow (the blog MCP server).
--
-- This is editorial transparency only. It is never used for access control,
-- and it does not affect what is publicly visible — that remains governed
-- entirely by `status` and `published_at` under RLS.

alter table public.posts
  add column if not exists source text not null default 'human';

alter table public.posts
  drop constraint if exists posts_source_check;

alter table public.posts
  add constraint posts_source_check check (source in ('human', 'ai-assisted'));

comment on column public.posts.source is
  'Provenance of the draft: human | ai-assisted. Editorial metadata only, never an authorization input.';

-- Existing rows keep the 'human' default, which is accurate: every post that
-- predates this column was authored in the admin editor.
