import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArtistScenarioSlug } from "@/lib/testing/constants";
import { fakeBio, fakeSocialLinks, fakeStageName, scenarioFollowerCount } from "@/lib/testing/fake-data";

export async function seedArtistScenario(
  admin: SupabaseClient,
  userId: string,
  scenario: ArtistScenarioSlug,
  seed: number
) {
  const { data: artist } = await admin.from("artists").select("id, slug").eq("user_id", userId).maybeSingle();
  if (!artist?.id) return;

  const followerTarget = scenarioFollowerCount(scenario);
  const stageName = fakeStageName(seed);

  await admin
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
    .eq("id", artist.id);

  if (scenario === "brand_new_artist") return;

  if (followerTarget > 0) {
    const { data: fans } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "fan")
      .eq("is_test_account", true)
      .limit(Math.min(followerTarget, 200));

    const fanRows = (fans ?? []).map((f, i) => ({
      fan_id: f.id as string,
      artist_id: artist.id as string,
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
    }));
    if (fanRows.length) {
      await admin.from("followers").upsert(fanRows, { onConflict: "fan_id,artist_id", ignoreDuplicates: true });
    }
  }

  if (["emerging_artist", "growing_artist", "headliner"].includes(scenario)) {
    const tourTitle = `${stageName} Tour ${new Date().getFullYear()}`;
    const { data: tour } = await admin
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

    if (tour?.id) {
      const stopCount = scenario === "headliner" ? 8 : scenario === "growing_artist" ? 5 : 3;
      for (let i = 0; i < stopCount; i++) {
        const at = new Date(Date.now() + (i + 1) * 7 * 86400000);
        await admin.from("tour_stops").insert({
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
      }
    }
  }

  if (["growing_artist", "headliner"].includes(scenario)) {
    await admin.from("products").insert({
      artist_id: artist.id,
      name: `${stageName} Tour Tee`,
      slug: `${artist.slug}-tee-${seed}`.slice(0, 80),
      description: "Test merchandise item",
      price_cents: 3500,
      product_type: "physical",
      active: true,
    });
  }
}
