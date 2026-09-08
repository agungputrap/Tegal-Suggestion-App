import { useEffect, useMemo, useState } from "react";
import { fetchCategories, fetchListings } from "../api";
import type { Category, Listing } from "../api";
import { CategoryFilter } from "../components/CategoryFilter";
import { ListingCard } from "../components/ListingCard";
import { MapView } from "../components/MapView";
import { ERROR_LINE, STATUS_LINE } from "../components/ui";

// Default: pusat kota Tegal, dipakai kalau geolocation browser ditolak
const DEFAULT_CENTER = { lat: -6.8694, lng: 109.1402 };

function todayLong(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function ConsumerPage() {
  const [filter, setFilter] = useState<"semua" | "jajanan" | "jasa">("semua");
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  // Ambil lokasi user kalau diizinkan
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        /* diamkan; pakai DEFAULT_CENTER */
      },
      { timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {
        /* kategori gagal load tidak fatal untuk tampilan awal */
      });
  }, []);

  useEffect(() => {
    setStatus("loading");
    fetchListings({
      type: filter === "semua" ? undefined : filter,
      lat: center.lat,
      lng: center.lng,
      radius: 5,
    })
      .then((data) => {
        setListings(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [filter, center]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  return (
    <div className="space-y-5">
      {/* Header halaman */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center">
            <i className="fa-solid fa-sun text-amber-500 mr-2"></i> Buka Hari
            Ini
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Jajanan &amp; jasa yang aktif di sekitarmu — sekarang, bukan
            minggu lalu.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900">
          <i className="fa-regular fa-calendar mr-1.5"></i>
          {todayLong()}
        </span>
      </div>

      <CategoryFilter active={filter} onChange={setFilter} />

      {/* Peta */}
      <div className="relative h-[360px] sm:h-[440px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <MapView listings={listings} categories={categories} center={center} />
      </div>

      {/* Daftar listing */}
      {status === "loading" && <p className={STATUS_LINE}>memuat status hari ini...</p>}

      {status === "error" && (
        <p className={ERROR_LINE}>
          gagal memuat data. cek apakah API sedang jalan.
        </p>
      )}

      {status === "ready" && listings.length === 0 && (
        <div className={`${STATUS_LINE} py-12`}>
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400 text-xl">
            <i className="fa-solid fa-store-slash"></i>
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Belum ada yang checkin
          </p>
          <p className="mt-1">Coba ganti kategori, atau cek lagi nanti pagi.</p>
        </div>
      )}

      {status === "ready" && listings.length > 0 && (
        <>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Menampilkan{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {listings.length}
            </span>{" "}
            penyedia aktif
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                categoryName={
                  categoryById.get(l.category_id)?.name ?? l.category_id
                }
                categoryIcon={categoryById.get(l.category_id)?.icon}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
