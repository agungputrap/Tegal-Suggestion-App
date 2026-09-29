/*
 * Service worker offline-first (Tier 2 #36) — vanilla, tanpa Workbox.
 *
 * Strategi:
 *  - Navigasi dokumen  : stale-while-revalidate terhadap index.html
 *    (offline shell — app SPA hidup tanpa jaringan).
 *  - Aset build hash   : cache-first (URL immutable).
 *  - Dataset API       : stale-while-revalidate (places/listings/categories/
 *    photos) — buka instan dari cache, segarkan di belakang.
 *  - Tile peta & foto  : stale-while-revalidate dengan batas jumlah
 *    (trim tertua) supaya storage terkendali.
 *  - POST/PUT/DELETE   : tidak pernah disentuh (checkin, upload, dsb).
 *
 * Alur update AMAN: TIDAK ada skipWaiting — SW baru ter-install dan menunggu
 * sampai semua tab lama tertutup, jadi tidak pernah ada campuran aset
 * hash lama/baru di sesi yang hidup; update berlaku di muat ulang
 * berikutnya. Cache versi lama dihapus saat activate (lihat sw-lib
 * CACHE_VERSION).
 */
importScripts("/sw-lib.js");

var lib = self.swLib;
var CURRENT_CACHES = [
  lib.SHELL_CACHE,
  lib.DATA_CACHE,
  lib.TILE_CACHE,
  lib.IMAGE_CACHE,
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(lib.SHELL_CACHE)
      .then(function (cache) {
        // Offline shell minimal — aset hash lain mengikuti saat pertama
        // kali dimuat (cache-first).
        return cache.addAll(["/", "/manifest.json", "/favicon.svg"]);
      })
      .catch(function () {
        /* precache gagal (offline saat install) — SW tetap terpasang */
      }),
  );
  // Sengaja TANPA self.skipWaiting() — lihat komentar alur update di atas.
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return CURRENT_CACHES.indexOf(k) === -1;
            })
            .map(function (k) {
              return caches.delete(k);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

// Ambil dari cache dulu kalau ada; selalu segarkan di belakang.
function staleWhileRevalidate(event, cacheName, cacheKey) {
  var req = event.request;
  event.respondWith(
    caches.open(cacheName).then(function (cache) {
      return cache.match(cacheKey || req).then(function (cached) {
        var network = fetch(req)
          .then(function (res) {
            // opaque (no-cors CDN/tile) pun lolos: statusnya 0 tapi isinya valid.
            if (res && (res.ok || res.type === "opaque")) {
              cache.put(cacheKey || req, res.clone());
            }
            return res;
          })
          .catch(function () {
            return null;
          });
        event.waitUntil(
          network.then(function (res) {
            if (!res) return;
            // Tile/foto: buang kunci tertua bila melampaui batas.
            if (cacheName === lib.TILE_CACHE) {
              return trimToMax(cache, lib.TILE_CACHE_MAX);
            }
            if (cacheName === lib.IMAGE_CACHE) {
              return trimToMax(cache, lib.IMAGE_CACHE_MAX);
            }
          }),
        );
        // Network gagal + cache kosong → null diteruskan ke browser (error).
        return cached || network;
      });
    }),
  );
}

function trimToMax(cache, max) {
  return cache.keys().then(function (keys) {
    return Promise.all(
      lib
        .staleCacheKeys(keys, max)
        .map(function (k) {
          return cache.delete(k);
        }),
    );
  });
}

// Cache-first — hanya untuk URL yang isinya tak berubah (hash/versi).
function cacheFirst(event, cacheName) {
  var req = event.request;
  event.respondWith(
    caches.open(cacheName).then(function (cache) {
      return cache.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (res) {
          if (res && (res.ok || res.type === "opaque")) {
            cache.put(req, res.clone());
          }
          return res;
        });
      });
    }),
  );
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return; // checkin/upload/kelola — jangan ganggu

  var url = new URL(req.url);

  // Navigasi dokumen → offline shell (SWR dengan kunci tetap "/"): SPA route
  // apa pun (/provider/x, /place/y) memakai index.html yang sama, jadi
  // kuncinya satu supaya cache tidak menumpuk per-URL route.
  if (req.mode === "navigate") {
    event.respondWith(
      caches.open(lib.SHELL_CACHE).then(function (cache) {
        return cache.match("/").then(function (cached) {
          var network = fetch(req)
            .then(function (res) {
              if (res && res.ok) cache.put("/", res.clone());
              return res;
            })
            .catch(function () {
              return null;
            });
          event.waitUntil(network);
          return cached || network;
        });
      }),
    );
    return;
  }

  if (lib.isMapTile(url)) {
    staleWhileRevalidate(event, lib.TILE_CACHE);
    return;
  }
  if (lib.isCdnAsset(url)) {
    cacheFirst(event, lib.SHELL_CACHE);
    return;
  }
  if (lib.isRemoteImage(url)) {
    staleWhileRevalidate(event, lib.IMAGE_CACHE);
    return;
  }
  // Dataset API — khusus origin API yang beda host (pages.dev vs
  // workers.dev di produksi), jadi dicek dari PATH sebelum gate same-origin.
  // Path-nya cukup spesifik; CDN/tile/foto sudah tersaring di atas.
  if (lib.isDatasetPath(url.pathname)) {
    staleWhileRevalidate(event, lib.DATA_CACHE);
    return;
  }
  if (url.origin === self.location.origin && lib.isStaticAsset(url.pathname)) {
    cacheFirst(event, lib.SHELL_CACHE);
    return;
  }
  // Selain di atas: biarkan browser jalan normal.
});
