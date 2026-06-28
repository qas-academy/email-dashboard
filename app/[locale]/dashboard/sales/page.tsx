import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { SalesBoardContent } from "@/components/dashboard/sales/sales-board-content";
import { SalesBoardSkeleton } from "@/components/dashboard/tab-content-skeleton";
import { getSalesAssignees, getSalesRegistrations } from "@/actions/sales-actions";

export default async function SalesPage() {
  const t = await getTranslations("sales");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <Suspense fallback={<SalesBoardSkeleton />}>
          <SalesContent />
        </Suspense>
      </div>
    </div>
  );
}

async function SalesContent() {
  const [initialRegistrations, assignees] = await Promise.all([
    getSalesRegistrations(),
    getSalesAssignees(),
  ]);

  return (
    <SalesBoardContent
      initialRegistrations={initialRegistrations}
      assignees={assignees}
    />
  );
}
