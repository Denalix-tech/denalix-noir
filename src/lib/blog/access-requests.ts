import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Reads for the access-request queue.
 *
 * Through the caller's own session, so the `access_requests: admins read` policy
 * applies. Only the public insert needs the service role.
 */

export type AccessRequest = Database["public"]["Tables"]["access_requests"]["Row"];

export async function listPendingAccessRequests(
  supabase: SupabaseClient<Database>,
): Promise<AccessRequest[]> {
  const { data, error } = await supabase
    .from("access_requests")
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error) {
    console.error("[access] could not list requests", { message: error.message });
    // Non-fatal: the People screen still works without the queue, and losing
    // access management entirely because this read failed would be worse.
    return [];
  }

  return data ?? [];
}
