import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/admin/SignUpForm";
import { Logo } from "@/components/ui/Logo";
import { isSignUpEnabled } from "@/lib/blog/signup-config";
import { loadAdminContext } from "@/lib/blog/authz";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Self-service access request.
 *
 * Creating an account here grants nothing: `signUp` writes an `auth.users` row
 * and no `profiles` row, and only a superadmin can insert the latter. So this
 * page changes the *shape* of onboarding — request-then-approve instead of
 * invite-then-accept — without weakening the guarantee that access is always
 * granted deliberately by a human.
 */

export const metadata: Metadata = {
  title: "Request admin access — Denalix Tech",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function AdminSignUpPage() {
  // Somebody already signed in has no use for this page.
  const context = await loadAdminContext();
  if (context.ok) redirect("/admin/posts");

  const enabled = isSignUpEnabled();

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
          Request admin access
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Requests are reviewed by a superadmin. You will not be able to sign in
          until one approves your account.
        </p>

        {!isSupabaseConfigured() ? (
          <div
            role="alert"
            className="mt-6 rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            Supabase is not configured yet. Add the environment variables described in{" "}
            <code className="font-mono">README.md</code> to enable sign-up.
          </div>
        ) : !enabled ? (
          <div
            role="alert"
            className="mt-6 rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-100"
          >
            <p className="font-medium">Sign-up is closed.</p>
            <p className="mt-1.5">
              No invite code is configured on this deployment, so requests are not
              being accepted. A superadmin can still add you directly from the
              People screen.
            </p>
          </div>
        ) : (
          <SignUpForm />
        )}

        <p className="mt-8 text-sm text-muted">
          Already have access?{" "}
          <Link
            href="/admin/login"
            className="font-medium text-white underline underline-offset-4 hover:text-white/80"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
