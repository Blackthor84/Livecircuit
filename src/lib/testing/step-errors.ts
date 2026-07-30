import type { PostgrestError } from "@supabase/supabase-js";

export type TestCreationLog = {
  steps: string[];
};

export class TestCreationStepError extends Error {
  readonly success = false as const;
  readonly failedStep: string;
  readonly databaseError: string;
  readonly steps: string[];

  constructor(failedStep: string, databaseError: string, steps: string[], cause?: unknown) {
    super(`Failed at ${failedStep}: ${databaseError}`);
    this.name = "TestCreationStepError";
    this.failedStep = failedStep;
    this.databaseError = databaseError;
    this.steps = steps;
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }

  toResult() {
    return {
      ok: false as const,
      success: false as const,
      failedStep: this.failedStep,
      databaseError: this.databaseError,
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
  throw new TestCreationStepError(
    failedStep,
    error?.message ?? fallbackMessage,
    log.steps,
    error ?? undefined
  );
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
      options.emptyMessage ?? "Expected database rows but none were returned",
      log.steps
    );
  }
  return result.data as NonNullable<T>;
}
