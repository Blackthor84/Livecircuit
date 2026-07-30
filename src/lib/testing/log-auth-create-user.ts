import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl } from "@/lib/config/env";
import type { TestUserType } from "@/lib/testing/constants";

export type AuthCreateUserPayload = {
  email: string;
  email_confirm: boolean;
  user_metadata: {
    full_name: string;
    username: string;
    intended_role: TestUserType;
    is_test_account: boolean;
  };
  password: "[REDACTED]";
};

/** Log that the service-role admin client is in use (never log the full key). */
export function logServiceRoleClientVerification(_admin: SupabaseClient): void {
  const url = getSupabaseProjectUrl() ?? "unknown";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const serviceKeyConfigured = Boolean(serviceKey);
  const usingServiceRole =
    serviceKeyConfigured && (!anonKey || serviceKey !== anonKey);

  console.log("[Testing Center] auth.admin.createUser client verification:", {
    clientSource: "getSupabaseAdmin()",
    supabaseUrl: url,
    serviceRoleKeyConfigured: serviceKeyConfigured,
    serviceRoleKeyLength: serviceKey?.length ?? 0,
    serviceRoleKeyPrefix: serviceKey ? `${serviceKey.slice(0, 12)}...` : null,
    anonKeyConfigured: Boolean(anonKey),
    appearsToUseServiceRoleKey: usingServiceRole,
    authApi: "admin.auth.admin.createUser",
  });

  if (!serviceKeyConfigured) {
    console.error("[Testing Center] SUPABASE_SERVICE_ROLE_KEY is not configured — auth.admin.createUser requires service role");
  } else if (!usingServiceRole) {
    console.warn("[Testing Center] Service role key matches anon key — verify SUPABASE_SERVICE_ROLE_KEY is the service role JWT");
  }
}

export function buildAuthCreateUserLogPayload(input: {
  email: string;
  type: TestUserType;
  person: { displayName: string; username: string };
}): AuthCreateUserPayload {
  return {
    email: input.email,
    email_confirm: true,
    user_metadata: {
      full_name: input.person.displayName,
      username: input.person.username,
      intended_role: input.type,
      is_test_account: true,
    },
    password: "[REDACTED]",
  };
}

/** Log every own property (enumerable + non-enumerable) on an auth error. */
export function logAuthErrorComplete(label: string, error: unknown): void {
  console.error(`[Testing Center] ${label}`);

  if (error === undefined || error === null) {
    console.error("[Testing Center] error is null/undefined");
    return;
  }

  console.dir(error, { depth: null });

  if (typeof error === "object") {
    const record = error as Record<string | symbol, unknown>;
    const ownNames = Object.getOwnPropertyNames(error);
    const ownSymbols = Object.getOwnPropertySymbols(error);

    console.error("[Testing Center] Object.getOwnPropertyNames:", ownNames);
    console.error("[Testing Center] Object.getOwnPropertySymbols:", ownSymbols.map(String));

    for (const key of ownNames) {
      try {
        const value = record[key as string];
        if (typeof value === "object" && value !== null) {
          console.error(`[Testing Center] error.${key}:`);
          console.dir(value, { depth: null });
        } else {
          console.error(`[Testing Center] error.${key}:`, value);
        }
      } catch (readError) {
        console.error(`[Testing Center] error.${key}: [unreadable]`, readError);
      }
    }

    if ("__isAuthError" in record) {
      console.error("[Testing Center] error.__isAuthError:", record.__isAuthError);
    }

    if ("cause" in record && record.cause !== undefined) {
      console.error("[Testing Center] error.cause:");
      logAuthErrorComplete(`${label} (cause)`, record.cause);
    }
  } else {
    console.error("[Testing Center] error (primitive):", error);
  }
}
