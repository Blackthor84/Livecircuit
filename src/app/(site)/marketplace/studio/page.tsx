import type { Metadata } from "next";
import Link from "next/link";
import { CreatorStudioForm } from "@/components/marketplace/creator-studio-form";
import { requireUserProfile } from "@/lib/auth/guards";
import { getCreatorStudioProfile } from "@/lib/data/marketplace";

export const metadata: Metadata = { title: "Creator studio" };

export default async function CreatorStudioPage() {
  const { user } = await requireUserProfile();
  const profile = await getCreatorStudioProfile(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Creator studio</h1>
        <Link href="/marketplace" className="text-sm text-primary hover:underline">
          ← Marketplace
        </Link>
      </div>
      <CreatorStudioForm initial={profile} />
    </div>
  );
}
