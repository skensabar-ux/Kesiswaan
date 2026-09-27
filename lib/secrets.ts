import crypto from "node:crypto";

export function randomPin(len = 6) {
  let s = "";
  while (s.length < len) s += crypto.randomInt(0, 10).toString();
  return s;
}

/** Password sementara yang mudah dibaca (tanpa karakter ambigu). */
export function randomPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: len }, () => chars[crypto.randomInt(0, chars.length)]).join("");
}

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}
