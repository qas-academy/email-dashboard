import {
  DashboardRouteSkeleton,
  RegistrationsSkeleton,
} from "@/components/dashboard/tab-content-skeleton";

export default function RegistrationsLoading() {
  return (
    <DashboardRouteSkeleton titleWidth="w-40">
      <RegistrationsSkeleton />
    </DashboardRouteSkeleton>
  );
}
