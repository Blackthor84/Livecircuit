import type { Metadata } from "next";
import { MarketplaceHub } from "@/components/marketplace/marketplace-hub";
import { getMarketplaceHub } from "@/lib/data/marketplace";

export const metadata: Metadata = { title: "Creator Marketplace" };

export default async function MarketplacePage() {
  const report = await getMarketplaceHub();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <MarketplaceHub report={report} />
    </div>
  );
}
