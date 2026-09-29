// Tile peta terang/gelap (tier 0 #34) — saat dark mode aktif, tile ikut
// gelap (CartoDB dark_all) supaya tidak menyilaukan; sumber tema dibaca
// dari class .dark di <html> via useDarkClass().
export const LIGHT_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export function tilesForTheme(dark: boolean): string {
  return dark ? DARK_TILES : LIGHT_TILES;
}

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const TILE_ATTRIBUTION_DARK = TILE_ATTRIBUTION + " &copy; CARTO";

export function tileAttributionForTheme(dark: boolean): string {
  return dark ? TILE_ATTRIBUTION_DARK : TILE_ATTRIBUTION;
}
