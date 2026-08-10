# Publishing SEO-optimized blog posts

How to get a post live on <https://www.denalixtech.com/blog>, how to write one
that can actually rank, which parts of that are automated, and what to watch out
for.

**Keep this file current.** It describes real behavior in real files, not
intentions. Every claim is tied to a source file in
[§10 Where each behavior lives](#10-where-each-behavior-lives). When any of those
files change, update this document in the same commit.

**Scope:** this covers publishing to `denalixtech.com`, the one site the system
serves today. Extending it to multiple sites — including client sites — is planned
work, specified in [`MULTI_SITE_PLAN.md`](MULTI_SITE_PLAN.md). Nothing in that plan
is built yet, so everything below is accurate as written.

---

## Contents

1. [Before you can publish](#1-before-you-can-publish)
2. [Path A — publish from the admin panel](#2-path-a--publish-from-the-admin-panel)
3. [Path B — draft with Claude Code, publish yourself](#3-path-b--draft-with-claude-code-publish-yourself)
4. [The fields, and what each one does for SEO](#4-the-fields-and-what-each-one-does-for-seo)
5. [The SEO writing playbook](#5-the-seo-writing-playbook)
6. [SEO you get automatically — do not hand-roll it](#6-seo-you-get-automatically--do-not-hand-roll-it)
7. [What is automated, and what is not](#7-what-is-automated-and-what-is-not)
8. [Things to keep in mind](#8-things-to-keep-in-mind)
9. [After publishing: verify in five minutes](#9-after-publishing-verify-in-five-minutes)
10. [Where each behavior lives](#10-where-each-behavior-lives)
11. [Editing, unpublishing, deleting](#11-editing-unpublishing-deleting)
12. [Known gaps](#12-known-gaps)

---

## 1. Before you can publish

One-time setup, covered step by step in [`README.md`](../../README.md) under
"Blog and admin setup". In short:

| Requirement | Why |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` | Without them `/blog` shows an empty state and `/admin` shows a configuration notice |
| Both migrations run, in filename order | Creates `posts`, `profiles`, RLS, the `blog-images` bucket |
| An Auth user **plus** a `profiles` row with `role` of `owner` or `admin` | An Auth user alone gets the access-denied page — access comes from the profile row |
| `SUPABASE_SERVICE_ROLE_KEY` | Only needed for `/admin/people` and the MCP server. Publishing works without it |

Then `npm run dev` and sign in at <http://localhost:3000/admin/login>.

> Creating an account is deliberately not self-service. Add people from
> `/admin/people` once you are an owner — not with SQL.

---

## 2. Path A — publish from the admin panel

The full lifecycle lives at `/admin/posts`.

1. **`/admin/posts` → New post.** The editor is a split Markdown pane with live
   preview.
2. **Type the title.** The slug is generated from it automatically for a new
   post. Editing the title later never silently rewrites an existing slug.
3. **Fill every field in [§4](#4-the-fields-and-what-each-one-does-for-seo).**
   Excerpt and SEO fields show a live character count against their limit.
4. **Save draft.** Nothing is public yet — a draft returns a real 404 to the
   world, not a soft-hidden page.
5. **Preview** at `/admin/posts/<id>/preview`. This renders through the exact
   same `PostArticle` component as the live page, so preview and production
   cannot drift apart.
6. **Publish.** The post appears at `/blog/<slug>` and in `/blog`.

**Publish is blocked** unless title, slug, excerpt, and content are all
non-empty, and — if a cover image is set — alt text is filled in. The same
preconditions are re-checked server-side on every path, including bulk publish,
so there is no looser route through.

`published_at` is stamped on the **first** publish only. Editing a live post, or
unpublishing and republishing it, keeps the original date — your articles won't
appear to have been written today.

---

## 3. Path B — draft with Claude Code, publish yourself

`mcp/server.ts` is a local MCP server registered in `.mcp.json`, so Claude Code
picks it up automatically. **Restart Claude Code once** after pulling it in.

Ask in plain language, for example:

> Draft a post on cutting manual data entry in a construction back office.
> Check the slug first, suggest internal links, generate a cover image, and
> create it as a draft.

Six tools back that:

| Tool | What it does for you |
| --- | --- |
| `list_posts` | Existing posts + slugs, so you don't duplicate a topic |
| `check_slug` | Format validity and availability, with a corrected suggestion |
| `get_service_map` | The five service pages, their audiences, problems and deliverables |
| `suggest_internal_links` | Which service pages a draft should link to, and the phrase that motivates each |
| `generate_cover_image` | Renders a 1200×630 brand cover, uploads it, returns URL + alt text |
| `create_draft` | Creates a **draft**, validated by the same schema the editor uses |

**There is no publish tool, on purpose.** `create_draft` hard-codes
`status: 'draft'` and nothing in the server can change it. AI-assisted drafts
land in `/admin/posts` carrying an **AI-assisted** badge; you read, edit, and
publish. Select several and use **Approve & publish** to clear a batch — that
re-runs the same per-post preconditions, so it's a convenience over clicking
each row, not a shortcut around review.

Two things to know:

- **Cover images are composed, not generated.** Real PNGs built from the site's
  own design system — noir background, gold rule, brand mark, your title —
  rendered as SVG and rasterised with `sharp`. Free, instant, on-brand, no
  third-party key. Not photography. If you ever want photographic art, that
  needs a paid image API, and `generate_cover_image` is the seam it slots into.
- **The server uses the service-role key and bypasses RLS.** It runs locally
  over stdio, launched by your editor. Never deploy it or expose it on a port.

---

## 4. The fields, and what each one does for SEO

Limits are enforced three times — in the browser, in the Server Action, and as
Postgres CHECK constraints. They are not suggestions.

| Field | Limit | Required | SEO role |
| --- | --- | --- | --- |
| **Title** | 160 chars | yes | Rendered as the page's only `<h1>`, and the `headline` in JSON-LD. Front-load the phrase someone would actually search |
| **Slug** | 160 chars, `^[a-z0-9]+(?:-[a-z0-9]+)*$` | yes | The URL. 3–6 meaningful words. No dates, no stop words. **Treat as permanent after publishing** — see [§11](#11-editing-unpublishing-deleting) |
| **Excerpt** | 320 chars | yes | Shown on the `/blog` cards, and used as the meta description **when SEO description is blank** |
| **Content** | — | yes | Markdown body. GFM. See [§5](#5-the-seo-writing-playbook) |
| **Cover image** | JPEG/PNG/WebP, ≤5 MB | no | The Open Graph and Twitter card image, and `image` in JSON-LD. 1200×630 is the target ratio |
| **Cover alt text** | 300 chars | **yes, if an image is set** | Accessibility, and image search. Describe what the image *shows* |
| **SEO title** | 60 chars | no | Overrides the title in `<title>` and OG. **Write it without the brand** — the root layout appends `\| Denalix Tech` for you |
| **SEO description** | 160 chars | no | Overrides the excerpt as the meta description. Write it as a reason to click, not a keyword list |

Leaving the SEO fields blank is a valid choice: title and excerpt are used
instead. Fill them when the on-page title is too long for a SERP, or when the
excerpt reads better on a card than in search results.

---

## 5. The SEO writing playbook

Nine steps, in order. Steps 1–2 are the ones that decide whether a post ranks;
the rest is execution.

### Step 1 — Pick one query, not a topic

A post that answers three questions ranks for none of them. Before writing,
write down the literal sentence someone would type into Google. If you can't,
the post isn't ready.

The queries worth targeting are the ones your buyers already have. Run
`get_service_map` in Claude Code — every service page carries an `audience` and
a list of `problems` written in customer language. Those problem statements are
query sources. For example, `workflow-automation` lists:

> "The same information typed into two or three different systems"

which is a post: *"How to stop entering the same data in two systems"*.

**This step is not automated.** There is no keyword tool, no Search Console
integration, and no search-volume data in this repo. Validating that a query has
real volume happens outside the app, in Google Search Console, Keyword Planner,
or whatever tool you prefer.

### Step 2 — Match the format to the intent

| If the query looks like | Write |
| --- | --- |
| "how to…", "how do I…" | A step-by-step guide with numbered `##` sections |
| "what is…", "…meaning" | A definition-first explainer: answer in the first paragraph, then nuance |
| "X vs Y", "best way to…" | An honest comparison with a criteria table, and a recommendation |
| "cost of…", "how long does…" | Ranges and the variables that move them. Never invent a figure — see [§8](#8-things-to-keep-in-mind) |

### Step 3 — Write the title around the query

Front-load the searched phrase, keep it human. Ranking titles read like an
answer, not a slogan.

- Good: `How to stop retyping customer data between systems`
- Bad: `Unlock the power of seamless data synergy`
- Bad: `Denalix Tech's guide to data entry | Denalix Tech` — the brand is
  appended for you, twice here.

### Step 4 — Answer in the first 100 words

Before any background, state the answer. This is what gets pulled into featured
snippets and AI summaries, and it's what makes a reader stay. Save the
scene-setting for after it.

### Step 5 — Outline with `##`, one sub-question each

The post title is already the page's `<h1>`. A stray `#` in content is
defensively downgraded to `<h2>`, so heading order can't break — but write `##`
anyway so the source reads the way it renders. Use `###` only for real
subdivisions, and phrase headings the way a person would ask them.

### Step 6 — Earn the internal links

The blog exists to pass authority and readers to the commercial pages. Every
post should link 2–4 times, with descriptive anchor text, to the service pages
it supports:

| Path | Service |
| --- | --- |
| `/services/ai-automation-consulting` | AI Automation Consulting |
| `/services/workflow-automation` | Workflow Automation |
| `/services/custom-software-development` | Custom Software Development |
| `/services/dashboards-reporting` | Dashboards & Reporting |
| `/services/gis-mapping` | GIS & Mapping |

Write `[workflow automation](/services/workflow-automation)`, not "click here".
Run `suggest_internal_links` on the draft and it will name both the target and
the phrase that justifies it. **It suggests; it does not insert.** If a draft
supports no service page at all, reconsider whether it's worth publishing.

### Step 7 — Write the excerpt and SEO description as different things

They are not the same sentence:

- **Excerpt** (≤320) — appears on the `/blog` card, next to the cover. It has
  room to be a real summary.
- **SEO description** (≤160) — appears under the title in search results. It
  competes with nine other results. Make it a specific promise: what the reader
  will be able to do after reading. No keyword stuffing; Google frequently
  rewrites descriptions that read like lists.

If you leave SEO description blank, the excerpt is used — which is often over
160 characters and will be truncated mid-sentence in the SERP. Fill it.

### Step 8 — Cover image and alt text

Ask `generate_cover_image` for a brand cover, or upload your own at 1200×630.

The generated alt text describes the cover itself — *"Denalix Tech article cover
with the title … on a dark background"* — which is correct for a typographic
cover. If you upload a **photograph or screenshot**, replace it: describe what
the image shows, because that is what image search and screen readers use.

### Step 9 — Post skeleton

A shape that satisfies all of the above:

```markdown
The short answer: <one or two sentences that directly answer the query>.

<One paragraph on who this applies to and when it doesn't.>

## <Sub-question 1, phrased as a person would ask it>

<Concrete explanation. Name the real systems and steps.>

## <Sub-question 2>

| Option | Works when | Breaks when |
| --- | --- | --- |
| … | … | … |

## What this looks like in practice

<A walkthrough. This is the natural home for an internal link to the
[service page](/services/workflow-automation) that does this work.>

## Where to start

<Two or three next actions the reader can take without hiring anyone.>
```

Then keep the tone rules from `docs/seo/SEO_CONTENT_AND_METADATA.md`: no
unsupported absolutes — "best", "guaranteed", "instant", promises of a specific
ROI or ranking. No padding to reach a word count. No repetitive keyword
variants. Say what a system does and who it's for.

---

## 6. SEO you get automatically — do not hand-roll it

All of this happens without you touching anything. Adding it manually to post
content produces duplicates.

- **Canonical URL** — `/blog/<slug>` resolved against the production
  `https://www.denalixtech.com` origin. Note the `www`: the apex redirects to
  it, so emitting the apex would point every canonical at a redirect.
- **Title suffix** — the root layout appends `| Denalix Tech`. Never type it
  into a title or SEO title.
- **Open Graph + Twitter card** — `summary_large_image`, with `type: article`
  and `publishedTime`. Uses your cover image; falls back to the site-wide
  `/opengraph-image` when a post has none.
- **`BlogPosting` JSON-LD** — `headline`, `description`, `url`,
  `mainEntityOfPage`, `publisher` (linked by `@id` to the site-wide
  Organization), plus `datePublished`, `dateModified`, `image`, and `author`
  when that data genuinely exists. Absent data is omitted rather than filled
  with a placeholder.
- **Sitemap** — published, non-future posts are appended to `/sitemap.xml` with
  `lastModified` from `published_at`. Drafts, future-dated posts, previews, and
  every `/admin` route are excluded.
- **`robots.txt`** — disallows `/admin`; the admin layout is additionally
  `noindex, nofollow, nocache`.
- **Real 404s** — missing, draft, and future-dated posts are indistinguishable
  from outside and all return a genuine 404. Access control is authorization,
  not a robots directive.
- **Reading time** — computed at render from the Markdown, skipping code
  blocks. Never stored, so it can't go stale.
- **Cache invalidation** — `/blog`, `/blog/<slug>`, and `/admin/posts` are
  revalidated on every mutation, including the **old** slug when a slug changes.
  Both public routes also revalidate every 300s, so a future-dated post goes
  live on its own.
- **Upload safety** — cover uploads are type-sniffed from magic bytes, not from
  the filename or the client's MIME claim, capped at 5 MB, and stored under a
  per-user path with a UUID filename.

---

## 7. What is automated, and what is not

Short answer: **the mechanics are automated, the judgment is not.** Everything
that can be derived from the post is derived; everything that requires knowing
your market, or being accountable for a claim, is deliberately yours.

| Step | Automated? | By what |
| --- | --- | --- |
| Keyword / query selection | ❌ **No** | You, outside the app. No keyword or Search Console tooling exists here |
| Checking a topic isn't already covered | ✅ Yes | `list_posts` |
| Drafting the body | ⚙️ Assisted | Claude Code via MCP; a human must review it |
| Fact-checking the draft | ❌ **No** | You. This is the whole reason there is no publish tool |
| Slug generation from the title | ✅ Yes | Editor, for new posts only |
| Slug format + uniqueness check | ✅ Yes | `check_slug`, the Zod schema, and a DB unique index |
| Field length validation | ✅ Yes | Browser + Server Action + Postgres CHECK |
| Cover image creation | ✅ Yes | `generate_cover_image` (1200×630, on-brand) |
| Cover alt text | ⚙️ Assisted | Auto for generated covers; write your own for photos/screenshots |
| Choosing internal links | ⚙️ Suggested | `suggest_internal_links` names targets; **you insert them** |
| `\| Denalix Tech` title suffix | ✅ Yes | Root layout |
| Meta description fallback to excerpt | ✅ Yes | `generateMetadata` |
| Canonical URL | ✅ Yes | `metadataBase` + `alternates.canonical` |
| Open Graph + Twitter tags | ✅ Yes | `pageOpenGraph` / `pageTwitter` |
| `BlogPosting` structured data | ✅ Yes | `blogPostingSchema` |
| Sitemap entry | ✅ Yes | `src/app/sitemap.ts` |
| Excluding drafts from search | ✅ Yes | RLS + real 404s + `robots.ts` |
| Reading time | ✅ Yes | Computed at render |
| Cache/CDN invalidation | ✅ Yes | `revalidatePath` on every mutation |
| `dateModified` on edit | ✅ Yes | DB `updated_at` trigger |
| **Publishing** | ❌ **No, by design** | A human, in `/admin/posts`, every time |
| Breadcrumb structured data on blog pages | ❌ Not implemented | See [§12](#12-known-gaps) |
| Redirect after renaming a live slug | ❌ **No** | You, in `next.config.ts` |
| Image resizing / compression on manual upload | ❌ No | You, before uploading |
| Requesting indexing / submitting the sitemap | ❌ No | You, in Search Console |
| Internal links *between* posts | ❌ Not possible yet | No tags or related-posts feature |

---

## 8. Things to keep in mind

The failure modes that actually happen, roughly in order of how easily they slip
through.

**Never put the brand in a title.** The layout appends `| Denalix Tech`. Typing
it yourself produces `… | Denalix Tech | Denalix Tech` and burns SERP width.

**Slugs are permanent in practice.** Renaming a published post 404s the old URL
and there is no automatic redirect — any links or rankings it earned are gone.
Decide the slug before you publish, or add a redirect in `next.config.ts` in the
same change.

**Fill the SEO description.** Blank means the excerpt is used, and the excerpt's
limit is 320 against a SERP's ~160 — it will truncate mid-sentence.

**Publishing is intentionally manual.** There is no scheduling UI and no publish
tool in the MCP server. An AI-assisted draft is a first draft: read it, check
every factual claim, and take responsibility for it before it goes out.

**Don't invent facts.** No client names, metrics, case studies, testimonials,
certifications, team members, or specific ROI figures unless they are real and
approved. This constraint is documented in `docs/seo/`, and a fabricated claim in
a published post is a much worse problem than a thin one.

**Raw HTML in content is inert.** `rehype-raw` is deliberately off, so an
`<iframe>`, `<div>`, or embed script renders as visible text. There is no escape
hatch. Tables, code blocks, and images all have Markdown equivalents — use them.

**Don't paste SEO tags into the body.** Canonical links, OG tags, JSON-LD
blocks, and a duplicate `# Title` at the top are all either already generated or
actively harmful.

**Future-dating hides a post.** A `published_at` in the future makes the post
404 until that moment, then it appears within 300 seconds without intervention.
That is the closest thing to scheduling that exists.

**Preview URLs are not shareable.** `/admin/posts/<id>/preview` requires an
authenticated admin. To show a draft to someone outside the team, send a
screenshot or add them in `/admin/people`.

**External links get `nofollow` automatically**, along with
`noopener noreferrer`. If you ever want a followed outbound link, that's a code
change in `MarkdownContent.tsx`, not a content decision.

**Compress images before uploading.** Manual uploads are validated but never
resized or re-encoded. A 4 MB cover passes the check and then costs every reader
4 MB. Generated covers are already optimized.

**Old cover images are never deleted.** Replacing a cover leaves the previous
file in the bucket, because another post may reference it. Clean up under
Storage occasionally.

**`/blog` lists at most 50 posts** with no pagination. Fine now; a real
constraint at scale.

**`NEXT_PUBLIC_SITE_URL` does not drive canonicals.** The origin is a hardcoded
constant in `src/lib/site-url.ts`, on purpose — a missing env var once produced
an empty sitemap and no canonicals silently. Don't "fix" this by reintroducing
the variable.

**Never deploy the MCP server.** It holds the service-role key and bypasses RLS.
Local stdio only.

---

## 9. After publishing: verify in five minutes

```bash
npm run build && npm start     # canonicals and sitemap resolve to production
```

> Verify against your **local** production build for now. As of 2026-08-09 none of
> the blog or SEO work is committed or deployed — the live `/sitemap.xml` returns
> 404 — so checking the real site will mislead you until the branch ships. See
> [`../seo/SEO_ACCEPTANCE_CHECKLIST.md`](../seo/SEO_ACCEPTANCE_CHECKLIST.md).

- [ ] `/blog` lists the post, newest first, with cover, excerpt, date, reading time
- [ ] `/blog/<slug>` renders; view source and confirm one `<link rel="canonical">`
      pointing at `https://www.denalixtech.com/blog/<slug>`
- [ ] The `<title>` shows the brand suffix exactly once
- [ ] `/sitemap.xml` contains the URL
- [ ] Paste the URL into Google's Rich Results Test — `BlogPosting` parses clean
- [ ] Paste it into a social preview tool — the cover image and title appear
- [ ] An unrelated draft's slug still returns 404 while signed out
- [ ] In Search Console: submit the URL for indexing (nothing in the app does this)

---

## 10. Where each behavior lives

Update this document when any of these change.

| Concern | File |
| --- | --- |
| Field limits, validation | `src/lib/blog/schema.ts` |
| Slug format and generation | `src/lib/blog/slug.ts` |
| Create / update / publish / delete | `src/lib/blog/actions.ts` |
| Auth + role checks | `src/lib/blog/authz.ts` |
| Public and admin queries | `src/lib/blog/queries.ts` |
| Cover upload + type sniffing | `src/lib/blog/upload-actions.ts` |
| Editor UI | `src/components/admin/PostEditor.tsx`, `CoverImageField.tsx` |
| Admin list, badges, bulk publish | `src/components/admin/PostList.tsx` |
| Post metadata + JSON-LD wiring | `src/app/blog/[slug]/page.tsx` |
| Blog index metadata | `src/app/blog/page.tsx` |
| OG / Twitter helpers | `src/lib/seo.ts` |
| JSON-LD builders | `src/lib/schema.ts` |
| Canonical origin, static routes | `src/lib/site-url.ts` |
| Sitemap | `src/app/sitemap.ts` |
| robots.txt | `src/app/robots.ts` |
| Markdown rendering + link safety | `src/components/blog/MarkdownContent.tsx` |
| Article layout, H1, cover | `src/components/blog/PostArticle.tsx` |
| Reading time | `src/lib/blog/reading-time.ts` |
| Service pages (internal-link targets) | `src/lib/services-data.ts` |
| MCP tools | `mcp/server.ts`, `mcp/lib.ts`, `mcp/cover-image.ts` |
| Schema, RLS, storage policies | `supabase/migrations/` |
| Page copy and metadata briefs | `docs/seo/SEO_CONTENT_AND_METADATA.md` |

---

## 11. Editing, unpublishing, deleting

- **Editing a live post** keeps its `published_at` and refreshes
  `dateModified` in JSON-LD. Both the post route and `/blog` are invalidated
  immediately.
- **Unpublishing** flips status to draft and the URL starts returning 404. The
  original publication timestamp is retained for when you republish.
- **Changing a published slug** invalidates the old route — and **there is no
  redirect.** See [§8](#8-things-to-keep-in-mind).
- **Deleting** requires typing the post's own slug as confirmation, so a
  mis-aimed delete cannot succeed by accident. The cover image is intentionally
  left in storage.

---

## 12. Known gaps

Real limitations, not future ideas. Each is a candidate for a follow-up.

- **No breadcrumbs on blog pages.** `Breadcrumbs` and `breadcrumbSchema` exist
  and are used on `/services/[slug]`, but neither `/blog` nor `/blog/[slug]`
  renders them, so blog posts emit no `BreadcrumbList`.
- **No RSS feed.**
- **No tags, categories, or related posts**, so there is no topic-cluster
  linking between posts — only post → service page.
- **No pagination.** `/blog` lists up to 50 posts; the query already accepts
  `limit`/`offset`.
- **No redirect on slug change.**
- **No scheduling UI.** Future-dating a `published_at` is the workaround.
- **Cover images are never auto-deleted**, and manual uploads are not resized.
- **No automated tests.** `slug`, `reading-time`, and `schema` are pure and
  untested; the repo has no test runner configured.
- **No self-service password reset.** Reset from the Supabase dashboard.
