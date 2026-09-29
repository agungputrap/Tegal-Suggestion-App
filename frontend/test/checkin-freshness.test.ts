import { describe, expect, it } from "vitest";
import {
  isStaleCheckin,
  relativeCheckinLabel,
} from "../src/explorer/helpers";

// Basis waktu uji: 2026-09-29 10:00:00 UTC
const NOW = Date.parse("2026-09-29T10:00:00Z");

describe("relativeCheckinLabel", () => {
  it("timestamp SQLite UTC 'YYYY-MM-DD HH:MM:SS' terbaca", () => {
    expect(relativeCheckinLabel("2026-09-29 09:45:00", NOW)).toBe("15 mnt lalu");
  });

  it("kurang dari 1 menit → 'baru saja'", () => {
    expect(relativeCheckinLabel("2026-09-29 09:59:30", NOW)).toBe("baru saja");
  });

  it("lebih dari 1 jam → 'X jam lalu'", () => {
    expect(relativeCheckinLabel("2026-09-29 07:00:00", NOW)).toBe("3 jam lalu");
  });

  it("lebih dari sehari → null (jangan tampilkan)", () => {
    expect(relativeCheckinLabel("2026-09-27 09:00:00", NOW)).toBe(null);
  });

  it("input kosong/rusak → null", () => {
    expect(relativeCheckinLabel(undefined, NOW)).toBe(null);
    expect(relativeCheckinLabel(null, NOW)).toBe(null);
    expect(relativeCheckinLabel("bukan-tanggal", NOW)).toBe(null);
  });
});

describe("isStaleCheckin (ambang 4 jam)", () => {
  it("3 jam 59 menit → masih segar", () => {
    expect(isStaleCheckin("2026-09-29 06:01:00", NOW)).toBe(false);
  });

  it("4 jam 1 menit → basi", () => {
    expect(isStaleCheckin("2026-09-29 05:59:00", NOW)).toBe(true);
  });

  it("tanpa timestamp → tidak dianggap basi (fallback label lama)", () => {
    expect(isStaleCheckin(undefined, NOW)).toBe(false);
  });
});
