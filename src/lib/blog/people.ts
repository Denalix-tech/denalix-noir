import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileRole } from "@/lib/supabase/database.types";

/**
 * Reads for the people-management screen.
 *
 * `auth.users` is not exposed through PostgREST, so listing accounts needs the
 * service-role client. Callers must already have proven the caller is an owner.
 */

export type Person = {
  id: string;
  email: string | null;
  /** null means the account exists but has no access to the admin area. */
  role: ProfileRole | null;
  displayName: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  /** Invited but has not accepted yet. */
  pending: boolean;
};

/** Small-team assumption; revisit if the account list ever outgrows one page. */
const PAGE_SIZE = 200;

const ROLE_ORDER: Record<string, number> = { owner: 0, admin: 1 };

export async function listPeople(): Promise<Person[]> {
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: PAGE_SIZE });
  if (error) {
    console.error("[people] listUsers failed", { message: error.message });
    throw new Error("Could not load accounts.");
  }

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, role, display_name");

  if (profileError) {
    console.error("[people] profiles read failed", { message: profileError.message });
    throw new Error("Could not load roles.");
  }

  const byId = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const people: Person[] = data.users.map((user) => {
    const profile = byId.get(user.id);
    return {
      id: user.id,
      email: user.email ?? null,
      role: profile?.role ?? null,
      displayName: profile?.display_name ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at,
      pending: !user.last_sign_in_at,
    };
  });

  // Owners first, then admins, then accounts with no access.
  return people.sort((a, b) => {
    const rank = (r: string | null) => (r ? (ROLE_ORDER[r] ?? 2) : 3);
    const diff = rank(a.role) - rank(b.role);
    if (diff !== 0) return diff;
    return (a.email ?? "").localeCompare(b.email ?? "");
  });
}

/** Guards against demoting or removing the final owner in the UI layer. */
export async function countOwners(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner");

  if (error) {
    console.error("[people] owner count failed", { message: error.message });
    // Fail closed: pretend there is only one so destructive actions are blocked.
    return 1;
  }

  return count ?? 0;
}
