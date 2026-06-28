"use client";

import { useTranslations } from "next-intl";
import type { EmailTemplateSummary } from "@/lib/types";

interface TemplateSelectorProps {
  templates: EmailTemplateSummary[];
  selectedCode: string | null;
  onSelect: (template: EmailTemplateSummary | null) => void | Promise<void>;
  disabled?: boolean;
}

export function TemplateSelector({
  templates,
  selectedCode,
  onSelect,
  disabled = false,
}: TemplateSelectorProps) {
  const t = useTranslations("emailSender");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    if (code === "") {
      onSelect(null);
    } else {
      const template = templates.find((t) => t.template_code === code);
      if (template) {
        onSelect(template);
      }
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {t("selectTemplate")}
      </label>
      <select
        value={selectedCode || ""}
        onChange={handleChange}
        disabled={disabled}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">{t("noTemplate")}</option>
        {templates.map((template) => (
          <option key={template.template_code} value={template.template_code}>
            {template.template_code} - {template.subject}
          </option>
        ))}
      </select>
    </div>
  );
}
