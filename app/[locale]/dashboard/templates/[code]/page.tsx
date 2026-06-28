import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Edit } from "lucide-react";
import { Header } from "@/components/layout";
import { Button } from "@/components/ui";
import { HtmlPreview } from "@/components/dashboard/templates/html-preview";
import { getTemplateByCode } from "@/actions/template-actions";

interface TemplateDetailPageProps {
  params: Promise<{ code: string }>;
}

export default async function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { code } = await params;
  const t = await getTranslations("templates");
  const tCommon = await getTranslations("common");

  const template = await getTemplateByCode(decodeURIComponent(code));

  if (!template) {
    notFound();
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header title={template.template_code} />

      <div className="flex-1 p-6 flex flex-col gap-4 min-h-0">
        {/* Back Button & Actions */}
        <div className="flex items-center justify-between shrink-0">
          <Link
            href="/dashboard/templates"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {tCommon("back")}
          </Link>
          <Link href={`/dashboard/templates/${code}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              {tCommon("edit")}
            </Button>
          </Link>
        </div>

        {/* Template Info */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          <div className="flex flex-col min-h-0">
            <div className="flex-1 rounded-xl border border-border bg-card p-6 flex flex-col min-h-0 overflow-hidden">
              <h2 className="text-lg font-semibold text-foreground mb-4 shrink-0">
                Template Details
              </h2>

              <dl className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
                <div className="shrink-0">
                  <dt className="text-sm font-medium text-muted-foreground">
                    {t("code")}
                  </dt>
                  <dd className="mt-1 text-foreground font-mono text-sm">
                    {template.template_code}
                  </dd>
                </div>

                <div className="shrink-0">
                  <dt className="text-sm font-medium text-muted-foreground">
                    {t("subject")}
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {template.subject}
                  </dd>
                </div>

                {template.description && (
                  <div className="shrink-0">
                    <dt className="text-sm font-medium text-muted-foreground">
                      {t("description")}
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {template.description}
                    </dd>
                  </div>
                )}

                <div className="flex-1 flex flex-col min-h-0">
                  <dt className="text-sm font-medium text-muted-foreground shrink-0">
                    {t("content")}
                  </dt>
                  <dd className="mt-2 flex-1 min-h-0">
                    <pre className="h-full p-4 rounded-lg bg-muted text-xs overflow-auto">
                      <code>{template.html_content}</code>
                    </pre>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Preview */}
          <div className="flex flex-col min-h-0">
            <div className="mb-2 shrink-0">
              <span className="text-sm font-medium text-foreground">
                {t("preview")}
              </span>
            </div>
            <HtmlPreview html={template.html_content} className="flex-1 min-h-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
