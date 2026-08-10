import type { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";

import {
  AUTHORIZATION_ENDPOINT,
  ISSUER,
  REGISTRATION_ENDPOINT,
  REVOCATION_ENDPOINT,
  SUPPORTED_SCOPES,
  TOKEN_ENDPOINT,
  isMcpOAuthEnabled,
} from "@/lib/mcp-auth/config";

/**
 * RFC 8414 authorization server metadata — step 4 of the client's discovery.
 *
 * The shape is the SDK's own `OAuthMetadata` type, so a drift between what this
 * advertises and what MCP clients parse is a compile error rather than a runtime
 * connector failure.
 */

export const runtime = "nodejs";

/**
 * Must be dynamic, despite advertising only static configuration.
 *
 * With `force-static` the `isMcpOAuthEnabled()` branch is evaluated at build
 * time, so a build made before the flag was set bakes in a 404 — and Next stamps
 * it `s-maxage=31536000`, meaning a CDN would serve that 404 for a year after the
 * flag was turned on. The `cache-control` header below gives the caching this
 * needs without freezing the flag into the build.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!isMcpOAuthEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  const metadata: OAuthMetadata = {
    issuer: ISSUER,
    authorization_endpoint: AUTHORIZATION_ENDPOINT,
    token_endpoint: TOKEN_ENDPOINT,
    registration_endpoint: REGISTRATION_ENDPOINT,
    revocation_endpoint: REVOCATION_ENDPOINT,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    // Public clients only; PKCE replaces a client secret.
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
    // S256 only. OAuth 2.1 forbids `plain`, so advertising it would be wrong
    // even though some clients would happily use it.
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [...SUPPORTED_SCOPES],
    service_documentation: `${ISSUER}/blog`,
  };

  return Response.json(metadata, {
    headers: {
      // Discovery documents are stable and fetched on every fresh connection.
      "cache-control": "public, max-age=3600",
    },
  });
}
