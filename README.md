# Sistem Informasi Kesiswaan — SMK Negeri 1 Banjar

Aplikasi web untuk mendigitalkan alur kedisiplinan siswa: pencatatan pelanggaran/prestasi (PKS & guru),
notifikasi wali kelas & orang tua, surat panggilan, dan pendampingan BK.

**Stack:** Next.js 15 (App Router) · TypeScript · Prisma 6 + MySQL · Auth.js v5 (Credentials, JWT) ·
Tailwind CSS v4 + komponen gaya shadcn/ui · Zod · React Hook Form · ExcelJS.

## Status pengerjaan

| Tahap | Cakupan | Status |
|---|---|---|
| 1 | Setup, skema Prisma lengkap, auth & RBAC, layout, master data, import Excel | ✅ selesai |
| 2 | Pencatatan kejadian, verifikasi, sistem poin & ambang, profil siswa | ✅ selesai |
| 3 | Notifikasi in-app + WA gateway + antrean + portal ortu | ✅ selesai |
| 4 | Modul BK: kasus, surat panggilan PDF + QR, pendampingan, kalender | ✅ selesai |
| 5 | Dashboard, laporan & export, audit log, panduan deploy lengkap | ⏳ |

## Fitur Tahap 2 (kejadian & poin)

- **Catat kejadian** (`/kejadian/baru`): pilih satu atau banyak siswa (kejadian kelompok) dan jenis
  pelanggaran (poin terisi otomatis). Isi waktu (WITA), lokasi, kronologi, tindakan awal, pelapor,
  dan saksi. Bisa melampirkan maksimal 3 foto langsung dari kamera HP; foto dikompres di browser.
- **Alur status.** Laporan dari Guru/Wali Kelas/BK berstatus *Menunggu verifikasi*. Kejadian yang
  dicatat PKS/Admin langsung *Terverifikasi*. PKS memverifikasi atau menolak (dengan alasan) di
  `/kejadian/verifikasi`, dan pelapor mendapat notifikasi.
- **Saat terverifikasi:**
  - poin masuk ke akumulasi siswa (per tahun ajaran);
  - wali kelas mendapat notifikasi;
  - ambang sanksi diperiksa. Setiap ambang hanya terpicu **sekali** per tahun ajaran (tabel
    `ThresholdHit`).
- **Kasus BK otomatis.** Kasus dibuat bila ambang bertanda *buat kasus* tercapai, atau bila
  pelanggaran berkategori **Berat**. Bila siswa sudah punya kasus aktif, kejadian ditautkan ke kasus
  itu, dan prioritasnya tidak pernah turun.
- **Poin bukan angka yang disimpan.** Poin dihitung dari snapshot poin kejadian terverifikasi yang
  tidak dihapus, sehingga soft delete kejadian (wajib beralasan) langsung mengurangi poin. Riwayat
  tetap tersimpan.
- **Prestasi.** Dicatat terpisah dan hanya mengurangi poin bila kebijakan diaktifkan di Pengaturan.
- **Profil siswa 360°** (`/siswa/[id]`):
  - total poin berwarna hijau/kuning/merah, progres ke ambang berikutnya, dan grafik poin per bulan;
  - data siswa & orang tua (nomor WA disamarkan untuk selain admin);
  - riwayat kejadian, prestasi, serta kasus BK & surat.
- **Rekap kelas** (`/kelas/[id]`): daftar siswa urut poin tertinggi dan jumlah aman/perlu
  perhatian/kritis. Wali kelas langsung diarahkan ke kelasnya.
- **Hak akses:**
  - Guru hanya melihat laporannya sendiri.
  - Wali kelas melihat laporannya sendiri dan kejadian siswa di kelasnya.
  - PKS, BK, dan Kepsek melihat semua kejadian.
  - Foto bukti hanya bisa dibuka oleh yang berhak melihat kejadiannya.

## Cara mencoba aplikasi di komputer sendiri (Windows)

Cara termudah memakai **Laragon** (sudah berisi MySQL):

1. Pasang [Laragon](https://laragon.org/download/) dan [Node.js 20 LTS](https://nodejs.org/),
   lalu jalankan Laragon dan klik **Start All**.
2. Unduh kode: di GitHub buka repositori ini, pilih branch `claude/new-session-pqrl4c`,
   lalu **Code → Download ZIP** dan ekstrak (atau `git clone`).
3. Buka Laragon → **Database** (HeidiSQL), lalu buat database baru bernama `kesiswaan`.
4. Salin `.env.example` menjadi `.env`, lalu ubah dua baris:
   - `DATABASE_URL="mysql://root:@localhost:3306/kesiswaan"` (user `root` Laragon tanpa password)
   - `NEXTAUTH_SECRET` diisi teks acak panjang (bebas).
5. Buka **Terminal** Laragon di folder proyek, lalu jalankan:
   ```bash
   npm install
   npx prisma migrate deploy
   npm run db:seed
   npm run dev
   ```
6. Buka **http://localhost:3000** di browser. Masuk dengan akun demo di bawah (misalnya `pks`),
   ganti password saat diminta, lalu coba **Catat Kejadian**.

Untuk mencoba dari HP di jaringan Wi-Fi yang sama, buka `http://<IP-komputer>:3000`.

## Akun demo (hasil seed)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Kesiswaan#2026` |
| Kesiswaan (PKS) | `pks` | `Kesiswaan#2026` |
| Guru | `guru` | `Kesiswaan#2026` |
| Wali Kelas (XI TKJ 1) | `walikelas` | `Kesiswaan#2026` |
| Guru BK | `bk` | `Kesiswaan#2026` |
| Kepala Sekolah | `kepsek` | `Kesiswaan#2026` |
| Orang Tua | tab **Orang Tua**: NISN `0081234514` | PIN `123456` |

Akun staf **wajib mengganti password** saat login pertama. Password baru minimal 8 karakter.

## Menjalankan secara lokal

Prasyarat: Node.js 20 LTS (minimal 18.18) dan MySQL 8 / MariaDB 10.6+.

```bash
npm install
cp .env.example .env                  # isi DATABASE_URL, NEXTAUTH_SECRET, dst.
npx prisma migrate dev                # membuat tabel
npm run db:seed                       # data contoh (aman dijalankan ulang)
npm run dev                           # http://localhost:3000
```

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit test (Vitest) |
| `npm run build` | Build produksi `standalone` + melengkapi folder deploy |
| `npm start` | Menjalankan hasil build (`.next/standalone/server.js`) |

## Struktur folder

```
app/
  (auth)/login           halaman login staf & orang tua
  (app)/                 area setelah login (layout sidebar + bottom nav)
    kejadian/*           daftar, catat, detail, antrean verifikasi
    siswa/*              daftar & profil 360° siswa
    kelas/*              rekap kelas
    master/*             CRUD master data (ADMIN) + import Excel
    pengaturan           setting sekolah, kop, nomor surat, WA, kebijakan
    ortu                 portal orang tua
  api/                   route handler (auth, file unggahan, template import)
components/              UI (components/ui = primitif gaya shadcn)
lib/                     auth/RBAC, prisma, tanggal WITA, telepon, audit, upload, validator Zod
server/actions/          server action (semua memanggil requireRole + validasi Zod)
prisma/                  schema.prisma, migrasi, seed.ts
scripts/postbuild.mjs    menyiapkan output standalone untuk cPanel
```

## Keamanan & hak akses

- **Dua lapis RBAC.** `middleware.ts` menolak route sesuai role (`lib/roles.ts`). Setiap server action
  dan route handler juga memanggil `requireRole()`, dan data dibatasi cakupannya (`studentScope()`,
  `incidentScope()`): wali kelas hanya melihat siswa di kelasnya, orang tua hanya anaknya sendiri.
- **Status akun dicek dari database, bukan dari cookie sesi.** Ini mencakup akun nonaktif dan
  kewajiban ganti password, dan dicek di layout. Akun yang dinonaktifkan admin langsung terblokir
  pada klik berikutnya.
- Password dan PIN di-hash dengan bcrypt.
- **Rate limit login** disimpan di database: 5 gagal per akun (atau 30 per IP) dalam 15 menit mengunci
  login selama 15 menit. Disimpan di DB karena Passenger dapat menjalankan beberapa proses.
- Unggahan hanya gambar, divalidasi dari isi file (magic bytes) dan ukurannya. File disimpan di
  `UPLOAD_DIR` (di luar `public`) dan disajikan lewat `/api/files/*` dengan pemeriksaan akses.
- Audit log mencatat create/update/delete master data, login, reset password/PIN, dan import.
- Nomor WA disimpan dalam format `62…`.

## Import siswa & orang tua

Menu **Master Data → Import Excel**:

1. Unduh template.
2. Isi satu baris per siswa (beserta ayah/ibu/wali).
3. Klik **Periksa**. Setiap baris divalidasi, dan kesalahan dilaporkan per baris.
4. Klik **Import**. Hanya baris valid yang disimpan.

Siswa dicocokkan berdasarkan NISN (upsert). Orang tua dicocokkan per hubungan pada siswa yang sama,
jadi import ulang tidak membuat data ganda.

Akun portal orang tua dibuat dari menu **Orang Tua → ikon kunci**. PIN 6 digit ditampilkan sekali.

## Deploy ke cPanel (ringkas)

Panduan lengkap (termasuk Cron Job antrean WA & pengingat H-1) akan dilengkapi di Tahap 5.

1. **Build di komputer lokal** (Node 20, OS apa pun): `npm ci && npm run build`.
   Hasilnya ada di `.next/standalone/` dan sudah berisi `server.js`, `.next/static`, `public/`,
   `prisma/` (migrasi), dan engine Prisma untuk Linux/CloudLinux. File `.env` sengaja **tidak**
   disertakan.
2. **Buat database MySQL** di cPanel (*MySQL Databases*), buat user, lalu beri *ALL PRIVILEGES*.
3. **Setup Node.js App** di cPanel:
   - Node.js version: 20.x
   - Application mode: Production
   - Application root: mis. `kesiswaan`
   - Application URL: domain/subdomain Anda
   - Application startup file: `server.js`
4. Unggah **isi** folder `.next/standalone/` ke *Application root* (zip, upload lewat File Manager,
   lalu extract).
5. Isi **Environment variables** di halaman Node.js App: `DATABASE_URL`, `NEXTAUTH_SECRET`,
   `NEXTAUTH_URL` (URL https aplikasi), `AUTH_TRUST_HOST=true`, `APP_TIMEZONE=Asia/Makassar`,
   `UPLOAD_DIR` (path absolut di luar `public_html`, mis. `/home/akun/kesiswaan-uploads`),
   `CRON_SECRET`, `WA_GATEWAY_URL`, `WA_GATEWAY_TOKEN`.
6. **Migrasi database.** Pilih salah satu:
   - Via Terminal/SSH (setelah *Enter to the virtual environment*):
     `npx prisma@6 migrate deploy --schema prisma/schema.prisma`
   - Tanpa SSH: impor file `prisma/migrations/*/migration.sql` secara berurutan lewat phpMyAdmin.
7. **Seed data awal** (sekali, opsional): jalankan `npm run db:seed` dari mesin lokal yang
   `DATABASE_URL`-nya mengarah ke database hosting (bila *Remote MySQL* diizinkan), atau buat akun
   admin secara manual.
8. Klik **Restart** pada Node.js App.
