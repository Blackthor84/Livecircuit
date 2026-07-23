import type { Artist } from "@/types/database";

export type ArtistProfileEmbed = {
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
};

export type ArtistWithProfile = Artist & {
  profiles: ArtistProfileEmbed | null;
};
