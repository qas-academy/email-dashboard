"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Upload, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ContactFilters } from "./contact-filters";
import { ContactsTable } from "./contacts-table";
import { getContacts, getAllTags } from "@/actions/contact-actions";
import {
  MarketingContact,
  ContactFilters as Filters,
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
const AddContactModal = dynamic(
  () => import("./add-contact-modal").then((mod) => mod.AddContactModal),
  {
    loading: () => null,
    ssr: false,
  }
);

export function ContactsContent() {
  const t = useTranslations("contacts");

  const [contacts, setContacts] = useState<PaginatedResult<MarketingContact>>({
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getContacts(filters, {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      setContacts(data);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage]);

  const fetchTags = useCallback(async () => {
    try {
      const tags = await getAllTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

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
    fetchContacts();
    fetchTags();
  };

  const handleAddSuccess = () => {
    fetchContacts();
    fetchTags();
  };

  const handleContactDeleted = () => {
    fetchContacts();
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("totalRecords")}: {contacts.total}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {t("addContact")}
          </Button>
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
      <ContactFilters
        filters={filters}
        availableTags={availableTags}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : contacts.data.length > 0 ? (
        <>
          <ContactsTable
            contacts={contacts.data}
            onContactDeleted={handleContactDeleted}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={contacts.totalPages}
            onPageChange={handlePageChange}
            totalItems={contacts.total}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      ) : (
        <EmptyState
          icon={Users}
          title={t("noContacts")}
          description={
            filters.search ||
            filters.status ||
            filters.engagement_level ||
            (filters.tags && filters.tags.length > 0)
              ? t("tryAdjustingFilters")
              : t("importContactsToStart")
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

      {isAddModalOpen && (
        <AddContactModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
          availableTags={availableTags}
        />
      )}
    </div>
  );
}
