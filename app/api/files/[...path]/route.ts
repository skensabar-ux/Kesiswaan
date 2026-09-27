import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/rbac";
import { readUpload, sniffImage } from "@/lib/uploads";
import { canReadUpload } from "@/lib/upload-access";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rel = (await params).path.join("/");
  const isPublic = rel.startsWith("public/");
  if (!isPublic) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    if (!(await canReadUpload(user, rel))) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  const buf = await readUpload(rel);
  if (!buf) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  const kind = sniffImage(buf);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": kind?.mime ?? "application/octet-stream",
      "Cache-Control": isPublic ? "public, max-age=3600" : "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
