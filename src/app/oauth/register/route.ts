import { OAuthClientMetadataSchema } from "@modelcontextprotocol/sdk/shared/auth.js";

import { DEFAULT_SCOPES, isMcpOAuthEnabled, parseScopes } from "@/lib/mcp-auth/config";
import { registerClient } from "@/lib/mcp-auth/store";
import type { Json } from "@/lib/supabase/database.types";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

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
  return Response.json(
    { error, error_description: description },
    { status: 400, headers: { "cache-control": "no-store" } },
  );
}

/**
 * A fault on this side of the connection.
 *
 * Kept strictly separate from `badRequest`, because RFC 7591's
 * `invalid_client_metadata` is an accusation that the *client* sent something
 * wrong. Returning it for a missing environment variable sends the operator
 * looking at the wrong system — the failure surfaces in ChatGPT as
 * "Dynamic client registration failed: invalid_client_metadata", which is both
 * unactionable and untrue.
 */
function serverError(description: string): Response {
  return Response.json(
    { error: "server_error", error_description: description },
    { status: 500, headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!isMcpOAuthEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  // Checked before any parsing so a misconfigured deployment says so plainly
  // instead of failing later inside an insert and looking like bad metadata.
  if (!isSupabaseConfigured()) {
    console.error("[mcp-oauth] registration blocked: Supabase is not configured");
    return serverError(
      "The authorization server is misconfigured: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing.",
    );
  }

  if (!hasServiceRoleKey()) {
    console.error("[mcp-oauth] registration blocked: SUPABASE_SERVICE_ROLE_KEY is not set");
    return serverError(
      "The authorization server is misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set on this deployment.",
    );
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
    // `received` is the unmodified body, so raw_metadata records what the client
    // actually sent rather than the scope we derived from it. Storing the derived
    // value defeated the point of keeping the registration document — it made it
    // impossible to tell afterwards whether a client had requested scopes at all.
    const client = await registerClient(
      { ...metadata, scope: granted.join(" ") },
      body as Json,
    );

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
    // Everything the client controls was validated above, so a throw here is
    // ours: a missing table, an unreachable database, or bad credentials.
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mcp-oauth] client registration failed", { message });

    // Missing tables are the one failure with a specific, actionable cause worth
    // naming — the migration not having been applied.
    if (/schema cache|does not exist|relation .* does not exist/i.test(message)) {
      return serverError(
        "The authorization server's storage is missing. Apply supabase/migrations/20260810120000_add_mcp_oauth.sql.",
      );
    }

    return serverError("The authorization server could not store the registration.");
  }
}
