"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/roles";
import { isActive, navFor } from "@/components/layout/nav-items";

export function NavList({ role, onNavigate }: { role: AppRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-4">
      {navFor(role).map((group, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {group.label && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
          )}
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                // Prefetch dimatikan: di build produksi, prefetch menu yang dibatalkan kadang membuat
                // klik menu berikutnya tidak berpindah halaman (Next.js 15.5).
                href={item.href}
                prefetch={false}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ role, schoolName }: { role: AppRole; schoolName: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">K</div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-bold">Kesiswaan</p>
          <p className="truncate text-xs text-muted-foreground">{schoolName}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavList role={role} />
      </div>
    </aside>
  );
}
