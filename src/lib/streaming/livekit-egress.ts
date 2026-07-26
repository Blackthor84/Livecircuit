import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
  WebhookReceiver,
} from "livekit-server-sdk";
import { getAppUrl, getLiveKitConfig, isLiveKitConfigured } from "@/lib/config/env";
import { liveKitRoomName } from "@/lib/streaming/livekit";
import { recordingPathForEvent } from "@/lib/streaming/stream-metadata";

export function isRecordingEgressConfigured() {
  return Boolean(
    process.env.RECORDING_S3_BUCKET &&
      process.env.RECORDING_S3_ACCESS_KEY &&
      process.env.RECORDING_S3_SECRET_KEY &&
      process.env.RECORDING_S3_ENDPOINT
  );
}

function getEgressClient() {
  const config = getLiveKitConfig();
  if (!config) throw new Error("LiveKit is not configured");
  return new EgressClient(config.url, config.apiKey, config.apiSecret);
}

export async function startLiveKitRecording(eventId: string) {
  if (!isLiveKitConfigured() || !isRecordingEgressConfigured()) return null;

  const client = getEgressClient();
  const filepath = recordingPathForEvent(eventId);
  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: process.env.RECORDING_S3_ACCESS_KEY!,
        secret: process.env.RECORDING_S3_SECRET_KEY!,
        bucket: process.env.RECORDING_S3_BUCKET!,
        region: process.env.RECORDING_S3_REGION ?? "auto",
        endpoint: process.env.RECORDING_S3_ENDPOINT!,
        forcePathStyle: true,
      }),
    },
  });

  const info = await client.startRoomCompositeEgress(liveKitRoomName(eventId), output, {
    layout: "speaker",
  });

  return info.egressId ?? null;
}

export async function stopLiveKitRecording(egressId: string | null | undefined) {
  if (!egressId || !isLiveKitConfigured()) return;
  const client = getEgressClient();
  try {
    await client.stopEgress(egressId);
  } catch {
    /* egress may already be complete */
  }
}

export function getLiveKitWebhookReceiver() {
  const config = getLiveKitConfig();
  const secret = process.env.LIVEKIT_WEBHOOK_SECRET;
  if (!config || !secret) return null;
  return new WebhookReceiver(config.apiKey, config.apiSecret);
}

export function recordingWebhookUrl() {
  return `${getAppUrl()}/api/webhooks/livekit`;
}
