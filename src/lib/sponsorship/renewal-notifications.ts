import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createNotification } from "@/lib/services/notifications.service";
import { countWaitingListForSlot } from "@/lib/sponsorship/waiting-list";

export type RenewalNotificationResult = {
  sent: number;
  errors: string[];
};

export async function processDueRenewalNotifications(): Promise<RenewalNotificationResult> {
  const result: RenewalNotificationResult = { sent: 0, errors: [] };
  if (!isSupabaseConfigured()) return result;

  const admin = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: due } = await admin
    .from("sponsorship_renewal_notifications")
    .select("id, contract_id, days_before_expiration, premium_sponsorship_contracts(display_label, contract_ends_at, venue_id, slot_type_slug)")
    .is("sent_at", null)
    .lte("scheduled_for", today)
    .limit(100);

  if (!due?.length) return result;

  const { data: admins } = await admin.from("admins").select("user_id");

  for (const row of due) {
    const contract = row.premium_sponsorship_contracts as
      | {
          display_label: string;
          contract_ends_at: string;
          venue_id: string | null;
          slot_type_slug: string;
        }
      | {
          display_label: string;
          contract_ends_at: string;
          venue_id: string | null;
          slot_type_slug: string;
        }[]
      | null;
    const c = Array.isArray(contract) ? contract[0] : contract;
    if (!c) continue;

    const title = `Sponsorship renewal: ${c.display_label}`;
    const body = `Contract expires ${c.contract_ends_at} (${row.days_before_expiration} days reminder). Auto-renew is disabled.`;

    for (const adminRow of admins ?? []) {
      try {
        await createNotification({
          userId: adminRow.user_id as string,
          type: "system",
          title,
          body,
          link: "/admin/sponsorships",
          metadata: { contract_id: row.contract_id, days_before: row.days_before_expiration },
        });
      } catch (e) {
        result.errors.push(String(e));
      }
    }

    await admin
      .from("sponsorship_renewal_notifications")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", row.id);

    result.sent += 1;
  }

  return result;
}

export async function notifyWaitingListOnExpiration(input: {
  slotTypeSlug: string;
  venueId?: string | null;
  displayLabel: string;
}) {
  if (!isSupabaseConfigured()) return;

  const count = await countWaitingListForSlot(input.slotTypeSlug, input.venueId);
  if (count === 0) return;

  const admin = getSupabaseAdmin();
  const { data: admins } = await admin.from("admins").select("user_id");

  const title = "Sponsorship slot available — waiting list";
  const body = `"${input.displayLabel}" expired. There ${count === 1 ? "is" : "are"} ${count} ${count === 1 ? "company" : "companies"} waiting to purchase this sponsorship.`;

  for (const row of admins ?? []) {
    await createNotification({
      userId: row.user_id as string,
      type: "system",
      title,
      body,
      link: "/admin/sponsorships",
      metadata: { slot_type_slug: input.slotTypeSlug, venue_id: input.venueId, waiting_count: count },
    });
  }
}
