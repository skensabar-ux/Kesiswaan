import { describe, expect, it } from "vitest";
import { counterScope, counterYear, formatLetterNumber } from "./letter-number";
import { fromWitaInput } from "./date";

const FMT = "421.5/{urut}/SMKN1BJR/BK/{bulan_romawi}/{tahun}";

describe("formatLetterNumber", () => {
  it("format default", () => {
    expect(formatLetterNumber(FMT, 7, fromWitaInput("2026-09-28"))).toBe("421.5/007/SMKN1BJR/BK/IX/2026");
  });
  it("urut > 999 tidak dipotong", () => {
    expect(formatLetterNumber(FMT, 1234, fromWitaInput("2026-12-01"))).toBe("421.5/1234/SMKN1BJR/BK/XII/2026");
  });
  it("placeholder {bulan} 2 digit", () => {
    expect(formatLetterNumber("{urut}/{bulan}/{tahun}", 1, fromWitaInput("2027-01-15"))).toBe("001/01/2027");
  });
  it("memakai tanggal WITA, bukan UTC (31 Des 23.30 WITA = 31 Des)", () => {
    const d = fromWitaInput("2026-12-31", "23:30"); // = 31 Des 15.30 UTC
    expect(formatLetterNumber(FMT, 1, d)).toBe("421.5/001/SMKN1BJR/BK/XII/2026");
  });
  it("1 Jan 00.30 WITA masuk tahun baru (counter reset)", () => {
    const d = fromWitaInput("2027-01-01", "00:30"); // = 31 Des 16.30 UTC
    expect(counterYear(d)).toBe(2027);
    expect(formatLetterNumber(FMT, 1, d)).toBe("421.5/001/SMKN1BJR/BK/I/2027");
  });
  it("placeholder {jenis}", () => {
    expect(formatLetterNumber("{urut}/{jenis}/BK/{tahun}", 3, fromWitaInput("2026-09-28"), "PANGGILAN_2")).toBe("003/SP2/BK/2026");
  });
});

describe("counterScope", () => {
  it("tanpa {jenis}: semua jenis berbagi satu urutan (nomor tidak kembar)", () => {
    expect(counterScope(FMT, "PANGGILAN_1")).toBe("ALL");
    expect(counterScope(FMT, "PERJANJIAN")).toBe("ALL");
  });
  it("dengan {jenis}: urutan per jenis", () => {
    expect(counterScope("{urut}/{jenis}/{tahun}", "PANGGILAN_3")).toBe("SP3");
  });
});
