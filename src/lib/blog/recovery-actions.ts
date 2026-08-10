"use server";

import { cookies } from "next/headers";

import { fieldErrors, formString, requestResetSchema, setNewPasswordSchema } from "./schema";
import { RECOVERY_COOKIE } from "./recovery";
import { absoluteUrl } from "@/lib/site-url";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Password recovery: requesting a link, and setting a password from one.
 *
 * The current-password check on `/admin/account` deliberately does not apply
 * here — the password has been forgotten. What stands in for it is the emailed
 * token, verified by `/admin/auth/callback`, which then issues the short-lived
 * recovery cookie this file requires.
 */

export type RequestResetState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  /** Set on completion. Shown whether or not the address exists. */
  submitted?: boolean;
};

export type SetPasswordState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function requestPasswordResetAction(
  _prevState: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  if (!isSupabaseConfigured()) {
    return { formError: "Password recovery is unavailable because Supabase is not configured." };
  }

  const parsed = requestResetSchema.safeParse({ email: formString(formData, "email") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    // Must be present in Supabase's Redirect URLs allow list, or Supabase
    // substitutes the Site URL and the link goes nowhere useful.
    redirectTo: absoluteUrl("/admin/auth/callback?next=/admin/reset-password"),
  });

  if (error) {
    console.error("[recovery] reset email failed", { message: error.message });

    // Rate limiting is the one failure worth naming: it is resolvable by waiting,
    // and on Supabase's built-in SMTP it is easy to hit.
    if (error.status === 429) {
      return { formError: "Too many requests. Wait a few minutes and try again." };
    }
  }

  // Always the same answer, error or not: distinguishing "no such account" would
  // turn this form into an account-enumeration oracle.
  return { submitted: true };
}

export async function setNewPasswordAction(
  _prevState: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const store = await cookies();

  // The marker proves this session came from a recovery link rather than from a
  // stolen cookie. Without it, this action would be a password-reset bypass.
  if (store.get(RECOVERY_COOKIE)?.value !== "1") {
    return {
      formError:
        "This password reset is no longer valid. Request a new link and use it within 15 minutes.",
    };
  }

  const parsed = setNewPasswordSchema.safeParse({
    newPassword: formString(formData, "newPassword"),
    confirmPassword: formString(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();

  // The recovery token established a real session, so this is an ordinary
  // self-update; there is no separate token to pass here.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      formError: "The recovery link has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });

  if (error) {
    console.error("[recovery] password update failed", {
      userId: user.id,
      message: error.message,
    });

    // Supabase rejects reusing the current password on some configurations.
    if (/same.*password/i.test(error.message)) {
      return {
        fieldErrors: { newPassword: "Choose a password you have not used before." },
      };
    }
    return { formError: "Could not set the password. Request a new link and try again." };
  }

  // One marker, one reset.
  store.delete(RECOVERY_COOKIE);

  return { success: true };
}
