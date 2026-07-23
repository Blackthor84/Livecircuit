import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackstagePassFanView } from "@/components/backstage/backstage-pass-fan-view";
import { getSessionUser } from "@/lib/auth/session";
import { getBackstagePassPage } from "@/lib/data/backstage-pass";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getBackstagePassPage(slug, null);
  return { title: page ? `${page.artistName} Backstage Pass` : "Backstage Pass" };
}

export default async function ArtistBackstagePage({ params }: Props) {
  const { slug } = await params;
  const user = await getSessionUser();
  const page = await getBackstagePassPage(slug, user?.id ?? null);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href={`/artists/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← {page.artistName}
      </Link>
      <div className="mt-8">
        <BackstagePassFanView page={page} />
      </div>
    </div>
  );
}
