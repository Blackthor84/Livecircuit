import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  defaultRecordingFilepath,
  finalizeRecordingUrl,
} from "@/lib/services/recordings.service";
import { getLiveKitWebhookReceiver } from "@/lib/streaming/livekit-egress";
import { parseStreamMetadata } from "@/lib/streaming/stream-metadata";

export async function POST(request: Request) {
  const receiver = getLiveKitWebhookReceiver();
  if (!receiver) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await request.text();
  const authHeader = (await headers()).get("authorization") ?? "";

  let event;
  try {
    event = await receiver.receive(body, authHeader);
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  if (event.event !== "egress_ended") {
    return NextResponse.json({ received: true });
  }

  const info = event.egressInfo;
  if (!info?.roomName?.startsWith("lc-event-")) {
    return NextResponse.json({ received: true });
  }

  const eventId = info.roomName.replace("lc-event-", "");
  const supabase = getSupabaseAdmin();

  if (info.error) {
    const { data } = await supabase
      .from("streams")
      .select("metadata")
      .eq("event_id", eventId)
      .maybeSingle();
    const metadata = parseStreamMetadata(data?.metadata);
    await supabase
      .from("streams")
      .update({
        metadata: {
          ...metadata,
          recording_status: "failed",
          recording_error: info.error,
        },
      })
      .eq("event_id", eventId);
    return NextResponse.json({ received: true, failed: true });
  }

  const filepath =
    info.fileResults?.[0]?.filename ?? defaultRecordingFilepath(eventId);

  await finalizeRecordingUrl(supabase, eventId, filepath);

  return NextResponse.json({ received: true, eventId });
}
