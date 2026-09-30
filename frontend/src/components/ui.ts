// Kelas Tailwind bersama seluruh app — SATU-SATUNYA sumber kelas visual
// bersama. Token & aturannya di DESIGN.md (root); ubah keduanya berbarengan.
//
// Prinsip (ringkas — detail di DESIGN.md):
//   - Pemisahan elemen lewat shadow/latar/spacing, BUKAN border. Kartu &
//     tombol tanpa border; input tetap berborder (afordansi form).
//   - Satu aksen: emerald-600 (aksi primer/aktif/fokus). amber = sinyal live.
//     rose = destruktif. Tanpa gradient di mana pun.
//   - Radius: kartu rounded-xl, kontrol rounded-lg, pill rounded-full,
//     modal rounded-2xl.

// Elevasi kartu (light): shadow lembut berlapis; dark: ring samar karena
// shadow nyaris tak terlihat di latar gelap.
const CARD_ELEVATION =
  "shadow-[0_1px_2px_rgba(2,6,23,0.05),0_12px_32px_-16px_rgba(2,6,23,0.10)] dark:shadow-none dark:ring-1 dark:ring-slate-800/60";

export const CARD = `bg-white dark:bg-slate-900 rounded-xl ${CARD_ELEVATION}`;

// Kartu sekunder di atas latar yang sudah kartu (nested) — tanpa elevasi.
export const CARD_SOFT =
  "bg-slate-50 dark:bg-slate-800/60 rounded-xl";

export const LABEL =
  "block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5";

export const INPUT =
  "w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition";

export const BTN_PRIMARY =
  "inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition";

// Secondary = tint netral (tanpa border) — dulu outline putih-abu yang bikin
// semua tombol kelihatan "stiker".
export const BTN_SECONDARY =
  "inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition disabled:opacity-60";

export const BTN_DANGER =
  "inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 rounded-lg text-xs font-semibold transition disabled:opacity-60";

export const STATUS_LINE =
  "text-xs text-slate-500 dark:text-slate-400 text-center py-2";
// Dark variant: rose-500 di atas latar gelap kurang terang — pakai rose-400
export const ERROR_LINE =
  "text-xs text-rose-500 dark:text-rose-400 text-center py-2";

// Strip statistik KPI (DESIGN.md aturan 6): angka + label, pemisah tipis
// divide-x — bukan kartu pelangi. Pakai: <div className={STAT_STRIP}>…</div>
export const STAT_STRIP =
  "flex divide-x divide-slate-100 dark:divide-slate-800";

// Satu sel statistik: angka tabular + caption. accent="live" memberi warna
// emerald pada angka (khusus metrik "buka sekarang").
export function statClass(accent = false): string {
  return `flex-1 px-3 py-1 text-center ${
    accent
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-slate-900 dark:text-slate-100"
  }`;
}

// Pill filter (qf-btn) — tanpa border: nonaktif tint netral, aktif solid
// emerald (fill dari .qf-btn.active di explorer.css). min-h 44px = touch
// target tier 0 #34.
export function pillClass(active: boolean): string {
  return `qf-btn inline-flex items-center px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition ${
    active
      ? "active bg-emerald-600 text-white hover:bg-emerald-700"
      : "bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
  }`;
}

export function selectClass(extra = ""): string {
  return `${extra} px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500`;
}
