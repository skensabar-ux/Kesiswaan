import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/rbac";
import { renderLetterPdf } from "@/lib/pdf/letter-data";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (!["ADMIN", "PKS", "BK", "KEPSEK"].includes(user.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const pdf = await renderLetterPdf((await params).id);
  if (!pdf) return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
  const download = new URL(req.url).searchParams.has("unduh");
  return new NextResponse(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${pdf.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
