import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { PipelineStageId } from "@/lib/sponsorship/program-constants";

export type PipelineDeal = {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  title: string;
  stage: PipelineStageId;
  slotTypeSlug: string | null;
  venueId: string | null;
  venueName: string | null;
  estimatedValueCents: number;
  notes: string | null;
  stageChangedAt: string;
  createdAt: string;
  interactionCount: number;
};

export type PipelineInteraction = {
  id: string;
  dealId: string;
  interactionType: string;
  subject: string | null;
  body: string;
  createdAt: string;
};

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function listPipelineDeals(stage?: PipelineStageId) {
  if (!isSupabaseConfigured()) return [];

  const admin = getSupabaseAdmin();
  let q = admin
    .from("sponsorship_pipeline_deals")
    .select("*, venues(default_name)")
    .order("updated_at", { ascending: false });

  if (stage) q = q.eq("stage", stage);

  const { data } = await q.limit(200);

  const deals = data ?? [];
  const ids = deals.map((d) => d.id as string);
  const interactionCounts = new Map<string, number>();

  if (ids.length) {
    const { data: interactions } = await admin
      .from("sponsorship_pipeline_interactions")
      .select("deal_id")
      .in("deal_id", ids);
    for (const i of interactions ?? []) {
      const id = i.deal_id as string;
      interactionCounts.set(id, (interactionCounts.get(id) ?? 0) + 1);
    }
  }

  return deals.map((row) => {
    const venue = unwrapJoin(row.venues as { default_name: string } | { default_name: string }[] | null);
    return {
      id: row.id as string,
      organizationId: (row.organization_id as string) ?? null,
      organizationName: (row.organization_name as string) ?? null,
      contactName: (row.contact_name as string) ?? null,
      contactEmail: (row.contact_email as string) ?? null,
      title: row.title as string,
      stage: row.stage as PipelineStageId,
      slotTypeSlug: (row.slot_type_slug as string) ?? null,
      venueId: (row.venue_id as string) ?? null,
      venueName: venue?.default_name ?? null,
      estimatedValueCents: row.estimated_value_cents as number,
      notes: (row.notes as string) ?? null,
      stageChangedAt: row.stage_changed_at as string,
      createdAt: row.created_at as string,
      interactionCount: interactionCounts.get(row.id as string) ?? 0,
    } satisfies PipelineDeal;
  });
}

export async function listDealInteractions(dealId: string) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsorship_pipeline_interactions")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id as string,
    dealId: r.deal_id as string,
    interactionType: r.interaction_type as string,
    subject: (r.subject as string) ?? null,
    body: r.body as string,
    createdAt: r.created_at as string,
  })) satisfies PipelineInteraction[];
}

export async function getPipelineSummary() {
  const deals = await listPipelineDeals();
  const byStage = new Map<string, number>();
  let totalValue = 0;
  for (const d of deals) {
    byStage.set(d.stage, (byStage.get(d.stage) ?? 0) + 1);
    totalValue += d.estimatedValueCents;
  }
  return { totalDeals: deals.length, totalValueCents: totalValue, byStage: Object.fromEntries(byStage) };
}
