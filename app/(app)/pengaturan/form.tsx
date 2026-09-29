"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ImageUp, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxField, FormField } from "@/components/form-field";
import { handleResult } from "@/components/action-helpers";
import { WA_PLACEHOLDERS } from "@/lib/constants";
import { settingsSchema } from "@/lib/validators/master";
import { saveSettings, uploadLogo } from "@/server/actions/settings";

type V = z.infer<typeof settingsSchema>;

function previewNumber(format: string) {
  const now = new Date();
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][now.getMonth()];
  return format
    .replaceAll("{urut}", "007")
    .replaceAll("{bulan_romawi}", roman!)
    .replaceAll("{bulan}", String(now.getMonth() + 1).padStart(2, "0"))
    .replaceAll("{tahun}", String(now.getFullYear()));
}

export function SettingsForm({ initial, logoPath }: { initial: V; logoPath: string | null }) {
  const router = useRouter();
  const f = useForm<V>({ resolver: zodResolver(settingsSchema), defaultValues: initial });
  const e = f.formState.errors;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();

  const submit = f.handleSubmit(async (v) => {
    if (handleResult(await saveSettings(v), f.setError)) router.refresh();
  });

  const onLogo = (file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.set("logo", file);
    startUpload(async () => {
      if (handleResult(await uploadLogo(fd))) router.refresh();
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  const format = f.watch("letterNumberFormat");

  return (
    <form method="post" onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Identitas Sekolah & Kop Surat</CardTitle>
          <CardDescription>Dipakai pada kop surat PDF dan halaman verifikasi.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {logoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${logoPath}`} alt="Logo" className="size-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">Logo</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(ev) => onLogo(ev.target.files?.[0])} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" /> : <ImageUp />} Unggah logo
              </Button>
              <p className="text-xs text-muted-foreground">PNG/JPG/WEBP, maks 1 MB.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Baris kop 1" error={e.governmentLine1?.message}>
              <Input {...f.register("governmentLine1")} />
            </FormField>
            <FormField label="Baris kop 2" error={e.governmentLine2?.message}>
              <Input {...f.register("governmentLine2")} />
            </FormField>
            <FormField label="Nama sekolah" required error={e.schoolName?.message}>
              <Input {...f.register("schoolName")} />
            </FormField>
            <FormField label="NPSN" error={e.npsn?.message}>
              <Input {...f.register("npsn")} />
            </FormField>
            <FormField label="Alamat" required error={e.address?.message} className="md:col-span-2">
              <Input {...f.register("address")} />
            </FormField>
            <FormField label="Telepon" error={e.phone?.message}>
              <Input {...f.register("phone")} />
            </FormField>
            <FormField label="Email" error={e.email?.message}>
              <Input type="email" {...f.register("email")} />
            </FormField>
            <FormField label="Website" error={e.website?.message}>
              <Input {...f.register("website")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kepala Sekolah & Penomoran Surat</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label="Nama Kepala Sekolah" error={e.principalName?.message}>
            <Input {...f.register("principalName")} />
          </FormField>
          <FormField label="NIP Kepala Sekolah" error={e.principalNip?.message}>
            <Input {...f.register("principalNip")} />
          </FormField>
          <FormField
            label="Format nomor surat"
            required
            error={e.letterNumberFormat?.message}
            className="md:col-span-2"
            hint={
              <>
                Placeholder: {"{urut}"} {"{bulan_romawi}"} {"{bulan}"} {"{tahun}"}. Contoh: <span className="font-mono">{previewNumber(format ?? "")}</span>. Nomor urut
                direset setiap tahun per jenis surat.
              </>
            }
          >
            <Input className="font-mono" {...f.register("letterNumberFormat")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifikasi WhatsApp</CardTitle>
          <CardDescription>
            Konfigurasi gateway (driver, URL & token) diatur lewat environment variable.{" "}
            <a href="/pengaturan/wa" className="font-medium text-primary underline-offset-4 hover:underline">
              Buka log WhatsApp & tes kirim →
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CheckboxField label="Aktifkan pengiriman WA" description="Bila nonaktif, pesan tetap masuk antrean tetapi tidak dikirim." {...f.register("waEnabled")} />
          <FormField
            label="Template pesan pelanggaran"
            required
            error={e.waViolationTemplate?.message}
            hint={<>Placeholder: {WA_PLACEHOLDERS.join(" ")}</>}
          >
            <Textarea rows={8} className="font-mono text-xs" {...f.register("waViolationTemplate")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kebijakan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          <CheckboxField
            label="Prestasi mengurangi poin pelanggaran"
            description="Bila nonaktif, prestasi dicatat terpisah tanpa mengurangi poin."
            {...f.register("achievementReducesPoints")}
          />
          <CheckboxField
            label="Kepala Sekolah boleh membaca catatan konseling"
            description="Default: hanya Guru BK yang dapat membaca detail sesi."
            {...f.register("kepsekCanReadCounseling")}
          />
          <CheckboxField
            label="Login orang tua dengan OTP WhatsApp"
            description="Orang tua dapat meminta kode sekali pakai via WA sebagai pengganti PIN. Memerlukan WA gateway aktif."
            {...f.register("parentOtpEnabled")}
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <Button type="submit" size="lg" disabled={f.formState.isSubmitting} className="shadow-lg">
          {f.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} Simpan pengaturan
        </Button>
      </div>
    </form>
  );
}
