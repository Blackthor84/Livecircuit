import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ArtistPublicProfileView } from "@/components/artists/artist-public-profile-view";
import { getUsernameRedirectTarget } from "@/lib/actions/username";
import {
  getArtistPublicProfile,
  resolveArtistUsername,
} from "@/lib/data/artist-public-profile";
import { listPublishedToursForArtistPublic } from "@/lib/data/artist-tours";
import { isFollowingArtist } from "@/lib/data/profiles";
import { getSessionUser } from "@/lib/auth/session";
import { getViewerFeatureAccess } from "@/lib/features/guard";
import {
  buildArtistProfileJsonLd,
  buildArtistProfileMetadata,
} from "@/lib/seo/artist-profile";
import { isReservedUsername, normalizeUsername } from "@/lib/username";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const normalized = normalizeUsername(username);
  if (isReservedUsername(normalized)) return { title: "Not found" };

  const canonical = await resolveArtistUsername(normalized);
  const profile = await getArtistPublicProfile(canonical);
  if (!profile) return { title: "Performer" };

  return buildArtistProfileMetadata(profile);
}

export default async function VanityArtistProfilePage({ params }: Props) {
  const { username } = await params;
  const normalized = normalizeUsername(username);

  if (isReservedUsername(normalized)) notFound();

  const redirectTarget = await getUsernameRedirectTarget(normalized);
  if (redirectTarget && redirectTarget !== normalized) {
    permanentRedirect(`/${redirectTarget}`);
  }

  const canonical = await resolveArtistUsername(normalized);
  const profile = await getArtistPublicProfile(canonical);
  if (!profile) notFound();

  if (canonical !== normalized) {
    permanentRedirect(`/${canonical}`);
  }

  const user = await getSessionUser();
  const [following, features, tours] = await Promise.all([
    user && profile.artist.id
      ? isFollowingArtist(user.id, profile.artist.id)
      : Promise.resolve(false),
    getViewerFeatureAccess(),
    listPublishedToursForArtistPublic(profile.artist.id),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://watchlivecircuit.com";
  const jsonLd = buildArtistProfileJsonLd(profile, siteUrl);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArtistPublicProfileView
        profile={profile}
        following={following}
        isOwner={user?.id === profile.artist.user_id}
        showMessages={features.canAccess("direct_messages")}
        username={canonical}
        tours={tours}
      />
    </>
  );
}
