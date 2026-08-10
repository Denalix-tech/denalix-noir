import { isMcpOAuthEnabled } from "@/lib/mcp-auth/config";
import { findClient, revokeToken } from "@/lib/mcp-auth/store";

/**
 * RFC 7009 token revocation.
 *
 * Deliberately indiscriminate about success: revoking a token that is unknown,
 * already revoked, or belongs to another client all return 200. §2.2 requires
 * this — a distinguishable response would turn the endpoint into an oracle for
 * probing whether a token is valid.
 *
 * Revocation matters more here than with JWTs. Tokens are opaque and checked
 * against the database on every call, so a revoked token stops working
 * immediately rather than at expiry.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!isMcpOAuthEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  let form: URLSearchParams;
  try {
    form = new URLSearchParams(await request.text());
  } catch {
    return Response.json(
      { error: "invalid_request", error_description: "Body must be form-encoded." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const token = form.get("token") ?? "";
  const clientId = form.get("client_id") ?? "";

  // client_id is the one thing worth validating: without it there is nothing to
  // scope the revocation to.
  if (!clientId) {
    return Response.json(
      { error: "invalid_client", error_description: "client_id is required." },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  if (token) {
    try {
      const client = await findClient(clientId);
      // Unknown client: still a 200. See the note above.
      if (client) await revokeToken(token, clientId);
    } catch (error) {
      console.error("[mcp-oauth] revocation failed", {
        clientId,
        message: error instanceof Error ? error.message : String(error),
      });
      return Response.json(
        { error: "server_error", error_description: "The request could not be completed." },
        { status: 500, headers: { "cache-control": "no-store" } },
      );
    }
  }

  return new Response(null, { status: 200, headers: { "cache-control": "no-store" } });
}
