import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { TabContentSkeleton } from "@/components/dashboard/tab-content-skeleton";

const OnboardingContent = dynamic(
  () =>
    import("@/components/dashboard/onboarding/onboarding-content").then(
      (mod) => mod.OnboardingContent
    ),
  {
    loading: () => <TabContentSkeleton />,
  }
);

export default async function OnboardingPage() {
  const t = await getTranslations("onboarding");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <OnboardingContent />
      </div>
    </div>
  );
}
