import Link from "next/link";
import { ClipboardCheck, Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { incidentScope } from "@/lib/incident-access";
import { pageParams } from "@/lib/pagination";
import { formatShortDate, formatTime, fromWitaInput } from "@/lib/date";
import { REPORTER_ROLES, STAFF_ROLES } from "@/lib/roles";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { FilterSelect } from "@/components/filter-select";
import { DateRangeFilter } from "@/components/date-range-filter";
import { Pagination } from "@/components/pagination";
import { IncidentStatusBadge } from "@/components/status-badges";
import { LevelBadge } from "@/components/level-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata = { title: "Kejadian" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requirePageRole(...STAFF_ROLES);
  const params = await searchParams;
  const q = sp(params.q);
  const kelas = sp(params.kelas);
  const level = sp(params.kategori);
  const status = sp(params.status);
  const from = sp(params.dari);
  const to = sp(params.sampai);
  const { page, take, skip } = pageParams(sp(params.page));

  const safeDate = (d: string, t: string) => {
    try {
      return /^\d{4}-\d{2}-\d{2}$/.test(d) ? fromWitaInput(d, t) : undefined;
    } catch {
      return undefined;
    }
  };
  const studentFilter: Prisma.IncidentStudentWhereInput = {
    ...(q && { student: { OR: [{ name: { contains: q } }, { nisn: { startsWith: q } }] } }),
    ...(kelas && { classId: kelas }),
    ...(level && ["RINGAN", "SEDANG", "BERAT"].includes(level) && { level: level as "RINGAN" }),
  };
  const where: Prisma.IncidentWhereInput = {
    AND: [
      await incidentScope(user),
      { deletedAt: null },
      status && ["MENUNGGU_VERIFIKASI", "TERVERIFIKASI", "DITOLAK"].includes(status) ? { status: status as "TERVERIFIKASI" } : {},
      Object.keys(studentFilter).length ? { students: { some: studentFilter } } : {},
      {
        occurredAt: {
          ...(safeDate(from, "00:00") && { gte: safeDate(from, "00:00") }),
          ...(safeDate(to, "23:59") && { lte: safeDate(to, "23:59") }),
        },
      },
    ],
  };

  const [rows, total, classes, pending] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take,
      skip,
      include: {
        reporter: { select: { name: true } },
        students: { include: { student: { select: { id: true, name: true } } } },
        _count: { select: { attachments: true } },
      },
    }),
    prisma.incident.count({ where }),
    prisma.class.findMany({ where: { academicYear: { isActive: true } }, orderBy: [{ grade: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    user.role === "PKS" || user.role === "ADMIN"
      ? prisma.incident.count({ where: { status: "MENUNGGU_VERIFIKASI", deletedAt: null } })
      : Promise.resolve(0),
  ]);

  const canReport = REPORTER_ROLES.includes(user.role);
  const scopeNote =
    user.role === "GURU" ? "Laporan yang Anda buat." : user.role === "WALI_KELAS" ? "Laporan Anda & kejadian siswa di kelas Anda." : undefined;

  return (
    <>
      <PageHeader
        title="Kejadian"
        description={scopeNote ?? `${total} kejadian`}
        actions={
          <>
            {pending > 0 && (
              <Button variant="outline" asChild>
                <Link href="/kejadian/verifikasi">
                  <ClipboardCheck /> Verifikasi ({pending})
                </Link>
              </Button>
            )}
            {canReport && (
              <Button asChild>
                <Link href="/kejadian/baru">
                  <Plus /> Catat Kejadian
                </Link>
              </Button>
            )}
          </>
        }
      />
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:flex-wrap">
        <SearchInput placeholder="Cari nama siswa / NISN…" />
        <DateRangeFilter />
        <FilterSelect param="kelas" placeholder="Semua kelas" className="w-full lg:w-40" options={classes.map((c) => ({ value: c.id, label: c.name }))} />
        <FilterSelect
          param="kategori"
          placeholder="Semua kategori"
          className="w-full lg:w-40"
          options={[
            { value: "RINGAN", label: "Ringan" },
            { value: "SEDANG", label: "Sedang" },
            { value: "BERAT", label: "Berat" },
          ]}
        />
        <FilterSelect
          param="status"
          placeholder="Semua status"
          className="w-full lg:w-48"
          options={[
            { value: "MENUNGGU_VERIFIKASI", label: "Menunggu verifikasi" },
            { value: "TERVERIFIKASI", label: "Terverifikasi" },
            { value: "DITOLAK", label: "Ditolak" },
          ]}
        />
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Tidak ada kejadian" description="Ubah filter atau catat kejadian baru." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Waktu</TH>
                  <TH>Siswa & Pelanggaran</TH>
                  <TH className="hidden md:table-cell text-right">Poin</TH>
                  <TH className="hidden lg:table-cell">Pelapor</TH>
                  <TH className="hidden sm:table-cell">Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => {
                  const names = r.students.map((s) => s.student.name);
                  const violation = [...new Set(r.students.map((s) => s.violationName))].join(", ");
                  const lvl = r.students[0]?.level ?? "RINGAN";
                  return (
                    <TR key={r.id} className="cursor-pointer">
                      <TD className="whitespace-nowrap align-top">
                        <Link href={`/kejadian/${r.id}`} className="block">
                          <p className="font-medium">{formatShortDate(r.occurredAt)}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(r.occurredAt)} WITA</p>
                        </Link>
                      </TD>
                      <TD className="align-top">
                        <Link href={`/kejadian/${r.id}`} className="block">
                          <p className="font-medium">
                            {names.slice(0, 3).join(", ")}
                            {names.length > 3 && <span className="text-muted-foreground"> +{names.length - 3} lainnya</span>}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                            <LevelBadge level={lvl} /> {violation} · {r.location}
                            {r._count.attachments > 0 && <span>· 📷 {r._count.attachments}</span>}
                          </p>
                          <div className="mt-1 sm:hidden">
                            <IncidentStatusBadge status={r.status} />
                          </div>
                        </Link>
                      </TD>
                      <TD className="hidden md:table-cell text-right align-top font-semibold">{r.students[0]?.points ?? 0}</TD>
                      <TD className="hidden lg:table-cell align-top text-sm">{r.reporterName ?? r.reporter.name}</TD>
                      <TD className="hidden sm:table-cell align-top">
                        <IncidentStatusBadge status={r.status} />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={page} total={total} pageSize={take} basePath="/kejadian" searchParams={params} />
          </>
        )}
      </Card>
    </>
  );
}
