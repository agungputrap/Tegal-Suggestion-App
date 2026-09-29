export type BottomNavItem = {
  key: string;
  icon: string;
  label: string;
  active?: boolean;
  iconClass?: string; // mis. rose untuk hati Tersimpan
  onClick: () => void;
};

// Bottom nav mobile one-handed (tier 1 #36) — 3-4 item ikon+label,
// menempel bawah dengan aman di atas home-indicator iOS
// (env(safe-area-inset-bottom)). Desktop tetap pakai tab atas.
export function BottomNav({
  items,
  hideAt = "md",
}: {
  items: BottomNavItem[];
  hideAt?: "md" | "lg";
}) {
  const hiddenClass = hideAt === "md" ? "md:hidden" : "lg:hidden";
  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 glass-nav ${hiddenClass}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-7xl mx-auto flex items-stretch justify-around">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={it.onClick}
            className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition ${
              it.active
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <i
              className={`fa-solid ${it.icon} text-base ${it.iconClass ?? ""}`}
            ></i>
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
