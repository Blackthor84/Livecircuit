export type CountdownTarget = "voting" | "ceremony";

export function resolveAwardsCountdown(
  status: string,
  votingEndsAt: string,
  ceremonyAt: string,
  now = new Date()
): { target: CountdownTarget; targetAt: string; label: string } | null {
  const votingEnd = new Date(votingEndsAt);
  const ceremony = new Date(ceremonyAt);

  if (status === "voting" && votingEnd.getTime() > now.getTime()) {
    return { target: "voting", targetAt: votingEndsAt, label: "Voting closes in" };
  }
  if ((status === "voting" || status === "live") && ceremony.getTime() > now.getTime()) {
    return { target: "ceremony", targetAt: ceremonyAt, label: "Live show starts in" };
  }
  if (status === "nomination" && ceremony.getTime() > now.getTime()) {
    return { target: "ceremony", targetAt: ceremonyAt, label: "Ceremony in" };
  }
  return null;
}

export function countdownParts(targetAt: string, now = new Date()) {
  const ms = Math.max(0, new Date(targetAt).getTime() - now.getTime());
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalMs: ms };
}

export function canCastAwardVote(status: string, votingEndsAt: string, now = new Date()): boolean {
  if (status !== "voting") return false;
  return new Date(votingEndsAt).getTime() > now.getTime();
}
