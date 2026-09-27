import { describe, expect, it } from "vitest";
import { formatDateTime, formatLongDate, fromWitaInput, monthRoman, toDateInput, toTimeInput } from "./date";

describe("tanggal WITA", () => {
  it("format panjang Indonesia", () => {
    expect(formatLongDate(fromWitaInput("2026-09-28"))).toBe("Senin, 28 September 2026");
  });

  it("input WITA disimpan sebagai UTC (UTC+8)", () => {
    const d = fromWitaInput("2026-09-28", "07:30");
    expect(d.toISOString()).toBe("2026-09-27T23:30:00.000Z");
    expect(toDateInput(d)).toBe("2026-09-28");
    expect(toTimeInput(d)).toBe("07:30");
  });

  it("format tanggal & jam lengkap", () => {
    expect(formatDateTime(fromWitaInput("2026-09-28", "07:30"))).toBe("Senin, 28 September 2026 pukul 07.30 WITA");
  });

  it("menolak input tidak valid", () => expect(() => fromWitaInput("28/09/2026")).toThrow());

  it("bulan romawi", () => {
    expect(monthRoman(1)).toBe("I");
    expect(monthRoman(9)).toBe("IX");
    expect(monthRoman(12)).toBe("XII");
  });
});
