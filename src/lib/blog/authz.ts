import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database, ProfileRow } from "@/lib/supabase/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Authorization for every admin surface.
 *
 * Hiding /admin in the UI is not access control. This module is called at the
 * top of every admin page *and* independently inside every Server Action,
 * because a Server Action is a public endpoint. RLS is the final backstop.
 */

export type AdminContext = {
  ok: true;
  supabase: SupabaseClient<Database>;
  user: User;
  profile: ProfileRow;
  /** Owners may additionally grant and revoke access. */
  isOwner: boolean;
};

export type AuthFailure = {
  ok: false;
  /**
   * `pending` — signed in, but no profile row yet, so a superadmin has not
   * approved this account. Distinguished from `forbidden` only to show the right
   * message: both deny access identically.
   */
  reason: "unconfigured" | "unauthenticated" | "pending" | "forbidden";
};

export type AdminResult = AdminContext | AuthFailure;

export async function loadAdminContext(): Promise<AdminResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "unconfigured" };

  const supabase = await createClient();

  // getUser() revalidates the token with the auth server. getSession() alone
  // would trust a cookie the client could have tampered with.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { ok: false, reason: "unauthenticated" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[admin] failed to load profile", {
      userId: user.id,
      message: profileError.message,
    });
    return { ok: false, reason: "forbidden" };
  }

  // No profile row means nobody has granted this account a role yet. Self-service
  // sign-ups land here, and stay here until a superadmin approves them — the
  // `profiles: owners insert` policy is what makes that a real gate.
  if (!profile) return { ok: false, reason: "pending" };

  // An owner (labelled "Superadmin" in the UI) can do everything an admin can, so
  // both roles pass here.
  if (profile.role !== "admin" && profile.role !== "owner") {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, supabase, user, profile, isOwner: profile.role === "owner" };
}

/**
 * Owner-only gate for the people-management surface. Returns the same failure
 * shape as loadAdminContext, with "forbidden" covering a plain admin.
 */
export async function loadOwnerContext(): Promise<AdminResult> {
  const context = await loadAdminContext();
  if (!context.ok) return context;
  if (!context.isOwner) return { ok: false, reason: "forbidden" };
  return context;
}

/**
 * Paths the login flow may return to, matched against the portion of the target
 * before any query string.
 *
 * `/oauth/authorize` is here because the OAuth consent screen reuses this same
 * login: an unauthenticated authorization request lands on `/admin/login` and
 * must come back to finish. It carries a query string, which `/admin` targets
 * never do — hence the path/query split below.
 */
const ALLOWED_REDIRECT_PREFIXES = ["/admin", "/oauth/authorize"] as const;

/**
 * Validates a post-login redirect target. Only same-origin absolute paths on the
 * allowlist above are accepted, so a crafted `?next=` cannot bounce a signed-in
 * administrator to an attacker-controlled host.
 */
export function safeAdminRedirect(target: string | null | undefined): string {
  const fallback = "/admin/posts";
  if (!target) return fallback;

  // Reject protocol-relative ("//evil.com") and absolute URLs outright.
  if (!target.startsWith("/") || target.startsWith("//")) return fallback;

  // A backslash is treated as a path separator by some user agents, so "/\evil.com"
  // can navigate off-origin. Refuse it rather than trying to normalise it.
  if (target.includes("\\")) return fallback;

  // Compare the path only. Without this, "/admin.evil.com" would pass a bare
  // startsWith("/admin") check.
  const [path] = target.split(/[?#]/, 1);
  const allowed = ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  if (!allowed) return fallback;

  // Bouncing back to the login page would loop.
  if (path === "/admin/login") return fallback;

  return target;
}
