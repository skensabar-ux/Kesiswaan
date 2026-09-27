import { requirePageRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Portal Orang Tua" };

export default async function OrtuPage() {
  const user = await requirePageRole("ORANG_TUA");
  const children = await prisma.student.findMany({
    where: { parents: { some: { parent: { userId: user.id } } } },
    include: { class: true },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <PageHeader title={`Selamat datang, ${user.name}`} description="Portal orang tua/wali murid" />
      <div className="grid gap-3 sm:grid-cols-2">
        {children.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle>{s.name}</CardTitle>
              <CardDescription>
                NISN {s.nisn} · {s.class?.name ?? "Tanpa kelas"}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Riwayat poin &amp; pelanggaran akan tampil di sini (Tahap 3).
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
