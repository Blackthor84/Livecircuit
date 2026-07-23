import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  computeProgressFromStamps,
  ensureFanPassport,
  fetchPassportTargets,
  mapAchievementProgress,
  mapStampRow,
  syncFanPassportAchievements,
  syncFanPassportStamps,
} from "@/lib/services/fan-passport.service";
import type { FanPassportReport, FanPassportStamp } from "@/lib/types/fan-passport";

function demoPassport(userId: string, displayName: string | null): FanPassportReport {
  const stamps: FanPassportStamp[] = [
    {
      id: "demo-1",
      eventId: "e1",
      venueName: "Neon Garden Arena",
      cityName: "Austin",
      stateCode: "TX",
      countryCode: "US",
      countryName: "United States",
      artistName: "Demo Artist",
      artistCategory: "music",
      eventTitle: "Summer Night Live",
      attendedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      isVip: true,
      isSpecial: false,
    },
    {
      id: "demo-2",
      eventId: "e2",
      venueName: "Harbor Stage",
      cityName: "Toronto",
      stateCode: "ON",
      countryCode: "CA",
      countryName: "Canada",
      artistName: "Laugh Track",
      artistCategory: "comedy",
      eventTitle: "Comedy Fest Opening",
      attendedAt: new Date(Date.now() - 86400000 * 45).toISOString(),
      isVip: false,
      isSpecial: true,
    },
  ];

  const progress = computeProgressFromStamps(stamps, 195, 50);

  return {
    userId,
    passportNumber: "LC-DEMO00001",
    displayName,
    stamps,
    progress,
    achievements: [
      {
        slug: "first_concert",
        name: "First Concert",
        description: "Attend your first live show.",
        metric: "stamp_count",
        targetValue: 1,
        sortOrder: 1,
        currentValue: 2,
        earned: true,
        earnedAt: stamps[0].attendedAt,
      },
      {
        slug: "concerts_100",
        name: "100 Concerts",
        description: "Collect 100 event stamps.",
        metric: "stamp_count",
        targetValue: 100,
        sortOrder: 2,
        currentValue: 2,
        earned: false,
        earnedAt: null,
      },
    ],
    computedAt: new Date().toISOString(),
  };
}

export async function getFanPassportReport(userId: string): Promise<FanPassportReport | null> {
  if (!isSupabaseConfigured()) {
    return demoPassport(userId, "Fan");
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  await syncFanPassportStamps(supabase, userId);
  const passportNumber = await ensureFanPassport(supabase, userId);

  const { data: passportRow } = await supabase
    .from("fan_passports")
    .select("passport_number, stamp_count")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: stampRows } = await supabase
    .from("fan_passport_stamps")
    .select("*")
    .eq("user_id", userId)
    .order("attended_at", { ascending: false })
    .limit(120);

  const stamps = (stampRows ?? []).map((r) => mapStampRow(r as Record<string, unknown>));
  const targets = await fetchPassportTargets(supabase);
  const progress = computeProgressFromStamps(stamps, targets.countryTarget, targets.usStateTarget);

  const { foundingFan, earnedMap, defs } = await syncFanPassportAchievements(
    supabase,
    userId,
    progress,
    (stampRows ?? []).map((s) => s.artist_id as string).filter(Boolean)
  );

  const achievements = mapAchievementProgress(
    defs as Record<string, unknown>[],
    progress,
    foundingFan,
    earnedMap
  );

  return {
    userId,
    passportNumber: (passportRow?.passport_number as string) ?? passportNumber,
    displayName: (profile?.display_name as string) ?? null,
    stamps,
    achievements,
    progress,
    computedAt: new Date().toISOString(),
  };
}
