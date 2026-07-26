import { NextResponse } from "next/server";
import { checkUsernameAvailability } from "@/lib/actions/username";
import { validateUsername } from "@/lib/username";

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("u") ?? "";
  const formatError = validateUsername(username);
  if (formatError) {
    return NextResponse.json({ available: false, reason: formatError });
  }

  const result = await checkUsernameAvailability(username);
  return NextResponse.json(result);
}
