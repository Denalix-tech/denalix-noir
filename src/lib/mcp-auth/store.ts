import "server-only";

import type { OAuthClientMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, OAuthClientRow, OAuthTokenRow } from "@/lib/supabase/database.types";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTHORIZATION_CODE_TTL_SECONDS,
  DEFAULT_SCOPES,
  REFRESH_TOKEN_TTL_SECONDS,
  parseScopes,
  type Scope,
} from "./config";
import {
  generateAccessToken,
  generateAuthorizationCode,
  generateClientId,
  generateRefreshToken,
  hashToken,
  verifyPkceS256,
} from "./crypto";

/**
 * All database access for the OAuth authorization server.
 *
 * Uses the service-role client because `oauth_*` has RLS enabled with no
 * policies — see the migration. Keeping every query in this one module means the
 * places that hold credential material are enumerable by reading one file.
 *
 * `server-only` makes importing this from a Client Component a build error.
 */

function db() {
  return createAdminClient();
}

function secondsFromNow(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

/**
 * Registers a public client (RFC 7591).
 *
 * Only `token_endpoint_auth_method: 'none'` is supported — a public client using
 * PKCE, which is what ChatGPT is. Confidential clients would need a secret, and
 * there is nowhere safe for a browser-driven client to keep one.
 */
export async function registerClient(
  metadata: OAuthClientMetadata,
  /** The registration body exactly as received, for diagnosing a misbehaving client. */
  received?: Json,
): Promise<OAuthClientRow> {
  const clientId = generateClientId();

  const { data, error } = await db()
    .from("oauth_clients")
    .insert({
      client_id: clientId,
      client_name: metadata.client_name ?? null,
      redirect_uris: metadata.redirect_uris,
      grant_types: metadata.grant_types ?? ["authorization_code", "refresh_token"],
      response_types: metadata.response_types ?? ["code"],
      token_endpoint_auth_method: "none",
      scope: metadata.scope ?? DEFAULT_SCOPES.join(" "),
      client_uri: metadata.client_uri ?? null,
      logo_uri: metadata.logo_uri ?? null,
      software_id: metadata.software_id ?? null,
      software_version: metadata.software_version ?? null,
      raw_metadata: received ?? (metadata as unknown as Json),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Client registration failed: ${error?.message ?? "unknown error"}`);
  }

  return data;
}

export async function findClient(clientId: string): Promise<OAuthClientRow | null> {
  const { data, error } = await db()
    .from("oauth_clients")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) throw new Error(`Could not load client: ${error.message}`);
  return data;
}

/**
 * Exact-match redirect URI check.
 *
 * Never prefix-match. `https://good.example/cb` must not authorize
 * `https://good.example/cb.evil.com` or `https://good.example/cb/../steal`;
 * prefix matching is a well-known authorization-code exfiltration route.
 */
export function isRegisteredRedirectUri(client: OAuthClientRow, redirectUri: string): boolean {
  return client.redirect_uris.includes(redirectUri);
}

// ---------------------------------------------------------------------------
// Authorization codes
// ---------------------------------------------------------------------------

export type IssueCodeInput = {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: Scope[];
  resource: string | null;
};

/** Returns the plaintext code. Only its hash is stored. */
export async function issueAuthorizationCode(input: IssueCodeInput): Promise<string> {
  const code = generateAuthorizationCode();

  const { error } = await db()
    .from("oauth_authorization_codes")
    .insert({
      code_hash: hashToken(code),
      client_id: input.clientId,
      user_id: input.userId,
      redirect_uri: input.redirectUri,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256",
      scopes: input.scopes,
      resource: input.resource,
      expires_at: secondsFromNow(AUTHORIZATION_CODE_TTL_SECONDS),
    });

  if (error) throw new Error(`Could not issue authorization code: ${error.message}`);
  return code;
}

export type CodeRedemption =
  | { ok: true; userId: string; scopes: Scope[]; resource: string | null }
  | { ok: false; error: "invalid_grant"; description: string };

/**
 * Redeems an authorization code, enforcing single use, expiry, PKCE, the
 * originating client, and the redirect URI it was bound to.
 *
 * The code is marked consumed via a conditional update — `is('consumed_at', null)`
 * — so two concurrent exchanges cannot both succeed. Doing the check in
 * application code instead would leave a race that hands out two token pairs for
 * one authorization.
 */
export async function redeemAuthorizationCode(
  code: string,
  clientId: string,
  codeVerifier: string,
  redirectUri: string | undefined,
): Promise<CodeRedemption> {
  const client = db();
  const codeHash = hashToken(code);

  const { data: row, error } = await client
    .from("oauth_authorization_codes")
    .select("*")
    .eq("code_hash", codeHash)
    .maybeSingle();

  if (error) throw new Error(`Could not read authorization code: ${error.message}`);

  // One generic message for every failure below. Distinguishing "unknown code"
  // from "expired" from "wrong client" would let a caller probe for valid codes.
  const reject = (description: string): CodeRedemption => ({
    ok: false,
    error: "invalid_grant",
    description,
  });

  if (!row) return reject("Authorization code is invalid or has expired.");
  if (row.consumed_at) return reject("Authorization code is invalid or has expired.");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return reject("Authorization code is invalid or has expired.");
  }
  if (row.client_id !== clientId) {
    return reject("Authorization code is invalid or has expired.");
  }
  // RFC 6749 §4.1.3: required when it was included in the authorization request,
  // which ours always is.
  if (redirectUri !== undefined && redirectUri !== row.redirect_uri) {
    return reject("redirect_uri does not match the authorization request.");
  }
  if (!verifyPkceS256(codeVerifier, row.code_challenge)) {
    return reject("PKCE verification failed.");
  }

  const { data: consumed, error: consumeError } = await client
    .from("oauth_authorization_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("code_hash", codeHash)
    .is("consumed_at", null)
    .select("code_hash")
    .maybeSingle();

  if (consumeError) {
    throw new Error(`Could not consume authorization code: ${consumeError.message}`);
  }
  // Lost the race — another exchange consumed it first.
  if (!consumed) return reject("Authorization code has already been used.");

  return {
    ok: true,
    userId: row.user_id,
    scopes: parseScopes(row.scopes.join(" ")),
    resource: row.resource,
  };
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scopes: Scope[];
};

export type IssueTokensInput = {
  clientId: string;
  userId: string;
  scopes: Scope[];
  resource: string | null;
  /** The refresh token being rotated out, for lineage. */
  parentHash?: string | null;
};

export async function issueTokens(input: IssueTokensInput): Promise<IssuedTokens> {
  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken();

  const { error } = await db()
    .from("oauth_tokens")
    .insert([
      {
        token_hash: hashToken(accessToken),
        kind: "access",
        client_id: input.clientId,
        user_id: input.userId,
        scopes: input.scopes,
        resource: input.resource,
        expires_at: secondsFromNow(ACCESS_TOKEN_TTL_SECONDS),
        parent_hash: input.parentHash ?? null,
      },
      {
        token_hash: hashToken(refreshToken),
        kind: "refresh",
        client_id: input.clientId,
        user_id: input.userId,
        scopes: input.scopes,
        resource: input.resource,
        expires_at: secondsFromNow(REFRESH_TOKEN_TTL_SECONDS),
        parent_hash: input.parentHash ?? null,
      },
    ]);

  if (error) throw new Error(`Could not issue tokens: ${error.message}`);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scopes: input.scopes,
  };
}

export type ValidatedToken = {
  clientId: string;
  userId: string;
  scopes: Scope[];
  resource: string | null;
  expiresAt: Date;
};

/**
 * Validates a bearer access token: exists, is an access token, unrevoked, and
 * unexpired. The caller checks the audience — see `resolveBearer`.
 */
export async function validateAccessToken(token: string): Promise<ValidatedToken | null> {
  const { data, error } = await db()
    .from("oauth_tokens")
    .select("*")
    .eq("token_hash", hashToken(token))
    .eq("kind", "access")
    .maybeSingle();

  if (error) throw new Error(`Could not validate token: ${error.message}`);
  if (!data) return null;
  if (data.revoked_at) return null;

  const expiresAt = new Date(data.expires_at);
  if (expiresAt.getTime() < Date.now()) return null;

  return {
    clientId: data.client_id,
    userId: data.user_id,
    scopes: parseScopes(data.scopes.join(" ")),
    resource: data.resource,
    expiresAt,
  };
}

export type RefreshOutcome =
  | { ok: true; tokens: IssuedTokens }
  | { ok: false; error: "invalid_grant"; description: string };

/**
 * How long after a refresh token is rotated out that a second presentation of
 * the same token is still read as benign concurrency rather than replay.
 *
 * Strict one-time-use breaks any setup where more than one process shares a
 * credential store — two editor windows, or an agent runner that keeps its own
 * copy. Both read the same stored token, one redeems it, and the other's copy
 * is already burned. Under the old behaviour that second request tore down the
 * whole grant, so the user was pushed back through consent, the two processes
 * raced again on the new token, and the loop sustained itself.
 *
 * Sixty seconds is the usual mitigation: long enough to cover a racing client
 * and a retry behind it, short enough that a stolen token is not broadly
 * replayable. True replay outside the window still revokes the family.
 */
const REFRESH_REUSE_GRACE_MS = 60_000;

/**
 * Whether re-presenting an already-rotated refresh token looks like two client
 * processes racing rather than an attacker replaying a stolen token.
 *
 * Two conditions, and both matter. The rotation must be recent, and the token
 * must have a live successor — that is what distinguishes a token this server
 * rotated from one killed by `/oauth/revoke` or by a family revocation. Those
 * have no successor, so re-presenting one is exactly the replay that the family
 * revocation exists to catch, and it still gets caught.
 */
async function isConcurrentReuse(
  client: ReturnType<typeof db>,
  revokedAt: string,
  tokenHash: string,
): Promise<boolean> {
  if (Date.now() - new Date(revokedAt).getTime() > REFRESH_REUSE_GRACE_MS) return false;

  // Not maybeSingle: a second grace-window refresh adds another row with the
  // same parent, so more than one successor is expected and must not throw.
  const { data: successors, error } = await client
    .from("oauth_tokens")
    .select("revoked_at")
    .eq("parent_hash", tokenHash)
    .eq("kind", "refresh")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(`Could not read refresh lineage: ${error.message}`);

  const successor = successors?.[0];
  return Boolean(successor) && !successor.revoked_at;
}

/**
 * Rotates a refresh token.
 *
 * The presented token is revoked and a new pair issued. Re-presenting a token
 * that was already rotated is replay, and revokes the whole lineage plus every
 * live token for that client and user — unless it lands inside the grace window
 * above, which is the concurrent-client case rather than an attack.
 */
export async function rotateRefreshToken(
  refreshToken: string,
  clientId: string,
  requestedScopes: Scope[] | null,
): Promise<RefreshOutcome> {
  const client = db();
  const tokenHash = hashToken(refreshToken);

  const { data: row, error } = await client
    .from("oauth_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .eq("kind", "refresh")
    .maybeSingle();

  if (error) throw new Error(`Could not read refresh token: ${error.message}`);

  const reject = (description: string): RefreshOutcome => ({
    ok: false,
    error: "invalid_grant",
    description,
  });

  if (!row) return reject("Refresh token is invalid.");
  if (row.client_id !== clientId) return reject("Refresh token is invalid.");

  // Checked before the reuse branch: an expired token is expired whether or not
  // it was also rotated, and the grace window must not resurrect one.
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return reject("Refresh token has expired.");
  }

  const granted = parseScopes(row.scopes.join(" "));
  // RFC 6749 §6: a refresh may narrow scope but never widen it.
  const scopes = requestedScopes?.length
    ? requestedScopes.filter((scope) => granted.includes(scope))
    : granted;

  if (scopes.length === 0) return reject("Requested scopes exceed the original grant.");

  // Tokens are stored only as hashes, so the pair the winning request received
  // cannot be handed out again. A fresh pair on the same lineage is issued
  // instead: both callers end up with working, independently revocable
  // credentials, which is what the racing client needed.
  const issue = async (): Promise<RefreshOutcome> => ({
    ok: true,
    tokens: await issueTokens({
      clientId: row.client_id,
      userId: row.user_id,
      scopes,
      resource: row.resource,
      parentHash: tokenHash,
    }),
  });

  if (row.revoked_at) {
    if (await isConcurrentReuse(client, row.revoked_at, tokenHash)) return issue();
    await revokeAllForClientAndUser(row.client_id, row.user_id);
    return reject("Refresh token has already been used. Re-authorization required.");
  }

  const { data: revoked, error: revokeError } = await client
    .from("oauth_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .select("token_hash")
    .maybeSingle();

  if (revokeError) throw new Error(`Could not rotate refresh token: ${revokeError.message}`);

  if (!revoked) {
    // Rotated between the read above and this update — the same race, just lost
    // a few milliseconds later, so it gets the same answer rather than a
    // rejection that depends on timing.
    const { data: current, error: reread } = await client
      .from("oauth_tokens")
      .select("revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (reread) throw new Error(`Could not re-read refresh token: ${reread.message}`);

    if (current?.revoked_at && (await isConcurrentReuse(client, current.revoked_at, tokenHash))) {
      return issue();
    }
    return reject("Refresh token has already been used.");
  }

  return issue();
}

/** RFC 7009. Silent by design: revoking an unknown token is a success. */
export async function revokeToken(token: string, clientId: string): Promise<void> {
  const { error } = await db()
    .from("oauth_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .eq("client_id", clientId)
    .is("revoked_at", null);

  if (error) throw new Error(`Could not revoke token: ${error.message}`);
}

async function revokeAllForClientAndUser(clientId: string, userId: string): Promise<void> {
  const { error } = await db()
    .from("oauth_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) throw new Error(`Could not revoke token family: ${error.message}`);
}

/** Every live grant for one admin, for an "authorized apps" surface or offboarding. */
export async function listActiveGrants(userId: string): Promise<OAuthTokenRow[]> {
  const { data, error } = await db()
    .from("oauth_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "refresh")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Could not list grants: ${error.message}`);
  return data ?? [];
}
