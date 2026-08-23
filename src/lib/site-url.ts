/**
 * The single source of truth for the canonical production origin.
 *
 * Deliberately a constant rather than an environment variable: canonical URLs,
 * Open Graph URLs, and the sitemap must all resolve to the production `www`
 * host no matter where the build runs. Depending on an env var meant a missing
 * value silently produced an empty sitemap and no canonicals.
 *
 * Note the `www` — the apex redirects to it, so emitting the apex would point
 * every canonical at a redirect.
 */
export const SITE_ORIGIN = "https://www.denalixtech.com";

/** Absolute URL for a site-relative path. Accepts "/", "/blog", "blog". */
export function absoluteUrl(path: string = "/"): string {
  if (!path || path === "/") return `${SITE_ORIGIN}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
}

/**
 * Public marketing routes that must always appear in the sitemap, independent
 * of Supabase. Blog posts are appended separately when configured.
 */
export const STATIC_ROUTES = [
  "/",
  "/services",
  "/pricing",
  "/products",
  "/how-it-works",
  "/blog",
  "/about",
  "/contact",
] as const;
