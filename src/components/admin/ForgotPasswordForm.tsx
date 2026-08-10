"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  requestPasswordResetAction,
  type RequestResetState,
} from "@/lib/blog/recovery-actions";

const INITIAL: RequestResetState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-sm bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send reset link"}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, INITIAL);

  // Identical whether or not the address has an account.
  if (state.submitted) {
    return (
      <div className="mt-8">
        <div
          role="status"
          className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-100"
        >
          <p className="font-medium">Check your inbox.</p>
          <p className="mt-1.5">
            If that address has an account, a reset link is on its way. It expires
            in an hour, and opening it lets you set a new password once.
          </p>
        </div>

        <p className="mt-6 text-sm text-muted">
          <Link
            href="/admin/login"
            className="font-medium text-white underline underline-offset-4 hover:text-white/80"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      {state.formError ? (
        <div
          role="alert"
          className="rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {state.formError}
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 w-full rounded-sm border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-muted-soft focus:border-white/40 focus:outline-none"
        />
        {state.fieldErrors?.email ? (
          <p className="mt-1.5 text-xs text-red-300">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  );
}
