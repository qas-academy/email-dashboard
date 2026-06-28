import {
  DashboardOverviewSkeleton,
  DashboardRouteSkeleton,
} from "@/components/dashboard/tab-content-skeleton";

export default function DashboardLoading() {
  return (
    <DashboardRouteSkeleton titleWidth="w-36">
      <DashboardOverviewSkeleton />
    </DashboardRouteSkeleton>
  );
}
