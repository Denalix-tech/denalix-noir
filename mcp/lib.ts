import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Shared plumbing for the blog MCP server.
 *
 * This runs as a plain Node process, not inside Next.js, so it cannot import
 * `src/lib/blog/queries.ts` or `src/lib/supabase/admin.ts` — both import
 * `server-only`, which throws outside a React Server Component. Supabase access
 * therefore lives in `adapters/supabase.ts`, while the modules that genuinely
 * must not drift are reused directly: `blog/schema.ts`, `blog/slug.ts`, and
 * `services-data.ts`.
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

/** Real environment wins over the file, so a hosted run needs no .env.local. */
export const env: Record<string, string | undefined> = {
  ...loadEnv(),
  ...process.env,
};

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
