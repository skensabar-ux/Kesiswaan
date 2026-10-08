const FIELD_LABEL: Record<string, string> = { nisn: "NISN", nis: "NIS", nip: "NIP", username: "Username", code: "Kode", name: "Nama", letterNumber: "Nomor surat" };

/** Pesan ramah untuk pelanggaran unik. MySQL memberi nama indeks (mis. "Student_nisn_key"), PostgreSQL daftar kolom. */
export function duplicateMessage(target: unknown) {
  const raw = Array.isArray(target) ? target.join(",") : String(target ?? "");
  const fields = raw
    .replace(/^[A-Za-z]+_/, "")
    .replace(/_key$/, "")
    .split(/[_,]/)
    .map((f) => FIELD_LABEL[f])
    .filter(Boolean);
  return fields.length ? `${fields.join(" + ")} sudah dipakai oleh data lain.` : "Data duplikat — nilai tersebut sudah dipakai.";
}
