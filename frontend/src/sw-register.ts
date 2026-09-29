/*
 * Registrasi service worker (Tier 2 #36) — hanya di build produksi:
 * di dev, cache SW bentrok dengan HMR Vite dan mengubah file tidak
 * terlihat. Kegagalan register diabaikan — offline-first adalah
 * peningkatan, bukan syarat app jalan.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* tanpa SW app tetap berfungsi normal */
    });
  });
}
