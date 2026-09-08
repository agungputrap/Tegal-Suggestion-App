import { useState } from "react";
import { AdminPage } from "./pages/AdminPage";
import { ConsumerPage } from "./pages/ConsumerPage";
import { OwnerPortalPage } from "./pages/OwnerPortalPage";
import { ProviderPage } from "./pages/ProviderPage";
import { ExplorerApp } from "./explorer/ExplorerApp";
import { AppShell, type CoreView } from "./components/AppShell";

// 'explorer' = halaman utama (port ref Tegal F&B Explorer).
// View lain = app inti (Hari Ini / Jasa Saya / Admin) dengan chrome
// bergaya sama lewat AppShell. 'kelola' = portal pemilik via magic-link.
type View = CoreView | "explorer" | "kelola";

// Deep-link: ?view=hari-ini|saya|admin, ?kelola=<token>, atau path /kelola/<token>
// (Cloudflare Pages SPA fallback melayani path apa pun ke index.html).
function parseInitialRoute(): { view: View; kelolaToken: string | null } {
  const params = new URLSearchParams(window.location.search);
  const kelolaParam = params.get("kelola");

  const kelolaPath = window.location.pathname.match(/^\/kelola\/([A-Za-z0-9]+)\/?$/);
  if (kelolaPath) return { view: "kelola", kelolaToken: kelolaPath[1] };
  if (kelolaParam) return { view: "kelola", kelolaToken: kelolaParam };

  const v = params.get("view");
  if (v === "hari-ini" || v === "saya" || v === "admin") {
    return { view: v, kelolaToken: null };
  }
  return { view: "explorer", kelolaToken: null };
}

export default function App() {
  const [{ view, kelolaToken }, setRoute] = useState(parseInitialRoute);

  function setView(view: View) {
    setRoute({ view, kelolaToken });
  }

  if (view === "kelola" && kelolaToken) {
    return <OwnerPortalPage token={kelolaToken} />;
  }

  if (view === "explorer") {
    return (
      <ExplorerApp
        onOpenLegacyApp={() => setView("hari-ini")}
        onOpenAdmin={() => setView("admin")}
      />
    );
  }

  const coreView: CoreView = view === "kelola" ? "hari-ini" : view;

  return (
    <AppShell
      active={coreView}
      onTabChange={setView}
      onBackToExplorer={() => setView("explorer")}
    >
      {view === "hari-ini" && <ConsumerPage />}
      {view === "saya" && <ProviderPage />}
      {view === "admin" && <AdminPage />}
    </AppShell>
  );
}
