import { useState } from "react";
import { AdminPage } from "./pages/AdminPage";
import { ConsumerPage } from "./pages/ConsumerPage";
import { ProviderPage } from "./pages/ProviderPage";
import { ExplorerApp } from "./explorer/ExplorerApp";
import { AppShell, type CoreView } from "./components/AppShell";

// 'explorer' = halaman utama (port ref Tegal F&B Explorer).
// View lain = app inti (Hari Ini / Jasa Saya / Admin) dengan chrome
// bergaya sama lewat AppShell — tidak ada lagi shell mobile lama.
type View = CoreView | "explorer";

// Deep-link sederhana: ?view=hari-ini|saya|admin
function initialView(): View {
  const v = new URLSearchParams(window.location.search).get("view");
  return v === "hari-ini" || v === "saya" || v === "admin" ? v : "explorer";
}

export default function App() {
  const [view, setView] = useState<View>(initialView);

  if (view === "explorer") {
    return (
      <ExplorerApp
        onOpenLegacyApp={() => setView("hari-ini")}
        onOpenAdmin={() => setView("admin")}
      />
    );
  }

  return (
    <AppShell
      active={view}
      onTabChange={setView}
      onBackToExplorer={() => setView("explorer")}
    >
      {view === "hari-ini" && <ConsumerPage />}
      {view === "saya" && <ProviderPage />}
      {view === "admin" && <AdminPage />}
    </AppShell>
  );
}
