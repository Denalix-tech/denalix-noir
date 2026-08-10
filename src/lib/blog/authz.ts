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
  reason: "unconfigured" | "unauthenticated" | "forbidden";
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

  // An owner can do everything an admin can, so both roles pass here.
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
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
 * Validates a post-login redirect target. Only same-origin absolute paths
 * under /admin are allowed, so a crafted `?next=` cannot bounce a signed-in
 * administrator to an attacker-controlled host.
 */
export function safeAdminRedirect(target: string | null | undefined): string {
  const fallback = "/admin/posts";
  if (!target) return fallback;

  // Reject protocol-relative ("//evil.com") and absolute URLs outright.
  if (!target.startsWith("/") || target.startsWith("//")) return fallback;
  if (!target.startsWith("/admin")) return fallback;
  if (target.startsWith("/admin/login")) return fallback;

  return target;
}
