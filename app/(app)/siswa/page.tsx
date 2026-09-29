import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRole, studentScope } from "@/lib/rbac";
import { pageParams } from "@/lib/pagination";
import { getActiveAcademicYear } from "@/lib/settings";
import { loadThresholds, pointsForStudents } from "@/lib/points-db";
import { statusColor } from "@/lib/points";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { FilterSelect } from "@/components/filter-select";
import { Pagination } from "@/components/pagination";
import { PointsBadge } from "@/components/status-badges";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata = { title: "Siswa" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requirePageRole("ADMIN", "PKS", "WALI_KELAS", "BK", "KEPSEK");
  const params = await searchParams;
  const q = sp(params.q);
  const kelas = sp(params.kelas);
  const { page, take, skip } = pageParams(sp(params.page));
  const scope = await studentScope(user);
  const where: Prisma.StudentWhereInput = {
    AND: [scope, { isActive: true }, q ? { OR: [{ name: { contains: q } }, { nisn: { startsWith: q } }] } : {}, kelas ? { classId: kelas } : {}],
  };
  const [rows, total, classes, year, thresholds] = await Promise.all([
    prisma.student.findMany({ where, orderBy: [{ class: { name: "asc" } }, { name: "asc" }], take, skip, include: { class: { select: { name: true } } } }),
    prisma.student.count({ where }),
    prisma.class.findMany({
      where: { academicYear: { isActive: true }, ...(user.role === "WALI_KELAS" ? { waliKelas: { userId: user.id } } : {}) },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    getActiveAcademicYear(),
    loadThresholds(),
  ]);
  const points = year ? await pointsForStudents(rows.map((r) => r.id), year.id) : new Map<string, number>();

  return (
    <>
      <PageHeader title="Siswa" description={user.role === "WALI_KELAS" ? "Siswa di kelas yang Anda ampu." : `${total} siswa aktif · poin TA ${year?.name ?? "-"}`} />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Cari nama / NISN…" />
        <FilterSelect param="kelas" placeholder="Semua kelas" options={classes.map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Siswa tidak ditemukan" />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Nama</TH>
                  <TH className="hidden sm:table-cell">NISN</TH>
                  <TH>Kelas</TH>
                  <TH className="text-right">Poin</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => {
                  const p = points.get(r.id) ?? 0;
                  return (
                    <TR key={r.id}>
                      <TD>
                        <Link href={`/siswa/${r.id}`} className="font-medium hover:underline">
                          {r.name}
                        </Link>
                      </TD>
                      <TD className="hidden sm:table-cell font-mono text-xs">{r.nisn}</TD>
                      <TD>{r.class?.name ?? "-"}</TD>
                      <TD className="text-right">
                        <PointsBadge points={p} color={statusColor(thresholds, p)} />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={page} total={total} pageSize={take} basePath="/siswa" searchParams={params} />
          </>
        )}
      </Card>
    </>
  );
}
