import type { PostgrestError } from "@supabase/supabase-js";

export type ParsedDatabaseError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  stack?: string;
};

function stringifyCode(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function serializeRecord(record: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "object") {
      try {
        parts.push(`${key}=${JSON.stringify(value)}`);
      } catch {
        parts.push(`${key}=[object]`);
      }
    } else {
      parts.push(`${key}=${String(value)}`);
    }
  }
  return parts.length ? parts.join("; ") : "Unknown error (empty error object)";
}

/** Extract structured fields from Supabase Auth, PostgREST, or generic errors. */
export function parseSupabaseError(error: unknown): ParsedDatabaseError {
  if (!error) {
    return { message: "Unknown error" };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (error instanceof Error) {
    const cause = "cause" in error ? (error as Error & { cause?: unknown }).cause : undefined;
    const parsedCause = cause ? parseSupabaseError(cause) : null;
    const base: ParsedDatabaseError = {
      message: readString(error.message) ?? parsedCause?.message ?? error.name ?? "Error",
      stack: error.stack,
      code: parsedCause?.code,
      details: parsedCause?.details,
      hint: parsedCause?.hint,
    };

    const record = error as Error & Record<string, unknown>;
    base.code ??= stringifyCode(record.code ?? record.status ?? record.error_code);
    base.details ??= readString(record.details ?? record.detail);
    base.hint ??= readString(record.hint);

    if (base.message === "Error" || base.message === "{}") {
      base.message = serializeRecord(record as unknown as Record<string, unknown>);
    }

    return base;
  }

  if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    const message =
      readString(e.message) ??
      readString(e.msg) ??
      readString(e.error_description) ??
      readString(e.error) ??
      readString(e.error_message) ??
      serializeRecord(e);

    return {
      message: message === "{}" ? serializeRecord(e) : message,
      code: stringifyCode(e.code ?? e.error_code ?? e.status),
      details: readString(e.details ?? e.detail),
      hint: readString(e.hint),
      stack: readString(e.stack),
    };
  }

  return { message: String(error) };
}

export function parsePostgrestError(error: PostgrestError | null | undefined): ParsedDatabaseError {
  if (!error) return { message: "Database operation failed" };
  return {
    message: error.message || "Database operation failed",
    code: stringifyCode(error.code),
    details: readString(error.details),
    hint: readString(error.hint),
  };
}
