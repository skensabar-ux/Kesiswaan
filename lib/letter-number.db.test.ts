/**
 * Uji integrasi penomoran surat dengan database sungguhan (dilewati bila DATABASE_URL tidak ada).
 * Membuktikan: nomor unik & berurutan meski dibuat bersamaan, dan counter terpisah per jenis & tahun.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { loadEnvConfig } from "@next/env";

vi.mock("server-only", () => ({}));
loadEnvConfig(process.cwd());
const hasDb = Boolean(process.env.DATABASE_URL);
const TEST_YEAR = 1999; // tahun khusus uji agar tidak mengganggu data asli

describe.skipIf(!hasDb)("nextLetterSequence (database)", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const { ensureLetterCounter, nextLetterSequence } = await import("./letter-number");
  const { fromWitaInput } = await import("./date");
  const prisma = new PrismaClient();
  const date = fromWitaInput(`${TEST_YEAR}-06-15`);

  afterAll(async () => {
    await prisma.letterCounter.deleteMany({ where: { year: { in: [TEST_YEAR, TEST_YEAR + 1] } } });
    await prisma.$disconnect();
  });

  it("20 transaksi bersamaan menghasilkan nomor 1..20 tanpa duplikat", async () => {
    await prisma.letterCounter.deleteMany({ where: { year: TEST_YEAR } });
    // baris baru, lalu 20 transaksi berebut counter yang sama
    await Promise.all(Array.from({ length: 5 }, () => ensureLetterCounter(prisma, "ALL", date)));
    const nums = await Promise.all(
      Array.from({ length: 20 }, () => prisma.$transaction((tx) => nextLetterSequence(tx, "ALL", date), { timeout: 20_000 })),
    );
    expect([...nums].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("counter terpisah per scope (format dengan {jenis})", async () => {
    await ensureLetterCounter(prisma, "SP2", date);
    const n = await prisma.$transaction((tx) => nextLetterSequence(tx, "SP2", date));
    expect(n).toBe(1);
  });

  it("counter reset di tahun berikutnya", async () => {
    await ensureLetterCounter(prisma, "ALL", fromWitaInput(`${TEST_YEAR + 1}-01-02`));
    const n = await prisma.$transaction((tx) => nextLetterSequence(tx, "ALL", fromWitaInput(`${TEST_YEAR + 1}-01-02`)));
    expect(n).toBe(1);
  });

  it("tanpa ensureLetterCounter → error jelas (bukan nomor 0)", async () => {
    await expect(prisma.$transaction((tx) => nextLetterSequence(tx, "SPN", date))).rejects.toThrow(/belum dibuat/);
  });

  it("transaksi yang gagal tidak menghabiskan nomor", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await nextLetterSequence(tx, "ALL", date);
        throw new Error("batal");
      }),
    ).rejects.toThrow("batal");
    const n = await prisma.$transaction((tx) => nextLetterSequence(tx, "ALL", date));
    expect(n).toBe(21);
  });
});
