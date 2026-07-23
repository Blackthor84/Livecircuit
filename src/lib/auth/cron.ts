import { timingSafeEqual } from "crypto";

export function isCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 16);
}

export function verifyCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    return safeEqual(token, secret);
  }

  const header = request.headers.get("x-cron-secret");
  if (header) return safeEqual(header, secret);

  return false;
}

function safeEqual(a: string, b: string) {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
