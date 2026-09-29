"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleResult } from "@/components/action-helpers";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "@/server/actions/notification";

const rtf = new Intl.RelativeTimeFormat("id", { numeric: "auto" });
function ago(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
  return "baru saja";
}

export function NotificationItem({ n }: { n: { id: string; title: string; body: string; link: string | null; isRead: boolean; createdAt: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const open = () =>
    start(async () => {
      if (!n.isRead) await markNotificationRead(n.id);
      if (n.link) router.push(n.link);
      else router.refresh();
    });
  return (
    <li>
      <button type="button" onClick={open} disabled={pending} className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-muted/40 md:px-5", !n.isRead && "bg-primary/5")}>
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-primary")} />
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm", !n.isRead && "font-semibold")}>{n.title}</span>
          <span className="block text-sm text-muted-foreground">{n.body}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{ago(n.createdAt)}</span>
        </span>
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </button>
    </li>
  );
}

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(async () => { if (handleResult(await markAllNotificationsRead())) router.refresh(); })}>
      {pending ? <Loader2 className="animate-spin" /> : <CheckCheck />} Tandai semua dibaca
    </Button>
  );
}
