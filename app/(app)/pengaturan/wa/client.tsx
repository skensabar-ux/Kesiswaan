"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, RefreshCw, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { handleResult } from "@/components/action-helpers";
import { processQueueNow, resendWa, testSendWa } from "@/server/actions/wa";

export function ProcessNowButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(async () => { if (handleResult(await processQueueNow())) router.refresh(); })}>
      {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Proses antrean sekarang
    </Button>
  );
}

export function ResendButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { if (handleResult(await resendWa(id))) router.refresh(); })}>
      {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Kirim ulang
    </Button>
  );
}

export function TestSendForm() {
  const router = useRouter();
  const f = useForm<{ to: string; message: string }>({
    defaultValues: { to: "", message: "Tes notifikasi dari Sistem Kesiswaan SMK Negeri 1 Banjar." },
  });
  const submit = f.handleSubmit(async (v) => {
    if (handleResult(await testSendWa(v), f.setError)) router.refresh();
  });
  return (
    <form method="post" onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <FormField label="Nomor tujuan" error={f.formState.errors.to?.message}>
        <Input inputMode="tel" placeholder="08xxxxxxxxxx" {...f.register("to")} />
      </FormField>
      <FormField label="Pesan" error={f.formState.errors.message?.message}>
        <Textarea rows={2} {...f.register("message")} />
      </FormField>
      <Button type="submit" disabled={f.formState.isSubmitting} className="self-start">
        {f.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Send />} Tes kirim
      </Button>
    </form>
  );
}
