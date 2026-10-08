"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Tombol aksi per baris tabel. Di layar lebar tampil berjajar; di HP dilipat ke menu "⋮"
 * agar kolom nama tidak terhimpit. Label menu diambil dari aria-label tiap tombol.
 * Isi menu tidak di-unmount saat ditutup, jadi dialog konfirmasi yang dibuka dari menu tetap hidup.
 */
export function RowActionGroup({ children }: { children: React.ReactNode }) {
  const [pos, setPos] = useState<React.CSSProperties | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "pointerdown" && ref.current?.contains(e.target as Node)) return;
      setPos(null);
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (open) return setPos(null);
    const r = e.currentTarget.getBoundingClientRect();
    // posisi tetap (fixed) agar tidak terpotong wadah tabel yang bisa digulir; buka ke atas bila dekat bawah layar
    const up = r.bottom + 220 > window.innerHeight;
    setPos({ right: window.innerWidth - r.right, ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
  };

  return (
    <div ref={ref} className="flex justify-end">
      <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Aksi" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        <MoreVertical />
      </Button>
      <div
        role={open ? "menu" : undefined}
        style={pos ?? undefined}
        onClick={() => setPos(null)}
        className={cn(
          "sm:static sm:flex sm:flex-row",
          open
            ? "fixed z-50 flex min-w-48 flex-col gap-0.5 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl animate-in fade-in zoom-in-95"
            : "hidden",
          // di menu HP: tombol ikon jadi baris berlabel
          "max-sm:[&_button]:h-10 max-sm:[&_button]:w-full max-sm:[&_button]:justify-start max-sm:[&_button]:gap-3 max-sm:[&_button]:px-3 max-sm:[&_button]:font-medium max-sm:[&_button]:after:content-[attr(aria-label)]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
