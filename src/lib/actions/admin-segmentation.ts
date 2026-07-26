"use server";

import type { SegmentationResult } from "@/lib/data/admin-segmentation";
import {
  segmentCrossGenreViewers,
  segmentFansAcrossArtists,
  segmentFansByGenre,
  segmentRepeatViewers,
  segmentVipConversion,
} from "@/lib/data/admin-segmentation";
import { requireRole } from "@/lib/auth/session";

async function guardAdmin() {
  const profile = await requireRole(["admin"]);
  if (!profile) throw new Error("Admin access required");
}

export async function runCrossArtistSegmentAction(artistIds: string[]): Promise<SegmentationResult> {
  await guardAdmin();
  return segmentFansAcrossArtists(artistIds);
}

export async function runGenreSegmentAction(genreId: string): Promise<SegmentationResult> {
  await guardAdmin();
  return segmentFansByGenre(genreId);
}

export async function runRepeatViewerSegmentAction(): Promise<SegmentationResult> {
  await guardAdmin();
  return segmentRepeatViewers();
}

export async function runVipConversionSegmentAction(): Promise<SegmentationResult> {
  await guardAdmin();
  return segmentVipConversion();
}

export async function runCrossGenreSegmentAction(): Promise<SegmentationResult> {
  await guardAdmin();
  return segmentCrossGenreViewers();
}
