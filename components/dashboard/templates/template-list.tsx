"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus, Mail } from "lucide-react";
import { Button, SearchInput } from "@/components/ui";
import { TemplateCard } from "./template-card";
import type { EmailTemplateSummary } from "@/lib/types";

interface TemplateListProps {
  templates: EmailTemplateSummary[];
}

export function TemplateList({ templates }: TemplateListProps) {
  const t = useTranslations("templates");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");

  const filteredTemplates = templates.filter((template) => {
    const searchLower = search.toLowerCase();
    return (
      template.template_code.toLowerCase().includes(searchLower) ||
      template.subject.toLowerCase().includes(searchLower) ||
      (template.description?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <SearchInput
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          className="w-full sm:w-80"
        />
        <Link href="/dashboard/templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("createNew")}
          </Button>
        </Link>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.template_code} template={template} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            {search ? tCommon("noData") : t("noTemplates")}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search
              ? "Try adjusting your search"
              : "Create your first email template to get started"}
          </p>
          {!search && (
            <Link href="/dashboard/templates/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("createNew")}
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
