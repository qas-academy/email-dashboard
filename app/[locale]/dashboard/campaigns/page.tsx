import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { CampaignsSkeleton } from "@/components/dashboard/tab-content-skeleton";
import { getCampaigns } from "@/actions/campaign-actions";

const CampaignsContent = dynamic(
  () =>
    import("@/components/dashboard/campaigns/campaigns-content").then(
      (mod) => mod.CampaignsContent
    ),
  {
    loading: () => <CampaignsSkeleton />,
  }
);

export default async function CampaignsPage() {
  const t = await getTranslations("campaigns");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <Suspense fallback={<CampaignsSkeleton />}>
          <CampaignsContentWithData />
        </Suspense>
      </div>
    </div>
  );
}

async function CampaignsContentWithData() {
  const initialCampaigns = await getCampaigns({}, { page: 1, limit: 10 });

  return <CampaignsContent initialCampaigns={initialCampaigns} />;
}
