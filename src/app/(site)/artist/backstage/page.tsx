import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BackstagePassArtistHub } from "@/components/backstage/backstage-pass-artist-hub";
import { requireRoles } from "@/lib/auth/guards";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { getBackstageArtistHub } from "@/lib/data/backstage-pass";

export const metadata: Metadata = {
  title: "Backstage Pass · Artist",
  description: "Manage monthly memberships, perks, and subscriber analytics.",
};

export default async function ArtistBackstageManagePage() {
  await requireRoles(["artist", ...ADMIN_ROLES], "/register?role=artist");
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/artist/backstage");

  const hub = await getBackstageArtistHub(user.id);
  if (!hub) redirect("/artist/settings");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Backstage Pass</h1>
      <p className="mt-2 text-muted-foreground">
        Monthly memberships with recurring Stripe billing, member perks, and subscriber analytics.
      </p>
      <div className="mt-10">
        <BackstagePassArtistHub hub={hub} />
      </div>
    </div>
  );
}
