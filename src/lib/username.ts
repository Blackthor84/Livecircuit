import { ROUTES } from "@/lib/constants";

/** Static app routes that cannot be used as usernames. */
export const RESERVED_USERNAMES = new Set([
  "login",
  "signup",
  "register",
  "admin",
  "dashboard",
  "explore",
  "discover",
  "arenas",
  "search",
  "api",
  "settings",
  "profile",
  "artists",
  "artist",
  "about",
  "following",
  "notifications",
  "messages",
  "passport",
  "seasons",
  "festivals",
  "checkout",
  "vip",
  "coins",
  "marketplace",
  "local-business",
  "sponsor",
  "walk-of-fame",
  "awards",
  "world",
  "achievements",
  "gamification",
  "tours",
  "friends",
  "livecircuit",
  "collections",
  "forgot-password",
  "auth",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidUsernameFormat(username: string): boolean {
  return /^[a-z0-9_-]{3,32}$/.test(username);
}

export function isReservedUsername(username: string): boolean {
  const normalized = normalizeUsername(username);
  if (RESERVED_USERNAMES.has(normalized)) return true;
  return Object.values(ROUTES).some((route) => {
    if (typeof route !== "string") return false;
    const segment = route.replace(/^\//, "").split("/")[0];
    return segment === normalized;
  });
}

export function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username);
  if (!normalized) return "Username is required";
  if (!isValidUsernameFormat(normalized)) {
    return "Username must be 3–32 characters: lowercase letters, numbers, dashes, and underscores";
  }
  if (isReservedUsername(normalized)) return "This username is reserved";
  return null;
}

/** Canonical public profile URL for an artist. */
export function artistProfileUrl(username: string): string {
  return `/${normalizeUsername(username)}`;
}
