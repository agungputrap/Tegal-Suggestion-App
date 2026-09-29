import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { registerServiceWorker } from "./sw-register";
import "./styles.css";
import "./explorer/explorer.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// PWA offline-first (tier 2 #36) — hanya aktif di build produksi.
registerServiceWorker();
