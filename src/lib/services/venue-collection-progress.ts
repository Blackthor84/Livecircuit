export function computeCompletionPercent(visited: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((visited / total) * 100));
}
