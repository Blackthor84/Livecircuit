import type { Metadata } from "next";
import { NotificationsFeed } from "@/components/notifications/notifications-feed";
import { requireUser } from "@/lib/auth/guards";
import { getUserNotifications } from "@/lib/data/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser("/login?redirect=/notifications");
  const notifications = await getUserNotifications(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Notifications</h1>
      <div className="mt-8">
        <NotificationsFeed initial={notifications} />
      </div>
    </div>
  );
}
