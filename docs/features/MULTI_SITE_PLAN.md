# Multi-site blog publishing — implementation plan

**Goal.** From Claude Code (and optionally ChatGPT later), say *"draft a post about X for `<site>`"* and have it land as a **draft** in that site's own backend, with an on-brand cover and correct internal links — across three sites today (`denalixtech` plus two client sites) and any number later.

**Status — executed 2026-08-09, except Phase 6.**

| Phase | State |
| --- | --- |
| 0 — Pre-flight | ⚠️ **Partial.** Committed (4 commits). **Merge, deploy, checklist, and the apex 307→308 remain yours to do.** |
| 1 — Extract tools | ✅ Done |
| 2 — Brand + link targets as data | ✅ Done |
| 3 — Site registry | ✅ Done |
| 4 — Per-site Supabase access | ✅ Done |
| 5 — `site` param + guardrails | ✅ Done |
| 6 — Onboard the two client sites | ⏸ **Blocked** — needs each client's Supabase project, brand tokens, and link targets. Runbook: [`ONBOARD_A_SITE.md`](ONBOARD_A_SITE.md) |
| 7 — Docs | ✅ Done |
| 12 — ChatGPT access | ⏸ Deferred by design |

Phases 1–5 were executed as a single refactor rather than five, because they
rewrite the same lines of `tools.ts`; splitting them would have meant writing the
file three times to reach a transient state nothing consumes. Verification was
unchanged: byte-identical cover output, term-extraction parity with the old inline
logic, a real create/delete round-trip, `tsc --noEmit`, and ESLint.

This document is kept for the decisions in §2 and the runbooks in §10 and §12. For
how the system behaves now, read [`PUBLISHING_BLOGS.md`](PUBLISHING_BLOGS.md); to
add a site, read [`ONBOARD_A_SITE.md`](ONBOARD_A_SITE.md).

---

## Contents

1. [Pre-flight: ship what already exists](#1-pre-flight-ship-what-already-exists)
2. [Architecture and the decisions behind it](#2-architecture-and-the-decisions-behind-it)
3. [What currently assumes one site](#3-what-currently-assumes-one-site)
4. [Target file layout](#4-target-file-layout)
5. [Phase 1 — Extract the tools](#5-phase-1--extract-the-tools)
6. [Phase 2 — Brand and link targets become data](#6-phase-2--brand-and-link-targets-become-data)
7. [Phase 3 — Site registry](#7-phase-3--site-registry)
8. [Phase 4 — Per-site Supabase access](#8-phase-4--per-site-supabase-access)
9. [Phase 5 — The `site` parameter and guardrails](#9-phase-5--the-site-parameter-and-guardrails)
10. [Phase 6 — Onboard the two client sites](#10-phase-6--onboard-the-two-client-sites)
11. [Phase 7 — Documentation](#11-phase-7--documentation)
12. [Deferred — ChatGPT access](#12-deferred--chatgpt-access)
13. [Effort summary](#13-effort-summary)
14. [Explicit non-goals](#14-explicit-non-goals)

---

## 1. Pre-flight: ship what already exists

**Do this before writing any multi-site code.** Measured on 2026-08-09:

| Check | Result |
| --- | --- |
| `git status --short` | 38 uncommitted files |
| `git log -- src/app/sitemap.ts src/lib/seo.ts src/app/blog` | empty — never committed |
| `https://www.denalixtech.com/sitemap.xml` | **404** |
| `https://denalixtech.com/` | **307** (target: 308/301) |

The entire blog, admin, and SEO implementation lives only in the working tree, and `docs/` is untracked too. Production still serves the old `main`.

Two consequences:

1. **Risk.** A stray `git checkout` or `git clean` destroys all of it, including this plan. Commit before building anything new on top.
2. **The SEO acceptance checklist is not obsolete, it is pending.** Its items cannot be verified against production because the code is not deployed. See [`../seo/SEO_ACCEPTANCE_CHECKLIST.md`](../seo/SEO_ACCEPTANCE_CHECKLIST.md).

**Pre-flight steps**

1. Commit the working tree on `feat/blog-admin` in reviewable chunks (blog+admin, SEO, docs, MCP).
2. Merge and deploy, so `/sitemap.xml` and canonicals go live.
3. Run the acceptance checklist against production and fix what fails.
4. Convert the apex 307 → 308 in the Cloudflare/Vercel dashboard (a code-level redirect cannot fix it if the edge answers first).

Only then start Phase 1.

---

## 2. Architecture and the decisions behind it

```
        You, in Claude Code
        "draft a post on X for <site>"
                     │
        ┌────────────▼──────────────┐
        │  CONTROL PLANE (yours)    │   stdio → Claude Code
        │  tools · registry · brand │   (HTTP deferred, see §12)
        │  cover generator          │
        └────────────┬──────────────┘
                     │  resolve site key → adapter + credentials
      ┌──────────────┼───────────────┐
      ▼              ▼               ▼
  CONTENT PLANE (per site — each client owns theirs)
  denalixtech     client A        client B
  your Supabase   their backend   their backend
```

**D1 — Split the planes.** The registry, tool surface, and cover generator are yours and shared. Posts stay in each site's own backend.

**D2 — No shared `posts` table.** Two of the three sites belong to clients. A shared table means a wrong `site_id` cross-posts one client's article to another's website, their content lives on your bill, and offboarding means extracting rows instead of handing over a project.

> This supersedes an earlier suggestion in conversation to add `site_id` to one table. It also **removes** the need for per-site slug uniqueness: each site keeps its own `posts` table, so the existing `slug text not null unique` is already correct per-site. **No migration change is required.**

**D3 — One backend, one concrete module, no interface yet.** All three sites are Next.js + Supabase, so Supabase's PostgREST *is* the write API — you build **no** site-side endpoints. Keep every Supabase call in one module (`mcp/adapters/supabase.ts`) that takes a `SiteConfig`, but **do not** define a `BlogAdapter` interface or a dispatch table for a single implementation. One implementation behind an interface is ceremony, not abstraction. If a client ever arrives on WordPress or Webflow, extracting the interface from one working implementation is a sub-hour refactor — and it will be the *right* interface, derived from two real cases instead of one imagined one.

> This revises the adapter-pattern decision recorded earlier, on the strength of a confirmed single stack. The directory name `adapters/` is retained to mark the seam.

**D4 — Draft-only, structurally.** The adapter interface has no `status` parameter. Publishing stays a human action in each site's own admin.

**D5 — stdio only, for now.** Hosting buys exactly one thing: ChatGPT access. Everything else works locally at zero cost and zero attack surface. Deferred to §12.

**D6 — When hosted, it will be a standalone deployment, never a route handler in a marketing site.** Recorded now so it is not relitigated: putting the writer surface in `denalix-noir` means every marketing-site deploy risks the publishing pipeline for three clients, and a compromise of the marketing site reaches credentials for all three. It also inherits serverless constraints — stateless MCP mode, function timeouts, `sharp` promoted to `dependencies`, `runtime = "nodejs"`.

**D7 — Credentials by env-var convention, config committed without secrets.** Non-secret site config (key, name, origin, brand, link targets, adapter) is committed. Secrets resolve from `.env.local` as `SITE_<KEY>_SUPABASE_URL` / `SITE_<KEY>_SERVICE_ROLE_KEY`. `.env*` is already gitignored.

---

## 3. What currently assumes one site

Verified against the code. This is the complete list.

| Coupling | Location | Becomes |
| --- | --- | --- |
| Brand palette | `mcp/cover-image.ts` — `INK`, `FOREGROUND`, `MUTED`, `ACCENT` | `Brand` on the site row |
| Wordmark + mountain glyph | `mcp/cover-image.ts` — literal `Denalix Tech`, inline `<path>` | `brand.wordmark`, `brand.markPath` |
| Footer domain on covers | `mcp/cover-image.ts` — literal `denalixtech.com` | `brand.domain` |
| Alt-text brand name | `mcp/cover-image.ts` — `coverAltText()` | `brand.wordmark` param |
| Internal-link targets | `mcp/server.ts` — imports `serviceLandings` | `linkTargets` on the site row |
| Supabase credentials | `mcp/lib.ts` — single `db()` from two fixed env vars | per-site, via adapter |
| Owner attribution | `mcp/lib.ts` — `ownerId()` on one project | per-site, via adapter |
| Canonical origin | `src/lib/site-url.ts` — `SITE_ORIGIN` constant | `origin` on the site row (the Next app keeps its own constant) |

Note the last row: `src/lib/site-url.ts` is deliberately a hardcoded constant for the Next app and **stays that way**. Each site's own repo owns its origin. Only the MCP control plane needs origin as data.

---

## 4. Target file layout

```
mcp/
  server.ts              # transport + wiring only
  tools.ts               # registerBlogTools(server, ctx) — all six tools
  sites.ts               # SiteConfig, loadSites(), resolveSite(key), credentials
  sites.config.ts        # committed, secrets-free
  brand.ts               # Brand type + DENALIX_BRAND
  cover-image.ts         # brand passed in, nothing hardcoded
  lib.ts                 # textResult / errorResult only
  adapters/
    supabase.ts          # all Supabase access (absorbs db() and ownerId())
```

No `types.ts`, no second adapter — see D3.

---

## 5. Phase 1 — Extract the tools

**Why first:** the tools cannot be parameterized while they are inline in the transport file.

1. Create `mcp/tools.ts` exporting `registerBlogTools(server: McpServer, ctx: ToolContext)`.
2. Move all six `server.registerTool(...)` blocks verbatim. No signature changes yet.
3. Reduce `mcp/server.ts` to: construct `McpServer`, build `ctx`, call `registerBlogTools`, connect `StdioServerTransport`.

**Verify:** restart Claude Code; `list_posts` and `check_slug` return byte-identical results to today.

---

## 6. Phase 2 — Brand and link targets become data

1. `mcp/brand.ts`:

```ts
export type Brand = {
  ink: string;        // background
  foreground: string; // title + wordmark
  muted: string;      // footer domain
  accent: string;     // eyebrow, glow, rule
  wordmark: string;   // "Denalix Tech"
  domain: string;     // "denalixtech.com"
  markPath: string;   // SVG path for the logo glyph
};
export const DENALIX_BRAND: Brand = { /* the exact current constants */ };
```

2. `cover-image.ts`: `buildCoverSvg({ title, slug, eyebrow, brand })`, `renderCoverPng(input & { brand })`, `coverAltText(title, wordmark)`. Delete the four module-level colour constants and both literals.
3. `mcp/sites.ts`: `type LinkTarget = { url: string; name: string; terms: string[] }`. Build denalix's list from `serviceLandings` at load so it cannot drift.
4. `suggest_internal_links` reads `site.linkTargets` instead of importing `services-data`.

**Verify:** regenerate a cover for `construction-back-office-data-entry` and diff against the existing PNG — must be byte-identical. Run `suggest_internal_links` on the same text and confirm the same five services with the same strengths.

---

## 7. Phase 3 — Site registry

1. `mcp/sites.ts`:

```ts
export type SiteConfig = {
  key: string;          // 'denalixtech' — what you say out loud
  name: string;
  origin: string;
  adapter: 'supabase' | 'wordpress';
  brand: Brand;
  linkTargets: LinkTarget[];
};
export function loadSites(): SiteConfig[];
export function resolveSite(key: string): SiteConfig;   // exact match, throws with valid keys listed
export function credentialsFor(key: string): { url: string; serviceKey: string };
```

2. `credentialsFor` reads `SITE_<KEY_UPPER>_SUPABASE_URL` / `SITE_<KEY_UPPER>_SERVICE_ROLE_KEY`, **falling back for `denalixtech` to the existing `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`** so today's `.env.local` keeps working untouched.
3. `mcp/sites.config.ts` with the single `denalixtech` entry. No secrets.

**Verify:** a temporary script prints the resolved config for `denalixtech`; `resolveSite('nope')` throws listing valid keys.

---

## 8. Phase 4 — Per-site Supabase access

One module, four exported functions, no interface (D3):

```ts
// mcp/adapters/supabase.ts
export function clientFor(site: SiteConfig): SupabaseClient<Database>;
export function listPosts(site, status?): Promise<PostSummary[]>;
export function checkSlug(site, slug): Promise<{ taken: boolean; takenBy: string | null }>;
export function createDraft(site, input: DraftInput): Promise<{ id; slug; reviewUrl }>;
export function uploadCover(site, png: Buffer, slug): Promise<{ url: string }>;
```

1. Absorb `db()` and `ownerId()` from `lib.ts`, both now taking a `SiteConfig`.
2. `DraftInput` has **no `status` field** and there is **no publish function** — D4 enforced by the type, not by convention.
3. `reviewUrl` is built from the site's own origin, replacing the hardcoded `ADMIN_POSTS_URL = "http://localhost:3000/admin/posts"` in `server.ts`. Add an optional `adminOrigin` to `SiteConfig` so local development still resolves to `localhost:3000` for `denalixtech`.
4. `mcp/lib.ts` keeps only `textResult` / `errorResult`.

**Verify:** all six tools work for `denalixtech`, including a real `create_draft` that is then deleted from `/admin/posts`.

---

## 9. Phase 5 — The `site` parameter and guardrails

1. Add required `site: z.string().describe("Site key from list_sites")` to all six tools.
2. Add a `list_sites` tool returning key, name, origin, adapter — the discovery entry point.
3. **Exact match only.** No fuzzy matching, no default site, no inference from context. Unknown key → error listing valid keys.
4. **Every response echoes the resolved site**: `{ site: { key, name, origin }, ... }`, so a wrong target is visible in the transcript before anything else happens.
5. `create_draft` returns the site name and the absolute `reviewUrl` on that site's origin.
6. Cover uploads go to that site's own storage bucket.

**Verify:** omitting `site` fails schema validation; a wrong key errors with the valid list; `create_draft` against `denalixtech` shows `origin: https://www.denalixtech.com`.

---

## 10. Phase 6 — Onboard the two client sites

All three sites are Next.js + Supabase, so there is one runbook and no second adapter. **≈0.5 d per site.**

**Check first: Supabase project limits.** The free tier allows only a small number of active projects per organization (2 at time of writing) and pauses projects after about a week of inactivity — a paused project means a dead blog. Confirm current limits, then choose:

- **Preferred:** each client site lives in the **client's own** Supabase organization, which they own and pay for. This matches D2 — content ownership follows the website, and offboarding is handing over a project rather than extracting rows.
- **Otherwise:** budget for a paid organization. Do not spread three production sites across one free org.

**Per-site runbook**

1. Apply both existing migrations to that site's Supabase project — **unchanged**. No `site_id`, no slug-constraint change (D2).
2. Create the first owner profile (README §6) and confirm the `blog-images` bucket exists, is public, and has the 5 MB limit.
3. Add a registry entry in `sites.config.ts`: key, name, origin, `adminOrigin`, that site's brand tokens, that site's link targets.
4. Add `SITE_<KEY>_SUPABASE_URL` and `SITE_<KEY>_SERVICE_ROLE_KEY` to `.env.local`.
5. In that site's own repo, wire `/blog` and `/blog/[slug]` plus its query layer. Its design stays its own.

**Verify per site:** `list_sites` shows it → `list_posts` reads from it → `create_draft` round-trips → the draft appears in that site's admin → the draft URL returns a real 404 publicly → `generate_cover_image` produces a cover in *that* site's palette, not Denalix noir/gold.

**Natural follow-on, out of scope here.** With three sites on an identical stack, `src/lib/blog/*` and `src/components/blog/*` are duplicated three times. Extracting them into a shared internal package means a bug is fixed once instead of three times. Worth doing *after* site three is running, when the real variation between them is visible — not before.

---

## 11. Phase 7 — Documentation

1. Update `PUBLISHING_BLOGS.md`: the `site` parameter, `list_sites`, per-site brand, and the multi-site sections of the automation matrix.
2. Add a per-site onboarding runbook (a condensed Phase 6 as a repeatable checklist).
3. Update `docs/specs/*` if the client sites reuse those specs.

---

## 12. Deferred — ChatGPT access

Not in this plan. When wanted:

- **Standalone deployment** per D6 — Fly.io (~$2–5/mo, Node-native so `sharp` works) or a Cloudflare Tunnel to a local process. **Not** Cloudflare Workers: no Node runtime, so cover generation breaks.
- **Recommended surface: a custom-GPT Action** (OpenAPI + bearer auth, ~1 d) rather than an MCP connector (OAuth 2.1 with dynamic client registration, ~3 d). Same capability, a third of the work.
- **One token per site**, so a leaked action cannot write to all three.
- **Images: the server generates them.** ChatGPT cannot pass image bytes into a tool call — base64 of a 1024×1024 PNG is ~1.4 MB of argument. Send text, render the cover server-side.

---

## 13. Effort summary

| Phase | Work | Effort |
| --- | --- | --- |
| 0 | Pre-flight: commit, deploy, verify, apex redirect | 0.5 d |
| 1 | Extract tools | 0.5 d |
| 2 | Brand + link targets as data | 0.5 d |
| 3 | Site registry | 0.5 d |
| 4 | Per-site Supabase access | 0.25 d |
| 5 | `site` param + guardrails | 0.5 d |
| 6 | Onboard 2 client sites | 1 d |
| 7 | Docs | 0.5 d |
| **Total** | **multi-site, Claude Code** | **≈ 3.5 days** |
| 12 | ChatGPT, deferred | +1 d |

Phases 1–5 are mechanical and low-risk: each ends with the existing site behaving identically. Phase 6 depends on Supabase project access, not on engineering.

---

## 14. Explicit non-goals

Do not add these while executing this plan:

- **A publish tool.** Not in MCP, not in HTTP, not behind a flag.
- **A `BlogAdapter` interface or adapter dispatch** while every site is Supabase (D3). Build it when a second backend actually exists.
- **A shared blog package** — a worthwhile follow-on, but not while executing this plan (§10).
- **A shared `posts` table** across sites, or a `site_id` column.
- **A route handler in `denalix-noir`** serving the control plane (D6).
- **Credentials in committed files.**
- **Fuzzy site resolution** or a default site.
- **Image-model integration** — separate decision, separate budget.
- **Changes to `src/lib/site-url.ts`** — per-site origin is a control-plane concern only.
