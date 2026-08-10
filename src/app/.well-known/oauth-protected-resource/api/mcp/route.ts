import type { OAuthProtectedResourceMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";

import {
  ISSUER,
  MCP_RESOURCE,
  SUPPORTED_SCOPES,
  isMcpOAuthEnabled,
} from "@/lib/mcp-auth/config";

/**
 * RFC 9728 protected resource metadata — step 3 of discovery.
 *
 * The path mirrors the resource it describes: the resource is
 * `<origin>/api/mcp`, so its metadata lives at
 * `<origin>/.well-known/oauth-protected-resource/api/mcp`. This exact URL is
 * what the `WWW-Authenticate` header on a 401 points at, and the two must agree
 * or discovery dead-ends. Both are derived from `config.ts` so they cannot drift.
 *
 * No `jwks_uri`: tokens are opaque and validated by database lookup, so there are
 * no public keys to publish.
 */

export const runtime = "nodejs";
// Dynamic for the same reason as the authorization-server document: `force-static`
// would freeze the MCP_OAUTH_ENABLED check into the build and let a CDN cache the
// resulting 404 for a year. Caching comes from the header below instead.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!isMcpOAuthEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  const metadata: OAuthProtectedResourceMetadata = {
    resource: MCP_RESOURCE,
    authorization_servers: [ISSUER],
    scopes_supported: [...SUPPORTED_SCOPES],
    bearer_methods_supported: ["header"],
    resource_name: "Denalix Tech blog drafting (MCP)",
    resource_documentation: `${ISSUER}/blog`,
  };

  return Response.json(metadata, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
