import { useState } from "react";
import { AdminPage } from "./pages/AdminPage";
import { ConsumerPage } from "./pages/ConsumerPage";
import { ProviderPage } from "./pages/ProviderPage";

type Tab = "cari" | "saya" | "admin";

export default function App() {
  const [tab, setTab] = useState<Tab>("cari");

  return (
    <div className="app">
      <div className="app__content">
        {tab === "cari" && <ConsumerPage />}
        {tab === "saya" && <ProviderPage />}
        {tab === "admin" && <AdminPage />}
      </div>

      <nav className="bottom-nav">
        <button
          className="bottom-nav__item"
          data-active={tab === "cari"}
          onClick={() => setTab("cari")}
        >
          Cari
        </button>
        <button
          className="bottom-nav__item"
          data-active={tab === "saya"}
          onClick={() => setTab("saya")}
        >
          Jualan / Jasa Saya
        </button>
        <button
          className="bottom-nav__item"
          data-active={tab === "admin"}
          onClick={() => setTab("admin")}
        >
          Admin
        </button>
      </nav>
    </div>
  );
}
