import { useEffect, useState } from "react";
import {
  checkin,
  createProvider,
  fetchCategories,
  fetchProvider,
} from "../api";
import type { Category, Provider } from "../api";
import { PhotoUpload } from "../components/PhotoUpload";
import { KECAMATAN } from "../data/kecamatan";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  ERROR_LINE,
  INPUT,
  LABEL,
  pillClass,
  selectClass,
} from "../components/ui";
import {
  clearStoredProvider,
  getLastCheckinDate,
  getStoredOwnerToken,
  getStoredProviderId,
  getStoredVerifyCode,
  setLastCheckinDate,
  setStoredOwnerToken,
  setStoredProviderId,
  setStoredVerifyCode,
} from "../storage";

function todayIso(): string {
  // WIB, samakan dengan logika backend (todayJakarta)
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

type FormState = {
  name: string;
  phone: string;
  category_type: "jajanan" | "jasa";
  category_id: string;
  description: string;
  service_radius_km: string;
  area: string;
  halal: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  category_type: "jajanan",
  category_id: "",
  description: "",
  service_radius_km: "2",
  area: "",
  halal: false,
};

export function ProviderPage() {
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [checkinStatus, setCheckinStatus] = useState<
    "idle" | "locating" | "sending" | "error"
  >("idle");
  const [checkinError, setCheckinError] = useState("");
  const [checkedInToday, setCheckedInToday] = useState(false);

  // Muat provider tersimpan (kalau ada) + daftar kategori
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {});

    const storedId = getStoredProviderId();
    if (!storedId) {
      setLoadingProvider(false);
      return;
    }

    fetchProvider(storedId)
      .then((p) => {
        if (p) {
          setProvider(p);
          setCheckedInToday(getLastCheckinDate() === todayIso());
        } else {
          // Provider dihapus dari server tapi masih tersimpan di browser
          clearStoredProvider();
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProvider(false));
  }, []);

  const categoryOptions = categories.filter(
    (c) => c.type === form.category_type,
  );

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name || !form.phone || !form.category_id) {
      setFormError("Nama, nomor HP, dan kategori wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createProvider({
        name: form.name,
        phone: form.phone,
        category_type: form.category_type,
        category_id: form.category_id,
        description: form.description || undefined,
        service_radius_km:
          form.category_type === "jasa"
            ? parseFloat(form.service_radius_km) || 0
            : 0,
        area: form.area || undefined,
        halal: form.category_type === "jajanan" ? form.halal : undefined,
      });

      // owner_token & verify_code hanya dikembalikan SEKALI di respons ini
      setStoredProviderId(result.id);
      setStoredOwnerToken(result.owner_token);
      setStoredVerifyCode(result.verify_code);
      const p = await fetchProvider(result.id);
      setProvider(p);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Pendaftaran gagal");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCheckin() {
    if (!provider) return;
    if (!navigator.geolocation) {
      setCheckinStatus("error");
      setCheckinError("Browser tidak mendukung lokasi. Coba dari HP.");
      return;
    }

    setCheckinStatus("locating");
    setCheckinError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setCheckinStatus("sending");
        try {
          const { date } = await checkin({
            provider_id: provider.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setLastCheckinDate(date);
          setCheckedInToday(true);
          setCheckinStatus("idle");
        } catch (err) {
          setCheckinStatus("error");
          setCheckinError(err instanceof Error ? err.message : "Checkin gagal");
        }
      },
      () => {
        setCheckinStatus("error");
        setCheckinError(
          "Izin lokasi ditolak. Checkin butuh lokasimu saat ini.",
        );
      },
      { timeout: 8000 },
    );
  }

  function handleGantiAkun() {
    clearStoredProvider();
    setProvider(null);
    setForm(EMPTY_FORM);
    setCheckedInToday(false);
  }

  if (loadingProvider) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
        memuat...
      </p>
    );
  }

  // ---------- Ditolak admin ----------
  if (provider && provider.approval_status === "rejected") {
    return (
      <div className="max-w-md mx-auto text-center py-10 space-y-3">
        <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto text-2xl">
          <i className="fa-solid fa-circle-xmark"></i>
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          Pendaftaran ditolak
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Akun "{provider.name}" ditolak admin. Silakan daftar ulang atau
          hubungi pengelola.
        </p>
        <button className={BTN_SECONDARY} onClick={handleGantiAkun}>
          Daftar ulang
        </button>
      </div>
    );
  }

  // ---------- Menunggu approval admin (#6) ----------
  if (provider && provider.approval_status === "pending") {
    const code = getStoredVerifyCode();
    const ownerToken = getStoredOwnerToken();
    const shareText = encodeURIComponent(
      `Halo admin, saya ${provider.name} baru mendaftar di Jajan+Jasa Tegal. Kode verifikasi saya: ${code ?? "-"}. Mohon disetujui.`,
    );
    const kelolaUrl = ownerToken
      ? `${window.location.origin}/kelola/${ownerToken}`
      : null;

    return (
      <div className="max-w-md mx-auto space-y-4 py-6">
        <div className="text-center">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Menunggu Persetujuan Admin
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kirim kode verifikasi di bawah ke admin via WhatsApp. Setelah
            disetujui, akunmu bisa checkin &amp; tampil di peta.
          </p>
        </div>

        {code && (
          <div className={`${CARD} p-5 text-center space-y-3`}>
            <p className={LABEL}>Kode verifikasi kamu</p>
            <p className="text-3xl font-black tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
              {code}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                className={BTN_SECONDARY}
                onClick={() => navigator.clipboard.writeText(code)}
              >
                <i className="fa-solid fa-copy"></i>
                <span>Salin kode</span>
              </button>
              <a
                className={BTN_PRIMARY}
                href={`https://wa.me/?text=${shareText}`}
                target="_blank"
                rel="noreferrer"
              >
                <i className="fa-brands fa-whatsapp text-base"></i>
                <span>Kirim via WhatsApp</span>
              </a>
            </div>
          </div>
        )}

        {kelolaUrl && (
          <div className={`${CARD} p-4 space-y-2`}>
            <p className={LABEL}>Link kelola usaha (simpan baik-baik)</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 break-all">
              {kelolaUrl}
            </p>
            <button
              className={BTN_SECONDARY}
              onClick={() => navigator.clipboard.writeText(kelolaUrl)}
            >
              <i className="fa-solid fa-copy"></i>
              <span>Salin link</span>
            </button>
          </div>
        )}

        <div className="text-center">
          <button className={BTN_SECONDARY} onClick={handleGantiAkun}>
            Daftar dengan akun lain
          </button>
        </div>
      </div>
    );
  }

  // ---------- Belum daftar: tampilkan form registrasi ----------
  if (!provider) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center justify-center">
            <i className="fa-solid fa-bullhorn text-emerald-500 mr-2"></i>{" "}
            Daftar Jadi Penyedia
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Jualan jajanan atau tawarkan jasa? Daftar sekali, checkin tiap hari
            kamu buka.
          </p>
        </div>

        <form
          className={`${CARD} p-5 sm:p-6 space-y-4`}
          onSubmit={handleRegister}
        >
          <label className="block">
            <span className={LABEL}>
              Nama {form.category_type === "jasa" ? "/ usaha" : "warung"}
            </span>
            <input
              className={INPUT}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="mis. Nasi Goreng Bu Sri / Servis AC Pak Bud"
            />
          </label>

          <label className="block">
            <span className={LABEL}>Nomor WhatsApp</span>
            <input
              className={INPUT}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08123456789"
              inputMode="tel"
            />
          </label>

          <div>
            <span className={LABEL}>Jenis</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["jajanan", "jasa"] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  className={pillClass(form.category_type === t)}
                  onClick={() =>
                    setForm({ ...form, category_type: t, category_id: "" })
                  }
                >
                  {t === "jajanan" ? "🍜 Jajanan" : "🛠️ Jasa"}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className={LABEL}>Kategori</span>
            <select
              className={selectClass("w-full")}
              value={form.category_id}
              onChange={(e) =>
                setForm({ ...form, category_id: e.target.value })
              }
            >
              <option value="">Pilih kategori</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </label>

          {form.category_type === "jasa" && (
            <label className="block">
              <span className={LABEL}>Radius jangkauan (km)</span>
              <input
                className={INPUT}
                type="number"
                min="1"
                max="20"
                value={form.service_radius_km}
                onChange={(e) =>
                  setForm({ ...form, service_radius_km: e.target.value })
                }
              />
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className={LABEL}>Kecamatan</span>
              <select
                className={`${INPUT} w-full`}
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              >
                <option value="">Pilih kecamatan</option>
                {KECAMATAN.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>

            {form.category_type === "jajanan" && (
              <label className="flex items-end pb-2.5 space-x-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.halal}
                  onChange={(e) =>
                    setForm({ ...form, halal: e.target.checked })
                  }
                  className="accent-emerald-600"
                />
                <span>Berhalal</span>
              </label>
            )}
          </div>

          <label className="block">
            <span className={LABEL}>Deskripsi singkat (opsional)</span>
            <input
              className={INPUT}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="mis. buka jam 6 pagi, khusus wilayah Lowokwaru"
            />
          </label>

          {formError && <p className={ERROR_LINE}>{formError}</p>}

          <button
            className={`${BTN_PRIMARY} w-full`}
            type="submit"
            disabled={submitting}
          >
            <i className="fa-solid fa-circle-check"></i>
            <span>{submitting ? "Mendaftarkan..." : "Daftar Sekarang"}</span>
          </button>
        </form>
      </div>
    );
  }

  // ---------- Sudah daftar: dashboard checkin + foto ----------
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-black text-slate-900 dark:text-white">
          {provider.name}
        </h2>
        <span
          className={`inline-flex items-center mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
            checkedInToday
              ? "bg-emerald-500/90 text-white"
              : "bg-rose-500/90 text-white"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full bg-white mr-1.5 ${
              checkedInToday ? "animate-pulse" : ""
            }`}
          ></span>
          {checkedInToday ? "Aktif hari ini" : "Belum checkin hari ini"}
        </span>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          {checkedInToday
            ? "Statusmu aktif hari ini. Konsumen di sekitar bisa melihatmu."
            : "Belum checkin hari ini — konsumen belum bisa menemukanmu."}
        </p>
      </div>

      <div className={`${CARD} p-5 sm:p-6 space-y-5`}>
        <button
          className={`${BTN_PRIMARY} w-full py-3 text-base`}
          onClick={handleCheckin}
          disabled={checkinStatus === "locating" || checkinStatus === "sending"}
        >
          <i className="fa-solid fa-location-crosshairs"></i>
          <span>
            {checkinStatus === "locating" && "Mengambil lokasi..."}
            {checkinStatus === "sending" && "Mengirim checkin..."}
            {checkinStatus === "idle" &&
              (checkedInToday
                ? "Checkin ulang (update lokasi)"
                : "Checkin sekarang")}
            {checkinStatus === "error" && "Coba lagi"}
          </span>
        </button>

        {checkinStatus === "error" && (
          <p className={ERROR_LINE}>{checkinError}</p>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className={LABEL}>
            Foto {provider.category_type === "jasa" ? "portofolio" : "jajanan"}
          </p>
          <PhotoUpload
            providerId={provider.id}
            onUploaded={(photoUrl) =>
              setProvider({ ...provider, photo_url: photoUrl })
            }
          />
          {provider.photo_url && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
              <i className="fa-solid fa-circle-check mr-1"></i> Foto tersimpan
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button className={BTN_SECONDARY} onClick={handleGantiAkun}>
            <i className="fa-solid fa-right-from-bracket"></i>
            <span>Ganti akun / keluar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
