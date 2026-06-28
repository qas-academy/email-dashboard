"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Users, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { UserTable } from "./user-table";
import { RolePermissionsPanel } from "./role-permissions-panel";
import { getAllUsers, getAllRolePermissions, getCurrentUser } from "@/actions/rbac-actions";
import type { AppUser, UserRole, DashboardPage } from "@/lib/types";

type RoleFilter = 'all' | NonNullable<UserRole> | 'pending';

const defaultRolePermissions: Record<NonNullable<UserRole>, DashboardPage[]> = {
  super_admin: [],
  admin: [],
  internal: [],
  sales: [],
};

interface UsersContentProps {
  initialUsers?: AppUser[];
  initialRolePermissions?: Record<NonNullable<UserRole>, DashboardPage[]>;
  initialCurrentUserId?: string;
}

export function UsersContent({
  initialUsers,
  initialRolePermissions,
  initialCurrentUserId,
}: UsersContentProps) {
  const t = useTranslations("admin");
  const skipInitialLoadRef = useRef(
    initialUsers !== undefined && initialRolePermissions !== undefined
  );
  const [users, setUsers] = useState<AppUser[]>(initialUsers ?? []);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(initialCurrentUserId);
  const [rolePermissions, setRolePermissions] = useState<Record<NonNullable<UserRole>, DashboardPage[]>>(
    initialRolePermissions ?? defaultRolePermissions
  );
  const [loading, setLoading] = useState(!skipInitialLoadRef.current);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');

  useEffect(() => {
    if (skipInitialLoadRef.current) {
      skipInitialLoadRef.current = false;
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, permissionsData, currentUser] = await Promise.all([
        getAllUsers(),
        getAllRolePermissions(),
        getCurrentUser(),
      ]);
      setUsers(usersData);
      setRolePermissions(permissionsData);
      setCurrentUserId(currentUser?.auth_user_id);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'pending') return user.role === null;
    return user.role === roleFilter;
  });

  const userCounts = {
    all: users.length,
    super_admin: users.filter(u => u.role === 'super_admin').length,
    admin: users.filter(u => u.role === 'admin').length,
    internal: users.filter(u => u.role === 'internal').length,
    sales: users.filter(u => u.role === 'sales').length,
    pending: users.filter(u => u.role === null).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'users'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          {t("tabs.users")}
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'permissions'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="w-4 h-4" />
          {t("tabs.permissions")}
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Role Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'super_admin', 'admin', 'internal', 'sales', 'pending'] as RoleFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setRoleFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  roleFilter === filter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {t(`filters.${filter}`)} ({userCounts[filter]})
              </button>
            ))}
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t("usersTable.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <UserTable users={filteredUsers} onUpdate={loadData} currentUserId={currentUserId} />
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <RolePermissionsPanel
          permissions={rolePermissions}
          onUpdate={loadData}
          loading={loading}
        />
      )}
    </div>
  );
}
