"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Shield, Check, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { updateRolePermissions } from "@/actions/rbac-actions";
import { ALL_DASHBOARD_PAGES } from "@/lib/types";
import type { UserRole, DashboardPage } from "@/lib/types";

interface RolePermissionsPanelProps {
  permissions: Record<NonNullable<UserRole>, DashboardPage[]>;
  onUpdate: () => void;
  loading: boolean;
}

const ROLES: NonNullable<UserRole>[] = ['admin', 'internal', 'sales'];

const PAGE_LABELS: Record<DashboardPage, string> = {
  'dashboard': 'Dashboard',
  'templates': 'Templates',
  'email-sender': 'Email Sender',
  'registrations': 'Registrations',
  'contacts': 'Contacts',
  'campaigns': 'Campaigns',
  'user-management': 'User Management',
  'onboarding': 'Onboarding',
};

export function RolePermissionsPanel({ permissions, onUpdate, loading }: RolePermissionsPanelProps) {
  const t = useTranslations("admin.permissions");
  const [localPermissions, setLocalPermissions] = useState(permissions);
  const [saving, setSaving] = useState<NonNullable<UserRole> | null>(null);
  const [changed, setChanged] = useState<Set<NonNullable<UserRole>>>(new Set());

  // Sync localPermissions when permissions prop changes (after data load)
  useEffect(() => {
    setLocalPermissions(permissions);
    setChanged(new Set()); // Reset changed state when permissions reload
  }, [permissions]);

  const togglePermission = (role: NonNullable<UserRole>, page: DashboardPage) => {
    if (role === 'super_admin') return; // Can't modify super_admin

    setLocalPermissions(prev => {
      const current = prev[role];
      const updated = current.includes(page)
        ? current.filter(p => p !== page)
        : [...current, page];

      return { ...prev, [role]: updated };
    });

    setChanged(prev => new Set(prev).add(role));
  };

  const handleSave = async (role: NonNullable<UserRole>) => {
    if (role === 'super_admin') return;

    setSaving(role);
    try {
      const result = await updateRolePermissions(role, localPermissions[role]);
      if (result.success) {
        setChanged(prev => {
          const next = new Set(prev);
          next.delete(role);
          return next;
        });
        onUpdate();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {ROLES.map((role) => (
        <Card key={role}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t(`roleTitle.${role}`)}
              </CardTitle>
              {changed.has(role) && (
                <Button
                  size="sm"
                  onClick={() => handleSave(role)}
                  disabled={saving === role}
                >
                  {saving === role ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1" />
                      {t("save")}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ALL_DASHBOARD_PAGES.filter(p => p !== 'user-management').map((page) => {
                const isChecked = localPermissions[role].includes(page);
                return (
                  <label
                    key={page}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermission(role, page)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {PAGE_LABELS[page]}
                    </span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="md:col-span-2">
        <div className="inline-flex max-w-full items-start gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm font-medium leading-5 text-purple-600 dark:text-purple-300">
          <Shield className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("superAdminNote")}</span>
        </div>
      </div>
    </div>
  );
}
