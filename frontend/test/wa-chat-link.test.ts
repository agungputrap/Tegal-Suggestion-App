import { describe, expect, it } from "vitest";
import { waChatLink } from "../src/api";

describe("waChatLink", () => {
  it("mengonversi nomor 08… menjadi 62… (E.164)", () => {
    const link = waChatLink("08123456789", "Warung Bu Sri");
    expect(link).toContain("https://wa.me/628123456789");
  });

  it("membuang karakter non-digit", () => {
    const link = waChatLink("+62 812-3456-7890", "X");
    expect(link).toContain("https://wa.me/6281234567890");
  });

  it("memuat pesan dengan nama penyedia", () => {
    const link = decodeURIComponent(waChatLink("08123456789", "Warung Bu Sri"));
    expect(link).toContain("Warung Bu Sri");
  });
});
