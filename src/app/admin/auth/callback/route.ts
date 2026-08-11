import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { RECOVERY_COOKIE, recoveryCookieOptions } from "@/lib/blog/recovery";
import { safeAdminRedirect } from "@/lib/blog/authz";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Where Supabase sends people after they click a link in an auth email —
 * password recovery, email confirmation, or an invite.
 *
 * Without this route the emailed link lands on a page that does nothing with the
 * token, which is exactly the "I get the email but there's no reset page" symptom.
 *
 * Two token shapes are handled, because which one arrives depends on the email
 * template:
 *
 *   * `token_hash` + `type` — what the templates send when they use
 *     `{{ .TokenHash }}`. Verified with `verifyOtp`.
 *   * `code` — the PKCE parameter Supabase's own `/auth/v1/verify` endpoint
 *     appends when redirecting on from the default `{{ .ConfirmationURL }}`.
 *     Exchanged with `exchangeCodeForSession`.
 *
 * Both establish a session and write cookies through the request-scoped client,
 * so the visitor is signed in when they reach the next page.
 *
 * **This route must be listed in Supabase → Authentication → URL Configuration →
 * Redirect URLs**, or Supabase refuses the target and falls back to the Site URL.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failure(reason: string): never {
  redirect(`/admin/login?error=${encodeURIComponent(reason)}`);
}

export async function GET(request: NextRequest): Promise<never> {
  if (!isSupabaseConfigured()) failure("Supabase is not configured on this deployment.");

  const params = request.nextUrl.searchParams;

  // Supabase reports its own failures (an expired link, most often) this way.
  const providerError = params.get("error_description") ?? params.get("error");
  if (providerError) {
    failure(
      /expired/i.test(providerError)
        ? "That link has expired. Request a new one."
        : "That link is not valid. Request a new one.",
    );
  }

  const type = params.get("type") as EmailOtpType | null;
  const tokenHash = params.get("token_hash");
  const code = params.get("code");

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      console.error("[auth] verifyOtp failed", { type, message: error.message });
      failure("That link has expired or was already used. Request a new one.");
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth] code exchange failed", { message: error.message });
      failure("That link has expired or was already used. Request a new one.");
    }
  } else {
    failure("That link is missing its token. Request a new one.");
  }

  // Recovery and invite both legitimately set a password without knowing a
  // current one — a recovery link because it has been forgotten, an invite
  // because there has never been one. Both therefore get the short-lived marker
  // the set-password page requires.
  //
  // Without this an invited person was stuck: verifying the invite signs them in,
  // but they have no password, and /admin/account demands the current one to
  // change it. Their only way through was "forgot password", which is a strange
  // thing to ask of someone who has just been invited.
  if (type === "recovery" || type === "invite" || params.get("next") === "/admin/reset-password") {
    const store = await cookies();
    store.set(RECOVERY_COOKIE, "1", recoveryCookieOptions);
    redirect("/admin/reset-password");
  }

  // Confirmation and invite links just land the visitor in the admin area, where
  // the usual authorization applies — including "awaiting approval".
  redirect(safeAdminRedirect(params.get("next")));
}
