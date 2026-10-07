// Menjalankan aplikasi di komputer sendiri dalam MODE PRODUKSI (cepat; semua menu sudah dikompilasi).
// Build dibuat sekali (beberapa menit); berikutnya langsung menyala.
//   node scripts/jalankan-lokal.mjs            → build bila perlu, lalu nyalakan di http://localhost:3000
//   node scripts/jalankan-lokal.mjs --build    → paksa build ulang (setelah memperbarui kode)
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const isWin = process.platform === "win32";
const fail = (m) => {
  console.error(`\n\x1b[31m✖ ${m}\x1b[0m\n`);
  process.exit(1);
};

if (!existsSync(".env")) fail("File .env belum ada. Jalankan SETUP-WINDOWS.bat terlebih dahulu.");

// Baca .env sederhana (KEY="nilai") → environment untuk server
const env = { ...process.env };
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  if (line.trim().startsWith("#")) continue;
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const port = env.PORT || "3000";
env.PORT = port;
env.NODE_ENV = "production";
env.NEXTAUTH_URL ||= `http://localhost:${port}`;
env.AUTH_TRUST_HOST = "true";
// unggahan disimpan di folder proyek (bukan di folder build, agar tidak hilang saat build ulang)
env.UPLOAD_DIR = path.isAbsolute(env.UPLOAD_DIR || "") ? env.UPLOAD_DIR : path.join(root, (env.UPLOAD_DIR || "uploads").replace(/^\.[\\/]/, ""));

const server = path.join(root, ".next", "standalone", "server.js");
// Sidik jari isi kode sumber: build ulang otomatis bila kode berubah (mis. setelah mengekstrak ZIP baru).
// Waktu file tidak bisa diandalkan karena ZIP menyimpan waktu lama.
const SOURCES = ["app", "components", "lib", "server", "prisma", "public", "types", "auth.ts", "auth.config.ts", "middleware.ts", "next.config.ts", "package.json", "package-lock.json"];
function fingerprint() {
  const h = createHash("sha1");
  const walk = (p) => {
    if (!existsSync(p)) return;
    let entries;
    try {
      entries = readdirSync(p, { withFileTypes: true });
    } catch {
      h.update(p).update(readFileSync(p)); // berkas
      return;
    }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name.startsWith(".")) continue; // mis. prisma/.schema.deploy.prisma
      walk(path.join(p, e.name));
    }
  };
  SOURCES.forEach(walk);
  return h.digest("hex");
}
const stamp = path.join(root, ".next", "kesiswaan-build.txt");
const needBuild =
  process.argv.includes("--build") ||
  !existsSync(server) ||
  !existsSync(stamp) ||
  readFileSync(stamp, "utf8").trim() !== fingerprint();

if (needBuild) {
  const step = (label, cmd, args, extraEnv = {}) => {
    console.log(`\n\x1b[36m▶ ${label}\x1b[0m`);
    // tanpa NODE_ENV=production: npm install harus ikut memasang devDependencies untuk build
    const buildEnv = { ...env };
    delete buildEnv.NODE_ENV;
    return spawnSync(cmd, args, { stdio: "inherit", shell: isWin, env: { ...buildEnv, ...extraEnv } }).status === 0;
  };
  // kode baru bisa membawa paket & perubahan database baru
  if (!step("Memeriksa paket…", "npm", ["install", "--no-audit", "--no-fund"]))
    fail("Gagal memasang paket. Periksa koneksi internet lalu ulangi.");
  if (!step("Memperbarui struktur database…", "npx", ["prisma", "migrate", "deploy"]))
    fail("Gagal memperbarui database. Pastikan MySQL di Laragon menyala lalu ulangi.");
  const ok = step("Membuat versi produksi (sekitar 2–5 menit)…", "npm", ["run", "build"], { KESISWAAN_LOCAL: "1" });
  if (!ok) fail("Build gagal. Tutup jendela lain yang menjalankan aplikasi lalu ulangi; bila tetap gagal, kirimkan pesan error di atas.");
  writeFileSync(stamp, fingerprint()); // dihitung ulang: npm install bisa merapikan package-lock.json
}

console.log(`\n\x1b[32m▶ Aplikasi menyala di http://localhost:${port}\x1b[0m  (tutup jendela ini untuk mematikan)\n`);
const child = spawn(process.execPath, [server], { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));

// buka browser otomatis setelah server siap
const url = `http://localhost:${port}/login`;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  if (await fetch(url).then((r) => r.ok, () => false)) {
    if (!process.argv.includes("--tanpa-browser")) {
      const [cmd, args] = isWin ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
      spawn(cmd, args, { stdio: "ignore", detached: true }).on("error", () => {});
    }
    break;
  }
}
