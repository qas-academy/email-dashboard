"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import { Button, ConfirmDialog } from "@/components/ui";
import { deleteTemplate } from "@/actions/template-actions";
import type { EmailTemplateSummary } from "@/lib/types";

interface TemplateCardProps {
  template: EmailTemplateSummary;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const router = useRouter();
  const t = useTranslations("templates");
  const tCommon = useTranslations("common");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteTemplate(template.template_code);
    setIsDeleting(false);
    setShowDeleteDialog(false);

    if (result.success) {
      router.refresh();
    }
  };

  return (
    <>
      <div className="group relative rounded-xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {template.template_code}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground truncate">
              {template.subject}
            </p>
            {template.description && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                {template.description}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-border bg-card shadow-lg py-1">
                  <Link
                    href={`/dashboard/templates/${template.template_code}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Eye className="h-4 w-4" />
                    {tCommon("view")}
                  </Link>
                  <Link
                    href={`/dashboard/templates/${template.template_code}/edit`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Edit className="h-4 w-4" />
                    {tCommon("edit")}
                  </Link>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteDialog(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    {tCommon("delete")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions on Hover */}
        <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/dashboard/templates/${template.template_code}`}
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              {tCommon("view")}
            </Button>
          </Link>
          <Link
            href={`/dashboard/templates/${template.template_code}/edit`}
            className="flex-1"
          >
            <Button variant="secondary" size="sm" className="w-full">
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              {tCommon("edit")}
            </Button>
          </Link>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title={tCommon("delete")}
        message={t("deleteConfirm")}
        confirmText={tCommon("delete")}
        cancelText={tCommon("cancel")}
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
