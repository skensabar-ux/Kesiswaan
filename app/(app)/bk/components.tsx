"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarPlus,
  CheckCircle2,
  ClipboardPen,
  FilePlus2,
  ImagePlus,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmAction } from "@/components/confirm-action";
import { StudentPicker } from "@/components/student-picker";
import { handleResult } from "@/components/action-helpers";
import { compressImage } from "@/components/image-compress";
import { letterSchema, manualCaseSchema, rescheduleSchema, sessionRecordSchema, sessionScheduleSchema, SESSION_TYPE_LABEL } from "@/lib/validators/bk";
import type { StudentOption } from "@/server/actions/student-search";
import {
  approveCase,
  approveLetter,
  assignCaseToMe,
  cancelSession,
  closeCase,
  createLetter,
  createManualCase,
  deleteLetter,
  recordAttendance,
  recordSession,
  referCase,
  rescheduleLetter,
  scheduleSession,
  sendLetter,
  setCaseStatus,
} from "@/server/actions/bk";

function useRefresh() {
  const router = useRouter();
  return () => router.refresh();
}

// ───────────── Kasus manual ─────────────
const manualForm = manualCaseSchema.omit({ studentId: true }).extend({
  students: z.array(z.object({ id: z.string(), name: z.string(), nisn: z.string(), className: z.string().nullable() })).length(1, "Pilih satu siswa"),
});

export function NewCaseDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const f = useForm<z.infer<typeof manualForm>>({ resolver: zodResolver(manualForm), defaultValues: { students: [], title: "", priority: "SEDANG" } });
  const submit = f.handleSubmit(async ({ students, ...v }) => {
    const res = await createManualCase({ ...v, studentId: students[0]!.id });
    if (handleResult(res, f.setError) && res.ok && res.data) {
      setOpen(false);
      f.reset();
      router.push(`/bk/kasus/${res.data.id}`);
    }
  });
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <FilePlus2 /> Kasus baru
        </Button>
      }
      title="Buka Kasus BK"
      description="Untuk eskalasi atau temuan di luar ambang poin otomatis."
      onSubmit={submit}
      submitting={f.formState.isSubmitting}
    >
      <FormField label="Siswa" required error={f.formState.errors.students?.message}>
        <Controller control={f.control} name="students" render={({ field }) => <StudentPicker multiple={false} value={field.value as StudentOption[]} onChange={field.onChange} />} />
      </FormField>
      <FormField label="Uraian masalah" required error={f.formState.errors.title?.message}>
        <Input {...f.register("title")} placeholder="Mis. sering membolos & menarik diri dari teman" />
      </FormField>
      <FormField label="Prioritas" required>
        <Select {...f.register("priority")}>
          <option value="RENDAH">Rendah</option>
          <option value="SEDANG">Sedang</option>
          <option value="TINGGI">Tinggi</option>
        </Select>
      </FormField>
    </FormDialog>
  );
}

// ───────────── Aksi kasus ─────────────
export function CaseActions({
  caseId,
  status,
  canManage,
  isBk,
  isKepsek,
  assignedToMe,
  needsApproval,
}: {
  caseId: string;
  status: string;
  canManage: boolean;
  isBk: boolean;
  isKepsek: boolean;
  assignedToMe: boolean;
  needsApproval: boolean;
}) {
  const refresh = useRefresh();
  const [pending, start] = useTransition();
  const open = !["SELESAI", "DIRUJUK"].includes(status);
  if (!open) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isKepsek && needsApproval && (
        <ConfirmAction
          title="Setujui tindakan kasus ini?"
          description="Persetujuan Kepala Sekolah dicatat di audit log."
          confirmLabel="Setujui"
          variant="default"
          action={() => approveCase(caseId)}
          trigger={
            <Button>
              <ShieldCheck /> Setujui
            </Button>
          }
        />
      )}
      {isBk && !assignedToMe && (
        <Button variant="outline" disabled={pending} onClick={() => start(async () => { if (handleResult(await assignCaseToMe(caseId))) refresh(); })}>
          <UserCheck /> Tangani kasus ini
        </Button>
      )}
      {canManage && (
        <>
          <Select
            aria-label="Ubah status"
            className="h-10 w-52"
            value={status}
            disabled={pending}
            onChange={(e) => start(async () => { if (handleResult(await setCaseStatus(caseId, e.target.value as "BARU"))) refresh(); })}
          >
            <option value="BARU">Baru</option>
            <option value="DIJADWALKAN">Dijadwalkan</option>
            <option value="PROSES_PENDAMPINGAN">Proses pendampingan</option>
            <option value="MENUNGGU_EVALUASI">Menunggu evaluasi</option>
          </Select>
          <ConfirmAction
            title="Tutup kasus"
            description="Tuliskan ringkasan evaluasi (min. 20 karakter): perkembangan siswa, kesepakatan, dan rekomendasi."
            confirmLabel="Tutup kasus"
            variant="default"
            requireReason
            action={(summary) => closeCase(caseId, summary)}
            trigger={
              <Button variant="outline">
                <CheckCircle2 /> Tutup kasus
              </Button>
            }
          />
          <ConfirmAction
            title="Rujuk ke pihak luar"
            description="Tuliskan pihak rujukan (mis. Puskesmas Banjar, psikolog, BNN Kab. Buleleng)."
            confirmLabel="Rujuk"
            requireReason
            action={(to) => referCase(caseId, to)}
            trigger={<Button variant="ghost">Rujuk</Button>}
          />
        </>
      )}
    </div>
  );
}

// ───────────── Surat ─────────────
type TemplateOpt = { id: string; name: string; type: string };

export function LetterDialog({
  caseId,
  templates,
  defaultTemplateId,
  parents,
  defaultDate,
}: {
  caseId: string;
  templates: TemplateOpt[];
  defaultTemplateId: string;
  parents: string[];
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const f = useForm<z.infer<typeof letterSchema>>({
    resolver: zodResolver(letterSchema),
    defaultValues: { caseId, templateId: defaultTemplateId, meetingDate: defaultDate, meetingTime: "09:00", place: "Ruang BK", subject: "Pembinaan kedisiplinan peserta didik", parentName: parents[0] ?? "" },
  });
  const e = f.formState.errors;
  const submit = f.handleSubmit(async (v) => {
    const res = await createLetter(v);
    if (handleResult(res, f.setError) && res.ok && res.data) {
      setOpen(false);
      router.push(`/bk/surat/${res.data.id}`);
    }
  });
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm">
          <FilePlus2 /> Buat surat
        </Button>
      }
      title="Buat Surat Panggilan"
      description="Nomor surat dibuat otomatis saat disimpan."
      onSubmit={submit}
      submitting={f.formState.isSubmitting}
    >
      <FormField label="Template" required error={e.templateId?.message}>
        <Select {...f.register("templateId")}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Ditujukan kepada" required error={e.parentName?.message}>
        <Input list="ortu-list" {...f.register("parentName")} />
        <datalist id="ortu-list">
          {parents.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Tanggal pertemuan" required error={e.meetingDate?.message}>
          <Input type="date" min={defaultDate} {...f.register("meetingDate")} />
        </FormField>
        <FormField label="Jam (WITA)" required error={e.meetingTime?.message}>
          <Input type="time" {...f.register("meetingTime")} />
        </FormField>
      </div>
      <FormField label="Tempat" required error={e.place?.message}>
        <Input {...f.register("place")} />
      </FormField>
      <FormField label="Perihal" required error={e.subject?.message}>
        <Input {...f.register("subject")} />
      </FormField>
    </FormDialog>
  );
}

export function LetterActions({
  id,
  status,
  canManage,
  isKepsek,
  needsApproval,
  approved,
  meetingDate,
  meetingTime,
  place,
}: {
  id: string;
  status: string;
  canManage: boolean;
  isKepsek: boolean;
  needsApproval: boolean;
  approved: boolean;
  meetingDate: string;
  meetingTime: string;
  place: string;
}) {
  const refresh = useRefresh();
  const [pending, start] = useTransition();
  const [resOpen, setResOpen] = useState(false);
  const rf = useForm<z.infer<typeof rescheduleSchema>>({ resolver: zodResolver(rescheduleSchema), defaultValues: { meetingDate, meetingTime, place } });
  const run = (fn: () => Promise<Parameters<typeof handleResult>[0]>) => start(async () => { if (handleResult(await fn())) refresh(); });
  const sent = status !== "DRAFT";
  return (
    <div className="flex flex-wrap gap-2">
      {isKepsek && needsApproval && !approved && (
        <ConfirmAction
          title="Setujui surat?"
          confirmLabel="Setujui"
          variant="default"
          action={() => approveLetter(id)}
          trigger={
            <Button>
              <ShieldCheck /> Setujui surat
            </Button>
          }
        />
      )}
      {canManage && status === "DRAFT" && (
        <ConfirmAction
          title="Kirim surat ke orang tua?"
          description="Status menjadi Terkirim dan tautan surat + konfirmasi kehadiran masuk antrean WhatsApp orang tua."
          confirmLabel="Kirim"
          variant="default"
          action={() => sendLetter(id)}
          trigger={
            <Button disabled={needsApproval && !approved} title={needsApproval && !approved ? "Menunggu persetujuan Kepala Sekolah" : undefined}>
              <Send /> Kirim ke orang tua
            </Button>
          }
        />
      )}
      {canManage && sent && !["HADIR", "TIDAK_HADIR"].includes(status) && (
        <>
          <Button variant="outline" disabled={pending} onClick={() => run(() => recordAttendance(id, "HADIR"))}>
            <UserCheck /> Hadir
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => run(() => recordAttendance(id, "TIDAK_HADIR"))}>
            <UserX /> Tidak hadir
          </Button>
          <FormDialog
            open={resOpen}
            onOpenChange={setResOpen}
            trigger={
              <Button variant="outline">
                <CalendarPlus /> Jadwal ulang
              </Button>
            }
            title="Jadwal Ulang Pertemuan"
            description="Jadwal baru dikirim ulang ke WA orang tua."
            submitting={rf.formState.isSubmitting}
            onSubmit={rf.handleSubmit(async (v) => {
              if (handleResult(await rescheduleLetter(id, v), rf.setError)) {
                setResOpen(false);
                refresh();
              }
            })}
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tanggal" error={rf.formState.errors.meetingDate?.message}>
                <Input type="date" {...rf.register("meetingDate")} />
              </FormField>
              <FormField label="Jam" error={rf.formState.errors.meetingTime?.message}>
                <Input type="time" {...rf.register("meetingTime")} />
              </FormField>
            </div>
            <FormField label="Tempat" error={rf.formState.errors.place?.message}>
              <Input {...rf.register("place")} />
            </FormField>
          </FormDialog>
        </>
      )}
      {canManage && (
        <ConfirmAction
          title="Batalkan surat?"
          description="Surat ditandai DIBATALKAN (soft delete). Nomor surat tidak dipakai ulang. Alasan wajib diisi."
          confirmLabel="Batalkan surat"
          requireReason
          action={(r) => deleteLetter(id, r)}
          trigger={
            <Button variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 /> Batalkan
            </Button>
          }
        />
      )}
    </div>
  );
}

// ───────────── Sesi pendampingan ─────────────
export function ScheduleSessionDialog({ caseId, defaultDate }: { caseId: string; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const refresh = useRefresh();
  const f = useForm<z.infer<typeof sessionScheduleSchema>>({
    resolver: zodResolver(sessionScheduleSchema),
    defaultValues: { caseId, date: defaultDate, time: "10:00", type: "KONSELING_INDIVIDU", place: "Ruang BK" },
  });
  const submit = f.handleSubmit(async (v) => {
    if (handleResult(await scheduleSession(v), f.setError)) {
      setOpen(false);
      refresh();
    }
  });
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm" variant="outline">
          <CalendarPlus /> Jadwalkan sesi
        </Button>
      }
      title="Jadwalkan Sesi Pendampingan"
      onSubmit={submit}
      submitting={f.formState.isSubmitting}
    >
      <FormField label="Jenis" required>
        <Select {...f.register("type")}>
          {Object.entries(SESSION_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Tanggal" required error={f.formState.errors.date?.message}>
          <Input type="date" {...f.register("date")} />
        </FormField>
        <FormField label="Jam" required error={f.formState.errors.time?.message}>
          <Input type="time" {...f.register("time")} />
        </FormField>
      </div>
      <FormField label="Tempat">
        <Input {...f.register("place")} />
      </FormField>
    </FormDialog>
  );
}

export function RecordSessionDialog({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = useRefresh();
  const f = useForm<z.infer<typeof sessionRecordSchema>>({ resolver: zodResolver(sessionRecordSchema), defaultValues: { attendees: "", problem: "", result: "", followUpPlan: "" } });
  const e = f.formState.errors;
  const submit = f.handleSubmit(async (v) => {
    const fd = new FormData();
    fd.set("data", JSON.stringify(v));
    files.forEach((x) => fd.append("photos", x));
    if (handleResult(await recordSession(sessionId, fd), f.setError)) {
      setOpen(false);
      setFiles([]);
      refresh();
    }
  });
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      wide
      trigger={
        <Button size="sm">
          <ClipboardPen /> Catat hasil
        </Button>
      }
      title="Catatan Sesi (Rahasia)"
      description="Hanya Guru BK (dan Kepala Sekolah bila diizinkan) yang dapat membaca isi catatan ini."
      onSubmit={submit}
      submitting={f.formState.isSubmitting}
    >
      <FormField label="Pihak yang hadir" required error={e.attendees?.message}>
        <Input placeholder="Siswa, ayah, wali kelas, Guru BK" {...f.register("attendees")} />
      </FormField>
      <FormField label="Permasalahan" required error={e.problem?.message}>
        <Textarea rows={3} {...f.register("problem")} />
      </FormField>
      <FormField label="Hasil / kesepakatan" required error={e.result?.message}>
        <Textarea rows={3} {...f.register("result")} />
      </FormField>
      <FormField label="Rencana tindak lanjut" error={e.followUpPlan?.message}>
        <Textarea rows={2} {...f.register("followUpPlan")} />
      </FormField>
      <FormField label="Lampiran (mis. foto surat pernyataan)" hint="Maks 3 gambar.">
        <div className="flex flex-wrap items-center gap-2">
          {files.map((x, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
              {x.name}
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Hapus">
                <X className="size-3" />
              </button>
            </span>
          ))}
          {files.length < 3 && (
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <ImagePlus /> Tambah
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (ev) => {
              const file = ev.target.files?.[0];
              ev.target.value = "";
              if (file) setFiles([...files, await compressImage(file)].slice(0, 3));
            }}
          />
        </div>
      </FormField>
    </FormDialog>
  );
}

export function CancelSessionButton({ sessionId }: { sessionId: string }) {
  return (
    <ConfirmAction
      title="Batalkan sesi?"
      requireReason
      confirmLabel="Batalkan sesi"
      action={(r) => cancelSession(sessionId, r)}
      trigger={
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
          Batalkan
        </Button>
      }
    />
  );
}
