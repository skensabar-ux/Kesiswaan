"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type MonthPoint = { label: string; fullLabel: string; points: number; count: number };

/** Satu seri (poin per bulan): satu warna, tanpa legenda — judul kartu yang menamai seri. */
export function MonthlyPointsChart({ data }: { data: MonthPoint[] }) {
  const gid = `pts-${useId().replace(/:/g, "")}`;
  return (
    <div className="h-52 w-full" role="img" aria-label="Grafik poin pelanggaran per bulan">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
          <defs>
            <linearGradient id={gid} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" style={{ stopColor: "var(--primary)" }} />
              <stop offset="100%" style={{ stopColor: "var(--brand-2)" }} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval={0} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={32} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as MonthPoint | undefined) : undefined;
              if (!p) return null;
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-foreground">{p.fullLabel}</p>
                  <p className="text-muted-foreground">
                    {p.points} poin · {p.count} kejadian
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="points" fill={`url(#${gid})`} animationDuration={900} animationEasing="ease-out" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
