import "server-only";
import ExcelJS from "exceljs";
import type { ParentRelation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeWa } from "@/lib/phone";
import { fromWitaInput } from "@/lib/date";

/** Kolom template import siswa + orang tua (urutan = urutan di Excel). */
export const IMPORT_COLUMNS = [
  { key: "nisn", header: "NISN*", width: 14 },
  { key: "nis", header: "NIS", width: 10 },
  { key: "name", header: "Nama Siswa*", width: 30 },
  { key: "gender", header: "JK (L/P)*", width: 9 },
  { key: "birthDate", header: "Tanggal Lahir (YYYY-MM-DD)", width: 16 },
  { key: "className", header: "Kelas", width: 14 },
  { key: "address", header: "Alamat", width: 30 },
  { key: "fatherName", header: "Nama Ayah", width: 24 },
  { key: "fatherWa", header: "WA Ayah", width: 16 },
  { key: "motherName", header: "Nama Ibu", width: 24 },
  { key: "motherWa", header: "WA Ibu", width: 16 },
  { key: "guardianName", header: "Nama Wali", width: 24 },
  { key: "guardianWa", header: "WA Wali", width: 16 },
] as const;

type Key = (typeof IMPORT_COLUMNS)[number]["key"];

export type ParsedParent = { relation: ParentRelation; name: string; wa: string | null };
export type ParsedRow = {
  row: number;
  nisn: string;
  nis: string | null;
  name: string;
  gender: "L" | "P";
  birthDate: string | null;
  classId: string | null;
  className: string | null;
  address: string | null;
  parents: ParsedParent[];
};
export type RowError = { row: number; nisn?: string; name?: string; messages: string[] };
export type ImportReport = {
  totalRows: number;
  valid: number;
  errors: RowError[];
  created?: number;
  updated?: number;
  parentsCreated?: number;
  committed: boolean;
};

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) {
    // exceljs membaca tanggal Excel sebagai UTC
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("").trim();
    if ("text" in v) return String(v.text).trim();
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    return "";
  }
  return String(v).trim();
}

function normDate(s: string): string | null | "invalid" {
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // DD/MM/YYYY
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return "invalid";
}

/** Baca & validasi workbook. Tidak menulis ke database. */
export async function parseStudentWorkbook(buffer: ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet("Data Siswa") ?? wb.worksheets[0];
  if (!ws) throw new Error("Sheet data tidak ditemukan.");

  const classes = await prisma.class.findMany({ where: { academicYear: { isActive: true } }, select: { id: true, name: true } });
  const classByName = new Map(classes.map((c) => [c.name.toLowerCase().replace(/\s+/g, " "), c]));

  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];
  const seenNisn = new Map<string, number>();
  let totalRows = 0;

  ws.eachRow({ includeEmpty: false }, (r, rowNumber) => {
    if (rowNumber === 1) return; // header
    const get = (k: Key) => cellText(r.getCell(IMPORT_COLUMNS.findIndex((c) => c.key === k) + 1).value);
    const raw = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.key, get(c.key)])) as Record<Key, string>;
    if (Object.values(raw).every((v) => !v)) return;
    totalRows++;

    const msgs: string[] = [];
    const nisn = raw.nisn.replace(/\s/g, "");
    if (!/^\d{10}$/.test(nisn)) msgs.push("NISN harus 10 digit angka");
    else if (seenNisn.has(nisn)) msgs.push(`NISN duplikat dengan baris ${seenNisn.get(nisn)}`);
    else seenNisn.set(nisn, rowNumber);

    if (!raw.name) msgs.push("Nama siswa wajib diisi");
    const g = raw.gender.toUpperCase();
    const gender = g === "L" || g.startsWith("LAKI") ? "L" : g === "P" || g.startsWith("PEREMPUAN") ? "P" : null;
    if (!gender) msgs.push("JK harus L atau P");

    const birth = normDate(raw.birthDate);
    if (birth === "invalid") msgs.push("Tanggal lahir tidak valid (gunakan YYYY-MM-DD)");

    let classId: string | null = null;
    if (raw.className) {
      const c = classByName.get(raw.className.toLowerCase().replace(/\s+/g, " "));
      if (!c) msgs.push(`Kelas "${raw.className}" tidak ditemukan di tahun ajaran aktif`);
      else classId = c.id;
    }

    const parents: ParsedParent[] = [];
    const addParent = (relation: ParentRelation, label: string, name: string, waRaw: string) => {
      if (!name && !waRaw) return;
      if (!name) {
        msgs.push(`Nama ${label} wajib diisi bila WA ${label} diisi`);
        return;
      }
      const wa = waRaw ? normalizeWa(waRaw) : null;
      if (waRaw && !wa) msgs.push(`WA ${label} tidak valid`);
      parents.push({ relation, name, wa });
    };
    addParent("AYAH", "Ayah", raw.fatherName, raw.fatherWa);
    addParent("IBU", "Ibu", raw.motherName, raw.motherWa);
    addParent("WALI", "Wali", raw.guardianName, raw.guardianWa);

    if (msgs.length) {
      errors.push({ row: rowNumber, nisn: raw.nisn, name: raw.name, messages: msgs });
      return;
    }
    rows.push({
      row: rowNumber,
      nisn,
      nis: raw.nis || null,
      name: raw.name,
      gender: gender!,
      birthDate: birth as string | null,
      classId,
      className: raw.className || null,
      address: raw.address || null,
      parents,
    });
  });

  return { rows, errors, totalRows };
}

/** Simpan baris valid (upsert siswa by NISN; ortu dicocokkan per hubungan). Tiap baris transaksi sendiri. */
export async function commitStudentRows(rows: ParsedRow[]) {
  let created = 0;
  let updated = 0;
  let parentsCreated = 0;
  const errors: RowError[] = [];

  for (const r of rows) {
    try {
      await prisma.$transaction(async (tx) => {
        const data = {
          nis: r.nis,
          name: r.name,
          gender: r.gender,
          birthDate: r.birthDate ? fromWitaInput(r.birthDate) : null,
          address: r.address,
          ...(r.classId ? { classId: r.classId } : {}),
        };
        const existing = await tx.student.findUnique({ where: { nisn: r.nisn }, include: { parents: { include: { parent: true } } } });
        const student = existing
          ? await tx.student.update({ where: { id: existing.id }, data })
          : await tx.student.create({ data: { nisn: r.nisn, ...data } });
        if (existing) updated++;
        else created++;

        for (const [i, p] of r.parents.entries()) {
          const linked = existing?.parents.find((sp) => sp.parent.relation === p.relation);
          if (linked) {
            await tx.parent.update({ where: { id: linked.parentId }, data: { name: p.name, ...(p.wa ? { waNumber: p.wa } : {}) } });
          } else {
            const parent = await tx.parent.create({ data: { name: p.name, relation: p.relation, waNumber: p.wa } });
            await tx.studentParent.create({ data: { studentId: student.id, parentId: parent.id, isPrimary: i === 0 && !existing?.parents.length } });
            parentsCreated++;
          }
        }
      });
    } catch (e) {
      console.error("[import] baris", r.row, e);
      errors.push({ row: r.row, nisn: r.nisn, name: r.name, messages: ["Gagal disimpan ke database"] });
    }
  }
  return { created, updated, parentsCreated, errors };
}

/** Buat workbook template (sheet Data Siswa, Petunjuk, Daftar Kelas). */
export async function buildTemplateWorkbook() {
  const classes = await prisma.class.findMany({
    where: { academicYear: { isActive: true } },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    select: { name: true, major: true },
  });
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistem Kesiswaan";
  const ws = wb.addWorksheet("Data Siswa", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = IMPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width, style: { numFmt: "@" } }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F5BB7" } };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 30;
  ws.addRow({
    nisn: "0081234567",
    nis: "2425001",
    name: "Contoh Nama Siswa",
    gender: "L",
    birthDate: "2009-05-17",
    className: classes[0]?.name ?? "X TKJ 1",
    address: "Banjar, Buleleng",
    fatherName: "Nama Ayah",
    fatherWa: "081234567890",
    motherName: "Nama Ibu",
    motherWa: "081298765432",
  });
  for (let i = 2; i <= 1000; i++) {
    ws.getCell(`D${i}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"L,P"'] };
  }

  const help = wb.addWorksheet("Petunjuk");
  help.columns = [{ width: 110 }];
  [
    "PETUNJUK IMPORT DATA SISWA & ORANG TUA",
    "",
    "1. Isi data mulai baris 2 pada sheet 'Data Siswa'. Hapus baris contoh sebelum import.",
    "2. Kolom bertanda * wajib diisi. Format kolom sudah Teks agar angka 0 di depan NISN tidak hilang.",
    "3. NISN harus 10 digit dan unik. Bila NISN sudah ada di sistem, data siswa akan DIPERBARUI.",
    "4. JK diisi L (laki-laki) atau P (perempuan).",
    "5. Kelas harus sama persis dengan nama kelas di tahun ajaran aktif (lihat sheet 'Daftar Kelas').",
    "6. Nomor WA boleh diawali 08, 62, atau +62. Nama orang tua wajib diisi bila nomor WA diisi.",
    "7. Orang tua dicocokkan per hubungan (Ayah/Ibu/Wali) pada siswa yang sama — import ulang tidak membuat data ganda.",
    "8. Gunakan tombol 'Periksa' terlebih dahulu; baris yang salah akan dilaporkan beserta alasannya.",
  ].forEach((t, i) => {
    const row = help.addRow([t]);
    if (i === 0) row.font = { bold: true, size: 13 };
  });

  const cls = wb.addWorksheet("Daftar Kelas");
  cls.columns = [
    { header: "Nama Kelas", key: "name", width: 20 },
    { header: "Jurusan", key: "major", width: 14 },
  ];
  cls.getRow(1).font = { bold: true };
  classes.forEach((c) => cls.addRow(c));

  return wb;
}
