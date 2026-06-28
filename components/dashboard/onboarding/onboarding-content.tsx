"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, GraduationCap, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { OnboardingFilters } from "./onboarding-filters";
import { OnboardingTable } from "./onboarding-table";
import { BulkSendBar } from "./bulk-send-bar";
import {
  getOnboardingStudents,
  getOnboardingStats,
  getDistinctSenders,
  deleteOnboardingStudent,
  generateOnboardingPdfs,
  sendOnboardingEmail,
  previewOnboardingEmail,
} from "@/actions/onboarding-actions";
import { getCurrentUser } from "@/actions/rbac-actions";
import { removeDiacritics } from "@/lib/diacritics";
import type {
  StudentOnboarding,
  OnboardingFilters as Filters,
  OnboardingStats,
  PaginatedResult,
  SenderInfo,
} from "@/lib/types";

const ITEMS_PER_PAGE = 10;
const AddStudentModal = dynamic(
  () => import("./add-student-modal").then((mod) => mod.AddStudentModal),
  {
    loading: () => null,
    ssr: false,
  }
);
const SendConfirmModal = dynamic(
  () => import("./send-confirm-modal").then((mod) => mod.SendConfirmModal),
  {
    loading: () => null,
    ssr: false,
  }
);
const EmailPreviewModal = dynamic(
  () => import("./email-preview-modal").then((mod) => mod.EmailPreviewModal),
  {
    loading: () => null,
    ssr: false,
  }
);
const EditStudentModal = dynamic(
  () => import("./edit-student-modal").then((mod) => mod.EditStudentModal),
  {
    loading: () => null,
    ssr: false,
  }
);
const StudentDetailsModal = dynamic(
  () => import("./student-details-modal").then((mod) => mod.StudentDetailsModal),
  {
    loading: () => null,
    ssr: false,
  }
);

export function OnboardingContent() {
  const t = useTranslations("onboarding");

  // Data state
  const [students, setStudents] = useState<PaginatedResult<StudentOnboarding>>({
    data: [],
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 0,
  });
  const [stats, setStats] = useState<OnboardingStats>({ total: 0, pending: 0, sent: 0, failed: 0 });
  const [filters, setFilters] = useState<Filters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [senders, setSenders] = useState<SenderInfo[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string>("admin@example.com");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<StudentOnboarding | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isBulkSendModalOpen, setIsBulkSendModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewStudentName, setPreviewStudentName] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StudentOnboarding | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<StudentOnboarding | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentsData, statsData, sendersData] = await Promise.all([
        getOnboardingStudents(filters, { page: currentPage, limit: ITEMS_PER_PAGE }),
        getOnboardingStats(),
        getDistinctSenders(),
      ]);
      setStudents(studentsData);
      setStats(statsData);
      setSenders(sendersData);
    } catch (error) {
      console.error("Failed to fetch onboarding data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch current user name on mount
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) {
        setCurrentUserName(user.email);
      }
    });
  }, []);

  // Handlers
  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (students.data.every((s) => selectedIds.has(s.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.data.map((s) => s.id)));
    }
  };

  const handlePreviewEmail = async (student: StudentOnboarding) => {
    setPreviewStudentName(student.student_name);
    setPreviewHtml(null);
    setIsPreviewOpen(true);

    const result = await previewOnboardingEmail(student.id);
    if (result.success && result.html) {
      setPreviewHtml(result.html);
    }
  };

  const handleDownloadPdfs = async (student: StudentOnboarding) => {
    const result = await generateOnboardingPdfs(student.id);
    if (!result.success || !result.luuY || !result.baoLuu) {
      alert(result.error || "Failed to generate PDFs");
      return;
    }

    const safeName = removeDiacritics(student.student_name);

    // Download LuuY PDF
    const luuYBlob = new Blob(
      [Uint8Array.from(atob(result.luuY), (c) => c.charCodeAt(0))],
      { type: "application/pdf" }
    );
    const luuYUrl = URL.createObjectURL(luuYBlob);
    const luuYLink = document.createElement("a");
    luuYLink.href = luuYUrl;
    luuYLink.download = `QAS_LuuY_HocVien_${safeName}.pdf`;
    luuYLink.click();
    URL.revokeObjectURL(luuYUrl);

    // Download BaoLuu PDF (slight delay to avoid browser blocking)
    setTimeout(() => {
      const baoLuuBlob = new Blob(
        [Uint8Array.from(atob(result.baoLuu!), (c) => c.charCodeAt(0))],
        { type: "application/pdf" }
      );
      const baoLuuUrl = URL.createObjectURL(baoLuuBlob);
      const baoLuuLink = document.createElement("a");
      baoLuuLink.href = baoLuuUrl;
      baoLuuLink.download = `QAS_QuyDinh_BaoLuu_${safeName}.pdf`;
      baoLuuLink.click();
      URL.revokeObjectURL(baoLuuUrl);
    }, 300);
  };

  const handleEdit = (student: StudentOnboarding) => {
    setEditTarget(student);
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (student: StudentOnboarding) => {
    setDetailsTarget(student);
    setIsDetailsModalOpen(true);
  };

  const handleSendEmail = (student: StudentOnboarding) => {
    setSendTarget(student);
    setIsSendModalOpen(true);
  };

  const handleConfirmSend = async () => {
    if (!sendTarget) return;
    setIsSending(true);
    setSendProgress({ current: 0, total: 1 });

    const result = await sendOnboardingEmail(sendTarget.id, currentUserName);
    setSendProgress({ current: 1, total: 1 });

    if (!result.success) {
      alert(result.error || "Failed to send email");
    }

    setIsSending(false);
    setIsSendModalOpen(false);
    setSendTarget(null);
    fetchData();
  };

  // Bulk send: filter out non-pending, warn if any skipped, limit to 10
  const [skippedStudents, setSkippedStudents] = useState<StudentOnboarding[]>([]);
  const [isSkippedModalOpen, setIsSkippedModalOpen] = useState(false);
  const [pendingBulkIds, setPendingBulkIds] = useState<string[]>([]);

  const handleBulkSend = () => {
    const selected = students.data.filter((s) => selectedIds.has(s.id));
    const pending = selected.filter((s) => s.status === "pending");
    const skipped = selected.filter((s) => s.status !== "pending");

    if (pending.length === 0) {
      // All selected are already sent/failed
      setSkippedStudents(skipped);
      setIsSkippedModalOpen(true);
      return;
    }

    if (pending.length > 10) {
      alert(t("bulkLimitExceeded"));
      return;
    }

    if (skipped.length > 0) {
      // Some are already sent — show warning, then proceed with pending only
      setSkippedStudents(skipped);
      setPendingBulkIds(pending.map((s) => s.id));
      setIsSkippedModalOpen(true);
      return;
    }

    // All good — open confirm modal
    setPendingBulkIds(pending.map((s) => s.id));
    setIsBulkSendModalOpen(true);
  };

  const handleSkippedConfirm = () => {
    setIsSkippedModalOpen(false);
    if (pendingBulkIds.length > 0) {
      setIsBulkSendModalOpen(true);
    }
  };

  const handleConfirmBulkSend = async () => {
    const ids = pendingBulkIds;
    setIsSending(true);
    setSendProgress({ current: 0, total: ids.length });

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < ids.length; i++) {
      const result = await sendOnboardingEmail(ids[i], currentUserName);
      if (result.success) sent++;
      else failed++;
      setSendProgress({ current: i + 1, total: ids.length });
    }

    setIsSending(false);
    setIsBulkSendModalOpen(false);
    setSelectedIds(new Set());
    setPendingBulkIds([]);

    if (failed > 0) {
      alert(t("bulkResult", { sent, failed }));
    }

    fetchData();
  };

  const handleDelete = async (student: StudentOnboarding) => {
    if (!confirm(t("confirmDelete"))) return;

    const result = await deleteOnboardingStudent(student.id);
    if (!result.success) {
      alert(result.error || "Failed to delete");
    }
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{t("statsTotal")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">{t("statsPending")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-xs text-muted-foreground">{t("statsSent")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">{t("statsFailed")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {t("totalRecords")}: {students.total}
        </p>
        <Button variant="primary" onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("addStudent")}
        </Button>
      </div>

      {/* Filters */}
      <OnboardingFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        senders={senders}
      />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : students.data.length > 0 ? (
        <>
          <OnboardingTable
            students={students.data}
            senders={senders}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onPreviewEmail={handlePreviewEmail}
            onDownloadPdfs={handleDownloadPdfs}
            onSendEmail={handleSendEmail}
            onEdit={handleEdit}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={students.totalPages}
            onPageChange={handlePageChange}
            totalItems={students.total}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title={t("noStudents")}
          description={filters.search || filters.status ? t("tryAdjustingFilters") : t("addStudentsToStart")}
          action={
            <Button variant="primary" onClick={() => setIsAddModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("addStudent")}
            </Button>
          }
        />
      )}

      {/* Bulk send bar */}
      <BulkSendBar
        count={selectedIds.size}
        onSend={handleBulkSend}
        onClear={() => setSelectedIds(new Set())}
      />

      {isAddModalOpen && (
        <AddStudentModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={fetchData}
        />
      )}

      {isSendModalOpen && (
        <SendConfirmModal
          isOpen={isSendModalOpen}
          onClose={() => { setIsSendModalOpen(false); setSendTarget(null); }}
          onConfirm={handleConfirmSend}
          student={sendTarget}
          isSending={isSending}
          progress={sendProgress}
        />
      )}

      {isBulkSendModalOpen && (
        <SendConfirmModal
          isOpen={isBulkSendModalOpen}
          onClose={() => { setIsBulkSendModalOpen(false); setPendingBulkIds([]); }}
          onConfirm={handleConfirmBulkSend}
          bulkCount={pendingBulkIds.length}
          isSending={isSending}
          progress={sendProgress}
        />
      )}

      {/* Skipped students warning modal */}
      <Modal
        isOpen={isSkippedModalOpen}
        onClose={() => { setIsSkippedModalOpen(false); setSkippedStudents([]); setPendingBulkIds([]); }}
        title={t("skippedTitle")}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">{t("skippedMessage")}</p>
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 max-h-40 overflow-y-auto">
            {skippedStudents.map((s) => (
              <p key={s.id} className="text-sm">
                <span className="font-medium">{s.student_name}</span>
                <span className="text-muted-foreground"> — {t(`statuses.${s.status}`)}</span>
              </p>
            ))}
          </div>
          {pendingBulkIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("skippedContinue", { count: pendingBulkIds.length })}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => { setIsSkippedModalOpen(false); setSkippedStudents([]); setPendingBulkIds([]); }}
            >
              {t("cancel")}
            </Button>
            {pendingBulkIds.length > 0 && (
              <Button variant="primary" onClick={handleSkippedConfirm}>
                {t("continueSending")}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {isPreviewOpen && (
        <EmailPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => { setIsPreviewOpen(false); setPreviewHtml(null); }}
          html={previewHtml}
          studentName={previewStudentName}
        />
      )}

      {isEditModalOpen && (
        <EditStudentModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setEditTarget(null); }}
          onSuccess={fetchData}
          student={editTarget}
        />
      )}

      {isDetailsModalOpen && (
        <StudentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => { setIsDetailsModalOpen(false); setDetailsTarget(null); }}
          student={detailsTarget}
          senderInfo={detailsTarget?.sent_by ? senders.find((s) => s.sentBy === detailsTarget.sent_by) : undefined}
        />
      )}
    </div>
  );
}
