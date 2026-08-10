import { OAuthClientMetadataSchema } from "@modelcontextprotocol/sdk/shared/auth.js";

import { DEFAULT_SCOPES, isMcpOAuthEnabled, parseScopes } from "@/lib/mcp-auth/config";
import { registerClient } from "@/lib/mcp-auth/store";

/**
 * RFC 7591 Dynamic Client Registration.
 *
 * This endpoint exists because ChatGPT registers itself — it will not accept a
 * client_id you created by hand. That is the single constraint that forces a real
 * authorization server rather than a static token.
 *
 * Validation uses the SDK's own `OAuthClientMetadataSchema`, so what is accepted
 * here is exactly what MCP clients send.
 *
 * **Open registration.** Anyone may create a client, which is what the RFC
 * intends and what ChatGPT requires. It is not the security boundary: a
 * registered client can do nothing until a signed-in Denalix administrator
 * approves it on the consent screen and it holds a resulting token. The gate is
 * that human approval, not registration.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function badRequest(error: string, description: string): Response {
  return Response.json({ error, error_description: description }, { status: 400 });
}

export async function POST(request: Request): Promise<Response> {
  if (!isMcpOAuthEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid_client_metadata", "Body must be JSON.");
  }

  const parsed = OAuthClientMetadataSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      "invalid_client_metadata",
      parsed.error.issues.map((issue) => issue.message).join("; "),
    );
  }

  const metadata = parsed.data;

  if (!metadata.redirect_uris?.length) {
    return badRequest("invalid_redirect_uri", "At least one redirect_uri is required.");
  }

  // Every redirect URI must be absolute HTTPS. http://localhost is allowed
  // because it is how a developer tests a client locally, and it is not
  // network-reachable by an attacker.
  for (const uri of metadata.redirect_uris) {
    let parsedUri: URL;
    try {
      parsedUri = new URL(uri);
    } catch {
      return badRequest("invalid_redirect_uri", `Not a valid absolute URL: ${uri}`);
    }

    const isLoopback =
      parsedUri.hostname === "localhost" ||
      parsedUri.hostname === "127.0.0.1" ||
      parsedUri.hostname === "[::1]";

    if (parsedUri.protocol !== "https:" && !isLoopback) {
      return badRequest("invalid_redirect_uri", `redirect_uri must use https: ${uri}`);
    }
    // A fragment in a redirect URI is forbidden by RFC 6749 §3.1.2.
    if (parsedUri.hash) {
      return badRequest("invalid_redirect_uri", `redirect_uri must not contain a fragment: ${uri}`);
    }
  }

  // Only the public-client + PKCE profile is supported. Reject a client asking
  // for secret-based auth rather than silently downgrading it, so the client
  // learns the truth at registration instead of failing at token exchange.
  if (metadata.token_endpoint_auth_method && metadata.token_endpoint_auth_method !== "none") {
    return badRequest(
      "invalid_client_metadata",
      "Only public clients are supported (token_endpoint_auth_method must be 'none'). PKCE is required.",
    );
  }

  const requested = parseScopes(metadata.scope);
  const granted = requested.length > 0 ? requested : DEFAULT_SCOPES;

  try {
    const client = await registerClient({ ...metadata, scope: granted.join(" ") });

    // RFC 7591 §3.2.1: 201 with the registered metadata echoed back.
    return Response.json(
      {
        client_id: client.client_id,
        client_id_issued_at: Math.floor(new Date(client.created_at).getTime() / 1000),
        client_name: client.client_name ?? undefined,
        redirect_uris: client.redirect_uris,
        grant_types: client.grant_types,
        response_types: client.response_types,
        token_endpoint_auth_method: client.token_endpoint_auth_method,
        scope: client.scope ?? undefined,
      },
      { status: 201, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[mcp-oauth] client registration failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "invalid_client_metadata", error_description: "Registration failed." },
      { status: 400 },
    );
  }
}
