import { Suspense } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { Header } from "@/components/layout";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { TrendAreaChart } from "@/components/dashboard/charts/trend-area-chart";
import { PriorityDonutChart } from "@/components/dashboard/charts/priority-donut-chart";
import { PoolBarChart } from "@/components/dashboard/charts/pool-bar-chart";
import { EmailActionChart } from "@/components/dashboard/charts/email-action-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardOverviewSkeleton } from "@/components/dashboard/tab-content-skeleton";
import {
  getDashboardStats,
  getRegistrationTrends,
  getPriorityDistribution,
  getPoolBreakdown,
  getRecentActivities,
  getEmailActionStats,
} from "@/actions/dashboard-actions";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />

      <div className="p-6">
        <Suspense fallback={<DashboardOverviewSkeleton />}>
          <DashboardOverview />
        </Suspense>
      </div>
    </div>
  );
}

async function DashboardOverview() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();

  // Fetch all dashboard data in parallel with error resilience
  const results = await Promise.allSettled([
    getDashboardStats(),
    getRegistrationTrends(30),
    getPriorityDistribution(),
    getPoolBreakdown(),
    getRecentActivities(5),
    getEmailActionStats(),
  ]);

  // Extract values with fallbacks for any failed requests
  const stats = results[0].status === "fulfilled" ? results[0].value : {
    totalRegistrations: 0,
    qualifiedCount: 0,
    completedCount: 0,
    thisMonthCount: 0,
    lastMonthCount: 0,
    qualifiedLastMonth: 0,
    completedLastMonth: 0,
  };
  const trends = results[1].status === "fulfilled" ? results[1].value : [];
  const priorityData = results[2].status === "fulfilled" ? results[2].value : [];
  const poolData = results[3].status === "fulfilled" ? results[3].value : [];
  const activities = results[4].status === "fulfilled" ? results[4].value : [];
  const emailActionData = results[5].status === "fulfilled" ? results[5].value : [];

  return (
    <div className="space-y-6">
        {/* Stats Grid */}
        <StatsGrid
          stats={stats}
          translations={{
            totalRegistrations: t("totalRegistrations"),
            qualified: t("qualified"),
            completed: t("completed"),
            thisMonth: t("thisMonth"),
            fromLastMonth: t("fromLastMonth"),
          }}
        />

        {/* Charts Row 1: Trend + Priority */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TrendAreaChart data={trends} title={t("trends")} registrationsLabel={t("registrationsLabel")} locale={locale} emptyMessage={t("noData")} />
          </div>
          <div className="lg:col-span-1">
            <PriorityDonutChart data={priorityData} title={t("priorityBreakdown")} emptyMessage={t("noData")} />
          </div>
        </div>

        {/* Charts Row 2: Pool Breakdown + Recent Activity + Email Actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <PoolBarChart data={poolData} title={t("poolBreakdown")} emptyMessage={t("noData")} />
          </div>
          <div>
            <ActivityFeed
              activities={activities}
              title={t("recentActivity")}
              locale={locale}
              emptyMessage={t("noActivity")}
              translations={{
                registered: t("registered"),
                draft: t("draft"),
              }}
            />
          </div>
          <div>
            <EmailActionChart data={emailActionData} title={t("emailActions")} emptyMessage={t("noData")} />
          </div>
        </div>
    </div>
  );
}
