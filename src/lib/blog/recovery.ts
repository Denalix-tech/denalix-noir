import "server-only";

/**
 * The marker that says "this session came from a recovery link".
 *
 * Why it exists: after the callback exchanges a recovery token, the visitor holds
 * an ordinary session. Without a marker, `/admin/reset-password` would let anyone
 * with a *stolen session cookie* set a new password with no knowledge of the old
 * one — undoing the current-password requirement on `/admin/account`.
 *
 * So the callback sets this short-lived cookie, the reset page and its action
 * both require it, and the action clears it once used. An attacker with only a
 * session cookie cannot mint it; it is issued solely by the callback, which needs
 * a valid token from the email.
 */

export const RECOVERY_COOKIE = "denalix-recovery";

/** Long enough to choose a password, short enough to be useless if left behind. */
export const RECOVERY_COOKIE_MAX_AGE = 15 * 60;

export const recoveryCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  // Lax rather than strict: the visitor arrives via a cross-site redirect from
  // Supabase, and strict would drop the cookie on that navigation.
  secure: process.env.NODE_ENV === "production",
  path: "/admin",
  maxAge: RECOVERY_COOKIE_MAX_AGE,
};
