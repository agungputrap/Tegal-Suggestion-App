import { useEffect, useState } from "react";
import {
  clearStoredAdminToken,
  createCategory,
  deactivateTodayCheckin,
  deleteCategory,
  deleteProvider,
  deleteProviderPhoto,
  fetchAdminCategories,
  fetchAdminProviders,
  fetchAdminStats,
  getStoredAdminToken,
  setProviderSuspended,
  setStoredAdminToken,
  verifyAdminToken,
} from "../adminApi";
import type { AdminCategory, AdminProvider, AdminStats } from "../adminApi";
import { resolvePhotoUrl } from "../api";

type AdminTab = "stats" | "providers" | "categories";

export function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tab, setTab] = useState<AdminTab>("stats");

  // ---------- Cek token tersimpan saat halaman dibuka ----------
  useEffect(() => {
    const stored = getStoredAdminToken();
    if (!stored) {
      setCheckingToken(false);
      return;
    }
    verifyAdminToken(stored)
      .then((ok) => {
        if (ok) setToken(stored);
        else clearStoredAdminToken();
      })
      .finally(() => setCheckingToken(false));
  }, []);

  if (checkingToken) return <p className="status-line">memuat...</p>;

  if (!token) {
    return <AdminLogin onSuccess={setToken} />;
  }

  return (
    <>
      <header className="header">
        <h1 className="header__title">Admin</h1>
        <p className="header__subtitle">Moderasi provider &amp; kategori</p>
      </header>

      <div className="filters">
        {(
          [
            ["stats", "Statistik"],
            ["providers", "Provider"],
            ["categories", "Kategori"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className="chip"
            data-active={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="dashboard">
        {tab === "stats" && <StatsPanel token={token} />}
        {tab === "providers" && <ProvidersPanel token={token} />}
        {tab === "categories" && <CategoriesPanel token={token} />}

        <button
          className="btn-secondary"
          onClick={() => {
            clearStoredAdminToken();
            setToken(null);
          }}
        >
          Keluar dari admin
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------
// Login
// ---------------------------------------------------------
function AdminLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setChecking(true);
    try {
      const ok = await verifyAdminToken(value);
      if (!ok) {
        setError("Token salah");
        return;
      }
      setStoredAdminToken(value);
      onSuccess(value);
    } catch {
      setError("Gagal menghubungi server");
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <header className="header">
        <h1 className="header__title">Admin</h1>
        <p className="header__subtitle">Masukkan token admin untuk masuk.</p>
      </header>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span>Token admin</span>
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ADMIN_TOKEN"
          />
        </label>
        {error && <p className="status-line form__error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={checking}>
          {checking ? "Memeriksa..." : "Masuk"}
        </button>
      </form>
    </>
  );
}

// ---------------------------------------------------------
// Statistik
// ---------------------------------------------------------
function StatsPanel({ token }: { token: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  useEffect(() => {
    fetchAdminStats(token)
      .then((s) => {
        setStats(s);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "loading") return <p className="status-line">memuat...</p>;
  if (status === "error" || !stats)
    return <p className="status-line form__error">Gagal memuat statistik</p>;

  return (
    <div className="dashboard__section">
      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-card__value">{stats.total_providers}</p>
          <p className="stat-card__label">Total provider</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">{stats.active_today}</p>
          <p className="stat-card__label">Aktif hari ini</p>
        </div>
      </div>

      <p className="dashboard__label">Per jenis</p>
      {stats.by_type.map((row) => (
        <div className="stat-row" key={row.type}>
          <span>{row.type}</span>
          <span>{row.n}</span>
        </div>
      ))}

      <p className="dashboard__label">Per kategori</p>
      {stats.by_category.map((row) => (
        <div className="stat-row" key={row.category}>
          <span>{row.category}</span>
          <span>{row.n}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------
// Provider (moderasi)
// ---------------------------------------------------------
function ProvidersPanel({ token }: { token: string }) {
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"semua" | "jajanan" | "jasa">(
    "semua"
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "suspended"
  >("all");
  const [query, setQuery] = useState("");

  function reload() {
    setStatus("loading");
    fetchAdminProviders(token, {
      type: typeFilter === "semua" ? undefined : typeFilter,
      status: statusFilter,
      q: query || undefined,
    })
      .then((p) => {
        setProviders(p);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(reload, [token, typeFilter, statusFilter, query]);

  async function handleToggleSuspend(p: AdminProvider) {
    setBusyId(p.id);
    try {
      await setProviderSuspended(token, p.id, p.suspended === 0);
      reload();
    } catch {
      alert("Gagal mengubah status");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeactivateCheckin(p: AdminProvider) {
    setBusyId(p.id);
    try {
      await deactivateTodayCheckin(token, p.id);
      reload();
    } catch {
      alert("Gagal menonaktifkan checkin");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(p: AdminProvider) {
    if (!confirm(`Hapus permanen "${p.name}"? Tidak bisa dibatalkan.`)) return;
    setBusyId(p.id);
    try {
      await deleteProvider(token, p.id);
      reload();
    } catch {
      alert("Gagal menghapus provider");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeletePhoto(p: AdminProvider) {
    if (!p.photo_url) return;
    setBusyId(p.id);
    try {
      await deleteProviderPhoto(token, p.id);
      reload();
    } catch {
      alert("Gagal menghapus foto");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="dashboard__section">
      <input
        className="admin-search"
        placeholder="Cari nama atau nomor HP..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="admin-filter-row">
        {(["semua", "jajanan", "jasa"] as const).map((t) => (
          <button
            key={t}
            className="tag-toggle"
            data-active={typeFilter === t}
            onClick={() => setTypeFilter(t)}
          >
            {t}
          </button>
        ))}
        <span className="admin-filter-sep" />
        {(
          [
            ["all", "Semua"],
            ["active", "Aktif hari ini"],
            ["suspended", "Nonaktif"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className="tag-toggle"
            data-active={statusFilter === value}
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {status === "loading" && <p className="status-line">memuat...</p>}
      {status === "error" && (
        <p className="status-line form__error">Gagal memuat provider</p>
      )}
      {status === "ready" && providers.length === 0 && (
        <p className="status-line">Tidak ada provider yang cocok filter ini.</p>
      )}

      {status === "ready" &&
        providers.map((p) => {
          const photoSrc = resolvePhotoUrl(p.photo_url);
          return (
            <div className="admin-row" key={p.id}>
              {photoSrc ? (
                <img
                  className="admin-row__thumb"
                  src={photoSrc}
                  alt={p.name}
                />
              ) : (
                <div className="admin-row__thumb admin-row__thumb--empty" />
              )}
              <div className="admin-row__body">
                <p className="admin-row__name">
                  {p.name}
                  {p.suspended === 1 && (
                    <span className="badge badge--suspended">nonaktif</span>
                  )}
                  {p.active_today === 1 && p.suspended === 0 && (
                    <span className="badge badge--active">aktif hari ini</span>
                  )}
                </p>
                <p className="admin-row__meta">
                  {p.phone} · {p.category_type}
                </p>
                <div className="admin-row__actions">
                  <button
                    className="btn-secondary"
                    disabled={busyId === p.id}
                    onClick={() => handleToggleSuspend(p)}
                  >
                    {p.suspended === 1 ? "Aktifkan" : "Nonaktifkan"}
                  </button>
                  {p.active_today === 1 && p.suspended === 0 && (
                    <button
                      className="btn-secondary"
                      disabled={busyId === p.id}
                      onClick={() => handleDeactivateCheckin(p)}
                    >
                      Reset checkin
                    </button>
                  )}
                  {p.photo_url && (
                    <button
                      className="btn-secondary"
                      disabled={busyId === p.id}
                      onClick={() => handleDeletePhoto(p)}
                    >
                      Hapus foto
                    </button>
                  )}
                  <button
                    className="btn-secondary btn-secondary--danger"
                    disabled={busyId === p.id}
                    onClick={() => handleDelete(p)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}

// ---------------------------------------------------------
// Kategori
// ---------------------------------------------------------
function CategoriesPanel({ token }: { token: string }) {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [form, setForm] = useState({
    id: "",
    name: "",
    type: "jajanan" as "jajanan" | "jasa",
    icon: "📍",
  });
  const [formError, setFormError] = useState("");

  function reload() {
    setStatus("loading");
    fetchAdminCategories(token)
      .then((c) => {
        setCategories(c);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(reload, [token]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.id || !form.name) {
      setFormError("id dan nama wajib diisi");
      return;
    }

    try {
      await createCategory(token, form);
      setForm({ id: "", name: "", type: "jajanan", icon: "📍" });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menambah");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Hapus kategori "${id}"?`)) return;
    try {
      await deleteCategory(token, id);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    }
  }

  return (
    <div className="dashboard__section">
      {status === "loading" && <p className="status-line">memuat...</p>}
      {status === "error" && (
        <p className="status-line form__error">Gagal memuat kategori</p>
      )}

      {status === "ready" &&
        categories.map((c) => (
          <div className="admin-row admin-row--compact" key={c.id}>
            <span className="admin-row__icon">{c.icon}</span>
            <div className="admin-row__body">
              <p className="admin-row__name">{c.name}</p>
              <p className="admin-row__meta">
                {c.id} · {c.type}
              </p>
            </div>
            <button
              className="btn-secondary btn-secondary--danger"
              onClick={() => handleDelete(c.id)}
            >
              Hapus
            </button>
          </div>
        ))}

      <p className="dashboard__label">Tambah kategori baru</p>
      <form className="form" onSubmit={handleAdd} style={{ padding: 0 }}>
        <label className="form__field">
          <span>ID (slug, mis. "tukang-las")</span>
          <input
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
          />
        </label>
        <label className="form__field">
          <span>Nama</span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="form__field">
          <span>Icon (emoji)</span>
          <input
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
          />
        </label>
        <div className="form__field">
          <span>Jenis</span>
          <div className="filters" style={{ padding: "8px 0" }}>
            {(["jajanan", "jasa"] as const).map((t) => (
              <button
                type="button"
                key={t}
                className="chip"
                data-active={form.type === t}
                onClick={() => setForm({ ...form, type: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {formError && <p className="status-line form__error">{formError}</p>}
        <button className="btn-primary" type="submit">
          Tambah kategori
        </button>
      </form>
    </div>
  );
}
