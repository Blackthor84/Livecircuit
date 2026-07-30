import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEventLiveAccess } from "@/lib/live/access";
import { getStreamingProvider } from "@/lib/streaming/provider";
import { isSupabaseConfigured } from "@/lib/config/env";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { eventId } = await params;
  const { searchParams } = new URL(request.url);
  const roleParam = searchParams.get("role");
  const role =
    roleParam === "host" ? "host" : roleParam === "producer" ? "producer" : "audience";

  let userId = `guest-${crypto.randomUUID()}`;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) userId = user.id;

    const access = await getEventLiveAccess(supabase, user?.id, eventId);
    if (role === "host" && !access.canModerate && access.mode !== "host") {
      return NextResponse.json({ error: "Host access required" }, { status: 403 });
    }
    if (role === "producer" && access.mode !== "producer" && access.mode !== "host") {
      return NextResponse.json({ error: "Producer access required" }, { status: 403 });
    }
    if (role === "audience" && !access.canWatchStream) {
      return NextResponse.json({ error: "Ticket required or event not live" }, { status: 403 });
    }
  }

  const provider = getStreamingProvider();
  const streamRole = role === "producer" ? "producer" : role;
  const credentials = await provider.getViewerCredentials(eventId, userId, streamRole);
  return NextResponse.json(credentials);
}
