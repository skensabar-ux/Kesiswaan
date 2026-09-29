import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { REPORTER_ROLES } from "@/lib/roles";
import { getActiveAcademicYear } from "@/lib/settings";
import { toDateInput, toTimeInput } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { IncidentForm } from "./form";

export const metadata = { title: "Catat Kejadian" };

export default async function Page() {
  const user = await requirePageRole(...REPORTER_ROLES);
  const [types, year] = await Promise.all([
    prisma.violationType.findMany({
      where: { isActive: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { points: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, points: true, category: { select: { level: true, name: true } } },
    }),
    getActiveAcademicYear(),
  ]);
  const now = new Date();
  const autoVerify = user.role === "PKS" || user.role === "ADMIN";
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Catat Kejadian"
        backHref="/kejadian"
        description={autoVerify ? "Kejadian yang Anda catat langsung terverifikasi." : "Laporan Anda akan diverifikasi oleh PKS sebelum poin dihitung."}
      />
      {!year ? (
        <Card>
          <CardContent className="pt-5 md:pt-5 text-sm text-destructive">Belum ada tahun ajaran aktif. Hubungi admin.</CardContent>
        </Card>
      ) : (
        <IncidentForm
          types={types.map((t) => ({ id: t.id, code: t.code, name: t.name, points: t.points, level: t.category.level, category: t.category.name }))}
          defaultDate={toDateInput(now)}
          defaultTime={toTimeInput(now)}
          autoVerify={autoVerify}
        />
      )}
    </div>
  );
}
