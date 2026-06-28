"use server";

import { query } from "@/lib/db";
import type {
  DashboardStats,
  TrendDataPoint,
  PriorityDistribution,
  PoolBreakdown,
  RecentActivity,
  EmailActionStats,
} from "@/lib/types/dashboard";
import {
  addDaysToDateKey,
  addMonthsToDateKey,
  getVietnamDateKey,
  vietnamDateKeyToUtcISOString,
} from "@/lib/date-format";

const PRIORITY_COLORS: Record<number, string> = {
  1: "emerald",
  2: "blue",
  3: "amber",
  4: "orange",
  5: "rose",
};

const POOL_LABELS: Record<string, string> = {
  Sales: "Sales",
  Consulting: "Consulting",
  Experience: "Experience",
  Nurture: "Nurture",
  Education: "Education",
  Giveaway: "Giveaway",
};

// Helper to normalize pool names from database (handles case variations)
function normalizePoolName(poolName: string): string {
  const capitalized = poolName.charAt(0).toUpperCase() + poolName.slice(1).toLowerCase();
  return POOL_LABELS[capitalized] || capitalized;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const todayKey = getVietnamDateKey();
    const [year, month] = todayKey.split("-").map(Number);
    const firstDayThisMonthKey = `${year}-${String(month).padStart(2, "0")}-01`;
    const firstDayLastMonthKey = addMonthsToDateKey(firstDayThisMonthKey, -1);
    const firstDayNextMonthKey = addMonthsToDateKey(firstDayThisMonthKey, 1);

    // Single query with FILTER clauses for better performance
    const result = await query<{
      total: string;
      qualified: string;
      completed: string;
      this_month: string;
      last_month: string;
      qualified_last_month: string;
      completed_last_month: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_qualified = true) as qualified,
        COUNT(*) FILTER (WHERE is_completed = true) as completed,
        COUNT(*) FILTER (WHERE created_at >= $1 AND created_at < $3) as this_month,
        COUNT(*) FILTER (WHERE created_at >= $2 AND created_at < $1) as last_month,
        COUNT(*) FILTER (WHERE is_qualified = true AND created_at >= $2 AND created_at < $1) as qualified_last_month,
        COUNT(*) FILTER (WHERE is_completed = true AND created_at >= $2 AND created_at < $1) as completed_last_month
      FROM qas_registrations`,
      [
        vietnamDateKeyToUtcISOString(firstDayThisMonthKey),
        vietnamDateKeyToUtcISOString(firstDayLastMonthKey),
        vietnamDateKeyToUtcISOString(firstDayNextMonthKey),
      ]
    );

    const row = result.rows[0];
    return {
      totalRegistrations: Number(row.total),
      qualifiedCount: Number(row.qualified),
      completedCount: Number(row.completed),
      thisMonthCount: Number(row.this_month),
      lastMonthCount: Number(row.last_month),
      qualifiedLastMonth: Number(row.qualified_last_month),
      completedLastMonth: Number(row.completed_last_month),
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return {
      totalRegistrations: 0,
      qualifiedCount: 0,
      completedCount: 0,
      thisMonthCount: 0,
      lastMonthCount: 0,
      qualifiedLastMonth: 0,
      completedLastMonth: 0,
    };
  }
}

export async function getRegistrationTrends(
  days: number = 30
): Promise<TrendDataPoint[]> {
  try {
    const todayKey = getVietnamDateKey();
    const startDateKey = addDaysToDateKey(todayKey, -(days - 1));

    const result = await query<{ date: string; count: string }>(
      `SELECT
        TO_CHAR(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as date,
        COUNT(*) as count
      FROM qas_registrations
      WHERE created_at >= $1
      GROUP BY 1
      ORDER BY date ASC`,
      [vietnamDateKeyToUtcISOString(startDateKey)]
    );

    // Fill in missing dates with 0
    const dataMap = new Map<string, number>();
    result.rows.forEach((row) => {
      dataMap.set(row.date, Number(row.count));
    });

    const trendData: TrendDataPoint[] = [];
    for (let i = 0; i < days; i++) {
      const dateStr = addDaysToDateKey(startDateKey, i);
      trendData.push({
        date: dateStr,
        registrations: dataMap.get(dateStr) || 0,
      });
    }

    return trendData;
  } catch (error) {
    console.error("Failed to fetch registration trends:", error);
    return [];
  }
}

export async function getPriorityDistribution(): Promise<PriorityDistribution[]> {
  try {
    const result = await query<{ priority_level: number; count: string }>(
      `SELECT
        priority_level,
        COUNT(*) as count
      FROM qas_registrations
      WHERE priority_level IS NOT NULL
      GROUP BY priority_level
      ORDER BY priority_level ASC`
    );

    return result.rows.map((row) => ({
      name: `P${row.priority_level}`,
      value: Number(row.count),
      color: PRIORITY_COLORS[row.priority_level] || "gray",
    }));
  } catch (error) {
    console.error("Failed to fetch priority distribution:", error);
    return [];
  }
}

export async function getPoolBreakdown(): Promise<PoolBreakdown[]> {
  try {
    const result = await query<{ engagement_pool: string; count: string }>(
      `SELECT
        engagement_pool,
        COUNT(*) as count
      FROM qas_registrations
      WHERE engagement_pool IS NOT NULL
      GROUP BY engagement_pool
      ORDER BY count DESC`
    );

    return result.rows.map((row) => ({
      name: normalizePoolName(row.engagement_pool),
      value: Number(row.count),
    }));
  } catch (error) {
    console.error("Failed to fetch pool breakdown:", error);
    return [];
  }
}

interface RecentActivityRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_qualified: boolean;
  is_completed: boolean;
  submission_type: string | null;
  created_at: string;
  updated_at: string;
  last_action: string | null;
  last_email_sent_code: string | null;
  next_email_date: string | null;
}

export async function getRecentActivities(
  limit: number = 10
): Promise<RecentActivity[]> {
  try {
    const result = await query<RecentActivityRow>(
      `SELECT
        id,
        first_name,
        last_name,
        email,
        is_qualified,
        is_completed,
        submission_type,
        created_at,
        updated_at,
        last_action,
        last_email_sent_code,
        next_email_date
      FROM qas_registrations
      ORDER BY updated_at DESC
      LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => {
        let type: "registration" | "qualified" | "completed" = "registration";

        if (row.is_completed) {
          type = "completed";
        } else if (row.is_qualified) {
          type = "qualified";
        }

        const submissionType = (row.submission_type === "partial" ? "partial" : "completed") as "completed" | "partial";

        return {
          id: row.id,
          name: `${row.first_name} ${row.last_name}`,
          email: row.email,
          submissionType,
          timestamp: row.updated_at,
          type,
          lastAction: row.last_action,
          lastEmailSentCode: row.last_email_sent_code,
          nextEmailDate: row.next_email_date,
        };
      }
    );
  } catch (error) {
    console.error("Failed to fetch recent activities:", error);
    return [];
  }
}

export async function getEmailActionStats(): Promise<EmailActionStats[]> {
  try {
    const result = await query<{ action: string; count: string }>(
      `SELECT
        COALESCE(last_action, 'None') as action,
        COUNT(*) as count
      FROM qas_registrations
      GROUP BY last_action
      ORDER BY count DESC`
    );

    const totalCount = result.rows.reduce((sum, row) => sum + Number(row.count), 0);

    return result.rows.map((row) => ({
      action: row.action || 'None',
      count: Number(row.count),
      percentage: totalCount > 0 ? Math.round((Number(row.count) / totalCount) * 100) : 0,
    }));
  } catch (error) {
    console.error("Failed to fetch email action stats:", error);
    return [];
  }
}
