import {
  DashboardRouteSkeleton,
  TemplateGridSkeleton,
} from "@/components/dashboard/tab-content-skeleton";

export default function TemplatesLoading() {
  return (
    <DashboardRouteSkeleton titleWidth="w-36">
      <TemplateGridSkeleton />
    </DashboardRouteSkeleton>
  );
}
