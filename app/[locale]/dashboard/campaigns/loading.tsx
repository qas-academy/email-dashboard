import {
  CampaignsSkeleton,
  DashboardRouteSkeleton,
} from "@/components/dashboard/tab-content-skeleton";

export default function CampaignsLoading() {
  return (
    <DashboardRouteSkeleton titleWidth="w-32">
      <CampaignsSkeleton />
    </DashboardRouteSkeleton>
  );
}
