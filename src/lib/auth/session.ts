import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/config/env";
import { userHasAgencyAccess } from "@/lib/data/agencies";
import { userHasSponsorAccess } from "@/lib/data/sponsors";
import { getUnreadNotificationCount } from "@/lib/data/notifications";

export async function getSessionUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
}

export async function getArtistForUser(userId: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("artists").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

export async function requireRole(allowed: UserRole[]) {
  const profile = await getProfile();
  if (!profile || !allowed.includes(profile.role as UserRole)) {
    return null;
  }
  return profile;
}

export async function getHeaderUser() {
  const user = await getSessionUser();
  if (!user) return null;

  const profile = await getProfile();
  const [sponsorPortal, agencyPortal] = isSupabaseConfigured()
    ? await Promise.all([
        userHasSponsorAccess(user.id),
        profile?.role === "agency" ? Promise.resolve(true) : userHasAgencyAccess(user.id),
      ])
    : [false, false];
  const unreadNotifications = isSupabaseConfigured()
    ? await getUnreadNotificationCount(user.id)
    : 0;

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? (user.user_metadata?.full_name as string) ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role: (profile?.role as UserRole) ?? "fan",
    sponsorPortal,
    agencyPortal,
    primaryAgencyId: (profile?.primary_agency_id as string | null) ?? null,
    agencyMemberRole: (profile?.agency_member_role as string | null) ?? null,
    unreadNotifications,
  };
}
