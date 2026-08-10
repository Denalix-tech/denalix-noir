import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Credential generation and PKCE verification.
 *
 * Everything here uses `node:crypto`. There is no hand-rolled cryptography and
 * no new dependency: tokens are random bytes, storage is SHA-256, and PKCE S256
 * is the SHA-256 the spec already mandates.
 *
 * SHA-256 without a salt or a KDF is correct here and would be wrong for
 * passwords. These are 256-bit random secrets, so there is no dictionary to
 * attack and nothing for a slow hash to buy.
 */

/** 256 bits of entropy, base64url — URL- and header-safe. */
function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateAuthorizationCode(): string {
  return randomToken();
}

export function generateAccessToken(): string {
  return randomToken();
}

export function generateRefreshToken(): string {
  return randomToken();
}

/**
 * Client identifiers are public, not secret, but still random — a guessable
 * client_id lets an attacker start an authorization flow that looks legitimate
 * on the consent screen.
 */
export function generateClientId(): string {
  return `mcp_${randomBytes(16).toString("hex")}`;
}

/** What gets stored. The token itself is returned to the client and never persisted. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time string comparison.
 *
 * Length is compared first because `timingSafeEqual` throws on differing
 * lengths. Leaking the length of a 32-byte token is not a finding.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Verifies an RFC 7636 S256 PKCE challenge.
 *
 * `code_challenge = BASE64URL(SHA256(code_verifier))`. Only S256 is accepted —
 * `plain` is forbidden by OAuth 2.1, and accepting it would let anyone who
 * observed the authorization request replay the intercepted code.
 */
export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  // RFC 7636 §4.1: 43–128 characters from the unreserved set.
  if (codeVerifier.length < 43 || codeVerifier.length > 128) return false;
  if (!/^[A-Za-z0-9\-._~]+$/.test(codeVerifier)) return false;

  const computed = createHash("sha256").update(codeVerifier).digest("base64url");
  return safeEqual(computed, codeChallenge);
}
