import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Kelas" };

export default async function Page() {
  const user = await requirePageRole("ADMIN", "PKS", "WALI_KELAS", "BK", "KEPSEK");
  const classes = await prisma.class.findMany({
    where: { academicYear: { isActive: true }, ...(user.role === "WALI_KELAS" ? { waliKelas: { userId: user.id } } : {}) },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    include: { waliKelas: { select: { name: true } }, _count: { select: { students: { where: { isActive: true } } } } },
  });
  if (user.role === "WALI_KELAS" && classes.length === 1) redirect(`/kelas/${classes[0]!.id}`);
  return (
    <>
      <PageHeader title={user.role === "WALI_KELAS" ? "Kelas Saya" : "Rekap Kelas"} description="Tahun ajaran aktif." />
      {classes.length === 0 ? (
        <Card>
          <EmptyState
            title="Tidak ada kelas"
            description={user.role === "WALI_KELAS" ? "Akun Anda belum ditautkan sebagai wali kelas. Hubungi admin." : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {classes.map((c) => (
            <Link key={c.id} href={`/kelas/${c.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="pt-4 md:pt-5">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c._count.students} siswa</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{c.waliKelas?.name ?? "Wali kelas belum ditentukan"}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
