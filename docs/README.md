# Documentation index

Three kinds of document live here, and the distinction matters when you read them.

## `features/` — living documentation of what exists

Kept in sync with the code. If one of these disagrees with the code, the document
is the bug.

| Document | What it is |
| --- | --- |
| [`features/PUBLISHING_BLOGS.md`](features/PUBLISHING_BLOGS.md) | How to publish SEO-optimized posts: field limits, the writing playbook, what SEO is automatic, what is not automated, and the pitfalls. **Start here.** |
| [`features/ONBOARD_A_SITE.md`](features/ONBOARD_A_SITE.md) | Repeatable checklist for adding a site to the drafting control plane: Supabase setup, credentials, registry entry, brand tokens, verification. |
| [`features/MCP_SERVER_AND_SYNDICATION.md`](features/MCP_SERVER_AND_SYNDICATION.md) | Running the MCP server (built), plus runbooks for **unbuilt** work: an HTTP transport, a ChatGPT connector, and syndication to DEV/Hashnode. Every section is marked built or not. |
| [`features/MULTI_SITE_PLAN.md`](features/MULTI_SITE_PLAN.md) | The multi-site architecture and the decisions behind it. **Executed except Phase 6** — kept for the rationale, not as a description of behavior. |

## `seo/` — the marketing site's SEO content and verification

| Document | What it is |
| --- | --- |
| [`seo/SEO_CONTENT_AND_METADATA.md`](seo/SEO_CONTENT_AND_METADATA.md) | Titles, descriptions, H1s, and service-page briefs for every public page. The source of truth for marketing copy and the tone rules blog posts follow. |
| [`seo/SEO_ACCEPTANCE_CHECKLIST.md`](seo/SEO_ACCEPTANCE_CHECKLIST.md) | Post-deploy verification list. **Pending, not obsolete** — the SEO work is unshipped, so nothing on it is confirmed yet. Also tracks the open owner actions. |

## `specs/` — reusable build templates

Briefs for work that is **already finished here**, kept because the same feature
will be built again on other sites. They describe a starting point, not current
behavior — never read them to learn how this system works.

| Document | What it is |
| --- | --- |
| [`specs/blog-admin-spec.md`](specs/blog-admin-spec.md) | Full brief for standing up a blog + admin panel on a Next.js site with Supabase |
| [`specs/seo-spec.md`](specs/seo-spec.md) | Full brief for the technical SEO, structured data, and landing-page work |

## Also relevant

- [`../README.md`](../README.md) — Supabase setup, first owner account, managing people, the MCP server, authorization model, known limitations.
- [`../AGENTS.md`](../AGENTS.md) — read before writing any code in this repo.
