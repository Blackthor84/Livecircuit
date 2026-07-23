import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreatorProfileView } from "@/components/marketplace/creator-profile-view";
import { getSessionUser, getArtistForUser } from "@/lib/auth/session";
import { getCreatorProfile } from "@/lib/data/marketplace";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getCreatorProfile(slug);
  return { title: profile?.displayName ?? "Creator" };
}

export default async function CreatorProfilePage({ params }: Props) {
  const { slug } = await params;
  const profile = await getCreatorProfile(slug);
  if (!profile) notFound();

  const user = await getSessionUser();
  const artist = user ? await getArtistForUser(user.id) : null;
  const canBook = Boolean(artist && user?.id !== profile.userId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <CreatorProfileView profile={profile} canBook={canBook} />
    </div>
  );
}
