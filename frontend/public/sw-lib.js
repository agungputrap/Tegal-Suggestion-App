/*
 * Logika MURNI service worker (Tier 2 #36) — file classic-script tanpa
 * listener, di-importScripts() oleh sw.js dan di-import langsung oleh
 * vitest supaya versi cache & keputusan routing diuji pada artefak yang
 * sama yang dipakai runtime (bukan salinan yang bisa melenceng).
 */
(function (global) {
  // Naikkan saat mengubah strategi cache — activate menghapus cache versi
  // lama (lihat listeners di sw.js).
  var CACHE_VERSION = "v1";

  var lib = {
    CACHE_VERSION: CACHE_VERSION,
    // Shell = dokumen + aset build bernama-hash (immutable) + aset CDN
    // ber-versi. Data & tile dipisah supaya trim/pembersihan tak saling
    // menghapus.
    SHELL_CACHE: "shell-" + CACHE_VERSION,
    DATA_CACHE: "data-" + CACHE_VERSION,
    TILE_CACHE: "tiles-" + CACHE_VERSION,
    IMAGE_CACHE: "images-" + CACHE_VERSION,
    TILE_CACHE_MAX: 400, // ±400 tile ≈ 1-2 sesi jelajah peta Tegal
    IMAGE_CACHE_MAX: 300,

    // Path API dataset yang layak offline (stale-while-revalidate).
    // /kelola (portal pemilik, ada token di path) & /admin SENGAJA tidak.
    isDatasetPath: function (pathname) {
      return (
        pathname === "/places" ||
        pathname.indexOf("/places/") === 0 ||
        pathname === "/listings" ||
        pathname.indexOf("/listings/") === 0 ||
        pathname === "/categories" ||
        pathname.indexOf("/photos/") === 0
      );
    },

    // Aset build same-origin bernama-hash + manifest + favicon → cache-first
    // aman karena isi tidak pernah berubah untuk URL yang sama.
    isStaticAsset: function (pathname) {
      return (
        pathname.indexOf("/assets/") === 0 ||
        pathname === "/manifest.json" ||
        pathname === "/favicon.svg"
      );
    },

    // Tile OSM (subdomain a/b/c).
    isMapTile: function (url) {
      return (
        url.hostname === "tile.openstreetmap.org" ||
        url.hostname.indexOf(".tile.openstreetmap.org") !== -1
      );
    },

    // CDN font & CSS pihak ketiga dengan URL ber-versi → cache-first.
    isCdnAsset: function (url) {
      return (
        url.hostname === "cdnjs.cloudflare.com" ||
        url.hostname === "unpkg.com" ||
        url.hostname === "fonts.googleapis.com" ||
        url.hostname === "fonts.gstatic.com"
      );
    },

    // Foto jarak jauh (thumbnail GMaps, fallback Unsplash) → SWR dengan
    // batas jumlah supaya storage tidak tumbuh tanpa batas.
    isRemoteImage: function (url) {
      return (
        url.hostname.indexOf("googleusercontent.com") !== -1 ||
        url.hostname.indexOf("unsplash.com") !== -1
      );
    },

    // Kunci cache terluar yang boleh dihapus bila cache melampaui `max`
    // (keys() berurutan waktu masuk — buang yang tertua dulu).
    staleCacheKeys: function (keys, max) {
      if (keys.length <= max) return [];
      return keys.slice(0, keys.length - max);
    },
  };

  global.swLib = lib;
})(typeof self !== "undefined" ? self : globalThis);
