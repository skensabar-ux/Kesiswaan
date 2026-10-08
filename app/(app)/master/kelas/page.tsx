import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { FilterSelect } from "@/components/filter-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ClassDialog, ClassRowActions } from "./client";

export const metadata = { title: "Kelas" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  await requirePageRole("ADMIN");
  const params = await searchParams;
  const [years, teachers] = await Promise.all([
    prisma.academicYear.findMany({ orderBy: { name: "desc" } }),
    prisma.teacher.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const activeYear = years.find((y) => y.isActive);
  const yearId = sp(params.tahun) || activeYear?.id || "";
  const q = sp(params.q);
  const where: Prisma.ClassWhereInput = {
    ...(yearId && { academicYearId: yearId }),
    ...(q && { OR: [{ name: { contains: q } }, { major: { contains: q } }] }),
  };
  const rows = await prisma.class.findMany({
    where,
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    include: { waliKelas: { select: { name: true } }, academicYear: { select: { name: true } }, _count: { select: { students: true } } },
  });
  const options = {
    years: years.map((y) => ({ id: y.id, name: y.name })),
    teachers,
    defaultYearId: activeYear?.id ?? "",
  };

  return (
    <>
      <PageHeader
        title="Kelas"
        description="Data rombongan belajar & wali kelas per tahun ajaran."
        actions={
          <ClassDialog
            options={options}
            trigger={
              <Button disabled={years.length === 0}>
                <Plus /> Tambah
              </Button>
            }
          />
        }
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Cari nama kelas / jurusan…" />
        <FilterSelect
          param="tahun"
          placeholder="Semua tahun ajaran"
          options={years.map((y) => ({ value: y.id, label: y.name + (y.isActive ? " (aktif)" : "") }))}
        />
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState description={years.length === 0 ? "Buat tahun ajaran terlebih dahulu." : undefined} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Kelas</TH>
                <TH className="hidden sm:table-cell">Jurusan</TH>
                <TH className="hidden sm:table-cell">Tingkat</TH>
                <TH>Wali Kelas</TH>
                <TH>Siswa</TH>
                <TH className="hidden md:table-cell">TA</TH>
                <TH className="w-12 sm:w-24" />
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.name}</TD>
                  <TD className="hidden sm:table-cell">{r.major}</TD>
                  <TD className="hidden sm:table-cell">{r.grade}</TD>
                  <TD>{r.waliKelas?.name ?? <span className="text-muted-foreground">-</span>}</TD>
                  <TD>{r._count.students}</TD>
                  <TD className="hidden md:table-cell text-muted-foreground">{r.academicYear.name}</TD>
                  <TD>
                    <ClassRowActions
                      options={options}
                      row={{
                        id: r.id,
                        name: r.name,
                        major: r.major,
                        grade: r.grade,
                        waliKelasId: r.waliKelasId ?? "",
                        academicYearId: r.academicYearId,
                      }}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
