"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { loadOwnerContext } from "./authz";
import { fieldErrors, formString } from "./schema";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import type { Database, ProfileRole } from "@/lib/supabase/database.types";
import { absoluteUrl } from "@/lib/site-url";

/**
 * Access management. Every action is owner-gated and re-checks on each call.
 *
 * Role writes deliberately go through the caller's own session so the
 * owner-only RLS policies apply. The service-role client is used only where
 * the anon key genuinely cannot reach: creating an account and reading
 * `auth.users`.
 */

export type PeopleFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  /** Shown so the owner can pass the invite on manually when SMTP is unset. */
  inviteLink?: string;
};

const inviteSchema = z.object({
  email: z.email("Enter a valid email address."),
  role: z.enum(["owner", "admin"]),
  displayName: z.string().trim().max(120).optional(),
});

const LAST_OWNER_MESSAGE = "Cannot remove the last owner. Promote someone else first.";

/** The database trigger is authoritative; this maps it to a readable message. */
function translateDbError(message: string | undefined): string {
  if (message?.includes("Cannot remove the last owner")) return LAST_OWNER_MESSAGE;
  if (message?.includes("profiles_role_check")) return "That is not a valid role.";
  return "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------------------
// Invite
// ---------------------------------------------------------------------------

export async function invitePersonAction(
  _prevState: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const context = await loadOwnerContext();
  if (!context.ok) return { error: "Only an owner can grant access." };

  if (!hasServiceRoleKey()) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set, so new accounts cannot be created. See README.md.",
    };
  }

  const parsed = inviteSchema.safeParse({
    email: formString(formData, "email").trim().toLowerCase(),
    role: formString(formData, "role"),
    displayName: formString(formData, "displayName"),
  });

  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { email, role, displayName } = parsed.data;
  const admin = createAdminClient();

  // An account may already exist — in that case this is a grant, not an invite.
  const { data: existing, error: lookupError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (lookupError) {
    console.error("[people] lookup failed", { message: lookupError.message });
    return { error: "Could not check existing accounts." };
  }

  const match = existing.users.find((user) => user.email?.toLowerCase() === email);

  if (match) {
    const granted = await upsertRole(context.supabase, match.id, role, displayName);
    if (granted) return { error: granted };

    revalidatePath("/admin/people");
    return { success: `${email} already had an account and is now ${role}.` };
  }

  // Invite links are emailed, so they must point at the production origin.
  //
  // The target is the auth callback, not /admin/login: an invited person has no
  // password yet, so a login form is a dead end. The callback verifies the invite,
  // signs them in, and sends them to /admin/reset-password to choose one.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: absoluteUrl("/admin/auth/callback?next=/admin/reset-password") },
  });

  if (error || !data.user) {
    console.error("[people] invite failed", { message: error?.message });
    return { error: error?.message ?? "Could not create the invitation." };
  }

  const granted = await upsertRole(context.supabase, data.user.id, role, displayName);
  if (granted) return { error: granted };

  revalidatePath("/admin/people");

  return {
    success: `Invited ${email} as ${role}.`,
    // generateLink does not send mail. With SMTP configured Supabase emails
    // invites itself; without it, the owner shares this link directly.
    inviteLink: data.properties?.action_link,
  };
}

// ---------------------------------------------------------------------------
// Change role / revoke
// ---------------------------------------------------------------------------

export async function setPersonRoleAction(formData: FormData): Promise<void> {
  const context = await loadOwnerContext();
  if (!context.ok) throw new Error("Only an owner can change roles.");

  const userId = formString(formData, "userId");
  const role = formString(formData, "role");

  if (role !== "owner" && role !== "admin") throw new Error("Invalid role.");
  if (!userId) throw new Error("Missing account id.");

  const failure = await upsertRole(context.supabase, userId, role, null);
  if (failure) throw new Error(failure);

  revalidatePath("/admin/people");
}

export async function revokeAccessAction(formData: FormData): Promise<void> {
  const context = await loadOwnerContext();
  if (!context.ok) throw new Error("Only an owner can revoke access.");

  const userId = formString(formData, "userId");
  if (!userId) throw new Error("Missing account id.");

  // Deleting the profile removes admin access. The login itself survives, so
  // the person simply lands on the access-denied page.
  const { error } = await context.supabase.from("profiles").delete().eq("id", userId);

  if (error) {
    console.error("[people] revoke failed", { userId, message: error.message });
    throw new Error(translateDbError(error.message));
  }

  revalidatePath("/admin/people");
}

/** Returns an error message, or null on success. */
async function upsertRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  role: ProfileRole,
  displayName: string | null | undefined,
): Promise<string | null> {
  const payload: { id: string; role: ProfileRole; display_name?: string | null } = {
    id: userId,
    role,
  };
  if (displayName) payload.display_name = displayName;

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("[people] role write failed", { userId, role, message: error.message });
    return translateDbError(error.message);
  }

  return null;
}
