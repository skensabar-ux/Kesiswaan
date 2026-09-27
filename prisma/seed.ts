import { PrismaClient, type Gender, type LetterType, type Role, type ViolationLevel } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_WA_VIOLATION_TEMPLATE } from "../lib/constants";

const prisma = new PrismaClient();

export const DEFAULT_PASSWORD = "Kesiswaan#2026";
export const DEFAULT_PARENT_PIN = "123456";

const wita = (d: string) => new Date(`${d}T00:00:00+08:00`);

// ───────────── Template surat ─────────────
const LETTER_OPENING = `Kepada Yth.
Bapak/Ibu {nama_ortu}
Orang Tua/Wali dari {nama_siswa} (Kelas {kelas})
di Tempat

Dengan hormat,`;

const LETTER_SCHEDULE = `hari/tanggal : {hari_tanggal}
pukul        : {jam} WITA
tempat       : {tempat}
perihal      : {perihal}`;

const TEMPLATES: { code: string; name: string; type: LetterType; body: string }[] = [
  {
    code: "SP1",
    name: "Surat Panggilan I",
    type: "PANGGILAN_1",
    body: `${LETTER_OPENING}

Sehubungan dengan pembinaan kedisiplinan peserta didik, kami mengharapkan kehadiran Bapak/Ibu di sekolah pada:

${LETTER_SCHEDULE}

Kehadiran Bapak/Ibu sangat kami harapkan guna membicarakan perkembangan ananda bersama Guru Bimbingan dan Konseling. Mohon konfirmasi kehadiran melalui tautan yang dikirimkan via WhatsApp.

Demikian surat panggilan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.`,
  },
  {
    code: "SP2",
    name: "Surat Panggilan II",
    type: "PANGGILAN_2",
    body: `${LETTER_OPENING}

Menindaklanjuti Surat Panggilan I dan memperhatikan catatan kedisiplinan ananda yang masih memerlukan pembinaan, dengan ini kami kembali mengundang Bapak/Ibu untuk hadir pada:

${LETTER_SCHEDULE}

Mengingat pentingnya pertemuan ini, kami sangat mengharapkan Bapak/Ibu dapat hadir tepat waktu. Apabila berhalangan, mohon mengajukan jadwal ulang melalui tautan konfirmasi.

Demikian surat panggilan ini kami sampaikan. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih.`,
  },
  {
    code: "SP3",
    name: "Surat Panggilan III",
    type: "PANGGILAN_3",
    body: `${LETTER_OPENING}

Memperhatikan akumulasi poin pelanggaran ananda yang telah mencapai batas pembinaan tingkat lanjut, dengan ini kami memanggil Bapak/Ibu untuk hadir pada:

${LETTER_SCHEDULE}

Dalam pertemuan ini akan dilakukan penandatanganan surat perjanjian antara peserta didik, orang tua/wali, dan pihak sekolah. Kehadiran Bapak/Ibu bersifat WAJIB.

Demikian surat panggilan ini kami sampaikan. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih.`,
  },
  {
    code: "SPJ",
    name: "Surat Perjanjian",
    type: "PERJANJIAN",
    body: `Yang bertanda tangan di bawah ini:

Nama Peserta Didik : {nama_siswa}
Kelas              : {kelas}
Nama Orang Tua/Wali: {nama_ortu}

Dengan ini menyatakan berjanji dengan sungguh-sungguh bahwa peserta didik tersebut:
1. Tidak akan mengulangi pelanggaran tata tertib sekolah dalam bentuk apa pun;
2. Bersedia mengikuti pembinaan dan pendampingan dari Guru Bimbingan dan Konseling;
3. Bersedia menerima sanksi sesuai tata tertib sekolah, termasuk dikembalikan kepada orang tua/wali, apabila melanggar perjanjian ini.

Orang tua/wali bersedia mendukung dan mengawasi pelaksanaan perjanjian ini.

Perihal: {perihal}

Demikian surat perjanjian ini dibuat dengan penuh kesadaran dan tanpa paksaan dari pihak mana pun.`,
  },
  {
    code: "SPN",
    name: "Surat Pernyataan",
    type: "PERNYATAAN",
    body: `Yang bertanda tangan di bawah ini:

Nama Peserta Didik : {nama_siswa}
Kelas              : {kelas}

Dengan ini menyatakan bahwa saya mengakui telah melakukan pelanggaran tata tertib sekolah terkait {perihal}, dan berjanji tidak akan mengulanginya lagi.

Pernyataan ini saya buat dengan sebenar-benarnya, diketahui oleh orang tua/wali ({nama_ortu}).`,
  },
];

// ───────────── Jenis pelanggaran ─────────────
const VIOLATIONS: { code: string; name: string; level: ViolationLevel; points: number }[] = [
  { code: "R01", name: "Terlambat masuk sekolah", level: "RINGAN", points: 5 },
  { code: "R02", name: "Atribut seragam tidak lengkap", level: "RINGAN", points: 5 },
  { code: "R03", name: "Tidak masuk tanpa keterangan (alpa)", level: "RINGAN", points: 10 },
  { code: "R04", name: "Membawa/menggunakan HP saat dilarang", level: "RINGAN", points: 10 },
  { code: "S01", name: "Membolos saat jam pelajaran", level: "SEDANG", points: 15 },
  { code: "S02", name: "Merokok di lingkungan sekolah", level: "SEDANG", points: 25 },
  { code: "B01", name: "Berkelahi", level: "BERAT", points: 50 },
  { code: "B02", name: "Perundungan/bullying", level: "BERAT", points: 50 },
  { code: "B03", name: "Membawa senjata tajam", level: "BERAT", points: 75 },
  { code: "B04", name: "Terlibat narkoba", level: "BERAT", points: 100 },
];

// ───────────── Ambang sanksi ─────────────
const THRESHOLDS: {
  minPoints: number;
  action: string;
  templateCode?: string;
  autoCreateCase: boolean;
  requiresApproval: boolean;
  notifyRoles: Role[];
  color: string;
}[] = [
  { minPoints: 25, action: "Pembinaan oleh wali kelas", autoCreateCase: false, requiresApproval: false, notifyRoles: ["WALI_KELAS"], color: "amber" },
  { minPoints: 50, action: "Surat Panggilan I + pendampingan BK", templateCode: "SP1", autoCreateCase: true, requiresApproval: false, notifyRoles: ["WALI_KELAS", "BK"], color: "amber" },
  { minPoints: 75, action: "Surat Panggilan II", templateCode: "SP2", autoCreateCase: true, requiresApproval: false, notifyRoles: ["WALI_KELAS", "BK", "PKS"], color: "red" },
  { minPoints: 100, action: "Surat Panggilan III + surat perjanjian", templateCode: "SP3", autoCreateCase: true, requiresApproval: false, notifyRoles: ["WALI_KELAS", "BK", "PKS", "KEPSEK"], color: "red" },
  { minPoints: 150, action: "Rekomendasi dikembalikan ke orang tua", autoCreateCase: true, requiresApproval: true, notifyRoles: ["WALI_KELAS", "BK", "PKS", "KEPSEK"], color: "red" },
];

// ───────────── Data dummy ─────────────
const MALE_FIRST = ["I Putu", "I Made", "I Kadek", "I Komang", "I Nyoman", "I Ketut", "I Gede", "I Wayan"];
const FEMALE_FIRST = ["Ni Putu", "Ni Made", "Ni Kadek", "Ni Komang", "Ni Nyoman", "Ni Ketut", "Ni Luh", "Ni Wayan"];
const LAST = [
  "Arya Wibawa", "Adi Saputra", "Dharma Putra", "Eka Pratama", "Surya Negara", "Yoga Pramana", "Agus Widiantara",
  "Ayu Lestari", "Dewi Anggreni", "Sri Wahyuni", "Candra Dewi", "Mas Sriani", "Budi Artawan", "Rai Suardana",
  "Wira Kusuma",
];
const FATHER = ["I Wayan Sudarma", "I Made Suarta", "I Nyoman Suweca", "I Ketut Merta", "I Gede Suparta", "I Komang Sudira"];
const MOTHER = ["Ni Luh Sukerti", "Ni Made Sariasih", "Ni Nyoman Rusmini", "Ni Ketut Suartini", "Ni Wayan Murni", "Ni Komang Artini"];

const CLASSES = [
  { name: "X TKJ 1", major: "TKJ", grade: 10 },
  { name: "X AKL 1", major: "AKL", grade: 10 },
  { name: "XI TKJ 1", major: "TKJ", grade: 11 },
  { name: "XI TKR 1", major: "TKR", grade: 11 },
  { name: "XII TKJ 1", major: "TKJ", grade: 12 },
];

const STAFF: { username: string; name: string; role: Role; nip?: string; phone?: string }[] = [
  { username: "admin", name: "Administrator Sistem", role: "ADMIN" },
  { username: "pks", name: "I Nyoman Sukadana, S.Pd.", role: "PKS", nip: "197805122005011003", phone: "081200000001" },
  { username: "guru", name: "Ni Made Widiastuti, S.Pd.", role: "GURU", nip: "198503212010012007", phone: "081200000002" },
  { username: "walikelas", name: "I Ketut Suryawan, S.Kom.", role: "WALI_KELAS", nip: "198702102011011004", phone: "081200000003" },
  { username: "bk", name: "Ni Luh Putu Ariani, S.Pd., M.Pd.", role: "BK", nip: "198911082014022002", phone: "081200000004" },
  { username: "kepsek", name: "Drs. I Gede Wirawan, M.Pd.", role: "KEPSEK", nip: "196905151994031008", phone: "081200000005" },
];

async function main() {
  console.log("▶ Seed dimulai…");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const pinHash = await bcrypt.hash(DEFAULT_PARENT_PIN, 10);

  await prisma.schoolSetting.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      waViolationTemplate: DEFAULT_WA_VIOLATION_TEMPLATE,
      principalName: "Drs. I Gede Wirawan, M.Pd.",
      principalNip: "196905151994031008",
      phone: "(0362) 000000",
      email: "smkn1banjar@example.sch.id",
    },
    update: {},
  });

  const year = await prisma.academicYear.upsert({
    where: { name: "2026/2027" },
    create: { name: "2026/2027", semester: "GANJIL", startDate: wita("2026-07-13"), endDate: wita("2027-06-26"), isActive: true },
    update: { isActive: true },
  });
  await prisma.academicYear.updateMany({ where: { NOT: { id: year.id } }, data: { isActive: false } });

  // kategori & jenis pelanggaran
  const cats: Record<ViolationLevel, string> = { RINGAN: "", SEDANG: "", BERAT: "" };
  for (const [i, level] of (["RINGAN", "SEDANG", "BERAT"] as const).entries()) {
    const c = await prisma.violationCategory.upsert({
      where: { level },
      create: { level, name: level[0] + level.slice(1).toLowerCase(), sortOrder: i },
      update: {},
    });
    cats[level] = c.id;
  }
  for (const v of VIOLATIONS) {
    await prisma.violationType.upsert({
      where: { code: v.code },
      create: { code: v.code, name: v.name, points: v.points, categoryId: cats[v.level] },
      update: {},
    });
  }

  // template surat & ambang
  const tplIds: Record<string, string> = {};
  for (const t of TEMPLATES) {
    const row = await prisma.letterTemplate.upsert({ where: { code: t.code }, create: t, update: {} });
    tplIds[t.code] = row.id;
  }
  for (const t of THRESHOLDS) {
    const { templateCode, ...rest } = t;
    await prisma.sanctionThreshold.upsert({
      where: { minPoints: t.minPoints },
      create: { ...rest, templateId: templateCode ? tplIds[templateCode] : null },
      update: {},
    });
  }

  // staf & guru
  const users: Record<string, string> = {};
  const teachers: Record<string, string> = {};
  for (const s of STAFF) {
    const u = await prisma.user.upsert({
      where: { username: s.username },
      create: { username: s.username, name: s.name, role: s.role, passwordHash, phone: s.phone ? "62" + s.phone.slice(1) : null, mustChangePassword: true },
      update: {},
    });
    users[s.username] = u.id;
    if (s.nip) {
      const t = await prisma.teacher.upsert({
        where: { nip: s.nip },
        create: { nip: s.nip, name: s.name, phone: s.phone ? "62" + s.phone.slice(1) : null, userId: u.id },
        update: {},
      });
      teachers[s.username] = t.id;
    }
  }
  const extraTeachers = ["I Wayan Budiarsa, S.T.", "Ni Kadek Sri Utami, S.E.", "I Komang Arta Wijaya, S.Pd."];
  const extraIds: string[] = [];
  for (const [i, name] of extraTeachers.entries()) {
    const nip = `19900101201501100${i + 1}`;
    const t = await prisma.teacher.upsert({ where: { nip }, create: { nip, name }, update: {} });
    extraIds.push(t.id);
  }

  // kelas: XI TKJ 1 diampu akun "walikelas"
  const classIds: string[] = [];
  for (const [i, c] of CLASSES.entries()) {
    const wali = c.name === "XI TKJ 1" ? teachers.walikelas : extraIds[i % extraIds.length];
    const row = await prisma.class.upsert({
      where: { name_academicYearId: { name: c.name, academicYearId: year.id } },
      create: { ...c, academicYearId: year.id, waliKelasId: wali },
      update: {},
    });
    classIds.push(row.id);
  }

  // 30 siswa + ortu
  for (let i = 0; i < 30; i++) {
    const gender: Gender = i % 2 === 0 ? "L" : "P";
    const first = (gender === "L" ? MALE_FIRST : FEMALE_FIRST)[i % 8]!;
    const name = `${first} ${LAST[i % LAST.length]}`;
    const nisn = `00${(81234500 + i * 7).toString().padStart(8, "0")}`;
    const classId = classIds[i % classIds.length]!;
    const student = await prisma.student.upsert({
      where: { nisn },
      create: {
        nisn,
        nis: `2627${String(i + 1).padStart(3, "0")}`,
        name,
        gender,
        birthDate: wita(`${2009 + (i % 3)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`),
        classId,
        address: "Kec. Banjar, Kab. Buleleng, Bali",
      },
      update: {},
      include: { parents: true },
    });
    if (student.parents.length === 0) {
      const father = await prisma.parent.create({
        data: { name: FATHER[i % FATHER.length]!, relation: "AYAH", waNumber: `6281338${String(100000 + i).slice(-6)}`, occupation: "Petani" },
      });
      const mother = await prisma.parent.create({
        data: { name: MOTHER[i % MOTHER.length]!, relation: "IBU", waNumber: `6285737${String(200000 + i).slice(-6)}`, occupation: "Pedagang" },
      });
      await prisma.studentParent.createMany({
        data: [
          { studentId: student.id, parentId: father.id, isPrimary: true },
          { studentId: student.id, parentId: mother.id },
        ],
      });
    }
  }

  // akun portal ortu: ayah dari siswa pertama di kelas XI TKJ 1
  const demoStudent = await prisma.student.findFirstOrThrow({
    where: { classId: classIds[2] },
    orderBy: { nisn: "asc" },
    include: { parents: { include: { parent: true }, where: { parent: { relation: "AYAH" } } } },
  });
  const demoParent = demoStudent.parents[0]!.parent;
  if (!demoParent.userId) {
    const u = await prisma.user.upsert({
      where: { username: "ortu" },
      create: { username: "ortu", name: demoParent.name, role: "ORANG_TUA", passwordHash: pinHash, phone: demoParent.waNumber },
      update: {},
    });
    await prisma.parent.update({ where: { id: demoParent.id }, data: { userId: u.id } });
  }

  console.log("✔ Seed selesai.");
  console.log(`  Password staf (admin, pks, guru, walikelas, bk, kepsek): ${DEFAULT_PASSWORD}`);
  console.log(`  Portal ortu: NISN ${demoStudent.nisn} + PIN ${DEFAULT_PARENT_PIN}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
