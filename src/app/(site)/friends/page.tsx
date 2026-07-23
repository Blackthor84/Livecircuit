import type { Metadata } from "next";
import { FriendsHubDashboard } from "@/components/friends/friends-hub-dashboard";
import { requireUserProfile } from "@/lib/auth/guards";
import { getFriendsHubReport } from "@/lib/data/friends";

export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage() {
  const { user } = await requireUserProfile();
  const report = await getFriendsHubReport(user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="sr-only">Friends</h1>
      <FriendsHubDashboard report={report} />
    </div>
  );
}
