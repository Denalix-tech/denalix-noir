import { DENALIX_BRAND } from "./brand";
import type { LinkTarget, SiteConfig } from "./sites";
import { serviceLandings } from "../src/lib/services-data";

/**
 * Site registry contents. Committed, and therefore **secrets-free** — every
 * Supabase credential resolves from `.env.local` via `credentialsFor`.
 *
 * To onboard a site: add an entry here, add its two env vars, and run the blog
 * migrations against its Supabase project. See
 * `docs/features/MULTI_SITE_PLAN.md` §10.
 */

/**
 * Tokenizes a page's vocabulary exactly the way `suggest_internal_links` matches
 * against draft text: lowercase, split on non-letters, drop short words. Kept
 * here rather than in the tool so a site's terms are computed once at load.
 */
function termsFrom(...phrases: string[]): string[] {
  return phrases
    .flatMap((phrase) => phrase.toLowerCase().split(/[^a-z]+/))
    .filter((term) => term.length > 5);
}

/**
 * Denalix's link targets are derived from `services-data.ts` rather than
 * duplicated, so editing a service page updates the drafting vocabulary too.
 * Sites in other repositories declare theirs literally.
 */
const denalixLinkTargets: LinkTarget[] = serviceLandings.map((service) => ({
  url: `/services/${service.slug}`,
  name: service.name,
  headline: service.h1,
  audience: service.audience,
  problems: service.problems,
  deliverables: service.deliverables.map((deliverable) => deliverable.title),
  terms: termsFrom(
    service.name,
    ...service.deliverables.map((deliverable) => deliverable.title),
    ...service.problems,
  ),
}));

export const sites: SiteConfig[] = [
  {
    key: "denalixtech",
    name: "Denalix Tech",
    origin: "https://www.denalixtech.com",
    // Review links point at the local dev server; this is a local tool.
    adminOrigin: "http://localhost:3000",
    brand: DENALIX_BRAND,
    linkTargets: denalixLinkTargets,
    // Predates the registry — keeps the original .env.local working as-is.
    legacyEnv: true,
  },
];
