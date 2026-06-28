"use client";

import { AreaChart, type CustomTooltipProps } from "@tremor/react";
import { formatVietnamDate } from "@/lib/date-format";
import type { TrendDataPoint } from "@/lib/types/dashboard";

interface TrendAreaChartProps {
  data: TrendDataPoint[];
  title: string;
  registrationsLabel?: string;
  emptyMessage?: string;
}

function CustomTooltip({ payload, active, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      {payload.map((item, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color as string }}
          />
          <span className="text-foreground">
            {item.dataKey}: <span className="font-semibold">{Number(item.value).toLocaleString()}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendAreaChart({ data, title, registrationsLabel = "Registrations", emptyMessage = "No data available" }: TrendAreaChartProps) {
  // Handle empty data
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 h-full">
        <h3 className="mb-4 text-sm font-medium text-foreground">{title}</h3>
        <div className="h-72 flex items-center justify-center">
          <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const formattedData = data.map((point) => ({
    date: formatVietnamDate(point.date),
    [registrationsLabel]: point.registrations,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-6 h-full dashboard-chart">
      <h3 className="mb-4 text-sm font-medium text-foreground">{title}</h3>
      <AreaChart
        className="h-72 [&_.recharts-cartesian-axis-tick-value]:fill-foreground [&_.recharts-cartesian-grid-horizontal_line]:stroke-border [&_.recharts-cartesian-grid-vertical_line]:stroke-border"
        data={formattedData}
        index="date"
        categories={[registrationsLabel]}
        colors={["cyan"]}
        showLegend={false}
        showGridLines={true}
        curveType="monotone"
        yAxisWidth={40}
        showXAxis={true}
        showYAxis={true}
        autoMinValue={true}
        connectNulls={true}
        customTooltip={CustomTooltip}
      />
    </div>
  );
}
