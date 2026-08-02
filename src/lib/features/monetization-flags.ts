import type { FeatureId } from "@/lib/features/config";

/** Maps MVP feature gates to monetization DB feature flag keys. */
export const FEATURE_TO_MONETIZATION_FLAG: Partial<Record<FeatureId, string>> = {
  creator_marketplace: "marketplace",
  virtual_festivals: "festival_builder",
  sponsorships: "sponsor_matching",
  ticketing: "venue_booking",
  agency_portal: "agency_crm",
};

/** Premium routes gated by monetization flags (in addition to MVP gates). */
export const MONETIZATION_FEATURE_ROUTES: Record<string, string> = {
  "/artist/poster": "ai_poster_generator",
  "/agency/crm": "agency_crm",
  "/festivals/builder": "festival_builder",
  "/sponsor/marketplace": "sponsor_matching",
  "/agency/marketing-wallet": "marketing_wallet",
  "/events/replay": "ticket_replay",
  "/vip": "vip_lounge",
  "/admin/analytics/premium": "premium_analytics",
};

export function monetizationFlagForFeature(featureId: FeatureId): string | null {
  return FEATURE_TO_MONETIZATION_FLAG[featureId] ?? null;
}

export function monetizationFlagForPath(pathname: string): string | null {
  for (const [prefix, flagKey] of Object.entries(MONETIZATION_FEATURE_ROUTES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return flagKey;
    }
  }
  return null;
}
