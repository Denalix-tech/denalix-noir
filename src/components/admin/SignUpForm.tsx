"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { requestAccessAction, type SignUpState } from "@/lib/blog/account-actions";
import { PASSWORD_MIN } from "@/lib/blog/schema";

const INITIAL: SignUpState = {};

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
      {pending ? "Sending request…" : "Request access"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-red-300">{message}</p>;
}

export function SignUpForm() {
  const [state, formAction] = useActionState(requestAccessAction, INITIAL);

  // The same notice regardless of whether the address was new, so the form
  // cannot be used to discover which addresses already have accounts.
  if (state.submitted) {
    return (
      <div className="mt-8">
        <div
          role="status"
          className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-100"
        >
          <p className="font-medium">Request received.</p>
          <p className="mt-1.5">
            {state.needsConfirmation
              ? "Check your inbox for a confirmation link, then wait for a superadmin to approve your access."
              : "A superadmin has to approve your access before you can use the admin area."}
          </p>
        </div>

        <p className="mt-6 text-sm text-muted">
          Already approved?{" "}
          <Link
            href="/admin/login"
            className="font-medium text-white underline underline-offset-4 hover:text-white/80"
          >
            Sign in
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
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={FIELD}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
        />
        <span id="email-error">
          <FieldError message={state.fieldErrors?.email} />
        </span>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          className={FIELD}
        />
        <p className="mt-1.5 text-xs text-muted-soft">
          At least {PASSWORD_MIN} characters. Length matters more than symbols.
        </p>
        <FieldError message={state.fieldErrors?.password} />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
          Confirm password
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

      <div>
        <label htmlFor="inviteCode" className="block text-sm font-medium text-white">
          Invite code
        </label>
        <input
          id="inviteCode"
          name="inviteCode"
          type="text"
          autoComplete="off"
          required
          className={FIELD}
        />
        <p className="mt-1.5 text-xs text-muted-soft">Ask a superadmin for the current code.</p>
        <FieldError message={state.fieldErrors?.inviteCode} />
      </div>

      <SubmitButton />
    </form>
  );
}
