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
        <h1 className="font-display text-xl font-semibold text-white">Owners only</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Managing access is restricted to owners. Ask an owner if you need a role changed.
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

  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">People</h1>
        <p className="mt-2 text-sm text-muted">
          Owners manage access and posts. Admins manage posts only.
        </p>
      </div>

      <div className="mt-8">
        <InviteForm />
      </div>

      <PeopleList people={people} ownerCount={ownerCount} currentUserId={context.user.id} />
    </>
  );
}
