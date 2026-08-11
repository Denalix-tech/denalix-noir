"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";

import { SubmitButton } from "./SubmitButton";
import {
  approveAccessRequestAction,
  declineAccessRequestAction,
} from "@/lib/blog/access-request-actions";
import type { ReviewState } from "@/lib/blog/access-request-state";
import type { AccessRequest } from "@/lib/blog/access-requests";

const INITIAL: ReviewState = {};

/**
 * Pending access requests, with approve/decline.
 *
 * Approving is the moment the account comes into existence, so the role is chosen
 * here rather than defaulted — there is no sensible default between "can publish"
 * and "can also grant access to others".
 */
export function AccessRequestList({ requests }: { requests: AccessRequest[] }) {
  const [approveState, approve] = useActionState(approveAccessRequestAction, INITIAL);
  const [declineState, decline] = useActionState(declineAccessRequestAction, INITIAL);

  if (requests.length === 0) return null;

  const notice = approveState.error || declineState.error;
  const success = approveState.success || declineState.success;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-amber-200" aria-hidden="true" />
        <h2 className="font-display text-lg font-semibold text-white">
          Access requests
          <span className="ml-2 rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-200">
            {requests.length} pending
          </span>
        </h2>
      </div>

      <p className="mt-2 max-w-prose text-sm text-muted">
        Approving creates the account and emails a one-time link for the person to
        set their own password. Declining creates nothing.
      </p>

      {notice ? (
        <div
          role="alert"
          className="mt-4 rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {notice}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="mt-4 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-100"
        >
          <p className="font-medium">{success}</p>
          {approveState.inviteLink ? (
            <>
              <p className="mt-2">
                No outbound email is configured, so Supabase did not send this.
                Send it to them yourself — it works once, and sets their password.
              </p>
              {/* break-all so a long token wraps instead of overflowing. */}
              <code className="mt-2 block break-all rounded-sm bg-black/30 p-2 font-mono text-xs text-emerald-200">
                {approveState.inviteLink}
              </code>
            </>
          ) : null}
        </div>
      ) : null}

      <ul className="mt-6 space-y-3">
        {requests.map((request) => (
          <li key={request.id} className="panel rounded-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-white">{request.email}</p>
                {request.name ? (
                  <p className="mt-1 text-sm text-muted">{request.name}</p>
                ) : null}
                {request.reason ? (
                  <p className="mt-2 max-w-prose whitespace-pre-line text-sm leading-relaxed text-muted">
                    {request.reason}
                  </p>
                ) : (
                  <p className="mt-2 text-sm italic text-muted-soft">No reason given.</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <form action={approve} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={request.id} />
                  <label htmlFor={`role-${request.id}`} className="sr-only">
                    Role to grant
                  </label>
                  <select
                    id={`role-${request.id}`}
                    name="role"
                    defaultValue="admin"
                    className="rounded-sm border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white focus:border-white/40 focus:outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="owner">Superadmin</option>
                  </select>
                  <SubmitButton
                    pendingLabel="Approving…"
                    className="rounded-sm bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-white/90"
                  >
                    Approve
                  </SubmitButton>
                </form>

                <form action={decline}>
                  <input type="hidden" name="id" value={request.id} />
                  <SubmitButton
                    pendingLabel="Declining…"
                    className="text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
                  >
                    Decline
                  </SubmitButton>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
