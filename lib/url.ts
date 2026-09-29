/** URL absolut aplikasi untuk tautan di WA & QR surat. */
export function appUrl(path = "") {
  const base = (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
  return base + path;
}
