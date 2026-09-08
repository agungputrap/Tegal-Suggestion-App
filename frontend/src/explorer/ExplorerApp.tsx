import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { fetchPlaces } from "../api";
import type { Place } from "../explorer/types";
import {
  extractHighlights,
  isOpenNow,
  nowParts,
} from "./helpers";
import { useDarkMode } from "../hooks/useDarkMode";
import { DirectoryTab } from "./DirectoryTab";
import { FavoritesTab } from "./FavoritesTab";
import { PlaceModal } from "./PlaceModal";

// Tab berat di-code-split (#15): chart.js & leaflet hanya dimuat saat tab
// pertama kali dibuka.
const FullMap = lazy(() => import("./FullMap").then((m) => ({ default: m.FullMap })));
const AnalyticsTab = lazy(() =>
  import("./AnalyticsTab").then((m) => ({ default: m.AnalyticsTab }))
);

function TabFallback() {
  return (
    <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
      <i className="fa-solid fa-spinner fa-spin mr-2"></i>memuat...
    </div>
  );
}

export type ExplorerTab = "directory" | "map" | "analytics" | "favorites";
export type DirectoryView = "grid" | "list" | "table" | "split";

export type QuickFilters = {
  openNow: boolean;
  wifi: boolean;
  outdoor: boolean;
  reservation: boolean;
  budget: boolean;
};

export type SortOption = "rating_desc" | "reviews_desc" | "title_asc";

const FAV_KEY = "tegal_fnb_favs";

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

type Props = {
  onOpenLegacyApp: () => void;
  onOpenAdmin: () => void;
};

export function ExplorerApp({ onOpenLegacyApp, onOpenAdmin }: Props) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const [tab, setTab] = useState<ExplorerTab>("directory");
  const [view, setView] = useState<DirectoryView>("grid");
  const { dark, setDark } = useDarkMode();

  // Filter state (port dari applyFilters di ref)
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortOption>("rating_desc");
  const [quick, setQuick] = useState<QuickFilters>({
    openNow: false,
    wifi: false,
    outdoor: false,
    reservation: false,
    budget: false,
  });

  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [modalPlaceId, setModalPlaceId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // ----- Data -----
  useEffect(() => {
    fetchPlaces()
      .then((data) => {
        setPlaces(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  // ----- Modal: kunci scroll + tombol Escape -----
  useEffect(() => {
    document.body.style.overflow = modalPlaceId ? "hidden" : "";
    if (!modalPlaceId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalPlaceId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modalPlaceId]);

  // ----- Filter & sorting (port dari applyFilters) -----
  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    const { dayIndo, hour, min } = nowParts();

    const result = places.filter((p) => {
      if (q) {
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        const matchAddr = p.address.toLowerCase().includes(q);
        const matchAbout =
          p.about.length > 0 && JSON.stringify(p.about).toLowerCase().includes(q);
        const matchReview =
          p.user_reviews.length > 0 &&
          JSON.stringify(p.user_reviews).toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchAddr && !matchAbout && !matchReview) {
          return false;
        }
      }

      if (city !== "all") {
        if (city === "Jakarta") {
          if (!p.city.toLowerCase().includes("jakarta")) return false;
        } else if (p.city !== city) {
          return false;
        }
      }

      if (category !== "all" && p.category !== category) return false;
      if (minRating > 0 && (p.rating ?? 0) < minRating) return false;

      const aboutJson = JSON.stringify(p.about).toLowerCase();
      if (quick.openNow && isOpenNow(p, dayIndo, hour, min) !== true) return false;
      if (quick.wifi) {
        if (
          !aboutJson.includes("laptop") &&
          !aboutJson.includes("bekerja") &&
          !aboutJson.includes("wifi")
        )
          return false;
      }
      if (quick.outdoor) {
        if (!aboutJson.includes("terbuka") && !aboutJson.includes("outdoor"))
          return false;
      }
      if (quick.reservation) {
        if (!aboutJson.includes("menerima reservasi")) return false;
      }
      if (quick.budget) {
        const pr = (p.price_range || "").toLowerCase();
        if (
          !pr.includes("1–25") &&
          !pr.includes("25–50") &&
          !pr.includes("1-25") &&
          !pr.includes("25-50")
        )
          return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (sort === "rating_desc") {
        if (b.rating === a.rating)
          return (b.review_count || 0) - (a.review_count || 0);
        return (b.rating ?? 0) - (a.rating ?? 0);
      } else if (sort === "reviews_desc") {
        return (b.review_count || 0) - (a.review_count || 0);
      } else if (sort === "title_asc") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [places, search, city, category, minRating, sort, quick]);

  // ----- KPI (port dari calculateRealtimeKPIs) -----
  const kpis = useMemo(() => {
    const { dayIndo, hour, min } = nowParts();
    let totalRev = 0;
    let sumRating = 0;
    let ratedPlaces = 0;
    let openNowCount = 0;
    let photoCount = 0;
    const categories = new Set<string>();

    places.forEach((p) => {
      if (p.rating != null) {
        sumRating += p.rating;
        ratedPlaces++;
      }
      totalRev += p.review_count;
      categories.add(p.category);
      photoCount += p.images.length;
      if (isOpenNow(p, dayIndo, hour, min) === true) openNowCount++;
    });

    return {
      totalPlaces: places.length,
      avgRating: (sumRating / (ratedPlaces || 1)).toFixed(2),
      totalReviews: totalRev,
      totalCategories: categories.size,
      openNowCount,
      photoCount,
    };
  }, [places]);

  const categoriesWithCount = useMemo(() => {
    const counts = new Map<string, number>();
    places.forEach((p) => counts.set(p.category, (counts.get(p.category) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [places]);

  // Legenda peta (bucketing sama dengan ref: Kafe 19, Restoran 17, Kedai Kopi
  // 16, Seafood 6, Indonesian 4, Lainnya = sisanya)
  const mapLegend = useMemo(() => {
    const b = { kafe: 0, restoran: 0, kopi: 0, seafood: 0, indonesia: 0, lainnya: 0 };
    places.forEach((p) => {
      const c = p.category.toLowerCase();
      if (c.includes("kafe")) b.kafe++;
      else if (c === "restoran") b.restoran++;
      else if (c.includes("kopi")) b.kopi++;
      else if (c.includes("seafood")) b.seafood++;
      else if (c.includes("indonesia")) b.indonesia++;
      else b.lainnya++;
    });
    return [
      { label: "Kafe", color: "bg-amber-500", count: b.kafe },
      { label: "Restoran", color: "bg-blue-500", count: b.restoran },
      { label: "Kedai Kopi", color: "bg-orange-600", count: b.kopi },
      { label: "Seafood", color: "bg-teal-500", count: b.seafood },
      { label: "Indonesian", color: "bg-rose-500", count: b.indonesia },
      { label: "Lainnya", color: "bg-purple-500", count: b.lainnya },
    ];
  }, [places]);

  // ----- Handlers -----
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setSearch("");
    setCity("all");
    setCategory("all");
    setMinRating(0);
    setSort("rating_desc");
    setQuick({ openNow: false, wifi: false, outdoor: false, reservation: false, budget: false });
  }, []);

  const modalPlace = modalPlaceId
    ? places.find((p) => p.id === modalPlaceId) ?? null
    : null;

  // ----- Export (port dari exportData) -----
  const exportData = useCallback(
    (format: "json" | "csv") => {
      setExportOpen(false);
      const download = (href: string, name: string) => {
        const a = document.createElement("a");
        a.href = href;
        a.download = name;
        a.click();
      };

      if (format === "json") {
        download(
          "data:text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(filteredPlaces, null, 2)),
          "tegal-fnb-filtered.json"
        );
        return;
      }

      if (filteredPlaces.length === 0) return;
      const headers = [
        "Title",
        "Category",
        "Rating",
        "ReviewCount",
        "PriceRange",
        "City",
        "Address",
        "Link",
      ];
      const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
      const csvRows = [headers.join(",")];
      filteredPlaces.forEach((p) => {
        csvRows.push(
          [
            esc(p.title),
            esc(p.category),
            String(p.rating ?? 0),
            String(p.review_count ?? 0),
            esc(p.price_range),
            esc(p.city),
            esc(p.address),
            esc(p.link),
          ].join(",")
        );
      });
      download(
        "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n")),
        "tegal-fnb-filtered.csv"
      );
    },
    [filteredPlaces]
  );

  return (
    <div className="explorer bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 min-h-screen flex flex-col transition-colors duration-200">
      {/* Top Meta Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
              <i className="fa-solid fa-map-location-dot mr-1"></i> Data Gmaps
            </span>
            <span className="font-medium">
              Koleksi Data F&amp;B &amp; Kuliner Tegal &amp; Sekitarnya
            </span>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <span>
              <i className="fa-solid fa-store mr-1"></i> {kpis.totalPlaces} Tempat
            </span>
            <span className="hidden sm:inline">
              <i className="fa-solid fa-star text-amber-300 mr-1"></i> Avg{" "}
              {kpis.avgRating}★
            </span>
            <span className="hidden md:inline">
              <i className="fa-solid fa-comments mr-1"></i>{" "}
              {kpis.totalReviews.toLocaleString("id-ID")}+ Ulasan
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <i className="fa-solid fa-utensils text-lg"></i>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 via-emerald-800 to-teal-700 dark:from-white dark:via-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                  Tegal F&amp;B Explorer
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Direktori &amp; Analisis Kuliner Google Maps
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex space-x-1 lg:space-x-2">
              {(
                [
                  ["directory", "fa-table-cells-large", "Direktori"],
                  ["map", "fa-map-location-dot", "Peta Interaktif"],
                  ["analytics", "fa-chart-pie", "Dashboard & Statistik"],
                ] as const
              ).map(([id, icon, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-3.5 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-2 ${
                    tab === id
                      ? "text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/30"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <i className={`fa-solid ${icon}`}></i>
                  <span>{label}</span>
                </button>
              ))}
              <button
                onClick={() => setTab("favorites")}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-2 relative ${
                  tab === "favorites"
                    ? "text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/30"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <i className="fa-solid fa-heart text-rose-500"></i>
                <span>Tersimpan</span>
                {favorites.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-xs">
                    {favorites.length}
                  </span>
                )}
              </button>
            </nav>

            {/* Right Action Controls */}
            <div className="flex items-center space-x-2">
              {/* Akses ke app inti (checkin) & admin — selalu tampil, label
                  disembunyikan di layar kecil supaya tetap bisa dijangkau */}
              <button
                onClick={onOpenLegacyApp}
                title="Buka Hari Ini — app jajan & jasa"
                className="flex p-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition items-center space-x-1.5"
              >
                <i className="fa-solid fa-store"></i>
                <span className="hidden lg:inline">Buka Hari Ini</span>
              </button>
              <button
                onClick={onOpenAdmin}
                title="Admin"
                className="flex p-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition items-center"
              >
                <i className="fa-solid fa-user-shield"></i>
              </button>

              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setExportOpen((v) => !v)}
                  className="p-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition flex items-center space-x-1.5"
                >
                  <i className="fa-solid fa-download"></i>
                  <span className="hidden sm:inline">Ekspor</span>
                </button>
                {exportOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50">
                    <button
                      onClick={() => exportData("json")}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                    >
                      <i className="fa-solid fa-code text-amber-500"></i>
                      <span>Download JSON</span>
                    </button>
                    <button
                      onClick={() => exportData("csv")}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                    >
                      <i className="fa-solid fa-file-csv text-emerald-500"></i>
                      <span>Download CSV</span>
                    </button>
                    <button
                      onClick={() => {
                        setExportOpen(false);
                        window.print();
                      }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                    >
                      <i className="fa-solid fa-print text-indigo-500"></i>
                      <span>Cetak / PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDark((v) => !v)}
                title="Toggle Dark/Light Mode"
                className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <i
                  className={`fa-solid ${
                    dark ? "fa-sun text-amber-400" : "fa-moon text-slate-600"
                  }`}
                ></i>
              </button>
            </div>
          </div>

          {/* Mobile Tabs Bar */}
          <div className="flex md:hidden border-t border-slate-200 dark:border-slate-800 overflow-x-auto py-1 space-x-1">
            {(
              [
                ["directory", "fa-table-cells-large", "Direktori"],
                ["map", "fa-map-location-dot", "Peta"],
                ["analytics", "fa-chart-pie", "Statistik"],
                ["favorites", "fa-heart", "Tersimpan"],
              ] as const
            ).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap ${
                  tab === id
                    ? "text-emerald-600 font-semibold"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <i
                  className={`fa-solid ${icon} mr-1 ${
                    id === "favorites" ? "text-rose-500" : ""
                  }`}
                ></i>{" "}
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Hero KPI Metric Cards */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Class Tailwind ditulis statis (tidak bisa dinamis via template string) */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-xl flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <i className="fa-solid fa-shop"></i>
            </div>
            <div>
              <div className="text-lg font-extrabold text-emerald-950 dark:text-emerald-200">
                {kpis.totalPlaces}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Total Tempat
              </div>
            </div>
          </div>

          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-3 rounded-xl flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <i className="fa-solid fa-star"></i>
            </div>
            <div>
              <div className="text-lg font-extrabold text-amber-950 dark:text-amber-200">
                {kpis.avgRating} ★
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Rata-rata Rating
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-3 rounded-xl flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <i className="fa-solid fa-comment-dots"></i>
            </div>
            <div>
              <div className="text-lg font-extrabold text-blue-950 dark:text-blue-200">
                {kpis.totalReviews.toLocaleString("id-ID")}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Total Ulasan
              </div>
            </div>
          </div>

          <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 p-3 rounded-xl flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <i className="fa-solid fa-layer-group"></i>
            </div>
            <div>
              <div className="text-lg font-extrabold text-purple-950 dark:text-purple-200">
                {kpis.totalCategories}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Kategori Kuliner
              </div>
            </div>
          </div>

          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-3 rounded-xl flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <i className="fa-solid fa-clock"></i>
            </div>
            <div>
              <div className="text-lg font-extrabold text-rose-950 dark:text-rose-200">
                {status === "ready" ? `${kpis.openNowCount} Tempat` : "--"}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Buka Saat Ini
              </div>
            </div>
          </div>

          <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 p-3 rounded-xl flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <i className="fa-solid fa-camera"></i>
            </div>
            <div>
              <div className="text-lg font-extrabold text-teal-950 dark:text-teal-200">
                {kpis.photoCount}+
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Galeri Foto
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Content */}
      {tab === "directory" && (
        <DirectoryTab
          places={filteredPlaces}
          totalCount={places.length}
          status={status}
          view={view}
          onViewChange={setView}
          filters={{
            search,
            city,
            category,
            minRating,
            sort,
            quick,
            categories: categoriesWithCount,
          }}
          onFilterChange={{
            setSearch,
            setCity,
            setCategory,
            setMinRating,
            setSort,
            setQuick,
          }}
          onReset={resetFilters}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onOpenPlace={setModalPlaceId}
        />
      )}

      {tab === "map" && (
        <Suspense fallback={<TabFallback />}>
          <FullMap places={filteredPlaces} legend={mapLegend} onOpenPlace={setModalPlaceId} />
        </Suspense>
      )}

      {tab === "analytics" && (
        <Suspense fallback={<TabFallback />}>
          <AnalyticsTab places={places} dark={dark} onOpenPlace={setModalPlaceId} />
        </Suspense>
      )}

      {tab === "favorites" && (
        <FavoritesTab
          places={places}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onClearAll={() => {
            if (confirm("Yakin ingin mengosongkan semua daftar tempat tersimpan?")) {
              setFavorites([]);
              localStorage.removeItem(FAV_KEY);
            }
          }}
          onOpenPlace={setModalPlaceId}
          onSwitchToDirectory={() => setTab("directory")}
        />
      )}

      {/* Place Detail Modal */}
      {modalPlace && (
        <PlaceModal
          place={modalPlace}
          isFav={favorites.includes(modalPlace.id)}
          onToggleFavorite={toggleFavorite}
          highlights={extractHighlights(modalPlace)}
          onClose={() => setModalPlaceId(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Tegal F&amp;B Data Viewer
            </span>
            <span>•</span>
            <span>{kpis.totalPlaces} Tempat Terdata</span>
          </div>
          <div>
            Sumber Data: Google Maps Export (<code>tegal-fnb.csv</code>)
          </div>
        </div>
      </footer>
    </div>
  );
}
