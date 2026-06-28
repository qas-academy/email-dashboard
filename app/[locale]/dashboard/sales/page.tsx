import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { SalesBoardContent } from "@/components/dashboard/sales/sales-board-content";
import { getSalesRegistrations } from "@/actions/sales-actions";

export default async function SalesPage() {
  const t = await getTranslations("sales");
  const initialRegistrations = await getSalesRegistrations();

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <SalesBoardContent initialRegistrations={initialRegistrations} />
      </div>
    </div>
  );
}
