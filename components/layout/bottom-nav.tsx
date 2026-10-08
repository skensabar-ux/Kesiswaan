"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/roles";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NavList } from "@/components/layout/sidebar";
import { isActive, mobileItemsFor, navFor } from "@/components/layout/nav-items";

export function BottomNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = mobileItemsFor(role);
  const all = navFor(role).flatMap((g) => g.items);
  const showMenu = all.length > items.length;

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/90 shadow-[0_-4px_20px_-8px_oklch(0.3_0.05_265/0.15)] backdrop-blur-lg pb-safe md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "group flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary/12")}>
                  <item.icon className="size-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
          {showMenu && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold text-muted-foreground"
            >
              <span className="flex h-7 w-12 items-center justify-center rounded-full">
                <Menu className="size-5" />
              </span>
              Menu
            </button>
          )}
        </div>
      </nav>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Menu</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <NavList role={role} onNavigate={() => setOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
