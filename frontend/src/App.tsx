import { Suspense, lazy, useState } from "react";
import { AdminPage } from "./pages/AdminPage";
import { ConsumerPage } from "./pages/ConsumerPage";
import { OwnerPortalPage } from "./pages/OwnerPortalPage";
import { ProviderPage } from "./pages/ProviderPage";
import { AppShell, type CoreView } from "./components/AppShell";

// Explorer (leaflet + markercluster + chart.js) di-code-split supaya entry
// bundle app inti tetap kecil (#15). Fallback mengikuti gaya Explorer.
const ExplorerApp = lazy(() =>
  import("./explorer/ExplorerApp").then((m) => ({ default: m.ExplorerApp }))
);

function RouteFallback() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        <i className="fa-solid fa-spinner fa-spin mr-2"></i>memuat halaman...
      </p>
    </div>
  );
}

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
      <Suspense fallback={<RouteFallback />}>
        <ExplorerApp
          onOpenLegacyApp={() => setView("hari-ini")}
          onOpenAdmin={() => setView("admin")}
        />
      </Suspense>
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
