import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { TabContentSkeleton } from "@/components/dashboard/tab-content-skeleton";

const CampaignsContent = dynamic(
  () =>
    import("@/components/dashboard/campaigns/campaigns-content").then(
      (mod) => mod.CampaignsContent
    ),
  {
    loading: () => <TabContentSkeleton />,
  }
);

export default async function CampaignsPage() {
  const t = await getTranslations("campaigns");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <CampaignsContent />
      </div>
    </div>
  );
}
