import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { homePathFor } from "@/lib/roles";
import { sp } from "@/lib/utils";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (session?.user) redirect(homePathFor(session.user.role));
  const [settings, params] = await Promise.all([getSettings(), searchParams]);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {settings.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/files/${settings.logoPath}`} alt="Logo sekolah" className="size-16 object-contain" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">K</div>
          )}
          <div>
            <h1 className="text-xl font-bold">Sistem Informasi Kesiswaan</h1>
            <p className="text-sm text-muted-foreground">{settings.schoolName}</p>
          </div>
        </div>
        <LoginForm callbackUrl={sp(params.callbackUrl)} />
      </div>
    </main>
  );
}
