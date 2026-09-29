import { describe, expect, it } from "vitest";
import { renderTemplate } from "./template";

describe("renderTemplate", () => {
  it("mengganti placeholder", () => {
    expect(renderTemplate("Yth. {nama_ortu}, ananda {nama_siswa} ({kelas})", { nama_ortu: "Bapak Made", nama_siswa: "Putu", kelas: "XI TKJ 1" })).toBe(
      "Yth. Bapak Made, ananda Putu (XI TKJ 1)",
    );
  });
  it("angka & placeholder berulang", () => expect(renderTemplate("{poin} + {poin}", { poin: 5 })).toBe("5 + 5"));
  it("placeholder tak dikenal dibiarkan", () => expect(renderTemplate("{tidak_ada}", {})).toBe("{tidak_ada}"));
});
