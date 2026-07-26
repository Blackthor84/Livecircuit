import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getMilestoneEnvStatus } from "@/lib/config/env";

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
    const status = getMilestoneEnvStatus();
    expect(status.readyForGoLive).toBe(true);
    expect(status.streamingProvider).toBe("placeholder");
  });
});
