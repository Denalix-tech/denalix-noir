import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { challengeHeader, resolveBearer } from "@/lib/mcp-auth/bearer";
import { isMcpOAuthEnabled } from "@/lib/mcp-auth/config";
import { registerBlogTools } from "../../../../mcp/tools";

/**
 * Remote MCP endpoint, protected by OAuth 2.1 — so ChatGPT, which cannot launch
 * a local process, can reach the drafting tools.
 *
 * `mcp/server.ts` serves the same tool surface over stdio to Claude Code. This is
 * a second transport over `mcp/tools.ts`, and neither can publish: `create_draft`
 * hard-codes `status: 'draft'` and the Supabase adapter exports no publish
 * function. Drafts land in `/admin/posts` for a human.
 *
 * SECURITY:
 *
 *   * `MULTI_SITE_PLAN.md` D6 says the control plane must not live in the
 *     marketing site. This route is a bounded exception, safe only while it
 *     serves `denalixtech`, whose service-role key this deployment already holds
 *     for /admin/people. **Never add a client's SITE_*_SERVICE_ROLE_KEY to this
 *     Vercel project** — that is the line D6 draws. Client sites stay on stdio.
 *   * `SITES_ENABLED=denalixtech` must be set in the deployment environment.
 *     Without it this endpoint can reach every registered site.
 *   * Scopes gate the tool surface: a `blog:read` token never sees `create_draft`
 *     in `tools/list`, because unauthorized tools are not registered at all.
 *
 * Stateless by necessity: serverless invocations share no memory, so a
 * session-bearing transport would lose its state between requests.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 401 with the RFC 9728 pointer. This header is the whole basis of the client's
 * discovery — without it ChatGPT cannot find the authorization server and
 * reports no useful error.
 */
function unauthorized(status: 401 | 403, code: string, description: string): Response {
  return Response.json(
    { error: code, error_description: description },
    {
      status,
      headers: {
        "WWW-Authenticate": challengeHeader(code, description),
        "cache-control": "no-store",
      },
    },
  );
}

/**
 * A JSON-RPC internal error, so a failure reaches the client as protocol rather
 * than as Next's HTML error page.
 *
 * An MCP client handed `<!DOCTYPE html>` reports a parse failure, or dumps the
 * whole document into a log, and either way the actual cause is invisible. The
 * `digest` is Next's own correlation id where one is available — quoting it in a
 * bug report is what ties the response to a line in the platform logs.
 */
function internalError(error: unknown, requestId: unknown = null): Response {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest?: unknown }).digest)
      : undefined;

  console.error("[mcp] unhandled error", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    digest,
  });

  return Response.json(
    {
      jsonrpc: "2.0",
      id: requestId ?? null,
      error: {
        code: -32603,
        message: "Internal error",
        ...(digest ? { data: { digest } } : {}),
      },
    },
    { status: 500, headers: { "cache-control": "no-store" } },
  );
}

async function handle(request: Request): Promise<Response> {
  // Nothing is exposed until OAuth is deliberately switched on, so deploying
  // this code does not by itself open a write path into the database.
  if (!isMcpOAuthEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  let auth;
  try {
    auth = await resolveBearer(request);
  } catch (error) {
    console.error("[mcp] bearer validation failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "server_error", error_description: "Token validation failed." },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  if (!auth.ok) {
    return unauthorized(auth.status, auth.code, auth.description);
  }

  // A token with no usable scope gets no tools, so fail here with something
  // actionable rather than serving an empty tool list.
  if (auth.scopes.length === 0) {
    return unauthorized(
      403,
      "insufficient_scope",
      "This token carries no usable scope. Re-authorize with blog:read or blog:draft.",
    );
  }

  const server = new McpServer({ name: "denalix-blog", version: "2.0.0" });
  registerBlogTools(server, { grantedScopes: auth.scopes });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  // authInfo reaches tool handlers as `extra.authInfo`, so a handler can see
  // which administrator's grant it is acting under.
  return transport.handleRequest(request, { authInfo: auth.authInfo });
}

/**
 * Best-effort recovery of the JSON-RPC id from a clone of the request.
 *
 * A client waiting on id 7 will not match an error carrying null, and sits there
 * until it times out instead of surfacing the failure. The clone is taken before
 * the original is consumed, so reading it here costs nothing that the handler
 * needed.
 */
async function requestIdOf(request: Request): Promise<unknown> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && "id" in body
      ? (body as { id: unknown }).id
      : null;
  } catch {
    return null;
  }
}

/** JSON-RPC requests. */
export async function POST(request: Request): Promise<Response> {
  const echo = request.clone();
  try {
    return await handle(request);
  } catch (error) {
    return internalError(error, await requestIdOf(echo));
  }
}

/** The server-to-client SSE stream. */
export async function GET(request: Request): Promise<Response> {
  try {
    return await handle(request);
  } catch (error) {
    return internalError(error);
  }
}

/** Session teardown. A no-op in stateless mode, but clients may still send it. */
export async function DELETE(request: Request): Promise<Response> {
  try {
    return await handle(request);
  } catch (error) {
    return internalError(error);
  }
}
