import type { SyntheticEvent } from "react";

// Foto R2 kadang gagal load sementara (jaringan lambat) — coba sekali lagi
// dengan cache-buster sebelum jatuh ke gambar fallback (#15).
export function photoErrorHandler(fallbackSrc: string) {
  return (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.dataset.retried) {
      img.dataset.retried = "1";
      img.src = `${img.src.split("?")[0]}?retry=1`;
    } else {
      img.src = fallbackSrc;
    }
  };
}
