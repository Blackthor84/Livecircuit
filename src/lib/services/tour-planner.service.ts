import { format, getDay, getHours, startOfMonth, subMonths } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getArtistFanHeatData } from "@/lib/data/fan-heat";
import type { TourPlannerCityRecommendation, TourPlannerReport } from "@/lib/types/tour-planner";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type VenueMatch = { id: string; slug: string; region: string; state_code: string | null };

function normalizeCity(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function matchVenue(cityLabel: string, venues: VenueMatch[]): VenueMatch | null {
  const norm = normalizeCity(cityLabel);
  for (const v of venues) {
    const regionNorm = normalizeCity(v.region);
    if (regionNorm.includes(norm) || norm.includes(regionNorm.split(" ")[0] ?? "")) {
      return v;
    }
  }
  return null;
}

export async function buildTourPlannerReport(
  supabase: SupabaseClient,
  artistId: string,
  artistCategory: string | null
): Promise<TourPlannerReport> {
  const sixMonthsAgo = startOfMonth(subMonths(new Date(), 6)).toISOString();

  const { data: artistEvents } = await supabase.from("events").select("id").eq("artist_id", artistId);
  const eventIds = (artistEvents ?? []).map((e) => e.id as string);

  const [
    fanHeat,
    ticketLocationRows,
    eventScheduleRows,
    ordersMonthly,
    avgPriceRow,
    peerCountRes,
    venuesRes,
  ] = await Promise.all([
    getArtistFanHeatData(artistId, { region: "us", window: "all" }),
    eventIds.length
      ? supabase
          .from("tickets")
          .select("id, events(tour_stops(virtual_location_label))")
          .in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("events")
      .select("scheduled_at, viewer_count, status")
      .eq("artist_id", artistId)
      .gte("scheduled_at", sixMonthsAgo),
    supabase
      .from("orders")
      .select("created_at, total_cents")
      .eq("artist_id", artistId)
      .eq("status", "paid")
      .gte("created_at", sixMonthsAgo),
    supabase
      .from("tour_stops")
      .select("ticket_price_cents, tour_id, tours!inner(artist_id)")
      .eq("tours.artist_id", artistId)
      .limit(50),
    artistCategory
      ? supabase
          .from("artists")
          .select("id", { count: "exact", head: true })
          .eq("category", artistCategory)
          .neq("id", artistId)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("venues")
      .select("id, slug, region, state_code")
      .eq("is_active", true)
      .limit(100),
  ]);

  const ticketByCity = new Map<string, number>();
  for (const row of ticketLocationRows.data ?? []) {
    const evRaw = row.events;
    const ev = (Array.isArray(evRaw) ? evRaw[0] : evRaw) as {
      tour_stops: { virtual_location_label: string } | { virtual_location_label: string }[] | null;
    } | null;
    const stop = ev?.tour_stops;
    const label = Array.isArray(stop) ? stop[0]?.virtual_location_label : stop?.virtual_location_label;
    if (!label) continue;
    ticketByCity.set(label, (ticketByCity.get(label) ?? 0) + 1);
  }

  const dayScores = new Array(7).fill(0);
  const hourScores = new Array(24).fill(0);
  let watchTotal = 0;
  for (const ev of eventScheduleRows.data ?? []) {
    const d = new Date(ev.scheduled_at as string);
    dayScores[getDay(d)] += 1;
    hourScores[getHours(d)] += 1;
    watchTotal += (ev.viewer_count as number) ?? 0;
  }

  const monthTickets = new Map<string, number>();
  for (const o of ordersMonthly.data ?? []) {
    const key = format(startOfMonth(new Date(o.created_at as string)), "MMM");
    monthTickets.set(key, (monthTickets.get(key) ?? 0) + 1);
  }

  const prices = (avgPriceRow.data ?? []).map((r) => r.ticket_price_cents as number).filter((p) => p > 0);
  const avgTicketCents = prices.length
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : 2500;

  const venues = (venuesRes.data ?? []) as VenueMatch[];

  const topFan = fanHeat.topLocations.slice(0, 12);
  const maxFan = topFan[0]?.count ?? 1;

  const recommendations: TourPlannerCityRecommendation[] = [];

  const candidateLabels = new Set<string>();
  for (const loc of topFan) candidateLabels.add(loc.label);
  for (const city of ticketByCity.keys()) candidateLabels.add(city);

  for (const label of candidateLabels) {
    const fanLoc = topFan.find((t) => t.label === label);
    const fanScore = fanLoc ? Math.round((fanLoc.count / maxFan) * 100) : 20;
    const growth = fanLoc?.growthPercent ?? 0;
    const ticketHistory = ticketByCity.get(label) ?? 0;
    const heatWeight = fanLoc?.count ?? ticketHistory;

    const venue = matchVenue(label, venues);
    const expectedAttendance = Math.max(
      25,
      Math.round(fanLoc?.count ?? ticketHistory * 8 + fanScore * 2)
    );
    const revenuePredictionCents = expectedAttendance * avgTicketCents;
    const costEstimate = Math.round(revenuePredictionCents * 0.28);
    const profitEstimateCents = revenuePredictionCents - costEstimate;

    const riskScore = Math.min(
      95,
      Math.max(
        5,
        100 -
          fanScore * 0.4 -
          Math.min(ticketHistory * 3, 30) -
          Math.min(growth, 25)
      )
    );

    const growthOpportunityPct = Math.min(45, Math.round(growth * 0.6 + (100 - fanScore) * 0.15));

    const bestDayIdx = dayScores.indexOf(Math.max(...dayScores));
    const bestHour = hourScores.indexOf(Math.max(...hourScores));

    const rationale: string[] = [];
    if (fanLoc && fanLoc.count > 0) rationale.push(`${fanLoc.count} fans mapped near ${label}.`);
    if (ticketHistory > 0) rationale.push(`${ticketHistory} historical tickets sold for this market.`);
    if (growth > 10) rationale.push(`Fan growth ${growth}% vs prior period.`);
    if (venue) rationale.push(`Matched LiveCircuit venue ${venue.region}.`);

    recommendations.push({
      cityLabel: label,
      region: venue?.region ?? label,
      stateCode: venue?.state_code ?? null,
      venueId: venue?.id ?? null,
      venueSlug: venue?.slug ?? null,
      fanScore,
      ticketHistory,
      revenuePredictionCents,
      expectedAttendance,
      riskScore,
      travelScore: null,
      profitEstimateCents,
      growthOpportunityPct,
      suggestedDayOfWeek: DAY_NAMES[bestDayIdx] ?? "Friday",
      suggestedHourLocal: bestHour >= 0 ? bestHour : 19,
      heatWeight,
      rationale,
    });
  }

  recommendations.sort((a, b) => b.heatWeight - a.heatWeight || b.fanScore - a.fanScore);

  const topRecs = recommendations.slice(0, 8);

  const bestDayIdx = dayScores.indexOf(Math.max(...dayScores));
  const bestHour = hourScores.indexOf(Math.max(...hourScores));
  const preferredTimeWindow = `${DAY_NAMES[bestDayIdx] ?? "Friday"} ${bestHour}:00–${(bestHour + 2) % 24}:00 local`;

  const insights: string[] = [];
  const topThree = topRecs.slice(0, 3).map((r) => r.cityLabel);
  if (topThree.length) {
    insights.push(`Your strongest cities are ${topThree.join(", ")}.`);
  }
  const expand = topRecs.find((r) => r.growthOpportunityPct >= 15 && r.fanScore < 70);
  if (expand) {
    insights.push(
      `Adding ${expand.cityLabel} could increase revenue by ~${expand.growthOpportunityPct}%.`
    );
  }
  if (bestDayIdx === 5) {
    insights.push("Your comedy audience is strongest on Fridays.");
  } else if (DAY_NAMES[bestDayIdx]) {
    insights.push(`Your audience engages most on ${DAY_NAMES[bestDayIdx]}s.`);
  }
  if (bestHour >= 17 && bestHour <= 21) {
    insights.push("Your fans prefer shows between 7–9 PM local time.");
  }

  const totalRevenuePredictionCents = topRecs.reduce((s, r) => s + r.revenuePredictionCents, 0);
  const totalExpectedAttendance = topRecs.reduce((s, r) => s + r.expectedAttendance, 0);
  const averageRiskScore =
    topRecs.length > 0
      ? Math.round(topRecs.reduce((s, r) => s + r.riskScore, 0) / topRecs.length)
      : 50;
  const averageGrowthOpportunityPct =
    topRecs.length > 0
      ? Math.round(topRecs.reduce((s, r) => s + r.growthOpportunityPct, 0) / topRecs.length)
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    artistId,
    insights,
    summary: {
      totalRevenuePredictionCents,
      totalExpectedAttendance,
      averageRiskScore,
      averageGrowthOpportunityPct,
      preferredTimeWindow,
      strongestGenreSignal: artistCategory,
    },
    recommendations: topRecs,
    heatMap: fanHeat,
    scheduling: {
      byDayOfWeek: DAY_NAMES.map((day, i) => ({ day, score: dayScores[i] ?? 0 })),
      byHour: hourScores.map((score, hour) => ({ hour, score })).filter((h) => h.score > 0 || h.hour >= 17 && h.hour <= 22),
      seasonalMonths: [...monthTickets.entries()].map(([month, ticketIndex]) => ({ month, ticketIndex })),
    },
    similarArtistsSignal: artistCategory
      ? {
          category: artistCategory,
          peerCount: peerCountRes.count ?? 0,
          note: `${peerCountRes.count ?? 0} peer artists in ${artistCategory} — align tour timing with genre trends.`,
        }
      : null,
  };
}

export function nextStopDateTime(base: Date, stopIndex: number, dayOfWeek: string, hourLocal: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + stopIndex * 7);
  const targetDay = DAY_NAMES.indexOf(dayOfWeek);
  if (targetDay >= 0) {
    const diff = (targetDay - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
  }
  d.setHours(hourLocal, 0, 0, 0);
  return d;
}
