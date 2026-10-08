import { Inbox } from "lucide-react";

export function EmptyState({ title = "Belum ada data", description, action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <div className="rounded-2xl bg-primary/10 p-4 text-primary ring-8 ring-primary/5">
        <Inbox className="size-6" />
      </div>
      <p className="mt-2 font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
