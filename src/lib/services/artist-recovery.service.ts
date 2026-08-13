import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ArtistReceivableRow = {
  id: string;
  artist_id: string;
  order_id: string;
  amount_cents: number;
  recovered_cents: number;
  status: string;
  source_reference_id: string;
  created_at: string;
  orders?: { gross_cents: number | null; refund_cents: number | null } | null;
  artists?: { stage_name: string } | null;
};

export async function listArtistReceivables(
  supabase: SupabaseClient,
  options?: { artistId?: string; status?: string; limit?: number },
): Promise<ArtistReceivableRow[]> {
  let query = supabase
    .from("artist_receivables")
    .select(
      "id, artist_id, order_id, amount_cents, recovered_cents, status, source_reference_id, created_at, orders(gross_cents, refund_cents), artists(stage_name)",
    )
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.artistId) query = query.eq("artist_id", options.artistId);
  if (options?.status) query = query.eq("status", options.status);

  const { data } = await query;
  return (data ?? []) as unknown as ArtistReceivableRow[];
}

export async function recordManualArtistRecovery(
  supabase: SupabaseClient,
  input: {
    receivableId: string;
    amountCents: number;
    referenceId: string;
    notes?: string | null;
    adminId?: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("record_artist_recovery_payment", {
    p_receivable_id: input.receivableId,
    p_amount_cents: input.amountCents,
    p_reference_id: input.referenceId,
    p_notes: input.notes ?? `Manual recovery by admin ${input.adminId ?? "unknown"}`,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function writeOffArtistReceivable(
  supabase: SupabaseClient,
  receivableId: string,
  adminId?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const refId = `writeoff:${receivableId}`;
  const { data: row } = await supabase
    .from("artist_receivables")
    .select("id, amount_cents, recovered_cents, artist_id")
    .eq("id", receivableId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Receivable not found" };

  const remaining = Number(row.amount_cents) - Number(row.recovered_cents ?? 0);
  if (remaining <= 0) {
    await supabase
      .from("artist_receivables")
      .update({ status: "written_off", updated_at: new Date().toISOString() })
      .eq("id", receivableId);
    return { ok: true };
  }

  const result = await recordManualArtistRecovery(supabase, {
    receivableId,
    amountCents: remaining,
    referenceId: refId,
    notes: `Written off by admin ${adminId ?? "unknown"}`,
    adminId,
  });

  if (!result.ok) return result;

  await supabase
    .from("artist_receivables")
    .update({ status: "written_off", updated_at: new Date().toISOString() })
    .eq("id", receivableId);

  return { ok: true };
}
