import { describe, expect, it } from "vitest";
import { displayPhone, maskPhone, normalizeWa } from "./phone";

describe("normalizeWa", () => {
  it.each([
    ["081234567890", "6281234567890"],
    ["+62 812-3456-7890", "6281234567890"],
    ["6281234567890", "6281234567890"],
    ["81234567890", "6281234567890"],
    ["0857 2222 0002", "6285722220002"],
  ])("%s → %s", (input, expected) => expect(normalizeWa(input)).toBe(expected));

  it.each(["", null, undefined, "0812", "abc", "0212345"])("menolak %s", (input) => expect(normalizeWa(input)).toBeNull());
});

describe("tampilan nomor", () => {
  it("menyamarkan nomor untuk non-admin", () => expect(maskPhone("6281234567890")).toBe("0812****890"));
  it("menampilkan format lokal", () => expect(displayPhone("6281234567890")).toBe("081234567890"));
  it("kosong → -", () => expect(maskPhone(null)).toBe("-"));
});
