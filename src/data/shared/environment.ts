/** Artist visibility and environment — used to separate demo from production content */

export type ArtistVisibility = "demo-only" | "public";
export type ArtistEnvironment = "demo" | "production";
export type AppEnvironment = "demo" | "production";

export type ArtistIdentity = {
  isDemoArtist: boolean;
  visibility: ArtistVisibility;
  environment: ArtistEnvironment;
};

export const DEMO_ARTIST_IDENTITY = {
  isDemoArtist: true,
  visibility: "demo-only",
  environment: "demo",
} as const satisfies ArtistIdentity;

export const PRODUCTION_ARTIST_IDENTITY = {
  isDemoArtist: false,
  visibility: "public",
  environment: "production",
} as const satisfies ArtistIdentity;

export function isDemoArtist(artist: ArtistIdentity): boolean {
  return artist.isDemoArtist === true || artist.environment === "demo";
}

export function isProductionArtist(artist: ArtistIdentity): boolean {
  return !artist.isDemoArtist && artist.environment === "production";
}

export function filterArtistsByEnvironment<T extends ArtistIdentity>(
  artists: readonly T[],
  environment: AppEnvironment,
): T[] {
  if (environment === "demo") {
    return artists.filter((a) => a.environment === "demo" || a.isDemoArtist);
  }
  return artists.filter((a) => a.environment === "production" && !a.isDemoArtist);
}

export function assertDemoOnly(artist: ArtistIdentity, context: string): void {
  if (!isDemoArtist(artist)) {
    throw new Error(`${context}: artist must be demo-only content`);
  }
}
