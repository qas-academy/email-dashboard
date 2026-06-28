import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { TemplateList } from "@/components/dashboard/templates/template-list";
import { TemplateGridSkeleton } from "@/components/dashboard/tab-content-skeleton";
import { getTemplates } from "@/actions/template-actions";

export default async function TemplatesPage() {
  const t = await getTranslations("templates");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <Suspense fallback={<TemplateGridSkeleton />}>
          <TemplatesContent />
        </Suspense>
      </div>
    </div>
  );
}

async function TemplatesContent() {
  const templates = await getTemplates();

  return <TemplateList templates={templates} />;
}
