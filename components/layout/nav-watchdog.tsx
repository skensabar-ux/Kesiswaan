"use client";

import { useEffect } from "react";

/**
 * Pengaman navigasi. Pada Next.js 15.5 klik tautan internal kadang tidak berpindah halaman:
 * data halaman tujuan sudah diterima, tetapi tampilan tetap di halaman lama (terutama
 * antar-halaman satu grup, mis. /bk/kasus → /bk/kalender). Bila itu terjadi, halaman tujuan
 * dimuat ulang secara biasa supaya menu selalu berfungsi.
 */
export function NavWatchdog() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let observer: PerformanceObserver | undefined;
    const stop = () => {
      clearInterval(timer);
      observer?.disconnect();
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      const from = location.pathname + location.search;
      const to = url.pathname + url.search;
      if (to === from) return;

      stop();
      const startedAt = performance.now();
      let loadedAt = 0;
      // buffer resource timing terbatas (±250 entri), jadi pakai observer
      observer = new PerformanceObserver((list) => {
        for (const r of list.getEntries())
          if (!loadedAt && r.name.includes("_rsc=") && new URL(r.name).pathname === url.pathname) loadedAt = performance.now();
      });
      observer.observe({ type: "resource" });
      timer = setInterval(() => {
        if (location.pathname + location.search !== from) return stop(); // berhasil
        const now = performance.now();
        // macet: data sudah diterima tetapi tidak dirender, atau tidak ada kemajuan sama sekali
        if ((loadedAt && now - loadedAt > 1500) || now - startedAt > 8000) {
          stop();
          location.assign(url.href);
        }
      }, 250);
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      stop();
    };
  }, []);

  return null;
}
