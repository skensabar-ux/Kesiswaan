"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, SearchCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { handleResult } from "@/components/action-helpers";
import type { ImportReport } from "@/lib/import/students";
import { importStudents } from "@/server/actions/master/import";

export function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"preview" | "commit" | null>(null);

  const run = (m: "preview" | "commit") => {
    if (!file) return toast.error("Pilih file terlebih dahulu.");
    const fd = new FormData();
    fd.set("file", file);
    fd.set("mode", m);
    setMode(m);
    start(async () => {
      const res = await importStudents(fd);
      if (handleResult(res) && res.ok && res.data) setReport(res.data);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Unduh template</CardTitle>
          <CardDescription>Satu baris = satu siswa beserta data ayah, ibu, dan/atau wali.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/api/master/import-template">
              <Download /> Template Excel
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Unggah & periksa</CardTitle>
          <CardDescription>File .xlsx maksimal 5 MB. Pemeriksaan tidak mengubah data.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center hover:bg-muted/40">
            <FileSpreadsheet className="size-8 text-muted-foreground" />
            <span className="text-sm font-medium">{file ? file.name : "Pilih file Excel"}</span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setReport(null);
              }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => run("preview")} disabled={!file || pending}>
              {pending && mode === "preview" ? <Loader2 className="animate-spin" /> : <SearchCheck />} Periksa
            </Button>
            <Button onClick={() => run("commit")} disabled={!file || pending || !report || report.committed || report.valid === 0}>
              {pending && mode === "commit" ? <Loader2 className="animate-spin" /> : <Upload />}
              Import {report && !report.committed ? `${report.valid} baris valid` : ""}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {report.errors.length === 0 ? <CheckCircle2 className="size-5 text-success" /> : <AlertTriangle className="size-5 text-warning" />}
              {report.committed ? "Hasil import" : "Hasil pemeriksaan"}
            </CardTitle>
            <CardDescription>
              {report.totalRows} baris dibaca · {report.valid} valid · {report.errors.length} bermasalah
              {report.committed && ` · ${report.created} siswa baru · ${report.updated} diperbarui · ${report.parentsCreated} ortu baru`}
            </CardDescription>
          </CardHeader>
          {report.errors.length > 0 && (
            <CardContent className="p-0 md:p-0">
              <Table>
                <THead>
                  <TR>
                    <TH className="w-16">Baris</TH>
                    <TH>Siswa</TH>
                    <TH>Masalah</TH>
                  </TR>
                </THead>
                <TBody>
                  {report.errors.map((e) => (
                    <TR key={e.row}>
                      <TD className="font-mono">{e.row}</TD>
                      <TD>
                        <p>{e.name || "-"}</p>
                        <p className="font-mono text-xs text-muted-foreground">{e.nisn}</p>
                      </TD>
                      <TD>
                        <ul className="list-disc pl-4 text-sm text-destructive">
                          {e.messages.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
