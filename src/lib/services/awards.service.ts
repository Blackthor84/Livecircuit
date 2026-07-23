import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AWARD_CATEGORIES,
  type AwardCategory,
  awardCategoryBlurb,
  awardCategoryLabel,
} from "@/lib/constants/awards";
import type {
  AwardCategoryGroup,
  AwardCeremonyDetail,
  AwardCeremonySummary,
  AwardNominee,
  AwardsHubReport,
} from "@/lib/types/awards";

type CeremonyRow = {
  id: string;
  slug: string;
  title: string;
  year: number;
  status: string;
  tagline: string | null;
  voting_ends_at: string;
  ceremony_at: string;
  live_stream_url: string | null;
  archive_summary: string | null;
};

function mapSummary(row: CeremonyRow): AwardCeremonySummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    year: row.year,
    status: row.status as AwardCeremonySummary["status"],
    tagline: row.tagline,
    votingEndsAt: row.voting_ends_at,
    ceremonyAt: row.ceremony_at,
    liveStreamUrl: row.live_stream_url,
  };
}

function mapNominee(row: Record<string, unknown>): AwardNominee {
  const category = row.category as AwardCategory;
  return {
    id: row.id as string,
    category,
    categoryLabel: awardCategoryLabel(category),
    categoryBlurb: awardCategoryBlurb(category),
    nomineeType: row.nominee_type as AwardNominee["nomineeType"],
    displayName: row.display_name as string,
    subtitle: (row.subtitle as string | null) ?? null,
    blurb: (row.blurb as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    linkHref: (row.link_href as string | null) ?? null,
    score: Number(row.score),
    voteCount: row.vote_count as number,
    isWinner: row.is_winner as boolean,
    announcedAt: (row.announced_at as string | null) ?? null,
  };
}

async function upsertNominee(
  supabase: SupabaseClient,
  ceremonyId: string,
  category: AwardCategory,
  entry: {
    nominee_type: "artist" | "event" | "venue";
    ref_id: string | null;
    display_name: string;
    subtitle?: string | null;
    blurb?: string | null;
    link_href?: string | null;
    score: number;
    sort_order: number;
  }
) {
  await supabase.from("livecircuit_award_nominees").upsert(
    {
      ceremony_id: ceremonyId,
      category,
      ...entry,
    },
    { onConflict: "ceremony_id,category,nominee_type,ref_id" }
  );
}

async function syncArtistNominees(
  supabase: SupabaseClient,
  ceremonyId: string,
  category: AwardCategory,
  filter?: { category?: string; createdAfter?: string }
) {
  let query = supabase
    .from("artists")
    .select("id, slug, stage_name, category, follower_count, created_at, banner_url")
    .order("follower_count", { ascending: false })
    .limit(5);

  if (filter?.category) query = query.eq("category", filter.category);
  if (filter?.createdAfter) query = query.gte("created_at", filter.createdAfter);

  const { data: artists } = await query;
  let order = 0;
  for (const a of artists ?? []) {
    await upsertNominee(supabase, ceremonyId, category, {
      nominee_type: "artist",
      ref_id: a.id as string,
      display_name: a.stage_name as string,
      subtitle: String(a.category),
      link_href: `/artists/${a.slug}`,
      score: a.follower_count as number,
      sort_order: order++,
    });
  }
}

async function syncEventNominees(supabase: SupabaseClient, ceremonyId: string, category: AwardCategory) {
  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title, artist_id, artists(slug, stage_name)")
    .order("viewer_count", { ascending: false })
    .limit(5);

  let order = 0;
  for (const ev of events ?? []) {
    const artists = ev.artists as { slug: string; stage_name: string } | { slug: string; stage_name: string }[] | null;
    const artist = Array.isArray(artists) ? artists[0] : artists;
    await upsertNominee(supabase, ceremonyId, category, {
      nominee_type: "event",
      ref_id: ev.id as string,
      display_name: ev.title as string,
      subtitle: artist?.stage_name ?? null,
      link_href: artist ? `/artists/${artist.slug}/events/${ev.slug}` : null,
      score: 0,
      sort_order: order++,
    });
  }
}

async function syncVenueNominees(supabase: SupabaseClient, ceremonyId: string, category: AwardCategory) {
  const { data: venues } = await supabase
    .from("venues")
    .select("id, slug, name, follower_count")
    .order("follower_count", { ascending: false })
    .limit(5);

  let order = 0;
  for (const v of venues ?? []) {
    await upsertNominee(supabase, ceremonyId, category, {
      nominee_type: "venue",
      ref_id: v.id as string,
      display_name: v.name as string,
      subtitle: "LiveCircuit venue",
      link_href: `/livecircuit/venues/${v.slug}`,
      score: (v.follower_count as number) ?? 0,
      sort_order: order++,
    });
  }
}

async function syncFanFavoriteNominees(supabase: SupabaseClient, ceremonyId: string) {
  const { data: voteRows } = await supabase
    .from("artist_walk_of_fame_votes")
    .select("artist_id")
    .limit(500);

  const counts = new Map<string, number>();
  for (const row of voteRows ?? []) {
    const id = row.artist_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!sorted.length) {
    await syncArtistNominees(supabase, ceremonyId, "fan_favorite");
    return;
  }

  const ids = sorted.map(([id]) => id);
  const { data: artists } = await supabase
    .from("artists")
    .select("id, slug, stage_name")
    .in("id", ids);

  const byId = new Map((artists ?? []).map((a) => [a.id as string, a]));
  let order = 0;
  for (const [artistId, votes] of sorted) {
    const a = byId.get(artistId);
    if (!a) continue;
    await upsertNominee(supabase, ceremonyId, "fan_favorite", {
      nominee_type: "artist",
      ref_id: artistId,
      display_name: a.stage_name as string,
      subtitle: `${votes} Walk of Fame votes`,
      link_href: `/artists/${a.slug}`,
      score: votes,
      sort_order: order++,
    });
  }
}

async function syncHighestRatedEvents(supabase: SupabaseClient, ceremonyId: string) {
  const { data: reviews } = await supabase.from("reviews").select("event_id, rating").limit(2000);
  const byEvent = new Map<string, { sum: number; count: number }>();
  for (const r of reviews ?? []) {
    const eid = r.event_id as string;
    const cur = byEvent.get(eid) ?? { sum: 0, count: 0 };
    cur.sum += r.rating as number;
    cur.count += 1;
    byEvent.set(eid, cur);
  }

  const ranked = [...byEvent.entries()]
    .filter(([, v]) => v.count >= 3)
    .map(([id, v]) => ({ id, avg: v.sum / v.count, count: v.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  if (!ranked.length) {
    await syncEventNominees(supabase, ceremonyId, "highest_rated_event");
    return;
  }

  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title, artists(slug, stage_name)")
    .in(
      "id",
      ranked.map((r) => r.id)
    );

  const eventMap = new Map((events ?? []).map((e) => [e.id as string, e]));
  let order = 0;
  for (const row of ranked) {
    const ev = eventMap.get(row.id);
    if (!ev) continue;
    const artists = ev.artists as { slug: string; stage_name: string } | { slug: string; stage_name: string }[] | null;
    const artist = Array.isArray(artists) ? artists[0] : artists;
    await upsertNominee(supabase, ceremonyId, "highest_rated_event", {
      nominee_type: "event",
      ref_id: row.id,
      display_name: ev.title as string,
      subtitle: `${row.avg.toFixed(1)}★ · ${row.count} reviews`,
      link_href: artist ? `/artists/${artist.slug}/events/${ev.slug}` : null,
      score: row.avg,
      sort_order: order++,
    });
  }
}

async function syncBestCommunityVenues(supabase: SupabaseClient, ceremonyId: string) {
  const { data: events } = await supabase.from("events").select("id, venue_id").not("venue_id", "is", null);
  const eventIds = (events ?? []).map((e) => e.id as string);
  const venueByEvent = new Map((events ?? []).map((e) => [e.id as string, e.venue_id as string]));

  let chatCount = new Map<string, number>();
  if (eventIds.length) {
    const { data: chats } = await supabase.from("chat_messages").select("event_id").in("event_id", eventIds.slice(0, 400));
    for (const c of chats ?? []) {
      const vid = venueByEvent.get(c.event_id as string);
      if (!vid) continue;
      chatCount.set(vid, (chatCount.get(vid) ?? 0) + 1);
    }
  }

  const ranked = [...chatCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!ranked.length) {
    await syncVenueNominees(supabase, ceremonyId, "best_community");
    return;
  }

  const { data: venues } = await supabase.from("venues").select("id, slug, name").in("id", ranked.map(([id]) => id));
  const byId = new Map((venues ?? []).map((v) => [v.id as string, v]));
  let order = 0;
  for (const [venueId, score] of ranked) {
    const v = byId.get(venueId);
    if (!v) continue;
    await upsertNominee(supabase, ceremonyId, "best_community", {
      nominee_type: "venue",
      ref_id: venueId,
      display_name: v.name as string,
      subtitle: `${score} community messages`,
      link_href: `/livecircuit/venues/${v.slug}`,
      score,
      sort_order: order++,
    });
  }
}

export async function syncAwardNominees(supabase: SupabaseClient, ceremonyId: string, status: string) {
  if (status === "archived" || status === "live") return;

  const { count } = await supabase
    .from("livecircuit_award_nominees")
    .select("id", { count: "exact", head: true })
    .eq("ceremony_id", ceremonyId);

  if ((count ?? 0) > 0 && status === "voting") return;

  const yearStart = new Date();
  yearStart.setUTCMonth(0, 1);
  yearStart.setUTCHours(0, 0, 0, 0);

  await syncArtistNominees(supabase, ceremonyId, "artist_of_the_year");
  await syncEventNominees(supabase, ceremonyId, "concert_of_the_year");
  await syncArtistNominees(supabase, ceremonyId, "comedian_of_the_year", { category: "comedy" });
  await syncArtistNominees(supabase, ceremonyId, "dj_of_the_year", { category: "dj" });
  await syncArtistNominees(supabase, ceremonyId, "podcast_of_the_year", { category: "podcast" });
  await syncVenueNominees(supabase, ceremonyId, "venue_of_the_year");
  await syncArtistNominees(supabase, ceremonyId, "best_new_artist", {
    createdAfter: yearStart.toISOString(),
  });
  await syncFanFavoriteNominees(supabase, ceremonyId);
  await syncBestCommunityVenues(supabase, ceremonyId);
  await syncHighestRatedEvents(supabase, ceremonyId);
}

async function refreshNomineeVoteCounts(supabase: SupabaseClient, ceremonyId: string) {
  const { data: nominees } = await supabase
    .from("livecircuit_award_nominees")
    .select("id")
    .eq("ceremony_id", ceremonyId);

  for (const n of nominees ?? []) {
    const { count } = await supabase
      .from("livecircuit_award_votes")
      .select("id", { count: "exact", head: true })
      .eq("nominee_id", n.id);
    await supabase
      .from("livecircuit_award_nominees")
      .update({ vote_count: count ?? 0 })
      .eq("id", n.id);
  }
}

async function loadCeremonyDetail(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  ceremony: CeremonyRow,
  viewerId?: string | null
): Promise<AwardCeremonyDetail> {
  await syncAwardNominees(admin, ceremony.id, ceremony.status);
  await refreshNomineeVoteCounts(admin, ceremony.id);

  const { data: nomineeRows } = await supabase
    .from("livecircuit_award_nominees")
    .select("*")
    .eq("ceremony_id", ceremony.id)
    .order("sort_order");

  const nominees = (nomineeRows ?? []).map((r) => mapNominee(r as Record<string, unknown>));
  const byCategory = new Map<AwardCategory, AwardNominee[]>();
  for (const n of nominees) {
    const list = byCategory.get(n.category) ?? [];
    list.push(n);
    byCategory.set(n.category, list);
  }

  let viewerVotes: Partial<Record<AwardCategory, string>> = {};
  if (viewerId) {
    const { data: votes } = await supabase
      .from("livecircuit_award_votes")
      .select("category, nominee_id")
      .eq("ceremony_id", ceremony.id)
      .eq("voter_id", viewerId);
    for (const v of votes ?? []) {
      viewerVotes[v.category as AwardCategory] = v.nominee_id as string;
    }
  }

  const categories: AwardCategoryGroup[] = AWARD_CATEGORIES.map((c) => {
    const list = byCategory.get(c.value) ?? [];
    return {
      category: c.value,
      categoryLabel: c.label,
      categoryBlurb: c.blurb,
      nominees: list,
      viewerNomineeId: viewerVotes[c.value] ?? null,
    };
  });

  return {
    ...mapSummary(ceremony),
    archiveSummary: ceremony.archive_summary,
    categories,
    viewerVotes,
    computedAt: new Date().toISOString(),
  };
}

export async function buildAwardsHubReport(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  viewerId?: string | null
): Promise<AwardsHubReport> {
  const { data: rows } = await supabase
    .from("livecircuit_award_ceremonies")
    .select("*")
    .order("year", { ascending: false });

  const ceremonies = (rows ?? []) as CeremonyRow[];
  const summaries = ceremonies.map(mapSummary);

  const featuredRow =
    ceremonies.find((c) => c.status === "voting" || c.status === "live") ?? ceremonies[0] ?? null;

  const featured = featuredRow
    ? await loadCeremonyDetail(supabase, admin, featuredRow, viewerId)
    : null;

  return {
    featured,
    voting: summaries.filter((s) => s.status === "voting"),
    upcomingLive: summaries.filter((s) => s.status === "live" || s.status === "nomination"),
    archive: summaries.filter((s) => s.status === "archived"),
    computedAt: new Date().toISOString(),
  };
}

export async function buildAwardCeremonyDetail(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  slug: string,
  viewerId?: string | null
): Promise<AwardCeremonyDetail | null> {
  const { data: ceremony } = await supabase
    .from("livecircuit_award_ceremonies")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!ceremony) return null;
  return loadCeremonyDetail(supabase, admin, ceremony as CeremonyRow, viewerId);
}

export async function castAwardVote(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  voterId: string,
  ceremonyId: string,
  category: AwardCategory,
  nomineeId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: ceremony } = await supabase
    .from("livecircuit_award_ceremonies")
    .select("status, voting_ends_at")
    .eq("id", ceremonyId)
    .maybeSingle();

  if (!ceremony) return { ok: false, error: "Ceremony not found" };
  if (ceremony.status !== "voting") return { ok: false, error: "Voting is closed" };
  if (new Date(ceremony.voting_ends_at as string).getTime() <= Date.now()) {
    return { ok: false, error: "Voting deadline has passed" };
  }

  const { data: nominee } = await supabase
    .from("livecircuit_award_nominees")
    .select("id, ceremony_id, category")
    .eq("id", nomineeId)
    .maybeSingle();

  if (!nominee || nominee.ceremony_id !== ceremonyId || nominee.category !== category) {
    return { ok: false, error: "Invalid nominee" };
  }

  const { error } = await supabase.from("livecircuit_award_votes").upsert(
    {
      ceremony_id: ceremonyId,
      category,
      voter_id: voterId,
      nominee_id: nomineeId,
    },
    { onConflict: "ceremony_id,category,voter_id" }
  );

  if (error) return { ok: false, error: error.message };

  await refreshNomineeVoteCounts(admin, ceremonyId);
  return { ok: true };
}
