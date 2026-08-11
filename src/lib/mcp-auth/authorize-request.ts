import type { OAuthClientRow } from "@/lib/supabase/database.types";

import { SUPPORTED_SCOPES, selectableScopes, type Scope } from "./config";
import type { AuthorizeParams } from "./params";
import { findClient, isRegisteredRedirectUri } from "./store";

// Re-exported so callers have a single import for the authorization endpoint.
// The definitions live in `params.ts`, which stays free of `server-only`.
export { readAuthorizeParams, buildRedirect, type AuthorizeParams } from "./params";

/**
 * Validation for an incoming authorization request, shared by the consent page
 * and the approval Server Action.
 *
 * Both must validate independently. The page renders the consent screen; the
 * action issues a code. If only the page validated, a crafted POST straight to
 * the action would skip every check.
 *
 * RFC 6749 §4.1.2.1 draws a line this module preserves: when `client_id` or
 * `redirect_uri` is bad, the server must NOT redirect — the URI cannot be
 * trusted, so redirecting would forward an error (and later a code) to an
 * attacker. Those failures are `fatal`. Everything else is reported back to the
 * client's registered redirect URI as an OAuth error.
 */

export type AuthorizeValidation =
  | {
      kind: "ok";
      client: OAuthClientRow;
      params: AuthorizeParams;
      /**
       * What the approving superadmin may grant.
       *
       * When the client names scopes explicitly, that is the ceiling — RFC 6749
       * lets a server issue less than was asked for, never more. When it names
       * none (ChatGPT does not), every supported scope is offered, because
       * otherwise a conservative server-side default decides for the human and
       * there is no way to elevate it: the client cannot ask, and the screen
       * would only be able to confirm what it never requested.
       */
      selectable: Scope[];
      /** Ticked when the screen first renders. */
      preselected: Scope[];
    }
  /** Cannot safely redirect. Render an error page. */
  | { kind: "fatal"; message: string }
  /** Safe to report to the client's registered redirect URI. */
  | { kind: "redirect-error"; redirectUri: string; error: string; description: string; state: string | null };


export async function validateAuthorizeRequest(
  params: AuthorizeParams,
): Promise<AuthorizeValidation> {
  if (!params.clientId) {
    return { kind: "fatal", message: "Missing client_id." };
  }

  const client = await findClient(params.clientId);
  if (!client) {
    return { kind: "fatal", message: "Unknown client_id. Register the client first." };
  }

  if (!params.redirectUri) {
    return { kind: "fatal", message: "Missing redirect_uri." };
  }

  // Exact match against the registered set — never a prefix comparison.
  if (!isRegisteredRedirectUri(client, params.redirectUri)) {
    return {
      kind: "fatal",
      message: "redirect_uri is not registered for this client.",
    };
  }

  // From here the redirect URI is trusted, so errors can travel back to it.
  const redirectError = (
    error: string,
    description: string,
  ): AuthorizeValidation => ({
    kind: "redirect-error",
    redirectUri: params.redirectUri,
    error,
    description,
    state: params.state,
  });

  if (params.responseType !== "code") {
    return redirectError(
      "unsupported_response_type",
      "Only the authorization code flow is supported.",
    );
  }

  // PKCE is mandatory under OAuth 2.1, and this server registers public clients
  // only — without PKCE there would be no client authentication at all.
  if (!params.codeChallenge) {
    return redirectError("invalid_request", "code_challenge is required (PKCE).");
  }

  if (params.codeChallengeMethod !== "S256") {
    return redirectError(
      "invalid_request",
      "code_challenge_method must be S256. 'plain' is not accepted.",
    );
  }

  const requested = params.scope ? params.scope.split(/\s+/).filter(Boolean) : [];
  const unknown = requested.filter(
    (scope) => !(SUPPORTED_SCOPES as string[]).includes(scope),
  );
  if (requested.length > 0 && unknown.length === requested.length) {
    return redirectError(
      "invalid_scope",
      `No supported scopes requested. Supported: ${SUPPORTED_SCOPES.join(", ")}.`,
    );
  }

  const selectable = selectableScopes(params.scope);

  return { kind: "ok", client, params, selectable, preselected: selectable };
}

