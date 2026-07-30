import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { AWARD_CATEGORIES } from "@/lib/constants/awards";
import {
  buildAwardCeremonyDetail,
  buildAwardsHubReport,
} from "@/lib/services/awards.service";
import type { AwardCeremonyDetail, AwardsHubReport } from "@/lib/types/awards";

function demoNominees(category: (typeof AWARD_CATEGORIES)[number], idx: number) {
  return [
    {
      id: `demo-${category.value}-1`,
      category: category.value,
      categoryLabel: category.label,
      categoryBlurb: category.blurb,
      nomineeType: idx % 3 === 0 ? ("venue" as const) : idx % 2 === 0 ? ("event" as const) : ("artist" as const),
      displayName: idx % 2 === 0 ? "Neon Nights" : "Midnight Arena",
      subtitle: "Demo nominee",
      blurb: null,
      imageUrl: null,
      linkHref: "/discover",
      score: 900 - idx * 40,
      voteCount: 120 - idx * 10,
      isWinner: false,
      announcedAt: null,
    },
    {
      id: `demo-${category.value}-2`,
      category: category.value,
      categoryLabel: category.label,
      categoryBlurb: category.blurb,
      nomineeType: "artist" as const,
      displayName: "Circuit Collective",
      subtitle: "Demo nominee",
      blurb: null,
      imageUrl: null,
      linkHref: "/discover",
      score: 600,
      voteCount: 88,
      isWinner: false,
      announcedAt: null,
    },
  ];
}

function demoCeremony(slug: string, partial: Partial<AwardCeremonyDetail>): AwardCeremonyDetail {
  const categories = AWARD_CATEGORIES.map((c, i) => ({
    category: c.value,
    categoryLabel: c.label,
    categoryBlurb: c.blurb,
    nominees: demoNominees(c, i).map((n, ni) =>
      slug === "2025" && ni === 0 ? { ...n, isWinner: true, announcedAt: "2025-12-15T21:00:00Z" } : n
    ),
    viewerNomineeId: null,
  }));

  return {
    id: `demo-${slug}`,
    slug,
    title: `LiveCircuit Awards ${slug}`,
    year: Number(slug),
    status: partial.status ?? "voting",
    tagline: partial.tagline ?? "Demo ceremony",
    votingEndsAt: partial.votingEndsAt ?? "2026-12-01T23:59:59Z",
    ceremonyAt: partial.ceremonyAt ?? "2026-12-15T20:00:00Z",
    liveStreamUrl: partial.liveStreamUrl ?? "https://livecircuit.example/awards-live",
    archiveSummary: partial.archiveSummary ?? null,
    categories,
    viewerVotes: {},
    computedAt: new Date().toISOString(),
  };
}

function demoHub(): AwardsHubReport {
  const featured = demoCeremony("2026", { status: "voting", tagline: "Fan votes decide the stars of the year." });
  const archived = demoCeremony("2025", {
    status: "archived",
    tagline: "The inaugural circuit honors.",
    archiveSummary: "Winners from the first annual LiveCircuit Awards.",
    votingEndsAt: "2025-12-01T00:00:00Z",
    ceremonyAt: "2025-12-15T20:00:00Z",
    liveStreamUrl: null,
  });

  return {
    featured,
    voting: [featured],
    upcomingLive: [],
    archive: [
      {
        id: archived.id,
        slug: archived.slug,
        title: archived.title,
        year: archived.year,
        status: archived.status,
        tagline: archived.tagline,
        votingEndsAt: archived.votingEndsAt,
        ceremonyAt: archived.ceremonyAt,
        liveStreamUrl: archived.liveStreamUrl,
      },
    ],
    computedAt: new Date().toISOString(),
  };
}

export async function getAwardsHubReport(): Promise<AwardsHubReport> {
  if (!isSupabaseConfigured()) {
    return { featured: null, voting: [], upcomingLive: [], archive: [], computedAt: new Date().toISOString() };
  }
  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  const user = await getSessionUser();
  return buildAwardsHubReport(supabase, admin, user?.id);
}

export async function getAwardCeremonyDetail(slug: string): Promise<AwardCeremonyDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  const user = await getSessionUser();
  return buildAwardCeremonyDetail(supabase, admin, slug, user?.id);
}
