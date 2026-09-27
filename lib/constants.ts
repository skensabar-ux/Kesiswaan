export const DEFAULT_WA_VIOLATION_TEMPLATE = `Yth. Bapak/Ibu {nama_ortu},
Kami informasikan ananda {nama_siswa} ({kelas}) pada {tanggal} tercatat:
{jenis_pelanggaran} ({poin} poin).
Total poin saat ini: {total_poin}.
Info lebih lanjut hubungi Wali Kelas {nama_walas}.
— Kesiswaan SMK Negeri 1 Banjar`;

export const LETTER_PLACEHOLDERS = [
  "{nomor_surat}",
  "{nama_ortu}",
  "{nama_siswa}",
  "{kelas}",
  "{hari_tanggal}",
  "{jam}",
  "{tempat}",
  "{perihal}",
  "{nama_bk}",
  "{nama_kepsek}",
  "{nip_kepsek}",
] as const;

export const WA_PLACEHOLDERS = [
  "{nama_ortu}",
  "{nama_siswa}",
  "{kelas}",
  "{tanggal}",
  "{jenis_pelanggaran}",
  "{poin}",
  "{total_poin}",
  "{nama_walas}",
] as const;

export const LETTER_TYPE_LABEL = {
  PANGGILAN_1: "Surat Panggilan I",
  PANGGILAN_2: "Surat Panggilan II",
  PANGGILAN_3: "Surat Panggilan III",
  PERJANJIAN: "Surat Perjanjian",
  PERNYATAAN: "Surat Pernyataan",
} as const;

export const LEVEL_LABEL = { RINGAN: "Ringan", SEDANG: "Sedang", BERAT: "Berat" } as const;
export const GENDER_LABEL = { L: "Laki-laki", P: "Perempuan" } as const;
export const RELATION_LABEL = { AYAH: "Ayah", IBU: "Ibu", WALI: "Wali" } as const;
export const SEMESTER_LABEL = { GANJIL: "Ganjil", GENAP: "Genap" } as const;

export const THRESHOLD_COLORS = { green: "Hijau", amber: "Kuning", red: "Merah" } as const;
