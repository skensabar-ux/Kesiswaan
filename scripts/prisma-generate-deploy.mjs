// Generate Prisma Client untuk build produksi: engine "native" + engine Linux hosting cPanel
// (Debian & RHEL/CloudLinux). Memakai salinan sementara schema agar schema utama tetap "native"
// sehingga `npm install` / mencoba di laptop tidak perlu mengunduh engine server.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// KESISWAAN_LOCAL=1 (dipakai JALANKAN.bat): build untuk komputer sendiri, cukup engine "native"
const TARGETS = process.env.KESISWAAN_LOCAL === "1" ? ["native"] : ["native", "debian-openssl-3.0.x", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x"];
const src = "prisma/schema.prisma";
const tmp = "prisma/.schema.deploy.prisma";
const schema = readFileSync(src, "utf8");
if (!/binaryTargets\s*=\s*\[[^\]]*\]/.test(schema)) throw new Error("binaryTargets tidak ditemukan di schema.prisma");
writeFileSync(tmp, schema.replace(/binaryTargets\s*=\s*\[[^\]]*\]/, `binaryTargets = ${JSON.stringify(TARGETS)}`));
try {
  const r = spawnSync("npx", ["prisma", "generate", "--schema", tmp], { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) {
    console.error("\nGagal mengunduh engine Prisma untuk server. Periksa koneksi internet (akses ke binaries.prisma.sh) lalu ulangi `npm run build`.");
    process.exit(r.status ?? 1);
  }
} finally {
  rmSync(tmp, { force: true });
}
