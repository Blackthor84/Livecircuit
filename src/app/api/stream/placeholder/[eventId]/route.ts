import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEventLiveAccess } from "@/lib/live/access";
import { getStreamingProvider } from "@/lib/streaming/provider";
import { isSupabaseConfigured } from "@/lib/config/env";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { eventId } = await params;
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") === "host" ? "host" : "audience";

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const access = await getEventLiveAccess(supabase, user?.id, eventId);
    if (role === "host" && !access.canModerate) {
      return NextResponse.json({ error: "Host access required" }, { status: 403 });
    }
    if (role === "audience" && !access.canWatchStream) {
      return NextResponse.json({ error: "Ticket required or event not live" }, { status: 403 });
    }
  }

  const provider = getStreamingProvider();
  const credentials = await provider.getViewerCredentials(
    eventId,
    "anonymous",
    role
  );
  return NextResponse.json(credentials);
}
