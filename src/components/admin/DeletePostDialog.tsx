"use client";

import { useId, useState } from "react";

import { SubmitButton } from "./SubmitButton";
import { deletePostAction } from "@/lib/blog/actions";

type Props = {
  postId: string;
  title: string;
  slug: string;
};

/**
 * Deletion requires retyping the post's slug, so the confirmation identifies
 * exactly which post is about to be destroyed.
 */
export function DeletePostDialog({ postId, title, slug }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const inputId = useId();

  const matches = confirmation.trim() === slug;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-red-300 underline underline-offset-4 transition-colors hover:text-red-200"
      >
        Delete
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Delete ${title}`}
      className="mt-3 rounded-sm border border-red-500/40 bg-red-500/[0.07] p-4"
    >
      <p className="text-sm text-white">
        Delete <span className="font-semibold">{title}</span>? This cannot be undone.
      </p>

      <label htmlFor={inputId} className="mt-3 block text-xs text-muted">
        Type <code className="font-mono text-white">{slug}</code> to confirm.
      </label>
      <input
        id={inputId}
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        autoComplete="off"
        className="mt-2 w-full rounded-sm border border-white/15 bg-white/[0.04] px-3 py-2 font-mono text-sm text-white outline-none focus:border-white/50"
      />

      <div className="mt-3 flex items-center gap-3">
        <form action={deletePostAction}>
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="confirmSlug" value={confirmation} />
          <SubmitButton
            pendingLabel="Deleting…"
            className="rounded-sm bg-red-500/90 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
          >
            Delete permanently
          </SubmitButton>
        </form>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmation("");
          }}
          className="text-sm font-medium text-muted underline underline-offset-4 hover:text-white"
        >
          Cancel
        </button>
      </div>

      {!matches && confirmation.length > 0 ? (
        <p className="mt-2 text-xs text-red-300">Text does not match the slug yet.</p>
      ) : null}
    </div>
  );
}
