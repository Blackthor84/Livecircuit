"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type MonitoringStats = {
  webhookFailures: number;
  pricingErrors: number;
  failedPayments: number;
  couponFailures: number;
  unreadNotifications: number;
  ruleConflicts: number;
};

export function AdminMonitoringPanel({ stats }: { stats: MonitoringStats }) {
  const tiles = [
    { label: "Webhook Failures", value: stats.webhookFailures, severity: stats.webhookFailures > 0 ? "error" : "ok" },
    { label: "Pricing Errors", value: stats.pricingErrors, severity: stats.pricingErrors > 0 ? "warning" : "ok" },
    { label: "Failed Payments", value: stats.failedPayments, severity: stats.failedPayments > 0 ? "error" : "ok" },
    { label: "Coupon Failures", value: stats.couponFailures, severity: stats.couponFailures > 0 ? "warning" : "ok" },
    { label: "Unread Alerts", value: stats.unreadNotifications, severity: stats.unreadNotifications > 0 ? "warning" : "ok" },
    { label: "Rule Conflicts", value: stats.ruleConflicts, severity: stats.ruleConflicts > 0 ? "warning" : "ok" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label} className="glass-panel border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{tile.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-3xl font-bold tabular-nums">{tile.value}</span>
            <Badge variant={tile.severity === "ok" ? "outline" : "destructive"}>
              {tile.severity === "ok" ? "Healthy" : "Attention"}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
