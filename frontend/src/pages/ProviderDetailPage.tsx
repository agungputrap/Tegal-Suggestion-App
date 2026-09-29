import { useEffect, useState } from "react";
import {
  fetchCategories,
  fetchProvider,
  fetchProviderItems,
  resolvePhotoUrl,
  trackProviderView,
  waChatLink,
  type Category,
  type Item,
  type Provider,
} from "../api";
import { FALLBACK_IMAGE_LARGE } from "../explorer/helpers";
import { BTN_SECONDARY, CARD, ERROR_LINE, LABEL, STATUS_LINE } from "../components/ui";

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

type Props = { id: string; onBack: () => void };

// Detail penyedia sebagai halaman penuh (#4a) — pengganti modal dari
// ListingCard. Deep-link /provider/<id>, data via fetchProvider + items.
// Membuka halaman ini juga mencatat 1 view (trending #4b).
export function ProviderDetailPage({ id, onBack }: Props) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    setStatus("loading");
    setNotFound(false);
    trackProviderView(id);
    fetchProvider(id)
      .then((p) => {
        if (!p) {
          setNotFound(true);
        } else {
          setProvider(p);
        }
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
    fetchProviderItems(id)
      .then(setItems)
      .catch(() => setItems([]));
    fetchCategories()
      .then(setCategories)
      .catch(() => {
        /* nama kategori gagal load tidak fatal — fallback ke category_id */
      });
  }, [id]);

  if (status === "loading") {
    return <p className={STATUS_LINE}>memuat detail penyedia...</p>;
  }

  if (status === "error") {
    return <p className={ERROR_LINE}>gagal memuat data. cek apakah API sedang jalan.</p>;
  }

  if (notFound || !provider) {
    return (
      <div className={`${CARD} p-6 text-center`}>
        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3 text-2xl">
          <i className="fa-solid fa-store-slash"></i>
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Penyedia tidak ditemukan
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Data mungkin sudah dihapus atau tautannya salah.
        </p>
        <button onClick={onBack} className={`${BTN_SECONDARY} mt-4`}>
          <i className="fa-solid fa-arrow-left"></i>
          <span>Kembali</span>
        </button>
      </div>
    );
  }

  const photoSrc = resolvePhotoUrl(provider.photo_url);
  const isJajanan = provider.category_type === "jajanan";
  const categoryName =
    categories.find((c) => c.id === provider.category_id)?.name ??
    provider.category_id;
  const availableItems = (items ?? []).filter((i) => i.available === 1);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className={BTN_SECONDARY}>
        <i className="fa-solid fa-arrow-left"></i>
        <span>Kembali</span>
      </button>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 h-64 sm:h-80 shadow-sm">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={provider.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_IMAGE_LARGE;
            }}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center text-7xl ${
              isJajanan
                ? "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40"
                : "bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40"
            }`}
          >
            {isJajanan ? "🍜" : "🛠️"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
              {categoryName}
            </span>
            {isJajanan && provider.halal === 1 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-600/90 text-white">
                ☪️ Halal
              </span>
            )}
            {provider.area && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                <i className="fa-solid fa-location-dot mr-1"></i>
                {provider.area}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black">{provider.name}</h2>
        </div>
      </div>

      <div className={`${CARD} p-5 space-y-5`}>
        {provider.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {provider.description}
          </p>
        )}

        {/* Items / daftar harga */}
        <div>
          <h4 className={`${LABEL} flex items-center`}>
            <i className="fa-solid fa-list-ul text-emerald-500 mr-2"></i>
            {isJajanan ? "Menu hari ini" : "Daftar jasa & harga"}
          </h4>
          {items === null ? (
            <p className="text-xs text-slate-500">memuat item...</p>
          ) : availableItems.length === 0 ? (
            <p className="text-xs text-slate-400">
              Belum ada daftar {isJajanan ? "menu" : "jasa"} yang tersedia hari
              ini.
            </p>
          ) : (
            <div className="space-y-1.5">
              {availableItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {item.name}
                    </p>
                    {item.note && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.note}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatRupiah(item.price)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="sticky bottom-4 z-20">
        <a
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center space-x-2 shadow-lg"
          href={waChatLink(provider.phone, provider.name)}
          target="_blank"
          rel="noreferrer"
        >
          <i className="fa-brands fa-whatsapp text-lg"></i>
          <span>Chat WhatsApp — {provider.phone}</span>
        </a>
      </div>
    </div>
  );
}
