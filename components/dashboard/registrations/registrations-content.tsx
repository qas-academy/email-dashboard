"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { RegistrationFilters } from "./registration-filters";
import { RegistrationsTable } from "./registrations-table";
import { CSVExportButton } from "./csv-export-button";
import { getRegistrations } from "@/actions/registration-actions";
import {
  Registration,
  RegistrationFilters as Filters,
  PaginatedResult,
} from "@/lib/types";

const ITEMS_PER_PAGE = 10;
const CSVImportModal = dynamic(
  () => import("./csv-import-modal").then((mod) => mod.CSVImportModal),
  {
    loading: () => null,
    ssr: false,
  }
);

export function RegistrationsContent() {
  const t = useTranslations("registrations");

  const [registrations, setRegistrations] = useState<PaginatedResult<Registration>>({
    data: [],
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<Filters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getRegistrations(filters, {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      setRegistrations(data);
    } catch (error) {
      console.error("Failed to fetch registrations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleImportSuccess = () => {
    fetchRegistrations();
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("totalRecords")}: {registrations.total}
          </p>
        </div>
        <div className="flex gap-2">
          <CSVExportButton filters={filters} />
          <Button
            variant="primary"
            onClick={() => setIsImportModalOpen(true)}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {t("importCSV")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <RegistrationFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : registrations.data.length > 0 ? (
        <>
          <RegistrationsTable registrations={registrations.data} />
          <Pagination
            currentPage={currentPage}
            totalPages={registrations.totalPages}
            onPageChange={handlePageChange}
            totalItems={registrations.total}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      ) : (
        <EmptyState
          icon={Users}
          title={t("noRegistrations") || "No registrations found"}
          description={
            filters.search ||
            filters.priority_level ||
            filters.engagement_pool ||
            filters.is_qualified !== undefined ||
            filters.is_completed !== undefined
              ? "Try adjusting your filters"
              : "Import registrations using CSV to get started"
          }
          action={
            <Button
              variant="primary"
              onClick={() => setIsImportModalOpen(true)}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {t("importCSV")}
            </Button>
          }
        />
      )}

      {isImportModalOpen && (
        <CSVImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
