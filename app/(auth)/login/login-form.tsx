"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { cn } from "@/lib/utils";
import { loginParent, loginStaff } from "@/server/actions/auth";
import { requestParentOtp } from "@/server/actions/otp";

export function LoginForm({ callbackUrl, otpEnabled }: { callbackUrl: string; otpEnabled: boolean }) {
  const nisnRef = useRef<HTMLInputElement>(null);
  const [otpPending, startOtp] = useTransition();
  const askOtp = () =>
    startOtp(async () => {
      const res = await requestParentOtp(nisnRef.current?.value ?? "");
      if (res.ok) toast.success(res.message ?? "Kode dikirim.");
      else toast.error(res.error);
    });
  const [tab, setTab] = useState<"staff" | "parent">("staff");
  const [staffState, staffAction, staffPending] = useActionState(loginStaff, null);
  const [parentState, parentAction, parentPending] = useActionState(loginParent, null);

  return (
    <Card className="shadow-lift">
      <div className="m-4 mb-0 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 md:m-5 md:mb-0">
        {(["staff", "parent"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg py-2 text-sm font-semibold transition-all",
              tab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "staff" ? "Guru / Staf" : "Orang Tua"}
          </button>
        ))}
      </div>
      <CardContent className="pt-5 md:pt-5">
        {tab === "staff" ? (
          <form action={staffAction} className="flex flex-col gap-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <FormField label="Username / NIP" htmlFor="username">
              <Input id="username" name="username" autoComplete="username" required autoFocus />
            </FormField>
            <FormField label="Password" htmlFor="password">
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </FormField>
            {staffState && !staffState.ok && <p className="text-sm text-destructive">{staffState.error}</p>}
            <Button type="submit" disabled={staffPending} size="lg">
              {staffPending && <Loader2 className="animate-spin" />} Masuk
            </Button>
          </form>
        ) : (
          <form action={parentAction} className="flex flex-col gap-4">
            <FormField label="NISN Anak" htmlFor="nisn">
              <Input id="nisn" name="nisn" ref={nisnRef} inputMode="numeric" required autoFocus />
            </FormField>
            <FormField
              label={otpEnabled ? "PIN atau kode OTP" : "PIN"}
              htmlFor="pin"
              hint={otpEnabled ? "PIN 6 digit dari sekolah, atau kode OTP yang dikirim ke WhatsApp." : "PIN 6 digit diberikan oleh sekolah."}
            >
              <Input id="pin" name="pin" type="password" inputMode="numeric" maxLength={6} autoComplete="current-password" required />
            </FormField>
            {otpEnabled && (
              <Button type="button" variant="outline" onClick={askOtp} disabled={otpPending}>
                {otpPending ? <Loader2 className="animate-spin" /> : <MessageCircle />} Kirim kode OTP ke WhatsApp
              </Button>
            )}
            {parentState && !parentState.ok && <p className="text-sm text-destructive">{parentState.error}</p>}
            <Button type="submit" disabled={parentPending} size="lg">
              {parentPending && <Loader2 className="animate-spin" />} Masuk
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
