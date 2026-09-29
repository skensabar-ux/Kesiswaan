"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type BarDatum = { label: string; value: number; fullLabel?: string; extra?: string };

/**
 * Diagram batang satu seri (satu warna, tanpa legenda — judul kartu menamai seri).
 * horizontal = kategori panjang (jenis pelanggaran, kelas) dibaca dari atas ke bawah.
 */
export function SimpleBarChart({
  data,
  unit,
  horizontal = false,
  height,
  ariaLabel,
}: {
  data: BarDatum[];
  unit: string;
  horizontal?: boolean;
  height?: number;
  ariaLabel: string;
}) {
  const h = height ?? (horizontal ? Math.max(160, data.length * 30 + 24) : 220);
  const tick = { fill: "var(--muted-foreground)", fontSize: 11 };
  return (
    <div style={{ height: h }} className="w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 4, right: 12, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid horizontal={!horizontal} vertical={horizontal} stroke="var(--border)" />
          {horizontal ? (
            <>
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={tick} />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={tick} width={150} interval={0} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} interval={0} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={tick} width={32} />
            </>
          )}
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const d = active ? (payload?.[0]?.payload as BarDatum | undefined) : undefined;
              if (!d) return null;
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-foreground">{d.fullLabel ?? d.label}</p>
                  <p className="text-muted-foreground">
                    {d.value} {unit}
                    {d.extra ? ` · ${d.extra}` : ""}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill="var(--primary)" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 18 : 28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
