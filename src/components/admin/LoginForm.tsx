"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signInAction, type SignInState } from "@/lib/blog/auth-actions";

const INITIAL: SignInState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-sm bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signInAction, INITIAL);

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />

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
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          className="mt-2 w-full rounded-sm border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted-soft focus:border-white/50"
        />
        {state.fieldErrors?.email ? (
          <p id="email-error" className="mt-2 text-sm text-red-300">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          className="mt-2 w-full rounded-sm border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-muted-soft focus:border-white/50"
        />
        {state.fieldErrors?.password ? (
          <p id="password-error" className="mt-2 text-sm text-red-300">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  );
}
