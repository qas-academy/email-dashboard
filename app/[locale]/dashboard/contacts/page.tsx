import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { ContactsSkeleton } from "@/components/dashboard/tab-content-skeleton";
import { getAllTags, getContacts } from "@/actions/contact-actions";

const ContactsContent = dynamic(
  () =>
    import("@/components/dashboard/contacts/contacts-content").then(
      (mod) => mod.ContactsContent
    ),
  {
    loading: () => <ContactsSkeleton />,
  }
);

export default async function ContactsPage() {
  const t = await getTranslations("contacts");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <Suspense fallback={<ContactsSkeleton />}>
          <ContactsContentWithData />
        </Suspense>
      </div>
    </div>
  );
}

async function ContactsContentWithData() {
  const [initialContacts, initialAvailableTags] = await Promise.all([
    getContacts({}, { page: 1, limit: 10 }),
    getAllTags(),
  ]);

  return (
    <ContactsContent
      initialContacts={initialContacts}
      initialAvailableTags={initialAvailableTags}
    />
  );
}
