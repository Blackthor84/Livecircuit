import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getAppUrl,
  getMilestoneEnvStatus,
  getStreamingProviderName,
  getSupabaseProjectUrl,
  getSupabaseServiceUrls,
  normalizeSupabaseProjectUrl,
} from "@/lib/config/env";

describe("getMilestoneEnvStatus", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
  });

  it("requires supabase for go-live readiness", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const status = getMilestoneEnvStatus();
    expect(status.readyForGoLive).toBe(false);
  });

  it("allows placeholder streaming when supabase is configured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.STREAMING_PROVIDER = "placeholder";
    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    const status = getMilestoneEnvStatus();
    expect(status.readyForGoLive).toBe(true);
    expect(status.streamingProvider).toBe("placeholder");
  });

  it("auto-selects livekit when credentials exist and provider is unset", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    delete process.env.STREAMING_PROVIDER;
    process.env.LIVEKIT_URL = "wss://live.example.com";
    process.env.LIVEKIT_API_KEY = "api-key";
    process.env.LIVEKIT_API_SECRET = "api-secret";
    expect(getStreamingProviderName()).toBe("livekit");
    const status = getMilestoneEnvStatus();
    expect(status.streamingProvider).toBe("livekit");
    expect(status.livekit).toBe(true);
    expect(status.readyForGoLive).toBe(true);
  });
});

describe("normalizeSupabaseProjectUrl", () => {
  it("strips /rest/v1 mistaken suffix", () => {
    expect(normalizeSupabaseProjectUrl("https://abc.supabase.co/rest/v1")).toBe(
      "https://abc.supabase.co"
    );
  });

  it("strips /auth/v1 mistaken suffix", () => {
    expect(normalizeSupabaseProjectUrl("https://abc.supabase.co/auth/v1/")).toBe(
      "https://abc.supabase.co"
    );
  });

  it("builds auth and rest endpoints from project root", () => {
    const urls = getSupabaseServiceUrls("https://abc.supabase.co");
    expect(urls.authUrl).toBe("https://abc.supabase.co/auth/v1");
    expect(urls.restUrl).toBe("https://abc.supabase.co/rest/v1");
  });
});

describe("getAppUrl", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
  });

  it("prefers NEXT_PUBLIC_APP_URL over Vercel preview URL", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.watchlivecircuit.com";
    process.env.NEXT_PUBLIC_VERCEL_URL = "livecircuit-git-main.vercel.app";
    expect(getAppUrl()).toBe("https://www.watchlivecircuit.com");
  });
});

describe("getSupabaseProjectUrl", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
  });

  it("normalizes env value with /rest/v1 suffix", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co/rest/v1";
    expect(getSupabaseProjectUrl()).toBe("https://abc.supabase.co");
    expect(getSupabaseServiceUrls().authUrl).toBe("https://abc.supabase.co/auth/v1");
  });
});
