import { useEffect, useState } from "react";

// Placeholder lokal — pasti hidup, offline-friendly (di-cache service
// worker sebagai aset same-origin). Dipakai sebagai lapisan terakhir
// rantai fallback SmartImage.
export const PLACEHOLDER_IMAGE = "/placeholder.svg";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  // Fallback "cantik" sebelum placeholder lokal (mis. foto Unsplash).
  fallback?: string;
  onClick?: () => void;
  loading?: "lazy" | "eager";
};

// <img> dengan rantai fallback: src → fallback → placeholder lokal.
// Menangani: src kosong, URL mati (foto GMaps expired), dan fallback
// yang ikut mati — tidak pernah menampilkan ikon rusak browser.
export function SmartImage({
  src,
  alt,
  className,
  fallback = PLACEHOLDER_IMAGE,
  onClick,
  loading = "lazy",
}: Props) {
  const chain = [src || fallback, fallback, PLACEHOLDER_IMAGE];
  const [stage, setStage] = useState(0);

  // src berubah (mis. ganti foto hero) → mulai rantai dari awal.
  useEffect(() => {
    setStage(0);
  }, [src]);

  const current = chain[Math.min(stage, chain.length - 1)];

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading={loading}
      onClick={onClick}
      onError={() => setStage((s) => Math.min(s + 1, chain.length - 1))}
    />
  );
}
