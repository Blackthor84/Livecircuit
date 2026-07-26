import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArtistMerchManager } from "@/components/artist/artist-merch-manager";
import { requireRoles } from "@/lib/auth/guards";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { getArtistForUser, getSessionUser } from "@/lib/auth/session";
import { getArtistProductsForManage } from "@/lib/data/messaging";

export const metadata: Metadata = { title: "Manage merch" };

export default async function ArtistMerchPage() {
  await requireRoles(["artist", ...ADMIN_ROLES], "/register?role=artist");

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const artist = await getArtistForUser(user.id);
  if (!artist) redirect("/artist/settings");

  const products = await getArtistProductsForManage(artist.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Merch</h1>
      <p className="mt-2 text-muted-foreground">
        Products appear on your public merch page and in checkout.
      </p>
      <div className="mt-8">
        <ArtistMerchManager
          products={products as {
            id: string;
            name: string;
            description: string | null;
            price_cents: number;
            product_type: string;
            is_digital: boolean;
            is_vip_exclusive: boolean;
            inventory_count: number | null;
            active: boolean;
          }[]}
        />
      </div>
    </div>
  );
}
