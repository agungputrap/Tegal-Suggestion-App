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
  setProviderApproval,
  setProviderSuspended,
  setStoredAdminToken,
  verifyAdminToken,
} from "../adminApi";
import type { AdminCategory, AdminProvider, AdminStats } from "../adminApi";
import { resolvePhotoUrl } from "../api";
import {
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  ERROR_LINE,
  INPUT,
  LABEL,
  pillClass,
} from "../components/ui";

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

  if (checkingToken)
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
        memuat...
      </p>
    );

  if (!token) {
    return <AdminLogin onSuccess={setToken} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center">
            <i className="fa-solid fa-user-shield text-emerald-500 mr-2"></i>{" "}
            Dashboard Admin
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Moderasi provider &amp; kategori
          </p>
        </div>
        <button
          className={BTN_SECONDARY}
          onClick={() => {
            clearStoredAdminToken();
            setToken(null);
          }}
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          <span>Keluar dari admin</span>
        </button>
      </div>

      {/* Tab pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ["stats", "fa-chart-simple", "Statistik"],
            ["providers", "fa-store", "Provider"],
            ["categories", "fa-tags", "Kategori"],
          ] as const
        ).map(([value, icon, label]) => (
          <button
            key={value}
            className={pillClass(tab === value)}
            onClick={() => setTab(value)}
          >
            <i className={`fa-solid ${icon} mr-1`}></i>
            {label}
          </button>
        ))}
      </div>

      {tab === "stats" && <StatsPanel token={token} />}
      {tab === "providers" && <ProvidersPanel token={token} />}
      {tab === "categories" && <CategoriesPanel token={token} />}
    </div>
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
    <div className="max-w-md mx-auto py-8">
      <form className={`${CARD} p-6 space-y-4`} onSubmit={handleSubmit}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-500/20">
            <i className="fa-solid fa-user-shield text-xl"></i>
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Login Admin
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Masukkan token admin untuk masuk.
          </p>
        </div>

        <label className="block">
          <span className={LABEL}>Token admin</span>
          <input
            className={INPUT}
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ADMIN_TOKEN"
          />
        </label>

        {error && <p className={ERROR_LINE}>{error}</p>}

        <button className={`${BTN_PRIMARY} w-full`} type="submit" disabled={checking}>
          <i className="fa-solid fa-unlock"></i>
          <span>{checking ? "Memeriksa..." : "Masuk"}</span>
        </button>
      </form>
    </div>
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

  if (status === "loading")
    return <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">memuat...</p>;
  if (status === "error" || !stats)
    return <p className={ERROR_LINE}>Gagal memuat statistik</p>;

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <i className="fa-solid fa-store"></i>
          </div>
          <div>
            <div className="text-lg font-extrabold text-emerald-950 dark:text-emerald-200">
              {stats.total_providers}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Total Provider
            </div>
          </div>
        </div>
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-3 rounded-xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <i className="fa-solid fa-bolt"></i>
          </div>
          <div>
            <div className="text-lg font-extrabold text-amber-950 dark:text-amber-200">
              {stats.active_today}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Aktif Hari Ini
            </div>
          </div>
        </div>
        {stats.by_type.map((row) => (
          <div
            key={row.type}
            className={`${
              row.type === "jajanan"
                ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40 text-blue-950 dark:text-blue-200"
                : "bg-purple-50/50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/40 text-purple-950 dark:text-purple-200"
            } border p-3 rounded-xl flex items-center space-x-3`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                row.type === "jajanan"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
              }`}
            >
              <i
                className={`fa-solid ${row.type === "jajanan" ? "fa-utensils" : "fa-screwdriver-wrench"}`}
              ></i>
            </div>
            <div>
              <div className="text-lg font-extrabold">{row.n}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium capitalize">
                {row.type}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className={`${CARD} p-5`}>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            <i className="fa-solid fa-layer-group text-purple-500 mr-2"></i> Per
            Kategori
          </h4>
          <div className="space-y-1.5">
            {stats.by_category.map((row) => (
              <div
                key={row.category}
                className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300"
              >
                <span>{row.category}</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {row.n}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${CARD} p-5`}>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            <i className="fa-solid fa-chart-simple text-blue-500 mr-2"></i> Per
            Jenis
          </h4>
          <div className="space-y-1.5">
            {stats.by_type.map((row) => (
              <div
                key={row.type}
                className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 capitalize"
              >
                <span>{row.type}</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {row.n}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
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
    "all" | "active" | "suspended" | "pending" | "approved" | "rejected"
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

  async function handleApproval(p: AdminProvider, status: "approved" | "rejected") {
    setBusyId(p.id);
    try {
      await setProviderApproval(token, p.id, status);
      reload();
    } catch {
      alert("Gagal mengubah status approval");
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
    <div className="space-y-4">
      {/* Filter bar */}
      <div className={`${CARD} p-4 space-y-3`}>
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400"></i>
          <input
            className={`${INPUT} pl-10`}
            placeholder="Cari nama atau nomor HP..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 text-xs mr-1">Jenis:</span>
          {(["semua", "jajanan", "jasa"] as const).map((t) => (
            <button
              key={t}
              className={pillClass(typeFilter === t)}
              onClick={() => setTypeFilter(t)}
            >
              {t}
            </button>
          ))}
          <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
          <span className="text-slate-400 text-xs mr-1">Status:</span>
          {(
            [
              ["all", "Semua"],
              ["active", "Aktif hari ini"],
              ["suspended", "Nonaktif"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={pillClass(statusFilter === value)}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
          <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
          <span className="text-slate-400 text-xs mr-1">Verifikasi:</span>
          {(
            [
              ["pending", "Menunggu"],
              ["approved", "Disetujui"],
              ["rejected", "Ditolak"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={pillClass(statusFilter === value)}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {status === "loading" && (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">memuat...</p>
      )}
      {status === "error" && <p className={ERROR_LINE}>Gagal memuat provider</p>}
      {status === "ready" && providers.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
          Tidak ada provider yang cocok filter ini.
        </p>
      )}

      {status === "ready" &&
        providers.map((p) => {
          const photoSrc = resolvePhotoUrl(p.photo_url);
          return (
            <div className={`${CARD} p-4 flex items-start space-x-3.5`} key={p.id}>
              {photoSrc ? (
                <img
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  src={photoSrc}
                  alt={p.name}
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                  {p.category_type === "jajanan" ? "🍜" : "🛠️"}
                </div>
              )}

              <div className="flex-grow min-w-0">
                <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center flex-wrap gap-1.5">
                  {p.name}
                  {p.approval_status === "pending" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/90 text-white">
                      menunggu verifikasi
                    </span>
                  )}
                  {p.approval_status === "rejected" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500 text-white">
                      ditolak
                    </span>
                  )}
                  {p.suspended === 1 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/90 text-white">
                      nonaktif
                    </span>
                  )}
                  {p.active_today === 1 && p.suspended === 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/90 text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1"></span>
                      aktif hari ini
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <i className="fa-brands fa-whatsapp text-emerald-500 mr-1"></i>
                  {p.phone} · <span className="capitalize">{p.category_type}</span>
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  {p.approval_status === "pending" && (
                    <>
                      <button
                        className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-60"
                        disabled={busyId === p.id}
                        onClick={() => handleApproval(p, "approved")}
                      >
                        <i className="fa-solid fa-check"></i>
                        <span>Setujui</span>
                      </button>
                      <button
                        className={BTN_DANGER}
                        disabled={busyId === p.id}
                        onClick={() => handleApproval(p, "rejected")}
                      >
                        Tolak
                      </button>
                    </>
                  )}
                  <button
                    className={BTN_SECONDARY}
                    disabled={busyId === p.id}
                    onClick={() => handleToggleSuspend(p)}
                  >
                    {p.suspended === 1 ? "Aktifkan" : "Nonaktifkan"}
                  </button>
                  {p.active_today === 1 && p.suspended === 0 && (
                    <button
                      className={BTN_SECONDARY}
                      disabled={busyId === p.id}
                      onClick={() => handleDeactivateCheckin(p)}
                    >
                      Reset checkin
                    </button>
                  )}
                  {p.photo_url && (
                    <button
                      className={BTN_SECONDARY}
                      disabled={busyId === p.id}
                      onClick={() => handleDeletePhoto(p)}
                    >
                      Hapus foto
                    </button>
                  )}
                  <button
                    className={BTN_DANGER}
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
    <div className="space-y-5">
      {status === "loading" && (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">memuat...</p>
      )}
      {status === "error" && <p className={ERROR_LINE}>Gagal memuat kategori</p>}

      {status === "ready" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <div className={`${CARD} p-4 flex items-center justify-between gap-3`} key={c.id}>
              <div className="flex items-center space-x-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                  {c.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {c.id} · {c.type}
                  </p>
                </div>
              </div>
              <button className={BTN_DANGER} onClick={() => handleDelete(c.id)}>
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}

      <form className={`${CARD} p-5 space-y-4`} onSubmit={handleAdd}>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          <i className="fa-solid fa-plus text-emerald-500 mr-2"></i> Tambah
          kategori baru
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className={LABEL}>ID (slug, mis. "tukang-las")</span>
            <input
              className={INPUT}
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={LABEL}>Nama</span>
            <input
              className={INPUT}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={LABEL}>Icon (emoji)</span>
            <input
              className={INPUT}
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
            />
          </label>
        </div>
        <div>
          <span className={LABEL}>Jenis</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(["jajanan", "jasa"] as const).map((t) => (
              <button
                type="button"
                key={t}
                className={pillClass(form.type === t)}
                onClick={() => setForm({ ...form, type: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {formError && <p className={ERROR_LINE}>{formError}</p>}
        <button className={BTN_PRIMARY} type="submit">
          <i className="fa-solid fa-circle-plus"></i>
          <span>Tambah kategori</span>
        </button>
      </form>
    </div>
  );
}
