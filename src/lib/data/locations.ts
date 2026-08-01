import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export async function getCountries(enabledOnly = true) {
  if (!isSupabaseConfigured()) {
    return [{ id: "demo-us", code: "US", name: "United States" }];
  }
  const supabase = await createClient();
  let query = supabase.from("countries").select("id, code, name, is_enabled").order("name");
  if (enabledOnly) query = query.eq("is_enabled", true);
  const { data } = await query;
  return data ?? [];
}

export async function getStates(countryId: string, enabledOnly = true) {
  if (!isSupabaseConfigured() || countryId === "demo-us") {
    return [
      { id: "demo-ca", code: "CA", name: "California" },
      { id: "demo-ny", code: "NY", name: "New York" },
      { id: "demo-tx", code: "TX", name: "Texas" },
    ];
  }
  const supabase = await createClient();
  let query = supabase
    .from("states")
    .select("id, code, name, is_enabled")
    .eq("country_id", countryId)
    .order("name");
  if (enabledOnly) query = query.eq("is_enabled", true);
  const { data } = await query;
  return data ?? [];
}

export async function getCities(stateId: string, enabledOnly = true) {
  if (!isSupabaseConfigured() || stateId.startsWith("demo-")) {
    return [
      { id: "demo-city-la", name: "Los Angeles", slug: "los-angeles" },
      { id: "demo-city-ny", name: "New York", slug: "new-york" },
    ];
  }
  const supabase = await createClient();
  let query = supabase
    .from("cities")
    .select("id, name, slug, latitude, longitude, is_enabled")
    .eq("state_id", stateId)
    .order("name");
  if (enabledOnly) query = query.eq("is_enabled", true);
  const { data } = await query;
  return data ?? [];
}

export async function getGenres() {
  if (!isSupabaseConfigured()) {
    return [
      { id: "demo-pop", slug: "pop", name: "Pop" },
      { id: "demo-rock", slug: "rock", name: "Rock" },
      { id: "demo-hip-hop", slug: "hip-hop", name: "Hip-Hop" },
    ];
  }
  const supabase = await createClient();
  const { data } = await supabase.from("genres").select("id, slug, name").order("name");
  return data ?? [];
}

export async function listAdminCountries() {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("countries")
    .select("id, code, name, is_enabled")
    .order("name");
  return data ?? [];
}
