"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  Users,
  Calendar,
  Loader2,
  AlertCircle,
  Sparkles,
  Mail,
  Target,
  ClipboardList,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createCampaign,
  updateCampaign,
  getAudiencePreview,
} from "@/actions/campaign-actions";
import { getTemplateSummaries } from "@/actions/template-actions";
import { getAllTags } from "@/actions/contact-actions";
import type {
  Campaign,
  CampaignCreateInput,
  AudienceFilter,
  AudiencePreview,
  EmailTemplateSummary,
} from "@/lib/types";

interface CampaignWizardProps {
  campaign?: Campaign;
  mode: "create" | "edit";
}

type WizardStep = "basic" | "template" | "audience" | "review";

const STEPS: WizardStep[] = ["basic", "template", "audience", "review"];

const STEP_ICONS: Record<WizardStep, React.ReactNode> = {
  basic: <Target className="h-5 w-5" />,
  template: <Mail className="h-5 w-5" />,
  audience: <Users className="h-5 w-5" />,
  review: <ClipboardList className="h-5 w-5" />,
};

export function CampaignWizard({ campaign, mode }: CampaignWizardProps) {
  const t = useTranslations("campaigns");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("basic");
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [name, setName] = useState(campaign?.name || "");
  const [objective, setObjective] = useState(campaign?.objective || "");
  const [templateCode, setTemplateCode] = useState(campaign?.template_code || "");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>(
    campaign?.audience_filter || {}
  );
  const [scheduledAt, setScheduledAt] = useState(campaign?.scheduled_at || "");

  // Data for selections
  const [templates, setTemplates] = useState<EmailTemplateSummary[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Load templates and tags on mount
  useEffect(() => {
    async function loadData() {
      const [templatesData, tagsData] = await Promise.all([
        getTemplateSummaries(),
        getAllTags(),
      ]);
      setTemplates(templatesData);
      setAvailableTags(tagsData);
    }
    loadData();
  }, []);

  // Load audience preview when filter changes
  useEffect(() => {
    async function loadPreview() {
      setIsLoadingPreview(true);
      const preview = await getAudiencePreview(audienceFilter);
      setAudiencePreview(preview);
      setIsLoadingPreview(false);
    }
    loadPreview();
  }, [audienceFilter]);

  const currentStepIndex = STEPS.indexOf(currentStep);

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case "basic":
        return name.trim().length > 0;
      case "template":
        return templateCode.length > 0;
      case "audience":
        return (audiencePreview?.count || 0) > 0;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1]);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1]);
    }
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = audienceFilter.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    setAudienceFilter({ ...audienceFilter, tags: newTags });
  };

  const handleExcludeTemplateToggle = (code: string) => {
    const currentExclude = audienceFilter.exclude_templates || [];
    const newExclude = currentExclude.includes(code)
      ? currentExclude.filter((c) => c !== code)
      : [...currentExclude, code];
    setAudienceFilter({ ...audienceFilter, exclude_templates: newExclude });
  };

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const data: CampaignCreateInput = {
        name: name.trim(),
        objective: objective.trim() || undefined,
        template_code: templateCode,
        audience_filter: audienceFilter,
        scheduled_at: scheduledAt || undefined,
      };

      let result;
      if (mode === "edit" && campaign) {
        result = await updateCampaign(campaign.id, data);
      } else {
        result = await createCampaign(data);
      }

      if (result.success) {
        router.push("/dashboard/campaigns");
      } else {
        setError(result.error || t("createFailed"));
      }
    });
  };

  const selectedTemplate = templates.find((t) => t.template_code === templateCode);

  const stepTitles: Record<WizardStep, string> = {
    basic: t("stepBasicInfo"),
    template: t("stepSelectTemplate"),
    audience: t("stepSelectAudience"),
    review: t("stepReview"),
  };

  const renderStepIndicator = () => (
    <div className="mb-4">
      <div className="flex items-start justify-between relative">
        {/* Progress line - background */}
        <div className="absolute top-5 left-[calc(12.5%)] right-[calc(12.5%)] h-0.5 bg-muted" />
        {/* Progress line - active */}
        <div
          className="absolute top-5 left-[calc(12.5%)] h-0.5 bg-primary transition-all duration-500"
          style={{
            width: currentStepIndex === 0
              ? "0%"
              : `${(currentStepIndex / (STEPS.length - 1)) * 75}%`,
          }}
        />

        {/* Steps */}
        {STEPS.map((step, index) => {
          const isActive = step === currentStep;
          const isCompleted = index < currentStepIndex;
          const isPast = index <= currentStepIndex;

          return (
            <button
              key={step}
              onClick={() => {
                if (index < currentStepIndex) {
                  setCurrentStep(step);
                }
              }}
              disabled={index > currentStepIndex}
              className="flex flex-col items-center flex-1"
            >
              {/* Circle */}
              <div
                className={`
                  relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 bg-card
                  ${isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : isCompleted
                    ? "border-primary bg-primary text-primary-foreground cursor-pointer hover:scale-105"
                    : "border-muted-foreground/30 text-muted-foreground"
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <div className="scale-90">{STEP_ICONS[step]}</div>
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  mt-2 text-xs font-medium transition-colors text-center leading-tight
                  ${isPast ? "text-foreground" : "text-muted-foreground"}
                `}
              >
                {stepTitles[step]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderBasicStep = () => (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 mb-3">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold">{t("stepBasicInfo")}</h3>
        <p className="text-sm text-muted-foreground">{t("createCampaignDescription")}</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          {t("name")} <span className="text-destructive">*</span>
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("campaignNamePlaceholder")}
          className="h-10"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {t("objective")}
        </label>
        <Textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder={t("objectivePlaceholder")}
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );

  const renderTemplateStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 mb-3">
          <Mail className="h-6 w-6 text-blue-500" />
        </div>
        <h3 className="text-base font-semibold">{t("stepSelectTemplate")}</h3>
        <p className="text-sm text-muted-foreground">{t("selectTemplateHint")}</p>
      </div>

      <div className="grid gap-2 max-h-[280px] overflow-y-auto pr-1">
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("noTemplatesAvailable")}</p>
          </div>
        ) : (
          templates.map((template) => {
            const isSelected = templateCode === template.template_code;
            return (
              <button
                key={template.template_code}
                onClick={() => setTemplateCode(template.template_code)}
                className={`
                  group relative p-3 border-2 rounded-lg text-left transition-all duration-200
                  ${isSelected
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    flex-shrink-0 p-2 rounded-lg transition-colors
                    ${isSelected ? "bg-primary/10" : "bg-background"}
                  `}>
                    <FileText className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate text-sm ${isSelected ? "text-primary" : ""}`}>
                      {template.template_code}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {template.subject}
                    </p>
                  </div>
                  <div className={`
                    flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                    ${isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                    }
                  `}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const renderAudienceStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 mb-3">
          <Users className="h-6 w-6 text-green-500" />
        </div>
        <h3 className="text-base font-semibold">{t("stepSelectAudience")}</h3>
        <p className="text-sm text-muted-foreground">{t("filterByTags")}</p>
      </div>

      {/* Tags selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("filterByTags")}
        </label>
        <div className="flex flex-wrap gap-1.5 p-3 bg-muted/30 rounded-lg min-h-[44px]">
          {availableTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noTagsAvailable")}</p>
          ) : (
            availableTags.map((tag) => {
              const isSelected = audienceFilter.tags?.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`
                    px-3 py-1 text-xs rounded-full font-medium transition-all duration-200
                    ${isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border hover:border-primary/50"
                    }
                  `}
                >
                  {tag}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Exclude templates */}
      {templates.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("excludeReceivedTemplates")}
          </label>
          <div className="flex flex-wrap gap-1.5 p-3 bg-muted/30 rounded-lg max-h-20 overflow-y-auto">
            {templates.map((template) => {
              const isExcluded = audienceFilter.exclude_templates?.includes(
                template.template_code
              );
              return (
                <button
                  key={template.template_code}
                  onClick={() => handleExcludeTemplateToggle(template.template_code)}
                  className={`
                    px-2.5 py-1 text-xs rounded-full font-medium transition-all duration-200
                    ${isExcluded
                      ? "bg-destructive/10 text-destructive border border-destructive/30"
                      : "bg-card border border-border hover:border-destructive/50"
                    }
                  `}
                >
                  {template.template_code}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Audience preview */}
      <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-sm">{t("audiencePreview")}</h4>
        </div>

        {isLoadingPreview ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : audiencePreview && audiencePreview.count > 0 ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">
                {audiencePreview.count.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">{t("recipients")}</span>
            </div>

            {audiencePreview.sample.length > 0 && (
              <div className="bg-card rounded-md overflow-hidden border text-xs">
                <div className="max-h-[100px] overflow-y-auto">
                  <table className="w-full">
                    <tbody className="divide-y divide-border">
                      {audiencePreview.sample.slice(0, 3).map((contact) => (
                        <tr key={contact.id} className="hover:bg-muted/30">
                          <td className="px-3 py-1.5 font-mono">{contact.email}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {audiencePreview.count > 3 && (
                  <div className="px-3 py-1.5 text-xs text-muted-foreground text-center bg-muted/30 border-t">
                    {t("andMore", { count: audiencePreview.count - 3 })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-1" />
            <p className="text-sm text-muted-foreground">{t("noAudienceMatch")}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 mb-3">
          <ClipboardList className="h-6 w-6 text-purple-500" />
        </div>
        <h3 className="text-base font-semibold">{t("stepReview")}</h3>
        <p className="text-sm text-muted-foreground">{t("scheduleHint")}</p>
      </div>

      {/* Campaign summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
            {t("name")}
          </p>
          <p className="font-semibold">{name}</p>
        </div>

        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
            {t("recipients")}
          </p>
          <p className="font-semibold text-primary">
            {audiencePreview?.count.toLocaleString() || 0}
          </p>
        </div>

        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
            {t("template")}
          </p>
          <p className="font-medium text-sm">{selectedTemplate?.template_code || "-"}</p>
        </div>

        {objective && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
              {t("objective")}
            </p>
            <p className="text-sm truncate">{objective}</p>
          </div>
        )}
      </div>

      {/* Audience filters summary */}
      {(audienceFilter.tags?.length || audienceFilter.exclude_templates?.length) ? (
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {t("audienceFilters")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {audienceFilter.tags?.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium"
              >
                {tag}
              </span>
            ))}
            {audienceFilter.exclude_templates?.map((code) => (
              <span
                key={code}
                className="px-2 py-0.5 text-xs rounded-full bg-destructive/10 text-destructive font-medium"
              >
                {t("exclude")}: {code}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Schedule option */}
      <div className="p-4 border-2 border-dashed rounded-lg">
        <label className="text-sm font-medium flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {t("scheduleFor")}
        </label>
        <Input
          type="datetime-local"
          value={scheduledAt ? scheduledAt.slice(0, 16) : ""}
          onChange={(e) =>
            setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : "")
          }
          className="h-10"
        />
        <p className="text-xs text-muted-foreground mt-1.5">{t("scheduleHint")}</p>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "basic":
        return renderBasicStep();
      case "template":
        return renderTemplateStep();
      case "audience":
        return renderAudienceStep();
      case "review":
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {renderStepIndicator()}

      <Card className="border-0 shadow-xl bg-card/80 backdrop-blur">
        <CardContent className="p-6 pt-8">
          {renderCurrentStep()}
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="mt-6 p-4 rounded-xl border border-destructive/50 bg-destructive/10 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={currentStepIndex === 0 ? () => router.back() : goBack}
          className="h-10 px-4 gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {currentStepIndex === 0 ? tCommon("cancel") : tCommon("back")}
        </Button>

        {currentStep === "review" ? (
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="h-10 px-6 gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {tCommon("loading")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {mode === "edit" ? t("updateCampaign") : t("createCampaign")}
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={!canGoNext()}
            className="h-10 px-6 gap-2"
          >
            {t("next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
