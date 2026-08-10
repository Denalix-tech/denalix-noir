import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/ui/Logo";
import { loadAdminContext, safeAdminRedirect } from "@/lib/blog/authz";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Reads the session on every request; never cache.
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const { next, error } = await searchParams;
  const target = safeAdminRedirect(next);

  // An administrator who is already signed in has no reason to see this page.
  const context = await loadAdminContext();
  if (context.ok) redirect(target);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            Denalix
          </span>
        </Link>

        <h1 className="font-display mt-10 text-2xl font-semibold text-white">Admin sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This area is restricted to Denalix administrators.
        </p>

        {/* Set by /admin/auth/callback when an emailed link is expired, reused, or
            malformed. Rendered as text by React, so a crafted value cannot inject
            markup — and it is truncated so it cannot be used to paste a wall of
            attacker-chosen text onto the page. */}
        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-200"
          >
            <p>{error.slice(0, 200)}</p>
            <Link
              href="/admin/forgot-password"
              className="mt-2 inline-block font-medium text-white underline underline-offset-4"
            >
              Request a new link
            </Link>
          </div>
        ) : null}

        {!isSupabaseConfigured() ? (
          <div
            role="alert"
            className="mt-6 rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            Supabase is not configured yet. Add the environment variables described in{" "}
            <code className="font-mono">README.md</code> to enable sign-in.
          </div>
        ) : (
          <LoginForm next={target} />
        )}

        <p className="mt-6 text-sm text-muted">
          <Link
            href="/admin/forgot-password"
            className="font-medium text-white underline underline-offset-4 hover:text-white/80"
          >
            Forgot your password?
          </Link>
        </p>

        <p className="mt-3 text-sm text-muted">
          Need access?{" "}
          <Link
            href="/admin/signup"
            className="font-medium text-white underline underline-offset-4 hover:text-white/80"
          >
            Request an account
          </Link>
        </p>

        <p className="mt-4 text-xs leading-relaxed text-muted-soft">
          Every request is approved by a superadmin before it grants access.
        </p>
      </div>
    </main>
  );
}
