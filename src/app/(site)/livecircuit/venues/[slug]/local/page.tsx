import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { localBusinessCategoryLabel } from "@/lib/constants/local-business";
import { getVenueLocalBusinessReport } from "@/lib/data/local-business";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const report = await getVenueLocalBusinessReport(slug);
  return { title: report ? `Local picks · ${report.venueName}` : "Local businesses" };
}

export default async function VenueLocalBusinessPage({ params }: Props) {
  const { slug } = await params;
  const report = await getVenueLocalBusinessReport(slug);
  if (!report) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href={`/livecircuit/venues/${slug}`} className="text-sm text-primary hover:underline">
        ← {report.venueName}
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Local businesses near {report.venueName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Eat, stay, and explore before or after the show.</p>

      {report.businesses.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          No linked businesses yet.{" "}
          <Link href="/local-business/dashboard" className="text-primary hover:underline">
            List your business
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {report.businesses.map((b) => (
            <li key={b.id}>
              <Link
                href={`/local-business/${b.slug}?venue=${slug}`}
                className="glass-panel block rounded-xl p-4 hover:border-primary/30"
              >
                <p className="font-semibold">{b.name}</p>
                <p className="text-sm text-muted-foreground">{localBusinessCategoryLabel(b.category)}</p>
                <p className="mt-2 line-clamp-2 text-sm">{b.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
