import { z } from "zod";

export const MAX_PHOTOS = 3;
export const MAX_STUDENTS_PER_INCIDENT = 40;

export const incidentSchema = z.object({
  studentIds: z
    .array(z.string().min(1))
    .min(1, "Pilih minimal satu siswa")
    .max(MAX_STUDENTS_PER_INCIDENT, `Maksimal ${MAX_STUDENTS_PER_INCIDENT} siswa per kejadian`),
  violationTypeId: z.string().min(1, "Pilih jenis pelanggaran"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Jam wajib diisi"),
  location: z.string().trim().min(2, "Lokasi wajib diisi").max(191),
  chronology: z.string().trim().min(10, "Kronologi minimal 10 karakter").max(5000),
  initialAction: z.string().trim().max(2000).optional().or(z.literal("")),
  reporterName: z.string().trim().max(191).optional().or(z.literal("")),
  witnesses: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type IncidentInput = z.infer<typeof incidentSchema>;

export const reasonSchema = z.string().trim().min(3, "Alasan minimal 3 karakter").max(1000);

export const achievementSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi"),
  title: z.string().trim().min(3, "Nama prestasi wajib diisi").max(191),
  level: z.enum(["SEKOLAH", "KECAMATAN", "KABUPATEN", "PROVINSI", "NASIONAL", "INTERNASIONAL"]),
  points: z.number({ invalid_type_error: "Poin wajib angka" }).int().min(0).max(1000),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type AchievementInput = z.infer<typeof achievementSchema>;

export const ACHIEVEMENT_LEVEL_LABEL = {
  SEKOLAH: "Sekolah",
  KECAMATAN: "Kecamatan",
  KABUPATEN: "Kabupaten",
  PROVINSI: "Provinsi",
  NASIONAL: "Nasional",
  INTERNASIONAL: "Internasional",
} as const;
