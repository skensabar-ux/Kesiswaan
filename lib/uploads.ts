import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { UserError } from "@/lib/action";

// Catatan: hindari path.resolve(process.cwd(), <dinamis>) — file tracer Next.js akan
// menyertakan seluruh folder proyek ke output standalone.
const envUploadDir = process.env.UPLOAD_DIR;
export const UPLOAD_ROOT = envUploadDir ? path.resolve(envUploadDir) : path.join(process.cwd(), "uploads");

const IMAGE_SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    ext: "png",
    test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

export function sniffImage(buf: Buffer) {
  return IMAGE_SIGNATURES.find((s) => s.test(buf)) ?? null;
}

/**
 * Simpan gambar yang diunggah. Validasi: ukuran & isi file (magic bytes), bukan hanya ekstensi/MIME dari browser.
 * @param subdir mis. "incidents/2026" atau "public" (untuk logo — bisa diakses tanpa login)
 * @returns path relatif terhadap UPLOAD_ROOT (disimpan di DB)
 */
export async function saveImage(file: File, subdir: string, maxBytes = 2 * 1024 * 1024) {
  if (!file || file.size === 0) throw new UserError("File kosong.");
  if (file.size > maxBytes) throw new UserError(`Ukuran file maksimal ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind) throw new UserError("Hanya file gambar (JPG, PNG, WEBP) yang diizinkan.");
  const safeSub = subdir.replace(/[^a-zA-Z0-9/_-]/g, "");
  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${kind.ext}`;
  const dir = path.join(UPLOAD_ROOT, safeSub);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return { path: `${safeSub}/${name}`, mimeType: kind.mime, size: buf.length };
}

/** Resolusi path aman (mencegah path traversal). */
export function resolveUpload(rel: string) {
  const full = path.resolve(UPLOAD_ROOT, rel);
  if (!full.startsWith(UPLOAD_ROOT + path.sep)) return null;
  return full;
}

export async function readUpload(rel: string) {
  const full = resolveUpload(rel);
  if (!full) return null;
  try {
    return await readFile(full);
  } catch {
    return null;
  }
}

export async function deleteUpload(rel: string | null | undefined) {
  if (!rel) return;
  const full = resolveUpload(rel);
  if (full) await unlink(full).catch(() => {});
}
