"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Camera, ImagePlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { LevelBadge } from "@/components/level-badge";
import { StudentPicker } from "@/components/student-picker";
import { handleResult } from "@/components/action-helpers";
import { compressImage } from "@/components/image-compress";
import { incidentSchema, MAX_PHOTOS } from "@/lib/validators/incident";
import type { StudentOption } from "@/server/actions/student-search";
import { createIncident } from "@/server/actions/incident";

type TypeOpt = { id: string; code: string; name: string; points: number; level: "RINGAN" | "SEDANG" | "BERAT"; category: string };

const formSchema = incidentSchema.omit({ studentIds: true }).extend({
  students: z.array(z.object({ id: z.string(), name: z.string(), nisn: z.string(), className: z.string().nullable() })).min(1, "Pilih minimal satu siswa"),
});
type V = z.infer<typeof formSchema>;

const LOCATIONS = ["Ruang kelas", "Kantin", "Toilet", "Lapangan", "Gerbang sekolah", "Parkiran", "Laboratorium", "Bengkel", "Luar sekolah"];
const ACTIONS = ["Teguran lisan", "Teguran tertulis", "Penyitaan barang", "Dibawa ke ruang PKS", "Orang tua dihubungi"];

type Photo = { file: File; url: string };

export function IncidentForm({ types, defaultDate, defaultTime, autoVerify }: { types: TypeOpt[]; defaultDate: string; defaultTime: string; autoVerify: boolean }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const f = useForm<V>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      students: [],
      violationTypeId: "",
      date: defaultDate,
      time: defaultTime,
      location: "",
      chronology: "",
      initialAction: "",
      reporterName: "",
      witnesses: "",
    },
  });
  const e = f.formState.errors;
  const typeId = f.watch("violationTypeId");
  const selected = useMemo(() => types.find((t) => t.id === typeId), [types, typeId]);
  const nStudents = f.watch("students").length;
  const grouped = useMemo(() => {
    const m = new Map<string, TypeOpt[]>();
    for (const t of types) m.set(t.category, [...(m.get(t.category) ?? []), t]);
    return [...m.entries()];
  }, [types]);

  const addPhotos = async (list: FileList | null) => {
    if (!list?.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return toast.error(`Maksimal ${MAX_PHOTOS} foto.`);
    setProcessing(true);
    const files = await Promise.all([...list].slice(0, room).map((file) => compressImage(file)));
    setPhotos((p) => [...p, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    setProcessing(false);
    if (list.length > room) toast.warning(`Hanya ${room} foto pertama yang ditambahkan (maks ${MAX_PHOTOS}).`);
  };

  const removePhoto = (i: number) =>
    setPhotos((p) => {
      URL.revokeObjectURL(p[i]!.url);
      return p.filter((_, j) => j !== i);
    });

  const appendAction = (a: string) => {
    const cur = f.getValues("initialAction") ?? "";
    if (cur.includes(a)) return;
    f.setValue("initialAction", cur ? `${cur}; ${a}` : a, { shouldDirty: true });
  };

  const submit = f.handleSubmit(async ({ students, ...v }) => {
    const fd = new FormData();
    fd.set("data", JSON.stringify({ ...v, studentIds: students.map((s) => s.id) }));
    for (const p of photos) fd.append("photos", p.file);
    const res = await createIncident(fd);
    if (handleResult(res, f.setError) && res.ok && res.data) {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      router.push(`/kejadian/${res.data.id}`);
    }
  });

  return (
    <form method="post" onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Siswa & Pelanggaran</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField label="Siswa" required error={e.students?.message} hint="Bisa lebih dari satu siswa untuk kejadian kelompok.">
            <Controller
              control={f.control}
              name="students"
              render={({ field }) => <StudentPicker value={field.value as StudentOption[]} onChange={field.onChange} purpose="report" />}
            />
          </FormField>
          <FormField label="Jenis pelanggaran" required error={e.violationTypeId?.message}>
            <Select {...f.register("violationTypeId")}>
              <option value="">— Pilih jenis pelanggaran —</option>
              {grouped.map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.points} poin)
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </FormField>
          {selected && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm">
              <LevelBadge level={selected.level} />
              <span className="font-semibold">{selected.points} poin</span>
              {nStudents > 1 && <span className="text-muted-foreground">untuk masing-masing dari {nStudents} siswa</span>}
              {selected.level === "BERAT" && (
                <span className="flex w-full items-center gap-1.5 text-destructive">
                  <AlertTriangle className="size-4" /> Pelanggaran berat langsung membuat kasus BK{autoVerify ? "" : " setelah diverifikasi"}.
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detail Kejadian</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tanggal" required error={e.date?.message}>
              <Input type="date" max={defaultDate} {...f.register("date")} />
            </FormField>
            <FormField label="Jam (WITA)" required error={e.time?.message}>
              <Input type="time" {...f.register("time")} />
            </FormField>
          </div>
          <FormField label="Lokasi" required error={e.location?.message}>
            <Input list="lokasi-list" placeholder="Mis. Kantin" {...f.register("location")} />
            <datalist id="lokasi-list">
              {LOCATIONS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </FormField>
          <FormField label="Kronologi" required error={e.chronology?.message}>
            <Textarea rows={4} placeholder="Ceritakan apa yang terjadi…" {...f.register("chronology")} />
          </FormField>
          <FormField label="Tindakan awal" error={e.initialAction?.message}>
            <div className="mb-1 flex flex-wrap gap-1.5">
              {ACTIONS.map((a) => (
                <button key={a} type="button" onClick={() => appendAction(a)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent">
                  + {a}
                </button>
              ))}
            </div>
            <Textarea rows={2} {...f.register("initialAction")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Pelapor (bila bukan Anda)" error={e.reporterName?.message}>
              <Input placeholder="Nama guru/pelapor" {...f.register("reporterName")} />
            </FormField>
            <FormField label="Saksi" error={e.witnesses?.message}>
              <Input placeholder="Opsional" {...f.register("witnesses")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bukti Foto</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={p.url} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                  aria-label="Hapus foto"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <div className="col-span-3 flex gap-2 sm:col-span-1 sm:flex-col">
                <Button type="button" variant="outline" className="flex-1" onClick={() => cameraRef.current?.click()} disabled={processing}>
                  {processing ? <Loader2 className="animate-spin" /> : <Camera />} Kamera
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => fileRef.current?.click()} disabled={processing}>
                  <ImagePlus /> Galeri
                </Button>
              </div>
            )}
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(ev) => { addPhotos(ev.target.files); ev.target.value = ""; }} />
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(ev) => { addPhotos(ev.target.files); ev.target.value = ""; }} />
          <p className="text-xs text-muted-foreground">Maksimal {MAX_PHOTOS} foto. Foto dikompres otomatis sebelum diunggah.</p>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 md:bottom-4">
        <Button type="submit" size="lg" className="w-full shadow-lg" disabled={f.formState.isSubmitting || processing}>
          {f.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
          {autoVerify ? "Simpan kejadian" : "Kirim laporan"}
        </Button>
      </div>
    </form>
  );
}
