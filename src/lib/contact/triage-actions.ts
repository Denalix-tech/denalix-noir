"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { loadAdminContext } from "@/lib/blog/authz";
import { formString } from "@/lib/blog/schema";

/**
 * Triage a consultation request.
 *
 * Uses the caller's session rather than the service-role client, so the
 * `consultation_requests: admins update` policy is what actually authorises the
 * write. The `loadAdminContext` check below is the fast, readable rejection; RLS
 * is the backstop if this action is ever reached another way.
 */

const triageSchema = z.object({
  id: z.uuid(),
  // Deliberately no "delete". A request someone took the trouble to send is
  // archived, not dropped — and the column CHECK enforces the same three values.
  status: z.enum(["new", "contacted", "archived"]),
});

export async function setRequestStatusAction(formData: FormData): Promise<void> {
  const context = await loadAdminContext();
  if (!context.ok) return;

  const parsed = triageSchema.safeParse({
    id: formString(formData, "id"),
    status: formString(formData, "status"),
  });

  if (!parsed.success) return;

  const { error } = await context.supabase
    .from("consultation_requests")
    .update({
      status: parsed.data.status,
      // Records who moved it and when, so a shared inbox has an audit trail.
      // Cleared on the way back to "new" rather than left pointing at a stale
      // decision.
      handled_at: parsed.data.status === "new" ? null : new Date().toISOString(),
      handled_by: parsed.data.status === "new" ? null : context.user.id,
    })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[contact] triage update failed", {
      id: parsed.data.id,
      message: error.message,
    });
    return;
  }

  revalidatePath("/admin/requests");
}
