# Denalix Tech — Website

Marketing site plus a Supabase-backed blog and administrative publishing panel.

Built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS 4.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values below
npm run dev
```

Open <http://localhost:3000>.

The marketing pages render without any configuration. `/blog` and `/admin`
require Supabase; without it, `/blog` shows an empty state and `/admin` shows a
configuration notice rather than crashing.

---

## Blog and admin setup

### 1. Create or connect a Supabase project

Create a project at <https://supabase.com/dashboard>. Any region works; pick the
one closest to your visitors.

### 2. Set environment variables

From **Project Settings → API**, copy the project URL and the **publishable**
key into `.env.local`:

```bash
# Required. Project URL — the bare origin, with no /rest/v1 path.
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Optional. Set in production to emit canonical URLs, Open Graph URLs,
# and a sitemap. Leave blank locally.
NEXT_PUBLIC_SITE_URL=https://denalixtech.com

# Required only for the /admin/people screen. Blog publishing works without it.
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

Find the URL under **Settings → Data API**, and both keys under
**Settings → API Keys**. Set the same variables in your hosting provider's
environment settings for preview and production deployments.

> **The service-role key bypasses every RLS policy.** It must never carry a
> `NEXT_PUBLIC_` prefix — Next.js inlines those into the browser bundle, which
> would expose your entire database. It is used server-side only, for listing
> accounts and generating invite links. Everything else, including role changes,
> runs through the caller's own session under RLS.

### 3. Run the migration

There are two migrations, and they must run **in order**:

| File | What it adds |
| --- | --- |
| `20260808063425_create_blog.sql` | `profiles` and `posts`, constraints, indexes, `updated_at` triggers, RLS policies, the `post_authors` view, and the `blog-images` bucket |
| `20260808182114_add_owner_role.sql` | the `owner` role, `is_owner()`, owner-gated profile writes, and a trigger that refuses to remove the last owner |

Using the Supabase CLI:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Or paste each file into the dashboard SQL editor and run them in filename
order. Select the **entire** file each time — the storage policies sit at the
bottom of the first one and are easy to miss.

Verify before moving on:

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('posts', 'profiles');
```

Two rows means it worked. If the admin area later says "Access denied" for an
account you know you granted, this is the first thing to re-check — a missing
`profiles` table produces exactly that message.

### 4. Verify the storage bucket

The migration creates the `blog-images` bucket. Confirm under **Storage** that
it exists, is marked public, and has a 5 MB size limit. If it is missing,
create it manually with those settings and re-run the storage policy statements
at the bottom of the migration.

### 5. Create the first Auth user

Public sign-up is deliberately not exposed. In the dashboard go to
**Authentication → Users → Add user**, supply an email and password, and
confirm the address.

### 6. Make that user the first owner

This SQL step is needed **once**. After it, everyone else is added from the
app's own People screen — no more SQL.

Creating an Auth user is *not* enough; access comes from a row in `profiles`.

**First, verify you are targeting the right account:**

```sql
select id, email, created_at
from auth.users
where email = 'you@denalixtech.com';
```

Confirm exactly one row comes back and the address is correct. **Then** grant
owner:

```sql
insert into public.profiles (id, display_name, role)
select id, 'Your Name', 'owner'
from auth.users
where email = 'you@denalixtech.com'
on conflict (id) do update
  set role = 'owner',
      display_name = excluded.display_name;
```

If you already know the UUID, the direct form is:

```sql
insert into public.profiles (id, display_name, role)
values ('00000000-0000-0000-0000-000000000000', 'Your Name', 'owner')
on conflict (id) do update
  set role = 'owner',
      display_name = excluded.display_name;
```

Confirm it took — `role` must not be `NULL`:

```sql
select u.email, p.role
from auth.users u
left join public.profiles p on p.id = u.id;
```

> Double-check the email or UUID before running these. Owner is the highest
> level of access: full control over published content *and* over who else can
> get in.

If you already ran the second migration with an `admin` row present, it will
have promoted your earliest profile to `owner` automatically — check the query
above before inserting anything.

### 7. Sign in

Visit <http://localhost:3000/admin/login>. You will be redirected to
`/admin/posts`, where you can create, edit, preview, publish, unpublish, and
delete posts.

For the day-to-day publishing workflow — field limits, what the SEO fields do,
what metadata is generated for you, and the post-publish checks — see
[`docs/features/PUBLISHING_BLOGS.md`](docs/features/PUBLISHING_BLOGS.md).

---

## Managing people

Once you are an owner, go to **/admin/people**. There are two roles:

| Role | Posts | Manage access |
| --- | --- | --- |
| `owner` | full lifecycle | yes |
| `admin` | full lifecycle | no |

**To add someone:** type their email, choose a role, click Invite. This creates
the account and grants the role in one step.

`generateLink` is used rather than `inviteUserByEmail`, so **no email is sent
by the app**. The invite URL is displayed for you to copy and pass on directly.
That is deliberate — it works before SMTP exists, and Supabase's built-in mailer
is heavily rate-limited and unreliable for external domains. Configure custom
SMTP under **Authentication → Emails** if you want Supabase to deliver invites
itself. The link is single-use and expires.

**To change or remove access:** use the role buttons, or Revoke. Revoking
deletes the `profiles` row; the login itself survives, so the person can still
sign in and simply lands on the access-denied page. To remove the login
entirely, delete the user under **Authentication → Users**.

**The last owner cannot be demoted or revoked.** That rule lives in a database
trigger, not just the UI, so it holds through the dashboard, the SQL editor,
and the service-role key alike. Promote a second owner before stepping down.

---

## AI-assisted drafting (blog MCP server)

`mcp/server.ts` is a local [MCP](https://modelcontextprotocol.io) server that gives
Claude Code typed access to the blog. It is registered in `.mcp.json`, so Claude Code
picks it up automatically — **restart Claude Code once** after pulling this change.

**No Anthropic API tokens are consumed.** The reasoning happens in whichever Claude
client drives the server; nothing here calls the API.

### Tools

| Tool | Purpose |
| --- | --- |
| `list_posts` | Existing posts, so a topic or slug isn't duplicated |
| `check_slug` | Format validity + availability, with a suggested fix |
| `get_service_map` | The five service pages, their problems and deliverables |
| `suggest_internal_links` | Which service pages a draft should link to, and why |
| `generate_cover_image` | Renders a 1200×630 brand cover, uploads it, returns URL + alt |
| `create_draft` | Creates a **draft** — validated by the same schema the editor uses |

### The workflow

1. In Claude Code: *"Draft a post about automating patient intake for a healthcare
   client. Check the slug, generate a cover, and create it as a draft."*
2. The draft lands in **`/admin/posts`** with an **AI-assisted** badge.
3. You read it, edit it, and publish. Select several drafts and use
   **Approve & publish** to clear a batch.

**There is deliberately no publish tool.** `create_draft` hard-codes `status: 'draft'`
and the server exposes no way to change it — publishing is a human action, in the
admin, every time. Bulk approval re-runs the same publish preconditions per post, so it
is a convenience over clicking each row, not a looser path.

### About the cover images

Claude has no image model, so these are **not** photographs or diffusion output. They
are real PNGs composed from the site's own design system — noir background, gold
accent, the brand mark, your title — rendered as SVG and rasterised with `sharp`. That
makes them free, instant, consistent, and dependent on no third-party key.

If you later want photographic art, that needs a paid image API (and a new key); the
`generate_cover_image` tool is the seam where it would slot in.

### Security

The server talks to Supabase with the **service-role key**, so it bypasses RLS. It runs
locally over stdio, launched by your editor. **Never deploy it or expose it on a port.**

---

## How authorization works

Authorization is enforced in four independent places, so no single mistake
exposes drafts:

1. **Postgres RLS** — anonymous users can read only posts that are `published`
   with a `published_at` in the past. Writes require a `profiles.role` of
   `admin` or `owner`. Only an owner can write to `profiles` at all.
2. **Server Actions** — every mutation re-checks the session and role before
   touching the database. A Server Action is a public endpoint.
3. **The admin layout** — redirects unauthenticated visitors to the login page
   and shows an explicit access-denied page to authenticated non-admins. The
   People link is hidden from plain admins, but that is cosmetic; the page
   enforces the owner check itself.
4. **The proxy** (`src/proxy.ts`) — refreshes sessions only. It performs no
   authorization and is not a security boundary.

A plain admin has no write path to `profiles`, so an admin cannot promote
themselves to owner. Role changes run through the caller's own session under
RLS — the service-role key is used only to list accounts and mint invite links,
never to change a role.

---

## Commands

```bash
npm run dev      # development server
npm run build    # production build
npm start        # serve the production build
npm run lint     # ESLint
npx tsc --noEmit # type check
```

---

## Known limitations

- **Password reset is not built in.** Reset passwords from the Supabase
  dashboard (**Authentication → Users → … → Reset password**) or enable
  Supabase's email templates. A self-service reset flow is a follow-up.
- **Images are never auto-deleted.** Changing a post's cover image leaves the
  old file in the bucket, because another post may reference it. Clean up
  unused files manually under **Storage**.
- **No automated tests.** The repository has no test runner configured, so the
  pure utilities (`slug`, `reading-time`, `schema`) ship untested. Adding
  Vitest would cover them cheaply.
- **Pagination is not implemented.** `/blog` lists up to 50 posts. The query in
  `src/lib/blog/queries.ts` already accepts `limit`/`offset`.
- **The People screen lists up to 200 accounts** in a single page, which
  assumes a small team. See `PAGE_SIZE` in `src/lib/blog/people.ts`.
- **Invites are not emailed by the app.** You copy the generated link and send
  it yourself unless SMTP is configured in Supabase.
- **Only two roles exist.** There is no author role limited to its own drafts;
  any admin can edit and delete any post.
- **Self-hosted Supabase** needs its storage hostname added to
  `images.remotePatterns` in `next.config.ts`; only `*.supabase.co` is allowed
  by default.

---

## Feature layout

```text
src/app/blog/                     public blog index and post pages
src/app/admin/login/              sign-in (unprotected)
src/app/admin/(dashboard)/        protected admin routes
src/components/blog/              article rendering shared by public + preview
src/components/admin/             editor, list, upload, invite, role controls
src/lib/blog/                     queries, actions, schema, authz, people
src/lib/supabase/                 browser, server, public, proxy, admin clients
src/lib/supabase/admin.ts         service-role client (server-only, RLS bypass)
src/proxy.ts                      session refresh (Next 16 renamed middleware)
supabase/migrations/              schema, constraints, RLS, storage, roles
```
