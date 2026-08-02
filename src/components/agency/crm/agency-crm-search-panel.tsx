"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchCrmAction } from "@/lib/actions/agency-crm";
import type { CrmSearchResult } from "@/lib/agency/crm-types";

const TYPE_LABELS: Record<CrmSearchResult["type"], string> = {
  booking: "Booking",
  contact: "Contact",
  task: "Task",
  contract: "Contract",
  payment: "Payment",
};

export function AgencyCrmSearchPanel({
  orgId,
  initialQuery = "",
}: {
  orgId: string;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<CrmSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  function runSearch(q: string) {
    startTransition(async () => {
      const r = await searchCrmAction(orgId, q);
      setResults(r);
      setSearched(true);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search artists, events, sponsors, contacts, bookings, tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={pending || !query.trim()}>Search</Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Search across bookings, contacts, tasks, contracts, and notes
      </p>

      {searched ? (
        results.length > 0 ? (
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <Link
                  href={r.href}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.title}</p>
                    {r.subtitle ? <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p> : null}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {TYPE_LABELS[r.type]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="glass-panel border-white/10">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </CardContent>
          </Card>
        )
      ) : null}
    </div>
  );
}
