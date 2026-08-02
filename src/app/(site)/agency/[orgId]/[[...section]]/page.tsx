import { redirect } from "next/navigation";
import { agencyPortalPath } from "@/lib/agency/sections";

type Props = { params: Promise<{ orgId: string; section?: string[] }> };

const LEGACY_SECTIONS = [
  "artists",
  "book-roster",
  "calendar",
  "revenue",
  "finance",
  "marketing",
  "operations",
  "intelligence",
  "festivals",
  "assets",
  "analytics",
  "team",
  "communications",
  "sponsorship",
  "profile",
] as const;

/** Legacy /agency/{uuid} URLs redirect to session-based portal routes. */
export default async function LegacyAgencyUuidRedirect({ params }: Props) {
  const { section } = await params;
  const segment = section?.[0];
  if (segment && LEGACY_SECTIONS.includes(segment as (typeof LEGACY_SECTIONS)[number])) {
    redirect(agencyPortalPath(segment));
  }
  redirect(agencyPortalPath("dashboard"));
}
