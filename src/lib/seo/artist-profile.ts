import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { getCategoryLabel, type ArtistPublicProfile } from "@/lib/data/artist-public-profile";

export function buildArtistProfileMetadata(profile: ArtistPublicProfile): Metadata {
  const { artist } = profile;
  const displayName = artist.stage_name;
  const categoryLabel = getCategoryLabel(artist.category);
  const location = [artist.location.city, artist.location.stateCode ?? artist.location.state]
    .filter(Boolean)
    .join(", ");

  const title = `${displayName} | ${categoryLabel} | ${APP_NAME}`;
  const description =
    artist.short_bio ??
    `Watch ${displayName} perform live on ${APP_NAME}. View upcoming shows${location ? ` in ${location}` : ""}, follow their profile, and never miss a performance.`;

  const image =
    artist.banner_url ??
    artist.profiles?.avatar_url ??
    undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: image ? [{ url: image, width: 1200, height: 630, alt: displayName }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export function buildArtistProfileJsonLd(profile: ArtistPublicProfile, siteUrl: string) {
  const { artist } = profile;
  const username = artist.username;
  const url = `${siteUrl}/${username}`;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: artist.stage_name,
    alternateName: artist.profiles?.display_name ?? undefined,
    description: artist.profiles?.bio ?? artist.short_bio ?? undefined,
    image: artist.banner_url ?? artist.profiles?.avatar_url ?? undefined,
    url,
    sameAs: Object.values(artist.social_links ?? {}).filter(Boolean),
    address: artist.location.city
      ? {
          "@type": "PostalAddress",
          addressLocality: artist.location.city,
          addressRegion: artist.location.state ?? undefined,
        }
      : undefined,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/FollowAction",
        userInteractionCount: profile.stats.followers,
      },
    ],
    aggregateRating:
      profile.stats.averageRating != null && profile.stats.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: profile.stats.averageRating.toFixed(1),
            reviewCount: profile.stats.reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };
}
