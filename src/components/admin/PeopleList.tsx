import { Crown, PenLine, MinusCircle } from "lucide-react";

import { RevokeAccessButton } from "./RevokeAccessButton";
import { SubmitButton } from "./SubmitButton";
import { setPersonRoleAction } from "@/lib/blog/people-actions";
import { formatAdminDateTime } from "@/lib/blog/format";
import type { Person } from "@/lib/blog/people";

function RoleBadge({ role }: { role: Person["role"] }) {
  // Icon and label carry the meaning; colour only reinforces it.
  const config = {
    owner: { Icon: Crown, label: "Superadmin", className: "border-amber-500/40 bg-amber-500/10 text-amber-200" },
    admin: { Icon: PenLine, label: "Admin", className: "border-white/20 bg-white/5 text-white" },
    // No profile row. Either a self-service request or an invite never accepted;
    // both need the same thing from a superadmin, so they read the same here.
    none: {
      Icon: MinusCircle,
      label: "Awaiting approval",
      className: "border-amber-500/30 bg-amber-500/5 text-amber-200/80",
    },
  }[role ?? "none"];

  const { Icon, label, className } = config;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs font-medium ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function RoleButton({
  userId,
  role,
  children,
}: {
  userId: string;
  role: "owner" | "admin";
  children: React.ReactNode;
}) {
  return (
    <form action={setPersonRoleAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={role} />
      <SubmitButton
        pendingLabel="Saving…"
        className="text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
      >
        {children}
      </SubmitButton>
    </form>
  );
}

type Props = {
  people: Person[];
  ownerCount: number;
  currentUserId: string;
};

export function PeopleList({ people, ownerCount, currentUserId }: Props) {
  return (
    <ul className="mt-6 space-y-3">
      {people.map((person) => {
        const isSelf = person.id === currentUserId;
        const isLastOwner = person.role === "owner" && ownerCount <= 1;

        return (
          <li key={person.id} className="panel rounded-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="truncate text-sm font-semibold text-white">
                    {person.email ?? "(no email)"}
                  </p>
                  <RoleBadge role={person.role} />
                  {isSelf ? (
                    <span className="text-xs text-muted-soft">you</span>
                  ) : null}
                  {person.pending ? (
                    <span className="rounded-sm border border-white/15 px-2 py-0.5 text-xs text-muted">
                      Invite pending
                    </span>
                  ) : null}
                </div>

                {person.displayName ? (
                  <p className="mt-1 text-xs text-muted">{person.displayName}</p>
                ) : null}

                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-soft">
                  <div className="flex gap-1.5">
                    <dt>Last sign-in:</dt>
                    <dd>{formatAdminDateTime(person.lastSignInAt)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Account created:</dt>
                    <dd>{formatAdminDateTime(person.createdAt)}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {person.role === null ? (
                  <>
                    <RoleButton userId={person.id} role="admin">
                      Grant admin
                    </RoleButton>
                    <RoleButton userId={person.id} role="owner">
                      Grant superadmin
                    </RoleButton>
                  </>
                ) : null}

                {person.role === "admin" ? (
                  <RoleButton userId={person.id} role="owner">
                    Make superadmin
                  </RoleButton>
                ) : null}

                {person.role === "owner" ? (
                  isLastOwner ? (
                    <span className="text-sm text-muted-soft">
                      Last owner — promote someone else first
                    </span>
                  ) : (
                    <RoleButton userId={person.id} role="admin">
                      Make admin
                    </RoleButton>
                  )
                ) : null}

                {person.role !== null ? (
                  <RevokeAccessButton
                    userId={person.id}
                    email={person.email}
                    disabled={isSelf || isLastOwner}
                    disabledReason={
                      isSelf ? "You cannot revoke your own access" : "Last owner cannot be removed"
                    }
                  />
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
