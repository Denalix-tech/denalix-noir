"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitConsultationRequestAction } from "@/lib/contact/actions";
import { HONEYPOT_FIELD, type ConsultationState } from "@/lib/contact/fields";
import { site } from "@/lib/site-config";

const INITIAL: ConsultationState = {};

const FIELD =
  "mt-2 w-full rounded-sm border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-muted-soft focus:border-white/40 focus:outline-none";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending…" : "Request a consultation"}
    </button>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-red-300">
      {message}
    </p>
  );
}

export function ConsultationForm() {
  const [state, formAction] = useActionState(submitConsultationRequestAction, INITIAL);

  if (state.submitted) {
    return (
      <div
        role="status"
        className="panel rounded-sm p-8"
      >
        <h2 className="font-display text-xl font-semibold text-white">Thanks — that&apos;s with us.</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
          We read every enquiry ourselves. You&apos;ll get a reply from a person, not
          an autoresponder — and if we&apos;re not the right fit for what you need,
          we&apos;ll say so rather than book a call anyway.
        </p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-soft">
          If it&apos;s urgent, email{" "}
          <a
            href={`mailto:${site.email}`}
            className="font-medium text-accent underline underline-offset-4 hover:text-white"
          >
            {site.email}
          </a>{" "}
          and reference your name.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="panel rounded-sm p-6 sm:p-8" noValidate>
      {state.formError ? (
        <div
          role="alert"
          className="mb-6 rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-200"
        >
          {state.formError}
        </div>
      ) : null}

      {/*
        Honeypot. Hidden from sight, from assistive technology, and from the tab
        order — a person cannot fill it by accident, which matters because a false
        positive silently discards a real enquiry.
      */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Website</label>
        <input id={HONEYPOT_FIELD} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-white">
            Your name <span className="text-red-300">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className={FIELD}
            aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
          />
          <FieldError id="name-error" message={state.fieldErrors?.name} />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white">
            Email <span className="text-red-300">*</span>
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
          <FieldError id="email-error" message={state.fieldErrors?.email} />
        </div>

        <div>
          <label htmlFor="company" className="block text-sm font-medium text-white">
            Company <span className="text-muted-soft">(optional)</span>
          </label>
          <input
            id="company"
            name="company"
            type="text"
            autoComplete="organization"
            className={FIELD}
          />
          <FieldError id="company-error" message={state.fieldErrors?.company} />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-white">
            Phone <span className="text-muted-soft">(optional)</span>
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={FIELD} />
          <FieldError id="phone-error" message={state.fieldErrors?.phone} />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="businessDescription" className="block text-sm font-medium text-white">
          What does your business do? <span className="text-red-300">*</span>
        </label>
        <textarea
          id="businessDescription"
          name="businessDescription"
          rows={4}
          required
          className={FIELD}
          placeholder="Industry, roughly how big the team is, and how the work reaches you today."
          aria-describedby={
            state.fieldErrors?.businessDescription ? "businessDescription-error" : undefined
          }
        />
        <FieldError
          id="businessDescription-error"
          message={state.fieldErrors?.businessDescription}
        />
      </div>

      <div className="mt-5">
        <label htmlFor="helpNeeded" className="block text-sm font-medium text-white">
          What would you like help with? <span className="text-red-300">*</span>
        </label>
        <textarea
          id="helpNeeded"
          name="helpNeeded"
          rows={5}
          required
          className={FIELD}
          placeholder="The workflow, system, or customer experience that is causing friction — and what happens today when it goes wrong."
          aria-describedby={state.fieldErrors?.helpNeeded ? "helpNeeded-error" : undefined}
        />
        <FieldError id="helpNeeded-error" message={state.fieldErrors?.helpNeeded} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <SubmitButton />
        <p className="text-xs leading-relaxed text-muted-soft">
          We use this only to reply to you. No newsletter, no sharing it on.
        </p>
      </div>
    </form>
  );
}
