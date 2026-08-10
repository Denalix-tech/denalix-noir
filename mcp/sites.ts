import type { Brand } from "./brand";
import { env } from "./lib";
import { sites } from "./sites.config";

/**
 * The site registry — the control plane for multi-site publishing.
 *
 * Every tool resolves a caller-supplied site key to one of these before it
 * touches anything. Two of the sites this serves belong to clients, so the
 * resolution rules are deliberately unforgiving: an ambiguous key must fail
 * loudly rather than quietly write a post to the wrong company's website.
 *
 * Non-secret configuration lives in `sites.config.ts` and is committed.
 * Credentials never are — see `credentialsFor`.
 */

export type LinkTarget = {
  /** Site-relative path, e.g. "/services/workflow-automation". */
  url: string;
  name: string;
  /** The page's own headline, useful when drafting around it. */
  headline?: string;
  /** Who the page is for, in customer language. */
  audience?: string;
  /** Problems the page addresses. The best source of post topics. */
  problems?: string[];
  /** What the page offers. */
  deliverables?: string[];
  /**
   * Vocabulary this page owns, pre-tokenized and filtered the same way
   * `suggest_internal_links` matches it. Built from the fields above so it
   * cannot drift from them.
   */
  terms: string[];
};

export type SiteConfig = {
  /** What you say out loud: "draft a post for denalixtech". */
  key: string;
  name: string;
  /** Canonical public origin, used for post URLs. No trailing slash. */
  origin: string;
  /** Where this site's admin is reachable — localhost in development. */
  adminOrigin: string;
  brand: Brand;
  linkTargets: LinkTarget[];
  /**
   * Read credentials from `NEXT_PUBLIC_SUPABASE_URL` and
   * `SUPABASE_SERVICE_ROLE_KEY` rather than the `SITE_<KEY>_*` convention.
   * Set only on the site whose credentials predate this registry, so an
   * existing `.env.local` keeps working untouched.
   */
  legacyEnv?: boolean;
};

/**
 * Case-insensitive keys are safe only while no two keys collide when folded —
 * otherwise "clienta" could resolve to either of two sites. Asserted at load so
 * a bad config fails on startup instead of at write time.
 */
function assertDistinctKeys(configs: SiteConfig[]): void {
  const seen = new Map<string, string>();
  for (const site of configs) {
    const folded = site.key.toLowerCase();
    const clash = seen.get(folded);
    if (clash) {
      throw new Error(
        `Site keys "${clash}" and "${site.key}" differ only by case. Keys must be distinct when lowercased.`,
      );
    }
    seen.set(folded, site.key);
  }
}

assertDistinctKeys(sites);

export function loadSites(): SiteConfig[] {
  return sites;
}

export function siteKeys(): string[] {
  return sites.map((site) => site.key);
}

/**
 * Exact match on a trimmed, case-folded key. No fuzzy matching, no nearest
 * neighbour, and no default site: every one of those could silently retarget a
 * write at the wrong client. Failing with the valid keys listed is the only
 * helpful behaviour that is also safe.
 */
export function resolveSite(key: string): SiteConfig {
  const wanted = key.trim().toLowerCase();

  if (!wanted) {
    throw new Error(
      `A site key is required. Valid sites: ${siteKeys().join(", ")}. Call list_sites for details.`,
    );
  }

  const site = sites.find((candidate) => candidate.key.toLowerCase() === wanted);

  if (!site) {
    throw new Error(
      `Unknown site "${key}". Valid sites: ${siteKeys().join(", ")}. Call list_sites for details.`,
    );
  }

  return site;
}

/**
 * Per-site Supabase credentials, by env-var convention:
 *
 *   SITE_<KEY>_SUPABASE_URL
 *   SITE_<KEY>_SERVICE_ROLE_KEY
 *
 * where <KEY> is the site key uppercased with hyphens as underscores. These are
 * service-role keys and bypass RLS, which is why they live in `.env.local` and
 * never in `sites.config.ts`.
 */
export function credentialsFor(site: SiteConfig): { url: string; serviceKey: string } {
  const suffix = site.key.toUpperCase().replace(/-/g, "_");
  const urlVar = `SITE_${suffix}_SUPABASE_URL`;
  const keyVar = `SITE_${suffix}_SERVICE_ROLE_KEY`;

  const url = env[urlVar] ?? (site.legacyEnv ? env.NEXT_PUBLIC_SUPABASE_URL : undefined);
  const serviceKey =
    env[keyVar] ?? (site.legacyEnv ? env.SUPABASE_SERVICE_ROLE_KEY : undefined);

  if (!url || !serviceKey) {
    const expected = site.legacyEnv
      ? `${urlVar} / ${keyVar} (or NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)`
      : `${urlVar} / ${keyVar}`;
    throw new Error(
      `Missing Supabase credentials for site "${site.key}". Set ${expected} in .env.local.`,
    );
  }

  return { url, serviceKey };
}
