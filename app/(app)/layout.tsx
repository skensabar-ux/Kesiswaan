import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { ROLE_LABEL } from "@/lib/roles";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Sumber kebenaran = database (lihat catatan di middleware.ts)
  const [account, h] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { isActive: true, mustChangePassword: true } }),
    headers(),
  ]);
  if (!account?.isActive) redirect("/login?error=nonaktif");
  if (account.mustChangePassword && h.get("x-pathname") !== "/ganti-password") redirect("/ganti-password");
  const settings = await getSettings();
  const { role, name } = session.user;

  return (
    <div className="flex min-h-dvh">
      <Sidebar role={role} schoolName={settings.schoolName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur md:h-16 md:px-6">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">K</div>
            <span className="truncate text-sm font-semibold">Kesiswaan</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu name={name ?? ""} roleLabel={ROLE_LABEL[role]} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-8 md:pt-6">{children}</main>
      </div>
      <BottomNav role={role} />
    </div>
  );
}
