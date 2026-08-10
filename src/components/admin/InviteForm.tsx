"use client";

import { useActionState, useState } from "react";

import { invitePersonAction, type PeopleFormState } from "@/lib/blog/people-actions";

const INITIAL: PeopleFormState = {};

const INPUT_CLASS =
  "mt-2 w-full rounded-sm border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-white/50";

export function InviteForm() {
  const [state, formAction, pending] = useActionState(invitePersonAction, INITIAL);
  const [copied, setCopied] = useState(false);

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="panel rounded-sm p-6">
      <h2 className="font-display text-base font-semibold text-white">Invite someone</h2>
      <p className="mt-2 text-sm text-muted">
        Creates an account and grants access. They set their own password from the invite link.
      </p>

      <form action={formAction} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px_auto]">
        <div>
          <label htmlFor="invite-email" className="block text-sm font-medium text-white">
            Email
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="name@denalixtech.com"
            aria-invalid={state.fieldErrors?.email ? true : undefined}
            aria-describedby={state.fieldErrors?.email ? "invite-email-error" : undefined}
            className={`${INPUT_CLASS} placeholder:text-muted-soft`}
          />
          {state.fieldErrors?.email ? (
            <p id="invite-email-error" className="mt-2 text-sm text-red-300">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="invite-role" className="block text-sm font-medium text-white">
            Role
          </label>
          <select id="invite-role" name="role" defaultValue="admin" className={INPUT_CLASS}>
            <option value="admin">Admin</option>
            <option value="owner">Superadmin</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-sm bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Inviting…" : "Invite"}
          </button>
        </div>
      </form>

      <div aria-live="polite" className="mt-4 space-y-3">
        {state.error ? (
          <p
            role="alert"
            className="rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {state.success}
          </p>
        ) : null}

        {state.inviteLink ? (
          <div className="rounded-sm border border-white/15 bg-white/[0.03] p-4">
            <p className="text-sm text-white">Invite link</p>
            <p className="mt-1 text-xs text-muted">
              Send this to them directly. It is single-use and expires. If you have configured SMTP
              in Supabase, they will also receive it by email.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="min-w-0 flex-1 truncate rounded-sm bg-black/40 px-3 py-2 font-mono text-xs text-muted">
                {state.inviteLink}
              </code>
              <button
                type="button"
                onClick={() => copyLink(state.inviteLink as string)}
                className="rounded-sm border border-white/15 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-white/40"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
