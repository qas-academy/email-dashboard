"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { User, ToggleLeft, ToggleRight, Trash2, X, AlertTriangle } from "lucide-react";
import { RoleSelect } from "./role-select";
import { toggleUserActive, deleteUser } from "@/actions/rbac-actions";
import { getUserDisplayName } from "@/lib/user-display";
import { formatVietnamDate } from "@/lib/date-format";
import type { AppUser } from "@/lib/types";

interface UserTableProps {
  users: AppUser[];
  onUpdate: () => void;
  currentUserId?: string;
}

export function UserTable({ users, onUpdate, currentUserId }: UserTableProps) {
  const t = useTranslations("admin.usersTable");
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AppUser | null>(null);

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setUpdating(userId);
    try {
      const result = await toggleUserActive(userId, !currentStatus);
      if (result.success) {
        onUpdate();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleting(userId);
    try {
      const result = await deleteUser(userId);
      if (result.success) {
        setDeleteConfirm(null);
        onUpdate();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    } finally {
      setDeleting(null);
    }
  };

  const canDeleteUser = (user: AppUser) => {
    // Cannot delete super_admin or yourself
    return user.role !== 'super_admin' && user.auth_user_id !== currentUserId;
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("noUsers")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              {t("columns.user")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              {t("columns.role")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              {t("columns.status")}
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
              {t("columns.createdAt")}
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
              {t("columns.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const displayName = getUserDisplayName(user.email, user.full_name);

            return (
            <tr key={user.id} className="border-b border-border hover:bg-muted/50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={displayName}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {displayName}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <RoleSelect
                  userId={user.id}
                  currentRole={user.role}
                  onUpdate={onUpdate}
                />
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.is_active
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {user.is_active ? t("active") : t("inactive")}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatVietnamDate(user.created_at)}
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleToggleActive(user.id, user.is_active)}
                    disabled={updating === user.id || user.role === 'super_admin'}
                    className={`p-2 rounded-lg transition-colors ${
                      user.is_active
                        ? 'text-green-400 hover:bg-green-500/20'
                        : 'text-muted-foreground hover:bg-muted'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={user.is_active ? t("deactivate") : t("activate")}
                  >
                    {updating === user.id ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    ) : user.is_active ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  {canDeleteUser(user) && (
                    <button
                      onClick={() => setDeleteConfirm(user)}
                      disabled={deleting === user.id}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      title={t("delete")}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {t("confirmDeleteTitle")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("confirmDeleteMessage")}
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {getUserDisplayName(deleteConfirm.email, deleteConfirm.full_name)}
                </p>
              </div>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="p-1 rounded hover:bg-muted"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm.id)}
                disabled={deleting === deleteConfirm.id}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting === deleteConfirm.id ? t("deleting") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
