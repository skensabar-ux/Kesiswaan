import "server-only";
import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/date";
import { readUpload, sniffImage } from "@/lib/uploads";
import { appUrl } from "@/lib/url";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { LetterPdf, type LetterPdfData } from "@/lib/pdf/letter-pdf";

async function logoDataUrl(path: string | null) {
  if (!path) return null;
  const buf = await readUpload(path);
  if (!buf) return null;
  const kind = sniffImage(buf);
  // react-pdf hanya mendukung PNG & JPG
  if (!kind || kind.mime === "image/webp") return null;
  return `data:${kind.mime};base64,${buf.toString("base64")}`;
}

/** Kota untuk "Banjar, 29 September 2026": ambil dari alamat (kata sebelum "Kab."/koma), default "Banjar". */
function cityFrom(address: string) {
  const m = address.match(/Kec\.\s*([A-Za-z ]+?)(,|$)/i);
  return m?.[1]?.trim() || "Banjar";
}

export async function renderLetterPdf(letterId: string) {
  const [letter, settings] = await Promise.all([
    prisma.summonsLetter.findUnique({
      where: { id: letterId },
      include: {
        createdBy: { select: { name: true, teacher: { select: { nip: true } } } },
        case: { include: { student: { select: { name: true } } } },
      },
    }),
    getSettings(),
  ]);
  if (!letter) return null;
  const verifyUrl = appUrl(`/verifikasi/${letter.verifyToken}`);
  const data: LetterPdfData = {
    school: {
      name: settings.schoolName,
      gov1: settings.governmentLine1,
      gov2: settings.governmentLine2,
      address: settings.address,
      contact: [settings.phone && `Telp. ${settings.phone}`, settings.email && `Email: ${settings.email}`, settings.website].filter(Boolean).join(" · "),
      logo: await logoDataUrl(settings.logoPath),
      city: cityFrom(settings.address),
    },
    typeLabel: LETTER_TYPE_LABEL[letter.type],
    formal: letter.type === "PERJANJIAN" || letter.type === "PERNYATAAN",
    letterNumber: letter.letterNumber,
    letterDate: formatDate(letter.letterDate),
    subject: letter.subject,
    parentName: letter.parentName ?? "",
    studentName: letter.case.student.name,
    body: letter.bodySnapshot ?? "",
    bk: { name: letter.createdBy.name, nip: letter.createdBy.teacher?.nip ?? null },
    principal: { name: settings.principalName, nip: settings.principalNip },
    qr: await QRCode.toDataURL(verifyUrl, { margin: 0, width: 240, errorCorrectionLevel: "M" }),
    verifyUrl,
    cancelled: Boolean(letter.deletedAt),
  };
  const buffer = await renderToBuffer(createElement(LetterPdf, { d: data }) as Parameters<typeof renderToBuffer>[0]);
  return { buffer, filename: `${letter.type}-${letter.letterNumber.replace(/[^\w.-]+/g, "_")}.pdf` };
}
