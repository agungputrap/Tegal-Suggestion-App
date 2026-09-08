import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test komponen: jsdom + React Testing Library. API_URL di-mock supaya
// tidak tergantung backend yang berjalan.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
  },
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://test-api"),
  },
});
