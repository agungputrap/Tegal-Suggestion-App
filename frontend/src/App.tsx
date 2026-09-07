import { useState } from "react";
import { AdminPage } from "./pages/AdminPage";
import { ConsumerPage } from "./pages/ConsumerPage";
import { ProviderPage } from "./pages/ProviderPage";
import { ExplorerApp } from "./explorer/ExplorerApp";

// 'explorer' = halaman utama baru (port ref Tegal F&B Explorer).
// View lain = app inti lama (shell mobile 480px) yang tetap bisa diakses.
type View = "explorer" | "cari" | "saya" | "admin";

export default function App() {
  const [view, setView] = useState<View>("explorer");

  if (view === "explorer") {
    return (
      <ExplorerApp
        onOpenLegacyApp={() => setView("cari")}
        onOpenAdmin={() => setView("admin")}
      />
    );
  }

  return (
    <div className="app">
      <button className="legacy-back" onClick={() => setView("explorer")}>
        ← Kembali ke Explorer
      </button>

      <div className="app__content">
        {view === "cari" && <ConsumerPage />}
        {view === "saya" && <ProviderPage />}
        {view === "admin" && <AdminPage />}
      </div>

      <nav className="bottom-nav">
        <button
          className="bottom-nav__item"
          data-active={view === "cari"}
          onClick={() => setView("cari")}
        >
          Cari
        </button>
        <button
          className="bottom-nav__item"
          data-active={view === "saya"}
          onClick={() => setView("saya")}
        >
          Jualan / Jasa Saya
        </button>
        <button
          className="bottom-nav__item"
          data-active={view === "admin"}
          onClick={() => setView("admin")}
        >
          Admin
        </button>
      </nav>
    </div>
  );
}
