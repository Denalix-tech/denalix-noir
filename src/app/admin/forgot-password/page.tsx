import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/admin/ForgotPasswordForm";
import { Logo } from "@/components/ui/Logo";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Reset your password — Denalix Tech",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            Denalix
          </span>
        </Link>

        <h1 className="font-display mt-10 text-2xl font-semibold text-white">
          Reset your password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          We will email you a link that lets you set a new password.
        </p>

        {!isSupabaseConfigured() ? (
          <div
            role="alert"
            className="mt-6 rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            Supabase is not configured yet, so recovery emails cannot be sent. See{" "}
            <code className="font-mono">README.md</code>.
          </div>
        ) : (
          <ForgotPasswordForm />
        )}

        <p className="mt-8 text-sm text-muted">
          Remembered it?{" "}
          <Link
            href="/admin/login"
            className="font-medium text-white underline underline-offset-4 hover:text-white/80"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
