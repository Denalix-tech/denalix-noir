import { z } from "zod";

import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "./slug";

/**
 * Server-authoritative post validation. The editor runs the same schema in the
 * browser for fast feedback, but the copy that matters is this one — every
 * Server Action re-parses raw form input before touching the database.
 *
 * Limits mirror the CHECK constraints in supabase/migrations.
 */

export const TITLE_MAX = 160;
export const EXCERPT_MAX = 320;
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

/** Collapses "" to null so optional columns stay NULL rather than empty text. */
const optionalText = z
  .string()
  .transform((value) => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .nullable();

export const postInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required.")
      .max(TITLE_MAX, `Title must be ${TITLE_MAX} characters or fewer.`),

    slug: z
      .string()
      .trim()
      .min(1, "Slug is required.")
      .max(SLUG_MAX_LENGTH, `Slug must be ${SLUG_MAX_LENGTH} characters or fewer.`)
      .regex(
        SLUG_PATTERN,
        "Slug may contain only lowercase letters, numbers, and single hyphens between them.",
      ),

    excerpt: z
      .string()
      .trim()
      .min(1, "Excerpt is required.")
      .max(EXCERPT_MAX, `Excerpt must be ${EXCERPT_MAX} characters or fewer.`),

    content: z.string().trim().min(1, "Content is required."),

    coverImageUrl: optionalText,
    coverImageAlt: optionalText.pipe(
      z.string().max(300, "Alt text must be 300 characters or fewer.").nullable(),
    ),

    seoTitle: optionalText.pipe(
      z
        .string()
        .max(SEO_TITLE_MAX, `SEO title must be ${SEO_TITLE_MAX} characters or fewer.`)
        .nullable(),
    ),
    seoDescription: optionalText.pipe(
      z
        .string()
        .max(
          SEO_DESCRIPTION_MAX,
          `SEO description must be ${SEO_DESCRIPTION_MAX} characters or fewer.`,
        )
        .nullable(),
    ),
  })
  // Mirrors posts_cover_alt_required: an image without alt text is rejected.
  .refine((data) => data.coverImageUrl === null || data.coverImageAlt !== null, {
    message: "Alt text is required when a cover image is set.",
    path: ["coverImageAlt"],
  });

export type PostInput = z.infer<typeof postInputSchema>;

export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

/**
 * Minimum password length for accounts created or changed through the app.
 *
 * Longer than Supabase's own 6-character floor. Length is the only requirement:
 * composition rules ("one symbol, one digit") push people toward predictable
 * substitutions and shorter secrets, which is worse.
 */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 200;

const passwordField = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  // bcrypt silently ignores bytes past 72, so a longer value would give a false
  // sense of strength. Capped well below that to keep the failure explicit.
  .max(PASSWORD_MAX, `Use ${PASSWORD_MAX} characters or fewer.`);

/**
 * Self-service access request.
 *
 * The invite code is checked in the Server Action, not here — a mismatch must
 * read as one generic failure rather than a field-level hint that would let
 * someone probe codes against a form.
 */
export const signUpSchema = z
  .object({
    email: z.email("Enter a valid email address."),
    password: passwordField,
    confirmPassword: z.string(),
    inviteCode: z.string().min(1, "An invite code is required."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/** Requesting a recovery email. Deliberately reveals nothing about the address. */
export const requestResetSchema = z.object({
  email: z.email("Enter a valid email address."),
});

/**
 * Setting a password from a recovery link.
 *
 * No current-password field: the whole point is that it has been forgotten. The
 * authority here is the emailed token, checked before this page renders.
 */
export const setNewPasswordSchema = z
  .object({
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "The new password must differ from the current one.",
    path: ["newPassword"],
  });

/** Maps a ZodError onto `{ fieldName: firstMessage }` for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/** Reads a text field from FormData, tolerating absent keys. */
export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
