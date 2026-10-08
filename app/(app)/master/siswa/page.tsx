import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { pageParams } from "@/lib/pagination";
import { toDateInput } from "@/lib/date";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { FilterSelect } from "@/components/filter-select";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StudentDialog, StudentRowActions } from "./client";

export const metadata = { title: "Siswa" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  await requirePageRole("ADMIN");
  const params = await searchParams;
  const q = sp(params.q);
  const kelas = sp(params.kelas);
  const status = sp(params.status);
  const { page, take, skip } = pageParams(sp(params.page));

  const where: Prisma.StudentWhereInput = {
    ...(q && { OR: [{ name: { contains: q } }, { nisn: { startsWith: q } }, { nis: { startsWith: q } }] }),
    ...(kelas === "none" ? { classId: null } : kelas ? { classId: kelas } : {}),
    ...(status === "aktif" ? { isActive: true } : status === "nonaktif" ? { isActive: false } : {}),
  };
  const [rows, total, classes] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
      take,
      skip,
      include: { class: { select: { name: true } }, _count: { select: { parents: true } } },
    }),
    prisma.student.count({ where }),
    prisma.class.findMany({
      where: { academicYear: { isActive: true } },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Siswa"
        description={`${total} siswa`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/master/import">
                <Upload /> Import Excel
              </Link>
            </Button>
            <StudentDialog
              classes={classes}
              trigger={
                <Button>
                  <Plus /> Tambah
                </Button>
              }
            />
          </>
        }
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Cari nama / NISN / NIS…" />
        <FilterSelect param="kelas" placeholder="Semua kelas" options={[{ value: "none", label: "Tanpa kelas" }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
        <FilterSelect param="status" placeholder="Semua status" className="w-full sm:w-36" options={[{ value: "aktif", label: "Aktif" }, { value: "nonaktif", label: "Nonaktif" }]} />
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState description="Tambahkan siswa satu per satu atau gunakan Import Excel." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Nama</TH>
                  <TH className="hidden sm:table-cell">NISN</TH>
                  <TH className="hidden md:table-cell">JK</TH>
                  <TH>Kelas</TH>
                  <TH className="hidden md:table-cell">Ortu</TH>
                  <TH className="w-12 sm:w-24" />
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <p className="font-medium">{r.name}</p>
                      <p className="font-mono text-xs text-muted-foreground sm:hidden">{r.nisn}</p>
                      {!r.isActive && <Badge variant="secondary">Nonaktif</Badge>}
                    </TD>
                    <TD className="hidden sm:table-cell font-mono text-xs">{r.nisn}</TD>
                    <TD className="hidden md:table-cell">{r.gender}</TD>
                    <TD>{r.class?.name ?? <span className="text-muted-foreground">-</span>}</TD>
                    <TD className="hidden md:table-cell">{r._count.parents}</TD>
                    <TD>
                      <StudentRowActions
                        classes={classes}
                        row={{
                          id: r.id,
                          nisn: r.nisn,
                          nis: r.nis ?? "",
                          name: r.name,
                          gender: r.gender,
                          birthDate: toDateInput(r.birthDate),
                          classId: r.classId ?? "",
                          address: r.address ?? "",
                          isActive: r.isActive,
                        }}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} total={total} pageSize={take} basePath="/master/siswa" searchParams={params} />
          </>
        )}
      </Card>
    </>
  );
}
