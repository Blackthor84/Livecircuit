import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { SponsorshipAdminHub } from "@/components/admin/sponsorship-admin-hub";
import { listBusinessContractsAdmin } from "@/lib/actions/sponsorship-admin";
import { getSponsorshipAnalyticsDashboard } from "@/lib/sponsorship/analytics";
import { listAllWaitingList } from "@/lib/sponsorship/waiting-list";
import { listAllAuctions, listAuctionBids } from "@/lib/sponsorship/auctions";
import { listPriceHistory } from "@/lib/sponsorship/price-history";
import { listSponsorOrganizationsAdmin } from "@/lib/data/sponsors";
import { listPipelineDeals } from "@/lib/sponsorship/pipeline";

export const metadata: Metadata = { title: "Sponsorship Management — Admin" };

export default async function AdminSponsorshipsPage() {
  const [contracts, analytics, waitingList, auctions, organizations, venues, priceHistory, pipelineDeals] =
    await Promise.all([
      listBusinessContractsAdmin(),
      getSponsorshipAnalyticsDashboard(),
      listAllWaitingList(),
      listAllAuctions(),
      listSponsorOrganizationsAdmin(),
      listVenuesForAdmin(),
      listPriceHistory(100),
      listPipelineDeals(),
    ]);

  const openAuctions = auctions.filter((a) => a.status === "open" || a.status === "closed");
  const auctionBids: Record<string, Awaited<ReturnType<typeof listAuctionBids>>> = {};
  await Promise.all(
    openAuctions.map(async (a) => {
      auctionBids[a.id] = await listAuctionBids(a.id);
    })
  );

  return (
    <>
      <AdminPageHeader
        title="Sponsorship Management"
        subtitle="Full contract lifecycle — exclusive inventory, waitlists, auctions, renewals, and revenue analytics."
      />
      <SponsorshipAdminHub
        contracts={contracts}
        analytics={analytics}
        waitingList={waitingList}
        auctions={openAuctions}
        auctionBids={auctionBids}
        priceHistory={priceHistory}
        pipelineDeals={pipelineDeals}
        organizations={organizations.map((o) => ({ id: o.id as string, name: o.name as string }))}
        venueOptions={venues.map((v) => ({
          id: v.id,
          default_name: v.default_name,
          region: v.region,
        }))}
      />
    </>
  );
}
