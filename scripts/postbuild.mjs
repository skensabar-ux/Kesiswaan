// Melengkapi output `standalone` agar siap diunggah ke cPanel (Passenger):
// - .next/static & public (tidak disalin otomatis oleh Next.js)
// - engine Prisma untuk semua binaryTargets (termasuk rhel untuk CloudLinux)
// - folder prisma/ (schema + migrasi) untuk `prisma migrate deploy` di server
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, ".next", "standalone");
if (!existsSync(out)) {
  console.warn("[postbuild] .next/standalone tidak ditemukan — lewati.");
  process.exit(0);
}

const copy = (from, to) => {
  if (!existsSync(from)) return;
  cpSync(from, to, { recursive: true, force: true });
  console.log(`[postbuild] ${path.relative(root, from)} → ${path.relative(root, to)}`);
};

copy(path.join(root, ".next", "static"), path.join(out, ".next", "static"));
copy(path.join(root, "public"), path.join(out, "public"));
copy(path.join(root, "prisma"), path.join(out, "prisma"));

const engineSrc = path.join(root, "node_modules", ".prisma", "client");
const engineDst = path.join(out, "node_modules", ".prisma", "client");
if (existsSync(engineSrc)) {
  mkdirSync(engineDst, { recursive: true });
  for (const f of readdirSync(engineSrc)) {
    if (f.endsWith(".node") || f === "schema.prisma") copy(path.join(engineSrc, f), path.join(engineDst, f));
  }
}

// Jangan ikut mengunggah rahasia mesin build — di cPanel, env diatur lewat "Setup Node.js App".
for (const f of readdirSync(out)) {
  if (f.startsWith(".env")) {
    rmSync(path.join(out, f), { force: true });
    console.log(`[postbuild] hapus ${f} dari output`);
  }
}

mkdirSync(path.join(out, "uploads"), { recursive: true });
console.log("[postbuild] selesai. Unggah isi .next/standalone ke folder aplikasi di cPanel.");
