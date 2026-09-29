"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { handleResult } from "@/components/action-helpers";
import { addFollowUpNote } from "@/server/actions/follow-up";

export type NoteView = { id: string; note: string; author: string; createdAt: string; studentName?: string };

const fmt = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Daftar + form catatan tindak lanjut. `students` > 1 → pilih siswa (kejadian kelompok). */
export function FollowUpNotes({
  notes,
  students,
  incidentId,
  canAdd,
}: {
  notes: NoteView[];
  students: { id: string; name: string }[];
  incidentId?: string;
  canAdd: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      if (handleResult(await addFollowUpNote({ studentId, incidentId, note }))) {
        setNote("");
        router.refresh();
      }
    });
  return (
    <div className="flex flex-col gap-3">
      {notes.length === 0 && <p className="text-sm text-muted-foreground">Belum ada catatan tindak lanjut.</p>}
      {notes.map((n) => (
        <div key={n.id} className="rounded-md border-l-2 border-primary/40 bg-muted/40 px-3 py-2 text-sm">
          <p className="whitespace-pre-line">{n.note}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {n.author} · {fmt.format(new Date(n.createdAt))}
            {n.studentName && ` · ${n.studentName}`}
          </p>
        </div>
      ))}
      {canAdd && students.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-3">
          {students.length > 1 && (
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} aria-label="Siswa">
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis. sudah menghubungi orang tua via telepon…" />
          <Button size="sm" className="self-end" disabled={pending || note.trim().length < 3} onClick={submit}>
            {pending ? <Loader2 className="animate-spin" /> : <MessageSquarePlus />} Tambah catatan
          </Button>
        </div>
      )}
    </div>
  );
}
