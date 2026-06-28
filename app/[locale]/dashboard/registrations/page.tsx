import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { TabContentSkeleton } from "@/components/dashboard/tab-content-skeleton";

const RegistrationsContent = dynamic(
  () =>
    import("@/components/dashboard/registrations/registrations-content").then(
      (mod) => mod.RegistrationsContent
    ),
  {
    loading: () => <TabContentSkeleton />,
  }
);

export default async function RegistrationsPage() {
  const t = await getTranslations("registrations");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <RegistrationsContent />
      </div>
    </div>
  );
}
