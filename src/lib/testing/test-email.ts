import { randomBytes } from "crypto";

/** Dedicated domain for all Testing Center generated accounts. */
export const TEST_EMAIL_DOMAIN = "test.livecircuit";

export type TestEmailRole =
  | "owner"
  | "admin"
  | "booking_manager"
  | "artist_manager"
  | "marketing"
  | "finance"
  | "assistant"
  | "read_only"
  | "agency"
  | "fan"
  | "artist"
  | "sponsor"
  | "venue"
  | "admin_user";

export type TestEmailGenerationMode = "stable" | "unique";

export type GenerateTestEmailOptions = {
  /** Repair mode — deterministic suffix from stableKey. */
  stableKey?: string;
  /** Fresh mode — optional pre-generated unique token fragment. */
  uniqueToken?: string;
  mode?: TestEmailGenerationMode;
  organizationName?: string;
  organizationSlug?: string;
};

function hashStableKey(key: string, length = 6): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").slice(0, length);
}

export function randomEmailFragment(bytes = 3): string {
  return randomBytes(bytes).toString("hex");
}

export function formatEmailTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
}

export function normalizeTestEmailRole(role: string): string {
  return role.replace(/[^a-z0-9_+-]/gi, "_").toLowerCase();
}

function buildStableSuffix(options: GenerateTestEmailOptions): string {
  const parts = [options.organizationSlug, options.stableKey].filter(Boolean);
  const key = parts.length ? parts.join(":") : "test";
  return hashStableKey(key);
}

function buildUniqueSuffix(uniqueToken?: string): string {
  const fragment = uniqueToken ?? randomEmailFragment(3);
  return `${formatEmailTimestamp()}-${fragment}`;
}

/**
 * Centralized test email generator for all Testing Center scenarios.
 *
 * @example generateTestEmail("owner", { mode: "unique" })
 *          → owner+20260801T001523-4f8c9a@test.livecircuit
 * @example generateTestEmail("booking_manager", { mode: "stable", stableKey: "boutique_agency:booking_manager:0" })
 *          → booking_manager+71ef20@test.livecircuit
 */
export function generateTestEmail(role: string, options: GenerateTestEmailOptions = {}): string {
  const safeRole = normalizeTestEmailRole(role);
  const mode = options.mode ?? (options.stableKey ? "stable" : "unique");
  const suffix = mode === "stable" ? buildStableSuffix(options) : buildUniqueSuffix(options.uniqueToken);
  return `${safeRole}+${suffix}@${TEST_EMAIL_DOMAIN}`;
}

export function generateTestUsername(role: string, suffix: string): string {
  const safeRole = normalizeTestEmailRole(role).replace(/[^a-z0-9]/g, "").slice(0, 12);
  const tail = suffix.replace(/[^a-z0-9]/gi, "").slice(-8) || randomEmailFragment(2);
  return `${safeRole}${tail}`.slice(0, 24);
}

export function extractEmailSuffix(email: string): string {
  const local = email.split("@")[0] ?? "";
  const plusIndex = local.indexOf("+");
  return plusIndex >= 0 ? local.slice(plusIndex + 1) : local;
}

export function isTestEmailAddress(email: string): boolean {
  return email.toLowerCase().endsWith(`@${TEST_EMAIL_DOMAIN}`);
}
