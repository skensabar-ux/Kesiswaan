import "server-only";

/**
 * Adapter WA Gateway generik. Driver dipilih lewat env WA_GATEWAY_DRIVER:
 * - "fonnte"  : POST form {target, message}, header Authorization: <token>
 * - "wablas"  : POST JSON {phone, message}, header Authorization: <token>
 * - "generic" : POST JSON {to, message}, header Authorization: Bearer <token>   (default)
 * URL & token: WA_GATEWAY_URL, WA_GATEWAY_TOKEN.
 */
export type WaResult = { ok: boolean; status: number; body: string };
export type WaDriver = "fonnte" | "wablas" | "generic";

export function waConfig() {
  const driver = (process.env.WA_GATEWAY_DRIVER || "generic").toLowerCase() as WaDriver;
  return {
    driver: (["fonnte", "wablas", "generic"] as const).includes(driver) ? driver : "generic",
    url: process.env.WA_GATEWAY_URL || "",
    token: process.env.WA_GATEWAY_TOKEN || "",
  };
}

export function isWaConfigured() {
  const c = waConfig();
  return Boolean(c.url && c.token);
}

/** Bangun request HTTP sesuai driver (dipisah agar mudah diuji). */
export function buildWaRequest(driver: WaDriver, token: string, to: string, message: string): { headers: Record<string, string>; body: string | URLSearchParams } {
  switch (driver) {
    case "fonnte":
      return { headers: { Authorization: token }, body: new URLSearchParams({ target: to, message, countryCode: "62" }) };
    case "wablas":
      return { headers: { Authorization: token, "Content-Type": "application/json" }, body: JSON.stringify({ phone: to, message }) };
    default:
      return { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ to, message }) };
  }
}

/** Beberapa gateway membalas HTTP 200 dengan {status:false}. Anggap gagal bila demikian. */
export function interpretWaResponse(httpStatus: number, body: string): boolean {
  if (httpStatus < 200 || httpStatus >= 300) return false;
  try {
    const j = JSON.parse(body) as { status?: unknown; success?: unknown };
    if (j.status === false || j.success === false) return false;
  } catch {
    /* bukan JSON — cukup cek HTTP status */
  }
  return true;
}

export async function sendWa(to: string, message: string, timeoutMs = 15_000): Promise<WaResult> {
  const c = waConfig();
  if (!c.url || !c.token) return { ok: false, status: 0, body: "WA gateway belum dikonfigurasi (WA_GATEWAY_URL / WA_GATEWAY_TOKEN)." };
  const req = buildWaRequest(c.driver, c.token, to, message);
  try {
    const res = await fetch(c.url, { method: "POST", headers: req.headers, body: req.body, signal: AbortSignal.timeout(timeoutMs) });
    const body = (await res.text()).slice(0, 2000);
    return { ok: interpretWaResponse(res.status, body), status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: e instanceof Error ? e.message : String(e) };
  }
}
