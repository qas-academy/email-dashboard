"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail, Calendar, Tag, Activity, Clock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { MarketingContact, ContactEvent } from "@/lib/types";
import { EngagementBadge } from "./engagement-badge";
import { ContactStatusBadge } from "./contact-status-badge";
import { getContactHistory } from "@/actions/contact-actions";

interface ContactDetailModalProps {
  contact: MarketingContact | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContactDetailModal({
  contact,
  isOpen,
  onClose,
}: ContactDetailModalProps) {
  const t = useTranslations("contacts");
  const locale = useLocale();
  const [historyState, setHistoryState] = useState<{
    contactId: string | null;
    events: ContactEvent[];
  }>({
    contactId: null,
    events: [],
  });
  const contactId = contact?.id ?? null;

  useEffect(() => {
    if (!contactId || !isOpen) {
      return;
    }

    let isCurrent = true;

    getContactHistory(contactId)
      .then((events) => {
        if (isCurrent) {
          setHistoryState({ contactId, events });
        }
      })
      .catch(console.error);

    return () => {
      isCurrent = false;
    };
  }, [contactId, isOpen]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!contact) return null;

  const history = historyState.contactId === contact.id ? historyState.events : [];
  const isLoadingHistory = isOpen && historyState.contactId !== contact.id;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("contactDetails")} size="lg">
      <div className="space-y-6">
        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Mail className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">{t("email")}</span>
            </div>
            <p className="font-medium">{contact.email}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase">{t("name")}</span>
            </div>
            <p className="font-medium">
              {contact.first_name || contact.last_name
                ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
                : "-"}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <span className="text-xs font-medium uppercase">{t("status")}</span>
            </div>
            <ContactStatusBadge status={contact.status} />
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">{t("engagement")}</span>
            </div>
            <EngagementBadge level={contact.engagement_level} />
          </Card>
        </div>

        {/* Tags */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Tag className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">{t("tags")}</span>
          </div>
          {contact.tags && contact.tags.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-sm bg-muted rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{t("noTags")}</p>
          )}
        </Card>

        {/* Timestamps */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">{t("timestamps")}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("createdAt")}:</span>
              <p className="font-medium">{formatDate(contact.created_at)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("lastEmail")}:</span>
              <p className="font-medium">{formatDate(contact.last_email_at)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("lastOpened")}:</span>
              <p className="font-medium">{formatDate(contact.last_opened_at)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("lastClicked")}:</span>
              <p className="font-medium">{formatDate(contact.last_clicked_at)}</p>
            </div>
            {contact.unsubscribed_at && (
              <div className="col-span-2">
                <span className="text-muted-foreground">{t("unsubscribedAt")}:</span>
                <p className="font-medium text-destructive">
                  {formatDate(contact.unsubscribed_at)}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Templates Received */}
        {contact.templates_received && contact.templates_received.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Mail className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">{t("templatesReceived")}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {contact.templates_received.map((template) => (
                <span
                  key={template}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded"
                >
                  {template}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Campaign History */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">{t("campaignHistory")}</span>
          </div>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{event.campaign_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.template_code}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs capitalize">{event.type.replace("_", " ")}</span>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t("noCampaignHistory")}</p>
          )}
        </Card>
      </div>
    </Modal>
  );
}
