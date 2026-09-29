import { BTN_SECONDARY } from "./ui";

// Status error ramah pengguna + tombol coba lagi (tier 0 #34).
// Copy teknis ala developer ("Pastikan API berjalan di GET /places")
// diganti bahasa pengguna; onRetry memanggil ulang fetch masing-masing
// halaman, jadi error tidak lagi jalan buntu.
export function ErrorState({
  onRetry,
  title = "Koneksi terputus",
  message = "Sambungan internetmu mungkin bermasalah. Coba lagi ya.",
}: {
  onRetry: () => void;
  title?: string;
  message?: string;
}) {
  return (
    <div className="py-10 text-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto text-2xl">
        <i className="fa-solid fa-plug-circle-xmark"></i>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-white">
          {title}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {message}
        </p>
      </div>
      <button className={BTN_SECONDARY} onClick={onRetry}>
        <i className="fa-solid fa-rotate-right"></i>
        <span>Coba lagi</span>
      </button>
    </div>
  );
}
