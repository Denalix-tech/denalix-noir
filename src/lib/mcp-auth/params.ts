/**
 * Pure request/response helpers for the authorization endpoint.
 *
 * Split from `authorize-request.ts` deliberately: that module imports the store,
 * which is `server-only`, and these functions have no need of a database. Keeping
 * them here means the security-relevant parsing and URL construction can be
 * exercised in isolation, and a pure helper does not drag the credential store
 * into whatever imports it.
 */

export type AuthorizeParams = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string | null;
  scope: string | null;
  resource: string | null;
  responseType: string;
};

export function readAuthorizeParams(searchParams: URLSearchParams): AuthorizeParams {
  return {
    clientId: searchParams.get("client_id") ?? "",
    redirectUri: searchParams.get("redirect_uri") ?? "",
    codeChallenge: searchParams.get("code_challenge") ?? "",
    codeChallengeMethod: searchParams.get("code_challenge_method") ?? "",
    state: searchParams.get("state"),
    scope: searchParams.get("scope"),
    resource: searchParams.get("resource"),
    responseType: searchParams.get("response_type") ?? "",
  };
}

/**
 * Builds the redirect back to the client.
 *
 * `state` is echoed unchanged when present — it is the client's CSRF defence, and
 * dropping it would make a legitimate response indistinguishable from an injected
 * one. Existing query parameters on the registered redirect URI are preserved,
 * because a client may legitimately register one carrying its own state.
 */
export function buildRedirect(
  redirectUri: string,
  values: Record<string, string | null>,
): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(values)) {
    if (value !== null) url.searchParams.set(key, value);
  }
  return url.toString();
}
