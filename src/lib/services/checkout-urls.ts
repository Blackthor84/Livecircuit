import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheckoutBody } from "@/lib/validations/checkout";
import { getEventPublicPath } from "@/lib/services/events.service";
import type { ResolvedCheckout } from "@/lib/services/orders.service";

export async function buildCheckoutSuccessUrl(
  supabase: SupabaseClient,
  origin: string,
  body: CheckoutBody,
  resolved: ResolvedCheckout
): Promise<string> {
  if (body.type === "ticket" && resolved.eventId) {
    const path = await getEventPublicPath(supabase, resolved.eventId);
    if (path) return `${origin}${path}?checkout=success`;
  }
  return `${origin}/dashboard?checkout=success`;
}

export function buildCheckoutCancelUrl(origin: string, body: CheckoutBody): string {
  const params = new URLSearchParams({ canceled: "1", type: body.type });
  if (body.eventId) params.set("event", body.eventId);
  if (body.tourStopId) params.set("tourStop", body.tourStopId);
  if (body.artistSlug) params.set("artist", body.artistSlug);
  return `${origin}/checkout?${params.toString()}`;
}
