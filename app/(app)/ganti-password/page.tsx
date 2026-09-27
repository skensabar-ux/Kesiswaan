import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChangePasswordForm } from "./form";

export const metadata = { title: "Ganti Password" };

export default async function Page() {
  const session = await auth();
  const isParent = session?.user.role === "ORANG_TUA";
  const forced = session?.user.mustChangePassword;
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title={isParent ? "Ganti PIN" : "Ganti Password"}
        description={forced ? "Demi keamanan, silakan ganti password bawaan sebelum melanjutkan." : undefined}
      />
      <Card>
        <CardContent className="pt-5 md:pt-5">
          <ChangePasswordForm isParent={isParent} />
        </CardContent>
      </Card>
    </div>
  );
}
