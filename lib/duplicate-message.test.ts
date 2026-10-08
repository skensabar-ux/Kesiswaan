import { describe, expect, it } from "vitest";
import { duplicateMessage } from "./duplicate-message";

describe("duplicateMessage", () => {
  it("menerjemahkan nama indeks MySQL", () => {
    expect(duplicateMessage("Student_nisn_key")).toBe("NISN sudah dipakai oleh data lain.");
    expect(duplicateMessage("User_username_key")).toBe("Username sudah dipakai oleh data lain.");
  });
  it("menerima daftar kolom", () => {
    expect(duplicateMessage(["nip"])).toBe("NIP sudah dipakai oleh data lain.");
  });
  it("indeks gabungan", () => {
    expect(duplicateMessage("Class_name_academicYearId_key")).toBe("Nama sudah dipakai oleh data lain.");
  });
  it("tidak dikenal → pesan umum", () => {
    expect(duplicateMessage(undefined)).toBe("Data duplikat — nilai tersebut sudah dipakai.");
  });
});
