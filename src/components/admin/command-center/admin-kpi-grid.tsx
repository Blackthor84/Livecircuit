import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AdminKpi } from "@/lib/data/admin-command-center";
import { cn } from "@/lib/utils";

export function AdminKpiGrid({ kpis }: { kpis: AdminKpi[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="glass-panel border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">{kpi.label}</CardTitle>
              {kpi.status === "todo" ? <Badge variant="outline">TODO</Badge> : null}
              {kpi.status === "partial" ? <Badge variant="secondary">Partial</Badge> : null}
            </div>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-semibold tabular-nums", kpi.status === "todo" && "text-base")}>
              {kpi.value}
            </p>
            {kpi.hint ? <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
