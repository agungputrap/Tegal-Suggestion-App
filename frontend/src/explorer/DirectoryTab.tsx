import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Place } from "./types";
import {
  FALLBACK_IMAGE_MEDIUM,
  FALLBACK_IMAGE_SMALL,
  extractHighlights,
  formatCount,
  formatRating,
  getCategoryColor,
  isOpenNow,
  nowParts,
  placeThumbnail,
} from "./helpers";
import type { DirectoryView, QuickFilters, SortOption } from "./ExplorerApp";

type Filters = {
  search: string;
  city: string;
  category: string;
  minRating: number;
  sort: SortOption;
  quick: QuickFilters;
  categories: [string, number][];
};

type Props = {
  places: Place[];
  totalCount: number;
  status: "loading" | "ready" | "error";
  view: DirectoryView;
  onViewChange: (v: DirectoryView) => void;
  filters: Filters;
  onFilterChange: {
    setSearch: (v: string) => void;
    setCity: (v: string) => void;
    setCategory: (v: string) => void;
    setMinRating: (v: number) => void;
    setSort: (v: SortOption) => void;
    setQuick: (v: QuickFilters) => void;
  };
  onReset: () => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onOpenPlace: (id: string) => void;
};

const selectClass =
  "px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

const QUICK_FILTERS: { key: keyof QuickFilters; label: string }[] = [
  { key: "openNow", label: "🟢 Buka Sekarang" },
  { key: "wifi", label: "💻 Laptop / Kerja" },
  { key: "outdoor", label: "🌿 Area Terbuka / Outdoor" },
  { key: "reservation", label: "📅 Bisa Reservasi" },
  { key: "budget", label: "💵 Terjangkau (<50rb)" },
];

const VIEWS: { key: DirectoryView; icon: string; title: string }[] = [
  { key: "grid", icon: "fa-border-all", title: "Grid View" },
  { key: "list", icon: "fa-list", title: "Compact List View" },
  { key: "table", icon: "fa-table", title: "Data Table View" },
  { key: "split", icon: "fa-columns", title: "Split Map & List View" },
];

export function DirectoryTab({
  places,
  totalCount,
  status,
  view,
  onViewChange,
  filters,
  onFilterChange,
  onReset,
  favorites,
  onToggleFavorite,
  onOpenPlace,
}: Props) {
  const { dayIndo, hour, min } = nowParts();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-grow">
      {/* Filter & Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-4">
          <div className="relative w-full md:w-1/2">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-slate-400"></i>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange.setSearch(e.target.value)}
              placeholder="Cari nama cafe, restoran, menu, jalan, wifi..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
            {filters.search && (
              <button
                onClick={() => onFilterChange.setSearch("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            <select
              value={filters.city}
              onChange={(e) => onFilterChange.setCity(e.target.value)}
              className={selectClass}
            >
              <option value="all">📍 Semua Wilayah</option>
              <option value="Kota Tegal">Kota Tegal</option>
              <option value="Kabupaten Brebes">Kabupaten Brebes</option>
              <option value="Kabupaten Tegal">Kabupaten Tegal</option>
            </select>

            <select
              value={filters.category}
              onChange={(e) => onFilterChange.setCategory(e.target.value)}
              className={selectClass}
            >
              <option value="all">
                🍽️ Semua Kategori ({places.length > 0 ? totalCount : 0})
              </option>
              {filters.categories.map(([cat, cnt]) => (
                <option key={cat} value={cat}>
                  {cat} ({cnt})
                </option>
              ))}
            </select>

            <select
              value={String(filters.minRating)}
              onChange={(e) =>
                onFilterChange.setMinRating(parseFloat(e.target.value))
              }
              className={selectClass}
            >
              <option value="0">⭐ Semua Rating</option>
              <option value="4.8">⭐ 4.8+ Luar Biasa</option>
              <option value="4.5">⭐ 4.5+ Sangat Baik</option>
              <option value="4.0">⭐ 4.0+ Baik</option>
            </select>

            <select
              value={filters.sort}
              onChange={(e) =>
                onFilterChange.setSort(e.target.value as SortOption)
              }
              className={`${selectClass} font-medium`}
            >
              <option value="rating_desc">🔥 Rating Tertinggi</option>
              <option value="reviews_desc">💬 Ulasan Terbanyak</option>
              <option value="title_asc">🔤 Nama A - Z</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Pills + View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-xs mr-1">
              <i className="fa-solid fa-sliders mr-1"></i>Filter Cepat:
            </span>
            {QUICK_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() =>
                  onFilterChange.setQuick({
                    ...filters.quick,
                    [key]: !filters.quick[key],
                  })
                }
                className={`qf-btn px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 transition ${
                  filters.quick[key] ? "active" : ""
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={onReset}
              className="text-xs text-rose-500 hover:underline ml-2"
            >
              <i className="fa-solid fa-rotate-left mr-1"></i>Reset
            </button>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {VIEWS.map(({ key, icon, title }) => (
              <button
                key={key}
                onClick={() => onViewChange(key)}
                title={title}
                className={`p-1.5 rounded-lg text-xs ${
                  view === key
                    ? "text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <i className={`fa-solid ${icon}`}></i>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Counter Info */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Menampilkan{" "}
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {places.length}
          </span>{" "}
          dari <span className="font-bold">{totalCount}</span> tempat kuliner
        </div>
        <div className="text-xs text-slate-400">
          <i className="fa-regular fa-lightbulb text-amber-500 mr-1"></i>
          Klik kartu untuk melihat foto, jam buka &amp; ulasan
        </div>
      </div>

      {status === "loading" && (
        <div className="p-8 text-center text-sm text-slate-500">
          <i className="fa-solid fa-spinner fa-spin mr-2"></i>Memuat dataset
          F&amp;B...
        </div>
      )}

      {status === "error" && (
        <div className="p-8 text-center text-sm text-rose-500">
          Gagal memuat data. Pastikan API berjalan di
          <code className="mx-1">GET /places</code>.
        </div>
      )}

      {status === "ready" && view === "grid" && (
        <GridView
          places={places}
          dayIndo={dayIndo}
          hour={hour}
          min={min}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onOpenPlace={onOpenPlace}
          onReset={onReset}
        />
      )}

      {status === "ready" && view === "list" && (
        <ListView places={places} onOpenPlace={onOpenPlace} />
      )}

      {status === "ready" && view === "table" && (
        <TableView places={places} onOpenPlace={onOpenPlace} />
      )}

      {status === "ready" && view === "split" && (
        <SplitView places={places} onOpenPlace={onOpenPlace} />
      )}
    </main>
  );
}

// ---------- Empty state ----------
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="col-span-full py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400 text-2xl">
        <i className="fa-solid fa-magnifying-glass"></i>
      </div>
      <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
        Tidak ada tempat kuliner ditemukan
      </h3>
      <p className="text-xs text-slate-500 mt-1">
        Coba sesuaikan kata kunci pencarian atau filter yang dipilih.
      </p>
      <button
        onClick={onReset}
        className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition"
      >
        Reset Semua Filter
      </button>
    </div>
  );
}

// ---------- GRID ----------
function GridView({
  places,
  dayIndo,
  hour,
  min,
  favorites,
  onToggleFavorite,
  onOpenPlace,
  onReset,
}: {
  places: Place[];
  dayIndo: string;
  hour: number;
  min: number;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onOpenPlace: (id: string) => void;
  onReset: () => void;
}) {
  if (places.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <EmptyState onReset={onReset} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {places.map((p) => {
        const isFav = favorites.includes(p.id);
        const openStatus = isOpenNow(p, dayIndo, hour, min);
        const thumb = placeThumbnail(p);
        const price = p.price_range || "Harga Terjangkau";
        const keyTags = extractHighlights(p);

        return (
          <div
            key={p.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col group"
          >
            <div
              className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer"
              onClick={() => onOpenPlace(p.id)}
            >
              <img
                src={thumb}
                alt={p.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMAGE_MEDIUM;
                }}
              />

              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 shadow-md backdrop-blur-md">
                  {p.category}
                </span>
                {openStatus === true && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/90 text-white backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1"></span>
                    Buka
                  </span>
                )}
                {openStatus === false && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/90 text-white backdrop-blur-sm">
                    Tutup
                  </span>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(p.id);
                }}
                title="Simpan ke Favorit"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 shadow-md flex items-center justify-center transition"
              >
                <i
                  className={`${isFav ? "fa-solid text-rose-500" : "fa-regular"} fa-heart text-sm`}
                ></i>
              </button>

              <div className="absolute bottom-2 left-3 right-3 flex justify-between items-center text-xs">
                <span className="px-2 py-0.5 rounded-lg bg-black/60 text-white backdrop-blur-sm font-medium text-[11px]">
                  <i className="fa-solid fa-tag mr-1 text-emerald-400"></i>
                  {price}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-black/60 text-white backdrop-blur-sm font-medium text-[11px]">
                  <i className="fa-solid fa-location-dot mr-1 text-rose-400"></i>
                  {p.city}
                </span>
              </div>
            </div>

            <div className="p-4 flex-grow flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3
                    onClick={() => onOpenPlace(p.id)}
                    className="font-bold text-slate-900 dark:text-white text-base hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition line-clamp-1"
                  >
                    {p.title}
                  </h3>
                </div>

                <div className="flex items-center space-x-2 text-xs mb-2">
                  <div className="flex items-center text-amber-500 font-bold">
                    <i className="fa-solid fa-star mr-1"></i>
                    <span>{formatRating(p)}</span>
                  </div>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    ({formatCount(p.review_count)} ulasan)
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                  <i className="fa-solid fa-map-pin text-slate-400 mr-1"></i>
                  {p.address || "-"}
                </p>

                <div className="flex flex-wrap gap-1 mb-4">
                  {keyTags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenPlace(p.id)}
                  className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                >
                  <i className="fa-solid fa-eye"></i>
                  <span>Detail &amp; Ulasan</span>
                </button>

                {p.link && (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Buka di Google Maps"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- LIST ----------
function ListView({
  places,
  onOpenPlace,
}: {
  places: Place[];
  onOpenPlace: (id: string) => void;
}) {
  if (places.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        Tidak ada data ditemukan.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {places.map((p) => (
        <div
          key={p.id}
          className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div
            className="flex items-center space-x-3.5 flex-grow cursor-pointer"
            onClick={() => onOpenPlace(p.id)}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
              <img
                src={placeThumbnail(p)}
                alt={p.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMAGE_SMALL;
                }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {p.category}
                </span>
                <span className="text-xs text-slate-400">{p.city}</span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base hover:text-emerald-600 transition mt-0.5">
                {p.title}
              </h4>
              <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                <span className="text-amber-500 font-bold">
                  <i className="fa-solid fa-star mr-1"></i>
                  {formatRating(p)}
                </span>
                <span>({p.review_count || 0} ulasan)</span>
                <span className="hidden sm:inline text-slate-400">•</span>
                <span className="hidden sm:inline font-medium text-emerald-600 dark:text-emerald-400">
                  {p.price_range || "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => onOpenPlace(p.id)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Lihat Detail
            </button>
            {p.link && (
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              >
                <i className="fa-solid fa-map-location-dot"></i>
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- TABLE ----------
function TableView({
  places,
  onOpenPlace,
}: {
  places: Place[];
  onOpenPlace: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider">
            <tr>
              <th className="p-3">Nama Tempat &amp; Kategori</th>
              <th className="p-3">Rating &amp; Ulasan</th>
              <th className="p-3">Rentang Harga</th>
              <th className="p-3">Wilayah</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {places.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Tidak ada data ditemukan.
                </td>
              </tr>
            ) : (
              places.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <td className="p-3">
                    <div
                      className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-emerald-600"
                      onClick={() => onOpenPlace(p.id)}
                    >
                      {p.title}
                    </div>
                    <div className="text-xs text-slate-400">{p.category}</div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="font-bold text-amber-500">
                      ★ {formatRating(p)}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">
                      ({p.review_count || 0})
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs font-medium">
                    {p.price_range || "-"}
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs">{p.city}</td>
                  <td className="p-3 whitespace-nowrap text-xs">
                    {p.open_hours ? (
                      <span className="text-emerald-600 font-medium">
                        Tersedia
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onOpenPlace(p.id)}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition mr-1"
                    >
                      Detail
                    </button>
                    {p.link && (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-700 p-1"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square"></i>
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- SPLIT (list + peta kecil) ----------
function SplitView({
  places,
  onOpenPlace,
}: {
  places: Place[];
  onOpenPlace: (id: string) => void;
}) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Init map sekali
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current).setView([-6.87, 109.13], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Sama seperti FullMap: paksa re-measure supaya tile dirender
    const sizeTimer = setTimeout(() => map.invalidateSize(), 100);

    return () => {
      clearTimeout(sizeTimer);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Update marker setiap daftar berubah
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    places.forEach((p) => {
      const marker = L.marker([p.latitude, p.longitude], {
        icon: createCustomMarkerIcon(p.category),
      });
      marker.on("click", () => onOpenPlace(p.id));
      layer.addLayer(marker);
    });
  }, [places, onOpenPlace]);

  const selectPlace = (p: Place) => {
    mapRef.current?.setView([p.latitude, p.longitude], 15, { animate: true });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-280px)] min-h-[550px]">
      <div className="lg:col-span-5 h-full overflow-y-auto custom-scrollbar space-y-3 pr-2">
        {places.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            Tidak ada data ditemukan.
          </div>
        )}
        {places.map((p) => (
          <div
            key={p.id}
            className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500 cursor-pointer transition"
            onClick={() => selectPlace(p)}
          >
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                {p.title}
              </h4>
              <span className="text-xs font-bold text-amber-500 ml-2">
                ★ {formatRating(p)}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>
                {p.category} • {p.city}
              </span>
              <span className="font-medium text-emerald-600">
                {p.price_range || ""}
              </span>
            </div>
            <div className="mt-2 text-right">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPlace(p.id);
                }}
                className="text-xs text-emerald-600 font-semibold hover:underline"
              >
                Lihat Detail &amp; Foto →
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="lg:col-span-7 h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative">
        <div ref={mapElRef} className="absolute inset-0"></div>
      </div>
    </div>
  );
}

// Ikon pin kustom — dipakai SplitView & FullMap
export function createCustomMarkerIcon(category: string): L.DivIcon {
  const color = getCategoryColor(category);
  return L.divIcon({
    className: "custom-map-pin",
    html: `
      <div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white;">
        <i class="fa-solid fa-utensils" style="transform: rotate(45deg); color: white; font-size: 12px;"></i>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
}
