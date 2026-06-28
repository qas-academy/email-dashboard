"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Plus, Megaphone } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { CampaignFilters } from "./campaign-filters";
import { CampaignsTable } from "./campaigns-table";
import { getCampaigns } from "@/actions/campaign-actions";
import {
  CampaignWithRates,
  CampaignFilters as Filters,
  PaginatedResult,
} from "@/lib/types";

const ITEMS_PER_PAGE = 10;

interface CampaignsContentProps {
  initialCampaigns?: PaginatedResult<CampaignWithRates>;
}

const emptyCampaigns: PaginatedResult<CampaignWithRates> = {
  data: [],
  total: 0,
  page: 1,
  limit: ITEMS_PER_PAGE,
  totalPages: 0,
};

export function CampaignsContent({ initialCampaigns }: CampaignsContentProps) {
  const t = useTranslations("campaigns");
  const router = useRouter();
  const skipInitialFetchRef = useRef(Boolean(initialCampaigns));

  const [campaigns, setCampaigns] = useState<PaginatedResult<CampaignWithRates>>(
    initialCampaigns ?? emptyCampaigns
  );
  const [filters, setFilters] = useState<Filters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(!initialCampaigns);

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCampaigns(filters, {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      setCampaigns(data);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    fetchCampaigns();
  }, [fetchCampaigns]);

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

  const handleCreateCampaign = () => {
    router.push("/dashboard/campaigns/new");
  };

  const handleCampaignUpdated = () => {
    fetchCampaigns();
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("totalCampaigns")}: {campaigns.total}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleCreateCampaign}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("createCampaign")}
        </Button>
      </div>

      {/* Filters */}
      <CampaignFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : campaigns.data.length > 0 ? (
        <>
          <CampaignsTable
            campaigns={campaigns.data}
            onCampaignUpdated={handleCampaignUpdated}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={campaigns.totalPages}
            onPageChange={handlePageChange}
            totalItems={campaigns.total}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      ) : (
        <EmptyState
          icon={Megaphone}
          title={t("noCampaigns")}
          description={
            filters.search || filters.status || filters.template_code
              ? t("tryAdjustingFilters")
              : t("createFirstCampaign")
          }
          action={
            <Button
              variant="primary"
              onClick={handleCreateCampaign}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("createCampaign")}
            </Button>
          }
        />
      )}
    </div>
  );
}
