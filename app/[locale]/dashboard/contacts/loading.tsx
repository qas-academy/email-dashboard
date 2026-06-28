import {
  ContactsSkeleton,
  DashboardRouteSkeleton,
} from "@/components/dashboard/tab-content-skeleton";

export default function ContactsLoading() {
  return (
    <DashboardRouteSkeleton titleWidth="w-28">
      <ContactsSkeleton />
    </DashboardRouteSkeleton>
  );
}
