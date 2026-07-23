"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/config/env";
import { finalizeAuthSession } from "@/lib/auth/finalize-session";
import {
  resendVerificationSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

export async function signUpAction(formData: FormData): Promise<AuthActionResult> {
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
  const supabase = await createClient();
  const appUrl = getAppUrl();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName, intended_role: role },
      emailRedirectTo: `${appUrl}/auth/callback?next=/discover`,
    },
  });

  if (error) return { ok: false, error: error.message };

  if (data.user && data.session) {
    await finalizeAuthSession(data.user.id);
  }

  return { ok: true };
}

export async function finalizeSessionAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await finalizeAuthSession(user.id);
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
    options: { emailRedirectTo: `${getAppUrl()}/auth/callback?next=/discover` },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
