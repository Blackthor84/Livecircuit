"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications";
import type { UserNotification } from "@/types/notifications";
import { cn } from "@/lib/utils";

export function NotificationsFeed({ initial }: { initial: UserNotification[] }) {
  async function markRead(id: string) {
    const result = await markNotificationReadAction(id);
    if (!result.ok) toast.error(result.error);
  }

  async function markAll() {
    const result = await markAllNotificationsReadAction();
    if (!result.ok) toast.error(result.error);
    else toast.success("All marked read");
  }

  if (!initial.length) {
    return (
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>All caught up</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Live alerts, tour announcements, merch drops, and ticket reminders appear here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => void markAll()}>
          Mark all read
        </Button>
      </div>
      <ul className="space-y-2">
        {initial.map((n) => (
          <li key={n.id}>
            <Card
              className={cn(
                "glass-panel border-white/10 transition hover:border-primary/30",
                !n.read_at && "border-primary/20 bg-primary/5"
              )}
            >
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{n.title}</p>
                  {n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {n.link ? (
                    <Button size="sm" variant="secondary" href={n.link}>
                      Open
                    </Button>
                  ) : null}
                  {!n.read_at ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void markRead(n.id)}>
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/messages" className="text-primary hover:underline">
          View messages
        </Link>
      </p>
    </div>
  );
}
