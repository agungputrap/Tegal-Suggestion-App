import { useEffect, useState } from "react";
import {
  fetchPortal,
  portalClose,
  portalCreateItem,
  portalDeleteItem,
  portalOpen,
  portalUpdateBusiness,
  portalUpdateItem,
  type PortalData,
  type PortalItem,
} from "../api";
import { KECAMATAN } from "../data/kecamatan";
import { useDarkMode } from "../hooks/useDarkMode";
import {
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  ERROR_LINE,
  INPUT,
  LABEL,
} from "../components/ui";

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

type Props = { token: string };

// Halaman portal pemilik (#7) — dibuka via magic-link /kelola/{token}.
// Buka/tutup hari ini, pilih item yang tersedia, edit data usaha & item.
export function OwnerPortalPage({ token }: Props) {
  const { dark, setDark } = useDarkMode();
  const [data, setData] = useState<PortalData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  async function reload() {
    try {
      const d = await fetchPortal(token);
      setData(d);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat portal");
      setStatus("error");
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="explorer bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 min-h-screen flex flex-col transition-colors duration-200">
      {/* Header ringkas */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 glass-nav">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white">
              <i className="fa-solid fa-key text-sm"></i>
            </div>
            <span className="font-bold text-sm">Portal Pemilik</span>
          </div>
          <button
            onClick={() => setDark(!dark)}
            title="Toggle Dark/Light Mode"
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <i
              className={`fa-solid ${dark ? "fa-sun text-amber-400" : "fa-moon text-slate-600"}`}
            ></i>
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-3xl mx-auto w-full px-4 py-6 space-y-5">
        {status === "loading" && (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
            memuat portal...
          </p>
        )}

        {status === "error" && (
          <div className={`${CARD} p-6 text-center`}>
            <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto mb-3 text-2xl">
              <i className="fa-solid fa-link-slash"></i>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Portal tidak bisa dibuka
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {error}
            </p>
          </div>
        )}

        {status === "ready" && data && (
          <>
            {/* Status hari ini */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {data.provider.name}
              </h2>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  data.today.open
                    ? "bg-emerald-500/90 text-white"
                    : "bg-slate-400/90 text-white"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-white mr-1.5 ${
                    data.today.open ? "animate-pulse" : ""
                  }`}
                ></span>
                {data.today.open ? "Buka hari ini" : "Tutup"}
              </span>
              {data.today.open && data.today.note && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  "{data.today.note}"
                </p>
              )}
            </div>

            <OpenCloseCard token={token} data={data} onDone={reload} />
            <ItemsCard token={token} data={data} onDone={reload} />
            <BusinessCard token={token} data={data} onDone={reload} />
          </>
        )}
      </main>

      <footer className="py-4 text-center text-xs text-slate-400">
        Jajan+Jasa Tegal · portal pemilik
      </footer>
    </div>
  );
}

// ---------- Kartu Buka / Tutup ----------
function OpenCloseCard({ token, data, onDone }: { token: string; data: PortalData; onDone: () => void }) {
  const isOpen = data.today.open;
  const [note, setNote] = useState(data.today.note ?? "");
  const [selected, setSelected] = useState<string[]>(
    data.items.filter((i) => i.available).map((i) => i.id)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleItem(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleOpen(useGps: boolean) {
    setBusy(true);
    setError("");
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      if (useGps && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
      await portalOpen(token, { item_ids: selected, note, lat, lng });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal buka");
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    setBusy(true);
    setError("");
    try {
      await portalClose(token);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal tutup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${CARD} p-5 space-y-4`}>
      {isOpen ? (
        <>
          {data.today.note && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Catatan hari ini: {data.today.note}
            </p>
          )}
          <button className={`${BTN_DANGER} w-full py-3 text-sm`} disabled={busy} onClick={handleClose}>
            <i className="fa-solid fa-door-closed"></i>
            <span>Tutup sekarang — hilang dari peta</span>
          </button>
        </>
      ) : (
        <>
          {data.items.length > 0 && (
            <div>
              <p className={LABEL}>Item yang tersedia hari ini</p>
              <div className="space-y-1.5">
                {data.items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="accent-emerald-600"
                      />
                      <span className="font-medium">{item.name}</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {formatRupiah(item.price)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="block">
            <span className={LABEL}>Catatan (opsional)</span>
            <input
              className={INPUT}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mis. ready pagi, habis biasa siang"
            />
          </label>

          {error && <p className={ERROR_LINE}>{error}</p>}

          <button
            className={`${BTN_PRIMARY} w-full py-3 text-base`}
            disabled={busy}
            onClick={() => handleOpen(true)}
          >
            <i className="fa-solid fa-location-crosshairs"></i>
            <span>
              {busy ? "Memproses..." : "Buka sekarang (pakai lokasi saya)"}
            </span>
          </button>
          <button
            className={`${BTN_SECONDARY} w-full`}
            disabled={busy}
            onClick={() => handleOpen(false)}
            title="Pakai lokasi dasar usaha"
          >
            Buka tanpa lokasi (pakai titik dasar usaha)
          </button>
        </>
      )}
    </div>
  );
}

// ---------- Kartu kelola item ----------
function ItemsCard({ token, data, onDone }: { token: string; data: PortalData; onDone: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !price) {
      setError("Nama dan harga wajib diisi");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await portalCreateItem(token, { name, price: parseInt(price) || 0, note: note || undefined });
      setName("");
      setPrice("");
      setNote("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah item");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleAvailable(item: PortalItem) {
    await portalUpdateItem(token, item.id, { available: !(item.available === 1) });
    onDone();
  }

  async function handleDelete(item: PortalItem) {
    if (!confirm(`Hapus item "${item.name}"?`)) return;
    await portalDeleteItem(token, item.id);
    onDone();
  }

  return (
    <div className={`${CARD} p-5 space-y-4`}>
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        <i className="fa-solid fa-list-ul text-emerald-500 mr-2"></i>
        Item {data.provider.category_type === "jasa" ? "jasa" : "menu"} (permanen)
      </h4>

      <div className="space-y-1.5">
        {data.items.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Belum ada item. Tambahkan menu / daftar harga di bawah.
          </p>
        )}
        {data.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs"
          >
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {item.name}{" "}
                {item.available === 0 && (
                  <span className="text-[10px] text-slate-400">(tidak tersedia)</span>
                )}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {formatRupiah(item.price)}
                {item.note ? ` · ${item.note}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                className={BTN_SECONDARY}
                title={item.available ? "Tandai tidak tersedia" : "Tandai tersedia"}
                onClick={() => handleToggleAvailable(item)}
              >
                <i
                  className={`fa-solid ${
                    item.available ? "fa-toggle-on text-emerald-600" : "fa-toggle-off"
                  }`}
                ></i>
              </button>
              <button className={BTN_DANGER} onClick={() => handleDelete(item)}>
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800" onSubmit={handleAdd}>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={LABEL}>Nama item</span>
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Cuci AC 1 PK" />
          </label>
          <label className="block">
            <span className={LABEL}>Harga (Rp)</span>
            <input className={INPUT} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="75000" />
          </label>
        </div>
        <label className="block">
          <span className={LABEL}>Catatan (opsional)</span>
          <input className={INPUT} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. termasuk bahan" />
        </label>
        {error && <p className={ERROR_LINE}>{error}</p>}
        <button className={BTN_PRIMARY} type="submit" disabled={busy}>
          <i className="fa-solid fa-plus"></i>
          <span>Tambah item</span>
        </button>
      </form>
    </div>
  );
}

// ---------- Kartu edit data usaha ----------
function BusinessCard({ token, data, onDone }: { token: string; data: PortalData; onDone: () => void }) {
  const { provider } = data;
  const [name, setName] = useState(provider.name);
  const [description, setDescription] = useState(provider.description ?? "");
  const [area, setArea] = useState(provider.area ?? "");
  const [halal, setHalal] = useState(provider.halal === 1);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      await portalUpdateBusiness(token, {
        name,
        description: description || undefined,
        area: area || undefined,
        halal: provider.category_type === "jajanan" ? halal : undefined,
      });
      setSaved(true);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`${CARD} p-5 space-y-4`} onSubmit={handleSave}>
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        <i className="fa-solid fa-pen text-blue-500 mr-2"></i> Data usaha
      </h4>

      <label className="block">
        <span className={LABEL}>Nama</span>
        <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="block">
        <span className={LABEL}>Deskripsi</span>
        <input
          className={INPUT}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="mis. buka jam 6 pagi"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className={LABEL}>Kecamatan</span>
          <select className={`${INPUT} w-full`} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Pilih kecamatan</option>
            {KECAMATAN.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        {provider.category_type === "jajanan" && (
          <label className="flex items-end pb-2.5 space-x-2 text-xs font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={halal}
              onChange={(e) => setHalal(e.target.checked)}
              className="accent-emerald-600"
            />
            <span>Berhalal</span>
          </label>
        )}
      </div>

      {error && <p className={ERROR_LINE}>{error}</p>}
      {saved && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          <i className="fa-solid fa-circle-check mr-1"></i> Tersimpan
        </p>
      )}

      <button className={BTN_PRIMARY} type="submit" disabled={busy}>
        <i className="fa-solid fa-floppy-disk"></i>
        <span>{busy ? "Menyimpan..." : "Simpan data usaha"}</span>
      </button>
    </form>
  );
}
