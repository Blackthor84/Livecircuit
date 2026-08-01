import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AgencyGenerationMode } from "@/lib/testing/constants";
import { logTestStep, type TestCreationLog } from "@/lib/testing/step-errors";
import {
  extractEmailSuffix,
  generateTestEmail,
  generateTestUsername,
  randomEmailFragment,
  type GenerateTestEmailOptions,
} from "@/lib/testing/test-email";

export async function findAuthUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const normalized = email.toLowerCase();
  let page = 1;

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match;

    if (data.users.length < 1000) break;
    page += 1;
  }

  return null;
}

export type AllocateTestEmailInput = {
  role: string;
  mode: AgencyGenerationMode;
  log: TestCreationLog;
  stableKey?: string;
  organizationName?: string;
  organizationSlug?: string;
  maxAttempts?: number;
};

export type AllocatedTestEmail = {
  email: string;
  username: string;
  reused: boolean;
  existingUserId?: string;
};

function buildEmailOptions(input: AllocateTestEmailInput, uniqueToken?: string): GenerateTestEmailOptions {
  return {
    mode: input.mode === "repair" ? "stable" : "unique",
    stableKey: input.stableKey,
    uniqueToken,
    organizationName: input.organizationName,
    organizationSlug: input.organizationSlug,
  };
}

/**
 * Allocates a test email with collision protection.
 * Repair mode reuses existing Auth users; fresh mode always generates new unique addresses.
 */
export async function allocateTestEmail(
  admin: SupabaseClient,
  input: AllocateTestEmailInput
): Promise<AllocatedTestEmail> {
  const maxAttempts = input.maxAttempts ?? 12;

  if (input.mode === "repair") {
    const email = generateTestEmail(input.role, buildEmailOptions(input));
    const suffix = extractEmailSuffix(email);
    const username = generateTestUsername(input.role, suffix);

    logTestStep(input.log, `Checking existing account for ${input.role} (${email})...`);
    const existing = await findAuthUserByEmail(admin, email);

    if (existing) {
      logTestStep(input.log, "✓ Existing Auth user found. Reusing account.");
      return { email, username, reused: true, existingUserId: existing.id };
    }

    logTestStep(input.log, `Generating stable test email: ${email}`);
    logTestStep(input.log, "✓ Email available");
    return { email, username, reused: false };
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const uniqueToken = randomEmailFragment(3);
    const email = generateTestEmail(input.role, buildEmailOptions(input, uniqueToken));
    const suffix = extractEmailSuffix(email);
    const username = generateTestUsername(input.role, suffix);

    logTestStep(input.log, `Generating unique email for ${input.role}: ${email}`);
    const existing = await findAuthUserByEmail(admin, email);

    if (!existing) {
      logTestStep(input.log, "✓ Email available");
      return { email, username, reused: false };
    }

    logTestStep(input.log, "Email collision detected — regenerating...");
  }

  throw new Error(`Failed to allocate unique test email for ${input.role} after ${maxAttempts} attempts`);
}

function isEmailExistsError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: string; message?: string; status?: number };
  return (
    record.code === "email_exists" ||
    record.status === 422 ||
    Boolean(record.message?.toLowerCase().includes("already been registered"))
  );
}

export type ResolveTestAuthUserInput = {
  mode: AgencyGenerationMode;
  roleLabel: string;
  displayName: string;
  password: string;
  userMetadata: Record<string, unknown>;
  log: TestCreationLog;
  stableKey?: string;
  organizationName?: string;
  organizationSlug?: string;
};

export type ResolvedTestAuthUser = {
  userId: string;
  email: string;
  username: string;
  reused: boolean;
};

export async function resolveOrCreateTestAuthUser(
  admin: SupabaseClient,
  input: ResolveTestAuthUserInput
): Promise<ResolvedTestAuthUser> {
  const maxCreateAttempts = input.mode === "fresh" ? 12 : 1;

  for (let createAttempt = 0; createAttempt < maxCreateAttempts; createAttempt++) {
    const allocated = await allocateTestEmail(admin, {
      role: input.roleLabel,
      mode: input.mode,
      log: input.log,
      stableKey: input.stableKey,
      organizationName: input.organizationName,
      organizationSlug: input.organizationSlug,
    });

    if (allocated.reused && allocated.existingUserId) {
      logTestStep(input.log, "Repairing membership context...");
      logTestStep(input.log, "✓ Success");
      return {
        userId: allocated.existingUserId,
        email: allocated.email,
        username: allocated.username,
        reused: true,
      };
    }

    logTestStep(input.log, `Creating Auth user (${input.roleLabel})...`);

    const { data, error } = await admin.auth.admin.createUser({
      email: allocated.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        ...input.userMetadata,
        username: allocated.username,
      },
    });

    if (isEmailExistsError(error)) {
      if (input.mode === "repair") {
        logTestStep(input.log, "Existing user found during create. Reusing account.");
        const existing = await findAuthUserByEmail(admin, allocated.email);
        if (!existing) throw error;
        logTestStep(input.log, "✓ Success");
        return {
          userId: existing.id,
          email: existing.email ?? allocated.email,
          username: allocated.username,
          reused: true,
        };
      }

      logTestStep(input.log, "Email collision during create — regenerating...");
      continue;
    }

    if (error || !data.user) {
      throw error ?? new Error("auth.admin.createUser failed");
    }

    logTestStep(input.log, "✓ Auth user created successfully.");
    return {
      userId: data.user.id,
      email: allocated.email,
      username: allocated.username,
      reused: false,
    };
  }

  throw new Error(`Failed to create Auth user for ${input.roleLabel} after ${maxCreateAttempts} attempts`);
}

export function stableAgencyRoleSeed(scenario: string, role: string, slot = 0) {
  const key = `${scenario}:${role}:${slot}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % 1_000_000;
}
