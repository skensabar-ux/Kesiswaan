import { requirePageRole } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./form";

export const metadata = { title: "Pengaturan" };

export default async function Page() {
  await requirePageRole("ADMIN");
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Pengaturan" description="Identitas sekolah, kop surat, penomoran surat, notifikasi WA & kebijakan." />
      <SettingsForm
        logoPath={s.logoPath}
        initial={{
          schoolName: s.schoolName,
          npsn: s.npsn ?? "",
          governmentLine1: s.governmentLine1,
          governmentLine2: s.governmentLine2,
          address: s.address,
          phone: s.phone ?? "",
          email: s.email ?? "",
          website: s.website ?? "",
          principalName: s.principalName,
          principalNip: s.principalNip,
          letterNumberFormat: s.letterNumberFormat,
          waViolationTemplate: s.waViolationTemplate,
          waEnabled: s.waEnabled,
          achievementReducesPoints: s.achievementReducesPoints,
          kepsekCanReadCounseling: s.kepsekCanReadCounseling,
          parentOtpEnabled: s.parentOtpEnabled,
        }}
      />
    </>
  );
}
