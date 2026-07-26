import { NextResponse } from "next/server";
import { getMilestoneEnvStatus, isStripeConfigured, isSupabaseConfigured } from "@/lib/config/env";
import { isRedisRateLimitConfigured } from "@/lib/api/rate-limit";
import { isCronSecretConfigured } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";

export async function GET() {
  const milestone = getMilestoneEnvStatus();
  const checks = {
    supabase: milestone.supabase,
    stripe: isStripeConfigured(),
    livekit: milestone.livekit,
    streamingProvider: milestone.streamingProvider,
    goLiveReady: milestone.readyForGoLive,
    redisRateLimit: isRedisRateLimitConfigured(),
    cronWorker: isCronSecretConfigured(),
  };

  const ready = checks.supabase;

  return NextResponse.json(
    {
      status: ready ? "ok" : "degraded",
      service: "livecircuit",
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: ready ? 200 : 503 }
  );
}
