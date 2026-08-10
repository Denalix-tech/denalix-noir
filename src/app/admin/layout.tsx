import type { Metadata } from "next";

/**
 * Applies to every /admin route, including the login page.
 *
 * Authorization is NOT done here — the (dashboard) layout guards the protected
 * routes, so the login page can remain publicly reachable.
 */
export const metadata: Metadata = {
  title: "Admin — Denalix Tech",
  // Admin surfaces must never be indexed. This is presentation hygiene, not
  // access control; drafts are protected by RLS.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
