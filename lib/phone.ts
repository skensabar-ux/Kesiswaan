/** Normalisasi nomor WA Indonesia ke format 62xxxxxxxxxx. Mengembalikan null jika tidak valid. */
export function normalizeWa(input: string | null | undefined): string | null {
  if (!input) return null;
  let n = String(input).replace(/[^\d+]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  if (!/^62\d{8,13}$/.test(n)) return null;
  return n;
}

/** Samarkan nomor untuk tampilan non-admin: 0812****6789 */
export function maskPhone(n: string | null | undefined): string {
  if (!n) return "-";
  const local = n.startsWith("62") ? "0" + n.slice(2) : n;
  if (local.length < 8) return "****";
  return local.slice(0, 4) + "****" + local.slice(-3);
}

/** Tampilan nomor lengkap: 0812-3456-789 */
export function displayPhone(n: string | null | undefined): string {
  if (!n) return "-";
  return n.startsWith("62") ? "0" + n.slice(2) : n;
}
