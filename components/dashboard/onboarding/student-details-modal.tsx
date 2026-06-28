"use client";

import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { getUserDisplayName } from "@/lib/user-display";
import { formatVietnamDateTime } from "@/lib/date-format";
import type { StudentOnboarding, SenderInfo } from "@/lib/types";

interface StudentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentOnboarding | null;
  senderInfo?: SenderInfo;
}

const STATUS_VARIANT: Record<string, "warning" | "success" | "danger"> = {
  pending: "warning",
  sent: "success",
  failed: "danger",
};

export function StudentDetailsModal({ isOpen, onClose, student, senderInfo }: StudentDetailsModalProps) {
  const t = useTranslations("onboarding");

  if (!student) return null;

  const rows: { label: string; value: string | null }[] = [
    { label: t("studentName"), value: student.student_name },
    {
      label: t("diagnosticMathScore"),
      value: student.diagnostic_math_score !== null ? `${student.diagnostic_math_score} / 800` : "—",
    },
    {
      label: t("diagnosticVerbalScore"),
      value: student.diagnostic_verbal_score !== null ? `${student.diagnostic_verbal_score} / 800` : "—",
    },
    {
      label: t("diagnosticTotalScore"),
      value: student.diagnostic_total_score !== null ? `${student.diagnostic_total_score} / 1600` : "—",
    },
    { label: t("mathCourse"), value: student.course_math_name || "—" },
    { label: t("mathCode"), value: student.math_code || "—" },
    { label: t("verbalCourse"), value: student.course_verbal_name || "—" },
    { label: t("verbalCode"), value: student.verbal_code || "—" },
    { label: t("outputCommitmentMath"), value: student.output_commitment_math ? t("yes") : t("no") },
    { label: t("outputCommitmentVerbal"), value: student.output_commitment_verbal ? t("yes") : t("no") },
    { label: t("signDate"), value: student.sign_date },
    { label: t("representativeName"), value: student.representative_name || "—" },
    { label: t("studentEmail"), value: student.student_email },
    { label: t("parentName"), value: student.parent_name || "—" },
    { label: t("parentEmail"), value: student.parent_email || "—" },
    { label: t("phone"), value: student.phone || "—" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("viewDetails")} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("status")}:</span>
          <Badge variant={STATUS_VARIANT[student.status] || "warning"}>
            {t(`statuses.${student.status}`)}
          </Badge>
        </div>

        <div className="rounded-lg border border-border divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="flex px-4 py-3">
              <span className="w-48 shrink-0 text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm font-medium text-foreground">{row.value}</span>
            </div>
          ))}
        </div>

        {student.status !== "pending" && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            {student.sent_at && (
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground">{t("sentAt")}:</span>
                <span className="font-medium">{formatVietnamDateTime(student.sent_at)}</span>
              </div>
            )}
            {student.sent_by && (
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground">{t("sentBy")}:</span>
                <span className="font-medium">
                  {getUserDisplayName(
                    senderInfo?.email ?? student.sent_by,
                    senderInfo?.full_name ?? null
                  )}
                </span>
              </div>
            )}
            {student.error_message && (
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground">{t("errorMessage")}:</span>
                <span className="font-medium text-destructive">{student.error_message}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
