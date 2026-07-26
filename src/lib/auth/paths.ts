/** Routes that require a signed-in user (middleware redirect). Role checks stay in RSC/API. */

const AUTH_REQUIRED_PREFIXES = [
  "/dashboard",
  "/following",
  "/settings",
  "/checkout",
  "/notifications",
  "/messages",
  "/artist/",
  "/admin",
  "/sponsor/dashboard",
] as const;

const AUTH_REQUIRED_EXACT = [] as const;

export function isAuthRequiredPath(pathname: string): boolean {
  if (AUTH_REQUIRED_EXACT.includes(pathname as (typeof AUTH_REQUIRED_EXACT)[number])) {
    return true;
  }
  return AUTH_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix)
  );
}

export function loginRedirectUrl(pathname: string, origin: string): URL {
  const url = new URL("/login", origin);
  url.searchParams.set("next", pathname);
  return url;
}
