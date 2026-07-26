const BLOCKED_PREFIXES = ["/login", "/register", "/auth/callback", "/forgot-password"];

/** Safe internal path for post-auth redirects. Supports `next` and legacy `redirect`. */
export function resolvePostAuthPath(
  input: string | null | undefined,
  fallback: string = "/"
): string {
  if (!input || !input.startsWith("/") || input.startsWith("//")) return fallback;
  const pathOnly = input.split("?")[0] ?? input;
  if (BLOCKED_PREFIXES.some((p) => pathOnly === p || pathOnly.startsWith(`${p}/`))) {
    return fallback;
  }
  return input;
}

export function readPostAuthParam(
  params: { next?: string | null; redirect?: string | null },
  fallback: string = "/"
): string {
  return resolvePostAuthPath(params.next ?? params.redirect, fallback);
}
