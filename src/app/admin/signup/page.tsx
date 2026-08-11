import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessRequestForm } from "@/components/admin/AccessRequestForm";
import { Logo } from "@/components/ui/Logo";
import { loadAdminContext } from "@/lib/blog/authz";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Request admin access.
 *
 * Asking creates no account — only a row in `access_requests`. A superadmin
 * approves, which creates the account, grants the role, and produces a one-time
 * link the person uses to choose their own password.
 *
 * That ordering replaced an invite-code form that asked a stranger to pick a
 * password up front. It left half-formed accounts behind when a request was
 * refused, and it needed a shared code that had to be distributed and rotated —
 * a credential to manage for no security benefit, since approval was always the
 * real gate.
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
          Give us the email address you want access for. A superadmin reviews the
          request, and if it is approved you will get a one-time link to set your
          own password.
        </p>

        {!isSupabaseConfigured() ? (
          <div
            role="alert"
            className="mt-6 rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            Supabase is not configured yet, so requests cannot be recorded. See{" "}
            <code className="font-mono">README.md</code>.
          </div>
        ) : (
          <AccessRequestForm />
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

        <p className="mt-4 text-xs leading-relaxed text-muted-soft">
          No account is created until a superadmin approves the request, and no
          password is chosen until then either.
        </p>
      </div>
    </main>
  );
}
