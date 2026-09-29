import { useEffect, useState } from "react";

// Dark mode bersama (strategi class `dark` pada <html>, sama dengan
// konfigurasi ref). Dipakai ExplorerApp & AppShell supaya tema sinkron.
export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(
    () =>
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.theme = dark ? "dark" : "light";
  }, [dark]);

  return { dark, setDark };
}

// Versi read-only: pantau class .dark di <html> siapa pun yang men-toggle
// (ExplorerApp, AppShell, portal). Dipakai komponen peta supaya tile ikut
// gelap tanpa menyalakan state tema sendiri (tier 0 #34).
const prefersDark =
  typeof localStorage !== "undefined" &&
  (localStorage.theme === "dark" ||
    (!("theme" in localStorage) &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches));

export function useDarkClass(): boolean {
  const [dark, setDark] = useState<boolean>(() =>
    document.documentElement.classList.contains("dark"),
  );
  // Mulai dari preferensi aktual kalau class belum sempat dipasang
  // (effect anak jalan sebelum effect parent yang toggle class).
  useEffect(() => {
    if (prefersDark && !document.documentElement.classList.contains("dark")) {
      setDark(true);
    }
  }, []);
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() =>
      setDark(el.classList.contains("dark")),
    );
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}
