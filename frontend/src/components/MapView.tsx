import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Category, Listing } from "../api";
import {
  buildPinIcon,
  FALLBACK_PIN_EMOJI,
  PIN_COLOR,
} from "./mapPins";
import {
  tileAttributionForTheme,
  tilesForTheme,
} from "./mapTiles";
import { useDarkClass } from "../hooks/useDarkMode";

type Props = {
  listings: Listing[];
  categories: Category[];
  center: { lat: number; lng: number };
};

// Batas area Tegal (kota + kabupaten) supaya peta tidak bisa di-pan
// keluar dari wilayah layanan aplikasi.
const TEGAL_BOUNDS = L.latLngBounds(
  [-7.25, 108.95], // barat daya
  [-6.85, 109.25], // timur laut
);

export function MapView({ listings, categories, center }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const dark = useDarkClass();

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
      cache.set(cat.id, buildPinIcon(cat.icon, PIN_COLOR[cat.type]));
    });
    return cache;
  }, [categories]);

  function iconFor(listing: Listing): L.DivIcon {
    const cached = iconCache.get(listing.category_id);
    if (cached) return cached;
    return buildPinIcon(FALLBACK_PIN_EMOJI[listing.category_type], PIN_COLOR[listing.category_type]);
  }

  // Init map sekali
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // preferCanvas (tier 2 #36) — konsisten dengan peta Explorer.
    const map = L.map(containerRef.current, {
      zoomControl: false,
      maxBounds: TEGAL_BOUNDS,
      maxBoundsViscosity: 1.0,
      minZoom: 11,
      preferCanvas: true,
    }).setView([center.lat, center.lng], 14);

    tilesRef.current = L.tileLayer(tilesForTheme(dark), {
      attribution: tileAttributionForTheme(dark),
      maxZoom: 19,
    }).addTo(map);

    // Clustering (tier 2 #36) — semua marker di peta ini adalah pin LIVE
    // "buka sekarang", jadi cluster bubar di zoom default (14) ke atas:
    // pin tunggal harus selalu terlihat, cluster hanya merapikan zoom-out.
    markersRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      disableClusteringAtZoom: 14,
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tile ikut tema gelap/terang (tier 0 #34)
  useEffect(() => {
    tilesRef.current?.setUrl(tilesForTheme(dark));
    if (tilesRef.current)
      tilesRef.current.options.attribution = tileAttributionForTheme(dark);
  }, [dark]);

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
