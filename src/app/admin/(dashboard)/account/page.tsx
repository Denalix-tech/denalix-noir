import Link from "next/link";

import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { loadAdminContext } from "@/lib/blog/authz";

/**
 * Your own account. Available to both admins and superadmins — changing your own
 * password needs no elevated role, and the action re-checks the session itself.
 */

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const context = await loadAdminContext();

  // The (dashboard) layout already gates this subtree; this is the independent
  // re-check every admin surface does, since a layout is not a security boundary.
  if (!context.ok) {
    return (
      <div className="panel rounded-sm p-8">
        <h1 className="font-display text-xl font-semibold text-white">Account</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Sign in again to manage your account.
        </p>
        <Link
          href="/admin/login"
          className="mt-6 inline-block text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">Account</h1>
        <p className="mt-2 text-sm text-muted">
          Signed in as <span className="text-white">{context.user.email}</span> —{" "}
          {context.isOwner ? "Superadmin" : "Admin"}.
        </p>
      </div>

      <section className="panel mt-8 rounded-sm p-6">
        <h2 className="font-display text-lg font-semibold text-white">Change password</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          Your current password is required. That way a stolen session cookie is
          not enough on its own to take over the account.
        </p>

        <ChangePasswordForm />
      </section>

      <section className="panel mt-6 rounded-sm p-6">
        <h2 className="font-display text-lg font-semibold text-white">Forgotten password</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          There is no self-service reset, on purpose. If you cannot sign in, a
          superadmin sends a recovery link from the Supabase dashboard under
          Authentication → Users.
        </p>
      </section>
    </>
  );
}
