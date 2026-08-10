import { MCP_RESOURCE, isMcpOAuthEnabled, parseScopes } from "@/lib/mcp-auth/config";
import { findClient, redeemAuthorizationCode, issueTokens, rotateRefreshToken } from "@/lib/mcp-auth/store";

/**
 * RFC 6749 token endpoint — `authorization_code` and `refresh_token` grants.
 *
 * Public clients only, so there is no client authentication here: PKCE is what
 * proves the caller is the same party that started the flow. That is why
 * `code_challenge_method=S256` is mandatory upstream and `plain` is refused.
 *
 * Responses are never cached — `no-store` on every path, success or failure.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store", pragma: "no-cache" } as const;

function oauthError(
  error: string,
  description: string,
  status = 400,
): Response {
  return Response.json(
    { error, error_description: description },
    { status, headers: NO_STORE },
  );
}

function tokenResponse(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scopes: string[];
}): Response {
  return Response.json(
    {
      access_token: tokens.accessToken,
      token_type: "Bearer",
      expires_in: tokens.expiresIn,
      refresh_token: tokens.refreshToken,
      scope: tokens.scopes.join(" "),
    },
    { status: 200, headers: NO_STORE },
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!isMcpOAuthEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  // RFC 6749 §4.1.3 requires form encoding, which is what every MCP client sends.
  let form: URLSearchParams;
  try {
    form = new URLSearchParams(await request.text());
  } catch {
    return oauthError("invalid_request", "Body must be application/x-www-form-urlencoded.");
  }

  const grantType = form.get("grant_type") ?? "";
  const clientId = form.get("client_id") ?? "";

  if (!clientId) {
    return oauthError("invalid_client", "client_id is required.", 401);
  }

  // The resource this token is being requested for (RFC 8707). Anything other
  // than the one resource this server protects is refused outright rather than
  // quietly issuing a token that will fail the audience check later.
  const requestedResource = form.get("resource");
  if (requestedResource && requestedResource !== MCP_RESOURCE) {
    return oauthError(
      "invalid_target",
      `Unknown resource. This server issues tokens for ${MCP_RESOURCE} only.`,
    );
  }

  // The client lookup is inside the try: it touches the database, and an
  // unhandled throw here would return an empty 500 instead of an OAuth-shaped
  // error, which a client cannot interpret.
  try {
    const client = await findClient(clientId);
    if (!client) {
      return oauthError("invalid_client", "Unknown client_id.", 401);
    }

    if (!client.grant_types.includes(grantType)) {
      return oauthError(
        "unauthorized_client",
        `This client may not use the ${grantType || "(missing)"} grant.`,
      );
    }

    if (grantType === "authorization_code") {
      const code = form.get("code") ?? "";
      const codeVerifier = form.get("code_verifier") ?? "";
      // Absent means "not supplied"; empty string is a real mismatch.
      const redirectUri = form.has("redirect_uri")
        ? (form.get("redirect_uri") ?? "")
        : undefined;

      if (!code) return oauthError("invalid_request", "code is required.");
      if (!codeVerifier) {
        return oauthError("invalid_request", "code_verifier is required (PKCE).");
      }

      const redemption = await redeemAuthorizationCode(
        code,
        clientId,
        codeVerifier,
        redirectUri,
      );

      if (!redemption.ok) {
        return oauthError(redemption.error, redemption.description);
      }

      const tokens = await issueTokens({
        clientId,
        userId: redemption.userId,
        scopes: redemption.scopes,
        // Bind to the resource the code carried, falling back to this server's
        // own resource so every token has an explicit audience.
        resource: redemption.resource ?? requestedResource ?? MCP_RESOURCE,
      });

      return tokenResponse(tokens);
    }

    if (grantType === "refresh_token") {
      const refreshToken = form.get("refresh_token") ?? "";
      if (!refreshToken) {
        return oauthError("invalid_request", "refresh_token is required.");
      }

      const requested = form.has("scope") ? parseScopes(form.get("scope")) : null;
      const outcome = await rotateRefreshToken(refreshToken, clientId, requested);

      if (!outcome.ok) {
        return oauthError(outcome.error, outcome.description);
      }

      return tokenResponse(outcome.tokens);
    }

    return oauthError(
      "unsupported_grant_type",
      "Supported grants: authorization_code, refresh_token.",
    );
  } catch (error) {
    // Never surface an internal message: it could describe database structure.
    console.error("[mcp-oauth] token endpoint failed", {
      grantType,
      clientId,
      message: error instanceof Error ? error.message : String(error),
    });
    return oauthError("server_error", "The request could not be completed.", 500);
  }
}
