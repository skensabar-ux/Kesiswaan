import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { FilterSelect } from "@/components/filter-select";
import { LevelBadge } from "@/components/level-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ViolationTypeDialog, ViolationTypeRowActions } from "./client";

export const metadata = { title: "Jenis Pelanggaran" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  await requirePageRole("ADMIN");
  const params = await searchParams;
  const q = sp(params.q);
  const cat = sp(params.kategori);
  const where: Prisma.ViolationTypeWhereInput = {
    ...(q && { OR: [{ name: { contains: q } }, { code: { contains: q } }] }),
    ...(cat && { categoryId: cat }),
  };
  const [rows, categories] = await Promise.all([
    prisma.violationType.findMany({
      where,
      orderBy: [{ category: { sortOrder: "asc" } }, { points: "asc" }, { name: "asc" }],
      include: { category: true, _count: { select: { incidentStudents: true } } },
    }),
    prisma.violationCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const catOpts = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <PageHeader
        title="Jenis Pelanggaran"
        description="Poin tersimpan sebagai snapshot di setiap kejadian — perubahan poin di sini tidak mengubah riwayat."
        actions={
          <ViolationTypeDialog
            categories={catOpts}
            trigger={
              <Button>
                <Plus /> Tambah
              </Button>
            }
          />
        }
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Cari kode / nama…" />
        <FilterSelect param="kategori" placeholder="Semua kategori" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="hidden sm:table-cell">Kode</TH>
                <TH>Pelanggaran</TH>
                <TH>Kategori</TH>
                <TH className="text-right">Poin</TH>
                <TH className="hidden md:table-cell text-right">Dipakai</TH>
                <TH className="w-12 sm:w-24" />
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id} className={r.isActive ? undefined : "opacity-60"}>
                  <TD className="hidden sm:table-cell font-mono text-xs">{r.code}</TD>
                  <TD>
                    <p className="font-medium">{r.name}</p>
                    {!r.isActive && <Badge variant="secondary">Nonaktif</Badge>}
                  </TD>
                  <TD>
                    <LevelBadge level={r.category.level} />
                  </TD>
                  <TD className="text-right font-semibold">{r.points}</TD>
                  <TD className="hidden md:table-cell text-right text-muted-foreground">{r._count.incidentStudents}×</TD>
                  <TD>
                    <ViolationTypeRowActions
                      categories={catOpts}
                      row={{
                        id: r.id,
                        code: r.code,
                        name: r.name,
                        categoryId: r.categoryId,
                        points: r.points,
                        description: r.description ?? "",
                        isActive: r.isActive,
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
