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

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) return null;

  return { url, publishableKey };
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
