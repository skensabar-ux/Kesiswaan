import type { LetterType, Prisma } from "@prisma/client";
import { monthRoman, witaParts } from "@/lib/date";

/** Kode singkat jenis surat untuk placeholder {jenis}. */
export const LETTER_CODE: Record<LetterType, string> = {
  PANGGILAN_1: "SP1",
  PANGGILAN_2: "SP2",
  PANGGILAN_3: "SP3",
  PERJANJIAN: "SPJ",
  PERNYATAAN: "SPN",
};

/**
 * Lingkup counter: bila format TIDAK memuat {jenis}, semua jenis surat berbagi satu urutan per tahun
 * (agar nomor tidak pernah kembar). Bila memuat {jenis}, tiap jenis punya urutan sendiri.
 */
export function counterScope(format: string, type: LetterType) {
  return format.includes("{jenis}") ? LETTER_CODE[type] : "ALL";
}

/**
 * Format nomor surat dari template setting, mis. "421.5/{urut}/SMKN1BJR/BK/{bulan_romawi}/{tahun}".
 * Placeholder: {urut} (3 digit), {jenis} (SP1/SP2/SP3/SPJ/SPN), {bulan_romawi}, {bulan} (2 digit), {tahun}.
 * Tanggal dibaca dalam WITA.
 */
export function formatLetterNumber(format: string, seq: number, date: Date, type: LetterType = "PANGGILAN_1") {
  const p = witaParts(date);
  return format
    .replaceAll("{urut}", String(seq).padStart(3, "0"))
    .replaceAll("{jenis}", LETTER_CODE[type])
    .replaceAll("{bulan_romawi}", monthRoman(p.month))
    .replaceAll("{bulan}", String(p.month).padStart(2, "0"))
    .replaceAll("{tahun}", String(p.year));
}

/** Tahun counter (reset tiap tahun kalender WITA). */
export function counterYear(date: Date) {
  return witaParts(date).year;
}

type Client = Pick<Prisma.TransactionClient, "$executeRaw">;

/**
 * Pastikan baris counter (tahun, jenis) ada. Panggil DI LUAR transaksi (autocommit):
 * INSERT + UPDATE di transaksi yang sama bisa deadlock (MySQL 1213) saat banyak surat
 * pertama di tahun itu dibuat bersamaan.
 */
export async function ensureLetterCounter(client: Client, scope: string, date: Date) {
  const year = counterYear(date);
  const id = `c${year}${scope}`.toLowerCase();
  await client.$executeRaw`INSERT IGNORE INTO LetterCounter (id, year, scope, lastNumber) VALUES (${id}, ${year}, ${scope}, 0)`;
}

/**
 * Ambil nomor urut berikutnya — WAJIB dipanggil di dalam prisma.$transaction, setelah ensureLetterCounter().
 * Memakai `LAST_INSERT_ID(expr)`: UPDATE mengunci baris counter sampai transaksi selesai, sehingga surat
 * yang dibuat bersamaan mengantre dan tidak mungkin mendapat nomor sama. Bila transaksi batal, nomor tidak terpakai.
 */
export async function nextLetterSequence(tx: Prisma.TransactionClient, scope: string, date: Date): Promise<number> {
  const year = counterYear(date);
  const updated = await tx.$executeRaw`UPDATE LetterCounter SET lastNumber = LAST_INSERT_ID(lastNumber + 1) WHERE year = ${year} AND scope = ${scope}`;
  if (updated !== 1) throw new Error(`Counter surat ${scope}/${year} belum dibuat (panggil ensureLetterCounter dulu).`);
  const rows = await tx.$queryRaw<{ n: bigint }[]>`SELECT LAST_INSERT_ID() AS n`;
  return Number(rows[0]!.n);
}

export async function nextLetterNumber(tx: Prisma.TransactionClient, format: string, type: LetterType, date: Date) {
  const seq = await nextLetterSequence(tx, counterScope(format, type), date);
  return { seq, number: formatLetterNumber(format, seq, date, type) };
}

/** Jalankan ulang fungsi transaksi bila terkena deadlock/serialization (MySQL 1213/1205). */
export async function withTxRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (i >= attempts || !/1213|1205|deadlock|lock wait timeout/i.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 50 * i + Math.random() * 50));
    }
  }
}
