/**
 * Mints a password-recovery link for an admin, printed to your terminal instead
 * of emailed.
 *
 *   npx tsx scripts/recovery-link.mts someone@denalixtech.com
 *
 * Why this exists: Supabase's built-in mailer allows **2 emails per hour for the
 * whole project**, and refuses to raise that without custom SMTP. So the ordinary
 * `/admin/forgot-password` flow is easy to lock yourself out of during setup or
 * testing. `generateLink` creates the same token the email would carry without
 * sending anything, so it consumes no quota.
 *
 * It is also the way to recover a locked-out superadmin when email is broken
 * entirely — which, with no SMTP configured, is the state this project is in.
 *
 * SECURITY: the printed URL is a one-hour account-takeover credential for that
 * account. Treat it like a password — do not paste it into chat, a ticket, or a
 * shared terminal. It needs `SUPABASE_SERVICE_ROLE_KEY`, so run it locally only.
 */

import { createClient } from "@supabase/supabase-js";

import { env } from "../mcp/lib";
import { SITE_ORIGIN } from "../src/lib/site-url";
import type { Database } from "../src/lib/supabase/database.types";

const email = process.argv[2];

if (!email) {
  console.error(
    "Usage: npx tsx scripts/recovery-link.mts <email>\n\n" +
      "Prints a recovery link for that account without sending an email.",
  );
  process.exit(2);
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.",
  );
  process.exit(2);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// `origin` decides which host the link lands on. Default to production; pass
// --local while developing, since both are in Supabase's redirect allow list.
const origin = process.argv.includes("--local") ? "http://localhost:3000" : SITE_ORIGIN;

const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });

if (error) {
  console.error(`Could not generate a link: ${error.message}`);
  if (/not found/i.test(error.message)) {
    console.error("No account with that address. Check the spelling, or invite them first.");
  }
  process.exit(1);
}

const tokenHash = data?.properties?.hashed_token;

if (!tokenHash) {
  console.error("Supabase returned no token. Nothing to hand over.");
  process.exit(1);
}

// Built by hand rather than using Supabase's own `action_link`, so it points at
// this app's callback and carries the `type` the callback branches on.
const link = `${origin}/admin/auth/callback?token_hash=${tokenHash}&type=recovery`;

console.log(`
Recovery link for ${email}

  ${link}

Valid for one hour, single use. It signs that account in and sends it straight to
/admin/reset-password.

This is an account-takeover credential — send it the way you would send a
password, and only to the person who owns the account.
`);
