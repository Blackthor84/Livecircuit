import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalBusinessProfile } from "@/components/local-business/local-business-profile";
import { getSessionUser } from "@/lib/auth/session";
import { getLocalBusinessDetail } from "@/lib/data/local-business";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ venue?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getLocalBusinessDetail(slug, null);
  return { title: detail?.name ?? "Local business" };
}

export default async function LocalBusinessDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { venue: venueSlug } = await searchParams;
  const user = await getSessionUser();
  const business = await getLocalBusinessDetail(slug, user?.id ?? null);
  if (!business) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <LocalBusinessProfile business={business} venueSlug={venueSlug} />
    </div>
  );
}
