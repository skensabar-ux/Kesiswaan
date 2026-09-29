import Link from "next/link";
import { Bell } from "lucide-react";

export function NotificationBell({ unread }: { unread: number }) {
  return (
    <Link
      href="/notifikasi"
      aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
      className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-accent"
    >
      <Bell className="size-4" />
      {unread > 0 && (
        <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
