"use client";

import { useEffect } from "react";

/** Fallback for admin routes without their own error boundary. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] route error", { digest: error.digest });
  }, [error]);

  return (
    <div role="alert" className="panel rounded-sm p-8">
      <h1 className="font-display text-xl font-semibold text-white">Something went wrong</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {error.message || "The page could not be loaded."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-sm border border-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/40"
      >
        Try again
      </button>
    </div>
  );
}
