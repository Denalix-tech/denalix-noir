/**
 * End-to-end verification for the MCP OAuth 2.1 grant.
 *
 *   npm run build
 *   MCP_OAUTH_ENABLED=true SITES_ENABLED=denalixtech npx next start -p 3114
 *   npx tsx scripts/verify-mcp-oauth.mts
 *
 * Covers everything that touches the `oauth_*` tables: dynamic client
 * registration, code exchange with PKCE, the bearer call into MCP, single-use
 * code enforcement, refresh rotation, replay detection, revocation, and scope
 * gating.
 *
 * **What it does not cover: the consent screen.** Approving a client requires a
 * signed-in administrator in a browser, which is the human gate that makes open
 * client registration safe. This script mints the authorization code directly —
 * exactly as `approveAuthorizationAction` would after a human clicked Approve —
 * so it verifies the protocol, not the UI. Check `/oauth/authorize` by hand once.
 *
 * Creates two throwaway clients and deletes them (and their cascaded codes and
 * tokens) at the end, including on failure.
 */

import { createHash, randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { env } from "../mcp/lib";
import { generateAuthorizationCode, hashToken } from "../src/lib/mcp-auth/crypto";
import type { Database } from "../src/lib/supabase/database.types";

const BASE = process.env.MCP_TEST_BASE ?? "http://localhost:3114";
/** Must match `MCP_RESOURCE` in src/lib/mcp-auth/config.ts. */
const RESOURCE = "https://www.denalixtech.com/api/mcp";
const REDIRECT_URI = "http://localhost:9999/cb";

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail?: unknown): void {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}`);
    if (detail !== undefined) console.log(`       ${JSON.stringify(detail)}`);
  }
}

function db() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** PKCE pair, generated the way a real client would. */
function pkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}

async function registerClient(scope: string, name: string): Promise<string> {
  const response = await fetch(`${BASE}/oauth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: name,
      redirect_uris: [REDIRECT_URI],
      scope,
    }),
  });
  const body = await response.json();
  if (response.status !== 201) {
    throw new Error(`Registration failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body.client_id as string;
}

/**
 * Mints an authorization code directly, standing in for a human approving the
 * consent screen. Mirrors `issueAuthorizationCode` in the store.
 */
async function approveAsHuman(
  clientId: string,
  userId: string,
  challenge: string,
  scopes: string[],
): Promise<string> {
  const code = generateAuthorizationCode();
  const { error } = await db()
    .from("oauth_authorization_codes")
    .insert({
      code_hash: hashToken(code),
      client_id: clientId,
      user_id: userId,
      redirect_uri: REDIRECT_URI,
      code_challenge: challenge,
      code_challenge_method: "S256",
      scopes,
      resource: RESOURCE,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
  if (error) throw new Error(`Could not mint code: ${error.message}`);
  return code;
}

async function postForm(path: string, form: Record<string, string>) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
  });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* revocation returns an empty body */
  }
  return { status: response.status, body: body as Record<string, unknown> | null };
}

/** Calls MCP and returns the status plus the tool names, parsing the SSE frame. */
async function listTools(accessToken: string): Promise<{ status: number; tools: string[] }> {
  const response = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
  });

  const text = await response.text();
  const line = text
    .split("\n")
    .map((l) => l.replace(/^data: /, "").trim())
    .find((l) => l.startsWith("{") && l.includes("result"));

  if (!line) return { status: response.status, tools: [] };

  const parsed = JSON.parse(line) as { result?: { tools?: { name: string }[] } };
  return {
    status: response.status,
    tools: (parsed.result?.tools ?? []).map((t) => t.name).sort(),
  };
}

async function main(): Promise<void> {
  // ---- preflight -------------------------------------------------------
  const client = db();

  const { error: tableError } = await client
    .from("oauth_clients")
    .select("client_id")
    .limit(1);

  if (tableError) {
    console.error(
      `\nThe oauth_* tables are not present: ${tableError.message}\n\n` +
        "Apply supabase/migrations/20260810120000_add_mcp_oauth.sql first —\n" +
        "either `npx supabase db push` after linking, or paste the file into the\n" +
        "Supabase SQL editor. See docs/features/MCP_SERVER_AND_SYNDICATION.md §3.2.\n",
    );
    process.exit(2);
  }

  const health = await fetch(`${BASE}/.well-known/oauth-authorization-server`).catch(
    () => null,
  );
  if (!health || health.status !== 200) {
    console.error(
      `\nNo OAuth-enabled server at ${BASE} (got ${health?.status ?? "no response"}).\n` +
        "Start one with:\n" +
        "  MCP_OAUTH_ENABLED=true SITES_ENABLED=denalixtech npx next start -p 3114\n",
    );
    process.exit(2);
  }

  const { data: owner, error: ownerError } = await client
    .from("profiles")
    .select("id")
    .in("role", ["owner", "admin"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownerError || !owner) {
    console.error("\nNo owner/admin profile found. Grant one first (README §6).\n");
    process.exit(2);
  }

  const createdClients: string[] = [];

  try {
    // ---- full grant, both scopes ---------------------------------------
    console.log("\nAuthorization code grant (blog:read blog:draft)");
    const fullClient = await registerClient("blog:read blog:draft", "verify: full");
    createdClients.push(fullClient);
    check("dynamic client registration returns a client_id", Boolean(fullClient));

    const { verifier, challenge } = pkce();
    const code = await approveAsHuman(fullClient, owner.id, challenge, [
      "blog:read",
      "blog:draft",
    ]);

    const wrongVerifier = await postForm("/oauth/token", {
      grant_type: "authorization_code",
      client_id: fullClient,
      code,
      code_verifier: randomBytes(32).toString("base64url"),
      redirect_uri: REDIRECT_URI,
    });
    check(
      "wrong PKCE verifier rejected with invalid_grant",
      wrongVerifier.status === 400 && wrongVerifier.body?.error === "invalid_grant",
      wrongVerifier.body,
    );

    // The failed attempt above must not have consumed the code.
    const exchange = await postForm("/oauth/token", {
      grant_type: "authorization_code",
      client_id: fullClient,
      code,
      code_verifier: verifier,
      redirect_uri: REDIRECT_URI,
    });
    check("code exchange succeeds after a failed PKCE attempt", exchange.status === 200, exchange.body);

    const accessToken = exchange.body?.access_token as string;
    const refreshToken = exchange.body?.refresh_token as string;
    check("returns Bearer token_type", exchange.body?.token_type === "Bearer");
    check("returns expires_in", typeof exchange.body?.expires_in === "number");
    check("returns both granted scopes", exchange.body?.scope === "blog:read blog:draft");

    const stored = await client
      .from("oauth_tokens")
      .select("token_hash")
      .eq("token_hash", accessToken)
      .maybeSingle();
    check("raw token is NOT stored in oauth_tokens", stored.data === null);

    const hashed = await client
      .from("oauth_tokens")
      .select("kind, resource")
      .eq("token_hash", hashToken(accessToken))
      .maybeSingle();
    check("token IS stored as a sha256 hash", hashed.data?.kind === "access");
    check("token is bound to the MCP resource", hashed.data?.resource === RESOURCE);

    // ---- the bearer call ----------------------------------------------
    console.log("\nMCP call with the access token");
    const full = await listTools(accessToken);
    check("tools/list returns 200", full.status === 200);
    check("all nine tools present", full.tools.length === 9, full.tools);
    check("create_draft present under blog:draft", full.tools.includes("create_draft"));

    // ---- single use ----------------------------------------------------
    console.log("\nAuthorization code is single-use");
    const replay = await postForm("/oauth/token", {
      grant_type: "authorization_code",
      client_id: fullClient,
      code,
      code_verifier: verifier,
      redirect_uri: REDIRECT_URI,
    });
    check(
      "replaying a consumed code is rejected",
      replay.status === 400 && replay.body?.error === "invalid_grant",
      replay.body,
    );

    // ---- refresh rotation ---------------------------------------------
    console.log("\nRefresh rotation and replay detection");
    const refreshed = await postForm("/oauth/token", {
      grant_type: "refresh_token",
      client_id: fullClient,
      refresh_token: refreshToken,
    });
    check("refresh returns a new token pair", refreshed.status === 200, refreshed.body);
    const rotatedAccess = refreshed.body?.access_token as string;
    check(
      "the new access token differs from the old",
      Boolean(rotatedAccess) && rotatedAccess !== accessToken,
    );

    const narrowed = await postForm("/oauth/token", {
      grant_type: "refresh_token",
      client_id: fullClient,
      refresh_token: refreshed.body?.refresh_token as string,
      scope: "blog:read",
    });
    check("refresh may narrow scope", narrowed.body?.scope === "blog:read", narrowed.body);

    const refreshReplay = await postForm("/oauth/token", {
      grant_type: "refresh_token",
      client_id: fullClient,
      refresh_token: refreshToken,
    });
    check(
      "replaying the original refresh token is rejected",
      refreshReplay.status === 400 && refreshReplay.body?.error === "invalid_grant",
      refreshReplay.body,
    );

    const familyRevoked = await listTools(rotatedAccess);
    check(
      "replay revoked the whole token family (rotated access token now dead)",
      familyRevoked.status === 401,
      familyRevoked.status,
    );

    // ---- concurrent refresh (the grace window) --------------------------
    //
    // Its own grant, deliberately. The chain above rotates twice before
    // replaying, so by then the successor is itself spent and the replay is
    // real — which is why those assertions still expect a rejection. This one
    // presents the same token twice with nothing in between, which is what two
    // client processes sharing a token store actually do.
    console.log("\nConcurrent refresh within the grace window");
    const raceClient = await registerClient("blog:read blog:draft", "verify: race");
    createdClients.push(raceClient);
    const racePkce = pkce();
    const raceCode = await approveAsHuman(raceClient, owner.id, racePkce.challenge, [
      "blog:read",
      "blog:draft",
    ]);
    const raceExchange = await postForm("/oauth/token", {
      grant_type: "authorization_code",
      client_id: raceClient,
      code: raceCode,
      code_verifier: racePkce.verifier,
      redirect_uri: REDIRECT_URI,
    });
    const raceRefresh = raceExchange.body?.refresh_token as string;

    const firstUse = await postForm("/oauth/token", {
      grant_type: "refresh_token",
      client_id: raceClient,
      refresh_token: raceRefresh,
    });
    check("first refresh succeeds", firstUse.status === 200, firstUse.body);

    const secondUse = await postForm("/oauth/token", {
      grant_type: "refresh_token",
      client_id: raceClient,
      refresh_token: raceRefresh,
    });
    check(
      "the same refresh token presented again is honoured, not rejected",
      secondUse.status === 200,
      secondUse.body,
    );
    check(
      "the racing client gets its own distinct pair",
      Boolean(secondUse.body?.refresh_token) &&
        secondUse.body?.refresh_token !== firstUse.body?.refresh_token,
    );

    const winnerStillLive = await listTools(firstUse.body?.access_token as string);
    check(
      "the first client's token is NOT collateral damage",
      winnerStillLive.status === 200,
      winnerStillLive.status,
    );

    const loserWorks = await listTools(secondUse.body?.access_token as string);
    check("the second client's token works too", loserWorks.status === 200, loserWorks.status);

    // ---- scope gating over the wire -----------------------------------
    console.log("\nScope gating (blog:read only)");
    const readClient = await registerClient("blog:read", "verify: read-only");
    createdClients.push(readClient);
    const readPkce = pkce();
    const readCode = await approveAsHuman(readClient, owner.id, readPkce.challenge, [
      "blog:read",
    ]);
    const readExchange = await postForm("/oauth/token", {
      grant_type: "authorization_code",
      client_id: readClient,
      code: readCode,
      code_verifier: readPkce.verifier,
      redirect_uri: REDIRECT_URI,
    });
    check("read-only exchange succeeds", readExchange.status === 200, readExchange.body);

    const readTools = await listTools(readExchange.body?.access_token as string);
    // Seven, not six: check_seo joined the read group. The count is asserted
    // rather than just the absences, so a write tool leaking into blog:read
    // fails here even if nobody thinks to name it.
    check("read-only token sees seven tools", readTools.tools.length === 7, readTools.tools);
    check("create_draft ABSENT", !readTools.tools.includes("create_draft"));
    check("generate_cover_image ABSENT", !readTools.tools.includes("generate_cover_image"));
    check("list_posts present", readTools.tools.includes("list_posts"));

    // ---- revocation ----------------------------------------------------
    console.log("\nRevocation (RFC 7009)");
    const readAccess = readExchange.body?.access_token as string;
    const revoke = await postForm("/oauth/revoke", {
      token: readAccess,
      client_id: readClient,
    });
    check("revocation returns 200", revoke.status === 200);

    const afterRevoke = await listTools(readAccess);
    check("revoked token is rejected immediately", afterRevoke.status === 401, afterRevoke.status);

    const unknownRevoke = await postForm("/oauth/revoke", {
      token: "not-a-real-token",
      client_id: readClient,
    });
    check("revoking an unknown token still returns 200 (no oracle)", unknownRevoke.status === 200);
  } finally {
    // Cascades to codes and tokens.
    if (createdClients.length > 0) {
      const { error } = await db()
        .from("oauth_clients")
        .delete()
        .in("client_id", createdClients);
      console.log(
        error
          ? `\nCleanup FAILED, remove manually: ${createdClients.join(", ")} — ${error.message}`
          : `\nCleaned up ${createdClients.length} test client(s).`,
      );
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

await main();
