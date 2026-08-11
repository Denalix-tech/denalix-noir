/**
 * Field names and result shapes shared by the consultation form and its action.
 *
 * Separate from `actions.ts` because a `"use server"` module may only export
 * async functions — exporting a plain constant from there makes the whole module
 * fail to resolve for the client, taking the action's own export down with it.
 *
 * Nothing here is secret: the honeypot's value comes from the browser either way,
 * so knowing the name buys an attacker nothing. Its usefulness is that ordinary
 * bots fill every input they find.
 */

/**
 * Chosen to look worth filling in to a bot and to mean nothing to a person. It is
 * hidden, unfocusable, and aria-hidden, so a human cannot fill it by accident —
 * which matters, because a false positive silently discards a real enquiry.
 */
export const HONEYPOT_FIELD = "website_url";

export type ConsultationState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  submitted?: boolean;
};
