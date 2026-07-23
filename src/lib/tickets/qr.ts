import { randomBytes } from "crypto";

/** Opaque check-in payload stored on tickets.qr_code (verified server-side). */
export function generateTicketQrPayload(ticketId: string) {
  const nonce = randomBytes(16).toString("base64url");
  return `lc:${ticketId}:${nonce}`;
}
