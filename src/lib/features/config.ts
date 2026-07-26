import { isStripeConfigured } from "@/lib/config/env";

/** Flip `publiclyEnabled` to true (or set `enabledWhen`) to launch a feature without code changes. */
export type FeatureId =
  | "world_map"
  | "virtual_festivals"
  | "creator_marketplace"
  | "local_business_marketplace"
  | "coins"
  | "achievements"
  | "gamification"
  | "sponsorships"
  | "direct_messages"
  | "friend_system"
  | "ticketing";

type FeatureGateConfig = {
  label: string;
  publiclyEnabled: boolean;
  /** When set, public access follows runtime config instead of `publiclyEnabled`. */
  enabledWhen?: "stripe";
  pathPrefixes: string[];
  apiPrefixes: string[];
};

export const FEATURE_GATES: Record<FeatureId, FeatureGateConfig> = {
  world_map: {
    label: "World Preview (Mapbox)",
    publiclyEnabled: false,
    pathPrefixes: ["/world"],
    apiPrefixes: ["/api/world"],
  },
  virtual_festivals: {
    label: "Virtual Festivals",
    publiclyEnabled: false,
    pathPrefixes: ["/festivals"],
    apiPrefixes: ["/api/festivals"],
  },
  creator_marketplace: {
    label: "Creator Marketplace",
    publiclyEnabled: false,
    pathPrefixes: ["/marketplace"],
    apiPrefixes: ["/api/marketplace", "/api/stripe/marketplace-checkout"],
  },
  local_business_marketplace: {
    label: "Local Business Marketplace",
    publiclyEnabled: false,
    pathPrefixes: ["/local-business"],
    apiPrefixes: ["/api/local-business", "/api/stripe/local-business-campaign"],
  },
  coins: {
    label: "LiveCircuit Coins",
    publiclyEnabled: false,
    pathPrefixes: ["/coins"],
    apiPrefixes: ["/api/fans/coins"],
  },
  achievements: {
    label: "Achievements",
    publiclyEnabled: false,
    pathPrefixes: ["/achievements"],
    apiPrefixes: ["/api/fans/achievements"],
  },
  gamification: {
    label: "Gamification",
    publiclyEnabled: false,
    pathPrefixes: ["/gamification"],
    apiPrefixes: ["/api/fans/gamification"],
  },
  sponsorships: {
    label: "Sponsorships",
    publiclyEnabled: false,
    pathPrefixes: ["/sponsor"],
    apiPrefixes: ["/api/sponsors"],
  },
  direct_messages: {
    label: "Direct Messages",
    publiclyEnabled: false,
    pathPrefixes: ["/messages"],
    apiPrefixes: [],
  },
  friend_system: {
    label: "Friend System",
    publiclyEnabled: false,
    pathPrefixes: ["/friends"],
    apiPrefixes: ["/api/friends"],
  },
  ticketing: {
    label: "Ticketing",
    publiclyEnabled: false,
    enabledWhen: "stripe",
    pathPrefixes: ["/checkout"],
    apiPrefixes: ["/api/checkout", "/api/stripe/checkout"],
  },
};

export function isFeaturePubliclyEnabled(featureId: FeatureId): boolean {
  const gate = FEATURE_GATES[featureId];
  if (gate.enabledWhen === "stripe") return isStripeConfigured();
  return gate.publiclyEnabled;
}

export function listGatedPathPrefixes(): string[] {
  return Object.values(FEATURE_GATES).flatMap((gate) => gate.pathPrefixes);
}

export function listGatedApiPrefixes(): string[] {
  return Object.values(FEATURE_GATES).flatMap((gate) => gate.apiPrefixes);
}
