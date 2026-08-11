"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { requestAccessAction } from "@/lib/blog/access-request-actions";
import type { AccessRequestState } from "@/lib/blog/access-request-state";

const INITIAL: AccessRequestState = {};

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

export function AccessRequestForm() {
  const [state, formAction] = useActionState(requestAccessAction, INITIAL);

  if (state.submitted) {
    return (
      <div className="mt-8">
        <div
          role="status"
          className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-100"
        >
          <p className="font-medium">
            {state.alreadyPending ? "That request is already waiting." : "Request sent."}
          </p>
          <p className="mt-1.5">
            {state.alreadyPending
              ? "A superadmin has it in their queue. Asking again will not move it along."
              : "A superadmin reviews it. If approved, you will get a one-time link to set your own password — no account exists until then."}
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
          Email to grant access to <span className="text-red-300">*</span>
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
        <p className="mt-1.5 text-xs text-muted-soft">
          You will set a password for this address after approval.
        </p>
        {state.fieldErrors?.email ? (
          <p id="email-error" className="mt-1.5 text-xs text-red-300">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-white">
          Your name <span className="text-muted-soft">(optional)</span>
        </label>
        <input id="name" name="name" type="text" autoComplete="name" className={FIELD} />
        {state.fieldErrors?.name ? (
          <p className="mt-1.5 text-xs text-red-300">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-white">
          Why do you need access? <span className="text-muted-soft">(optional)</span>
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          className={FIELD}
          placeholder="Who you are and what you will be doing — it makes the decision quicker."
        />
        {state.fieldErrors?.reason ? (
          <p className="mt-1.5 text-xs text-red-300">{state.fieldErrors.reason}</p>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  );
}
