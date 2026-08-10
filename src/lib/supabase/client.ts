"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { requireSupabaseConfig } from "./env";

/**
 * Browser Supabase client. Only used for interactive auth (sign in / sign out);
 * all post reads and mutations go through the server so authorization is
 * enforced where it cannot be bypassed.
 */
export function createClient() {
  const { url, publishableKey } = requireSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
