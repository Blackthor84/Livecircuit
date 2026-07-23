/** Next.js cache tags for venue network public reads. */

export function venueSlugTag(slug: string) {
  return `venue:${slug}`;
}

export const VENUES_DIRECTORY_TAG = "venues:directory";
export const VENUE_TYPES_TAG = "venues:types";
