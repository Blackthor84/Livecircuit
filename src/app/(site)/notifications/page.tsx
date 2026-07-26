import type { Metadata } from "next";
import { NotificationsFeed } from "@/components/notifications/notifications-feed";
import { requireUser } from "@/lib/auth/guards";
import { getUserNotifications } from "@/lib/data/notifications";
import { getViewerFeatureAccess } from "@/lib/features/guard";
export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser("/login?redirect=/notifications");
  const features = await getViewerFeatureAccess();
  const notifications = (await getUserNotifications(user.id)).map((n) => ({
    ...n,
    link: n.link && features.canAccessPath(n.link.split("?")[0] ?? n.link) ? n.link : null,
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Notifications</h1>
      <div className="mt-8">
        <NotificationsFeed
          userId={user.id}
          initial={notifications}
          showMessagesLink={features.canAccess("direct_messages")}
        />
      </div>
    </div>
  );
}
