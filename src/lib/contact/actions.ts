"use server";

import { consultationRequestSchema, fieldErrors, formString } from "@/lib/blog/schema";
import { HONEYPOT_FIELD, type ConsultationState } from "./fields";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Consultation request submission.
 *
 * Writes with the **service-role** client on purpose. `consultation_requests` has
 * RLS enabled and no policy for anon, so this Server Action is the only way in.
 * If the table were writable with the publishable key instead, the honeypot and
 * the length validation below could be skipped entirely by posting straight at
 * PostgREST — on a public marketing site that is an open write target.
 *
 * This is the one place in the app where an unauthenticated visitor causes a
 * database write, so it stays deliberately small: validate, check the honeypot,
 * insert, return. No email is sent from here — see the note in the admin screen.
 */

export async function submitConsultationRequestAction(
  _prevState: ConsultationState,
  formData: FormData,
): Promise<ConsultationState> {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) {
    console.error("[contact] submission blocked: Supabase is not fully configured");
    return {
      formError: `Something is misconfigured on our side, so this form cannot be submitted right now. Please email us directly.`,
    };
  }

  // Bots fill every field they find. Report success rather than an error: telling
  // a spammer which check caught them just invites another attempt with it blank.
  if (formString(formData, HONEYPOT_FIELD).trim() !== "") {
    console.warn("[contact] honeypot triggered, discarding submission");
    return { submitted: true };
  }

  const parsed = consultationRequestSchema.safeParse({
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    company: formString(formData, "company"),
    phone: formString(formData, "phone"),
    businessDescription: formString(formData, "businessDescription"),
    helpNeeded: formString(formData, "helpNeeded"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { name, email, company, phone, businessDescription, helpNeeded } = parsed.data;

  const { error } = await createAdminClient()
    .from("consultation_requests")
    .insert({
      name,
      email,
      // Empty optionals become NULL rather than "", so the admin screen can tell
      // "not provided" from "provided as blank".
      company: company || null,
      phone: phone || null,
      business_description: businessDescription,
      help_needed: helpNeeded,
    });

  if (error) {
    console.error("[contact] submission insert failed", { message: error.message });
    return {
      formError:
        "We could not record that. Please try again, or email us directly if it keeps failing.",
    };
  }

  return { submitted: true };
}
