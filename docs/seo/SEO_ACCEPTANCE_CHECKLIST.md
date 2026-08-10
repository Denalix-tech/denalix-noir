# SEO acceptance checklist

**Status: pending deployment, not obsolete.** The SEO implementation is complete
in the working tree but has never been committed or deployed, so none of these
items can be confirmed against production yet.

Measured live on 2026-08-09:

| Check | Result |
| --- | --- |
| `https://www.denalixtech.com/sitemap.xml` | **404** — the route exists in code, not in production |
| `https://denalixtech.com/` | **307** to `www` — wanted: permanent 308/301 |
| `git log -- src/app/sitemap.ts src/lib/seo.ts src/app/blog` | empty — never committed |

Work through this list after the branch is merged and deployed. Until then, treat
every unchecked box as unverified rather than failed.

---

## Content integrity

- [ ] No invented business facts, social URLs, testimonials, metrics, locations, or legal claims appear anywhere in the shipped pages.

## Metadata and crawling

- [ ] `metadataBase` resolves to `https://www.denalixtech.com`.
- [ ] Homepage and every public index page has a unique title and description.
- [ ] Homepage and every public index page has a self-referencing canonical on the `www` origin.
- [ ] Open Graph and Twitter metadata exist, with a working 1200x630 preview image.
- [ ] Admin, login, dashboard, and draft-preview routes are `noindex, nofollow`.
- [ ] `/sitemap.xml` returns 200 and valid XML even when Supabase is not configured.
- [ ] The sitemap includes all public static routes and five service landing pages.
- [ ] Published blog posts appear when configured; drafts, future posts, previews, and admin pages never appear.
- [ ] `/robots.txt` returns 200, allows public crawling, disallows admin/private paths, and references the canonical sitemap.
- [ ] An unknown route continues returning a real 404.

## Content structure

- [ ] Exactly one visible H1 appears on each public page.
- [ ] The homepage retains one H1.
- [ ] Services, Products, How It Works, Blog, About, and Contact use their top heading as H1.
- [ ] Blog posts retain their article H1.
- [ ] All five service landing pages contain unique, useful content rather than keyword-swapped duplicates.
- [ ] The broad Services page links to all five detailed pages.
- [ ] Footer service links point to the corresponding detailed pages.
- [ ] No public anchor has `href="#"`.
- [ ] Careers and unknown social/legal destinations are removed rather than invented.
- [ ] Index metrics are visibly labeled as illustrative/sample data.

## Structured data

- [ ] Homepage Organization and WebSite JSON-LD parses as valid JSON.
- [ ] Organization data contains only verifiable visible facts.
- [ ] Service and BreadcrumbList JSON-LD exists on each detailed service page and matches visible content.
- [ ] BlogPosting/Article JSON-LD exists on public posts and omits unavailable properties.
- [ ] JSON-LD is safely escaped following the local Next.js guide.
- [ ] No fake ratings, reviews, prices, availability, addresses, or people appear in schema.

## Responsive and accessible behavior

- [ ] Existing desktop and mobile visual design remains intact.
- [ ] Heading changes do not alter intended typography or animation.
- [ ] Breadcrumbs are keyboard accessible and have an accessible navigation label.
- [ ] Decorative icons/images remain appropriately hidden or described.
- [ ] Reduced-motion behavior still works.

## Commands

From the repository root:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm start
```

Then inspect the **rendered HTML** — not React source — for title, description,
canonical, H1 count, Open Graph tags, Twitter tags, and JSON-LD on:

- `/`
- `/services`
- all five detailed service URLs
- `/products`
- `/how-it-works`
- `/blog`
- `/about`
- `/contact`
- `/robots.txt`
- `/sitemap.xml`
- one nonexistent URL

Do not expose secrets in output, and do not commit `.env.local`.

## Pending owner actions

These cannot be fixed in code and remain open:

- [ ] **Convert the apex 307 to a permanent 308/301** in the Cloudflare or Vercel
      dashboard. `next.config.ts` already contains the host redirect, but an edge
      layer answers the apex before Next.js runs, so the code rule never fires.
      Confirmed still 307 on 2026-08-09.
- [ ] **Submit the sitemap in Google Search Console** once `/sitemap.xml` returns
      200 in production.
- [ ] **AI-crawler policy** stays owner-managed at the Cloudflare edge and is
      deliberately absent from `robots.ts`. No action unless the policy changes.
