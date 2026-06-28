import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { TemplateForm } from "@/components/dashboard/templates/template-form";

export default async function NewTemplatePage() {
  const t = await getTranslations("templates");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("createNew")} />
      <div className="p-6">
        <TemplateForm mode="create" />
      </div>
    </div>
  );
}
