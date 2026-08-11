/**
 * Form result shapes for access requests.
 *
 * Separate from `access-request-actions.ts` because a `"use server"` module may
 * only export async functions. Types are erased at runtime, but keeping them here
 * means the client components import from a module with no server dependencies at
 * all.
 */

export type AccessRequestState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  submitted?: boolean;
  /** A pending request already existed for that address. */
  alreadyPending?: boolean;
};

export type ReviewState = {
  error?: string;
  success?: string;
  /**
   * The one-time link the approved person uses to set a password.
   *
   * Shown on screen because `generateLink` sends no mail: with SMTP configured
   * Supabase emails the invite, and without it a superadmin has to pass this on
   * manually or the approval goes nowhere.
   */
  inviteLink?: string;
};
