"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchStudents, type StudentOption } from "@/server/actions/student-search";

/** Pemilih siswa (satu/banyak) dengan pencarian nama/NISN/kelas. */
export function StudentPicker({
  value,
  onChange,
  multiple = true,
  placeholder = "Ketik nama, NISN, atau kelas…",
  purpose,
}: {
  value: StudentOption[];
  onChange: (v: StudentOption[]) => void;
  multiple?: boolean;
  placeholder?: string;
  purpose?: "report";
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StudentOption[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => start(async () => setResults(await searchStudents(q, { purpose }))), 300);
    return () => clearTimeout(t);
  }, [q, purpose]);

  const selectedIds = new Set(value.map((v) => v.id));
  const pick = (s: StudentOption) => {
    onChange(multiple ? [...value, s] : [s]);
    setQ("");
    setResults([]);
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1 text-sm text-primary">
              {s.name}
              {s.className && <span className="text-xs opacity-70">· {s.className}</span>}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-primary/20"
                onClick={() => onChange(value.filter((v) => v.id !== s.id))}
                aria-label={`Hapus ${s.name}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      {(multiple || value.length === 0) && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-9" />
          {pending && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={selectedIds.has(s.id)}
                    onClick={() => pick(s)}
                    className="flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-sm hover:bg-accent disabled:opacity-40"
                  >
                    <span>
                      <span className="font-medium">{s.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{s.nisn}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{s.className ?? "-"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!pending && q.trim().length >= 2 && results.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">Tidak ada siswa yang cocok.</p>
          )}
        </div>
      )}
    </div>
  );
}
