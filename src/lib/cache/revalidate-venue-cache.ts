import { revalidateTag } from "next/cache";
import { VENUES_DIRECTORY_TAG, venueSlugTag } from "@/lib/cache/venue-tags";

export function revalidateVenuePublicCache(slug: string, venueId?: string) {
  revalidateTag(venueSlugTag(slug), "max");
  revalidateTag(VENUES_DIRECTORY_TAG, "max");
  if (venueId) revalidateTag(`venue-theme:${venueId}`, "max");
}
