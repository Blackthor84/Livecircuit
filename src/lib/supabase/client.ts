import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseProjectUrl } from "@/lib/config/env";

export function createClient() {
  const url = getSupabaseProjectUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";
  return createBrowserClient(url, key);
}
