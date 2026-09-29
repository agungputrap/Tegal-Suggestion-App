-- Dukungan bot WhatsApp (fase 1 strategi #29).

-- Lead: pelanggan menanyakan/menemukan provider lewat bot — metrik
-- retensi owner ("N orang tanya minggu ini") dan dasar layanan lead.
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  date TEXT NOT NULL,
  query TEXT,                       -- kata kunci pencarian pelanggan
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_provider_date ON leads (provider_id, date);

-- Ping harian "Buka hari ini?" yang terkirim ke provider — basis metrik
-- konversi ping -> BUKA (retensi check-in, kill criteria strategi).
CREATE TABLE IF NOT EXISTS bot_pings (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(provider_id, date)
);

CREATE INDEX IF NOT EXISTS idx_pings_date ON bot_pings (date);
