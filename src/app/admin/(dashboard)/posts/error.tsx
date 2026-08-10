"use client";

import { useEffect } from "react";

export default function PostsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] posts route error", { digest: error.digest });
  }, [error]);

  return (
    <div role="alert" className="panel rounded-sm p-8">
      <h1 className="font-display text-xl font-semibold text-white">Something went wrong</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {/*
          Server Action errors reach the client already redacted in production;
          this shows whatever safe message survived.
        */}
        {error.message || "The posts could not be loaded."}
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
