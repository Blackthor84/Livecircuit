"use client";

import Link from "next/link";
import { Briefcase, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { creatorCategoryLabel } from "@/lib/constants/creator-marketplace";
import { formatCents } from "@/lib/format";
import type { CreatorListing, MarketplaceHubReport } from "@/lib/types/marketplace";

function CreatorCard({ creator }: { creator: CreatorListing }) {
  return (
    <Link
      href={`/marketplace/creators/${creator.slug}`}
      className="glass-panel block rounded-xl p-4 hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{creator.displayName}</p>
          <p className="text-sm text-muted-foreground">{creator.headline}</p>
        </div>
        {creator.reviewCount > 0 ? (
          <span className="flex items-center gap-1 text-sm text-amber-400">
            <Star className="h-3.5 w-3.5 fill-current" />
            {creator.averageRating.toFixed(1)}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">{creatorCategoryLabel(creator.primaryCategory)}</Badge>
        <span className="text-xs text-muted-foreground">
          From {formatCents(creator.rateCents, creator.currency)}
        </span>
      </div>
    </Link>
  );
}

export function MarketplaceHub({ report }: { report: MarketplaceHubReport }) {
  return (
    <div className="space-y-10">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Briefcase className="h-6 w-6 text-primary" />
            Creator Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button href="/marketplace/studio" variant="outline">
            Creator studio
          </Button>
          <Button href="/marketplace/bookings" variant="outline">
            My bookings
          </Button>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-xl font-semibold">Browse by specialty</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {report.categories.map((cat) => (
            <Badge key={cat.value} variant="outline">
              {cat.label} ({cat.count})
            </Badge>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Featured creators</h2>
        {report.featured.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No listings yet.{" "}
            <Link href="/marketplace/studio" className="text-primary hover:underline">
              Open your creator studio
            </Link>{" "}
            to be the first.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.featured.map((c) => (
              <li key={c.userId}>
                <CreatorCard creator={c} />
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
              {(report.byCategory[cat.value] ?? []).slice(0, 6).map((c) => (
                <li key={c.userId}>
                  <CreatorCard creator={c} />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
