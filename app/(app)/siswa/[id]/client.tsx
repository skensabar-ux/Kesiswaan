"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmAction } from "@/components/confirm-action";
import { handleResult } from "@/components/action-helpers";
import { ACHIEVEMENT_LEVEL_LABEL, achievementSchema, type AchievementInput } from "@/lib/validators/incident";
import { createAchievement, deleteAchievement } from "@/server/actions/achievement";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(new Date());
}

export function AchievementDialog({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const f = useForm<AchievementInput>({
    resolver: zodResolver(achievementSchema),
    defaultValues: { studentId, date: today(), title: "", level: "SEKOLAH", points: 0, description: "" },
  });
  const e = f.formState.errors;
  const submit = f.handleSubmit(async (v) => {
    if (handleResult(await createAchievement(v), f.setError)) {
      setOpen(false);
      f.reset();
      router.refresh();
    }
  });
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm" variant="outline">
          <Plus /> Tambah
        </Button>
      }
      title="Catat Prestasi"
      onSubmit={submit}
      submitting={f.formState.isSubmitting}
    >
      <FormField label="Prestasi" required error={e.title?.message}>
        <Input placeholder="Juara 1 LKS Jaringan Komputer" {...f.register("title")} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Tanggal" required error={e.date?.message}>
          <Input type="date" {...f.register("date")} />
        </FormField>
        <FormField label="Tingkat" required error={e.level?.message}>
          <Select {...f.register("level")}>
            {Object.entries(ACHIEVEMENT_LEVEL_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Poin positif" error={e.points?.message} hint="Mengurangi poin pelanggaran hanya bila kebijakan diaktifkan admin.">
        <Input type="number" min={0} inputMode="numeric" {...f.register("points", { valueAsNumber: true })} />
      </FormField>
      <FormField label="Keterangan" error={e.description?.message}>
        <Textarea rows={2} {...f.register("description")} />
      </FormField>
    </FormDialog>
  );
}

export function DeleteAchievementButton({ id }: { id: string }) {
  return (
    <ConfirmAction
      title="Hapus prestasi?"
      requireReason
      confirmLabel="Hapus"
      action={(reason) => deleteAchievement(id, reason)}
      trigger={
        <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" aria-label="Hapus prestasi">
          <Trash2 />
        </Button>
      }
    />
  );
}
