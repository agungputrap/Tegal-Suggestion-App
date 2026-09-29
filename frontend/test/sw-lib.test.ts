// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
// Import artefak vanilla yang dipakai runtime SW (bukan salinan logika).
import "../public/sw-lib.js";

// Ambil lewat window (jsdom) — sw-lib menempel di self/globalThis.
const swLib = (window as unknown as {
  swLib: {
    CACHE_VERSION: string;
    SHELL_CACHE: string;
    DATA_CACHE: string;
    TILE_CACHE: string;
    IMAGE_CACHE: string;
    TILE_CACHE_MAX: number;
    IMAGE_CACHE_MAX: number;
    isDatasetPath(p: string): boolean;
    isStaticAsset(p: string): boolean;
    isMapTile(u: { hostname: string }): boolean;
    isCdnAsset(u: { hostname: string }): boolean;
    isRemoteImage(u: { hostname: string }): boolean;
    staleCacheKeys(k: unknown[], max: number): unknown[];
  };
}).swLib;

describe("sw-lib: versi cache", () => {
  it("semua nama cache menyertakan CACHE_VERSION (naikkan versi = cache lama terhapus)", () => {
    expect(swLib.SHELL_CACHE).toBe("shell-" + swLib.CACHE_VERSION);
    expect(swLib.DATA_CACHE).toBe("data-" + swLib.CACHE_VERSION);
    expect(swLib.TILE_CACHE).toBe("tiles-" + swLib.CACHE_VERSION);
    expect(swLib.IMAGE_CACHE).toBe("images-" + swLib.CACHE_VERSION);
  });
});

describe("sw-lib: routing permintaan", () => {
  it("dataset: places, places/summary, places/:id, listings, categories, photos", () => {
    expect(swLib.isDatasetPath("/places")).toBe(true);
    expect(swLib.isDatasetPath("/places/summary")).toBe(true);
    expect(swLib.isDatasetPath("/places/5732525850056395185")).toBe(true);
    expect(swLib.isDatasetPath("/listings?type=jajanan")).toBe(false); // query bukan bagian path — caller yang parse
    expect(swLib.isDatasetPath("/listings")).toBe(true);
    expect(swLib.isDatasetPath("/categories")).toBe(true);
    expect(swLib.isDatasetPath("/photos/abc.jpg")).toBe(true);
  });

  it("bukan dataset: portal pemilik, admin, bot, akar", () => {
    // /kelola memuat token pemilik di path — sengaja tidak pernah di-cache
    expect(swLib.isDatasetPath("/kelola")).toBe(false);
    expect(swLib.isDatasetPath("/kelola/TOKEN123")).toBe(false);
    expect(swLib.isDatasetPath("/admin/stats")).toBe(false);
    expect(swLib.isDatasetPath("/")).toBe(false);
    expect(swLib.isDatasetPath("/assets/index-x.js")).toBe(false);
  });

  it("aset statis same-origin: /assets/*, manifest, favicon", () => {
    expect(swLib.isStaticAsset("/assets/index-DFIdLpWS.js")).toBe(true);
    expect(swLib.isStaticAsset("/assets/index-Bnre74_2.css")).toBe(true);
    expect(swLib.isStaticAsset("/manifest.json")).toBe(true);
    expect(swLib.isStaticAsset("/favicon.svg")).toBe(true);
    expect(swLib.isStaticAsset("/places")).toBe(false);
  });

  it("tile OSM: subdomain a/b/c termasuk", () => {
    expect(swLib.isMapTile({ hostname: "tile.openstreetmap.org" })).toBe(true);
    expect(swLib.isMapTile({ hostname: "a.tile.openstreetmap.org" })).toBe(true);
    expect(swLib.isMapTile({ hostname: "basemaps.cartocdn.com" })).toBe(false);
  });

  it("CDN font & css pihak ketiga", () => {
    expect(swLib.isCdnAsset({ hostname: "cdnjs.cloudflare.com" })).toBe(true);
    expect(swLib.isCdnAsset({ hostname: "unpkg.com" })).toBe(true);
    expect(swLib.isCdnAsset({ hostname: "fonts.googleapis.com" })).toBe(true);
    expect(swLib.isCdnAsset({ hostname: "fonts.gstatic.com" })).toBe(true);
    expect(swLib.isCdnAsset({ hostname: "evil.example.com" })).toBe(false);
  });

  it("foto jarak jauh: googleusercontent & unsplash", () => {
    expect(swLib.isRemoteImage({ hostname: "lh3.googleusercontent.com" })).toBe(true);
    expect(swLib.isRemoteImage({ hostname: "lh5.googleusercontent.com" })).toBe(true);
    expect(swLib.isRemoteImage({ hostname: "images.unsplash.com" })).toBe(true);
    expect(swLib.isRemoteImage({ hostname: "tile.openstreetmap.org" })).toBe(false);
  });
});

describe("sw-lib: trim cache (batas storage tile/foto)", () => {
  it("di bawah batas: tidak ada yang dibuang", () => {
    expect(swLib.staleCacheKeys(["a", "b"], 5)).toEqual([]);
  });

  it("di atas batas: buang tertua dulu, sisakan max", () => {
    expect(swLib.staleCacheKeys(["k1", "k2", "k3", "k4"], 2)).toEqual(["k1", "k2"]);
  });

  it("pas di batas: tidak ada yang dibuang", () => {
    expect(swLib.staleCacheKeys(["a", "b"], 2)).toEqual([]);
  });
});
