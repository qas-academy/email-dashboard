import {
  DashboardRouteSkeleton,
  OnboardingSkeleton,
} from "@/components/dashboard/tab-content-skeleton";

export default function OnboardingLoading() {
  return (
    <DashboardRouteSkeleton titleWidth="w-44">
      <OnboardingSkeleton />
    </DashboardRouteSkeleton>
  );
}
