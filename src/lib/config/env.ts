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

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
