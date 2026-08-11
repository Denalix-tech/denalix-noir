"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { loadOwnerContext } from "./authz";
import { accessRequestSchema, fieldErrors, formString } from "./schema";
import { absoluteUrl } from "@/lib/site-url";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { AccessRequestState, ReviewState } from "./access-request-state";

/**
 * Admin-access requests: asking, and being approved.
 *
 * The order matters and is the point of this file. Asking creates **no auth
 * account** — only a row. Approval is what creates the account, grants the role,
 * and produces a one-time link with which the person sets their own password. So
 * a declined request leaves no login behind, and nobody chooses a password for an
 * account that may never exist.
 *
 * Requests are written with the service-role client because `access_requests` has
 * RLS with no anon policy: a public form that could write through the publishable
 * key could also be written to directly, skipping validation.
 */

// ---------------------------------------------------------------------------
// Ask
// ---------------------------------------------------------------------------

export async function requestAccessAction(
  _prevState: AccessRequestState,
  formData: FormData,
): Promise<AccessRequestState> {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) {
    console.error("[access] request blocked: Supabase is not fully configured");
    return { formError: "Requests cannot be accepted right now. Please email us instead." };
  }

  const parsed = accessRequestSchema.safeParse({
    email: formString(formData, "email"),
    name: formString(formData, "name"),
    reason: formString(formData, "reason"),
  });

  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { email, name, reason } = parsed.data;

  const { error } = await createAdminClient()
    .from("access_requests")
    .insert({
      email: email.trim().toLowerCase(),
      name: name || null,
      reason: reason || null,
    });

  if (error) {
    // The partial unique index allows one pending request per address. Say so
    // plainly: it is reassurance, not a leak — the person already knows they
    // asked.
    if (error.code === "23505") {
      return { submitted: true, alreadyPending: true };
    }
    console.error("[access] request insert failed", { message: error.message });
    return { formError: "Could not record that request. Please try again." };
  }

  return { submitted: true };
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

const reviewSchema = z.object({
  id: z.uuid(),
  role: z.enum(["owner", "admin"]),
});

/**
 * Approves a request: creates the account, grants the role, and returns a
 * one-time link the person uses to choose a password.
 *
 * `generateLink` does not send mail. With SMTP configured Supabase emails the
 * invite itself; without it the superadmin passes the returned link on. Either
 * way the link is the only way in, and it lands on `/admin/reset-password`.
 */
export async function approveAccessRequestAction(
  _prevState: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const context = await loadOwnerContext();
  if (!context.ok) return { error: "Only a superadmin can approve access." };
  if (!hasServiceRoleKey()) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is not set, so accounts cannot be created." };
  }

  const parsed = reviewSchema.safeParse({
    id: formString(formData, "id"),
    role: formString(formData, "role"),
  });
  if (!parsed.success) return { error: "That request or role is not valid." };

  const admin = createAdminClient();

  const { data: request, error: readError } = await admin
    .from("access_requests")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (readError || !request) return { error: "That request no longer exists." };
  if (request.status !== "pending") return { error: "That request has already been reviewed." };

  const email = request.email.trim().toLowerCase();

  // The address may already have an account — someone invited directly, for
  // instance. Then this is a role grant, not an invite.
  const { data: existing, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) {
    console.error("[access] user lookup failed", { message: listError.message });
    return { error: "Could not check existing accounts." };
  }

  const match = existing.users.find((user) => user.email?.toLowerCase() === email);
  let inviteLink: string | undefined;

  if (match) {
    const { error: roleError } = await admin
      .from("profiles")
      .upsert({ id: match.id, role: parsed.data.role }, { onConflict: "id" });
    if (roleError) {
      console.error("[access] role grant failed", { message: roleError.message });
      return { error: "Could not grant the role." };
    }
  } else {
    // Targets the auth callback, not the login page: a new account has no
    // password yet, so a login form would be a dead end.
    const { data: invited, error: inviteError } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: absoluteUrl("/admin/auth/callback?next=/admin/reset-password") },
    });

    if (inviteError || !invited.user) {
      console.error("[access] invite failed", { message: inviteError?.message });
      return { error: inviteError?.message ?? "Could not create the account." };
    }

    const { error: roleError } = await admin
      .from("profiles")
      .upsert(
        { id: invited.user.id, role: parsed.data.role, display_name: request.name },
        { onConflict: "id" },
      );
    if (roleError) {
      console.error("[access] role grant failed", { message: roleError.message });
      return { error: "Account created but the role could not be granted." };
    }

    inviteLink = invited.properties?.action_link;
  }

  const { error: statusError } = await admin
    .from("access_requests")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: context.user.id,
    })
    .eq("id", parsed.data.id);

  if (statusError) {
    console.error("[access] status update failed", { message: statusError.message });
  }

  revalidatePath("/admin/people");

  return {
    success: `Approved ${email} as ${parsed.data.role === "owner" ? "superadmin" : "admin"}.`,
    inviteLink,
  };
}

export async function declineAccessRequestAction(
  _prevState: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const context = await loadOwnerContext();
  if (!context.ok) return { error: "Only a superadmin can decline access." };

  const id = formString(formData, "id");
  if (!z.uuid().safeParse(id).success) return { error: "That request is not valid." };

  // Through the caller's session, so the owner-only RLS policy authorises it.
  const { error } = await context.supabase
    .from("access_requests")
    .update({
      status: "declined",
      reviewed_at: new Date().toISOString(),
      reviewed_by: context.user.id,
    })
    .eq("id", id);

  if (error) {
    console.error("[access] decline failed", { message: error.message });
    return { error: "Could not decline that request." };
  }

  revalidatePath("/admin/people");
  // No account was ever created, so there is nothing to clean up and nothing to
  // tell the requester unless a human chooses to.
  return { success: "Request declined. No account was created." };
}
