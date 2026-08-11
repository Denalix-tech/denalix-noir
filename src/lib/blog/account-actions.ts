"use server";

import { createClient as createStandaloneClient } from "@supabase/supabase-js";

import { loadAdminContext } from "./authz";
import { changePasswordSchema, fieldErrors, formString } from "./schema";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Self-service account actions: requesting access, and changing your own
 * password.
 *
 * **Requesting access grants nothing.** `signUp` creates an `auth.users` row and
 * no `profiles` row, and `profiles` may only be inserted by a superadmin — the
 * `profiles: owners insert` policy checks `is_owner()`. So the approval gate is
 * Postgres RLS, not a flag this file sets. That preserves the property the
 * invite-only flow had: nobody reaches the admin area until a superadmin
 * deliberately grants a role.
 *
 * The invite code only suppresses drive-by signups. It is not authorization.
 */

export type ChangePasswordState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

// ---------------------------------------------------------------------------
// Change password
// ---------------------------------------------------------------------------

/**
 * Verifies a password without touching the caller's session.
 *
 * `signInWithPassword` on the request-scoped server client would write a fresh
 * set of auth cookies as a side effect. This uses a throwaway client with
 * `persistSession: false`, so the check is read-only as far as the live session
 * is concerned.
 */
async function currentPasswordIsCorrect(email: string, password: string): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config) return false;

  const probe = createStandaloneClient<Database>(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { error } = await probe.auth.signInWithPassword({ email, password });
  // Drop the session this created immediately; it lives only in memory, but
  // there is no reason to leave a refresh token valid.
  if (!error) await probe.auth.signOut();

  return !error;
}

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  // A Server Action is a public endpoint, so this re-checks rather than trusting
  // that the page rendered for an administrator.
  const context = await loadAdminContext();
  if (!context.ok) {
    return { formError: "Sign in again to change your password." };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formString(formData, "currentPassword"),
    newPassword: formString(formData, "newPassword"),
    confirmPassword: formString(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const email = context.user.email;
  if (!email) {
    return { formError: "This account has no email address, so its password cannot be changed here." };
  }

  // Supabase's updateUser does not ask for the current password, so a stolen
  // session cookie would otherwise be enough to lock the owner out of their own
  // account. Requiring it makes session theft insufficient on its own.
  if (!(await currentPasswordIsCorrect(email, parsed.data.currentPassword))) {
    return { fieldErrors: { currentPassword: "That is not your current password." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });

  if (error) {
    console.error("[account] password change failed", {
      userId: context.user.id,
      message: error.message,
    });

    if (error.status === 422) {
      return {
        fieldErrors: { newPassword: "Supabase rejected that password. Try a longer one." },
      };
    }
    return { formError: "Could not change the password. Please try again." };
  }

  return { success: "Password changed. Other devices stay signed in until their sessions expire." };
}
