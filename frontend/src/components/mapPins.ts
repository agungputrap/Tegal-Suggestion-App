import L from "leaflet";

// Pin bentuk "tetesan" (rotate -45deg) dengan emoji di tengah — modul
// bersama supaya peta app inti (MapView) dan peta Explorer (FullMap)
// pakai bahasa visual marker yang sama, bukan dua implementasi (#21).

export const PIN_COLOR: Record<"jajanan" | "jasa", string> = {
  jajanan: "#f59e0b",
  jasa: "#059669",
};

// Fallback kalau kategori belum termuat / tidak dikenal
export const FALLBACK_PIN_EMOJI: Record<"jajanan" | "jasa", string> = {
  jajanan: "🍽️",
  jasa: "🛠️",
};

export function buildPinIcon(emoji: string, color: string): L.DivIcon {
  return L.divIcon({
    className: "map-pin-wrapper",
    html: `
      <div class="map-pin" style="background:${color}">
        <span class="map-pin__emoji">${emoji}</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -30],
  });
}

// Varian pin live "Buka Hari Ini" (opsi C fase 1) — bentuk sama + ring
// pulsing di belakangnya supaya jelas beda dari pin direktori (bisa basi).
export function buildLivePinIcon(emoji: string, color: string): L.DivIcon {
  return L.divIcon({
    className: "map-pin-wrapper map-pin-wrapper--live",
    html: `
      <div class="map-pin-live__ring"></div>
      <div class="map-pin" style="background:${color}">
        <span class="map-pin__emoji">${emoji}</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -30],
  });
}
