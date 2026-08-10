"use server";

import { redirect } from "next/navigation";

import { loadAdminContext } from "@/lib/blog/authz";
import { isMcpOAuthEnabled } from "./config";
import {
  buildRedirect,
  readAuthorizeParams,
  validateAuthorizeRequest,
} from "./authorize-request";
import { issueAuthorizationCode } from "./store";

/**
 * Consent decisions for the OAuth authorization endpoint.
 *
 * A Server Action is a public HTTP endpoint, so this re-runs the full check the
 * page ran: OAuth enabled, caller is a signed-in Denalix administrator, and the
 * authorization request is valid for the named client. None of that is inherited
 * from having rendered the consent screen.
 */

/** The consent form posts the original query string back, verbatim. */
function paramsFrom(formData: FormData): URLSearchParams {
  const raw = formData.get("oauth_request");
  return new URLSearchParams(typeof raw === "string" ? raw : "");
}

export async function approveAuthorizationAction(formData: FormData): Promise<void> {
  if (!isMcpOAuthEnabled()) redirect("/");

  // Authorization, re-checked. This is the gate that makes open dynamic client
  // registration safe: only an administrator can turn a registered client into
  // one holding a usable grant.
  const context = await loadAdminContext();
  if (!context.ok) redirect("/admin/login");

  const params = readAuthorizeParams(paramsFrom(formData));
  const validation = await validateAuthorizeRequest(params);

  // Re-validated rather than trusted from the form, so a crafted POST cannot
  // approve a redirect_uri that was never registered.
  if (validation.kind === "fatal") {
    redirect(`/oauth/authorize/error?message=${encodeURIComponent(validation.message)}`);
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

  const code = await issueAuthorizationCode({
    clientId: validation.client.client_id,
    userId: context.user.id,
    redirectUri: validation.params.redirectUri,
    codeChallenge: validation.params.codeChallenge,
    scopes: validation.scopes,
    resource: validation.params.resource,
  });

  // redirect() throws internally, so it must never sit inside a try/catch.
  redirect(
    buildRedirect(validation.params.redirectUri, {
      code,
      state: validation.params.state,
    }),
  );
}

export async function denyAuthorizationAction(formData: FormData): Promise<void> {
  if (!isMcpOAuthEnabled()) redirect("/");

  const params = readAuthorizeParams(paramsFrom(formData));
  const validation = await validateAuthorizeRequest(params);

  if (validation.kind === "fatal") {
    redirect(`/oauth/authorize/error?message=${encodeURIComponent(validation.message)}`);
  }

  const redirectUri =
    validation.kind === "ok" ? validation.params.redirectUri : validation.redirectUri;
  const state = validation.kind === "ok" ? validation.params.state : validation.state;

  redirect(
    buildRedirect(redirectUri, {
      error: "access_denied",
      error_description: "The administrator declined the request.",
      state,
    }),
  );
}
