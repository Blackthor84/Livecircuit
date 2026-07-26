"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthCallbackUrl } from "@/lib/config/env";
import { readPostAuthParam } from "@/lib/auth/redirects";
import { finalizeAuthSession } from "@/lib/auth/finalize-session";
import type { UserRole } from "@/types/database";
import {
  resendVerificationSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

export type CompleteAuthSessionResult =
  | { ok: true; redirectTo: string; role: UserRole }
  | { ok: false; error: string };

export type SignUpActionResult =
  | { ok: true; needsEmailVerification: boolean }
  | { ok: false; error: string };

export async function signUpAction(formData: FormData): Promise<SignUpActionResult> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
    role: formData.get("role") ?? "fan",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password, displayName, role } = parsed.data;
  const nextPath = readPostAuthParam({ next: formData.get("next")?.toString() });
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName, intended_role: role },
      emailRedirectTo: getAuthCallbackUrl({ next: nextPath !== "/" ? nextPath : undefined }),
    },
  });

  if (error) return { ok: false, error: error.message };

  if (data.user && data.session) {
    await finalizeAuthSession(data.user.id);
    revalidatePath("/", "layout");
    return { ok: true, needsEmailVerification: false };
  }

  return { ok: true, needsEmailVerification: true };
}

/** Refresh session, load profile, and revalidate layout so role changes apply immediately. */
export async function completeAuthSessionAction(
  nextPath?: string | null
): Promise<CompleteAuthSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  await finalizeAuthSession(user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  revalidatePath("/", "layout");

  return {
    ok: true,
    redirectTo: readPostAuthParam({ next: nextPath }),
    role: (profile?.role as UserRole) ?? "fan",
  };
}

export async function finalizeSessionAction(): Promise<void> {
  await completeAuthSessionAction();
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updatePasswordAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function resendVerificationAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = resendVerificationSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: getAuthCallbackUrl() },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
