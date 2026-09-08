import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Vendor berat di-chunk terpisah (#15): leaflet dipakai Explorer &
        // Hari Ini, chart.js hanya tab Statistik.
        manualChunks: {
          leaflet: ["leaflet", "leaflet.markercluster"],
          "chart.js": ["chart.js"],
        },
      },
    },
  },
});
