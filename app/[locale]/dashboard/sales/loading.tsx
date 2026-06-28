import {
  DashboardRouteSkeleton,
  SalesBoardSkeleton,
} from "@/components/dashboard/tab-content-skeleton";

export default function SalesLoading() {
  return (
    <DashboardRouteSkeleton titleWidth="w-20">
      <SalesBoardSkeleton />
    </DashboardRouteSkeleton>
  );
}
