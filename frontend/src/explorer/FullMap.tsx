import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Place } from "./types";
import { FALLBACK_IMAGE_MEDIUM, formatCount, formatRating } from "./helpers";
import { createCustomMarkerIcon } from "./DirectoryTab";

type Props = {
  places: Place[];
  legend: { label: string; color: string; count: number }[];
  onOpenPlace: (id: string) => void;
};

export function FullMap({ places, legend, onOpenPlace }: Props) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const onOpenPlaceRef = useRef(onOpenPlace);

  // Ref hanya boleh ditulis di effect, bukan saat render
  useEffect(() => {
    onOpenPlaceRef.current = onOpenPlace;
  }, [onOpenPlace]);

  // Init map sekali
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current).setView([-6.87, 109.13], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
    });
    map.addLayer(cluster);

    mapRef.current = map;
    clusterRef.current = cluster;

    // Container bisa berukuran 0 saat init (layout belum settle) — paksa
    // Leaflet hitung ulang ukuran supaya tile & marker dirender.
    const sizeTimer = setTimeout(() => map.invalidateSize(), 100);

    return () => {
      clearTimeout(sizeTimer);
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  // Update marker ketika daftar berubah (port dari updateFullMapMarkers)
  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster) return;

    cluster.clearLayers();
    const validCoords: L.LatLngTuple[] = [];

    places.forEach((p) => {
      const marker = L.marker([p.latitude, p.longitude], {
        icon: createCustomMarkerIcon(p.category),
      });

      const thumb = p.thumbnail || FALLBACK_IMAGE_MEDIUM;
      const popupContent = document.createElement("div");
      popupContent.style.width = "240px";
      popupContent.innerHTML = `
        <div style="height: 110px; overflow: hidden; background: #e2e8f0;">
          <img src="${thumb}" style="width: 100%; height: 100%; object-fit: cover;"
            onerror="this.src='${FALLBACK_IMAGE_MEDIUM}'">
        </div>
        <div style="padding: 10px; font-family: 'Plus Jakarta Sans', sans-serif;">
          <span style="font-size: 10px; font-weight: 700; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px;">
            ${p.category}
          </span>
          <h4 style="font-size: 13px; font-weight: 700; margin: 4px 0 2px 0; color: #0f172a;">
            ${p.title}
          </h4>
          <div style="font-size: 11px; color: #f59e0b; font-weight: 700; margin-bottom: 4px;">
            ★ ${formatRating(p)}
            <span style="color: #64748b; font-weight: 400;">(${formatCount(p.review_count)} ulasan)</span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            ${p.address ? p.address.substring(0, 45) + "..." : ""}
          </div>
          <button data-open-place="${p.id}" style="width: 100%; background: #16a34a; color: white; border: none; padding: 6px 0; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;">
            Lihat Detail & Menu
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      cluster.addLayer(marker);
      validCoords.push([p.latitude, p.longitude]);
    });

    // Tombol di dalam popup -> buka modal detail (delegasi event per popup)
    const onPopupOpen = (e: L.PopupEvent) => {
      const el = e.popup.getElement();
      const btn = el?.querySelector<HTMLButtonElement>("[data-open-place]");
      btn?.addEventListener("click", () => {
        const id = btn.getAttribute("data-open-place");
        if (id) onOpenPlaceRef.current(id);
        map.closePopup();
      });
    };
    map.on("popupopen", onPopupOpen);

    if (validCoords.length > 0) {
      map.fitBounds(validCoords, { padding: [40, 40] });
    }

    return () => {
      map.off("popupopen", onPopupOpen);
    };
  }, [places]);

  const centerOn = (target: "tegal" | "brebes" | "all") => {
    const map = mapRef.current;
    if (!map) return;
    if (target === "tegal") map.setView([-6.869, 109.125], 13);
    else if (target === "brebes") map.setView([-6.87, 109.04], 13);
    else if (places.length > 0) {
      map.fitBounds(
        places.map((p): L.LatLngTuple => [p.latitude, p.longitude]),
        { padding: [40, 40] },
      );
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-grow flex flex-col">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-sm font-bold">
            Peta Persebaran Lokasi F&amp;B
          </span>
          <span className="text-xs text-slate-500">
            ({places.length} Tempat Kuliner Terpetakan)
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => centerOn("tegal")}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 font-medium"
          >
            📍 Tegal Pusat
          </button>
          <button
            onClick={() => centerOn("brebes")}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg hover:bg-blue-100 font-medium"
          >
            📍 Brebes
          </button>
          <button
            onClick={() => centerOn("all")}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg hover:bg-slate-200 font-medium"
          >
            🌐 Semua Titik
          </button>
        </div>
      </div>

      <div className="flex-grow w-full min-h-[550px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative">
        {/* absolute inset-0: height:100% tidak reliable di sini karena rantai
            tinggi parent tidak eksplisit (beda dengan ref yang set html.h-full) */}
        <div ref={mapElRef} className="absolute inset-0"></div>

        {/* Floating Map Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 dark:bg-slate-900/95 p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-xs backdrop-blur-md max-w-xs">
          <div className="font-bold text-slate-700 dark:text-slate-300 mb-2">
            Legenda Kategori:
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {legend.map(({ label, color, count }) => (
              <div key={label} className="flex items-center space-x-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
                <span>
                  {label} ({count})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
