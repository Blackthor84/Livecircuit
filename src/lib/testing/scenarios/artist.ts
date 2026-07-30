import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArtistScenarioSlug } from "@/lib/testing/constants";
import { fakeBio, fakeSocialLinks, fakeStageName, scenarioFollowerCount } from "@/lib/testing/fake-data";
import { logTestStep, requireDbResult, throwDbError, type TestCreationLog } from "@/lib/testing/step-errors";

export async function seedArtistScenario(
  admin: SupabaseClient,
  log: TestCreationLog,
  userId: string,
  scenario: ArtistScenarioSlug,
  seed: number
) {
  const artist = requireDbResult<{ id: string; slug: string }>(
    log,
    "Step 7: Seeding artist scenario — load artist row",
    await admin.from("artists").select("id, slug").eq("user_id", userId).maybeSingle(),
    { requireRows: true, emptyMessage: "Artist row missing before scenario seeding" }
  );

  const followerTarget = scenarioFollowerCount(scenario);
  const stageName = fakeStageName(seed);

  logTestStep(log, "Step 7a: Updating artist scenario profile fields...");
  const artistUpdate = await admin
    .from("artists")
    .update({
      stage_name: stageName,
      short_bio: fakeBio("artist", seed),
      social_links: fakeSocialLinks(seed),
      follower_count: followerTarget,
      monthly_listeners: followerTarget > 0 ? Math.round(followerTarget * 0.4) : 0,
      verified: scenario === "headliner" || scenario === "growing_artist",
      featured: scenario === "headliner",
    })
    .eq("id", artist.id)
    .select("id")
    .maybeSingle();

  requireDbResult(log, "Step 7a: Updating artist scenario profile fields", artistUpdate, {
    requireRows: true,
    emptyMessage: "Artist scenario profile update returned no rows",
  });

  if (scenario === "brand_new_artist") {
    logTestStep(log, "Step 7: Seeding artist scenario — brand_new_artist complete");
    return;
  }

  if (followerTarget > 0) {
    logTestStep(log, "Step 7b: Seeding artist followers...");
    const { data: fans, error: fansError } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "fan")
      .eq("is_test_account", true)
      .limit(Math.min(followerTarget, 200));

    if (fansError) {
      throwDbError(log, "Step 7b: Seeding artist followers — load test fans", fansError);
    }

    const fanRows = (fans ?? []).map((f, i) => ({
      fan_id: f.id as string,
      artist_id: artist.id as string,
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
    }));

    if (fanRows.length) {
      const { error: followerError } = await admin
        .from("followers")
        .upsert(fanRows, { onConflict: "fan_id,artist_id", ignoreDuplicates: true });
      if (followerError) {
        throwDbError(log, "Step 7b: Seeding artist followers — upsert", followerError);
      }
    } else {
      logTestStep(log, "Step 7b: Seeding artist followers — skipped (no test fan accounts available)");
    }
  }

  if (["emerging_artist", "growing_artist", "headliner"].includes(scenario)) {
    logTestStep(log, "Step 7c: Creating artist tour...");
    const tourTitle = `${stageName} Tour ${new Date().getFullYear()}`;
    const tourInsert = await admin
      .from("tours")
      .insert({
        artist_id: artist.id,
        title: tourTitle,
        slug: `${artist.slug}-tour-${seed}`.slice(0, 80),
        description: `Test tour for ${stageName}`,
        status: scenario === "headliner" ? "published" : "draft",
      })
      .select("id")
      .maybeSingle();

    const tour = requireDbResult(log, "Step 7c: Creating artist tour", tourInsert, {
      requireRows: true,
      emptyMessage: "Tour insert returned no rows",
    });

    logTestStep(log, "Step 7d: Creating tour stops...");
    const stopCount = scenario === "headliner" ? 8 : scenario === "growing_artist" ? 5 : 3;
    for (let i = 0; i < stopCount; i++) {
      const at = new Date(Date.now() + (i + 1) * 7 * 86400000);
      const { error: stopError } = await admin.from("tour_stops").insert({
        tour_id: tour.id,
        virtual_location_label: `Stop ${i + 1}`,
        tour_city: ["Boston", "Providence", "Nashville", "Austin", "Chicago"][i % 5],
        tour_state_code: ["MA", "RI", "TN", "TX", "IL"][i % 5],
        scheduled_at: at.toISOString(),
        show_starts_at: at.toISOString(),
        ticket_price_cents: scenario === "headliner" ? 7500 : 3500,
        capacity: scenario === "headliner" ? 50000 : 2000,
        stop_order: i + 1,
      });
      if (stopError) {
        throwDbError(log, `Step 7d: Creating tour stop ${i + 1}`, stopError);
      }
    }
  }

  if (["growing_artist", "headliner"].includes(scenario)) {
    logTestStep(log, "Step 7e: Creating artist product...");
    const { error: productError } = await admin.from("products").insert({
      artist_id: artist.id,
      name: `${stageName} Tour Tee`,
      slug: `${artist.slug}-tee-${seed}`.slice(0, 80),
      description: "Test merchandise item",
      price_cents: 3500,
      product_type: "physical",
      active: true,
    });
    if (productError) {
      throwDbError(log, "Step 7e: Creating artist product", productError);
    }
  }

  logTestStep(log, "Step 7: Seeding artist scenario — complete");
}
