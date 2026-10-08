import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { formatDate, toDateInput } from "@/lib/date";
import { SEMESTER_LABEL } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AcademicYearDialog, AcademicYearRowActions } from "./client";

export const metadata = { title: "Tahun Ajaran" };

export default async function Page() {
  await requirePageRole("ADMIN");
  const rows = await prisma.academicYear.findMany({
    orderBy: { name: "desc" },
    include: { _count: { select: { classes: true } } },
  });
  return (
    <>
      <PageHeader
        title="Tahun Ajaran"
        description="Poin pelanggaran diakumulasi per tahun ajaran. Hanya satu tahun ajaran yang aktif."
        actions={
          <AcademicYearDialog
            trigger={
              <Button>
                <Plus /> Tambah
              </Button>
            }
          />
        }
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Tahun Ajaran</TH>
                <TH>Semester</TH>
                <TH className="hidden md:table-cell">Periode</TH>
                <TH>Kelas</TH>
                <TH>Status</TH>
                <TH className="w-12 sm:w-24" />
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.name}</TD>
                  <TD>{SEMESTER_LABEL[r.semester]}</TD>
                  <TD className="hidden md:table-cell text-muted-foreground">
                    {r.startDate ? `${formatDate(r.startDate)} – ${formatDate(r.endDate)}` : "-"}
                  </TD>
                  <TD>{r._count.classes}</TD>
                  <TD>{r.isActive ? <Badge variant="success">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}</TD>
                  <TD>
                    <AcademicYearRowActions
                      row={{
                        id: r.id,
                        name: r.name,
                        semester: r.semester,
                        startDate: toDateInput(r.startDate),
                        endDate: toDateInput(r.endDate),
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
