"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { setNewPasswordAction, type SetPasswordState } from "@/lib/blog/recovery-actions";
import { PASSWORD_MIN } from "@/lib/blog/schema";

const INITIAL: SetPasswordState = {};

const FIELD =
  "mt-2 w-full rounded-sm border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-muted-soft focus:border-white/40 focus:outline-none";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-sm bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Set new password"}
    </button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(setNewPasswordAction, INITIAL);

  if (state.success) {
    return (
      <div className="mt-8">
        <div
          role="status"
          className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-100"
        >
          <p className="font-medium">Password updated.</p>
          <p className="mt-1.5">You are signed in with the new password.</p>
        </div>

        <Link
          href="/admin/posts"
          className="mt-6 inline-block rounded-sm bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
        >
          Go to admin
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      {state.formError ? (
        <div
          role="alert"
          className="rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-200"
        >
          <p>{state.formError}</p>
          <Link
            href="/admin/forgot-password"
            className="mt-2 inline-block font-medium text-white underline underline-offset-4"
          >
            Request a new link
          </Link>
        </div>
      ) : null}

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
          autoFocus
          className={FIELD}
        />
        <p className="mt-1.5 text-xs text-muted-soft">
          At least {PASSWORD_MIN} characters. A passphrase beats a short complex string.
        </p>
        {state.fieldErrors?.newPassword ? (
          <p className="mt-1.5 text-xs text-red-300">{state.fieldErrors.newPassword}</p>
        ) : null}
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
        {state.fieldErrors?.confirmPassword ? (
          <p className="mt-1.5 text-xs text-red-300">{state.fieldErrors.confirmPassword}</p>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  );
}
