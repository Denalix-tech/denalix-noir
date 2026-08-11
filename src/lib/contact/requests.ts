import "server-only";

import type { ConsultationStatus, Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reads and triage writes for consultation requests.
 *
 * Both go through the **caller's own session**, not the service-role client, so
 * the `consultation_requests: admins read/update` policies apply. Only the public
 * insert needs to bypass RLS, and that lives in `actions.ts`.
 */

export type ConsultationRequest =
  Database["public"]["Tables"]["consultation_requests"]["Row"];

export async function listConsultationRequests(
  supabase: SupabaseClient<Database>,
): Promise<ConsultationRequest[]> {
  const { data, error } = await supabase
    .from("consultation_requests")
    .select("*")
    // New first, then most recent — the triage order someone actually works in.
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[contact] could not list requests", { message: error.message });
    throw new Error("Could not load consultation requests.");
  }

  return data ?? [];
}

export function countNewRequests(requests: ConsultationRequest[]): number {
  return requests.filter((request) => request.status === "new").length;
}

export const STATUS_LABELS: Record<ConsultationStatus, string> = {
  new: "New",
  contacted: "Contacted",
  archived: "Archived",
};
