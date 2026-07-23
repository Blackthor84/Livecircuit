"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AccountActionResult = { ok: true } | { ok: false; error: string };

export async function deleteAccountAction(confirm: string): Promise<AccountActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in" };

  if (confirm !== "DELETE") {
    return { ok: false, error: 'Type DELETE to confirm' };
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return { ok: false, error: error.message };
  } catch {
    return { ok: false, error: "Account deletion requires service role configuration" };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  return { ok: true };
}
