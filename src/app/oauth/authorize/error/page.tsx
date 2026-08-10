import type { Metadata } from "next";
import Link from "next/link";

/**
 * Terminal error page for an authorization request that could not be safely
 * redirected — an unknown `client_id`, or a `redirect_uri` the client never
 * registered (RFC 6749 §4.1.2.1).
 *
 * The consent page renders its own inline error for the same conditions. This
 * route exists for the Server Actions, which can only respond by redirecting.
 */

export const metadata: Metadata = {
  title: "Authorization failed — Denalix Tech",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AuthorizeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="panel max-w-md rounded-sm p-8">
        <h1 className="font-display text-xl font-semibold text-white">
          Authorization failed
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {/* Rendered as text by React, so a crafted `message` cannot inject markup. */}
          {message?.trim() || "The authorization request could not be completed."}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-soft">
          No access was granted and no token was issued.
        </p>
        <Link
          href="/admin/posts"
          className="mt-6 inline-block text-sm font-medium text-muted hover:text-white"
        >
          Go to admin
        </Link>
      </div>
    </main>
  );
}
