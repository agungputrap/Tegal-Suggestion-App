import { Suspense, lazy, useEffect, useState } from "react";
import { AdminPage } from "./pages/AdminPage";
import { ConsumerPage } from "./pages/ConsumerPage";
import { OwnerPortalPage } from "./pages/OwnerPortalPage";
import { ProviderDetailPage } from "./pages/ProviderDetailPage";
import { ProviderPage } from "./pages/ProviderPage";
import { AppShell, type CoreView } from "./components/AppShell";

// Explorer (leaflet + markercluster + chart.js) di-code-split supaya entry
// bundle app inti tetap kecil (#15). Fallback mengikuti gaya Explorer.
const ExplorerApp = lazy(() =>
  import("./explorer/ExplorerApp").then((m) => ({ default: m.ExplorerApp })),
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
// 'provider' = detail penyedia halaman penuh (#4a).
type View = CoreView | "explorer" | "kelola" | "provider";

type RouteState = {
  view: View;
  kelolaToken: string | null;
  providerId: string | null;
  claimPlaceId: string | null; // klaim listing direktori (fase 3 #31)
  placeId: string | null; // deep-link modal direktori (tier 2 #36)
};

// Deep-link: ?view=hari-ini|saya|admin, ?kelola=<token>, path /kelola/<token>,
// path /provider/<id> — id penyedia berbentuk UUID (ada "-"), path
// /place/<id> (tier 2 #36), atau ?claim=<place_id> (prefill registrasi
// dari klaim listing).
// (Cloudflare Pages SPA fallback melayani path apa pun ke index.html).
function parseInitialRoute(): RouteState {
  const params = new URLSearchParams(window.location.search);
  const kelolaParam = params.get("kelola");

  const kelolaPath = window.location.pathname.match(
    /^\/kelola\/([A-Za-z0-9]+)\/?$/,
  );
  if (kelolaPath)
    return {
      view: "kelola",
      kelolaToken: kelolaPath[1],
      providerId: null,
      claimPlaceId: null,
      placeId: null,
    };
  if (kelolaParam)
    return {
      view: "kelola",
      kelolaToken: kelolaParam,
      providerId: null,
      claimPlaceId: null,
      placeId: null,
    };

  const providerPath = window.location.pathname.match(
    /^\/provider\/([A-Za-z0-9-]+)\/?$/,
  );
  if (providerPath)
    return {
      view: "provider",
      kelolaToken: null,
      providerId: providerPath[1],
      claimPlaceId: null,
      placeId: null,
    };

  // Deep-link place (tier 2 #36): /place/:id membuka PlaceModal langsung.
  // Catatan: OG preview per place tidak mungkin di Cloudflare Pages statis —
  // link yang di-share tetap memakai OG app-level (lihat uiux-plan §8).
  const placePath = window.location.pathname.match(/^\/place\/([A-Za-z0-9-]+)\/?$/);
  if (placePath)
    return {
      view: "explorer",
      kelolaToken: null,
      providerId: null,
      claimPlaceId: null,
      placeId: placePath[1],
    };

  const v = params.get("view");
  if (v === "hari-ini" || v === "saya" || v === "admin") {
    return {
      view: v,
      kelolaToken: null,
      providerId: null,
      claimPlaceId: params.get("claim"),
      placeId: null,
    };
  }
  return { view: "explorer", kelolaToken: null, providerId: null, claimPlaceId: null, placeId: null };
}

// URL yang merepresentasikan sebuah route state — dipakai pushState saat
// pindah view supaya refresh & tombol back browser tetap benar (#4a).
function urlFor(route: RouteState): string {
  if (route.view === "provider" && route.providerId)
    return `/provider/${route.providerId}`;
  if (route.view === "kelola" && route.kelolaToken)
    return `/kelola/${route.kelolaToken}`;
  if (route.view === "explorer" && route.placeId) return `/place/${route.placeId}`;
  if (route.view === "explorer") return "/";
  if (route.view === "hari-ini" || route.view === "saya" || route.view === "admin")
    return `?view=${route.view}`;
  return "/";
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(parseInitialRoute);
  const { view, kelolaToken, providerId, claimPlaceId, placeId } = route;

  function navigate(next: RouteState) {
    history.pushState(null, "", urlFor(next));
    setRoute(next);
  }

  function setView(view: View) {
    navigate({
      view,
      kelolaToken: null,
      providerId: null,
      claimPlaceId:
        view === "saya" ? route.claimPlaceId : null,
      placeId: null,
    });
  }

  function openProvider(id: string) {
    navigate({
      view: "provider",
      kelolaToken: null,
      providerId: id,
      claimPlaceId: null,
      placeId: null,
    });
  }

  // Klaim listing direktori (tier 1 #36) — SPA navigation, bukan <a href>
  // yang me-reload seluruh halaman.
  function claimPlace(placeId: string) {
    navigate({
      view: "saya",
      kelolaToken: null,
      providerId: null,
      claimPlaceId: placeId,
      placeId: null,
    });
  }

  // Tombol back/forward browser → parse ulang URL
  useEffect(() => {
    const onPop = () => setRoute(parseInitialRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (view === "kelola" && kelolaToken) {
    return <OwnerPortalPage token={kelolaToken} />;
  }

  if (view === "explorer") {
    return (
      <Suspense fallback={<RouteFallback />}>
        <ExplorerApp
          onOpenLegacyApp={() => setView("hari-ini")}
          onOpenAdmin={() => setView("admin")}
          onOpenProvider={openProvider}
          onClaimPlace={claimPlace}
          onOpenSaya={() => setView("saya")}
          initialPlaceId={placeId}
        />
      </Suspense>
    );
  }

  // Detail penyedia ditampilkan di bawah tab Hari Ini (sumber masuknya).
  const coreView: CoreView =
    view === "hari-ini" || view === "saya" || view === "admin"
      ? view
      : "hari-ini";

  return (
    <AppShell
      active={coreView}
      onTabChange={setView}
      onBackToExplorer={() => setView("explorer")}
    >
      {view === "hari-ini" && <ConsumerPage onOpenDetail={openProvider} />}
      {view === "provider" && providerId && (
        <ProviderDetailPage
          id={providerId}
          onBack={() => setView("hari-ini")}
        />
      )}
      {view === "saya" && <ProviderPage claimPlaceId={claimPlaceId} />}
      {view === "admin" && <AdminPage />}
    </AppShell>
  );
}
