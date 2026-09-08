// ESLint flat config — kedua sisi (backend + frontend) dalam satu config,
// sesuai dev-standards: "TypeScript everywhere".
// Aturan: error hanya untuk bug nyata; gaya visual diserahkan ke Prettier.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  { ignores: ["**/dist/", "**/node_modules/", "ref/", ".zcode/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["frontend/src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off",
      // Data fetching di app ini memakai pola fetch-on-mount dengan
      // setStatus("loading") sinkron — pola standar tanpa data framework.
      // Matikan rule opini baru ini sampai ada data layer.
      "react-hooks/set-state-in-effect": "off",
    },
  },
);
