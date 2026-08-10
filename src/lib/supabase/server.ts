import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { requireSupabaseConfig } from "./env";

/**
 * Per-request Supabase client for Server Components, Server Actions and Route
 * Handlers. Never cache or share the returned client across requests — it
 * carries the caller's session.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = requireSupabaseConfig();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The proxy refreshes the
          // session on every request, so a refresh dropped here is recovered
          // on the next navigation.
        }
      },
    },
  });
}
