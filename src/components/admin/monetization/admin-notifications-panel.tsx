"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  archiveAdminNotificationAction,
  markAdminNotificationReadAction,
} from "@/lib/actions/monetization-admin";
import { cn } from "@/lib/utils";

export type AdminNotificationRow = {
  id: string;
  category: string;
  title: string;
  message: string;
  severity: string;
  entityKey: string | null;
  isRead: boolean;
  isArchived: boolean;
  priority: string;
  createdAt: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  error: "border-red-500/30 bg-red-500/10",
  warning: "border-amber-500/30 bg-amber-500/10",
  success: "border-emerald-500/30 bg-emerald-500/10",
  info: "border-white/10 bg-white/[0.02]",
};

export function AdminNotificationsPanel({
  notifications,
  stats,
}: {
  notifications: AdminNotificationRow[];
  stats: { unread: number; urgent: number };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline">{stats.unread} unread</Badge>
        {stats.urgent > 0 ? <Badge className="bg-red-500/20 text-red-400">{stats.urgent} urgent</Badge> : null}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card className="glass-panel border-white/10">
            <CardContent className="py-12 text-center text-muted-foreground">No notifications</CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              className={cn("glass-panel border", SEVERITY_STYLES[n.severity] ?? SEVERITY_STYLES.info, !n.isRead && "ring-1 ring-primary/20")}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{n.title}</CardTitle>
                    {!n.isRead ? <Badge variant="secondary">New</Badge> : null}
                    {n.priority === "urgent" ? <Badge className="bg-red-500/20 text-red-400">Urgent</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.category} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!n.isRead ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        startTransition(() => {
                          void markAdminNotificationReadAction({ id: n.id });
                        })
                      }
                    >
                      Mark read
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(() => {
                        void archiveAdminNotificationAction({ id: n.id });
                      })
                    }
                  >
                    Archive
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                {n.entityKey ? <p className="mt-2 font-mono text-xs text-muted-foreground">{n.entityKey}</p> : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
