import { Mail, Phone, Building2 } from "lucide-react";

import { SubmitButton } from "@/components/admin/SubmitButton";
import { loadAdminContext } from "@/lib/blog/authz";
import { formatAdminDateTime } from "@/lib/blog/format";
import {
  STATUS_LABELS,
  countNewRequests,
  listConsultationRequests,
  type ConsultationRequest,
} from "@/lib/contact/requests";
import { setRequestStatusAction } from "@/lib/contact/triage-actions";

/**
 * Consultation requests from the public form.
 *
 * This screen is not a nicety. No SMTP is configured on the Supabase project, so
 * nothing emails you when a request arrives — this page is the only place a
 * submission is ever seen. Until outbound email exists, check it deliberately.
 */

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  new: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  contacted: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  archived: "border-white/15 bg-transparent text-muted-soft",
};

function StatusBadge({ status }: { status: ConsultationRequest["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function StatusButton({
  id,
  status,
  children,
}: {
  id: string;
  status: ConsultationRequest["status"];
  children: React.ReactNode;
}) {
  return (
    <form action={setRequestStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton
        pendingLabel="Saving…"
        className="text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
      >
        {children}
      </SubmitButton>
    </form>
  );
}

export default async function RequestsPage() {
  const context = await loadAdminContext();

  // The (dashboard) layout already gates this subtree; every admin surface
  // re-checks independently, because a layout is not a security boundary.
  if (!context.ok) {
    return (
      <div className="panel rounded-sm p-8">
        <h1 className="font-display text-xl font-semibold text-white">Requests</h1>
        <p className="mt-3 text-sm text-muted">Sign in again to view requests.</p>
      </div>
    );
  }

  const requests = await listConsultationRequests(context.supabase);
  const newCount = countNewRequests(requests);

  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">Consultation requests</h1>
        <p className="mt-2 text-sm text-muted">
          Submissions from the contact form. Nothing emails you when one arrives —
          no outbound mail is configured — so this page is where they live.
        </p>
      </div>

      {newCount > 0 ? (
        <div
          role="status"
          className="mt-6 rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          <span className="font-medium">
            {newCount} new request{newCount === 1 ? "" : "s"}.
          </span>{" "}
          Mark each one contacted once you have replied, so the queue stays honest.
        </div>
      ) : null}

      {requests.length === 0 ? (
        <div className="panel mt-8 rounded-sm p-8">
          <h2 className="font-display text-lg font-semibold text-white">No requests yet</h2>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
            When someone submits the form at <code className="font-mono">/contact</code>, it
            appears here. If you expected one and it is missing, check that
            <code className="font-mono"> SUPABASE_SERVICE_ROLE_KEY</code> is set on the
            deployment — the form writes with it.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {requests.map((request) => (
            <li key={request.id} className="panel rounded-sm p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">
                    {request.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                    <a
                      href={`mailto:${request.email}?subject=${encodeURIComponent("Your enquiry to Denalix Tech")}`}
                      className="inline-flex items-center gap-1.5 font-medium text-accent hover:text-white"
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                      {request.email}
                    </a>
                    {request.company ? (
                      <span className="inline-flex items-center gap-1.5 text-muted">
                        <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {request.company}
                      </span>
                    ) : null}
                    {request.phone ? (
                      <a
                        href={`tel:${request.phone}`}
                        className="inline-flex items-center gap-1.5 text-muted hover:text-white"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        {request.phone}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={request.status} />
                  <time className="text-xs text-muted-soft">
                    {formatAdminDateTime(request.created_at)}
                  </time>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-widest text-muted">
                    The business
                  </h3>
                  {/* whitespace-pre-line keeps the sender's paragraphs; React escapes
                      the text, so their input cannot inject markup. */}
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
                    {request.business_description}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-widest text-muted">
                    Help needed
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
                    {request.help_needed}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-white/8 pt-4">
                {request.status !== "contacted" ? (
                  <StatusButton id={request.id} status="contacted">
                    Mark contacted
                  </StatusButton>
                ) : null}
                {request.status !== "archived" ? (
                  <StatusButton id={request.id} status="archived">
                    Archive
                  </StatusButton>
                ) : null}
                {request.status !== "new" ? (
                  <StatusButton id={request.id} status="new">
                    Reopen
                  </StatusButton>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
