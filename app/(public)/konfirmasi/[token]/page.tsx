import { notFound } from "next/navigation";
import { CalendarDays, Clock, FileText, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatLongDate, formatTime } from "@/lib/date";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponseForm } from "./form";

export const metadata = { title: "Konfirmasi Kehadiran", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const l = await prisma.summonsLetter.findUnique({
    where: { responseToken: token },
    include: { case: { select: { student: { select: { name: true, class: { select: { name: true } } } } } } },
  });
  if (!l || l.deletedAt || l.status === "DRAFT") notFound();
  const past = l.meetingAt.getTime() < Date.now();
  const canRespond = !past && ["TERKIRIM", "DIKONFIRMASI", "JADWAL_ULANG"].includes(l.status);
  const statusText =
    l.status === "DIKONFIRMASI"
      ? "Anda telah mengonfirmasi akan hadir."
      : l.status === "JADWAL_ULANG"
        ? "Anda telah meminta jadwal ulang. Guru BK akan menghubungi Anda."
        : l.status === "HADIR"
          ? "Kehadiran telah dicatat. Terima kasih."
          : l.status === "TIDAK_HADIR"
            ? "Tercatat tidak hadir. Silakan hubungi Guru BK."
            : null;
  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{LETTER_TYPE_LABEL[l.type]}</p>
        <CardTitle className="text-lg">Undangan untuk Orang Tua/Wali {l.case.student.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Kelas {l.case.student.class?.name ?? "-"} · No. {l.letterNumber}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-4 text-sm">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" /> {formatLongDate(l.meetingAt)}
          </p>
          <p className="flex items-center gap-2">
            <Clock className="size-4 text-primary" /> Pukul {formatTime(l.meetingAt)} WITA
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" /> {l.place}
          </p>
          <p className="text-muted-foreground">Perihal: {l.subject}</p>
        </div>
        <Button variant="outline" asChild>
          <a href={`/api/public/surat/${token}/pdf`} target="_blank" rel="noopener">
            <FileText /> Lihat / unduh surat (PDF)
          </a>
        </Button>
        {statusText && <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">{statusText}</p>}
        {past && !statusText && <p className="text-sm text-muted-foreground">Jadwal pertemuan sudah lewat.</p>}
        {canRespond && <ResponseForm token={token} current={l.status} />}
      </CardContent>
    </Card>
  );
}
