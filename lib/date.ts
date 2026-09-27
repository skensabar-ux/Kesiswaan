/** Utilitas tanggal: zona waktu Asia/Makassar (WITA, UTC+8, tanpa DST) & format Indonesia. */

export const APP_TZ = process.env.APP_TIMEZONE || "Asia/Makassar";
const WITA_OFFSET = "+08:00";

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", { timeZone: APP_TZ, ...opts });

const fLong = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fDate = fmt({ day: "numeric", month: "long", year: "numeric" });
const fShort = fmt({ day: "2-digit", month: "2-digit", year: "numeric" });
const fTime = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });

type D = Date | string | number | null | undefined;
const toDate = (d: D) => (d == null ? null : d instanceof Date ? d : new Date(d));

/** "Senin, 28 September 2026" */
export function formatLongDate(d: D) {
  const x = toDate(d);
  return x ? fLong.format(x) : "-";
}
/** "28 September 2026" */
export function formatDate(d: D) {
  const x = toDate(d);
  return x ? fDate.format(x) : "-";
}
/** "28/09/2026" */
export function formatShortDate(d: D) {
  const x = toDate(d);
  return x ? fShort.format(x) : "-";
}
/** "07.30" */
export function formatTime(d: D) {
  const x = toDate(d);
  return x ? fTime.format(x).replace(":", ".") : "-";
}
/** "Senin, 28 September 2026 pukul 07.30 WITA" */
export function formatDateTime(d: D) {
  const x = toDate(d);
  return x ? `${formatLongDate(x)} pukul ${formatTime(x)} WITA` : "-";
}

/** Bagian tanggal/jam di WITA. */
export function witaParts(d: Date) {
  const parts = Object.fromEntries(
    fmt({ year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Nilai untuk <input type="date"> (YYYY-MM-DD, WITA). */
export function toDateInput(d: D) {
  const x = toDate(d);
  if (!x) return "";
  const p = witaParts(x);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
/** Nilai untuk <input type="time"> (HH:mm, WITA). */
export function toTimeInput(d: D) {
  const x = toDate(d);
  if (!x) return "";
  const p = witaParts(x);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Gabungkan input tanggal ("YYYY-MM-DD") & jam ("HH:mm") WITA menjadi Date (UTC). */
export function fromWitaInput(date: string, time = "00:00"): Date {
  const d = new Date(`${date}T${time.length === 5 ? time + ":00" : time}${WITA_OFFSET}`);
  if (Number.isNaN(d.getTime())) throw new Error("Tanggal/jam tidak valid");
  return d;
}

/** Awal hari (00:00 WITA) dari suatu waktu. */
export function startOfWitaDay(d: Date = new Date()) {
  return fromWitaInput(toDateInput(d));
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export function monthRoman(month1to12: number) {
  return ROMAN[month1to12 - 1] ?? "";
}
