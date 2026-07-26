/** Central env checks — do not import demo fixtures from here. */

export type StreamingProviderName = "placeholder" | "livekit" | "agora" | "mux";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")
  );
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      !process.env.STRIPE_SECRET_KEY.startsWith("sk_test_...") &&
      process.env.STRIPE_SECRET_KEY.length > 12
  );
}

export function getStreamingProviderName(): StreamingProviderName {
  const raw = (process.env.STREAMING_PROVIDER ?? "placeholder").toLowerCase();
  if (raw === "livekit" || raw === "agora" || raw === "mux") return raw;
  return "placeholder";
}

export function isLiveKitConfigured(): boolean {
  const config = getLiveKitConfig();
  return Boolean(config?.url && config.apiKey && config.apiSecret);
}

export function getLiveKitConfig() {
  const url =
    process.env.NEXT_PUBLIC_LIVEKIT_URL ??
    process.env.LIVEKIT_URL ??
    "";
  const apiKey = process.env.LIVEKIT_API_KEY ?? "";
  const apiSecret = process.env.LIVEKIT_API_SECRET ?? "";

  if (!url || !apiKey || !apiSecret) return null;
  if (url.includes("your-livekit") || apiKey.includes("your-")) return null;

  return { url, apiKey, apiSecret };
}

export type MilestoneEnvStatus = {
  supabase: boolean;
  stripe: boolean;
  livekit: boolean;
  streamingProvider: StreamingProviderName;
  readyForGoLive: boolean;
};

export function getMilestoneEnvStatus(): MilestoneEnvStatus {
  const supabase = isSupabaseConfigured();
  const stripe = isStripeConfigured();
  const streamingProvider = getStreamingProviderName();
  const livekit =
    streamingProvider === "livekit" ? isLiveKitConfigured() : isLiveKitConfigured();

  return {
    supabase,
    stripe,
    livekit,
    streamingProvider,
    readyForGoLive: supabase && (streamingProvider === "placeholder" || livekit),
  };
}

function normalizeOrigin(url: string) {
  let value = url.trim();
  if (!value) return value;

  if (!/^https?:\/\//i.test(value)) {
    value = value.includes("localhost") ? `http://${value}` : `https://${value}`;
  }

  return value.replace(/\/+$/, "");
}

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return normalizeOrigin(configured);

  // Never fall back to Vercel preview URLs in production auth redirects.
  if (process.env.NODE_ENV === "development") {
    const local = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
    if (local) return normalizeOrigin(local);
    return "http://localhost:3000";
  }

  return "https://www.watchlivecircuit.com";
}

/** Supabase auth redirect target — must match Auth > URL Configuration allow list. */
export function getAuthCallbackUrl(params?: { next?: string; type?: string }) {
  const base = `${getAppUrl()}/auth/callback`;
  if (!params?.next && !params?.type) return base;

  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.next) qs.set("next", params.next);
  return `${base}?${qs.toString()}`;
}

const SUPABASE_API_SUFFIX =
  /\/+(?:rest|auth|storage|functions|realtime|graphql)\/v1\/?$/i;

/** Project root only — supabase-js appends /auth/v1, /rest/v1, etc. */
export function normalizeSupabaseProjectUrl(url: string) {
  let normalized = url.trim();
  while (SUPABASE_API_SUFFIX.test(normalized)) {
    normalized = normalized.replace(SUPABASE_API_SUFFIX, "");
  }
  return normalized.replace(/\/+$/, "");
}

export function getSupabaseProjectUrl() {
  return normalizeSupabaseProjectUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"
  );
}

/** Resolved service endpoints derived from the project root URL. */
export function getSupabaseServiceUrls(projectUrl = getSupabaseProjectUrl()) {
  const base = `${projectUrl.replace(/\/+$/, "")}/`;
  return {
    projectUrl: projectUrl.replace(/\/+$/, ""),
    authUrl: new URL("auth/v1", base).href.replace(/\/$/, ""),
    restUrl: new URL("rest/v1", base).href.replace(/\/$/, ""),
    storageUrl: new URL("storage/v1", base).href.replace(/\/$/, ""),
  };
}

/** Client-safe streaming checks (public env only). */
export function getClientStreamingProviderName(): StreamingProviderName {
  const raw = (
    process.env.NEXT_PUBLIC_STREAMING_PROVIDER ??
    process.env.STREAMING_PROVIDER ??
    "placeholder"
  ).toLowerCase();
  if (raw === "livekit" || raw === "agora" || raw === "mux") return raw;
  return "placeholder";
}

export function isClientLiveKitConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";
  return Boolean(url && !url.includes("your-livekit"));
}
