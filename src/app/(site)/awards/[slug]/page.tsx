import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AwardCeremonyDisplay } from "@/components/awards/award-ceremony-display";
import { getAwardCeremonyDetail } from "@/lib/data/awards";
import { ROUTES } from "@/lib/constants";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ceremony = await getAwardCeremonyDetail(slug);
  return { title: ceremony ? ceremony.title : "LiveCircuit Awards" };
}

export default async function AwardCeremonyPage({ params }: Props) {
  const { slug } = await params;
  const ceremony = await getAwardCeremonyDetail(slug);
  if (!ceremony) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href={ROUTES.awards} className="text-sm text-muted-foreground hover:text-foreground">
        ← Awards hub
      </Link>
      <div className="mt-6">
        <AwardCeremonyDisplay ceremony={ceremony} />
      </div>
    </div>
  );
}
