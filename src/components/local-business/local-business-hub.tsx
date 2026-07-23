"use client";

import Link from "next/link";
import { MapPin, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localBusinessCategoryLabel } from "@/lib/constants/local-business";
import type { LocalBusinessHubReport } from "@/lib/types/local-business";

function BusinessCard({ business }: { business: LocalBusinessHubReport["featured"][0] }) {
  return (
    <Link href={`/local-business/${business.slug}`} className="glass-panel block rounded-xl p-4 hover:border-primary/30">
      <p className="font-semibold">{business.name}</p>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{business.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">{localBusinessCategoryLabel(business.category)}</Badge>
        {business.city ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {business.city}
          </span>
        ) : null}
        {business.isFeatured ? <Badge>Featured</Badge> : null}
      </div>
    </Link>
  );
}

export function LocalBusinessHub({ report }: { report: LocalBusinessHubReport }) {
  return (
    <div className="space-y-10">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Store className="h-6 w-6 text-primary" />
            Local business marketplace
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button href="/local-business/dashboard" variant="outline">
            Business dashboard
          </Button>
          <p className="text-sm text-muted-foreground">
            Restaurants, hotels, parking, and attractions near LiveCircuit venues.
          </p>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-xl font-semibold">Featured near venues</h2>
        {report.featured.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">List your business from the dashboard.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.featured.map((b) => (
              <li key={b.id}>
                <BusinessCard business={b} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {report.categories
        .filter((c) => c.count > 0)
        .map((cat) => (
          <section key={cat.value}>
            <h3 className="text-lg font-semibold">{cat.label}</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {(report.byCategory[cat.value] ?? []).slice(0, 6).map((b) => (
                <li key={b.id}>
                  <BusinessCard business={b} />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
