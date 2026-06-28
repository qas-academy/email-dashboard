import { UserPlus, FileEdit } from "lucide-react";
import { formatVietnamDateTime } from "@/lib/date-format";
import type { RecentActivity } from "@/lib/types/dashboard";

interface ActivityItemProps {
  activity: RecentActivity;
  translations: {
    registered: string;
    draft: string;
  };
}

const typeIcons = {
  completed: UserPlus,
  partial: FileEdit,
};

const typeColors = {
  completed: "text-blue-500 bg-blue-500/10",
  partial: "text-amber-500 bg-amber-500/10",
};

const actionColors: Record<string, string> = {
  "None": "bg-gray-500/10 text-gray-500",
  "Opened": "bg-blue-500/10 text-blue-500",
  "Clicked": "bg-emerald-500/10 text-emerald-500",
};

export function ActivityItem({ activity, translations }: ActivityItemProps) {
  const Icon = typeIcons[activity.submissionType];
  const colorClass = typeColors[activity.submissionType];
  const actionLabel = activity.submissionType === "completed" ? translations.registered : translations.draft;

  const timestamp = formatVietnamDateTime(activity.timestamp);
  const emailActionColor = actionColors[activity.lastAction || "None"] || "bg-gray-500/10 text-gray-500";

  return (
    <div className="flex items-center gap-2 py-2">
      <div className={`rounded-full p-1.5 ${colorClass} shrink-0`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {activity.name}
          </p>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${emailActionColor} shrink-0`}>
            {activity.lastAction || "None"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{activity.email}</span>
          {activity.lastEmailSentCode && (
            <span className="shrink-0">• {activity.lastEmailSentCode}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-medium text-foreground">{actionLabel}</p>
        <p className="text-[10px] text-muted-foreground">{timestamp}</p>
      </div>
    </div>
  );
}
