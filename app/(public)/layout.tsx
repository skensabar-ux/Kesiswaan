import { getSettings } from "@/lib/settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <main className="min-h-dvh bg-gradient-to-b from-primary/10 to-background px-4 py-8">
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <div className="flex items-center gap-3">
          {s.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/files/${s.logoPath}`} alt="" className="size-12 object-contain" />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">K</div>
          )}
          <div>
            <p className="font-bold leading-tight">{s.schoolName}</p>
            <p className="text-xs text-muted-foreground">{s.address}</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
