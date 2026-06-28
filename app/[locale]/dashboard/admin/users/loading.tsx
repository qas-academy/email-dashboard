import {
  DashboardRouteSkeleton,
  UsersManagementSkeleton,
} from "@/components/dashboard/tab-content-skeleton";

export default function UsersLoading() {
  return (
    <DashboardRouteSkeleton titleWidth="w-44">
      <UsersManagementSkeleton />
    </DashboardRouteSkeleton>
  );
}
