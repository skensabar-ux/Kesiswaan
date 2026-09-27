import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-full sm:w-72" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="rounded-xl border bg-card p-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="my-2 h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
