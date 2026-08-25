import { useEffect, useState } from "react";
import {
  checkin,
  createProvider,
  fetchCategories,
  fetchProvider,
} from "../api";
import type { Category, Provider } from "../api";
import { PhotoUpload } from "../components/PhotoUpload";
import {
  clearStoredProvider,
  getLastCheckinDate,
  getStoredProviderId,
  setLastCheckinDate,
  setStoredProviderId,
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
};

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  category_type: "jajanan",
  category_id: "",
  description: "",
  service_radius_km: "2",
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
    (c) => c.type === form.category_type
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
      const id = await createProvider({
        name: form.name,
        phone: form.phone,
        category_type: form.category_type,
        category_id: form.category_id,
        description: form.description || undefined,
        service_radius_km:
          form.category_type === "jasa"
            ? parseFloat(form.service_radius_km) || 0
            : 0,
      });

      setStoredProviderId(id);
      const p = await fetchProvider(id);
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
        setCheckinError("Izin lokasi ditolak. Checkin butuh lokasimu saat ini.");
      },
      { timeout: 8000 }
    );
  }

  function handleGantiAkun() {
    clearStoredProvider();
    setProvider(null);
    setForm(EMPTY_FORM);
    setCheckedInToday(false);
  }

  if (loadingProvider) {
    return <p className="status-line">memuat...</p>;
  }

  // ---------- Belum daftar: tampilkan form registrasi ----------
  if (!provider) {
    return (
      <>
        <header className="header">
          <h1 className="header__title">Daftar Jadi Penyedia</h1>
          <p className="header__subtitle">
            Jualan jajanan atau tawarkan jasa? Daftar sekali, checkin tiap
            hari kamu buka.
          </p>
        </header>

        <form className="form" onSubmit={handleRegister}>
          <label className="form__field">
            <span>Nama {form.category_type === "jasa" ? "/ usaha" : "warung"}</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="mis. Nasi Goreng Bu Sri / Servis AC Pak Bud"
            />
          </label>

          <label className="form__field">
            <span>Nomor WhatsApp</span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08123456789"
              inputMode="tel"
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
                  data-active={form.category_type === t}
                  onClick={() =>
                    setForm({ ...form, category_type: t, category_id: "" })
                  }
                >
                  {t === "jajanan" ? "Jajanan" : "Jasa"}
                </button>
              ))}
            </div>
          </div>

          <label className="form__field">
            <span>Kategori</span>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">Pilih kategori</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {form.category_type === "jasa" && (
            <label className="form__field">
              <span>Radius jangkauan (km)</span>
              <input
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

          <label className="form__field">
            <span>Deskripsi singkat (opsional)</span>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="mis. buka jam 6 pagi, khusus wilayah Lowokwaru"
            />
          </label>

          {formError && <p className="status-line form__error">{formError}</p>}

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Mendaftarkan..." : "Daftar"}
          </button>
        </form>
      </>
    );
  }

  // ---------- Sudah daftar: dashboard checkin + foto ----------
  return (
    <>
      <header className="header">
        <h1 className="header__title">{provider.name}</h1>
        <p className="header__subtitle">
          {checkedInToday
            ? "Statusmu aktif hari ini. Konsumen di sekitar bisa melihatmu."
            : "Belum checkin hari ini — konsumen belum bisa menemukanmu."}
        </p>
      </header>

      <div className="dashboard">
        <button
          className="btn-primary"
          onClick={handleCheckin}
          disabled={checkinStatus === "locating" || checkinStatus === "sending"}
        >
          {checkinStatus === "locating" && "Mengambil lokasi..."}
          {checkinStatus === "sending" && "Mengirim checkin..."}
          {checkinStatus === "idle" &&
            (checkedInToday ? "Checkin ulang (update lokasi)" : "Checkin sekarang")}
          {checkinStatus === "error" && "Coba lagi"}
        </button>

        {checkinStatus === "error" && (
          <p className="status-line form__error">{checkinError}</p>
        )}

        <div className="dashboard__section">
          <p className="dashboard__label">Foto {form.category_type === "jasa" ? "portofolio" : "jajanan"}</p>
          <PhotoUpload
            providerId={provider.id}
            onUploaded={(photoUrl) =>
              setProvider({ ...provider, photo_url: photoUrl })
            }
          />
          {provider.photo_url && (
            <p className="status-line">Foto tersimpan ✓</p>
          )}
        </div>

        <button className="btn-secondary" onClick={handleGantiAkun}>
          Ganti akun / keluar
        </button>
      </div>
    </>
  );
}
