"use client";

import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { Registration } from "@/lib/types";
import { formatVietnamDate, formatVietnamDateTime } from "@/lib/date-format";
import { PriorityBadge } from "./priority-badge";
import { PoolBadge } from "./pool-badge";
import { StatusBadge } from "./status-badge";

interface DetailRowProps {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
}

function DetailRow({ label, value, children }: DetailRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-border last:border-0">
      <span className="text-sm font-medium text-muted-foreground w-full sm:w-40 mb-1 sm:mb-0">
        {label}
      </span>
      <span className="text-sm text-foreground flex-1">
        {children || value || "-"}
      </span>
    </div>
  );
}

interface RegistrationDetailModalProps {
  registration: Registration | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RegistrationDetailModal({
  registration,
  isOpen,
  onClose,
}: RegistrationDetailModalProps) {
  const t = useTranslations("registrations");

  // Early return if no registration - also narrows type for TypeScript
  if (!registration) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${registration.first_name} ${registration.last_name}`}
      size="3xl"
    >
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-base font-semibold mb-3 text-foreground">
            {t("detail.basicInfo")}
          </h3>
          <div>
            <DetailRow label="ID" value={registration.id} />
            <DetailRow
              label={t("name")}
              value={`${registration.first_name} ${registration.last_name}`}
            />
            <DetailRow label={t("email")} value={registration.email} />
            <DetailRow label={t("phone")} value={registration.phone} />
            <DetailRow
              label={t("detail.birthYear")}
              value={registration.birth_year}
            />
            <DetailRow
              label={t("detail.facebook")}
              value={registration.facebook_link}
            />
          </div>
        </div>

        {/* Status & Classification */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-base font-semibold mb-3 text-foreground">
            {t("detail.statusClassification")}
          </h3>
          <div>
            <DetailRow label={t("priority")}>
              <PriorityBadge priority={registration.priority_level} />
            </DetailRow>
            <DetailRow
              label={t("detail.priorityScore")}
              value={registration.priority_score}
            />
            <DetailRow
              label={t("detail.priorityLabel")}
              value={registration.priority_label}
            />
            <DetailRow label={t("pool")}>
              <PoolBadge pool={registration.engagement_pool} />
            </DetailRow>
            <DetailRow
              label={t("detail.poolName")}
              value={registration.pool_name}
            />
            <DetailRow label={t("qualified")}>
              <StatusBadge
                value={registration.is_qualified}
                trueLabel={t("detail.yes")}
                falseLabel={t("detail.no")}
              />
            </DetailRow>
            <DetailRow label={t("completed")}>
              <StatusBadge
                value={registration.is_completed}
                trueLabel={t("detail.yes")}
                falseLabel={t("detail.no")}
              />
            </DetailRow>
          </div>
        </div>

        {/* SAT Information */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-base font-semibold mb-3 text-foreground">
            {t("detail.satInfo")}
          </h3>
          <div>
            <DetailRow label={t("detail.course")} value={registration.course} />
            <DetailRow
              label={t("detail.satScore")}
              value={registration.sat_score}
            />
            <DetailRow
              label={t("detail.targetScore")}
              value={registration.target_score}
            />
            <DetailRow
              label={t("detail.testDate")}
              value={formatVietnamDate(registration.test_date, registration.test_date || "-")}
            />
            <DetailRow
              label={t("detail.satTestStatus")}
              value={registration.sat_test_status}
            />
            <DetailRow
              label={t("detail.discoverySource")}
              value={registration.discovery_source}
            />
            <DetailRow
              label={t("detail.submissionType")}
              value={registration.submission_type}
            />
          </div>
        </div>

        {/* Email Activity */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-base font-semibold mb-3 text-foreground">
            {t("detail.emailActivity")}
          </h3>
          <div>
            <DetailRow
              label={t("detail.lastEmailSentCode")}
              value={registration.last_email_sent_code}
            />
            <DetailRow
              label={t("detail.lastAction")}
              value={registration.last_action}
            />
            <DetailRow
              label={t("detail.nextEmailDate")}
              value={formatVietnamDate(registration.next_email_date)}
            />
          </div>
        </div>

        {/* Timestamps */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-base font-semibold mb-3 text-foreground">
            {t("detail.timestamps")}
          </h3>
          <div>
            <DetailRow
              label={t("createdAt")}
              value={formatVietnamDateTime(registration.created_at)}
            />
            <DetailRow
              label={t("detail.updatedAt")}
              value={formatVietnamDateTime(registration.updated_at)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
