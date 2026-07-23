import type { VenueTvProgram } from "@/lib/types/venue-tv";

/** Pick "now playing" from lineup using UTC hour bucket for stable rotation. */
export function pickNowPlayingIndex(lineup: VenueTvProgram[], at = new Date()) {
  if (!lineup.length) return 0;
  const bucket = at.getUTCHours() * 60 + at.getUTCMinutes();
  let total = 0;
  for (const item of lineup) {
    total += Math.max(60, item.durationSeconds);
  }
  if (total <= 0) return 0;
  const offset = bucket * 60 % total;
  let acc = 0;
  for (let i = 0; i < lineup.length; i++) {
    acc += Math.max(60, lineup[i].durationSeconds);
    if (offset < acc) return i;
  }
  return 0;
}

export function rotateUpNext(lineup: VenueTvProgram[], nowIndex: number, count = 5) {
  if (!lineup.length) return [];
  const out: VenueTvProgram[] = [];
  for (let i = 1; i <= Math.min(count, lineup.length - 1); i++) {
    out.push(lineup[(nowIndex + i) % lineup.length]);
  }
  return out;
}
