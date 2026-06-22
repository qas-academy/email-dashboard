"use client";

import { useState, useTransition, useRef } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { sendEmails } from "@/actions/email-actions";
import { saveCustomTemplate, updateTemplate } from "@/actions/template-actions";
import { TemplateSelector } from "./template-selector";
import { EmailPreviewPanel } from "./email-preview-panel";
import { InfoBox } from "./info-box";
import { SendResultModal } from "./send-result-modal";
import { SaveTemplateModal } from "./save-template-modal";
import { CSVRecipientUpload } from "./csv-recipient-upload";
import {
  DEFAULT_EMAIL_SENDER_FROM,
  QAS_CONTACT_FROM,
  QAS_SALES_FROM,
} from "@/lib/email-addresses";
import type { EmailTemplate, EmailFormData, BatchEmailResult } from "@/lib/types";

interface EmailSenderFormProps {
  templates: EmailTemplate[];
}

// Store original template values to detect modifications
interface OriginalTemplateValues {
  subject: string;
  htmlContent: string;
}

export function EmailSenderForm({ templates }: EmailSenderFormProps) {
  const t = useTranslations("emailSender");
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [sendResult, setSendResult] = useState<BatchEmailResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track original template values to detect modifications
  const originalTemplateRef = useRef<OriginalTemplateValues | null>(null);

  // Store form data to use in save modal callbacks
  const pendingFormDataRef = useRef<EmailFormData | null>(null);

  // Form state
  const [formData, setFormData] = useState<EmailFormData>({
    from: DEFAULT_EMAIL_SENDER_FROM,
    to: "",
    names: "",
    cc: "",
    subject: "",
    htmlContent: "",
    plainText: "",
    templateCode: null,
  });

  const handleTemplateSelect = (template: EmailTemplate | null) => {
    if (template) {
      // Store original values for modification detection
      originalTemplateRef.current = {
        subject: template.subject,
        htmlContent: template.html_content,
      };
      setFormData((prev) => ({
        ...prev,
        templateCode: template.template_code,
        subject: template.subject,
        htmlContent: template.html_content,
      }));
    } else {
      originalTemplateRef.current = null;
      setFormData((prev) => ({
        ...prev,
        templateCode: null,
        subject: "",
        htmlContent: "",
      }));
    }
  };

  // Check if template content has been modified
  const isTemplateModified = (): boolean => {
    if (!formData.templateCode || !originalTemplateRef.current) return false;
    return (
      formData.subject !== originalTemplateRef.current.subject ||
      formData.htmlContent !== originalTemplateRef.current.htmlContent
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  // Handle CSV recipients loaded
  const handleCSVRecipientsLoaded = (emails: string[], names: string[]) => {
    setFormData((prev) => ({
      ...prev,
      to: emails.join(", "),
      names: names.join(", "),
    }));
  };

  const handleSubmit = () => {
    setError(null);

    // Basic validation
    if (!formData.from.trim()) {
      setError(t("errorFromRequired"));
      return;
    }
    if (!formData.to.trim()) {
      setError(t("errorToRequired"));
      return;
    }
    if (!formData.subject.trim()) {
      setError(t("errorSubjectRequired"));
      return;
    }
    if (!formData.htmlContent.trim()) {
      setError(t("errorHtmlRequired"));
      return;
    }

    startTransition(async () => {
      const result = await sendEmails(formData);
      setSendResult(result);
      setShowResultModal(true);

      // Handle post-send actions
      if (result.success || result.totalSent > 0) {
        // Check if we need to show save template modal (modified existing template)
        if (formData.templateCode && isTemplateModified()) {
          // Store form data for modal callbacks - DON'T clear form yet
          pendingFormDataRef.current = { ...formData };
          setShowSaveTemplateModal(true);
          // Form will be cleared after user makes a choice in the modal
        } else {
          // Auto-save custom template if not using an existing template
          if (!formData.templateCode && formData.subject && formData.htmlContent) {
            try {
              const saveResult = await saveCustomTemplate(formData.subject, formData.htmlContent);
              if (!saveResult.success) {
                console.error("Failed to save template:", saveResult.error);
              }
            } catch (err) {
              console.error("Error saving template:", err);
            }
          }
          // Clear form only when NOT showing save modal
          clearForm();
        }
      }
    });
  };

  // Clear form helper
  const clearForm = () => {
    setFormData({
      from: formData.from,
      to: "",
      names: "",
      cc: "",
      subject: "",
      htmlContent: "",
      plainText: "",
      templateCode: null,
    });
    originalTemplateRef.current = null;
    pendingFormDataRef.current = null;
  };

  // Handle update existing template
  const handleUpdateExisting = async () => {
    const data = pendingFormDataRef.current;
    if (!data?.templateCode) return;

    setIsSaving(true);
    try {
      const result = await updateTemplate(data.templateCode, {
        subject: data.subject,
        html_content: data.htmlContent, // EmailFormData uses htmlContent, but API expects html_content
      });
      if (!result.success) {
        console.error("Failed to update template:", result.error);
      }
    } catch (err) {
      console.error("Error updating template:", err);
    } finally {
      setIsSaving(false);
      setShowSaveTemplateModal(false);
      clearForm(); // Clear form after user makes their choice
    }
  };

  // Handle save as new template
  const handleSaveAsNew = async () => {
    const data = pendingFormDataRef.current;
    if (!data?.subject || !data?.htmlContent) return;

    setIsSaving(true);
    try {
      const result = await saveCustomTemplate(data.subject, data.htmlContent);
      if (!result.success) {
        console.error("Failed to save template:", result.error);
      }
    } catch (err) {
      console.error("Error saving template:", err);
    } finally {
      setIsSaving(false);
      setShowSaveTemplateModal(false);
      clearForm(); // Clear form after user makes their choice
    }
  };

  // Get first email/name for preview sample
  const getPreviewSample = () => {
    const emails = formData.to.split(",").map((e) => e.trim()).filter(Boolean);
    const names = formData.names.split(",").map((n) => n.trim());
    return {
      email: emails[0] || "recipient@example.com",
      name: names[0] || undefined,
    };
  };

  const previewSample = getPreviewSample();
  const senderOptions = [
    { value: QAS_CONTACT_FROM, label: t("fromContact") },
    { value: QAS_SALES_FROM, label: t("fromSales") },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        {/* Left Column - Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Selector */}
            <TemplateSelector
              templates={templates}
              selectedCode={formData.templateCode}
              onSelect={handleTemplateSelect}
            />

            {/* From */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("from")} <span className="text-destructive">*</span>
              </label>
              <Select
                name="from"
                value={formData.from}
                onChange={handleInputChange}
                options={senderOptions}
              />
              <p className="text-xs text-muted-foreground">{t("fromHint")}</p>
            </div>

            {/* CSV Upload */}
            <CSVRecipientUpload onRecipientsLoaded={handleCSVRecipientsLoaded} />

            {/* To */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("to")} <span className="text-destructive">*</span>
              </label>
              <Input
                name="to"
                value={formData.to}
                onChange={handleInputChange}
                placeholder={t("toPlaceholder")}
              />
            </div>

            {/* Names */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("names")}
              </label>
              <Input
                name="names"
                value={formData.names}
                onChange={handleInputChange}
                placeholder={t("namesPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("namesHint")}</p>
            </div>

            {/* CC */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("cc")}
              </label>
              <Input
                name="cc"
                value={formData.cc}
                onChange={handleInputChange}
                placeholder={t("ccPlaceholder")}
              />
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("subject")} <span className="text-destructive">*</span>
              </label>
              <Input
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder={t("subjectPlaceholder")}
              />
            </div>

            {/* HTML Content */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  {t("htmlContent")} <span className="text-destructive">*</span>
                </label>
                <span className="text-xs text-muted-foreground">
                  {t("variablesHint")}
                </span>
              </div>
              <Textarea
                name="htmlContent"
                value={formData.htmlContent}
                onChange={handleInputChange}
                placeholder={t("htmlContentPlaceholder")}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {/* Plain Text */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("plainText")}
              </label>
              <Textarea
                name="plainText"
                value={formData.plainText}
                onChange={handleInputChange}
                placeholder={t("plainTextPlaceholder")}
                rows={4}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Action button */}
            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {isPending ? t("sending") : t("sendEmail")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Preview */}
        <div className="flex flex-col lg:sticky lg:top-6">
          <EmailPreviewPanel
            html={formData.htmlContent}
            subject={formData.subject}
            sampleEmail={previewSample.email}
            sampleName={previewSample.name}
            className="flex-1"
          />
        </div>
      </div>

      {/* Info Box */}
      <InfoBox />

      {/* Result Modal */}
      <SendResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        result={sendResult}
      />

      {/* Save Template Modal */}
      <SaveTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => {
          setShowSaveTemplateModal(false);
          clearForm(); // Clear form when user skips saving
        }}
        templateCode={pendingFormDataRef.current?.templateCode || ""}
        onUpdateExisting={handleUpdateExisting}
        onSaveAsNew={handleSaveAsNew}
        isPending={isSaving}
      />
    </div>
  );
}
