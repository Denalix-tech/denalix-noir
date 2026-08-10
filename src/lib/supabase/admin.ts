import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { requireSupabaseConfig } from "./env";

/**
 * Service-role client. **Bypasses every Row Level Security policy.**
 *
 * Deliberately narrow in scope — it exists for the two things the anon key
 * genuinely cannot do:
 *
 *   1. list accounts in `auth.users` (not exposed through PostgREST)
 *   2. generate an invite link for a brand-new account
 *
 * Role changes do NOT use this client; they go through the caller's own
 * session so the owner-gated RLS policies still apply.
 *
 * The `server-only` import above makes importing this from a Client Component
 * a build error. Never relax that.
 */

const MISSING_KEY_MESSAGE =
  "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (server-only — " +
  "it must NOT have a NEXT_PUBLIC_ prefix). See README.md.";

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error(MISSING_KEY_MESSAGE);

  const { url } = requireSupabaseConfig();

  return createSupabaseClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export { MISSING_KEY_MESSAGE };
