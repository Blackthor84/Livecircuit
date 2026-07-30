import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRehearsal } from "@/lib/live/rehearsal-access";
import { getStreamingProvider } from "@/lib/streaming/provider";
import { isSupabaseConfigured } from "@/lib/config/env";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { eventId } = await params;
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") === "host" ? "host" : "audience";
  const inviteToken = searchParams.get("token");

  let userId = `guest-${crypto.randomUUID()}`;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Rehearsal requires Supabase" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) userId = user.id;

  const access = await canAccessRehearsal(supabase, user?.id, eventId, inviteToken);
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason ?? "Access denied" }, { status: 403 });
  }

  const streamRole =
    access.role === "host" && role === "host" ? "host" : "audience";

  const provider = getStreamingProvider();
  const credentials = await provider.getViewerCredentials(eventId, userId, streamRole, {
    rehearsal: true,
  });

  return NextResponse.json({ ...credentials, rehearsal: true });
}
