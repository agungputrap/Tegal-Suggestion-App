// Deklarasi untuk public/sw-lib.js (vanilla classic script tanpa tipe) —
// dipakai test vitest yang meng-import logika murni SW langsung.
export {};

declare global {
  var swLib: {
    CACHE_VERSION: string;
    SHELL_CACHE: string;
    DATA_CACHE: string;
    TILE_CACHE: string;
    IMAGE_CACHE: string;
    TILE_CACHE_MAX: number;
    IMAGE_CACHE_MAX: number;
    isDatasetPath(pathname: string): boolean;
    isStaticAsset(pathname: string): boolean;
    isMapTile(url: { hostname: string }): boolean;
    isCdnAsset(url: { hostname: string }): boolean;
    isRemoteImage(url: { hostname: string }): boolean;
    staleCacheKeys(keys: RequestInfo[], max: number): RequestInfo[];
  };
}
