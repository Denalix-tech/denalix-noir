import "server-only";

import { safeEqual } from "@/lib/mcp-auth/crypto";

/**
 * Invite-code configuration for self-service access requests.
 *
 * Separate from `account-actions.ts` because a `"use server"` module may only
 * export async functions, and both of these are synchronous predicates the
 * sign-up page needs to render.
 *
 * `server-only` keeps the comparison — and any chance of the code reaching a
 * client bundle — on the server.
 */

/**
 * Whether requests are accepted at all.
 *
 * Fails closed: with no `SIGNUP_INVITE_CODE` set, the page shows a closed notice
 * and the action refuses, so deploying this code never opens registration by
 * omission.
 */
export function isSignUpEnabled(): boolean {
  return Boolean(process.env.SIGNUP_INVITE_CODE);
}

/**
 * Constant-time invite-code check.
 *
 * The code only suppresses drive-by sign-ups; it is not authorization. A request
 * creates an `auth.users` row and no `profiles` row, and only a superadmin can
 * insert the latter, so approval is enforced by RLS rather than here.
 */
export function inviteCodeMatches(given: string): boolean {
  const expected = process.env.SIGNUP_INVITE_CODE ?? "";
  // Fails closed, and before the comparison, so an unset code can never match.
  if (!expected) return false;

  return safeEqual(given, expected);
}
