"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { BarDatum } from "./simple-bar-chart";
import type { MonthPoint } from "./monthly-points-chart";

/**
 * Grafik dimuat malas: pustaka grafik (recharts) baru diunduh saat grafik mendekati layar.
 * Tempatnya disiapkan dengan tinggi yang sama sehingga halaman tidak "melompat".
 */
const SimpleBarChart = dynamic(() => import("./simple-bar-chart").then((m) => m.SimpleBarChart), { ssr: false });
const MonthlyPointsChart = dynamic(() => import("./monthly-points-chart").then((m) => m.MonthlyPointsChart), { ssr: false });

function WhenVisible({ height, children }: { height: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setVisible(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ minHeight: height }}>
      {visible ? children : <Skeleton className="w-full rounded-xl" style={{ height }} />}
    </div>
  );
}

type SimpleProps = { data: BarDatum[]; unit: string; horizontal?: boolean; height?: number; ariaLabel: string };

export function LazySimpleBarChart(props: SimpleProps) {
  const h = props.height ?? (props.horizontal ? Math.max(160, props.data.length * 30 + 24) : 220);
  return (
    <WhenVisible height={h}>
      <SimpleBarChart {...props} height={h} />
    </WhenVisible>
  );
}

export function LazyMonthlyPointsChart({ data }: { data: MonthPoint[] }) {
  return (
    <WhenVisible height={208}>
      <MonthlyPointsChart data={data} />
    </WhenVisible>
  );
}
