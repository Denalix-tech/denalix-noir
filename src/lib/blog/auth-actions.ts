"use server";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { safeAdminRedirect } from "./authz";
import { fieldErrors, formString, signInSchema } from "./schema";

export type SignInState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
};

export async function signInAction(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (!isSupabaseConfigured()) {
    return {
      formError:
        "Sign-in is unavailable because Supabase is not configured. See README.md for setup steps.",
    };
  }

  const parsed = signInSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Log for diagnosis, but never echo the provider message or reveal whether
    // the address exists.
    console.error("[admin] sign-in failed", { message: error.message });
    return { formError: "Invalid email or password." };
  }

  // redirect() throws internally, so it must sit outside any try/catch.
  redirect(safeAdminRedirect(formString(formData, "next")));
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
