import type { SupabaseClient } from "@supabase/supabase-js";
import type { FanScenarioSlug } from "@/lib/testing/constants";
import {
  fakeLocation,
  scenarioEventAttendance,
  scenarioFanFollowCount,
} from "@/lib/testing/fake-data";
import { syncFanPassportStamps } from "@/lib/services/fan-passport.service";

export async function seedFanScenario(
  admin: SupabaseClient,
  userId: string,
  scenario: FanScenarioSlug,
  seed: number,
  homeLocation: ReturnType<typeof fakeLocation>
) {
  if (scenario === "brand_new_fan") return;

  const followCount = scenarioFanFollowCount(scenario);
  const { data: artists } = await admin.from("artists").select("id").limit(Math.max(followCount, 5));

  const artistIds = (artists ?? []).map((a) => a.id as string);
  if (artistIds.length) {
    const rows = artistIds.slice(0, followCount).map((artistId, i) => ({
      fan_id: userId,
      artist_id: artistId,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    }));
    if (rows.length) {
      await admin.from("followers").upsert(rows, { onConflict: "fan_id,artist_id", ignoreDuplicates: true });
    }
  }

  const eventCount = scenarioEventAttendance(scenario);
  if (eventCount > 0) {
    const { data: events } = await admin
      .from("events")
      .select("id, artist_id, scheduled_at, status, ended_at, title, tour_city, tour_state_code")
      .in("status", ["ended", "live"])
      .limit(eventCount * 2);

    const picked = (events ?? []).slice(0, eventCount);
    for (let i = 0; i < picked.length; i++) {
      const event = picked[i]!;
      const ticketId = crypto.randomUUID();
      await admin.from("tickets").upsert(
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
    }

    await syncFanPassportStamps(admin, userId);
  }

  if (scenario === "local_fan" || scenario === "traveler") {
    await admin
      .from("profiles")
      .update({
        bio: `Fan from ${homeLocation.city}, ${homeLocation.state ?? homeLocation.country}. ${
          scenario === "traveler" ? "Always on the road for the next tour stop." : "Home crowd regular."
        }`,
      })
      .eq("id", userId);
  }

  await admin.from("notifications").insert({
    user_id: userId,
    type: "system",
    title: "Welcome to LiveCircuit",
    body: "Your test fan account is ready for platform testing.",
    metadata: { test: true },
  });
}
