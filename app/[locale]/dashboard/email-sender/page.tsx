import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { EmailSenderForm } from "@/components/dashboard/email-sender/email-sender-form";
import { EmailSenderSkeleton } from "@/components/dashboard/tab-content-skeleton";
import { getTemplateSummaries } from "@/actions/template-actions";

export default async function EmailSenderPage() {
  const t = await getTranslations("emailSender");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <Suspense fallback={<EmailSenderSkeleton />}>
          <EmailSenderContent />
        </Suspense>
      </div>
    </div>
  );
}

async function EmailSenderContent() {
  const templates = await getTemplateSummaries();

  return <EmailSenderForm templates={templates} />;
}
