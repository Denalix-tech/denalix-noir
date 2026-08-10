# Onboard a site to the blog control plane

A repeatable checklist for adding a site you can draft to from Claude Code.
Assumes the target site is Next.js + Supabase, like every site this serves today.

Roughly half a day per site, most of it Supabase setup rather than code.

---

## 0. Decide whose Supabase project it is

For a **client** site, strongly prefer the client's own Supabase organization,
which they own and pay for. Content ownership then follows the website: their
articles live on their infrastructure, and offboarding is handing over a project
rather than extracting rows from a table you control.

Also check the project cap before you start. Supabase's free tier allows only a
small number of active projects per organization and pauses projects after about
a week of inactivity — and a paused project is a dead blog. Do not spread several
production sites across one free organization.

---

## 1. Prepare the site's Supabase project

Run both migrations from this repository against it, **unchanged**, in filename
order:

```bash
npx supabase link --project-ref <their-project-ref>
npx supabase db push
```

| File | What it adds |
| --- | --- |
| `20260808063425_create_blog.sql` | `profiles`, `posts`, constraints, indexes, `updated_at` triggers, RLS, the `post_authors` view, the `blog-images` bucket |
| `20260808182114_add_owner_role.sql` | the `owner` role, `is_owner()`, owner-gated profile writes, last-owner protection |
| `20260809212929_add_post_source.sql` | the `source` column that marks AI-assisted drafts |

No schema changes are needed for multi-site. Each site keeps its own `posts`
table, so the existing per-table `slug unique` constraint is already correct —
two sites may legitimately both have `/blog/getting-started`.

Then, in that project:

1. Create the first Auth user (**Authentication → Users → Add user**).
2. Grant it `owner` in `profiles` — the SQL is in [`../../README.md`](../../README.md) §6.
   **`create_draft` fails without an owner row**, because posts must be attributed
   to a real account.
3. Confirm **Storage → `blog-images`** exists, is public, and caps at 5 MB.

---

## 2. Add credentials

In `.env.local` (gitignored), using the site key uppercased with hyphens as
underscores:

```bash
SITE_<KEY>_SUPABASE_URL=https://<ref>.supabase.co
SITE_<KEY>_SERVICE_ROLE_KEY=sb_secret_...
```

So a site keyed `client-a` reads `SITE_CLIENT_A_SUPABASE_URL` and
`SITE_CLIENT_A_SERVICE_ROLE_KEY`.

> `denalixtech` is the one exception: it carries `legacyEnv: true` and falls back
> to `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, so the original
> `.env.local` keeps working. Do not copy that flag to a new site.

---

## 3. Add the registry entry

In [`../../mcp/sites.config.ts`](../../mcp/sites.config.ts) — committed, so **no
secrets here**:

```ts
{
  key: "client-a",                          // what you say out loud
  name: "Client A",
  origin: "https://www.clienta.com",        // canonical, no trailing slash
  adminOrigin: "https://www.clienta.com",   // where review links point
  brand: CLIENT_A_BRAND,
  linkTargets: clientALinkTargets,
}
```

**Brand tokens** go in a `Brand` object (see [`../../mcp/brand.ts`](../../mcp/brand.ts)
for the shape and `DENALIX_BRAND` for a filled-in example). You need: `ink`,
`foreground`, `muted`, `accent`, `markChip`, `markStroke`, `wordmark`, `domain`,
and `markPath` — an SVG path for the logo glyph drawn against a 24×24 viewport.

**Link targets** are the commercial pages the blog should point at. Each needs a
`url`, `name`, and `terms`; `headline`, `audience`, `problems`, and `deliverables`
are optional but make drafting much better, because `get_link_targets` surfaces
them as topic sources. Build `terms` with the `termsFrom` helper so tokenization
matches how `suggest_internal_links` searches:

```ts
const clientALinkTargets: LinkTarget[] = [
  {
    url: "/services/example",
    name: "Example Service",
    audience: "Who this page is for, in their words.",
    problems: ["A problem they would actually describe this way"],
    deliverables: ["What they get"],
    terms: termsFrom("Example Service", "What they get", "A problem …"),
  },
];
```

Where a site's pages already live in a typed data module in *its* repo, derive
the list from that module instead of retyping it — the way `denalixtech` derives
from `services-data.ts`.

---

## 4. Wire the site's own blog routes

In that site's repository: `/blog`, `/blog/[slug]`, its query layer, metadata,
and JSON-LD. Its design stays its own. [`../specs/blog-admin-spec.md`](../specs/blog-admin-spec.md)
is the full brief; [`../specs/seo-spec.md`](../specs/seo-spec.md) covers the SEO side.

---

## 5. Verify, in this order

```
list_sites                       → the new site appears with the right origin
list_posts        site=<key>     → reads from its database (empty is fine)
check_slug        site=<key>     → resolves, reports availability
get_link_targets  site=<key>     → its pages, not another site's
generate_cover_image site=<key>  → a cover in ITS palette, not Denalix noir/gold
create_draft      site=<key>     → round-trips; reviewUrl points at its admin
```

Then confirm in the browser:

- [ ] The draft appears in **that site's** `/admin/posts` with the AI-assisted badge.
- [ ] `<origin>/blog/<slug>` returns a real **404** while the post is a draft.
- [ ] Publishing it in that admin makes it live, and it appears in that site's sitemap.

Finally, re-run `list_posts` against **every other** site and confirm the new
draft appears in exactly one of them.

---

## Notes

- **No publish tool exists**, on any site. `create_draft` hard-codes
  `status: 'draft'` and `adapters/supabase.ts` exports no publish function.
  Publishing is a human action in each site's own admin, every time.
- **Site keys must be distinct when lowercased.** Resolution folds case, and
  `sites.ts` throws at load if two keys collide — otherwise one key could resolve
  to either of two sites.
- **The server holds every site's service-role key.** It stays local, over stdio.
  Never deploy it.
