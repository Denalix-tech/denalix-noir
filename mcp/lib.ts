import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/supabase/database.types";

/**
 * Shared plumbing for the blog MCP server.
 *
 * This runs as a plain Node process, not inside Next.js, so it cannot import
 * `src/lib/blog/queries.ts` or `src/lib/supabase/admin.ts` — both import
 * `server-only`, which throws outside a React Server Component. It therefore
 * builds its own Supabase client here (a handful of lines, nothing worth
 * sharing) while reusing the modules that genuinely must not drift:
 * `blog/schema.ts`, `blog/slug.ts`, and `services-data.ts`.
 */

const ROOT = resolve(import.meta.dirname, "..");

/** Minimal .env.local reader — avoids taking a dotenv dependency. */
function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
    return Object.fromEntries(
      raw
        .split("\n")
        .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
        .map((line) => {
          const i = line.indexOf("=");
          return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env };

export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Service-role client. **Bypasses RLS.** This server is a local developer tool
 * launched over stdio by Claude Code — it must never be deployed or exposed
 * over a network port.
 */
export function db(): SupabaseClient<Database> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  return createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Posts must be attributed to a real account; use the site owner. */
export async function ownerId(client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Could not read owner profile: ${error.message}`);
  if (!data) {
    throw new Error(
      "No owner profile found. Grant an owner role first — see README.md.",
    );
  }
  return data.id;
}

/** MCP tools return content blocks; this keeps the call sites terse. */
export function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

export function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}
