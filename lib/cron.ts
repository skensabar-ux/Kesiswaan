import "server-only";
import crypto from "node:crypto";

/** Validasi token cron: ?token=… atau header Authorization: Bearer … (perbandingan waktu-konstan). */
export function isValidCronRequest(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (secret.length < 16) return false; // tolak bila secret belum diatur / terlalu pendek
  const url = new URL(req.url);
  const given = url.searchParams.get("token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
