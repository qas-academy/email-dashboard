import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardRouteSkeletonProps {
  children: ReactNode;
  titleWidth?: string;
}

function range(length: number) {
  return Array.from({ length }, (_, index) => index);
}

function PageActionsSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Skeleton className="h-5 w-40" />
      <div className="flex flex-wrap gap-2">
        {range(actions).map((index) => (
          <Skeleton key={index} className="h-10 w-32" />
        ))}
      </div>
    </div>
  );
}

function FilterBarSkeleton({ filters }: { filters: number }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Skeleton className="h-10 flex-1" />
      {range(filters).map((index) => (
        <Skeleton key={index} className="h-10 w-full lg:w-44" />
      ))}
    </div>
  );
}

function TableSkeleton({
  columns,
  rows = 6,
  minWidth = "min-w-[900px]",
  framed = true,
}: {
  columns: number;
  rows?: number;
  minWidth?: string;
  framed?: boolean;
}) {
  const content = (
    <div className="overflow-x-auto">
      <div className={minWidth}>
        <div
          className="grid gap-4 border-b border-border bg-muted/50 px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {range(columns).map((index) => (
            <Skeleton key={index} className="h-4 w-20" />
          ))}
        </div>
        <div className="divide-y divide-border">
          {range(rows).map((row) => (
            <div
              key={row}
              className="grid gap-4 px-4 py-4"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {range(columns).map((column) => (
                <Skeleton
                  key={column}
                  className={`h-5 ${column === columns - 1 ? "w-16 justify-self-end" : "w-full"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!framed) {
    return content;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {content}
    </div>
  );
}

function PaginationSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Skeleton className="h-5 w-44" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}

export function DashboardHeaderSkeleton({ titleWidth = "w-48" }: { titleWidth?: string }) {
  return (
    <header className="dashboard-skeleton sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-6 backdrop-blur">
      <Skeleton className={`h-6 ${titleWidth}`} />
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </header>
  );
}

export function DashboardRouteSkeleton({
  children,
  titleWidth = "w-48",
}: DashboardRouteSkeletonProps) {
  return (
    <div className="dashboard-skeleton min-h-screen bg-background">
      <DashboardHeaderSkeleton titleWidth={titleWidth} />
      <div className="p-6">{children}</div>
    </div>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="dashboard-skeleton space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {range(4).map((index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="mx-auto h-[300px] w-full rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {range(3).map((index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-6">
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TemplateGridSkeleton() {
  return (
    <div className="dashboard-skeleton space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full sm:w-80" />
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {range(6).map((index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmailSenderSkeleton() {
  return (
    <div className="dashboard-skeleton grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="space-y-4 p-6">
          {range(4).map((index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="mb-4 h-6 w-28" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}

export function RegistrationsSkeleton() {
  return (
    <div className="dashboard-skeleton space-y-6">
      <PageActionsSkeleton actions={2} />
      <FilterBarSkeleton filters={4} />
      <TableSkeleton columns={9} minWidth="min-w-[980px]" />
      <PaginationSkeleton />
    </div>
  );
}

export function ContactsSkeleton() {
  return (
    <div className="dashboard-skeleton space-y-6">
      <PageActionsSkeleton actions={2} />
      <FilterBarSkeleton filters={3} />
      <TableSkeleton columns={8} minWidth="min-w-[920px]" />
      <PaginationSkeleton />
    </div>
  );
}

export function CampaignsSkeleton() {
  return (
    <div className="dashboard-skeleton space-y-6">
      <PageActionsSkeleton actions={1} />
      <FilterBarSkeleton filters={1} />
      <TableSkeleton columns={8} minWidth="min-w-[960px]" />
      <PaginationSkeleton />
    </div>
  );
}

export function SalesBoardSkeleton() {
  return (
    <div className="dashboard-skeleton space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Skeleton className="h-5 w-40" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-10 w-full sm:w-72" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="overflow-x-auto pb-3">
        <div className="grid min-w-[1320px] grid-cols-5 gap-4">
          {range(5).map((column) => (
            <div
              key={column}
              className="min-h-[calc(100vh-15rem)] overflow-hidden rounded-xl border border-border border-t-4 bg-muted/40"
            >
              <div className="flex items-center justify-between border-b border-border bg-muted/95 px-4 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-7 rounded-full" />
              </div>
              <div className="space-y-3 p-3">
                {range(column === 0 ? 4 : 1).map((card) => (
                  <div key={card} className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <Skeleton className="h-4 w-20" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  </div>
                ))}
                {column > 0 && (
                  <Skeleton className="h-20 w-full border border-dashed border-border bg-card/60" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {range(5).map((index) => (
          <Skeleton key={index} className="h-6 w-24 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function OnboardingSkeleton() {
  return (
    <div className="dashboard-skeleton space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {range(4).map((index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <PageActionsSkeleton actions={1} />
      <FilterBarSkeleton filters={2} />
      <TableSkeleton columns={9} minWidth="min-w-[1040px]" />
      <PaginationSkeleton />
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
        <div className="w-full max-w-xl rounded-xl border border-border bg-card p-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-36" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UsersManagementSkeleton() {
  return (
    <div className="dashboard-skeleton space-y-6">
      <Skeleton className="h-5 w-full max-w-lg" />

      <div className="flex gap-2 border-b border-border">
        <Skeleton className="h-10 w-28 rounded-none" />
        <Skeleton className="h-10 w-36 rounded-none" />
      </div>

      <div className="flex flex-wrap gap-2">
        {range(6).map((index) => (
          <Skeleton key={index} className="h-8 w-28 rounded-lg" />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-36" />
          </div>
        </div>
        <div className="p-6">
          <TableSkeleton columns={5} minWidth="min-w-[760px]" rows={5} framed={false} />
        </div>
      </div>
    </div>
  );
}

export const TabContentSkeleton = RegistrationsSkeleton;
