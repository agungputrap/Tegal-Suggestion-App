import type { ReactNode } from "react";
import { useDarkMode } from "../hooks/useDarkMode";
import { BottomNav } from "./BottomNav";

// Chrome halaman app inti (Hari Ini / Jasa Saya / Admin) — mengikuti gaya
// header Explorer (banner gradient + glass header + tab) supaya seluruh app
// terasa satu template. Konten halaman dilewatkan sebagai children.
export type CoreView = "hari-ini" | "saya" | "admin";

type Props = {
  active: CoreView;
  onTabChange: (view: CoreView) => void;
  onBackToExplorer: () => void;
  children: ReactNode;
};

// Nav publik — Admin SENGAJA tidak ada di nav (bukan bagian perjalanan
// konsumen; ia tetap bisa dijangkau lewat ?view=admin atau link kecil
// di footer). CoreView "admin" tetap ada untuk route-nya.
const TABS: { id: CoreView; icon: string; label: string; short: string }[] = [
  { id: "hari-ini", icon: "fa-sun", label: "Hari Ini", short: "Hari Ini" },
  { id: "saya", icon: "fa-bullhorn", label: "Jasa Saya", short: "Jasa Saya" },
];

export function AppShell({
  active,
  onTabChange,
  onBackToExplorer,
  children,
}: Props) {
  const { dark, setDark } = useDarkMode();

  return (
    <div className="explorer bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 min-h-screen flex flex-col transition-colors duration-200">
      {/* Top Meta Banner — strip netral gelap (DESIGN.md: tanpa gradient) */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-slate-200">
              <i className="fa-solid fa-bolt mr-1"></i> App Inti
            </span>
            <span className="font-medium">
              Checkin harian — jajanan &amp; jasa sekitar Tegal
            </span>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <span>
              <i className="fa-solid fa-location-dot mr-1"></i> Live via GPS
            </span>
            <span className="hidden sm:inline">
              <i className="fa-brands fa-whatsapp mr-1"></i> Order via WhatsApp
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <i className="fa-solid fa-store text-lg"></i>
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Jajan+Jasa Tegal
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Buka Hari Ini — checkin harian penyedia
                </p>
              </div>
            </div>

            {/* Tabs (desktop) */}
            <nav className="hidden md:flex space-x-1 lg:space-x-2">
              {TABS.map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={`px-3.5 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-2 ${
                    active === id
                      ? "text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/30"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <i className={`fa-solid ${icon}`}></i>
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            {/* Kembali ke Explorer + toggle tema */}
            <div className="flex items-center space-x-2">
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
              <button
                onClick={onBackToExplorer}
                title="Kembali ke Tegal F&B Explorer"
                className="flex p-2 text-sm bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg transition items-center space-x-1.5"
              >
                <i className="fa-solid fa-arrow-left"></i>
                <span className="hidden sm:inline">Explorer</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6 w-full flex-grow">
        {children}
      </main>

      {/* Bottom nav mobile (tier 1 #36) — menggantikan tab atas mobile,
          one-handed reach + safe-area */}
      <BottomNav
        items={TABS.map(({ id, icon, short }) => ({
          key: id,
          icon,
          label: short,
          active: active === id,
          onClick: () => onTabChange(id),
        }))}
      />

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-4 text-center text-xs text-slate-500 dark:text-slate-400 mt-auto">
        Jajan+Jasa Tegal ·{" "}
        <button
          onClick={onBackToExplorer}
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          kembali ke Tegal F&amp;B Explorer
        </button>
        {" · "}
        {/* Link admin sengaja diskret — bukan navigasi publik */}
        <button
          onClick={() => onTabChange("admin")}
          className="text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 hover:underline"
        >
          admin
        </button>
      </footer>
    </div>
  );
}
