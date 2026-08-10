import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { requireSupabaseConfig } from "./env";

/**
 * Cookie-free client for public blog reads.
 *
 * Reading cookies would opt every blog route into dynamic rendering. Public
 * posts are identical for every visitor, so this client carries no session and
 * sees exactly what the `anon` role is allowed to see under RLS.
 */
export function createPublicClient() {
  const { url, publishableKey } = requireSupabaseConfig();

  return createSupabaseClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
