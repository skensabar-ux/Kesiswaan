import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const INCIDENT_STATUS = {
  MENUNGGU_VERIFIKASI: { label: "Menunggu verifikasi", variant: "warning" },
  TERVERIFIKASI: { label: "Terverifikasi", variant: "success" },
  DITOLAK: { label: "Ditolak", variant: "destructive" },
} as const;

export function IncidentStatusBadge({ status }: { status: keyof typeof INCIDENT_STATUS }) {
  const s = INCIDENT_STATUS[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

const CASE_STATUS = {
  BARU: "Baru",
  DIJADWALKAN: "Dijadwalkan",
  PROSES_PENDAMPINGAN: "Proses pendampingan",
  MENUNGGU_EVALUASI: "Menunggu evaluasi",
  SELESAI: "Selesai",
  DIRUJUK: "Dirujuk",
} as const;

export function CaseStatusBadge({ status }: { status: keyof typeof CASE_STATUS }) {
  const variant = status === "SELESAI" ? "success" : status === "DIRUJUK" ? "secondary" : status === "BARU" ? "warning" : "default";
  return <Badge variant={variant}>{CASE_STATUS[status]}</Badge>;
}

const COLOR = {
  green: "bg-success/15 text-success ring-success/30",
  amber: "bg-warning/20 text-amber-700 ring-warning/40 dark:text-warning",
  red: "bg-destructive/15 text-destructive ring-destructive/30",
} as const;

/** Lencana total poin dengan warna sesuai ambang (hijau/kuning/merah). */
export function PointsBadge({ points, color, className }: { points: number; color: keyof typeof COLOR; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-10 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ring-1", COLOR[color], className)}>
      {points}
    </span>
  );
}
