// Setup otomatis untuk mencoba aplikasi di komputer sendiri (Windows/Laragon, macOS, Linux).
// Hanya memakai modul bawaan Node, jadi bisa dijalankan sebelum `npm install`.
//   node scripts/setup-lokal.mjs            → siapkan .env, install, migrasi, data demo
//   node scripts/setup-lokal.mjs --jalankan → sekaligus menyalakan aplikasi
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import net from "node:net";

const ok = (m) => console.log(`\x1b[32m✔\x1b[0m ${m}`);
const step = (m) => console.log(`\n\x1b[36m▶ ${m}\x1b[0m`);
const fail = (m) => {
  console.error(`\n\x1b[31m✖ ${m}\x1b[0m\n`);
  process.exit(1);
};
const run = (cmd, args) => spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" }).status === 0;
const LOG = "setup-error.log";

/** Jalankan perintah, tampilkan & simpan keluarannya. Bila gagal, tulis ke setup-error.log + beri petunjuk. */
function runLogged(label, cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32", env: process.env });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  process.stdout.write(out);
  if (r.status === 0) return true;
  appendFileSync(LOG, `\n===== setup v${SETUP_VERSION} · ${new Date().toISOString()} · ${label} · ${cmd} ${args.join(" ")} · Node ${process.version} · ${process.platform}\n${out}\n`);
  // urutan penting: penyebab spesifik dulu, baru yang umum
  const hints = [
    [/EPERM|EBUSY|operation not permitted|resource busy|being used by another process/i, "Ada file yang sedang dikunci Windows (biasanya aplikasi masih menyala atau antivirus). Tutup semua jendela hitam lain (npm run dev / JALANKAN.bat), lalu ulangi. Bila tetap gagal, restart komputer lalu ulangi."],
    [/binaries\.prisma\.sh|ENOTFOUND|ETIMEDOUT|ECONNRESET|getaddrinfo|fetch failed|request to https?:\/\/|certificate|self.signed/i, "Gagal mengunduh komponen Prisma dari internet. Periksa koneksi (coba jaringan lain / hotspot HP), matikan sementara VPN/proxy, lalu ulangi."],
    [/Can't reach database server|P1001|ECONNREFUSED/i, "MySQL mati atau port salah. Nyalakan MySQL di Laragon (Start All), lalu ulangi."],
    [/Access denied|P1000|Authentication failed/i, "User/password MySQL salah. Sesuaikan DATABASE_URL di file .env (mis. mysql://root:PASSWORD@localhost:3306/kesiswaan)."],
    [/Unique constraint|P2002|Duplicate entry/i, "Data demo sudah ada sebagian dari percobaan sebelumnya. Kosongkan database: npx prisma migrate reset --force (otomatis mengisi ulang data demo)."],
    [/Unknown database|P1003/i, "Database belum ada. Jalankan: npx prisma migrate deploy, lalu ulangi."],
    [/did not initialize yet|Cannot find module '\.prisma/i, "Prisma Client belum terbentuk. Jalankan: npx prisma generate, lalu ulangi setup."],
  ].filter(([re]) => re.test(out)).map(([, h]) => h);
  // ringkasan error tepat di atas petunjuk, agar ikut tersalin saat pengguna menyalin bagian bawah layar
  const tail = out.split(/\r?\n/).filter((l) => l.trim() && !/^\s+at /.test(l)).slice(-12).join("\n");
  console.error(`\n----- Pesan error (setup versi ${SETUP_VERSION}, ${label}) -----\n${tail}\n-----------------------------------------`);
  console.error(`\x1b[33mPetunjuk:\x1b[0m ${hints[0] ?? "kirimkan pesan error di atas untuk dibantu."}`);
  console.error(`Log lengkap disimpan di file ${LOG} — kirimkan isinya bila butuh bantuan.`);
  return false;
}

const SETUP_VERSION = 3;
console.log(`\n=== Setup Sistem Informasi Kesiswaan (lokal) — versi ${SETUP_VERSION} ===`);

// 1. Versi Node
const [maj, min] = process.versions.node.split(".").map(Number);
if (maj < 18 || (maj === 18 && min < 18)) fail(`Node.js ${process.versions.node} terlalu lama. Pasang Node.js 20 LTS dari https://nodejs.org lalu ulangi.`);
ok(`Node.js ${process.versions.node}`);

// 2. File .env
step("Menyiapkan file .env");
const secret = () => crypto.randomBytes(32).toString("base64url");
if (!existsSync(".env")) {
  let env = readFileSync(".env.example", "utf8");
  env = env
    .replace(/^DATABASE_URL=.*$/m, 'DATABASE_URL="mysql://root:@localhost:3306/kesiswaan"')
    .replace(/^NEXTAUTH_SECRET=.*$/m, `NEXTAUTH_SECRET="${secret()}"`)
    .replace(/^CRON_SECRET=.*$/m, `CRON_SECRET="${secret()}"`);
  writeFileSync(".env", env);
  ok(".env dibuat (database: kesiswaan, user root tanpa password — bawaan Laragon/XAMPP)");
} else {
  ok(".env sudah ada — tidak diubah");
}
const dbUrl = readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1] ?? "";

// 3. MySQL menyala?
step("Memeriksa MySQL");
const { hostname, port } = (() => {
  try {
    const u = new URL(dbUrl);
    return { hostname: u.hostname, port: Number(u.port || 3306) };
  } catch {
    return { hostname: "localhost", port: 3306 };
  }
})();
const reachable = await new Promise((resolve) => {
  const s = net.connect({ host: hostname === "localhost" ? "127.0.0.1" : hostname, port, timeout: 3000 });
  s.on("connect", () => (s.destroy(), resolve(true)));
  s.on("error", () => resolve(false));
  s.on("timeout", () => (s.destroy(), resolve(false)));
});
if (!reachable) fail(`MySQL tidak terdeteksi di ${hostname}:${port}. Buka Laragon lalu klik "Start All" (atau nyalakan MySQL di XAMPP), kemudian ulangi.`);
ok(`MySQL aktif di ${hostname}:${port}`);

// 4. Dependensi
step("Memasang dependensi (pertama kali bisa 2–5 menit)");
if (!run("npm", ["install", "--no-audit", "--no-fund"])) fail("npm install gagal. Periksa koneksi internet lalu ulangi.");
ok("Dependensi terpasang");

// 5. Prisma Client, database & data demo
step("Menyiapkan Prisma Client");
if (!runLogged("generate", "npx", ["prisma", "generate"])) fail("Gagal membuat Prisma Client.");
ok("Prisma Client siap");
step("Membuat database & tabel");
if (!runLogged("migrate", "npx", ["prisma", "migrate", "deploy"])) fail("Migrasi gagal.");
ok("Database siap");
step("Mengisi data demo");
if (!runLogged("seed", "npm", ["run", "db:seed"])) fail("Pengisian data demo gagal.");

console.log(`
\x1b[32m=== Selesai! ===\x1b[0m
Buka http://localhost:3000 setelah aplikasi menyala.
Akun staf (password Kesiswaan#2026, wajib diganti saat login pertama):
  admin · pks · guru · walikelas · bk · kepsek
Orang tua: tab "Orang Tua", NISN 0081234514, PIN 123456
`);

if (process.argv.includes("--jalankan")) {
  step("Menyalakan aplikasi (mode produksi — semua menu cepat)");
  run(process.execPath, ["scripts/jalankan-lokal.mjs"]);
} else {
  console.log("Untuk menyalakan aplikasi: klik dua kali JALANKAN.bat  (atau: node scripts/jalankan-lokal.mjs)");
}
