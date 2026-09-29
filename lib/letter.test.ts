import { describe, expect, it } from "vitest";
import { initialsOf, nextLetterType, renderLetterBody } from "./letter";
import { fromWitaInput } from "./date";

describe("surat", () => {
  it("tingkat berikutnya", () => {
    expect(nextLetterType(null)).toBe("PANGGILAN_1");
    expect(nextLetterType("PANGGILAN_1")).toBe("PANGGILAN_2");
    expect(nextLetterType("PANGGILAN_3")).toBe("PERJANJIAN");
  });
  it("render placeholder surat", () => {
    const body = renderLetterBody("{nomor_surat}|{nama_ortu}|{nama_siswa}|{kelas}|{hari_tanggal}|{jam}|{tempat}|{perihal}|{nama_bk}|{nama_kepsek}|{nip_kepsek}", {
      letterNumber: "421.5/001/X",
      parentName: "Bapak Made",
      studentName: "Putu",
      className: "XI TKJ 1",
      meetingAt: fromWitaInput("2026-10-05", "09:00"),
      place: "Ruang BK",
      subject: "Pembinaan",
      bkName: "Bu Ariani",
      principalName: "Pak Kepsek",
      principalNip: "1969",
    });
    expect(body).toBe("421.5/001/X|Bapak Made|Putu|XI TKJ 1|Senin, 5 Oktober 2026|09.00|Ruang BK|Pembinaan|Bu Ariani|Pak Kepsek|1969");
  });
  it("inisial untuk verifikasi publik", () => expect(initialsOf("I Kadek Dharma Putra")).toBe("I. K. D. P."));
});
