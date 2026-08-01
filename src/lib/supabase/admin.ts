import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl } from "@/lib/config/env";

let adminClient: SupabaseClient | null = null;

/** Service-role client for webhooks and trusted server jobs only. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const url = getSupabaseProjectUrl();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase admin credentials are not configured");
    }
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
