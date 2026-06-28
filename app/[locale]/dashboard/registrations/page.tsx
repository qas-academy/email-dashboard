import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { TabContentSkeleton } from "@/components/dashboard/tab-content-skeleton";
import { getRegistrations } from "@/actions/registration-actions";

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
        <Suspense fallback={<TabContentSkeleton />}>
          <RegistrationsContentWithData />
        </Suspense>
      </div>
    </div>
  );
}

async function RegistrationsContentWithData() {
  const initialRegistrations = await getRegistrations({}, { page: 1, limit: 10 });

  return <RegistrationsContent initialRegistrations={initialRegistrations} />;
}
