"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { changePasswordAction, type ChangePasswordState } from "@/lib/blog/account-actions";
import { PASSWORD_MIN } from "@/lib/blog/schema";

const INITIAL: ChangePasswordState = {};

const FIELD =
  "mt-2 w-full rounded-sm border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-muted-soft focus:border-white/40 focus:outline-none";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Changing…" : "Change password"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-red-300">{message}</p>;
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, INITIAL);

  return (
    <form
      action={formAction}
      className="mt-6 max-w-sm space-y-5"
      noValidate
      // Clears the inputs after a successful change so the old password is not
      // left sitting in the DOM.
      key={state.success ?? "form"}
    >
      {state.formError ? (
        <div
          role="alert"
          className="rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {state.formError}
        </div>
      ) : null}

      {state.success ? (
        <div
          role="status"
          className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-100"
        >
          {state.success}
        </div>
      ) : null}

      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-white">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={FIELD}
        />
        <FieldError message={state.fieldErrors?.currentPassword} />
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-white">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          className={FIELD}
        />
        <p className="mt-1.5 text-xs text-muted-soft">
          At least {PASSWORD_MIN} characters. A passphrase beats a short complex string.
        </p>
        <FieldError message={state.fieldErrors?.newPassword} />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className={FIELD}
        />
        <FieldError message={state.fieldErrors?.confirmPassword} />
      </div>

      <SubmitButton />
    </form>
  );
}
