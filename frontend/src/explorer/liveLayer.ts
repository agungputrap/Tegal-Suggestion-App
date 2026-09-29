import type { Listing } from "../api";

// Helper murni lapisan live "Buka Hari Ini" di tab peta Explorer
// (opsi C fase 1 — docs/proposals/unified-map.md). Dipisah dari FullMap
// supaya bisa di-unit-test tanpa Leaflet/jsdom.

export type LiveTypeFilter = "semua" | "kuliner" | "jasa";

export function filterLiveListings(
  listings: Listing[],
  type: LiveTypeFilter,
): Listing[] {
  if (type === "kuliner")
    return listings.filter((l) => l.category_type === "jajanan");
  if (type === "jasa") return listings.filter((l) => l.category_type === "jasa");
  return listings;
}

// "5.5 km" — format sama dengan ListingCard. Kosong kalau endpoint tidak
// mengirim distance (mis. fetch tanpa lat/lng).
export function formatLiveDistance(km: number | undefined): string {
  if (km == null) return "";
  return `${km.toFixed(1)} km`;
}
