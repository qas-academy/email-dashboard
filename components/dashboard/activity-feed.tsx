import { ActivityItem } from "./activity-item";
import type { RecentActivity } from "@/lib/types/dashboard";

interface ActivityFeedProps {
  activities: RecentActivity[];
  title: string;
  emptyMessage?: string;
  translations: {
    registered: string;
    draft: string;
  };
}

export function ActivityFeed({
  activities,
  title,
  emptyMessage = "No recent activity",
  translations,
}: ActivityFeedProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 h-full">
      <h3 className="mb-4 text-sm font-medium text-foreground">{title}</h3>
      <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
        {activities.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground italic">
            {emptyMessage}
          </p>
        ) : (
          activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              translations={translations}
            />
          ))
        )}
      </div>
    </div>
  );
}
