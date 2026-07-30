import type { SupabaseClient } from "@supabase/supabase-js";
import type { FanScenarioSlug } from "@/lib/testing/constants";
import {
  fakeLocation,
  scenarioEventAttendance,
  scenarioFanFollowCount,
} from "@/lib/testing/fake-data";
import { syncFanPassportStamps } from "@/lib/services/fan-passport.service";
import { logTestStep, requireDbResult, throwDbError, type TestCreationLog } from "@/lib/testing/step-errors";

export async function seedFanScenario(
  admin: SupabaseClient,
  log: TestCreationLog,
  userId: string,
  scenario: FanScenarioSlug,
  seed: number,
  homeLocation: ReturnType<typeof fakeLocation>
) {
  if (scenario === "brand_new_fan") {
    logTestStep(log, "Step 7: Seeding fan scenario — brand_new_fan complete");
    return;
  }

  const followCount = scenarioFanFollowCount(scenario);
  logTestStep(log, "Step 7a: Seeding fan follows...");
  const { data: artists, error: artistsError } = await admin
    .from("artists")
    .select("id")
    .limit(Math.max(followCount, 5));

  if (artistsError) {
    throwDbError(log, "Step 7a: Seeding fan follows — load artists", artistsError);
  }

  const artistIds = (artists ?? []).map((a) => a.id as string);
  if (artistIds.length) {
    const rows = artistIds.slice(0, followCount).map((artistId, i) => ({
      fan_id: userId,
      artist_id: artistId,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    }));
    if (rows.length) {
      const { error: followerError } = await admin
        .from("followers")
        .upsert(rows, { onConflict: "fan_id,artist_id", ignoreDuplicates: true });
      if (followerError) {
        throwDbError(log, "Step 7a: Seeding fan follows — upsert", followerError);
      }
    }
  } else {
    logTestStep(log, "Step 7a: Seeding fan follows — skipped (no artists in database)");
  }

  const eventCount = scenarioEventAttendance(scenario);
  if (eventCount > 0) {
    logTestStep(log, "Step 7b: Seeding fan tickets...");
    const { data: events, error: eventsError } = await admin
      .from("events")
      .select("id, artist_id, scheduled_at, status, ended_at, title, tour_city, tour_state_code")
      .in("status", ["ended", "live"])
      .limit(eventCount * 2);

    if (eventsError) {
      throwDbError(log, "Step 7b: Seeding fan tickets — load events", eventsError);
    }

    const picked = (events ?? []).slice(0, eventCount);
    for (let i = 0; i < picked.length; i++) {
      const event = picked[i]!;
      const ticketId = crypto.randomUUID();
      const { error: ticketError } = await admin.from("tickets").upsert(
        {
          id: ticketId,
          event_id: event.id,
          user_id: userId,
          tier: scenario === "super_fan" && i % 3 === 0 ? "vip" : "general",
          price_cents: 2500,
          checked_in_at: new Date(Date.now() - (i + 1) * 86400000 * 7).toISOString(),
        },
        { onConflict: "event_id,user_id,tier", ignoreDuplicates: true }
      );
      if (ticketError) {
        throwDbError(log, `Step 7b: Seeding fan ticket ${i + 1}`, ticketError);
      }
    }

    logTestStep(log, "Step 7c: Syncing fan passport stamps...");
    await syncFanPassportStamps(admin, userId);
  }

  if (scenario === "local_fan" || scenario === "traveler") {
    logTestStep(log, "Step 7d: Updating fan bio for location scenario...");
    const bioUpdate = await admin
      .from("profiles")
      .update({
        bio: `Fan from ${homeLocation.city}, ${homeLocation.state ?? homeLocation.country}. ${
          scenario === "traveler" ? "Always on the road for the next tour stop." : "Home crowd regular."
        }`,
      })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    requireDbResult(log, "Step 7d: Updating fan bio for location scenario", bioUpdate, {
      requireRows: true,
      emptyMessage: "Fan bio update returned no rows",
    });
  }

  logTestStep(log, "Step 7e: Creating welcome notification...");
  const { error: notificationError } = await admin.from("notifications").insert({
    user_id: userId,
    type: "system",
    title: "Welcome to LiveCircuit",
    body: "Your test fan account is ready for platform testing.",
    metadata: { test: true },
  });
  if (notificationError) {
    throwDbError(log, "Step 7e: Creating welcome notification", notificationError);
  }

  logTestStep(log, "Step 7: Seeding fan scenario — complete");
}
