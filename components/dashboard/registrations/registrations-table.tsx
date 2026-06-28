"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Registration } from "@/lib/types";
import { formatVietnamDate } from "@/lib/date-format";
import { PriorityBadge } from "./priority-badge";
import { PoolBadge } from "./pool-badge";
import { StatusBadge } from "./status-badge";
import { RegistrationDetailModal } from "./registration-detail-modal";

interface RegistrationsTableProps {
  registrations: Registration[];
}

export function RegistrationsTable({ registrations }: RegistrationsTableProps) {
  const t = useTranslations("registrations");
  const [selectedRegistration, setSelectedRegistration] =
    useState<Registration | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = (registration: Registration) => {
    setSelectedRegistration(registration);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRegistration(null);
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("name")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("email")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("phone")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("priority")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("pool")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("qualified")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("completed")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("createdAt")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {registrations.map((registration) => (
              <tr
                key={registration.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                  {registration.first_name} {registration.last_name}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {registration.email}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {registration.phone || "-"}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <PriorityBadge priority={registration.priority_level} />
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <PoolBadge pool={registration.engagement_pool} />
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <StatusBadge
                    value={registration.is_qualified}
                    trueLabel={t("detail.yes")}
                    falseLabel={t("detail.no")}
                  />
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <StatusBadge
                    value={registration.is_completed}
                    trueLabel={t("detail.yes")}
                    falseLabel={t("detail.no")}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {formatVietnamDate(registration.created_at)}
                </td>
                <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    aria-label={t("actions")}
                    onClick={() => handleViewDetails(registration)}
                  >
                    <Eye className="h-6 w-6" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RegistrationDetailModal
        registration={selectedRegistration}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </Card>
  );
}
