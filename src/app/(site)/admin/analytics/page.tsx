import type { Metadata } from "next";
import { AdminCommandShell } from "@/components/admin/command-center/admin-command-shell";
import { AdminSegmentationPanel } from "@/components/admin/command-center/admin-segmentation-panel";
import { AdminTodoPanel } from "@/components/admin/command-center/admin-todo-panel";
import { AdminTrendCharts } from "@/components/admin/command-center/admin-trend-charts";
import { listAdminArtists, listAdminGenres } from "@/lib/data/admin-entities";
import { getAdminPlatformOverview } from "@/lib/data/admin-command-center";

export const metadata: Metadata = { title: "Analytics — Admin" };

export default async function AdminAnalyticsPage() {
  const [overview, artists, genres] = await Promise.all([
    getAdminPlatformOverview(),
    listAdminArtists(200),
    listAdminGenres(),
  ]);

  const artistOptions = artists.map((a) => ({ id: a.id, stage_name: a.stage_name, slug: a.slug }));
  const genreOptions = genres.map((g) => ({ id: g.id, name: g.name, slug: g.slug }));

  return (
    <AdminCommandShell
      title="Analytics"
      subtitle="Historical trends, audience overlap, retention metrics, and segmentation tools."
    >
      <div className="space-y-8">
        <AdminTrendCharts
          signupTrend={overview.signupTrend}
          revenueTrend={overview.revenueTrend}
          engagementTrend={overview.engagementTrend}
        />

        <div>
          <h2 className="mb-4 text-xl font-semibold">Audience segmentation</h2>
          <AdminSegmentationPanel artists={artistOptions} genres={genreOptions} />
        </div>

        <AdminTodoPanel
          title="Analytics pipeline TODOs"
          items={[
            ...overview.todos,
            "Audience overlap heatmap (artist × artist)",
            "Geographic fan distribution map from profile country data",
            "Cohort retention curves (D1/D7/D30)",
          ]}
        />
      </div>
    </AdminCommandShell>
  );
}
