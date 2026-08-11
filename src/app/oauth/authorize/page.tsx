import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { loadAdminContext } from "@/lib/blog/authz";
import {
  buildRedirect,
  readAuthorizeParams,
  validateAuthorizeRequest,
} from "@/lib/mcp-auth/authorize-request";
import { approveAuthorizationAction, denyAuthorizationAction } from "@/lib/mcp-auth/actions";
import { SCOPE_DESCRIPTIONS, isMcpOAuthEnabled } from "@/lib/mcp-auth/config";

/**
 * OAuth 2.1 authorization endpoint and consent screen.
 *
 * Human identity is not reimplemented here. An unauthenticated visitor is sent
 * to the existing `/admin/login`, which is the same Supabase password flow the
 * admin portal uses, and returns here afterwards. So "who are you" stays in one
 * place and this page only answers "do you approve this client".
 *
 * Only administrators can approve. That is what makes open dynamic client
 * registration safe — registering a client grants nothing by itself.
 */

export const metadata: Metadata = {
  title: "Authorize application — Denalix Tech",
  robots: { index: false, follow: false, nocache: true },
};

// Inspects the session on every render.
export const dynamic = "force-dynamic";

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isMcpOAuthEnabled()) notFound();

  const resolved = await searchParams;

  // Rebuild the exact query string so the consent form can post it back and the
  // action can re-validate the identical request.
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0] !== undefined) query.set(key, value[0]);
  }

  const params = readAuthorizeParams(query);

  // Validation reads the client from the database. A fault there must not
  // surface as an unstyled 500 on an endpoint a browser lands on directly.
  let validation;
  try {
    validation = await validateAuthorizeRequest(params);
  } catch (error) {
    console.error("[mcp-oauth] authorize validation failed", {
      clientId: params.clientId,
      message: error instanceof Error ? error.message : String(error),
    });
    return (
      <AuthorizeError message="The authorization request could not be checked right now. Please try again." />
    );
  }

  // RFC 6749 §4.1.2.1: an untrusted client_id or redirect_uri must not be
  // redirected to. Show the error here instead.
  if (validation.kind === "fatal") {
    return <AuthorizeError message={validation.message} />;
  }

  if (validation.kind === "redirect-error") {
    redirect(
      buildRedirect(validation.redirectUri, {
        error: validation.error,
        error_description: validation.description,
        state: validation.state,
      }),
    );
  }

  const context = await loadAdminContext();

  if (!context.ok) {
    if (context.reason === "unconfigured") {
      return <AuthorizeError message="Supabase is not configured on this deployment." />;
    }

    if (context.reason === "unauthenticated") {
      // Reuses the admin login, then returns to this exact request.
      const next = `/oauth/authorize?${query.toString()}`;
      redirect(`/admin/login?next=${encodeURIComponent(next)}`);
    }

    return (
      <AuthorizeError message="This account is signed in but is not a Denalix administrator, so it cannot authorize applications." />
    );
  }

  const { client, selectable, preselected } = validation;
  const requestPayload = query.toString();
  const clientLabel = client.client_name?.trim() || client.client_id;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="panel w-full max-w-lg rounded-sm p-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted">
          Authorization request
        </p>

        <h1 className="mt-3 font-display text-2xl font-semibold text-white">
          Allow {clientLabel} to draft posts?
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          Signed in as{" "}
          <span className="text-white">{context.profile.display_name ?? context.user.email}</span>.
          Approving issues this application a token that acts on your behalf.
        </p>

        {/* One form, so the checkboxes post with Approve. Deny is separate — it
            needs no selection. */}
        <form action={approveAuthorizationAction} className="mt-6">
          <input type="hidden" name="oauth_request" value={requestPayload} />

          <fieldset className="rounded-sm border border-white/10 p-4">
            <legend className="px-1 text-xs font-medium uppercase tracking-widest text-muted">
              Permissions to grant
            </legend>

            <ul className="mt-2 space-y-4">
              {selectable.map((scope) => (
                <li key={scope}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name="scope"
                      value={scope}
                      defaultChecked={preselected.includes(scope)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-white"
                    />
                    <span className="text-sm leading-relaxed">
                      <code className="font-mono text-white">{scope}</code>
                      <span className="mt-1 block text-muted">{SCOPE_DESCRIPTIONS[scope]}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs leading-relaxed text-muted-soft">
              Untick anything you would rather not grant. Without{" "}
              <code className="font-mono">blog:draft</code> the application can read
              but not create — which is usually not what you want from a drafting
              tool.
            </p>
          </fieldset>

          <p className="mt-4 text-sm leading-relaxed text-muted-soft">
            Whatever you grant, this application <span className="text-white">cannot publish</span>,
            edit live posts, or delete anything. Drafts it creates wait for your
            review in the admin panel.
          </p>

          <dl className="mt-6 space-y-1 text-xs text-muted-soft">
            <div className="flex gap-2">
              <dt>Redirects to</dt>
              <dd className="truncate font-mono text-muted">{validation.params.redirectUri}</dd>
            </div>
            <div className="flex gap-2">
              <dt>Client ID</dt>
              <dd className="truncate font-mono text-muted">{client.client_id}</dd>
            </div>
          </dl>

          <button
            type="submit"
            className="mt-8 rounded-sm bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Approve
          </button>
        </form>

        <form action={denyAuthorizationAction} className="mt-3">
          <input type="hidden" name="oauth_request" value={requestPayload} />
          <button
            type="submit"
            className="rounded-sm border border-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/40"
          >
            Deny
          </button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-muted-soft">
          Only approve applications you started connecting yourself. If you did not
          initiate this, deny it.
        </p>
      </div>
    </main>
  );
}

function AuthorizeError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="panel max-w-md rounded-sm p-8">
        <h1 className="font-display text-xl font-semibold text-white">
          Authorization request rejected
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-soft">
          Nothing was authorized. You were not redirected, because the request did
          not identify a client and redirect target this server trusts.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-muted hover:text-white"
        >
          Back to site
        </Link>
      </div>
    </main>
  );
}
