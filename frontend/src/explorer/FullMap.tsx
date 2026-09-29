import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Listing, Place } from "../api";
import { FALLBACK_IMAGE_MEDIUM, formatCount, formatRating } from "./helpers";
import { createCustomMarkerIcon } from "./DirectoryTab";
import { buildLivePinIcon, FALLBACK_PIN_EMOJI, PIN_COLOR } from "../components/mapPins";
import {
  tileAttributionForTheme,
  tilesForTheme,
} from "../components/mapTiles";
import { useDarkClass } from "../hooks/useDarkMode";
import { filterLiveListings, formatLiveDistance, type LiveTypeFilter } from "./liveLayer";

type Props = {
  places: Place[];
  legend: { label: string; color: string; count: number }[];
  liveListings: Listing[];
  onOpenPlace: (id: string) => void;
  onOpenProvider: (id: string) => void;
};

const TYPE_LABEL = { jajanan: "Jajanan", jasa: "Jasa" } as const;

export function FullMap({
  places,
  legend,
  liveListings,
  onOpenPlace,
  onOpenProvider,
}: Props) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const liveLayerRef = useRef<L.LayerGroup | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const onOpenPlaceRef = useRef(onOpenPlace);
  const onOpenProviderRef = useRef(onOpenProvider);
  const dark = useDarkClass();

  // Kontrol lapisan live — milik FullMap saja (tidak memengaruhi tab lain)
  const [liveType, setLiveType] = useState<LiveTypeFilter>("semua");
  const [liveOnly, setLiveOnly] = useState(false);

  const filteredLive = useMemo(
    () => filterLiveListings(liveListings, liveType),
    [liveListings, liveType],
  );

  // Direktori berisi F&B semua — filter "Jasa" menyembunyikannya secara
  // otomatis, "Buka hari ini saja" menyembunyikannya selalu.
  const showDirectory = !liveOnly && liveType !== "jasa";

  // Legenda lapisan live (dihitung dari seluruh listing live, bukan yang
  // terfilter, supaya angka tidak berubah-ubah saat toggle)
  const liveLegend = useMemo(() => {
    const jajanan = liveListings.filter(
      (l) => l.category_type === "jajanan",
    ).length;
    return [
      { label: "Live Jajanan", color: "bg-amber-500", count: jajanan },
      {
        label: "Live Jasa",
        color: "bg-emerald-500",
        count: liveListings.length - jajanan,
      },
    ];
  }, [liveListings]);

  // Ref hanya boleh ditulis di effect, bukan saat render
  useEffect(() => {
    onOpenPlaceRef.current = onOpenPlace;
    onOpenProviderRef.current = onOpenProvider;
  }, [onOpenPlace, onOpenProvider]);

  // Init map sekali
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current).setView([-6.87, 109.13], 12);
    tilesRef.current = L.tileLayer(tilesForTheme(dark), {
      attribution: tileAttributionForTheme(dark),
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
    });
    map.addLayer(cluster);

    // Pane terpisah di atas marker default (zIndex 600) supaya pin live
    // tidak tertutup cluster direktori — "buka sekarang" tidak boleh
    // tersembunyi di dalam bulatan angka.
    map.createPane("live").style.zIndex = "650";
    liveLayerRef.current = L.layerGroup([], { pane: "live" }).addTo(map);

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
      liveLayerRef.current = null;
      tilesRef.current = null;
    };
  }, []);

  // Tile ikut tema gelap/terang (tier 0 #34)
  useEffect(() => {
    if (!tilesRef.current) return;
    tilesRef.current.setUrl(tilesForTheme(dark));
    tilesRef.current.options.attribution = tileAttributionForTheme(dark);
  }, [dark]);

  // Update marker direktori ketika daftar/visibilitas berubah (port dari
  // updateFullMapMarkers)
  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster) return;

    cluster.clearLayers();
    const validCoords: L.LatLngTuple[] = [];

    if (showDirectory) {
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
    }

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

    return () => {
      map.off("popupopen", onPopupOpen);
    };
  }, [places, showDirectory]);

  // Update marker live "Buka Hari Ini"
  useEffect(() => {
    const map = mapRef.current;
    const liveLayer = liveLayerRef.current;
    if (!map || !liveLayer) return;

    liveLayer.clearLayers();
    filteredLive.forEach((l) => {
      const color = PIN_COLOR[l.category_type];
      const emoji = FALLBACK_PIN_EMOJI[l.category_type];
      const marker = L.marker([l.checkin_lat, l.checkin_lng], {
        icon: buildLivePinIcon(emoji, color),
      });

      const dist = formatLiveDistance(l.distance_km);
      const popupContent = document.createElement("div");
      popupContent.style.width = "220px";
      popupContent.innerHTML = `
        <div style="padding: 10px; font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
            <span style="font-size: 10px; font-weight: 700; color: #059669;">BUKA HARI INI</span>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; margin: 0 0 2px 0; color: #0f172a;">
            ${l.name}
          </h4>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            ${TYPE_LABEL[l.category_type]}${dist ? ` · ${dist}` : ""}
          </div>
          <button data-open-provider="${l.id}" style="width: 100%; background: #059669; color: white; border: none; padding: 6px 0; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;">
            Lihat Detail &amp; Chat
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      liveLayer.addLayer(marker);
    });

    // Delegasi tombol popup live -> halaman detail /provider/<id>
    const onLivePopupOpen = (e: L.PopupEvent) => {
      const el = e.popup.getElement();
      const btn = el?.querySelector<HTMLButtonElement>("[data-open-provider]");
      btn?.addEventListener("click", () => {
        const id = btn.getAttribute("data-open-provider");
        if (id) onOpenProviderRef.current(id);
        map.closePopup();
      });
    };
    map.on("popupopen", onLivePopupOpen);

    return () => {
      map.off("popupopen", onLivePopupOpen);
    };
  }, [filteredLive]);

  // fitBounds atas gabungan kedua lapisan — provider live di luar bbox
  // direktori (finge kabupaten) tetap masuk pandangan awal.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const coords: L.LatLngTuple[] = [
      ...places.map((p): L.LatLngTuple => [p.latitude, p.longitude]),
      ...liveListings.map(
        (l): L.LatLngTuple => [l.checkin_lat, l.checkin_lng],
      ),
    ];
    if (coords.length > 0) {
      map.fitBounds(coords, { padding: [40, 40] });
    }
  }, [places, liveListings]);

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

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg font-medium transition ${
      active
        ? "bg-emerald-600 text-white"
        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
    }`;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-grow flex flex-col">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-sm font-bold">
            Peta Tegal — Direktori &amp; Buka Hari Ini
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({places.length} tempat · {liveListings.length} buka hari ini)
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button className={chip(liveType === "semua")} onClick={() => setLiveType("semua")}>
            Semua
          </button>
          <button
            className={chip(liveType === "kuliner")}
            onClick={() => setLiveType("kuliner")}
          >
            🍜 Kuliner
          </button>
          <button className={chip(liveType === "jasa")} onClick={() => setLiveType("jasa")}>
            🛠️ Jasa
          </button>
          <button
            className={chip(liveOnly)}
            onClick={() => setLiveOnly((v) => !v)}
            title="Sembunyikan direktori, tampilkan yang buka hari ini saja"
          >
            ✓ Buka hari ini saja
          </button>
          <span className="mx-1 hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-700"></span>
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
            className="px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium"
          >
            🌐 Semua Titik
          </button>
        </div>
      </div>

      <div className="flex-grow w-full min-h-[550px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative">
        {/* absolute inset-0: height:100% tidak reliable di sini karena rantai
            tinggi parent tidak eksplisit (beda dengan ref yang set html.h-full) */}
        <div ref={mapElRef} className="absolute inset-0"></div>

        {/* Floating Map Legend — dua grup: direktori & live */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 dark:bg-slate-900/95 p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-xs backdrop-blur-md max-w-xs">
          <div className="font-bold text-slate-700 dark:text-slate-300 mb-2">
            Direktori (Google Maps):
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
          <div className="font-bold text-slate-700 dark:text-slate-300 mt-3 mb-2">
            Buka Hari Ini (live):
          </div>
          <div className="grid grid-cols-1 gap-1.5 text-[11px]">
            {liveLegend.map(({ label, color, count }) => (
              <div key={label} className="flex items-center space-x-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
                <span>
                  {label} ({count})
                </span>
              </div>
            ))}
            {liveListings.length === 0 && (
              <span className="text-slate-400">
                belum ada yang check-in hari ini
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
