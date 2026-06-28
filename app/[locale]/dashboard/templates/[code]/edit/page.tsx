import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { TemplateForm } from "@/components/dashboard/templates/template-form";
import { getTemplateByCode } from "@/actions/template-actions";

interface EditTemplatePageProps {
  params: Promise<{ code: string }>;
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { code } = await params;
  const tCommon = await getTranslations("common");

  const template = await getTemplateByCode(decodeURIComponent(code));

  if (!template) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title={`${tCommon("edit")}: ${template.template_code}`} />
      <div className="p-6">
        <TemplateForm template={template} mode="edit" />
      </div>
    </div>
  );
}
