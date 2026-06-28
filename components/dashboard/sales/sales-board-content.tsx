"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { DragEvent, FormEvent, PointerEvent } from "react";
import {
  CalendarDays,
  GripVertical,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  createSalesRegistration,
  deleteSalesRegistration,
  getSalesRegistrations,
  updateSalesRegistrationStatus,
} from "@/actions/sales-actions";
import { Badge, Button, Card, ConfirmDialog, Input, Modal, Textarea } from "@/components/ui";
import {
  SALES_COLUMNS,
  SALES_STATUSES,
  type CreateSalesRegistrationInput,
  type SalesRegistration,
  type SalesStatus,
} from "@/lib/types";
import { formatVietnamDate } from "@/lib/date-format";

interface SalesBoardContentProps {
  initialRegistrations: SalesRegistration[];
}

interface SalesLeadFormState {
  full_name: string;
  email: string;
  phone: string;
  facebook_link: string;
  course: string;
  birth_year: string;
  sat_score: string;
  target_score: string;
  test_date: string;
  discovery_source: string;
  sales_status: SalesStatus;
}

const EMPTY_FORM: SalesLeadFormState = {
  full_name: "",
  email: "",
  phone: "",
  facebook_link: "",
  course: "",
  birth_year: "",
  sat_score: "",
  target_score: "",
  test_date: "",
  discovery_source: "",
  sales_status: "queue",
};

const COURSE_OPTIONS = ["", "Pre-SAT", "SAT Beginner", "SAT Sprint", "SAT 1-1"];

function formatName(registration: SalesRegistration) {
  const firstName = registration.first_name?.trim() ?? "";
  const lastName = registration.last_name?.trim() ?? "";

  if (firstName && lastName && firstName.toLowerCase() !== lastName.toLowerCase()) {
    return `${firstName} ${lastName}`;
  }

  return firstName || lastName || "Unnamed lead";
}

function parseOptionalInteger(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole number.`);
  }

  return parsed;
}

function buildCreateInput(form: SalesLeadFormState): CreateSalesRegistrationInput {
  return {
    full_name: form.full_name,
    email: form.email,
    phone: form.phone.trim() || null,
    facebook_link: form.facebook_link.trim() || null,
    course: form.course.trim() || null,
    birth_year: parseOptionalInteger(form.birth_year, "Birth year"),
    sat_score: parseOptionalInteger(form.sat_score, "SAT score"),
    target_score: parseOptionalInteger(form.target_score, "Target score"),
    test_date: form.test_date.trim() || null,
    discovery_source: form.discovery_source.trim() || null,
    sales_status: form.sales_status,
  };
}

function groupByStatus(registrations: SalesRegistration[]) {
  return registrations.reduce(
    (acc, registration) => {
      const status = SALES_STATUSES.includes(registration.sales_status)
        ? registration.sales_status
        : "queue";
      acc[status].push(registration);
      return acc;
    },
    SALES_STATUSES.reduce(
      (acc, status) => {
        acc[status] = [];
        return acc;
      },
      {} as Record<SalesStatus, SalesRegistration[]>
    )
  );
}

function getStatusFromPoint(clientX: number, clientY: number) {
  const target = document.elementFromPoint(clientX, clientY);
  const status = target?.closest<HTMLElement>("[data-sales-status]")?.dataset.salesStatus;

  return SALES_STATUSES.includes(status as SalesStatus) ? (status as SalesStatus) : null;
}

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateSalesRegistrationInput) => Promise<void>;
}

function AddLeadModal({ isOpen, onClose, onSubmit }: AddLeadModalProps) {
  const [form, setForm] = useState<SalesLeadFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const updateField = <K extends keyof SalesLeadFormState>(
    field: K,
    value: SalesLeadFormState[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleClose = () => {
    if (isSaving) return;
    setForm(EMPTY_FORM);
    setError(null);
    onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startSaving(async () => {
      try {
        await onSubmit(buildCreateInput(form));
        setForm(EMPTY_FORM);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add sales lead.");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Sales Lead" size="2xl">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Input
          label="Full name"
          value={form.full_name}
          onChange={(event) => updateField("full_name", event.target.value)}
          placeholder="Nguyen Lan Anh"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="student@example.com"
            required
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+84912345678"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Course</label>
            <select
              value={form.course}
              onChange={(event) => updateField("course", event.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {COURSE_OPTIONS.map((course) => (
                <option key={course || "none"} value={course}>
                  {course || "No course"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Status</label>
            <select
              value={form.sales_status}
              onChange={(event) => updateField("sales_status", event.target.value as SalesStatus)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SALES_COLUMNS.map((column) => (
                <option key={column.status} value={column.status}>
                  {column.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Birth year"
            inputMode="numeric"
            value={form.birth_year}
            onChange={(event) => updateField("birth_year", event.target.value)}
            placeholder="2008"
          />
          <Input
            label="SAT score"
            inputMode="numeric"
            value={form.sat_score}
            onChange={(event) => updateField("sat_score", event.target.value)}
            placeholder="1280"
          />
          <Input
            label="Target score"
            inputMode="numeric"
            value={form.target_score}
            onChange={(event) => updateField("target_score", event.target.value)}
            placeholder="1450"
          />
        </div>

        <Input
          label="Test date"
          type="date"
          value={form.test_date}
          onChange={(event) => updateField("test_date", event.target.value)}
        />

        <Input
          label="Facebook"
          value={form.facebook_link}
          onChange={(event) => updateField("facebook_link", event.target.value)}
          placeholder="https://facebook.com/..."
        />

        <Textarea
          label="Discovery source"
          value={form.discovery_source}
          onChange={(event) => updateField("discovery_source", event.target.value)}
          placeholder="Referral, Facebook ads, event..."
          className="min-h-20"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="gap-2">
            <Plus className="h-4 w-4" />
            {isSaving ? "Adding..." : "Add Lead"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface LeadCardProps {
  registration: SalesRegistration;
  isBusy: boolean;
  onMove: (id: number, status: SalesStatus) => void;
  onDelete: (registration: SalesRegistration) => void;
  onDragStart: (event: DragEvent<HTMLElement>, id: number) => void;
  onDragEnd: () => void;
  onPointerDragStart: (event: PointerEvent<HTMLElement>, registration: SalesRegistration) => void;
  onPointerDragMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerDragEnd: (event: PointerEvent<HTMLElement>) => void;
}

function LeadCard({
  registration,
  isBusy,
  onMove,
  onDelete,
  onDragStart,
  onDragEnd,
  onPointerDragStart,
  onPointerDragMove,
  onPointerDragEnd,
}: LeadCardProps) {
  const name = formatName(registration);
  const course = registration.course || "No course";
  const hasScores = registration.sat_score || registration.target_score;

  return (
    <Card
      draggable
      onDragStart={(event) => onDragStart(event, registration.id)}
      onDragEnd={onDragEnd}
      onPointerDown={(event) => onPointerDragStart(event, registration)}
      onPointerMove={onPointerDragMove}
      onPointerUp={onPointerDragEnd}
      onPointerCancel={onPointerDragEnd}
      className={`cursor-grab touch-none select-none p-4 transition hover:border-muted-foreground/40 active:cursor-grabbing ${
        isBusy ? "opacity-60" : ""
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground" title={name}>
            {name}
          </h3>
          <p className="mt-1 truncate text-xs font-medium text-muted-foreground" title={course}>
            {course}
          </p>
        </div>
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <p className="flex min-w-0 items-center gap-2">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate" title={registration.email}>
            {registration.email || "No email"}
          </span>
        </p>
        <p className="flex min-w-0 items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate" title={registration.phone}>
            {registration.phone || "No phone"}
          </span>
        </p>
        {hasScores && (
          <p>
            SAT {registration.sat_score ?? "-"} / Target {registration.target_score ?? "-"}
          </p>
        )}
        {registration.discovery_source && (
          <p className="truncate" title={registration.discovery_source}>
            {registration.discovery_source}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatVietnamDate(registration.created_at, "No date")}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={registration.sales_status}
            onChange={(event) => onMove(registration.id, event.target.value as SalesStatus)}
            disabled={isBusy}
            aria-label={`Move ${name}`}
            className="max-w-24 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            {SALES_COLUMNS.map((column) => (
              <option key={column.status} value={column.status}>
                {column.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onDelete(registration)}
            disabled={isBusy}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            aria-label={`Delete ${name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

export function SalesBoardContent({ initialRegistrations }: SalesBoardContentProps) {
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<SalesStatus | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesRegistration | null>(null);
  const [isPending, startTransition] = useTransition();
  const draggedIdRef = useRef<number | null>(null);
  const grouped = useMemo(() => groupByStatus(registrations), [registrations]);

  const refresh = (search = searchQuery) => {
    setError(null);
    startTransition(async () => {
      try {
        setRegistrations(await getSalesRegistrations(search));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to refresh sales board.");
      }
    });
  };

  const moveRegistration = (id: number, status: SalesStatus) => {
    const existing = registrations.find((registration) => registration.id === id);
    if (!existing || existing.sales_status === status) return;

    const previous = registrations;
    setBusyId(id);
    setRegistrations((current) =>
      current.map((registration) =>
        registration.id === id ? { ...registration, sales_status: status } : registration
      )
    );

    startTransition(async () => {
      try {
        const updated = await updateSalesRegistrationStatus(id, status);
        setRegistrations((current) =>
          current.map((registration) => (registration.id === id ? updated : registration))
        );
      } catch (err) {
        setRegistrations(previous);
        setError(err instanceof Error ? err.message : "Failed to update sales status.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleCreate = async (input: CreateSalesRegistrationInput) => {
    const created = await createSalesRegistration(input);
    setRegistrations((current) => [created, ...current]);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    const target = deleteTarget;
    const previous = registrations;
    setBusyId(target.id);
    setDeleteTarget(null);
    setRegistrations((current) => current.filter((registration) => registration.id !== target.id));

    startTransition(async () => {
      try {
        await deleteSalesRegistration(target.id);
      } catch (err) {
        setRegistrations(previous);
        setError(err instanceof Error ? err.message : "Failed to delete sales lead.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, id: number) => {
    draggedIdRef.current = id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-qas-sales-lead-id", String(id));
    event.dataTransfer.setData("text/plain", String(id));
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    draggedIdRef.current = null;
    setDraggedId(null);
    setDragOverStatus(null);
  };

  const handlePointerDragStart = (
    event: PointerEvent<HTMLElement>,
    registration: SalesRegistration
  ) => {
    if (event.button !== 0 || busyId === registration.id) return;

    const target = event.target;

    if (
      target instanceof HTMLElement &&
      target.closest("button, select, input, textarea, a")
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggedIdRef.current = registration.id;
    setDraggedId(registration.id);
    setDragOverStatus(registration.sales_status);
  };

  const handlePointerDragMove = (event: PointerEvent<HTMLElement>) => {
    if (draggedIdRef.current === null) return;

    const status = getStatusFromPoint(event.clientX, event.clientY);
    if (status) {
      setDragOverStatus(status);
    }
  };

  const handlePointerDragEnd = (event: PointerEvent<HTMLElement>) => {
    const id = draggedIdRef.current;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (id === null) {
      return;
    }

    const status = getStatusFromPoint(event.clientX, event.clientY);
    handleDragEnd();

    if (status) {
      moveRegistration(id, status);
    }
  };

  const handleDrop = (event: DragEvent<HTMLElement>, status: SalesStatus) => {
    event.preventDefault();
    event.stopPropagation();

    const rawId =
      event.dataTransfer.getData("application/x-qas-sales-lead-id") ||
      event.dataTransfer.getData("text/plain");
    const id = rawId ? Number(rawId) : draggedIdRef.current ?? draggedId;

    draggedIdRef.current = null;
    setDragOverStatus(null);
    setDraggedId(null);

    if (typeof id === "number" && Number.isFinite(id)) {
      moveRegistration(id, status);
    }
  };

  const total = registrations.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {total} trial registration{total === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              refresh();
            }}
          >
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search leads..."
              aria-label="Search sales leads"
              className="sm:w-72"
            />
            <Button type="submit" variant="outline" disabled={isPending} className="gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => refresh()}
              disabled={isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button type="button" onClick={() => setIsAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-x-auto pb-3">
        <div className="grid min-w-[1320px] grid-cols-5 gap-4">
          {SALES_COLUMNS.map((column) => {
            const columnRegistrations = grouped[column.status];
            const isDragOver = dragOverStatus === column.status;

            return (
              <section
                key={column.status}
                data-sales-status={column.status}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverStatus(column.status);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragOverStatus(column.status);
                }}
                onDragLeave={(event) => {
                  const nextTarget = event.relatedTarget;

                  if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                    setDragOverStatus(null);
                  }
                }}
                onDrop={(event) => handleDrop(event, column.status)}
                className={`min-h-[calc(100vh-15rem)] overflow-hidden rounded-xl border border-border border-t-4 bg-muted/40 ${column.accentClass} ${
                  isDragOver ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""
                }`}
              >
                <div className="flex items-center justify-between border-b border-border bg-muted/95 px-4 py-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                    {column.label}
                  </h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${column.badgeClass}`}>
                    {columnRegistrations.length}
                  </span>
                </div>

                <div className="space-y-3 p-3">
                  {columnRegistrations.map((registration) => (
                    <LeadCard
                      key={registration.id}
                      registration={registration}
                      isBusy={busyId === registration.id}
                      onMove={moveRegistration}
                      onDelete={setDeleteTarget}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onPointerDragStart={handlePointerDragStart}
                      onPointerDragMove={handlePointerDragMove}
                      onPointerDragEnd={handlePointerDragEnd}
                    />
                  ))}

                  {columnRegistrations.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-8 text-center text-sm font-medium text-muted-foreground">
                      Empty
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SALES_COLUMNS.map((column) => (
          <Badge key={column.status} className={column.badgeClass}>
            {column.label}: {grouped[column.status].length}
          </Badge>
        ))}
      </div>

      <AddLeadModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleCreate}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete sales lead"
        message={
          deleteTarget
            ? `Delete ${formatName(deleteTarget)} from qas_registrations?`
            : "Delete this sales lead?"
        }
        confirmText="Delete"
        isLoading={Boolean(deleteTarget && busyId === deleteTarget.id)}
      />
    </div>
  );
}
