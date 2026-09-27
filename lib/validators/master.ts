import { z } from "zod";
import { normalizeWa } from "@/lib/phone";

const req = (label: string, max = 191) =>
  z.string().trim().min(1, `${label} wajib diisi`).max(max, `${label} maksimal ${max} karakter`);
const opt = (max = 191) => z.string().trim().max(max, `Maksimal ${max} karakter`).optional().or(z.literal(""));
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid")
  .optional()
  .or(z.literal(""));
const waStr = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || normalizeWa(v) !== null, "Nomor WA tidak valid (contoh: 081234567890)");

export const academicYearSchema = z
  .object({
    name: z.string().trim().regex(/^\d{4}\/\d{4}$/, "Format: 2026/2027"),
    semester: z.enum(["GANJIL", "GENAP"]),
    startDate: dateStr,
    endDate: dateStr,
    isActive: z.boolean(),
  })
  .refine(
    (d) => {
      const [a, b] = d.name.split("/").map(Number);
      return b === a! + 1;
    },
    { message: "Tahun kedua harus tahun pertama + 1", path: ["name"] },
  );

export const classSchema = z.object({
  name: req("Nama kelas", 50),
  major: req("Jurusan", 50),
  grade: z.number({ invalid_type_error: "Pilih tingkat" }).int().min(10).max(13),
  waliKelasId: opt(),
  academicYearId: req("Tahun ajaran"),
});

export const teacherSchema = z.object({
  nip: z
    .string()
    .trim()
    .regex(/^\d{8,20}$/, "NIP berupa 8–20 digit angka")
    .optional()
    .or(z.literal("")),
  name: req("Nama"),
  phone: waStr,
  isActive: z.boolean(),
});

export const studentSchema = z.object({
  nisn: z.string().trim().regex(/^\d{10}$/, "NISN harus 10 digit angka"),
  nis: opt(30),
  name: req("Nama"),
  gender: z.enum(["L", "P"], { errorMap: () => ({ message: "Pilih jenis kelamin" }) }),
  birthDate: dateStr,
  classId: opt(),
  address: opt(500),
  isActive: z.boolean(),
});

export const parentSchema = z.object({
  name: req("Nama"),
  relation: z.enum(["AYAH", "IBU", "WALI"]),
  waNumber: waStr,
  occupation: opt(100),
  address: opt(500),
  studentIds: z.array(z.string()).min(1, "Pilih minimal satu siswa"),
});

export const violationTypeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode wajib diisi")
    .max(20)
    .regex(/^[A-Za-z0-9._-]+$/, "Kode hanya huruf, angka, titik, strip"),
  name: req("Nama pelanggaran"),
  categoryId: req("Kategori"),
  points: z.number({ invalid_type_error: "Poin wajib angka" }).int().min(0).max(1000),
  description: opt(1000),
  isActive: z.boolean(),
});

export const ROLE_VALUES = ["ADMIN", "PKS", "GURU", "WALI_KELAS", "BK", "KEPSEK", "ORANG_TUA"] as const;

export const thresholdSchema = z.object({
  minPoints: z.number({ invalid_type_error: "Poin wajib angka" }).int().min(1).max(10000),
  action: req("Tindakan", 1000),
  templateId: opt(),
  autoCreateCase: z.boolean(),
  requiresApproval: z.boolean(),
  notifyRoles: z.array(z.enum(ROLE_VALUES)),
  color: z.enum(["green", "amber", "red"]),
  isActive: z.boolean(),
});

export const letterTemplateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode wajib diisi")
    .max(30)
    .regex(/^[A-Za-z0-9._-]+$/, "Kode hanya huruf, angka, titik, strip"),
  name: req("Nama template"),
  type: z.enum(["PANGGILAN_1", "PANGGILAN_2", "PANGGILAN_3", "PERJANJIAN", "PERNYATAAN"]),
  body: z.string().trim().min(20, "Isi surat terlalu pendek").max(60000),
  isActive: z.boolean(),
});

export const STAFF_ROLE_VALUES = ["ADMIN", "PKS", "GURU", "WALI_KELAS", "BK", "KEPSEK"] as const;

export const userSchema = z.object({
  name: req("Nama"),
  username: z
    .string()
    .trim()
    .min(3, "Minimal 3 karakter")
    .max(50)
    .regex(/^[A-Za-z0-9._-]+$/, "Hanya huruf, angka, titik, garis bawah, strip"),
  role: z.enum(STAFF_ROLE_VALUES),
  phone: waStr,
  teacherId: opt(),
  password: z.string().max(100).optional().or(z.literal("")),
  isActive: z.boolean(),
});

export const settingsSchema = z.object({
  schoolName: req("Nama sekolah"),
  npsn: opt(20),
  governmentLine1: opt(),
  governmentLine2: opt(),
  address: req("Alamat", 500),
  phone: opt(50),
  email: z.string().trim().email("Email tidak valid").optional().or(z.literal("")),
  website: opt(),
  principalName: opt(),
  principalNip: opt(30),
  letterNumberFormat: z
    .string()
    .trim()
    .min(5)
    .max(191)
    .refine((v) => v.includes("{urut}"), "Format wajib memuat {urut}"),
  waViolationTemplate: z.string().trim().min(10).max(2000),
  waEnabled: z.boolean(),
  achievementReducesPoints: z.boolean(),
  kepsekCanReadCounseling: z.boolean(),
  parentOtpEnabled: z.boolean(),
});

/** Ubah "" menjadi null untuk kolom opsional. */
export function nn<T extends string | undefined | null>(v: T): string | null {
  return v ? v : null;
}
