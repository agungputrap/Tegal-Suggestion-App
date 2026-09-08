import { useEffect, useState } from "react";

// Dark mode bersama (strategi class `dark` pada <html>, sama dengan
// konfigurasi ref). Dipakai ExplorerApp & AppShell supaya tema sinkron.
export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(
    () =>
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.theme = dark ? "dark" : "light";
  }, [dark]);

  return { dark, setDark };
}
