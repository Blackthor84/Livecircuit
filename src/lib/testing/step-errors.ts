import type { PostgrestError } from "@supabase/supabase-js";
import { parsePostgrestError, parseSupabaseError, type ParsedDatabaseError } from "@/lib/testing/parse-error";

export type TestCreationLog = {
  steps: string[];
};

export class TestCreationStepError extends Error {
  readonly success = false as const;
  readonly failedStep: string;
  readonly databaseError: string;
  readonly steps: string[];
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;

  constructor(failedStep: string, parsed: ParsedDatabaseError, steps: string[], cause?: unknown) {
    super(`Failed at ${failedStep}: ${parsed.message}`);
    this.name = "TestCreationStepError";
    this.failedStep = failedStep;
    this.databaseError = parsed.message;
    this.steps = steps;
    this.code = parsed.code;
    this.details = parsed.details;
    this.hint = parsed.hint;
    if (parsed.stack) {
      this.stack = parsed.stack;
    }
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }

  toResult() {
    return {
      ok: false as const,
      success: false as const,
      failedStep: this.failedStep,
      message: this.databaseError,
      databaseError: this.databaseError,
      code: this.code,
      details: this.details,
      hint: this.hint,
      stack: this.stack ?? "",
      steps: this.steps,
      error: `${this.failedStep}: ${this.databaseError}`,
    };
  }
}

export function createTestCreationLog(): TestCreationLog {
  return { steps: [] };
}

export function logTestStep(log: TestCreationLog, message: string) {
  log.steps.push(message);
  console.log(`[Testing Center] ${message}`);
}

export function throwDbError(
  log: TestCreationLog,
  failedStep: string,
  error: PostgrestError | null | undefined,
  fallbackMessage = "Database operation failed"
): never {
  const parsed = parsePostgrestError(error);
  if (!error?.message) {
    parsed.message = fallbackMessage;
  }
  throw new TestCreationStepError(failedStep, parsed, log.steps, error ?? undefined);
}

export function throwParsedError(
  log: TestCreationLog,
  failedStep: string,
  error: unknown,
  fallbackMessage = "Operation failed"
): never {
  const parsed = parseSupabaseError(error);
  if (parsed.message === "Unknown error" || parsed.message === "Unknown error (empty error object)") {
    parsed.message = fallbackMessage;
  }
  console.error(`[Testing Center] ${failedStep}`, error);
  throw new TestCreationStepError(failedStep, parsed, log.steps, error instanceof Error ? error : undefined);
}

export function requireDbResult<T>(
  log: TestCreationLog,
  failedStep: string,
  result: { data: T | null; error: PostgrestError | null },
  options?: { requireRows?: boolean; emptyMessage?: string }
): NonNullable<T> {
  if (result.error) {
    throwDbError(log, failedStep, result.error);
  }
  if (options?.requireRows && (result.data === null || (Array.isArray(result.data) && result.data.length === 0))) {
    throw new TestCreationStepError(
      failedStep,
      { message: options.emptyMessage ?? "Expected database rows but none were returned" },
      log.steps
    );
  }
  return result.data as NonNullable<T>;
}
