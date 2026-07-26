import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api/errors";
import { getSessionUser } from "@/lib/auth/session";
import { getArtistFanHeatData } from "@/lib/data/fan-heat";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isAdminRole } from "@/lib/auth/roles";

const querySchema = z.object({
  region: z.enum(["us", "world"]).optional(),
  window: z.enum(["all", "30d", "90d"]).optional(),
  minGrowth: z.coerce.number().min(0).max(100).optional(),
});

type Params = { params: Promise<{ artistId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { artistId } = await params;
  const user = await getSessionUser();
  if (!user) return jsonError("Sign in required", 401);

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const { data: artist } = await supabase
      .from("artists")
      .select("id, user_id")
      .eq("id", artistId)
      .maybeSingle();

    if (!artist) return jsonError("Artist not found", 404);

    const isOwner = artist.user_id === user.id;
    const isAdmin = isAdminRole(profile?.role);
    if (!isOwner && !isAdmin) return jsonError("Forbidden", 403);
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    region: searchParams.get("region") ?? undefined,
    window: searchParams.get("window") ?? undefined,
    minGrowth: searchParams.get("minGrowth") ?? undefined,
  });

  if (!parsed.success) return jsonError("Invalid query", 422);

  const data = await getArtistFanHeatData(artistId, parsed.data);
  return NextResponse.json(data);
}
