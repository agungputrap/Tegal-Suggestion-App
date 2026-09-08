import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoryFilter } from "../src/components/CategoryFilter";
import { ListingCard } from "../src/components/ListingCard";
import type { Listing } from "../src/api";

const LISTING: Listing = {
  id: "p1",
  name: "Nasi Goreng Bu Sri",
  phone: "08123456789",
  category_type: "jajanan",
  category_id: "nasi-goreng",
  description: "buka jam 6 pagi",
  photo_url: null,
  checkin_lat: -6.87,
  checkin_lng: 109.14,
  distance_km: 5.5,
  area: "Tegal Barat",
  halal: 1,
  views: 0,
};

describe("CategoryFilter", () => {
  it("merender tiga pilihan", () => {
    render(<CategoryFilter active="semua" onChange={() => {}} />);
    expect(screen.getByText("🍽️ Semua")).toBeInTheDocument();
    expect(screen.getByText("🍜 Jajanan")).toBeInTheDocument();
    expect(screen.getByText("🛠️ Jasa")).toBeInTheDocument();
  });

  it("memanggil onChange saat pill diklik", async () => {
    const onChange = vi.fn();
    render(<CategoryFilter active="semua" onChange={onChange} />);
    await userEvent.click(screen.getByText("🍜 Jajanan"));
    expect(onChange).toHaveBeenCalledWith("jajanan");
  });
});

describe("ListingCard", () => {
  it("menampilkan nama, kategori, badge halal, dan jarak", () => {
    render(
      <ListingCard listing={LISTING} categoryName="Nasi Goreng" categoryIcon="🍛" />
    );
    expect(screen.getByText("Nasi Goreng Bu Sri")).toBeInTheDocument();
    expect(screen.getByText("Nasi Goreng")).toBeInTheDocument();
    expect(screen.getByText(/Halal/)).toBeInTheDocument();
    expect(screen.getByText(/5.5 km/)).toBeInTheDocument();
  });

  it("CTA WhatsApp mengarah ke nomor yang benar", () => {
    render(
      <ListingCard listing={LISTING} categoryName="Nasi Goreng" />
    );
    const wa = screen.getByText("Chat WhatsApp").closest("a");
    expect(wa).toHaveAttribute("href", expect.stringContaining("wa.me/628123456789"));
  });

  it("membuka detail saat kartu diklik", async () => {
    const onOpenDetail = vi.fn();
    render(
      <ListingCard
        listing={LISTING}
        categoryName="Nasi Goreng"
        onOpenDetail={onOpenDetail}
      />
    );
    await userEvent.click(screen.getByText("Nasi Goreng Bu Sri"));
    expect(onOpenDetail).toHaveBeenCalledOnce();
  });
});
