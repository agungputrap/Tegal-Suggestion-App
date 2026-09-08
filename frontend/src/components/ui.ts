// Kelas Tailwind bersama untuk halaman app inti (Hari Ini / Jasa Saya / Admin)
// supaya bahasa visualnya konsisten dengan halaman Explorer (port ref).
export const CARD =
  "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm";
export const LABEL =
  "block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5";
export const INPUT =
  "w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition";
export const BTN_PRIMARY =
  "inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition";
export const BTN_SECONDARY =
  "inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-60";
export const BTN_DANGER =
  "inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/60 transition disabled:opacity-60";
export const STATUS_LINE =
  "text-xs text-slate-500 dark:text-slate-400 text-center py-2";
export const ERROR_LINE = "text-xs text-rose-500 text-center py-2";

// Pill filter gaya "Filter Cepat" di Explorer (qf-btn)
export function pillClass(active: boolean): string {
  return `qf-btn px-2.5 py-1 rounded-full border text-xs transition ${
    active
      ? "active border-emerald-600"
      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500"
  }`;
}

export function selectClass(extra = ""): string {
  return `${extra} px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500`;
}
