"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmAction } from "@/components/confirm-action";
import { DeleteButton, EditButton } from "@/components/row-actions";
import { StudentPicker } from "@/components/student-picker";
import { handleResult } from "@/components/action-helpers";
import { parentSchema } from "@/lib/validators/master";
import type { StudentOption } from "@/server/actions/student-search";
import { deleteParent, resetParentPin, saveParent, sendParentPinWa } from "@/server/actions/master/parent";

const formSchema = parentSchema.omit({ studentIds: true }).extend({
  students: z.array(z.object({ id: z.string(), name: z.string(), nisn: z.string(), className: z.string().nullable() })).min(1, "Pilih minimal satu siswa"),
});
type V = z.infer<typeof formSchema>;
type Row = V & { id: string };

export function ParentDialog({
  initial,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  initial?: Row;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const router = useRouter();
  const f = useForm<V>({
    resolver: zodResolver(formSchema),
    defaultValues: initial ?? { name: "", relation: "AYAH", waNumber: "", occupation: "", address: "", students: [] },
  });
  const e = f.formState.errors;
  const submit = f.handleSubmit(async ({ students, ...v }) => {
    const res = await saveParent(initial?.id ?? null, { ...v, studentIds: students.map((s) => s.id) });
    if (handleResult(res, f.setError)) {
      setOpen(false);
      if (!initial) f.reset();
      router.refresh();
    }
  });
  return (
    <FormDialog open={open} onOpenChange={setOpen} trigger={trigger} title={initial ? "Ubah Orang Tua" : "Tambah Orang Tua"} onSubmit={submit} submitting={f.formState.isSubmitting}>
      <FormField label="Anak (siswa)" required error={e.students?.message}>
        <Controller
          control={f.control}
          name="students"
          render={({ field }) => <StudentPicker value={field.value as StudentOption[]} onChange={field.onChange} />}
        />
      </FormField>
      <FormField label="Nama" required error={e.name?.message}>
        <Input {...f.register("name")} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Hubungan" required error={e.relation?.message}>
          <Select {...f.register("relation")}>
            <option value="AYAH">Ayah</option>
            <option value="IBU">Ibu</option>
            <option value="WALI">Wali</option>
          </Select>
        </FormField>
        <FormField label="No. WA" error={e.waNumber?.message}>
          <Input inputMode="tel" placeholder="08xxxxxxxxxx" {...f.register("waNumber")} />
        </FormField>
      </div>
      <FormField label="Pekerjaan" error={e.occupation?.message}>
        <Input {...f.register("occupation")} />
      </FormField>
      <FormField label="Alamat" error={e.address?.message}>
        <Textarea rows={2} {...f.register("address")} />
      </FormField>
    </FormDialog>
  );
}

export function ParentRowActions({ row, hasAccount }: { row: Row; hasAccount: boolean }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  return (
    <div className="flex justify-end">
      {row.waNumber && (
        <ConfirmAction
          title="Kirim PIN via WhatsApp?"
          description={`PIN baru dibuat dan dikirim ke WA ${row.name} beserta petunjuk login. PIN lama tidak berlaku lagi.`}
          confirmLabel="Kirim"
          variant="default"
          action={() => sendParentPinWa(row.id)}
          trigger={
            <Button variant="ghost" size="icon" aria-label="Kirim PIN via WA">
              <MessageCircle />
            </Button>
          }
        />
      )}
      <ConfirmAction
        title={hasAccount ? "Reset PIN portal?" : "Buat akun portal ortu?"}
        description={`PIN 6 digit baru untuk ${row.name} akan dibuat dan hanya ditampilkan sekali. Login memakai NISN anak + PIN.`}
        confirmLabel={hasAccount ? "Reset PIN" : "Buat akun"}
        variant="default"
        action={() => resetParentPin(row.id)}
        onDone={(res) => {
          if (res.ok && res.data) setPin((res.data as { pin: string }).pin);
        }}
        trigger={
          <Button variant="ghost" size="icon" aria-label="PIN portal">
            <KeyRound />
          </Button>
        }
      />
      <EditButton onClick={() => setOpen(true)} />
      <ParentDialog initial={row} open={open} onOpenChange={setOpen} />
      <DeleteButton name={row.name} action={() => deleteParent(row.id)} />
      <Dialog open={pin !== null} onOpenChange={(v) => !v && setPin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PIN Portal Orang Tua</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">Sampaikan kepada {row.name}. Login: NISN anak + PIN berikut.</p>
            <p className="rounded-lg bg-muted px-6 py-3 font-mono text-3xl font-bold tracking-[0.3em]">{pin}</p>
            <p className="text-xs text-muted-foreground">NISN: {row.students.map((s) => `${s.nisn} (${s.name})`).join(", ")}</p>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setPin(null)}>Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
