// Menjalankan aplikasi di komputer sendiri dalam MODE PRODUKSI (cepat; semua menu sudah dikompilasi).
// Build dibuat sekali (beberapa menit); berikutnya langsung menyala.
//   node scripts/jalankan-lokal.mjs            → build bila perlu, lalu nyalakan di http://localhost:3000
//   node scripts/jalankan-lokal.mjs --build    → paksa build ulang (setelah memperbarui kode)
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import net from "node:net";
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

// ───── Port: aplikasi lama yang masih menyala mengunci file di Windows sehingga build gagal ─────
const portBusy = () =>
  new Promise((resolve) => {
    const sock = net.connect({ port: Number(port), host: "127.0.0.1" });
    sock.setTimeout(1500);
    sock.once("connect", () => (sock.destroy(), resolve(true)));
    sock.once("timeout", () => (sock.destroy(), resolve(false)));
    sock.once("error", () => resolve(false));
  });

function stopProcessOnPort() {
  if (isWin) {
    const out = spawnSync("netstat", ["-ano"], { encoding: "utf8" }).stdout ?? "";
    const pids = new Set(
      out
        .split(/\r?\n/)
        .filter((l) => /LISTENING/i.test(l) && new RegExp(`:${port}\\s`).test(l))
        .map((l) => l.trim().split(/\s+/).pop())
        .filter((pid) => pid && pid !== "0" && pid !== String(process.pid)),
    );
    for (const pid of pids) spawnSync("taskkill", ["/PID", pid, "/T", "/F"], { stdio: "ignore" });
  } else {
    let pids = (spawnSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" }).stdout ?? "").split(/\s+/).filter(Boolean);
    if (!pids.length) {
      const ss = spawnSync("ss", ["-ltnpH", `sport = :${port}`], { encoding: "utf8" }).stdout ?? "";
      pids = [...ss.matchAll(/pid=(\d+)/g)].map((m) => m[1]);
    }
    for (const pid of pids) spawnSync("kill", [pid], { stdio: "ignore" });
  }
}

if (await portBusy()) {
  const page = await fetch(`http://localhost:${port}/login`, { signal: AbortSignal.timeout(4000) }).then((r) => r.text(), () => "");
  if (!page.includes("Kesiswaan")) {
    fail(`Port ${port} sedang dipakai program lain. Tutup program tersebut, atau tambahkan baris PORT="3001" di file .env lalu ulangi.`);
  }
  console.log("\n\x1b[33m▶ Aplikasi Kesiswaan versi lama masih menyala di jendela lain, dimatikan dulu…\x1b[0m");
  stopProcessOnPort();
  for (let i = 0; i < 20 && (await portBusy()); i++) await new Promise((r) => setTimeout(r, 500));
  if (await portBusy()) fail("Aplikasi lama belum bisa dimatikan. Tutup semua jendela hitam (Command Prompt) Kesiswaan, lalu jalankan lagi JALANKAN.bat.");
  await new Promise((r) => setTimeout(r, 1500)); // beri waktu Windows melepas kunci file
}

const LOG = "build-error.log";
const HINTS = [
  [/EPERM|EBUSY|operation not permitted|resource busy or locked/i, "Ada file yang sedang dikunci. Tutup semua jendela hitam Kesiswaan dan editor kode, lalu ulangi. Bila tetap gagal: restart komputer, atau kecualikan folder aplikasi dari antivirus."],
  [/heap out of memory|ENOMEM|Allocation failed/i, "Memori (RAM) komputer tidak cukup saat build. Tutup aplikasi lain (browser, dsb.) lalu ulangi."],
  [/ENOSPC|no space left/i, "Ruang penyimpanan (disk) penuh. Kosongkan sebagian ruang lalu ulangi."],
  [/ENOTFOUND|ETIMEDOUT|ECONNRESET|EAI_AGAIN|network/i, "Koneksi internet bermasalah saat mengunduh paket. Periksa internet lalu ulangi."],
  [/Can't reach database|P1001|ECONNREFUSED.*3306/i, "MySQL belum menyala. Buka Laragon, klik Start All, lalu ulangi."],
  [/Type error|Failed to compile|Module not found/i, "Kode aplikasi gagal dikompilasi. Pastikan ZIP diekstrak lengkap (pilih Replace / Ganti semua), lalu ulangi."],
];

/** Jalankan perintah sambil menampilkan & menyimpan keluarannya ke build-error.log. */
function runLogged(label, cmd, args, extraEnv = {}) {
  console.log(`\n\x1b[36m▶ ${label}\x1b[0m`);
  // tanpa NODE_ENV=production: npm install harus ikut memasang devDependencies untuk build
  const buildEnv = { ...env, ...extraEnv };
  delete buildEnv.NODE_ENV;
  appendFileSync(LOG, `\n===== ${new Date().toISOString()} ${label} =====\n`);
  return new Promise((resolve) => {
    let out = "";
    const child = spawn(cmd, args, { shell: isWin, env: buildEnv, stdio: ["inherit", "pipe", "pipe"] });
    const onData = (stream) => (d) => {
      stream.write(d);
      out += d;
      appendFileSync(LOG, d);
    };
    child.stdout.on("data", onData(process.stdout));
    child.stderr.on("data", onData(process.stderr));
    child.on("close", (code) => resolve({ ok: code === 0, out }));
    child.on("error", (e) => resolve({ ok: false, out: String(e) }));
  });
}

function explain(label, out, fallback) {
  const lines = out
    .split(/\r?\n/)
    .map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trimEnd())
    .filter((l) => l.trim() && !/^\s+at /.test(l));
  console.error(`\n\x1b[31m----- Pesan error (${label}) -----\x1b[0m`);
  console.error(lines.slice(-14).join("\n"));
  const hint = HINTS.find(([re]) => re.test(out))?.[1] ?? fallback;
  console.error(`\n\x1b[33mPetunjuk: ${hint}\x1b[0m`);
  console.error(`Log lengkap tersimpan di file ${LOG} (di folder aplikasi). Bila tetap gagal, kirimkan file itu atau foto layar ini.`);
  fail(`${label} gagal.`);
}

if (needBuild) {
  writeFileSync(LOG, "");
  // kode baru bisa membawa paket & perubahan database baru
  let r = await runLogged("Memeriksa paket…", "npm", ["install", "--no-audit", "--no-fund"]);
  if (!r.ok) explain("Pemasangan paket", r.out, "Periksa koneksi internet lalu ulangi.");
  r = await runLogged("Memperbarui struktur database…", "npx", ["prisma", "migrate", "deploy"]);
  if (!r.ok) explain("Pembaruan database", r.out, "Pastikan MySQL di Laragon menyala lalu ulangi.");
  r = await runLogged("Membuat versi produksi (sekitar 2–5 menit)…", "npm", ["run", "build"], { KESISWAAN_LOCAL: "1" });
  if (!r.ok && /EPERM|EBUSY|operation not permitted|resource busy or locked/i.test(r.out)) {
    // sering karena antivirus memindai file baru: tunggu sebentar lalu coba sekali lagi
    console.log("\n\x1b[33m▶ Ada file yang terkunci, mencoba lagi dalam 5 detik…\x1b[0m");
    await new Promise((res) => setTimeout(res, 5000));
    r = await runLogged("Membuat versi produksi (percobaan ke-2)…", "npm", ["run", "build"], { KESISWAAN_LOCAL: "1" });
  }
  if (!r.ok) explain("Build", r.out, "Tutup semua jendela hitam Kesiswaan lalu jalankan lagi JALANKAN.bat.");
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
