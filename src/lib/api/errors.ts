import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers });
}

export function handleRouteError(error: unknown, context?: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  console.error(JSON.stringify({ level: "error", scope: "api", context: context ?? "route", message }));
  return NextResponse.json({ error: message }, { status: 500 });
}
