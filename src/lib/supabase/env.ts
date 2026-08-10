/**
 * Supabase environment resolution.
 *
 * The marketing pages must keep rendering even when Supabase is not wired up
 * yet, so callers get an explicit `null` instead of a thrown error. Only the
 * blog and admin surfaces escalate a missing configuration into a hard failure.
 */

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

const MISSING_CONFIG_MESSAGE =
  "Supabase is not configured. Copy .env.example to .env.local and set " +
  "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
  "See README.md for setup steps.";

/**
 * Trims a Supabase URL back to the bare project origin.
 *
 * `createClient` expects `https://<ref>.supabase.co` and appends its own
 * `/rest/v1`, `/auth/v1`, and `/storage/v1` paths. A URL that already carries
 * `/rest/v1/` produces requests to `/rest/v1/rest/v1/...`, so **every** call
 * fails — reads, auth, storage, and the OAuth tables alike — with errors that
 * look like anything but a bad environment variable.
 *
 * This is normalised rather than merely documented because the shipped
 * `.env.example` carried the `/rest/v1/` form for a while, so any environment
 * populated by copying it is broken in exactly this way.
 */
function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  const bare = trimmed.replace(/\/(rest|auth|storage|realtime)\/v1$/, "");

  if (bare !== trimmed) {
    console.warn(
      `[supabase] NEXT_PUBLIC_SUPABASE_URL should be the bare project origin. ` +
        `Trimmed a service path from it — set it to "${bare}".`,
    );
  }

  return bare;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!rawUrl || !publishableKey) return null;

  return { url: normalizeSupabaseUrl(rawUrl), publishableKey };
}

export function requireSupabaseConfig(): SupabaseConfig {
  const config = getSupabaseConfig();
  if (!config) throw new Error(MISSING_CONFIG_MESSAGE);
  return config;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

// The canonical site origin used to live here behind NEXT_PUBLIC_SITE_URL.
// It now lives in src/lib/site-url.ts as a constant, so canonicals, Open Graph
// URLs, and the sitemap cannot silently go missing when an env var is unset.

export { MISSING_CONFIG_MESSAGE };
