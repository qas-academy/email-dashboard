import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout";
import { UsersManagementSkeleton } from "@/components/dashboard/tab-content-skeleton";
import {
  getAllRolePermissions,
  getAllUsers,
  getCurrentUser,
} from "@/actions/rbac-actions";

const UsersContent = dynamic(
  () =>
    import("@/components/dashboard/admin/users-content").then(
      (mod) => mod.UsersContent
    ),
  {
    loading: () => <UsersManagementSkeleton />,
  }
);

export default async function UsersPage() {
  const t = await getTranslations("admin");

  return (
    <div className="min-h-screen bg-background">
      <Header title={t("title")} />
      <div className="p-6">
        <Suspense fallback={<UsersManagementSkeleton />}>
          <UsersContentWithData />
        </Suspense>
      </div>
    </div>
  );
}

async function UsersContentWithData() {
  const [initialUsers, initialRolePermissions, currentUser] = await Promise.all([
    getAllUsers(),
    getAllRolePermissions(),
    getCurrentUser(),
  ]);

  return (
    <UsersContent
      initialUsers={initialUsers}
      initialRolePermissions={initialRolePermissions}
      initialCurrentUserId={currentUser?.auth_user_id}
    />
  );
}
