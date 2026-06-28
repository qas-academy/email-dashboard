import type { Registration } from "./registration";
import type { UserRole } from "./rbac";

export const SALES_STATUSES = ["queue", "contacted", "assigned", "won", "lost"] as const;

export type SalesStatus = (typeof SALES_STATUSES)[number];

export interface SalesColumn {
  status: SalesStatus;
  label: string;
  accentClass: string;
  badgeClass: string;
}

export const SALES_COLUMNS: SalesColumn[] = [
  {
    status: "queue",
    label: "Queue",
    accentClass: "border-t-slate-400",
    badgeClass: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  },
  {
    status: "contacted",
    label: "Contacted",
    accentClass: "border-t-sky-500",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-100",
  },
  {
    status: "assigned",
    label: "Assigned",
    accentClass: "border-t-amber-500",
    badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100",
  },
  {
    status: "won",
    label: "Won",
    accentClass: "border-t-emerald-500",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100",
  },
  {
    status: "lost",
    label: "Lost",
    accentClass: "border-t-rose-500",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-100",
  },
];

export type SalesRegistration = Omit<Registration, "id"> & {
  id: string;
  sales_status: SalesStatus;
  sales_assignee_id: string | null;
  sales_assignee_name: string | null;
  sales_assignee_email: string | null;
};

export interface SalesAssignee {
  id: string;
  email: string;
  full_name: string | null;
  role: Extract<UserRole, "admin" | "internal" | "sales">;
  display_name: string;
}

export interface CreateSalesRegistrationInput {
  full_name: string;
  email: string;
  phone?: string | null;
  facebook_link?: string | null;
  course?: string | null;
  birth_year?: number | null;
  sat_score?: number | null;
  target_score?: number | null;
  test_date?: string | null;
  discovery_source?: string | null;
  sales_status?: SalesStatus;
}
