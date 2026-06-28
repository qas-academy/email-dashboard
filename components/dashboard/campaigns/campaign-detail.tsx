"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  Archive,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Mail,
  MousePointerClick,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Clock,
  Tag,
  FileText,
  TrendingUp,
  Megaphone,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  archiveCampaign,
  deleteCampaign,
} from "@/actions/campaign-actions";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { CampaignWizard } from "./campaign-wizard";
import { formatVietnamDateTime } from "@/lib/date-format";
import type { CampaignWithRates } from "@/lib/types";

interface CampaignDetailProps {
  campaign: CampaignWithRates;
}

export function CampaignDetail({ campaign }: CampaignDetailProps) {
  const t = useTranslations("campaigns");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    if (!confirm(t("confirmStart"))) return;

    setError(null);
    startTransition(async () => {
      const result = await startCampaign(campaign.id);
      if (!result.success) {
        setError(result.error || t("startFailed"));
      } else {
        router.refresh();
      }
    });
  };

  const handlePause = () => {
    setError(null);
    startTransition(async () => {
      const result = await pauseCampaign(campaign.id);
      if (!result.success) {
        setError(result.error || t("pauseFailed"));
      } else {
        router.refresh();
      }
    });
  };

  const handleResume = () => {
    setError(null);
    startTransition(async () => {
      const result = await resumeCampaign(campaign.id);
      if (!result.success) {
        setError(result.error || t("resumeFailed"));
      } else {
        router.refresh();
      }
    });
  };

  const handleArchive = () => {
    if (!confirm(t("confirmArchive"))) return;

    setError(null);
    startTransition(async () => {
      const result = await archiveCampaign(campaign.id);
      if (!result.success) {
        setError(result.error || t("archiveFailed"));
      } else {
        router.push("/dashboard/campaigns");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(t("confirmDelete"))) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteCampaign(campaign.id);
      if (!result.success) {
        setError(result.error || t("deleteFailed"));
      } else {
        router.push("/dashboard/campaigns");
      }
    });
  };

  const formatRate = (rate: number) => `${rate.toFixed(1)}%`;

  if (isEditing) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          {t("backToDetails")}
        </Button>
        <CampaignWizard campaign={campaign} mode="edit" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 p-6 sm:p-8">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-primary/5 rounded-full blur-xl" />

        <div className="relative">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/campaigns")}
            className="mb-6 -ml-2 gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToCampaigns")}
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Campaign info */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-lg shadow-primary/10">
                <Megaphone className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{campaign.name}</h1>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
                {campaign.objective && (
                  <p className="text-muted-foreground max-w-xl text-sm sm:text-base">{campaign.objective}</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {campaign.status === "draft" && (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2 h-10">
                    <Pencil className="h-4 w-4" />
                    {t("edit")}
                  </Button>
                  <Button onClick={handleStart} disabled={isPending} className="gap-2 h-10 shadow-lg shadow-primary/25">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {t("start")}
                  </Button>
                  <Button variant="danger" onClick={handleDelete} disabled={isPending} className="gap-2 h-10">
                    <Trash2 className="h-4 w-4" />
                    {t("delete")}
                  </Button>
                </>
              )}
              {campaign.status === "scheduled" && (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2 h-10">
                    <Pencil className="h-4 w-4" />
                    {t("edit")}
                  </Button>
                  <Button onClick={handleStart} disabled={isPending} className="gap-2 h-10 shadow-lg shadow-primary/25">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {t("startNow")}
                  </Button>
                </>
              )}
              {campaign.status === "sending" && (
                <Button variant="outline" onClick={handlePause} disabled={isPending} className="gap-2 h-10">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                  {t("pause")}
                </Button>
              )}
              {campaign.status === "paused" && (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2 h-10">
                    <Pencil className="h-4 w-4" />
                    {t("edit")}
                  </Button>
                  <Button onClick={handleResume} disabled={isPending} className="gap-2 h-10 shadow-lg shadow-primary/25">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {t("resume")}
                  </Button>
                  <Button variant="outline" onClick={handleArchive} disabled={isPending} className="gap-2 h-10">
                    <Archive className="h-4 w-4" />
                    {t("archive")}
                  </Button>
                </>
              )}
              {campaign.status === "completed" && (
                <Button variant="outline" onClick={handleArchive} disabled={isPending} className="gap-2 h-10">
                  <Archive className="h-4 w-4" />
                  {t("archive")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-xl border border-destructive/50 bg-destructive/10 flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Stats cards - Only show when not draft */}
      {campaign.status !== "draft" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Recipients */}
          <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-blue-500/20 group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                  <TrendingUp className="h-5 w-5 text-blue-400/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t("recipients")}</p>
                <p className="text-3xl font-bold">{campaign.total_recipients.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Delivered */}
          <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-500/20 via-green-500/10 to-transparent overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-green-500/20 group-hover:scale-110 transition-transform">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <span className="text-sm font-bold text-green-400">{formatRate(campaign.delivery_rate)}</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t("delivered")}</p>
                <p className="text-3xl font-bold">{campaign.stats_delivered.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Open Rate */}
          <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-purple-500/20 group-hover:scale-110 transition-transform">
                    <Mail className="h-6 w-6 text-purple-400" />
                  </div>
                  <span className="text-sm font-bold text-purple-400">{formatRate(campaign.open_rate)}</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t("openRate")}</p>
                <p className="text-3xl font-bold">{campaign.stats_opened.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Click Rate */}
          <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-transparent overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-orange-500/20 group-hover:scale-110 transition-transform">
                    <MousePointerClick className="h-6 w-6 text-orange-400" />
                  </div>
                  <span className="text-sm font-bold text-orange-400">{formatRate(campaign.click_rate)}</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t("clickRate")}</p>
                <p className="text-3xl font-bold">{campaign.stats_clicked.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Details grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Campaign Details Card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border/50 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{t("campaignDetails")}</h3>
              </div>
            </div>

            <div className="p-6 space-y-1">
              <div className="flex items-center justify-between py-4 border-b border-border/30 hover:bg-muted/30 -mx-6 px-6 transition-colors">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{t("template")}</span>
                </div>
                <span className="font-semibold text-primary">{campaign.template_code || "-"}</span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-border/30 hover:bg-muted/30 -mx-6 px-6 transition-colors">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t("createdAt")}</span>
                </div>
                <span className="font-medium text-sm">{formatVietnamDateTime(campaign.created_at)}</span>
              </div>

              {campaign.scheduled_at && (
                <div className="flex items-center justify-between py-4 border-b border-border/30 hover:bg-muted/30 -mx-6 px-6 transition-colors">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{t("scheduledAt")}</span>
                  </div>
                  <span className="font-medium text-sm">{formatVietnamDateTime(campaign.scheduled_at)}</span>
                </div>
              )}

              {campaign.started_at && (
                <div className="flex items-center justify-between py-4 border-b border-border/30 hover:bg-muted/30 -mx-6 px-6 transition-colors">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Send className="h-4 w-4" />
                    <span>{t("startedAt")}</span>
                  </div>
                  <span className="font-medium text-sm">{formatVietnamDateTime(campaign.started_at)}</span>
                </div>
              )}

              {campaign.finished_at && (
                <div className="flex items-center justify-between py-4 hover:bg-muted/30 -mx-6 px-6 transition-colors">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    <span>{t("finishedAt")}</span>
                  </div>
                  <span className="font-medium text-sm">{formatVietnamDateTime(campaign.finished_at)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audience Filters Card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border/50 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{t("audienceFilters")}</h3>
              </div>
            </div>

            <div className="p-6">
              {campaign.audience_filter?.tags?.length || campaign.audience_filter?.exclude_templates?.length ? (
                <div className="space-y-6">
                  {campaign.audience_filter.tags && campaign.audience_filter.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        {t("includeTags")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {campaign.audience_filter.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-4 py-2 text-sm rounded-full bg-primary/15 text-primary font-medium border border-primary/20"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {campaign.audience_filter.exclude_templates && campaign.audience_filter.exclude_templates.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        {t("excludeReceivedTemplates")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {campaign.audience_filter.exclude_templates.map((code) => (
                          <span
                            key={code}
                            className="px-4 py-2 text-sm rounded-full bg-destructive/15 text-destructive font-medium border border-destructive/20"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
                    <Users className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">{t("allActiveContacts")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bounce warning */}
      {campaign.stats_bounced > 0 && (
        <Card className="border-destructive/30 shadow-lg bg-gradient-to-br from-destructive/15 via-destructive/10 to-transparent overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-destructive/20">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h4 className="font-semibold text-destructive text-lg mb-1">{t("bouncedEmails")}</h4>
                <p className="text-muted-foreground">
                  <span className="text-3xl font-bold text-destructive mr-2">
                    {campaign.stats_bounced}
                  </span>
                  {t("emailsBounced")} ({formatRate(campaign.bounce_rate)})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
