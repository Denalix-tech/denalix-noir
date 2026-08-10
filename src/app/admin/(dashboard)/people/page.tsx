import Link from "next/link";

import { InviteForm } from "@/components/admin/InviteForm";
import { PeopleList } from "@/components/admin/PeopleList";
import { loadOwnerContext } from "@/lib/blog/authz";
import { countOwners, listPeople } from "@/lib/blog/people";
import { hasServiceRoleKey } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  // Owner-only. The nav link is hidden from plain admins, but that is
  // cosmetic — this check is what actually protects the page.
  const context = await loadOwnerContext();

  if (!context.ok) {
    return (
      <div className="panel rounded-sm p-8">
        <h1 className="font-display text-xl font-semibold text-white">Superadmins only</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Managing access is restricted to superadmins. Ask one if you need a role changed.
        </p>
        <Link
          href="/admin/posts"
          className="mt-6 inline-block text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
        >
          Back to posts
        </Link>
      </div>
    );
  }

  if (!hasServiceRoleKey()) {
    return (
      <div className="panel rounded-sm p-8">
        <h1 className="font-display text-xl font-semibold text-white">People</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          This screen needs <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
          <code className="font-mono">.env.local</code> to read the account list. Add it (without a{" "}
          <code className="font-mono">NEXT_PUBLIC_</code> prefix) and restart the dev server. See{" "}
          <code className="font-mono">README.md</code>.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Publishing works fine without it — only access management is affected.
        </p>
      </div>
    );
  }

  const [people, ownerCount] = await Promise.all([listPeople(), countOwners()]);

  // Accounts that exist without a role: self-service requests, and invites never
  // accepted. Granting a role is the approval.
  const awaitingApproval = people.filter((person) => person.role === null).length;

  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">People</h1>
        <p className="mt-2 text-sm text-muted">
          Superadmins manage access, posts, and approve new accounts. Admins manage posts only.
        </p>
      </div>

      {awaitingApproval > 0 ? (
        <div
          role="status"
          className="mt-6 rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-100"
        >
          <span className="font-medium">
            {awaitingApproval} account{awaitingApproval === 1 ? "" : "s"} awaiting approval.
          </span>{" "}
          Granting a role is what approves an account — until then it can sign in but
          reaches nothing. Revoke instead if you do not recognise the address.
        </div>
      ) : null}

      <div className="mt-8">
        <InviteForm />
      </div>

      <PeopleList people={people} ownerCount={ownerCount} currentUserId={context.user.id} />
    </>
  );
}
