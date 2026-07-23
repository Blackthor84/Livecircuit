import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export async function getCountries() {
  if (!isSupabaseConfigured()) {
    return [{ id: "demo-us", code: "US", name: "United States" }];
  }
  const supabase = await createClient();
  const { data } = await supabase.from("countries").select("id, code, name").order("name");
  return data ?? [];
}

export async function getStates(countryId: string) {
  if (!isSupabaseConfigured() || countryId === "demo-us") {
    return [
      { id: "demo-ca", code: "CA", name: "California" },
      { id: "demo-ny", code: "NY", name: "New York" },
      { id: "demo-tx", code: "TX", name: "Texas" },
    ];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("states")
    .select("id, code, name")
    .eq("country_id", countryId)
    .order("name");
  return data ?? [];
}

export async function getCities(stateId: string) {
  if (!isSupabaseConfigured() || stateId.startsWith("demo-")) {
    return [
      { id: "demo-city-la", name: "Los Angeles", slug: "los-angeles" },
      { id: "demo-city-ny", name: "New York", slug: "new-york" },
    ];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("cities")
    .select("id, name, slug")
    .eq("state_id", stateId)
    .order("name");
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
