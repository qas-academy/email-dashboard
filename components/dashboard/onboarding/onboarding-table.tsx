"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Eye, Download, Send, Trash2, Pencil, Info, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUserDisplayName } from "@/lib/user-display";
import { formatVietnamDateTime } from "@/lib/date-format";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import type { StudentOnboarding, SenderInfo } from "@/lib/types";

interface OnboardingTableProps {
  students: StudentOnboarding[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onPreviewEmail: (student: StudentOnboarding) => void;
  onDownloadPdfs: (student: StudentOnboarding) => void;
  onSendEmail: (student: StudentOnboarding) => void;
  onEdit: (student: StudentOnboarding) => void;
  onViewDetails: (student: StudentOnboarding) => void;
  onDelete: (student: StudentOnboarding) => void;
  senders: SenderInfo[];
}

const STATUS_STYLES: Record<string, { variant: "warning" | "success" | "danger"; label: string }> = {
  pending: { variant: "warning", label: "pending" },
  sent: { variant: "success", label: "sent" },
  failed: { variant: "danger", label: "failed" },
};

const COURSE_COLORS: Record<string, string> = {
  PSAT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  BSAT: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  SSAT: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  "SAT 1-1": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

function getCourseColor(course: string) {
  return COURSE_COLORS[course.toUpperCase()] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
}

function formatCourseBadgeLabel(courseName: string | null, code: string | null) {
  if (!courseName) return null;
  return code?.trim() ? `${courseName} (${code.trim()})` : courseName;
}

export function OnboardingTable({
  students,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onPreviewEmail,
  onDownloadPdfs,
  onSendEmail,
  onEdit,
  onViewDetails,
  onDelete,
  senders,
}: OnboardingTableProps) {
  const t = useTranslations("onboarding");
  const senderMap = useMemo(
    () => new Map(senders.map((s) => [s.sentBy, s])),
    [senders]
  );
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const allSelected = students.length > 0 && students.every((s) => selectedIds.has(s.id));

  const openMenu = useCallback((studentId: string) => {
    if (openDropdown === studentId) {
      setOpenDropdown(null);
      return;
    }
    const btn = buttonRefs.current.get(studentId);
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.right - 192 });
    }
    setOpenDropdown(studentId);
  }, [openDropdown]);

  useEffect(() => {
    if (!openDropdown) return;
    const close = () => setOpenDropdown(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [openDropdown]);

  const currentStudent = openDropdown ? students.find((s) => s.id === openDropdown) : null;

  return (
    <TooltipProvider>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    className="h-4 w-4 rounded border-muted-foreground"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("studentName")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("courseSummary")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("email")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("signDate")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("status")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("sentAt")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    {t("sentBy")}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("sentByHint")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((student) => {
                const statusInfo = STATUS_STYLES[student.status] || STATUS_STYLES.pending;
                const mathLabel = formatCourseBadgeLabel(student.course_math_name, student.math_code);
                const verbalLabel = formatCourseBadgeLabel(student.course_verbal_name, student.verbal_code);
                const senderInfo = student.sent_by ? senderMap.get(student.sent_by) : undefined;

                return (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(student.id)}
                        onChange={() => onToggleSelect(student.id)}
                        className="h-4 w-4 rounded border-muted-foreground"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                      {student.student_name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {mathLabel && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCourseColor(student.course_math_name || "")}`}>
                            {mathLabel}
                          </span>
                        )}
                        {verbalLabel && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCourseColor(student.course_verbal_name || "")}`}>
                            {verbalLabel}
                          </span>
                        )}
                        {!mathLabel && !verbalLabel && <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {student.student_email}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {student.sign_date}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <Badge variant={statusInfo.variant}>
                        {t(`statuses.${statusInfo.label}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatVietnamDateTime(student.sent_at, "—")}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {student.sent_by ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted underline-offset-2">
                              {getUserDisplayName(
                                senderInfo?.email ?? student.sent_by,
                                senderInfo?.full_name ?? null
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {senderInfo?.email ?? student.sent_by}
                          </TooltipContent>
                        </Tooltip>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      <Button
                        ref={(el) => {
                          if (el) buttonRefs.current.set(student.id, el);
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openMenu(student.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {openDropdown && currentStudent && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
          <div
            className="fixed z-50 w-48 rounded-lg border border-border bg-card shadow-lg py-1"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              onClick={() => { onPreviewEmail(currentStudent); setOpenDropdown(null); }}
            >
              <Eye className="h-4 w-4" />
              {t("previewEmail")}
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              onClick={() => { onDownloadPdfs(currentStudent); setOpenDropdown(null); }}
            >
              <Download className="h-4 w-4" />
              {t("downloadPdfs")}
            </button>
            {currentStudent.status === "pending" ? (
              <>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  onClick={() => { onEdit(currentStudent); setOpenDropdown(null); }}
                >
                  <Pencil className="h-4 w-4" />
                  {t("edit")}
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  onClick={() => { onSendEmail(currentStudent); setOpenDropdown(null); }}
                >
                  <Send className="h-4 w-4" />
                  {t("sendEmail")}
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                  onClick={() => { onDelete(currentStudent); setOpenDropdown(null); }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("delete")}
                </button>
              </>
            ) : (
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                onClick={() => { onViewDetails(currentStudent); setOpenDropdown(null); }}
              >
                <Info className="h-4 w-4" />
                {t("viewDetails")}
              </button>
            )}
          </div>
        </>
      )}
    </TooltipProvider>
  );
}
