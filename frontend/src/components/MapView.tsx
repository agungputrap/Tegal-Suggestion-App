import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import type { Category, Listing } from "../api";

type Props = {
  listings: Listing[];
  categories: Category[];
  center: { lat: number; lng: number };
};

const FALLBACK_ICON = { jajanan: "🍽️", jasa: "🛠️" };

// Batas area Tegal (kota + kabupaten) supaya peta tidak bisa di-pan
// keluar dari wilayah layanan aplikasi.
const TEGAL_BOUNDS = L.latLngBounds(
  [-7.25, 108.95], // barat daya
  [-6.85, 109.25], // timur laut
);

// Pin bentuk "tetesan" (rotate 45deg) dengan emoji di tengah, jadi tiap
// kategori punya ikon sendiri alih-alih titik warna generik.
function buildPinIcon(emoji: string, color: string): L.DivIcon {
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

export function MapView({ listings, categories, center }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Cache icon per kategori supaya tidak dibuat ulang tiap render.
  // Warna ikut palet template baru: amber (jajanan) & emerald (jasa).
  const iconCache = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    categories.forEach((cat) => {
      const color = cat.type === "jajanan" ? "#f59e0b" : "#059669";
      cache.set(cat.id, buildPinIcon(cat.icon, color));
    });
    return cache;
  }, [categories]);

  function iconFor(listing: Listing): L.DivIcon {
    const cached = iconCache.get(listing.category_id);
    if (cached) return cached;
    // Fallback kalau kategori belum termuat / tidak dikenal
    const color = listing.category_type === "jajanan" ? "#f59e0b" : "#059669";
    return buildPinIcon(FALLBACK_ICON[listing.category_type], color);
  }

  // Init map sekali
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      maxBounds: TEGAL_BOUNDS,
      maxBoundsViscosity: 1.0,
      minZoom: 11,
    }).setView([center.lat, center.lng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker tiap listings atau kategori berubah
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    for (const l of listings) {
      const category = categoryById.get(l.category_id);
      L.marker([l.checkin_lat, l.checkin_lng], { icon: iconFor(l) })
        .bindPopup(
          `<strong>${l.name}</strong><br/>${category?.name ?? l.category_id}`,
        )
        .addTo(markersRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, categoryById]);

  return <div className="absolute inset-0" ref={containerRef} />;
}
