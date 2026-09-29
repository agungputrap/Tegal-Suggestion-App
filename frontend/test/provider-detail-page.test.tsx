import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderDetailPage } from "../src/pages/ProviderDetailPage";
import type { Category, Item, Provider } from "../src/api";

const PROVIDER: Provider = {
  id: "prov-1",
  name: "Nasi Goreng Bu Sri",
  phone: "08123456789",
  category_type: "jajanan",
  category_id: "nasi-goreng",
  description: "buka jam 6 pagi",
  photo_url: null,
  base_lat: -6.87,
  base_lng: 109.14,
  service_radius_km: 5,
  area: "Tegal Barat",
  halal: 1,
  approval_status: "approved",
};

const ITEMS: Item[] = [
  {
    id: "i1",
    provider_id: "prov-1",
    name: "Nasi Goreng Spesial",
    price: 15000,
    note: "level 1",
    available: 1,
    sort_order: 0,
  },
  {
    id: "i2",
    provider_id: "prov-1",
    name: "Es Teh Manis",
    price: 3000,
    note: null,
    available: 0,
    sort_order: 1,
  },
];

const CATEGORIES: Category[] = [
  { id: "nasi-goreng", name: "Nasi Goreng", type: "jajanan", icon: "🍛" },
];

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  } as Response;
}

// Stub fetch sesuai endpoint yang dipakai ProviderDetailPage.
// Catatan: cek /items & /view sebelum /providers/<id> supaya tidak
// ketukar oleh string matching.
function stubFetch(opts?: { providerStatus?: number }): ReturnType<typeof vi.fn> {
  const providerStatus = opts?.providerStatus ?? 200;
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/providers/prov-1/items"))
      return jsonResponse({ items: providerStatus === 404 ? [] : ITEMS });
    if (url.includes("/providers/prov-1/view"))
      return jsonResponse({ status: "ok" });
    if (url.includes("/providers/prov-1"))
      return jsonResponse({ provider: PROVIDER }, providerStatus);
    if (url.includes("/categories"))
      return jsonResponse({ categories: CATEGORIES });
    return jsonResponse({ error: "not found" }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProviderDetailPage", () => {
  it("menampilkan nama, kategori, deskripsi, dan item tersedia", async () => {
    stubFetch();
    render(<ProviderDetailPage id="prov-1" onBack={() => {}} />);

    expect(await screen.findByText("Nasi Goreng Bu Sri")).toBeInTheDocument();
    expect(screen.getByText("Nasi Goreng")).toBeInTheDocument();
    expect(screen.getByText("buka jam 6 pagi")).toBeInTheDocument();
    expect(screen.getByText("Nasi Goreng Spesial")).toBeInTheDocument();
    expect(screen.getByText("Rp 15.000")).toBeInTheDocument();
    // item available=0 tidak ditampilkan
    expect(screen.queryByText("Es Teh Manis")).not.toBeInTheDocument();
  });

  it("CTA WhatsApp mengarah ke nomor yang benar", async () => {
    stubFetch();
    render(<ProviderDetailPage id="prov-1" onBack={() => {}} />);

    const wa = (
      await screen.findByText(/Chat WhatsApp/)
    ).closest("a");
    expect(wa).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me/628123456789"),
    );
  });

  it("mencatat 1 view saat halaman dibuka (#4b trending)", async () => {
    const fetchMock = stubFetch();
    render(<ProviderDetailPage id="prov-1" onBack={() => {}} />);

    await screen.findByText("Nasi Goreng Bu Sri");
    expect(
      fetchMock.mock.calls.some(
        ([input]) =>
          String(input).includes("/providers/prov-1/view") === true,
      ),
    ).toBe(true);
  });

  it("menampilkan pesan tidak ditemukan saat provider 404", async () => {
    stubFetch({ providerStatus: 404 });
    render(<ProviderDetailPage id="prov-1" onBack={() => {}} />);

    expect(
      await screen.findByText("Penyedia tidak ditemukan"),
    ).toBeInTheDocument();
  });
});
