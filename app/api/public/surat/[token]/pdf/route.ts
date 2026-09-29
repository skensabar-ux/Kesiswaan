import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderLetterPdf } from "@/lib/pdf/letter-data";

export const dynamic = "force-dynamic";

/** PDF surat untuk orang tua (tautan WA memakai responseToken, bukan token QR). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const l = await prisma.summonsLetter.findUnique({ where: { responseToken: token }, select: { id: true, status: true, deletedAt: true } });
  if (!l || l.deletedAt || l.status === "DRAFT") return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
  const pdf = await renderLetterPdf(l.id);
  if (!pdf) return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
  return new NextResponse(new Uint8Array(pdf.buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${pdf.filename}"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
