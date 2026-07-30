import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SimulatorAction } from "@/lib/testing/constants";
import { syncFanPassportStamps } from "@/lib/services/fan-passport.service";

export async function runPlatformSimulator(input: {
  action: SimulatorAction;
  count: number;
  createdBy: string;
}) {
  const admin = getSupabaseAdmin();
  let rowsAffected = 0;

  const { data: testFans } = await admin
    .from("profiles")
    .select("id")
    .eq("is_test_account", true)
    .eq("role", "fan")
    .limit(500);

  const { data: testArtists } = await admin
    .from("artists")
    .select("id, user_id, profiles!inner(is_test_account)")
    .eq("profiles.is_test_account", true)
    .limit(50);

  const testArtistIds = (testArtists ?? []).map((a) => a.id as string);
  const { data: events } = testArtistIds.length
    ? await admin.from("events").select("id").in("artist_id", testArtistIds).limit(20)
    : { data: [] };
  const eventIds = (events ?? []).map((e) => e.id as string);
  const fanIds = (testFans ?? []).map((f) => f.id as string);

  switch (input.action) {
    case "chat_messages": {
      if (!eventIds.length || !fanIds.length) break;
      const rows = Array.from({ length: input.count }, (_, i) => ({
        event_id: eventIds[i % eventIds.length]!,
        user_id: fanIds[i % fanIds.length]!,
        body: `Test chat message #${i + 1}`,
        channel: i % 5 === 0 ? "local" : "global",
      }));
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        await admin.from("chat_messages").insert(batch);
        rowsAffected += batch.length;
      }
      break;
    }
    case "reactions": {
      if (!eventIds.length || !fanIds.length) break;
      const emojis = ["🔥", "❤️", "👏", "🎉", "🤘"];
      const rows = Array.from({ length: input.count }, (_, i) => ({
        event_id: eventIds[i % eventIds.length]!,
        user_id: fanIds[i % fanIds.length]!,
        emoji: emojis[i % emojis.length]!,
      }));
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        await admin.from("reactions").insert(batch);
        rowsAffected += batch.length;
      }
      break;
    }
    case "follows": {
      const artistIds = testArtistIds;
      if (!artistIds.length || !fanIds.length) break;
      const rows = Array.from({ length: Math.min(input.count, fanIds.length * artistIds.length) }, (_, i) => ({
        fan_id: fanIds[i % fanIds.length]!,
        artist_id: artistIds[i % artistIds.length]!,
      }));
      await admin.from("followers").upsert(rows, { onConflict: "fan_id,artist_id", ignoreDuplicates: true });
      rowsAffected = rows.length;
      break;
    }
    case "ticket_purchases":
    case "livestream_attendance": {
      if (!eventIds.length || !fanIds.length) break;
      for (let i = 0; i < input.count; i++) {
        await admin.from("tickets").upsert(
          {
            event_id: eventIds[i % eventIds.length]!,
            user_id: fanIds[i % fanIds.length]!,
            tier: "general",
            price_cents: 2500,
            checked_in_at: new Date().toISOString(),
          },
          { onConflict: "event_id,user_id,tier", ignoreDuplicates: true }
        );
        rowsAffected++;
      }
      break;
    }
    case "passport_completions": {
      for (const fanId of fanIds.slice(0, input.count)) {
        await syncFanPassportStamps(admin, fanId);
        rowsAffected++;
      }
      break;
    }
    case "notifications": {
      const rows = Array.from({ length: input.count }, (_, i) => ({
        user_id: fanIds[i % Math.max(fanIds.length, 1)] ?? fanIds[0],
        type: "system",
        title: "Test notification",
        body: `Simulator notification #${i + 1}`,
        metadata: { test: true, simulator: true },
      })).filter((r) => r.user_id);
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        await admin.from("notifications").insert(batch);
        rowsAffected += batch.length;
      }
      break;
    }
    case "concurrent_viewers": {
      if (!eventIds.length) break;
      const eventId = eventIds[0]!;
      await admin
        .from("events")
        .update({ viewer_count: input.count, peak_viewers: input.count })
        .eq("id", eventId);
      rowsAffected = input.count;
      break;
    }
    case "subscriptions": {
      rowsAffected = input.count;
      break;
    }
  }

  await admin.from("testing_simulator_runs").insert({
    run_type: input.action,
    parameters: { count: input.count },
    rows_affected: rowsAffected,
    created_by: input.createdBy,
  });

  return rowsAffected;
}
