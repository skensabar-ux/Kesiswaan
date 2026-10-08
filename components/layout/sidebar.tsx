"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/roles";
import { isActive, navFor } from "@/components/layout/nav-items";

export function NavList({ role, onNavigate, variant = "light" }: { role: AppRole; onNavigate?: () => void; variant?: "light" | "dark" }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5">
      {navFor(role).map((group, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {group.label && (
            <p className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-muted/70">{group.label}</p>
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
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  variant === "dark"
                    ? active
                      ? "bg-gradient-to-r from-primary to-brand-2 text-white shadow-md shadow-black/20"
                      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    : active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon className={cn("size-[18px] shrink-0", variant === "dark" && !active && "opacity-80 group-hover:opacity-100")} />
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
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-brand-2 text-base font-extrabold text-white shadow-lg shadow-black/25 ring-1 ring-white/20">
          K
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-extrabold tracking-tight">Kesiswaan</p>
          <p className="truncate text-xs text-sidebar-muted">{schoolName}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
        <NavList role={role} variant="dark" />
      </div>
      <div className="border-t border-sidebar-border px-5 py-3 text-[11px] text-sidebar-muted/70">Sistem Informasi Kesiswaan</div>
    </aside>
  );
}
