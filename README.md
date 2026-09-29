# Sistem Informasi Kesiswaan — SMK Negeri 1 Banjar

Aplikasi web untuk mendigitalkan alur kedisiplinan siswa: pencatatan pelanggaran & prestasi,
notifikasi wali kelas & orang tua (in-app + WhatsApp), surat panggilan orang tua, dan pendampingan BK.
Dirancang untuk HP (mobile-first) dan dapat dijalankan di hosting **cPanel (Node.js App / Passenger)**.

**Stack:** Next.js 15 (App Router) · TypeScript · Prisma 6 + MySQL · Auth.js v5 (Credentials, JWT) ·
Tailwind CSS v4 + komponen gaya shadcn/ui · Zod · React Hook Form · Recharts · ExcelJS · @react-pdf/renderer.

| Tahap | Cakupan | Status |
|---|---|---|
| 1 | Setup, skema database, login & hak akses, tampilan, master data, import Excel | ✅ |
| 2 | Pencatatan kejadian, verifikasi, sistem poin & ambang, profil siswa | ✅ |
| 3 | Notifikasi in-app, WhatsApp gateway + antrean, portal orang tua | ✅ |
| 4 | Modul BK: kasus, surat panggilan PDF + nomor otomatis + QR, pendampingan, kalender | ✅ |
| 5 | Dashboard per role, laporan + export Excel/PDF, audit log, panduan deploy | ✅ |

---

## 1. Fitur

**Kejadian & poin**
- Catat kejadian:
  - bisa untuk banyak siswa sekaligus;
  - jenis pelanggaran dipilih dari master, dan poin terisi otomatis;
  - maksimal 3 foto dari kamera HP (dikompres di browser).
- **Status kejadian:**
  - Laporan dari guru, wali kelas, atau BK berstatus *Menunggu verifikasi*.
  - Kejadian yang dicatat PKS/Admin langsung *Terverifikasi*.
  - PKS memverifikasi atau menolak (dengan alasan) di antrean verifikasi.
- **Poin dan riwayat:**
  - Poin disimpan sebagai snapshot di setiap kejadian, sehingga perubahan master tidak mengubah riwayat.
  - Akumulasi dihitung per tahun ajaran.
  - Soft delete kejadian (wajib beralasan) langsung mengurangi poin.
- **Ambang sanksi** (bisa diatur Admin):
  - Setiap ambang hanya terpicu sekali per tahun ajaran.
  - Ambang tertentu otomatis membuat **kasus BK**.
  - Pelanggaran kategori **Berat** langsung membuat kasus BK.
- **Prestasi** dicatat terpisah. Poinnya hanya mengurangi poin pelanggaran bila kebijakan diaktifkan.
- **Profil siswa 360°:**
  - total poin berwarna (hijau/kuning/merah), progres ke ambang, dan grafik poin per bulan;
  - data orang tua, riwayat kejadian, prestasi, kasus BK & surat, serta catatan tindak lanjut.

**Notifikasi & orang tua**
- **Lonceng notifikasi in-app**, dengan jumlah yang belum dibaca dan tombol tandai dibaca.
- **WhatsApp lewat antrean:**
  - Menyimpan data tidak menunggu pengiriman; cron memproses antrean bertahap.
  - Pesan yang gagal dicoba ulang (1/5/15/60 menit), lalu ditandai gagal.
  - Admin bisa melihat log, mengirim ulang, dan mencoba tes kirim.
- **Kejadian terverifikasi** memicu pesan WA ke semua orang tua (templatenya bisa diedit di Pengaturan), dan ke wali kelas beserta tautannya.
- **Portal orang tua:**
  - Login memakai NISN anak + PIN, atau **kode OTP via WA** (opsional).
  - Menampilkan poin, pelanggaran terverifikasi (tanpa kronologi), prestasi, status pendampingan, dan surat yang perlu konfirmasi.
- **PIN portal** bisa dikirim langsung ke WA orang tua.

**Modul BK**
- **Kasus BK:**
  - tampilan kanban/tabel;
  - timeline: kejadian → surat → tanggapan orang tua → kehadiran → sesi → penutupan;
  - kasus bisa ditutup (wajib ringkasan evaluasi) atau dirujuk ke pihak luar.
- **Surat panggilan:**
  - dibuat dari template dengan placeholder;
  - **nomor otomatis** yang dijamin tidak kembar walau dibuat bersamaan;
  - **PDF berkop** dengan tanda tangan BK & Kepala Sekolah dan **QR verifikasi**.
- **Persetujuan Kepala Sekolah** wajib untuk Surat Panggilan III dan Surat Perjanjian sebelum dikirim, serta untuk kasus di ambang 150.
- **Kirim & konfirmasi:**
  - Tautan surat dikirim via WA.
  - Orang tua menekan **Konfirmasi Hadir** atau **Minta Jadwal Ulang** (dengan alasan).
  - Ada pengingat otomatis H-1.
  - BK mencatat hadir/tidak hadir; bila tidak hadir, sistem menyarankan surat tingkat berikutnya.
- **Sesi pendampingan:**
  - konseling individu/kelompok, home visit, mediasi, konferensi kasus;
  - **catatan bersifat rahasia**: hanya Guru BK (dan Kepala Sekolah bila diizinkan) yang dapat membaca isi dan lampirannya.
- **Kalender BK:** tampilan bulan dan minggu.

**Dashboard, laporan, audit**
- Dashboard berbeda per role:
  - **PKS/Admin:** tren, 10 poin tertinggi, per jenis/kelas/jurusan.
  - **Wali kelas:** siswa kelasnya berwarna sesuai ambang.
  - **BK:** kasus per status, jadwal hari ini, surat yang belum dikonfirmasi.
  - **Kepala Sekolah:** ringkasan, kasus prioritas tinggi, dan daftar yang menunggu persetujuan.
  - **Guru:** laporan miliknya.
- **Laporan** per periode, kelas, jurusan, dan tingkat, dengan **export Excel** (5 sheet) dan **PDF**.
- **Audit log:** siapa, kapan, dari IP mana, dan data sebelum/sesudah. Mencakup kejadian, verifikasi, surat, kasus, login, dan export.

## 2. Hak akses

| Role | Akses utama |
|---|---|
| ADMIN | Master data, pengguna, pengaturan, log WA, audit; melihat semua data **kecuali isi catatan konseling** |
| PKS | Catat & verifikasi kejadian, rekap seluruh sekolah, eskalasi ke BK, laporan |
| GURU | Melaporkan kejadian; melihat laporannya sendiri |
| WALI_KELAS | Siswa & kejadian di kelasnya, catatan tindak lanjut, rekap kelas |
| BK | Kasus, surat panggilan, sesi pendampingan (termasuk catatan rahasia), kalender |
| KEPSEK | Dashboard & laporan (baca), persetujuan surat/kasus, audit; membaca catatan konseling bila diizinkan |
| ORANG_TUA | Portal anaknya sendiri, konfirmasi kehadiran |

Hak akses diperiksa di **dua lapis**:
1. `middleware.ts` per route.
2. Setiap server action & route handler (`requireRole`, `studentScope`, `incidentScope`).

Status akun (nonaktif, wajib ganti password) dicek dari database pada setiap halaman.

## 3. Akun demo (hanya untuk `npm run db:seed` di komputer lokal)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Kesiswaan#2026` |
| Kesiswaan (PKS) | `pks` | `Kesiswaan#2026` |
| Guru | `guru` | `Kesiswaan#2026` |
| Wali Kelas (XI TKJ 1) | `walikelas` | `Kesiswaan#2026` |
| Guru BK | `bk` | `Kesiswaan#2026` |
| Kepala Sekolah | `kepsek` | `Kesiswaan#2026` |
| Orang Tua | tab **Orang Tua** → NISN `0081234514` | PIN `123456` |

Akun staf wajib mengganti password saat login pertama. **Jangan jalankan seed demo di server produksi**; gunakan
seed produksi di bagian 6.

## 4. Mencoba di komputer sendiri (Windows + Laragon)

1. Pasang [Laragon](https://laragon.org/download/) (sudah berisi MySQL) dan [Node.js 20 LTS](https://nodejs.org/),
   lalu di Laragon klik **Start All**.
2. Unduh kode (GitHub → **Code → Download ZIP**, lalu ekstrak) atau jalankan `git clone`.
3. Laragon → **Database** → buat database `kesiswaan`.
4. Salin `.env.example` menjadi `.env`, lalu ubah dua baris ini:
   - `DATABASE_URL="mysql://root:@localhost:3306/kesiswaan"`
   - `NEXTAUTH_SECRET` diisi teks acak panjang.
5. Di Terminal Laragon, dari folder proyek:
   ```bash
   npm install
   npx prisma migrate deploy
   npm run db:seed        # data demo
   npm run dev            # buka http://localhost:3000
   ```
6. Untuk mencoba dari HP di Wi-Fi yang sama, buka `http://<IP-komputer>:3000`.

## 5. Konfigurasi (`.env` / Environment variables)

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✅ | `mysql://USER:PASSWORD@localhost:3306/NAMA_DB`. Karakter khusus di password harus di-*URL-encode* (`@` → `%40`, `#` → `%23`) |
| `NEXTAUTH_SECRET` | ✅ | String acak ≥ 32 karakter (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | ✅ | URL publik aplikasi, mis. `https://kesiswaan.smkn1banjar.sch.id` |
| `AUTH_TRUST_HOST` | ✅ | `true` (aplikasi berada di belakang proxy Passenger) |
| `APP_URL` | – | URL untuk tautan di WA & QR surat (default = `NEXTAUTH_URL`) |
| `APP_TIMEZONE` | – | `Asia/Makassar` (WITA) |
| `UPLOAD_DIR` | ✅ produksi | Folder unggahan **di luar** `public_html`, mis. `/home/akun/kesiswaan-uploads` |
| `CRON_SECRET` | ✅ | Token acak ≥ 16 karakter untuk endpoint `/api/cron/*` |
| `WA_GATEWAY_DRIVER` | – | `fonnte`, `wablas`, atau `generic` (default) |
| `WA_GATEWAY_URL` | – | Endpoint kirim pesan gateway |
| `WA_GATEWAY_TOKEN` | – | Token/API key gateway |

**WhatsApp gateway.** Pilih driver sesuai layanan yang dipakai sekolah:

| Driver | Contoh URL | Format request |
|---|---|---|
| `fonnte` | `https://api.fonnte.com/send` | form `target`, `message`; header `Authorization: <token>` |
| `wablas` | `https://<server>.wablas.com/api/send-message` | JSON `{phone, message}`; header `Authorization: <token>` |
| `generic` | gateway lain / buatan sendiri | JSON `{to, message}`; header `Authorization: Bearer <token>` |

Setelah diisi:
1. Aktifkan **Pengaturan → Notifikasi WhatsApp**.
2. Buka **Log WhatsApp → Tes kirim** untuk memastikan gateway berfungsi.
3. Bila login OTP untuk orang tua diinginkan, aktifkan juga di Pengaturan.

## 6. Deploy ke cPanel (Node.js App / Passenger)

### 6.1 Build di komputer
Gunakan Node 20, di sistem operasi apa pun:
```bash
npm ci
npm run build
```
Hasilnya ada di folder **`.next/standalone/`** dan sudah siap diunggah:
- `server.js` beserta `node_modules` minimal;
- `.next/static` dan `public/`;
- `prisma/` (skema + migrasi);
- `scripts/seed.cjs` (seed produksi);
- engine Prisma untuk Debian dan RHEL/CloudLinux.

File `.env` **tidak** ikut disertakan.

Kompres **isi** folder tersebut (bukan foldernya), mis. menjadi `kesiswaan.zip`.

### 6.2 Database
1. cPanel → **MySQL® Databases**: buat database (mis. `akun_kesiswaan`) dan user, lalu *Add User To Database* dengan **ALL PRIVILEGES**.
2. Catat nilai `DATABASE_URL`: `mysql://akun_user:PASSWORD@localhost:3306/akun_kesiswaan`.

### 6.3 Aplikasi Node.js
1. cPanel → **Setup Node.js App → Create Application**:
   - Node.js version: **20.x** (minimal 18.18)
   - Application mode: **Production**
   - Application root: `kesiswaan` (folder di home, **bukan** di dalam `public_html`)
   - Application URL: domain/subdomain, mis. `kesiswaan.smkn1banjar.sch.id`
   - Application startup file: **`server.js`**
2. Tambahkan semua **Environment variables** dari tabel di bagian 5, lalu klik **Save**.
3. **File Manager**:
   - unggah `kesiswaan.zip` ke `~/kesiswaan`, lalu **Extract**;
   - buat folder unggahan sesuai `UPLOAD_DIR` (mis. `~/kesiswaan-uploads`).

### 6.4 Migrasi database & data awal
**Dengan Terminal/SSH** (cara yang dianjurkan). Salin perintah *"Enter to the virtual environment"* dari halaman Node.js App, lalu:
```bash
source /home/AKUN/nodevenv/kesiswaan/20/bin/activate && cd ~/kesiswaan
npx prisma@6 migrate deploy --schema prisma/schema.prisma
node scripts/seed.cjs --produksi
```
Perintah terakhir membuat master data dan **satu akun `admin` dengan password acak**. Password ini ditampilkan sekali, jadi catat saat itu juga. Master data yang dibuat:
- tahun ajaran;
- kategori & jenis pelanggaran;
- ambang sanksi default;
- template surat Panggilan I/II/III, Perjanjian, dan Pernyataan.

Perintah ini aman dijalankan ulang.

**Tanpa SSH:**
1. Buka **phpMyAdmin**, lalu impor setiap file `prisma/migrations/*/migration.sql` **berurutan** sesuai nama foldernya.
2. Jalankan seed dari komputer lokal. Caranya: aktifkan **Remote MySQL** (tambahkan IP Anda), set `DATABASE_URL` lokal ke database hosting, lalu jalankan `node .next/standalone/scripts/seed.cjs --produksi`.

Setelah itu klik **Restart** di halaman Node.js App, buka URL aplikasi, dan login sebagai `admin`.

### 6.5 Cron Job (antrean WA & pengingat H-1)
Buka cPanel → **Cron Jobs** (ganti domain dan token sesuai `CRON_SECRET`):

| Jadwal | Perintah |
|---|---|
| Tiap 2 menit (`*/2 * * * *`) | `curl -fsS "https://kesiswaan.smkn1banjar.sch.id/api/cron/wa-queue?token=CRON_SECRET" > /dev/null 2>&1` |
| Tiap jam (`5 * * * *`) | `curl -fsS "https://kesiswaan.smkn1banjar.sch.id/api/cron/reminders?token=CRON_SECRET" > /dev/null 2>&1` |

Kedua endpoint aman dipanggil berulang: pesan diklaim satu per satu, dan pengingat ditandai setelah dikirim. Jadi tidak ada pengiriman ganda.

### 6.6 Checklist setelah deploy
1. Login `admin`, lalu ganti password.
2. **Pengaturan:**
   - isi identitas sekolah, logo (PNG/JPG), serta nama & NIP Kepala Sekolah;
   - atur format nomor surat.
3. **Master Data:**
   - tahun ajaran aktif;
   - guru;
   - kelas + wali kelas;
   - **Import Excel** siswa & orang tua.
4. **Pengguna:**
   - buat akun PKS, guru, wali kelas, BK, dan Kepsek;
   - **tautkan ke data guru**. Wajib untuk wali kelas, agar kelasnya terdeteksi.
5. **Orang Tua:** buat atau kirim PIN portal via WA.
6. WA: atur env gateway, aktifkan di Pengaturan, **Tes kirim**, lalu cek bahwa cron berjalan di Log WhatsApp.
7. Uji coba alur: catat kejadian → verifikasi → buat surat → buka PDF, lalu pindai QR-nya.

### 6.7 Update versi baru
1. Build ulang di komputer lokal.
2. Unggah dan timpa isi `~/kesiswaan`. Folder `UPLOAD_DIR` berada di luar folder aplikasi, jadi aman.
3. Jalankan `npx prisma@6 migrate deploy --schema prisma/schema.prisma`.
4. Klik **Restart**.

### 6.8 Backup
- Database: cPanel → **Backup** atau phpMyAdmin → Export (jadwalkan rutin).
- File unggahan: folder `UPLOAD_DIR` (foto bukti, logo, lampiran konseling).

### 6.9 Kendala umum
| Gejala | Penyebab / solusi |
|---|---|
| *"Can't reach database server"* | `DATABASE_URL` salah, atau password berisi karakter khusus yang belum di-URL-encode |
| *"Query engine library … not found"* | Pastikan build memakai versi terbaru (`npm run build`), yang sudah menyertakan engine RHEL/CloudLinux |
| Login berputar kembali ke halaman login | `NEXTAUTH_URL` harus sama persis dengan URL yang dibuka (https); `AUTH_TRUST_HOST=true` |
| Tautan di WA/QR mengarah ke `localhost` | Isi `APP_URL` / `NEXTAUTH_URL` dengan domain publik |
| WA tidak terkirim | Cek **Log WhatsApp**: pengiriman aktif? tes kirim berhasil? cron berjalan? |
| Foto/logo tidak muncul setelah update | `UPLOAD_DIR` harus berupa path absolut di luar folder aplikasi |
| Aplikasi tidak mau start | Lihat log di halaman Node.js App; bila perlu, tambahkan env `HOSTNAME=0.0.0.0` |

## 7. Keamanan & privasi data anak
- Password/PIN di-hash dengan bcrypt.
- **Rate limit login** disimpan di database: 5 gagal per akun, 30 per IP, lalu terkunci 15 menit. Batas serupa berlaku untuk permintaan OTP.
- Validasi Zod di server; server action memakai proteksi CSRF bawaan Next.js.
- **Unggahan:**
  - hanya gambar, dicek dari isi file (magic bytes), dengan batas ukuran;
  - disimpan di luar `public`, dan disajikan lewat `/api/files/*` dengan pemeriksaan hak akses;
  - lampiran konseling hanya dapat dibuka BK (dan Kepsek bila diizinkan).
- **Nomor WA orang tua** disamarkan untuk semua role selain admin.
- **Portal orang tua** tidak menampilkan kronologi, karena bisa memuat nama siswa lain.
- **Halaman publik:**
  - `/verifikasi` hanya menampilkan data minimal (inisial siswa);
  - `/konfirmasi` memakai token acak terpisah dari token QR.
- **Audit log** mencatat perubahan penting. Isi catatan konseling tidak ikut dicatat.
- **Soft delete beralasan** untuk kejadian, prestasi, dan surat. Nomor surat yang dibatalkan tidak dipakai ulang.

## 8. Struktur folder
```
app/
  (auth)/login            login staf & orang tua (PIN / OTP)
  (public)/               /konfirmasi/[token] & /verifikasi/[token] (tanpa login)
  (app)/                  area setelah login
    kejadian/*            daftar, catat, detail, verifikasi
    siswa/*  kelas/*      profil 360° & rekap kelas
    bk/*                  kasus, surat, kalender
    laporan  audit        laporan & audit log
    ortu/*                portal orang tua
    master/*  pengaturan  master data, import, pengguna, pengaturan, log WA
  api/                    auth, file, cron, PDF surat, export laporan
components/               UI (components/ui = primitif gaya shadcn), grafik, dashboard
lib/                      auth/RBAC, points, letter-number, wa/, pdf/, report, validator Zod
server/actions/           server action (requireRole + Zod + audit)
prisma/                   schema.prisma, migrasi, seed.ts
scripts/postbuild.mjs     menyiapkan folder standalone untuk cPanel
```

## 9. Pengembangan
| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run typecheck` / `npm run lint` | TypeScript & ESLint |
| `npm test` | Unit test Vitest (poin & ambang, nomor surat, template, WA adapter, tanggal WITA, aturan akses). Uji nomor surat konkuren berjalan bila `DATABASE_URL` tersedia |
| `npm run build` | Build produksi + folder deploy |
| `npx prisma migrate dev` | Membuat migrasi baru |
