import { describe, expect, it } from "vitest";
import { canAccessPath, homePathFor, isPublicPath } from "./roles";

describe("aturan akses route", () => {
  it("master data hanya admin", () => {
    expect(canAccessPath("ADMIN", "/master/siswa")).toBe(true);
    for (const r of ["PKS", "GURU", "WALI_KELAS", "BK", "KEPSEK", "ORANG_TUA"] as const) {
      expect(canAccessPath(r, "/master/siswa")).toBe(false);
    }
  });

  it("verifikasi kejadian hanya PKS & admin, meski /kejadian terbuka untuk staf", () => {
    expect(canAccessPath("GURU", "/kejadian")).toBe(true);
    expect(canAccessPath("GURU", "/kejadian/verifikasi")).toBe(false);
    expect(canAccessPath("PKS", "/kejadian/verifikasi")).toBe(true);
  });

  it("orang tua hanya portal ortu", () => {
    expect(canAccessPath("ORANG_TUA", "/ortu")).toBe(true);
    expect(canAccessPath("ORANG_TUA", "/")).toBe(false);
    expect(canAccessPath("ORANG_TUA", "/siswa/abc")).toBe(false);
    expect(homePathFor("ORANG_TUA")).toBe("/ortu");
  });

  it("prefix tidak bocor ke path serupa", () => {
    expect(canAccessPath("GURU", "/masterx")).toBe(true); // jatuh ke aturan "/" (staf)
    expect(canAccessPath("ORANG_TUA", "/ortux")).toBe(false);
  });

  it("route publik", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/verifikasi/abc")).toBe(true);
    expect(isPublicPath("/api/cron/wa-queue")).toBe(true);
    expect(isPublicPath("/api/files/x")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
  });
});
