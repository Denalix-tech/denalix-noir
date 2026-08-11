import { SITE_ORIGIN } from "@/lib/site-url";

/**
 * OAuth 2.1 configuration for the MCP endpoint.
 *
 * The authorization server and the resource server are the same deployment, so
 * `issuer` and the resource share an origin. That is what makes opaque tokens
 * the right choice over JWTs — see the migration header.
 *
 * Origins come from `SITE_ORIGIN`, deliberately a constant rather than an env
 * var, for the reason recorded in `src/lib/site-url.ts`: a missing variable once
 * produced an empty sitemap silently. The same failure here would produce
 * discovery documents advertising the wrong host, which is worse.
 */

/** RFC 8414 issuer identifier. No trailing slash, no path. */
export const ISSUER = SITE_ORIGIN;

/** The MCP resource being protected. Must match RFC 8707 `resource` exactly. */
export const MCP_RESOURCE = `${SITE_ORIGIN}/api/mcp`;

export const AUTHORIZATION_ENDPOINT = `${SITE_ORIGIN}/oauth/authorize`;
export const TOKEN_ENDPOINT = `${SITE_ORIGIN}/oauth/token`;
export const REGISTRATION_ENDPOINT = `${SITE_ORIGIN}/oauth/register`;
export const REVOCATION_ENDPOINT = `${SITE_ORIGIN}/oauth/revoke`;

/**
 * RFC 9728 metadata URL for the MCP resource.
 *
 * The resource has a path (`/api/mcp`), so the path is inserted after the
 * well-known segment. This exact string goes in the `WWW-Authenticate` header on
 * a 401, and it is the only thing bootstrapping the client's discovery — get it
 * wrong and the connector fails with no useful error.
 */
export const PROTECTED_RESOURCE_METADATA_URL =
  `${SITE_ORIGIN}/.well-known/oauth-protected-resource/api/mcp`;

/**
 * Scopes.
 *
 * Split at the read/write boundary rather than per tool. Per-tool scopes would
 * mean a consent screen no human reads, and the meaningful decision is whether a
 * client may create content at all.
 */
export const SCOPES = {
  read: "blog:read",
  draft: "blog:draft",
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

export const SUPPORTED_SCOPES: Scope[] = [SCOPES.read, SCOPES.draft];

/**
 * Recorded when a client registers without asking for anything specific.
 *
 * Both scopes, not just read. A client is told its registered scope in the
 * registration response and then requests exactly that on every authorization —
 * so advertising read-only here made every client permanently read-only, with no
 * way for the client to ask for more. Registration grants nothing on its own; a
 * superadmin still has to approve on the consent screen, which is where the real
 * decision is made.
 */
export const DEFAULT_SCOPES: Scope[] = [SCOPES.read, SCOPES.draft];

export const SCOPE_DESCRIPTIONS: Record<Scope, string> = {
  [SCOPES.read]:
    "Read your posts, slugs, service pages, and the writing guide. No changes.",
  [SCOPES.draft]:
    "Create drafts and generate cover images. Cannot publish, edit, or delete.",
};

export function isSupportedScope(value: string): value is Scope {
  return (SUPPORTED_SCOPES as string[]).includes(value);
}

/**
 * Parses a space-delimited scope string, dropping anything unrecognised.
 *
 * Unknown scopes are ignored rather than rejected: RFC 6749 §3.3 allows a server
 * to issue a narrower set than requested, and failing the whole authorization
 * because a client asked for one extra scope is a worse experience than granting
 * the subset we understand.
 */
export function parseScopes(raw: string | null | undefined): Scope[] {
  if (!raw) return [];
  const parsed = raw.split(/\s+/).filter(isSupportedScope);
  return [...new Set(parsed)];
}

/**
 * What the consent screen offers, and what it pre-ticks.
 *
 * **Every supported scope is always offerable, and the human decides.** Treating
 * the requested scope as a hard ceiling created a dead end: a client is told its
 * scope at registration, requests exactly that thereafter, and a consent screen
 * that can only confirm what was asked for can never widen it. A connector that
 * registered read-only stayed read-only forever, and nothing in either system
 * could change that.
 *
 * RFC 6749 §3.3 permits this. A server may issue a scope set different from the
 * request; the only requirement is that the token response say what was actually
 * granted, which `/oauth/token` does via its `scope` field. So a client asking for
 * less than it needs is recoverable by a human ticking a box, and a client asking
 * for more still gets only what that human approves.
 *
 * What the client asked for is preserved as the pre-ticked default, so the common
 * path is still one click and nothing is silently widened without being seen.
 *
 * Pure, and outside the `server-only` modules, so this decision is testable alone.
 */
export function scopeChoices(requestedScope: string | null | undefined): {
  selectable: Scope[];
  preselected: Scope[];
} {
  const explicit = parseScopes(requestedScope);
  return {
    selectable: [...SUPPORTED_SCOPES],
    preselected: explicit.length > 0 ? explicit : [...SUPPORTED_SCOPES],
  };
}

/**
 * Lifetimes.
 *
 * Access tokens are deliberately short. The client refreshes silently, and a
 * leaked access token stops working within the hour; the refresh token is the
 * long-lived credential and it rotates on every use.
 */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const AUTHORIZATION_CODE_TTL_SECONDS = 60; // RFC 6749 recommends <= 10 min; 1 is ample

/**
 * Whether the MCP OAuth surface is switched on.
 *
 * Off by default. The endpoints all 404 until this is set, so deploying this
 * code does not silently expose an authorization server on a site that has no
 * intention of running one.
 */
export function isMcpOAuthEnabled(): boolean {
  return process.env.MCP_OAUTH_ENABLED === "true";
}
