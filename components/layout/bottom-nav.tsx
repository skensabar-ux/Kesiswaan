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
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur pb-safe md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
          {showMenu && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
            >
              <Menu className="size-5" />
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
