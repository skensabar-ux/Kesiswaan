// Setup otomatis untuk mencoba aplikasi di komputer sendiri (Windows/Laragon, macOS, Linux).
// Hanya memakai modul bawaan Node, jadi bisa dijalankan sebelum `npm install`.
//   node scripts/setup-lokal.mjs            → siapkan .env, install, migrasi, data demo
//   node scripts/setup-lokal.mjs --jalankan → sekaligus menyalakan aplikasi
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

console.log("\n=== Setup Sistem Informasi Kesiswaan (lokal) ===");

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

// 5. Database & data demo
step("Membuat database & tabel");
if (!run("npx", ["prisma", "migrate", "deploy"])) fail("Migrasi gagal. Pastikan DATABASE_URL di file .env benar (user/password MySQL).");
ok("Database siap");
step("Mengisi data demo");
if (!run("npm", ["run", "db:seed"])) fail("Pengisian data demo gagal.");

console.log(`
\x1b[32m=== Selesai! ===\x1b[0m
Buka http://localhost:3000 setelah aplikasi menyala.
Akun staf (password Kesiswaan#2026, wajib diganti saat login pertama):
  admin · pks · guru · walikelas · bk · kepsek
Orang tua: tab "Orang Tua", NISN 0081234514, PIN 123456
`);

if (process.argv.includes("--jalankan")) {
  step("Menyalakan aplikasi (tutup jendela ini untuk berhenti)");
  run("npm", ["run", "dev"]);
} else {
  console.log("Untuk menyalakan aplikasi: npm run dev  (atau klik dua kali JALANKAN.bat)");
}
