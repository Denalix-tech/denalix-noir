import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";
import { getSupabaseConfig } from "./env";

/** Lets Server Components learn the current path (for safe return URLs). */
export const PATHNAME_HEADER = "x-denalix-pathname";

/**
 * Refreshes the Supabase session on every matched request and writes rotated
 * auth cookies onto the outgoing response.
 *
 * This is an optimistic session refresh only — it deliberately performs no
 * authorization. Every admin page and Server Action re-checks the session and
 * the admin role itself, because a proxy cannot be the security boundary.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const config = getSupabaseConfig();
  // Without configuration there is no session to refresh; marketing routes
  // must keep working regardless.
  if (!config) return response;

  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Responses that rotate auth cookies must not be cached by a CDN,
        // or one visitor's tokens could be served to another.
        for (const [key, headerValue] of Object.entries(headers ?? {})) {
          response.headers.set(key, headerValue);
        }
      },
    },
  });

  // Must run before the response is committed so a token refresh can be
  // written back to cookies.
  await supabase.auth.getUser();

  return response;
}
