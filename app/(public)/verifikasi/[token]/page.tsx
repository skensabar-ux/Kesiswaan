import { BadgeCheck, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/date";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { initialsOf } from "@/lib/letter";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Verifikasi Surat", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Halaman publik verifikasi keaslian surat — hanya data minimal, tanpa detail pelanggaran. */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [l, s] = await Promise.all([
    prisma.summonsLetter.findUnique({ where: { verifyToken: token }, include: { case: { select: { student: { select: { name: true } } } } } }),
    getSettings(),
  ]);
  if (!l) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <XCircle className="size-12 text-destructive" />
          <p className="text-lg font-bold">Surat tidak terdaftar</p>
          <p className="text-sm text-muted-foreground">Kode verifikasi tidak ditemukan di sistem {s.schoolName}. Surat ini kemungkinan tidak asli.</p>
        </CardContent>
      </Card>
    );
  }
  const cancelled = Boolean(l.deletedAt);
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        {cancelled ? <XCircle className="size-12 text-destructive" /> : <BadgeCheck className="size-12 text-success" />}
        <p className="text-lg font-bold">{cancelled ? "Surat telah DIBATALKAN" : "Surat ASLI & terdaftar"}</p>
        <dl className="mt-2 grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-left text-sm">
          <dt className="text-muted-foreground">Nomor</dt>
          <dd className="font-mono">{l.letterNumber}</dd>
          <dt className="text-muted-foreground">Jenis</dt>
          <dd>{LETTER_TYPE_LABEL[l.type]}</dd>
          <dt className="text-muted-foreground">Tanggal surat</dt>
          <dd>{formatDate(l.letterDate)}</dd>
          <dt className="text-muted-foreground">Penerbit</dt>
          <dd>{s.schoolName}</dd>
          <dt className="text-muted-foreground">Kepala Sekolah</dt>
          <dd>{s.principalName || "-"}</dd>
          <dt className="text-muted-foreground">Peserta didik</dt>
          <dd>{initialsOf(l.case.student.name)}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
