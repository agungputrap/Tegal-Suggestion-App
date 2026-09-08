import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Place } from "./types";
import { extractHighlights, formatCount, formatRating } from "./helpers";

type Props = {
  places: Place[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onClearAll: () => void;
  onOpenPlace: (id: string) => void;
  onSwitchToDirectory: () => void;
};

export function FavoritesTab({
  places,
  favorites,
  onToggleFavorite,
  onClearAll,
  onOpenPlace,
  onSwitchToDirectory,
}: Props) {
  const favPlaces = useMemo(
    () => places.filter((p) => favorites.includes(p.id)),
    [places, favorites],
  );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-grow space-y-6">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
            <i className="fa-solid fa-heart text-rose-500 mr-2"></i> Tempat
            Kuliner Tersimpan &amp; Komparasi
          </h3>
          <p className="text-xs text-slate-500">
            Tandai tempat favorit Anda untuk membandingkan fasilitas, harga, dan
            rating secara berdampingan.
          </p>
        </div>
        <button
          onClick={onClearAll}
          className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition font-medium"
        >
          <i className="fa-solid fa-trash mr-1"></i> Kosongkan Daftar
        </button>
      </div>

      {/* Favorites Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {favPlaces.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto mb-3 text-2xl">
              <i className="fa-regular fa-heart"></i>
            </div>
            <h3 className="text-base font-bold">Belum ada tempat tersimpan</h3>
            <p className="text-xs text-slate-500 mt-1">
              Klik ikon hati pada kartu tempat kuliner di direktori untuk
              menyimpannya ke sini.
            </p>
            <button
              onClick={onSwitchToDirectory}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition"
            >
              Jelajahi Direktori
            </button>
          </div>
        ) : (
          favPlaces.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {p.category}
                  </span>
                  <h4
                    onClick={() => onOpenPlace(p.id)}
                    className="font-bold text-slate-900 dark:text-white text-base mt-1 hover:text-emerald-600 cursor-pointer"
                  >
                    {p.title}
                  </h4>
                  <div className="text-xs text-slate-500 mt-1">
                    <span className="text-amber-500 font-bold">
                      ★ {formatRating(p)}
                    </span>
                    <span> ({formatCount(p.review_count)} ulasan)</span>
                    <span className="mx-1">•</span>
                    <span>{p.price_range || "-"}</span>
                  </div>
                </div>
                <button
                  onClick={() => onToggleFavorite(p.id)}
                  className="text-rose-500 hover:text-rose-700 p-1"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => onOpenPlace(p.id)}
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                >
                  Lihat Detail Lengkap →
                </button>
                {p.link && (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    <i className="fa-solid fa-map-location-dot mr-1"></i>Maps
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comparison table kalau >= 2 tempat tersimpan */}
      {favPlaces.length >= 2 && <ComparisonTable places={favPlaces} />}
    </section>
  );
}

function ComparisonTable({ places }: { places: Place[] }) {
  const makeRow = (label: string, render: (p: Place) => ReactNode) => (
    <tr className="border-b dark:border-slate-800" key={label}>
      <td className="p-3 font-semibold bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border dark:border-slate-700">
        {label}
      </td>
      {places.map((p) => (
        <td key={p.id} className="p-3 border dark:border-slate-700">
          {render(p)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <h4 className="text-sm font-bold mb-4 flex items-center">
        <i className="fa-solid fa-code-compare text-emerald-500 mr-2"></i> Tabel
        Komparasi Berdampingan
      </h4>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <th className="p-3 border dark:border-slate-700 w-32">
                Kriteria
              </th>
              {places.map((p) => (
                <th
                  key={p.id}
                  className="p-3 border dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                >
                  {p.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {makeRow("Kategori", (p) => p.category)}
            {makeRow("Rating", (p) => (
              <span>
                <span className="text-amber-500 font-bold">
                  ★ {formatRating(p)}
                </span>{" "}
                ({p.review_count || 0})
              </span>
            ))}
            {makeRow("Rentang Harga", (p) => p.price_range || "-")}
            {makeRow("Wilayah", (p) => p.city)}
            {makeRow("Alamat", (p) => p.address)}
            {makeRow("Telepon", (p) =>
              p.phone ? (
                <a href={`tel:${p.phone}`} className="text-emerald-600">
                  {p.phone}
                </a>
              ) : (
                "-"
              ),
            )}
            {makeRow(
              "Fasilitas Populer",
              (p) => extractHighlights(p).slice(0, 4).join(", ") || "-",
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
