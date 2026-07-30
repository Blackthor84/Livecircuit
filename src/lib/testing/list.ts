import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type TestAccountRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: string;
  test_scenario: string | null;
  test_created_at: string | null;
  avatar_url: string | null;
  artist?: { stage_name: string; slug: string } | null;
};

export async function listTestAccounts(limit = 100): Promise<TestAccountRow[]> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select("id, username, display_name, role, test_scenario, test_created_at, avatar_url, artists(stage_name, slug)")
    .eq("is_test_account", true)
    .order("test_created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const artists = row.artists as { stage_name: string; slug: string } | { stage_name: string; slug: string }[] | null;
    return {
      id: row.id as string,
      username: row.username as string | null,
      display_name: row.display_name as string | null,
      role: row.role as string,
      test_scenario: row.test_scenario as string | null,
      test_created_at: row.test_created_at as string | null,
      avatar_url: row.avatar_url as string | null,
      artist: Array.isArray(artists) ? artists[0] ?? null : artists,
    };
  });
}

export async function countTestAccounts() {
  const admin = getSupabaseAdmin();
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_test_account", true);
  return count ?? 0;
}
