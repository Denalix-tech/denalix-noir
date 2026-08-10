import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Logo } from "@/components/ui/Logo";
import { signOutAction } from "@/lib/blog/auth-actions";
import { loadAdminContext } from "@/lib/blog/authz";
import { PATHNAME_HEADER } from "@/lib/supabase/proxy";

// Every render inspects the session, so this subtree is always dynamic.
export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await loadAdminContext();

  if (!context.ok) {
    if (context.reason === "unconfigured") return <ConfigurationNotice />;

    if (context.reason === "unauthenticated") {
      // Send the visitor back where they were headed after signing in.
      const pathname = (await headers()).get(PATHNAME_HEADER) ?? "/admin/posts";
      redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }

    // Signed in with no role yet — a self-service request nobody has approved.
    // Same denial as below; a different message so the person knows to wait
    // rather than assume something is broken.
    if (context.reason === "pending") return <AwaitingApproval />;

    // Authenticated but not an administrator: an explicit refusal, never the
    // admin interface.
    return <AccessDenied />;
  }

  const displayName = context.profile.display_name ?? context.user.email ?? "Administrator";

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10">
        <div className="container-px mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin/posts" className="flex items-center gap-2">
              <Logo className="h-7 w-7" />
              <span className="font-display text-base font-semibold tracking-tight text-white">
                Denalix Admin
              </span>
            </Link>

            <nav className="flex items-center gap-5" aria-label="Admin">
              <Link
                href="/admin/posts"
                className="text-sm font-medium text-muted transition-colors hover:text-white"
              >
                Posts
              </Link>
              {/* Hiding this from admins is cosmetic; the page enforces the
                  owner check itself. */}
              {context.isOwner ? (
                <Link
                  href="/admin/people"
                  className="text-sm font-medium text-muted transition-colors hover:text-white"
                >
                  People
                </Link>
              ) : null}
              <Link
                href="/admin/account"
                className="text-sm font-medium text-muted transition-colors hover:text-white"
              >
                Account
              </Link>
              <Link
                href="/blog"
                className="text-sm font-medium text-muted transition-colors hover:text-white"
              >
                View blog
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-soft">
              {displayName}
              <span className="ml-2 rounded-sm border border-white/15 px-1.5 py-0.5 text-xs text-muted">
                {/* `owner` in the database; "Superadmin" is the label the team uses. */}
                {context.isOwner ? "Superadmin" : "Admin"}
              </span>
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-sm border border-white/15 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-white/40"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="container-px mx-auto max-w-6xl py-10">{children}</main>
    </div>
  );
}

function ConfigurationNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="panel max-w-md rounded-sm p-8">
        <h1 className="font-display text-xl font-semibold text-white">Supabase not configured</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in{" "}
          <code className="font-mono">.env.local</code>, then restart the dev server. See{" "}
          <code className="font-mono">README.md</code> for the full setup.
        </p>
      </div>
    </main>
  );
}

function AwaitingApproval() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="panel max-w-md rounded-sm p-8">
        <h1 className="font-display text-xl font-semibold text-white">Awaiting approval</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Your account exists but no role has been granted yet. A superadmin has to
          approve it before you can reach the admin area.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-soft">
          Nothing more is needed from you. You will be able to sign in normally
          once it is approved.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-sm border border-white/15 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-white/40"
            >
              Sign out
            </button>
          </form>
          <Link href="/" className="text-sm font-medium text-muted hover:text-white">
            Back to site
          </Link>
        </div>
      </div>
    </main>
  );
}

function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="panel max-w-md rounded-sm p-8">
        <h1 className="font-display text-xl font-semibold text-white">Access denied</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          This account is signed in but does not have administrator access.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-sm border border-white/15 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-white/40"
            >
              Sign out
            </button>
          </form>
          <Link href="/" className="text-sm font-medium text-muted hover:text-white">
            Back to site
          </Link>
        </div>
      </div>
    </main>
  );
}
