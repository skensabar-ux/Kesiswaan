"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { cn } from "@/lib/utils";
import { loginParent, loginStaff } from "@/server/actions/auth";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [tab, setTab] = useState<"staff" | "parent">("staff");
  const [staffState, staffAction, staffPending] = useActionState(loginStaff, null);
  const [parentState, parentAction, parentPending] = useActionState(loginParent, null);

  return (
    <Card>
      <div className="grid grid-cols-2 gap-1 border-b p-1">
        {(["staff", "parent"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md py-2 text-sm font-medium transition-colors",
              tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
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
              <Input id="nisn" name="nisn" inputMode="numeric" required autoFocus />
            </FormField>
            <FormField label="PIN" htmlFor="pin" hint="PIN 6 digit diberikan oleh sekolah.">
              <Input id="pin" name="pin" type="password" inputMode="numeric" maxLength={6} autoComplete="current-password" required />
            </FormField>
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
