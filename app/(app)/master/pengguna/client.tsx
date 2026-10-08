"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckboxField, FormField } from "@/components/form-field";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmAction } from "@/components/confirm-action";
import { EditButton } from "@/components/row-actions";
import { handleResult } from "@/components/action-helpers";
import { ROLE_LABEL } from "@/lib/roles";
import { STAFF_ROLE_VALUES, userSchema } from "@/lib/validators/master";
import { resetUserPassword, saveUser } from "@/server/actions/master/user";
import { RowActionGroup } from "@/components/row-action-group";

type V = z.infer<typeof userSchema>;
type Row = V & { id: string };
type TeacherOpt = { id: string; name: string; nip: string | null; userId: string | null };

function CredentialDialog({ value, username, onClose }: { value: string | null; username: string; onClose: () => void }) {
  return (
    <Dialog open={value !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Password Sementara</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            Username <b className="font-mono">{username}</b>. Password ini hanya ditampilkan sekali; pengguna wajib menggantinya saat login pertama.
          </p>
          <p className="select-all rounded-lg bg-muted px-6 py-3 font-mono text-2xl font-bold tracking-wider">{value}</p>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose}>Selesai</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UserDialog({
  initial,
  teachers,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  initial?: Row;
  teachers: TeacherOpt[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [cred, setCred] = useState<{ username: string; password: string } | null>(null);
  const router = useRouter();
  const f = useForm<V>({
    resolver: zodResolver(userSchema),
    defaultValues: initial ?? { name: "", username: "", role: "GURU", phone: "", teacherId: "", password: "", isActive: true },
  });
  const e = f.formState.errors;
  const availableTeachers = teachers.filter((t) => !t.userId || t.userId === initial?.id);

  const submit = f.handleSubmit(async (v) => {
    const res = await saveUser(initial?.id ?? null, v);
    if (handleResult(res, f.setError)) {
      setOpen(false);
      if (res.ok && res.data?.password) setCred({ username: v.username, password: res.data.password });
      if (!initial) f.reset();
      router.refresh();
    }
  });

  const onTeacherChange = (id: string) => {
    const t = teachers.find((x) => x.id === id);
    if (t && !initial) {
      if (!f.getValues("name")) f.setValue("name", t.name);
      if (!f.getValues("username") && t.nip) f.setValue("username", t.nip);
    }
  };

  return (
    <>
      <FormDialog open={open} onOpenChange={setOpen} trigger={trigger} title={initial ? "Ubah Pengguna" : "Tambah Pengguna"} onSubmit={submit} submitting={f.formState.isSubmitting}>
        <FormField label="Tautkan ke data guru" error={e.teacherId?.message} hint="Wajib untuk Wali Kelas agar kelasnya terdeteksi.">
          <Select {...f.register("teacherId", { onChange: (ev) => onTeacherChange(ev.target.value) })}>
            <option value="">— Tidak ditautkan —</option>
            {availableTeachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.nip ? ` (${t.nip})` : ""}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Nama" required error={e.name?.message}>
          <Input {...f.register("name")} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Username / NIP" required error={e.username?.message}>
            <Input autoCapitalize="none" {...f.register("username")} />
          </FormField>
          <FormField label="Role" required error={e.role?.message}>
            <Select {...f.register("role")}>
              {STAFF_ROLE_VALUES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="No. HP/WA" error={e.phone?.message} hint="Untuk notifikasi WA (wali kelas, BK, dll).">
          <Input inputMode="tel" {...f.register("phone")} />
        </FormField>
        {!initial && (
          <FormField label="Password awal" error={e.password?.message} hint="Kosongkan untuk dibuatkan otomatis. Wajib diganti saat login pertama.">
            <Input type="text" autoComplete="off" {...f.register("password")} />
          </FormField>
        )}
        <CheckboxField label="Akun aktif" {...f.register("isActive")} />
      </FormDialog>
      <CredentialDialog value={cred?.password ?? null} username={cred?.username ?? ""} onClose={() => setCred(null)} />
    </>
  );
}

export function UserRowActions({ row, teachers, isSelf }: { row: Row; teachers: TeacherOpt[]; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState<string | null>(null);
  return (
    <RowActionGroup>
      {!isSelf && (
        <ConfirmAction
          title="Reset password?"
          description={`Password sementara baru akan dibuat untuk ${row.name}.`}
          confirmLabel="Reset"
          variant="default"
          action={() => resetUserPassword(row.id)}
          onDone={(res) => res.ok && res.data && setPwd((res.data as { password: string }).password)}
          trigger={
            <Button variant="ghost" size="icon" aria-label="Reset password">
              <KeyRound />
            </Button>
          }
        />
      )}
      <EditButton onClick={() => setOpen(true)} />
      <UserDialog initial={row} teachers={teachers} open={open} onOpenChange={setOpen} />
      <CredentialDialog value={pwd} username={row.username} onClose={() => setPwd(null)} />
    </RowActionGroup>
  );
}
