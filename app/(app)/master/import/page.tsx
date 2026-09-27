import { requirePageRole } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { ImportForm } from "./form";

export const metadata = { title: "Import Excel" };

export default async function Page() {
  await requirePageRole("ADMIN");
  return (
    <>
      <PageHeader title="Import Siswa & Orang Tua" description="Unduh template, isi data, periksa, lalu import." backHref="/master/siswa" />
      <ImportForm />
    </>
  );
}
