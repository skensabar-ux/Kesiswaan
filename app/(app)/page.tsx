import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePageRole } from "@/lib/rbac";
import { getActiveAcademicYear } from "@/lib/settings";
import { REPORTER_ROLES, ROLE_LABEL, STAFF_ROLES } from "@/lib/roles";
import { formatLongDate } from "@/lib/date";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { Button } from "@/components/ui/button";
import { BkDashboard, GuruDashboard, KepsekDashboard, PksDashboard, WalasDashboard } from "@/components/dashboard/dashboards";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePageRole(...STAFF_ROLES);
  const year = await getActiveAcademicYear();
  const Dashboard =
    user.role === "WALI_KELAS"
      ? WalasDashboard
      : user.role === "BK"
        ? BkDashboard
        : user.role === "KEPSEK"
          ? KepsekDashboard
          : user.role === "GURU"
            ? GuruDashboard
            : PksDashboard;
  return (
    <>
      <WelcomeBanner
        name={user.name.split(",")[0]!.trim()}
        roleLabel={ROLE_LABEL[user.role]}
        dateLabel={formatLongDate(new Date())}
        yearLabel={year ? `TA ${year.name}` : "Belum ada tahun ajaran aktif"}
        action={
          REPORTER_ROLES.includes(user.role) && (
            <Button asChild size="lg" className="bg-white bg-none text-primary shadow-lg shadow-black/10 hover:bg-white/90">
              <Link href="/kejadian/baru">
                <Plus /> Catat Kejadian
              </Link>
            </Button>
          )
        }
      />
      <Dashboard user={user} />
    </>
  );
}
