"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRoles } from "@/lib/auth/guards";

export type GeoAdminResult = { ok: true } | { ok: false; error: string };

export async function toggleCountryEnabledAction(
  countryId: string,
  enabled: boolean
): Promise<GeoAdminResult> {
  await requireRoles(["admin", "super_admin"], "/admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("countries")
    .update({ is_enabled: enabled })
    .eq("id", countryId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/geo");
  revalidatePath("/artist/tours/new");
  return { ok: true };
}
