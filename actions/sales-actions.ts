"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import {
  SALES_STATUSES,
  type CreateSalesRegistrationInput,
  type SalesAssignee,
  type SalesRegistration,
  type SalesStatus,
} from "@/lib/types";

const SALES_STATUS_SET = new Set<SalesStatus>(SALES_STATUSES);

let salesSchemaReady: Promise<void> | null = null;

type SalesRegistrationRow = Omit<SalesRegistration, "id"> & {
  id: number | string | null;
};

async function ensureSalesBoardSchema() {
  if (!salesSchemaReady) {
    salesSchemaReady = (async () => {
      await query(`ALTER TABLE qas_registrations ADD COLUMN IF NOT EXISTS sales_status TEXT`);
      await query(`ALTER TABLE qas_registrations ADD COLUMN IF NOT EXISTS sales_assignee_id TEXT`);
      await query(`ALTER TABLE qas_registrations ADD COLUMN IF NOT EXISTS sales_assignee_name TEXT`);
      await query(`ALTER TABLE qas_registrations ADD COLUMN IF NOT EXISTS sales_assignee_email TEXT`);
      await query(`UPDATE qas_registrations SET sales_status = 'queue' WHERE sales_status IS NULL`);
      await query(
        `UPDATE qas_registrations
         SET sales_status = 'queue'
         WHERE sales_status NOT IN ('queue', 'contacted', 'assigned', 'won', 'lost')`
      );
      await query(`ALTER TABLE qas_registrations ALTER COLUMN sales_status SET DEFAULT 'queue'`);
      await query(`ALTER TABLE qas_registrations ALTER COLUMN sales_status SET NOT NULL`);
      await query(
        `DO $$
         BEGIN
           IF NOT EXISTS (
             SELECT 1
             FROM pg_constraint
             WHERE conname = 'qas_registrations_sales_status_check'
               AND conrelid = 'qas_registrations'::regclass
           ) THEN
             ALTER TABLE qas_registrations
               ADD CONSTRAINT qas_registrations_sales_status_check
               CHECK (sales_status IN ('queue', 'contacted', 'assigned', 'won', 'lost'));
           END IF;
         END $$;`
      );
      await query(
        `CREATE INDEX IF NOT EXISTS qas_registrations_sales_status_created_at_idx
         ON qas_registrations (sales_status, created_at DESC)`
      );
      await query(
        `CREATE INDEX IF NOT EXISTS qas_registrations_sales_assignee_id_idx
         ON qas_registrations (sales_assignee_id)`
      );
    })().catch((error) => {
      salesSchemaReady = null;
      throw error;
    });
  }

  return salesSchemaReady;
}

function parseSalesStatus(value: unknown, fallback: SalesStatus = "queue") {
  if (typeof value !== "string" || !SALES_STATUS_SET.has(value as SalesStatus)) {
    return fallback;
  }

  return value as SalesStatus;
}

function parseRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function parseOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseOptionalInteger(value: unknown, fieldName: string) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be a whole number.`);
  }

  return parsed;
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
}

function normalizeCreateInput(input: CreateSalesRegistrationInput) {
  const fullName = parseRequiredString(input.full_name, "Full name");
  const email = parseRequiredString(input.email, "Email").toLowerCase();
  const { firstName, lastName } = splitFullName(fullName);

  return {
    firstName,
    lastName,
    email,
    phone: parseOptionalString(input.phone),
    facebookLink: parseOptionalString(input.facebook_link),
    course: parseOptionalString(input.course),
    birthYear: parseOptionalInteger(input.birth_year, "Birth year"),
    satScore: parseOptionalInteger(input.sat_score, "SAT score"),
    targetScore: parseOptionalInteger(input.target_score, "Target score"),
    testDate: parseOptionalString(input.test_date),
    discoverySource: parseOptionalString(input.discovery_source) ?? "Manual sales entry",
    salesStatus: parseSalesStatus(input.sales_status),
  };
}

function revalidateSalesViews() {
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/registrations");
}

function serializeDate(value: string | Date | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeRegistrationId(value: unknown) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || null;
  }

  return null;
}

function normalizeSalesRegistration(registration: SalesRegistrationRow): SalesRegistration {
  const id = normalizeRegistrationId(registration.id);

  if (id === null) {
    throw new Error("Invalid registration id returned from database.");
  }

  return {
    ...registration,
    id,
    created_at: serializeDate(registration.created_at) ?? "",
    updated_at: serializeDate(registration.updated_at) ?? "",
    test_date: serializeDate(registration.test_date),
    next_email_date: serializeDate(registration.next_email_date),
    sales_status: parseSalesStatus(registration.sales_status),
    sales_assignee_id: registration.sales_assignee_id ?? null,
    sales_assignee_name: registration.sales_assignee_name ?? null,
    sales_assignee_email: registration.sales_assignee_email ?? null,
  };
}

function normalizeAssignee(assignee: SalesAssignee): SalesAssignee {
  return {
    ...assignee,
    display_name: assignee.display_name || assignee.full_name || assignee.email,
  };
}

async function getAssignableSalesAssignee(id: string) {
  const result = await query<SalesAssignee>(
    `SELECT
       id::text,
       email,
       full_name,
       role,
       COALESCE(NULLIF(full_name, ''), email) AS display_name
     FROM app_users
     WHERE id = $1
       AND role IN ('admin', 'internal', 'sales')
       AND is_active = true`,
    [id]
  );

  return result.rows[0] ? normalizeAssignee(result.rows[0]) : null;
}

export async function getSalesAssignees(): Promise<SalesAssignee[]> {
  const result = await query<SalesAssignee>(
    `SELECT
       id::text,
       email,
       full_name,
       role,
       COALESCE(NULLIF(full_name, ''), email) AS display_name
     FROM app_users
     WHERE role IN ('admin', 'internal', 'sales')
       AND is_active = true
     ORDER BY COALESCE(NULLIF(full_name, ''), email) ASC`
  );

  return result.rows.map(normalizeAssignee);
}

export async function getSalesRegistrations(search = ""): Promise<SalesRegistration[]> {
  await ensureSalesBoardSchema();

  const normalizedSearch = search.trim();
  const params: string[] = [];
  let whereClause = "";

  if (normalizedSearch) {
    params.push(`%${normalizedSearch}%`);
    whereClause = `
      WHERE first_name ILIKE $1
         OR last_name ILIKE $1
         OR email ILIKE $1
         OR phone ILIKE $1
         OR course ILIKE $1
         OR discovery_source ILIKE $1
    `;
  }

  const result = await query<SalesRegistrationRow>(
    `SELECT *
     FROM qas_registrations
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT 500`,
    params
  );

  return result.rows.map(normalizeSalesRegistration);
}

export async function createSalesRegistration(
  input: CreateSalesRegistrationInput
): Promise<SalesRegistration> {
  await ensureSalesBoardSchema();

  const normalized = normalizeCreateInput(input);

  const result = await query<SalesRegistrationRow>(
    `INSERT INTO qas_registrations (
       first_name,
       last_name,
       email,
       phone,
       facebook_link,
       course,
       birth_year,
       sat_score,
       target_score,
       test_date,
       discovery_source,
       submission_type,
       is_completed,
       is_qualified,
       engagement_pool,
       pool_name,
       pool_description,
       sales_status,
       updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, 'completed', true, true, 'sales', 'Sales', 'Manual sales entry',
       $12, NOW()
     )
     RETURNING *`,
    [
      normalized.firstName,
      normalized.lastName,
      normalized.email,
      normalized.phone,
      normalized.facebookLink,
      normalized.course,
      normalized.birthYear,
      normalized.satScore,
      normalized.targetScore,
      normalized.testDate,
      normalized.discoverySource,
      normalized.salesStatus,
    ]
  );

  revalidateSalesViews();

  return normalizeSalesRegistration(result.rows[0]);
}

export async function updateSalesRegistrationStatus(
  id: number | string,
  salesStatus: SalesStatus,
  salesAssigneeId?: string | null
): Promise<
  | { success: true; registration: SalesRegistration }
  | { success: false; error: string }
> {
  try {
    await ensureSalesBoardSchema();

    const registrationId = normalizeRegistrationId(id);

    if (registrationId === null) {
      return { success: false, error: "Registration id is required." };
    }

    const normalizedStatus = parseSalesStatus(salesStatus);
    let assignee: SalesAssignee | null = null;

    if (normalizedStatus === "assigned") {
      if (!salesAssigneeId) {
        return { success: false, error: "Please choose an assignee." };
      }

      assignee = await getAssignableSalesAssignee(salesAssigneeId);

      if (!assignee) {
        return { success: false, error: "Selected assignee is not available." };
      }
    }

    const result = await query<SalesRegistrationRow>(
      `UPDATE qas_registrations
       SET sales_status = $2,
           sales_assignee_id = COALESCE($3, sales_assignee_id),
           sales_assignee_name = COALESCE($4, sales_assignee_name),
           sales_assignee_email = COALESCE($5, sales_assignee_email),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        registrationId,
        normalizedStatus,
        assignee?.id ?? null,
        assignee?.display_name ?? null,
        assignee?.email ?? null,
      ]
    );

    if (result.rows.length === 0) {
      return { success: false, error: "Registration not found." };
    }

    return {
      success: true,
      registration: normalizeSalesRegistration(result.rows[0]),
    };
  } catch (error) {
    console.error("Failed to update sales status:", error);
    return { success: false, error: "Failed to update sales status." };
  }
}

export async function deleteSalesRegistration(id: number | string): Promise<{ success: boolean }> {
  await ensureSalesBoardSchema();

  const registrationId = normalizeRegistrationId(id);

  if (registrationId === null) {
    throw new Error("Registration id is required.");
  }

  await query(`DELETE FROM qas_registrations WHERE id = $1`, [registrationId]);
  revalidateSalesViews();

  return { success: true };
}
