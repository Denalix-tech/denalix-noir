import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/ui/Logo";
import { loadAdminContext, safeAdminRedirect } from "@/lib/blog/authz";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Reads the session on every request; never cache.
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
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

        <p className="mt-8 text-xs leading-relaxed text-muted-soft">
          Accounts are created by an administrator in the Supabase dashboard. Password resets are
          handled there as well.
        </p>
      </div>
    </main>
  );
}
