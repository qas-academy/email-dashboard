"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportRegistrations } from "@/actions/registration-actions";
import { RegistrationFilters } from "@/lib/types";

interface CSVExportButtonProps {
  filters: RegistrationFilters;
}

export function CSVExportButton({ filters }: CSVExportButtonProps) {
  const t = useTranslations("registrations");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportRegistrations(filters);

      // Transform data for CSV
      const csvData = data.map((reg) => ({
        ID: reg.id,
        "First Name": reg.first_name,
        "Last Name": reg.last_name,
        Email: reg.email,
        Phone: reg.phone || "",
        "Priority Level": reg.priority_level || "",
        "Engagement Pool": reg.engagement_pool || "",
        "Is Qualified": reg.is_qualified ? "Yes" : "No",
        "Is Completed": reg.is_completed ? "Yes" : "No",
        "Created At": reg.created_at || "",
        "Updated At": reg.updated_at || "",
      }));

      // Generate CSV
      const { default: Papa } = await import("papaparse");
      const csv = Papa.unparse(csvData);

      // Create and download file
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `registrations_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="secondary"
      onClick={handleExport}
      disabled={isExporting}
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {t("exportCSV")}
    </Button>
  );
}
