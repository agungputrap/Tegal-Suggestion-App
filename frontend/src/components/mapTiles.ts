// Tile peta terang/gelap (tier 0 #34) — kini SATU sumber tile (OSM standar)
// untuk kedua tema. Dark mode tidak lagi menukar tile ke CartoDB dark_all:
// sejak 2026 Carto memwajibkan API key untuk basemaps.cartocdn.com dan
// menjawab placeholder "API KEY REQUIRED" (terverifikasi di produksi),
// jadi tampilan gelap dicapai lewat filter CSS di .dark .leaflet-tile
// (lihat styles.css). Satu sumber tile = tidak ada flash penukaran tile
// saat toggle tema, dan lebih ramah cache offline (service worker Tier 2).
export const LIGHT_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const DARK_TILES = LIGHT_TILES;

// Param dark dipertahankan supaya pemanggil (3 peta) tidak berubah.
export function tilesForTheme(_dark: boolean): string {
  return LIGHT_TILES;
}

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const TILE_ATTRIBUTION_DARK = TILE_ATTRIBUTION;

export function tileAttributionForTheme(_dark: boolean): string {
  return TILE_ATTRIBUTION;
}
