-- Konfirmasi publik "✓ Masih buka" (fase 0 strategi #27).
-- Pelanggan menegaskan bahwa usaha benar-benar buka hari ini — lapisan
-- verifikasi di atas check-in self-report owner.
-- visitor_hash = sha256(IP + tanggal): dedupe 1 konfirmasi per pengunjung
-- per hari per provider, tanpa bisa dilacak lintas hari (privasi).
CREATE TABLE IF NOT EXISTS confirm_opens (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  date TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(provider_id, date, visitor_hash)
);

CREATE INDEX IF NOT EXISTS idx_confirm_provider_date
  ON confirm_opens (provider_id, date);
