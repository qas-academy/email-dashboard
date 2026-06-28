import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { TabContentSkeleton } from "@/components/dashboard/tab-content-skeleton";

const UsersContent = dynamic(
  () =>
    import("@/components/dashboard/admin/users-content").then(
      (mod) => mod.UsersContent
    ),
  {
    loading: () => <TabContentSkeleton />,
  }
);

export default async function UsersPage() {
  const t = await getTranslations("admin");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <UsersContent />
      </div>
    </div>
  );
}
