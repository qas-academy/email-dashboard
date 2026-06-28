import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { OnboardingSkeleton } from "@/components/dashboard/tab-content-skeleton";
import {
  getDistinctSenders,
  getOnboardingStats,
  getOnboardingStudents,
} from "@/actions/onboarding-actions";
import { getCurrentUser } from "@/actions/rbac-actions";

const OnboardingContent = dynamic(
  () =>
    import("@/components/dashboard/onboarding/onboarding-content").then(
      (mod) => mod.OnboardingContent
    ),
  {
    loading: () => <OnboardingSkeleton />,
  }
);

export default async function OnboardingPage() {
  const t = await getTranslations("onboarding");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <Suspense fallback={<OnboardingSkeleton />}>
          <OnboardingContentWithData />
        </Suspense>
      </div>
    </div>
  );
}

async function OnboardingContentWithData() {
  const [initialStudents, initialStats, initialSenders, currentUser] = await Promise.all([
    getOnboardingStudents({}, { page: 1, limit: 10 }),
    getOnboardingStats(),
    getDistinctSenders(),
    getCurrentUser(),
  ]);

  return (
    <OnboardingContent
      initialStudents={initialStudents}
      initialStats={initialStats}
      initialSenders={initialSenders}
      initialCurrentUserName={currentUser?.email}
    />
  );
}
