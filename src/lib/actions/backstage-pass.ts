"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { upsertBackstagePlan } from "@/lib/services/backstage-pass.service";
import { DEFAULT_BACKSTAGE_PERKS } from "@/lib/types/backstage-pass";

export async function saveBackstagePlanAction(input: {
  name: string;
  description?: string;
  priceCentsMonthly: number;
  discordUrl?: string;
  earlyTicketHours?: number;
  perks?: string[];
}) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };

  if (!isSupabaseConfigured()) return { ok: true as const };

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!artist) return { ok: false as const, error: "Artist profile required" };

  const result = await upsertBackstagePlan(supabase, artist.id as string, {
    name: input.name.trim(),
    description: input.description?.trim() ?? null,
    priceCentsMonthly: Math.max(0, input.priceCentsMonthly),
    perks: input.perks?.length ? input.perks : [...DEFAULT_BACKSTAGE_PERKS],
    discordUrl: input.discordUrl?.trim() || null,
    earlyTicketHours: input.earlyTicketHours ?? 24,
  });

  if (result.ok) {
    revalidatePath("/artist/backstage");
    revalidatePath(`/artists/${artist.slug as string}/backstage`);
  }

  return result;
}

export async function publishBackstageAnnouncementAction(input: {
  title: string;
  body: string;
  membersOnly?: boolean;
}) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: true as const };

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!artist) return { ok: false as const, error: "Artist profile required" };

  const { error } = await supabase.from("backstage_announcements").insert({
    artist_id: artist.id,
    title: input.title.trim(),
    body: input.body.trim(),
    members_only: input.membersOnly ?? true,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/artist/backstage");
  revalidatePath(`/artists/${artist.slug as string}/backstage`);
  return { ok: true as const };
}
