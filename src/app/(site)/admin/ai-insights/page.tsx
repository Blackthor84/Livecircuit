import type { Metadata } from "next";
import { AdminCommandShell } from "@/components/admin/command-center/admin-command-shell";
import { AdminTodoPanel } from "@/components/admin/command-center/admin-todo-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "AI Insights — Admin" };

const PLACEHOLDER_INSIGHTS = [
  {
    title: "Trend detection",
    body: "Automated detection of rising artists, genre momentum, and anomalous engagement spikes.",
    status: "Pipeline not connected",
  },
  {
    title: "Churn risk scoring",
    body: "Identify fans at risk of churn based on watch frequency, ticket purchase cadence, and chat activity.",
    status: "Requires watch-time telemetry",
  },
  {
    title: "Programming recommendations",
    body: "Suggest optimal show times, co-headliners, and genre pairings from cross-viewing patterns.",
    status: "Requires segmentation ETL",
  },
  {
    title: "Revenue forecasting",
    body: "Project ticket and tip revenue from historical show performance and follower growth.",
    status: "Requires revenue rollup job",
  },
];

export default async function AdminAiInsightsPage() {
  return (
    <AdminCommandShell
      title="AI Insights"
      subtitle="Executive intelligence layer — placeholders until analytics pipelines feed the model."
    >
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2">
          {PLACEHOLDER_INSIGHTS.map((insight) => (
            <Card key={insight.title} className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="text-base">{insight.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{insight.body}</p>
                <p className="mt-3 text-xs font-medium text-amber-300/90">{insight.status}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <AdminTodoPanel
          title="AI insights TODOs"
          items={[
            "Connect aggregated metrics warehouse for LLM context",
            "Define insight refresh schedule (daily / weekly)",
            "Add human review workflow before surfacing recommendations",
            "Wire observer-only QA channel for insight validation",
          ]}
        />
      </div>
    </AdminCommandShell>
  );
}
