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

/** Granted when a client registers without asking for anything specific. */
export const DEFAULT_SCOPES: Scope[] = [SCOPES.read];

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
 * What the approving superadmin may grant for a given authorization request.
 *
 * An explicit `scope` parameter is a ceiling: RFC 6749 §3.3 lets a server issue
 * less than was requested, never more. When the client names nothing — which is
 * what ChatGPT does — every supported scope is offered instead of falling back to
 * a conservative default, because that default is unreachable otherwise: the
 * client cannot ask for more, and a consent screen can only confirm what was
 * requested. The result was a connector permanently stuck read-only.
 *
 * Pure, and kept out of the `server-only` modules, so this decision is testable
 * on its own.
 */
export function selectableScopes(requestedScope: string | null | undefined): Scope[] {
  const explicit = parseScopes(requestedScope);
  return explicit.length > 0 ? explicit : [...SUPPORTED_SCOPES];
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
