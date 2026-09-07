import { useEffect, useMemo, useState } from "react";
import { fetchCategories, fetchListings } from "../api";
import type { Category, Listing } from "../api";
import { CategoryFilter } from "../components/CategoryFilter";
import { ListingCard } from "../components/ListingCard";
import { MapView } from "../components/MapView";

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
    <>
      <header className="header">
        <h1 className="header__title">Buka Hari Ini</h1>
        <p className="header__subtitle">
          Jajanan &amp; jasa yang aktif di sekitarmu — sekarang, bukan minggu
          lalu.
        </p>
        <span className="header__today">{todayLong()}</span>
      </header>

      <CategoryFilter active={filter} onChange={setFilter} />

      <MapView listings={listings} categories={categories} center={center} />

      <main className="list">
        {status === "loading" && (
          <p className="status-line">memuat status hari ini...</p>
        )}

        {status === "error" && (
          <p className="status-line">
            gagal memuat data. cek apakah API sedang jalan.
          </p>
        )}

        {status === "ready" && listings.length === 0 && (
          <div className="empty-state">
            <p className="empty-state__title">Belum ada yang checkin</p>
            <p>Coba ganti kategori, atau cek lagi nanti pagi.</p>
          </div>
        )}

        {status === "ready" &&
          listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              categoryName={categoryById.get(l.category_id)?.name ?? l.category_id}
              categoryIcon={categoryById.get(l.category_id)?.icon}
            />
          ))}
      </main>
    </>
  );
}
