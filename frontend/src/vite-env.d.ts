/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // Nomor bot WhatsApp (fase 1 strategi #29) — dibake saat build.
  // Kosong/absen = semua UI bot disembunyikan (jangan mengarang nomor).
  readonly VITE_BOT_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
