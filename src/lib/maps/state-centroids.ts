/** Approximate centroids for US states when fans have state but no city. */
export const US_STATE_CENTROIDS: Record<string, { lat: number; lng: number; name: string }> = {
  CA: { lat: 36.7783, lng: -119.4179, name: "California" },
  TX: { lat: 31.9686, lng: -99.9018, name: "Texas" },
  FL: { lat: 27.6648, lng: -81.5158, name: "Florida" },
  NY: { lat: 43.2994, lng: -74.2179, name: "New York" },
  MA: { lat: 42.4072, lng: -71.3824, name: "Massachusetts" },
  IL: { lat: 40.6331, lng: -89.3985, name: "Illinois" },
};
