import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { TabContentSkeleton } from "@/components/dashboard/tab-content-skeleton";

const ContactsContent = dynamic(
  () =>
    import("@/components/dashboard/contacts/contacts-content").then(
      (mod) => mod.ContactsContent
    ),
  {
    loading: () => <TabContentSkeleton />,
  }
);

export default async function ContactsPage() {
  const t = await getTranslations("contacts");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <ContactsContent />
      </div>
    </div>
  );
}
