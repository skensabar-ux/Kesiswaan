import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { formatLongDate, formatTime, fromWitaInput, toDateInput, witaParts } from "@/lib/date";
import { LETTER_TYPE_LABEL } from "@/lib/constants";
import { SESSION_TYPE_LABEL } from "@/lib/validators/bk";
import { cn, sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Kalender BK" };

type SP = Promise<Record<string, string | string[] | undefined>>;
type Ev = { at: Date; kind: "surat" | "sesi"; title: string; sub: string; href: string; muted: boolean };

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const pad = (n: number) => String(n).padStart(2, "0");
const addDays = (d: string, n: number) => toDateInput(new Date(fromWitaInput(d).getTime() + n * 86_400_000 + 12 * 3600_000));
/** 0 = Senin … 6 = Minggu (WITA) */
const weekdayMon = (d: string) => (new Date(`${d}T12:00:00+08:00`).getUTCDay() + 6) % 7;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requirePageRole("ADMIN", "BK", "KEPSEK");
  const params = await searchParams;
  const week = sp(params.tampilan) === "minggu";
  const today = toDateInput(new Date());
  const tp = witaParts(new Date());
  const bulan = /^\d{4}-\d{2}$/.test(sp(params.bulan)) ? sp(params.bulan) : `${tp.year}-${pad(tp.month)}`;
  const [y, m] = bulan.split("-").map(Number) as [number, number];
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(sp(params.tanggal)) ? sp(params.tanggal) : today;

  // rentang tampilan
  let start: string, days: number;
  if (week) {
    start = addDays(anchor, -weekdayMon(anchor));
    days = 7;
  } else {
    const first = `${y}-${pad(m)}-01`;
    start = addDays(first, -weekdayMon(first));
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const last = `${y}-${pad(m)}-${pad(lastDay)}`;
    days = Math.ceil((weekdayMon(first) + lastDay + (6 - weekdayMon(last))) / 7) * 7;
  }
  const from = fromWitaInput(start);
  const to = new Date(from.getTime() + days * 86_400_000);
  const mine = user.role === "BK" && sp(params.milik) === "saya";

  const [letters, sessions] = await Promise.all([
    prisma.summonsLetter.findMany({
      where: { deletedAt: null, meetingAt: { gte: from, lt: to }, ...(mine && { OR: [{ createdById: user.id }, { case: { assignedBkId: user.id } }] }) },
      include: { case: { select: { student: { select: { name: true } } } } },
    }),
    prisma.counselingSession.findMany({
      where: { status: { not: "BATAL" }, scheduledAt: { gte: from, lt: to }, ...(mine && { counselorId: user.id }) },
      include: { case: { select: { id: true, student: { select: { name: true } } } } },
    }),
  ]);
  const events: Ev[] = [
    ...letters.map((l) => ({
      at: l.meetingAt,
      kind: "surat" as const,
      title: l.case.student.name,
      sub: LETTER_TYPE_LABEL[l.type] + (l.status === "DRAFT" ? " (draf)" : ""),
      href: `/bk/surat/${l.id}`,
      muted: l.status === "DRAFT" || l.status === "HADIR" || l.status === "TIDAK_HADIR",
    })),
    ...sessions.map((s) => ({
      at: s.scheduledAt,
      kind: "sesi" as const,
      title: s.case.student.name,
      sub: SESSION_TYPE_LABEL[s.type],
      href: `/bk/kasus/${s.case.id}`,
      muted: s.status === "SELESAI",
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  const byDay = new Map<string, Ev[]>();
  for (const e of events) byDay.set(toDateInput(e.at), [...(byDay.get(toDateInput(e.at)) ?? []), e]);
  const dayList = Array.from({ length: days }, (_, i) => addDays(start, i));

  const q = (o: Record<string, string>) => {
    const s = new URLSearchParams({ ...(mine ? { milik: "saya" } : {}), ...o });
    return `/bk/kalender?${s.toString()}`;
  };
  const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  const title = week ? `Minggu ${formatLongDate(fromWitaInput(start))}` : `${MONTHS[m - 1]} ${y}`;

  const Chip = ({ e }: { e: Ev }) => (
    <Link
      href={e.href}
      className={cn(
        "block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight",
        e.kind === "surat" ? "bg-primary/10 text-primary" : "bg-success/15 text-success",
        e.muted && "opacity-50",
      )}
      title={`${formatTime(e.at)} ${e.title} — ${e.sub}`}
    >
      {formatTime(e.at)} {e.title}
    </Link>
  );

  const agenda = (list: string[]) => (
    <div className="flex flex-col gap-3">
      {list
        .filter((d) => week || (byDay.get(d)?.length ?? 0) > 0)
        .map((d) => (
          <Card key={d} className={cn(d === today && "border-primary/50")}>
            <CardContent className="pt-3 md:pt-4">
              <p className={cn("mb-2 text-sm font-semibold", d === today && "text-primary")}>{formatLongDate(fromWitaInput(d))}</p>
              {(byDay.get(d) ?? []).length === 0 && <p className="text-xs text-muted-foreground">Tidak ada jadwal.</p>}
              <ul className="flex flex-col gap-1.5">
                {(byDay.get(d) ?? []).map((e, i) => (
                  <li key={i}>
                    <Link href={e.href} className={cn("flex items-start gap-2 text-sm hover:underline", e.muted && "opacity-60")}>
                      <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{formatTime(e.at)}</span>
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", e.kind === "surat" ? "bg-primary" : "bg-success")} />
                      <span>
                        <b>{e.title}</b> — {e.sub}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      {!week && events.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada jadwal bulan ini.</p>}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Kalender BK"
        description={
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary" /> Pertemuan surat panggilan
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-success" /> Sesi pendampingan
            </span>
          </span>
        }
        actions={
          <Button variant="outline" asChild>
            <Link href={week ? q({ bulan }) : q({ tampilan: "minggu", tanggal: today })}>
              {week ? <CalendarDays /> : <List />} {week ? "Bulan" : "Minggu"}
            </Link>
          </Button>
        }
      />
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" asChild aria-label="Sebelumnya">
          <Link href={week ? q({ tampilan: "minggu", tanggal: addDays(start, -7) }) : q({ bulan: prevMonth })}>
            <ChevronLeft />
          </Link>
        </Button>
        <div className="text-center">
          <p className="font-semibold">{title}</p>
          <Link href={week ? q({ tampilan: "minggu", tanggal: today }) : q({})} className="text-xs text-primary hover:underline">
            Hari ini
          </Link>
        </div>
        <Button variant="outline" size="icon" asChild aria-label="Berikutnya">
          <Link href={week ? q({ tampilan: "minggu", tanggal: addDays(start, 7) }) : q({ bulan: nextMonth })}>
            <ChevronRight />
          </Link>
        </Button>
      </div>

      {week ? (
        agenda(dayList)
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-semibold text-muted-foreground">
              {DAYS.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {dayList.map((d) => {
                const inMonth = d.startsWith(bulan);
                const list = byDay.get(d) ?? [];
                return (
                  <div key={d} className={cn("min-h-28 border-b border-r p-1.5", !inMonth && "bg-muted/30 text-muted-foreground")}>
                    <Link
                      href={q({ tampilan: "minggu", tanggal: d })}
                      className={cn("mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs", d === today && "bg-primary font-bold text-primary-foreground")}
                    >
                      {Number(d.slice(8))}
                    </Link>
                    <div className="flex flex-col gap-0.5">
                      {list.slice(0, 3).map((e, i) => (
                        <Chip key={i} e={e} />
                      ))}
                      {list.length > 3 && (
                        <Link href={q({ tampilan: "minggu", tanggal: d })} className="px-1 text-[11px] text-muted-foreground hover:underline">
                          +{list.length - 3} lainnya
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <div className="md:hidden">{agenda(dayList.filter((d) => d.startsWith(bulan)))}</div>
        </>
      )}
    </>
  );
}
