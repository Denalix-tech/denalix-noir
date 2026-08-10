"use client";

import { useState } from "react";

import { SubmitButton } from "./SubmitButton";
import { revokeAccessAction } from "@/lib/blog/people-actions";

type Props = {
  userId: string;
  email: string | null;
  disabled?: boolean;
  disabledReason?: string;
};

/** Two-step revoke so a single stray click cannot remove someone's access. */
export function RevokeAccessButton({ userId, email, disabled, disabledReason }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (disabled) {
    return (
      <span className="text-sm text-muted-soft" title={disabledReason}>
        {disabledReason ?? "Unavailable"}
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-medium text-red-300 underline underline-offset-4 hover:text-red-200"
      >
        Revoke
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-white">Remove access for {email ?? "this account"}?</span>
      <form action={revokeAccessAction}>
        <input type="hidden" name="userId" value={userId} />
        <SubmitButton
          pendingLabel="Revoking…"
          className="rounded-sm bg-red-500/90 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
        >
          Confirm
        </SubmitButton>
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
      >
        Cancel
      </button>
    </span>
  );
}
