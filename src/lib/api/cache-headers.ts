/** Cache-Control helpers for public venue network APIs. */

export function publicShortCacheHeaders(maxAgeSeconds = 30, staleWhileRevalidate = 120) {
  return {
    "Cache-Control": `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidate}`,
  };
}

export function publicMediumCacheHeaders(maxAgeSeconds = 60, staleWhileRevalidate = 300) {
  return {
    "Cache-Control": `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidate}`,
  };
}

export function noStoreHeaders() {
  return { "Cache-Control": "private, no-store" };
}
