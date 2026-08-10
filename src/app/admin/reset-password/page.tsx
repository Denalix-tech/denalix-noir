import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { ResetPasswordForm } from "@/components/admin/ResetPasswordForm";
import { Logo } from "@/components/ui/Logo";
import { RECOVERY_COOKIE } from "@/lib/blog/recovery";

/**
 * Sets a password from a recovery link.
 *
 * Deliberately outside the `(dashboard)` group: that layout demands a profile row,
 * and someone recovering their password may be awaiting approval, or an admin
 * whose role has not changed — either way they should still be able to finish
 * resetting.
 *
 * Reachable only with the recovery marker cookie, which `/admin/auth/callback`
 * issues after verifying an emailed token. A session alone is not enough, so a
 * stolen cookie cannot be used to set a password without knowing the old one —
 * `/admin/account` is the path that requires the current password.
 */

export const metadata: Metadata = {
  title: "Set a new password — Denalix Tech",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const store = await cookies();
  const fromRecovery = store.get(RECOVERY_COOKIE)?.value === "1";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            Denalix
          </span>
        </Link>

        <h1 className="font-display mt-10 text-2xl font-semibold text-white">
          Set a new password
        </h1>

        {fromRecovery ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Choose a new password for your account. This link works once.
            </p>
            <ResetPasswordForm />
          </>
        ) : (
          <>
            <div
              role="alert"
              className="mt-6 rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-100"
            >
              <p className="font-medium">Open this page from your reset email.</p>
              <p className="mt-1.5">
                This page needs a valid recovery link. Links expire, and each one
                can only be used once.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/admin/forgot-password"
                className="rounded-sm bg-white px-4 py-2.5 text-center text-sm font-semibold text-black transition-colors hover:bg-white/90"
              >
                Request a reset link
              </Link>
              <Link
                href="/admin/account"
                className="text-center text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
              >
                Already signed in? Change it from your account
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
