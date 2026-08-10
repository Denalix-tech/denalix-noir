# SEO implementation specification — reusable build spec

> **This is a template, not a task.** It was written for `denalixtech.com` and
> that implementation is **complete in code**. For how the finished system
> behaves, read [`../features/PUBLISHING_BLOGS.md`](../features/PUBLISHING_BLOGS.md);
> for what still needs verifying after deployment, read
> [`../seo/SEO_ACCEPTANCE_CHECKLIST.md`](../seo/SEO_ACCEPTANCE_CHECKLIST.md).
>
> It is kept as a starting brief for the same work on **another site**. When
> reusing it, replace the example origin below and re-audit the target site
> first — the priorities here reflect one site's findings, not universal ones.

Example canonical production origin: `https://www.denalixtech.com` (replace per
site; use the `www` host if the apex redirects to it, so canonicals never point
at a redirect).

## How to execute this spec

1. Read `AGENTS.md` and `CLAUDE.md` completely. This project pins a Next.js
   version whose APIs may differ from training data.
2. Run `git status --short` and inspect relevant diffs first. Treat every
   existing modification and untracked file as the user's work — do not reset,
   revert, overwrite, or reformat unrelated changes.
3. Read the applicable local guides under `node_modules/next/dist/docs/` before
   writing framework-specific code, especially:
   - `01-app/01-getting-started/14-metadata-and-og-images.md`
   - `01-app/02-guides/json-ld.md`
   - `01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`
   - `01-app/03-api-reference/03-file-conventions/01-metadata/robots.md`
   - `01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`
   - `01-app/03-api-reference/04-functions/generate-metadata.md`
   - `01-app/03-api-reference/05-config/01-next-config-js/redirects.md`
4. Implement every Critical and High-priority item. Complete Supporting items
   only where they are safe and need no missing business facts.
5. **Never invent** testimonials, client results, metrics, certifications, office
   locations, phone numbers, team members, social profiles, or case studies.
6. Do not publish legal text, build a data-collecting contact form, or change
   AI-crawler policy without owner-provided content and approval.
7. Do not commit, push, deploy, or change hosting/DNS settings unless separately
   asked.
8. Run every command in the acceptance checklist and fix failures caused by the
   work. Ship code, not another audit.
9. Report files changed, validation results, remaining owner decisions, and any
   deployment-only actions. Where a requirement needs owner data or dashboard
   access, implement the safe code portion and mark the remainder pending.

## Critical: technical indexation

### 1. Establish one canonical URL source

- Add the canonical production origin to the central site configuration or a focused URL helper.
- Use exactly `https://www.denalixtech.com` with no trailing slash at the origin level.
- Configure `metadataBase` in `src/app/layout.tsx`.
- Do not depend on `NEXT_PUBLIC_SITE_URL` being present merely to emit core marketing canonicals or a non-empty sitemap in production.
- Preserve safe preview/local behavior. Relative canonical values resolved through `metadataBase` are acceptable.

### 2. Improve root metadata defaults

Update `src/app/layout.tsx` with:

- A title template such as `%s | Denalix Tech`, while preventing duplicated brand text.
- A keyword-focused default title and description from the content specification.
- `metadataBase`.
- Default Open Graph fields: type, site name, locale, title, description, URL, and image.
- Default Twitter card metadata.
- Sensible robots defaults for public pages.
- Icons already provided by the application.

Generate a branded 1200x630 Open Graph image through the supported Next.js file convention (`opengraph-image.tsx`) or a checked-in static asset. Keep it visually consistent with the noir/gold brand. Do not add a heavy runtime client dependency.

### 3. Canonicals and page metadata

For every public static route, provide a unique title, description, and self-referencing canonical:

- `/`
- `/services`
- `/products`
- `/how-it-works`
- `/blog`
- `/about`
- `/contact`
- each new service landing page

Keep dynamic blog-post canonicals and social metadata working. Align their URL helper with the canonical production origin without breaking local development or Supabase-free marketing builds.

Admin and draft-preview routes must emit `noindex, nofollow` metadata.

### 4. Sitemap

Extend the existing `src/app/sitemap.ts`:

- Always include all canonical public static routes.
- Include the five new service landing pages.
- Include `/blog` and published, non-future blog posts when Supabase is configured.
- Exclude `/admin`, admin previews, drafts, future posts, auth pages, and private routes.
- Use the canonical `www` origin.
- Use honest `lastModified` values only where a real date exists; do not use the current time on every request.
- Use reasonable priorities/change frequencies without treating them as ranking hacks.
- Continue returning a valid static sitemap when Supabase is absent.

### 5. Robots

Add `src/app/robots.ts` using the Next.js metadata file convention:

- Allow normal public crawling.
- Disallow `/admin/` and any private/admin-preview paths.
- Reference `https://www.denalixtech.com/sitemap.xml`.
- Do not change the owner's Cloudflare-managed AI training/search policy. Cloudflare may merge or prepend managed directives after deployment.

### 6. Heading hierarchy

- Add an `as` or `level` prop to `SectionHeading` so it can render `h1` or `h2` without duplicating its visual/animation behavior.
- Use exactly one visible H1 on each public page.
- Keep the homepage Hero H1.
- Use H1 for the first/top heading on Services, Products, How It Works, Blog index, About, and Contact.
- Blog articles already use an H1; preserve it.
- Keep subsequent section headings as H2 and card headings as H3 where logical.

### 7. Broken and placeholder links

There must be no public `href="#"` links after this work.

- Point “Simple Guide” to `/blog`.
- Remove the Careers card/link until a real careers page and content exist.
- Remove social icons until real owner-supplied profile URLs exist; do not invent destinations.
- Remove Privacy/Terms links until approved policy pages exist, or leave a clearly documented owner decision without rendering dead links.
- Update footer service links to their individual landing pages.
- Preserve real anchors such as `/#contact` and `/#how-it-works`.

## High impact: commercial landing pages

Create substantial, indexable pages for:

- `/services/ai-automation-consulting`
- `/services/workflow-automation`
- `/services/custom-software-development`
- `/services/dashboards-reporting`
- `/services/gis-mapping`

Implementation may use a typed data module plus `src/app/services/[slug]/page.tsx` with `generateStaticParams` and `generateMetadata`, or five explicit route files. Prefer the approach that keeps content typed, static, maintainable, and readable.

Each page must contain:

- Unique metadata and canonical.
- One unique, visible H1.
- A clear audience/problem statement.
- Specific deliverables based only on services already described in the repository.
- A short engagement/process section.
- Related-service links.
- A consultation CTA.
- Breadcrumb navigation and matching structured data.
- Enough original, useful content to stand alone; do not create thin pages by swapping a few keywords.

Update the broad `/services` page so each service pillar links to the correct landing page. Include AI automation as an explicit service while maintaining the existing practical, non-hype tone.

## High impact: structured data

Implement safe JSON-LD using server-rendered script tags and the escaping pattern recommended in the local Next.js JSON-LD guide.

### Homepage

Add an `@graph` or separate objects for:

- `Organization`: name, full brand name if appropriate, canonical URL, logo URL, description, and public email.
- `WebSite`: name, URL, publisher reference.

Do not add address, telephone, founder, employee, award, rating, or `sameAs` fields without verified data.

### Service pages

Add:

- `Service` describing the visible service.
- `BreadcrumbList` matching visible breadcrumbs.
- Provider reference to the Organization entity.

### Blog posts

Add `BlogPosting` or `Article` JSON-LD using only the existing post title, excerpt, canonical URL, publication date, cover image, and verified displayed author name. Omit unavailable properties rather than fabricating them.

### Products

Do not add Product/SoftwareApplication rich-result claims for Index while it is in development unless the visible content and owner-supplied facts fully support them. Make the existing dashboard numbers unmistakably sample/illustrative data.

## Content trust and conversion

- Improve `/contact` with unique introductory content and an H1, while keeping the existing mailto flow. Do not create a form or collect personal data in this task.
- Make the Index preview label say clearly that its numbers are illustrative/sample data.
- Add a short visible “What happens next” explanation near the contact CTA using non-committal language; do not promise a response time unless supplied by the owner.
- Retain the existing design system, motion, mobile layout, and tone.
- Do not add generic AI-generated blog posts as part of this implementation.

## Domain redirect deployment action

The live apex `https://denalixtech.com/` currently returns a temporary 307 to `https://www.denalixtech.com/`. The preferred result is a permanent 301 or 308.

Determine whether a Next.js `next.config.ts` permanent host redirect can apply. If Cloudflare/Vercel intercepts the apex before the app, do not pretend the code fixed it. Document the exact Vercel/Cloudflare dashboard action required and leave it pending for the owner.

## Out of scope without owner input

- Geographic/local SEO pages.
- A Google Business Profile.
- Testimonials, case studies, or performance results.
- Team/founder biographies.
- Legal policies.
- Contact-form data collection.
- Real social profile links.
- Changes to Cloudflare AI-crawler permissions.
- Deployment, Search Console submission, or DNS changes.
