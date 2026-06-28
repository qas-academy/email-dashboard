"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  Registration,
  RegistrationFilters,
  PaginationParams,
  PaginatedResult,
  FilterOptions,
  CSVRegistration,
  CSVValidationError,
  CSVImportResult,
  EngagementPool,
} from "@/lib/types";

// Valid engagement pool values
const VALID_ENGAGEMENT_POOLS: EngagementPool[] = [
  'sales', 'consulting', 'experience', 'nurture', 'education', 'giveaway'
];

export async function getRegistrations(
  filters: RegistrationFilters,
  pagination: PaginationParams = {}
): Promise<PaginatedResult<Registration>> {
  const { page = 1, limit = 10, sortBy = "created_at", sortOrder = "desc" } = pagination;

  try {
    const { search, priority_level, engagement_pool, is_qualified, is_completed } = filters;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (search && search.trim()) {
      conditions.push(
        `(first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`
      );
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (priority_level !== null && priority_level !== undefined) {
      conditions.push(`priority_level = $${paramIndex}`);
      params.push(priority_level);
      paramIndex++;
    }

    if (engagement_pool) {
      conditions.push(`engagement_pool = $${paramIndex}`);
      params.push(engagement_pool);
      paramIndex++;
    }

    if (is_qualified !== null && is_qualified !== undefined) {
      conditions.push(`is_qualified = $${paramIndex}`);
      params.push(is_qualified);
      paramIndex++;
    }

    if (is_completed !== null && is_completed !== undefined) {
      conditions.push(`is_completed = $${paramIndex}`);
      params.push(is_completed);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Whitelist allowed sort columns
    const allowedSortColumns = [
      "id", "created_at", "updated_at", "first_name", "last_name",
      "email", "priority_level", "engagement_pool", "is_qualified", "is_completed"
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "created_at";
    const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

    const [countResult, dataResult] = await Promise.all([
      query(
        `SELECT COUNT(*) FROM qas_registrations ${whereClause}`,
        params
      ),
      query(
        `SELECT * FROM qas_registrations ${whereClause}
         ORDER BY "${safeSortBy}" ${safeSortOrder}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
    ]);
    const total = parseInt(countResult.rows[0].count, 10);

    return {
      data: dataResult.rows as Registration[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }
}

export async function getRegistrationById(id: number): Promise<Registration | null> {
  try {
    const result = await query(
      "SELECT * FROM qas_registrations WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Registration;
  } catch (error) {
    console.error("Error fetching registration:", error);
    return null;
  }
}

export async function getFilterOptions(): Promise<FilterOptions> {
  try {
    const poolsResult = await query(
      `SELECT DISTINCT engagement_pool FROM qas_registrations
       WHERE engagement_pool IS NOT NULL
       ORDER BY engagement_pool`
    );

    const prioritiesResult = await query(
      `SELECT DISTINCT priority_level FROM qas_registrations
       WHERE priority_level IS NOT NULL
       ORDER BY priority_level`
    );

    return {
      engagement_pools: poolsResult.rows.map((r) => r.engagement_pool),
      priority_levels: prioritiesResult.rows.map((r) => r.priority_level),
    };
  } catch (error) {
    console.error("Error fetching filter options:", error);
    return {
      engagement_pools: [],
      priority_levels: [],
    };
  }
}

export async function exportRegistrations(
  filters: RegistrationFilters
): Promise<Registration[]> {
  try {
    const { search, priority_level, engagement_pool, is_qualified, is_completed } = filters;

    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (search && search.trim()) {
      conditions.push(
        `(first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`
      );
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (priority_level !== null && priority_level !== undefined) {
      conditions.push(`priority_level = $${paramIndex}`);
      params.push(priority_level);
      paramIndex++;
    }

    if (engagement_pool) {
      conditions.push(`engagement_pool = $${paramIndex}`);
      params.push(engagement_pool);
      paramIndex++;
    }

    if (is_qualified !== null && is_qualified !== undefined) {
      conditions.push(`is_qualified = $${paramIndex}`);
      params.push(is_qualified);
      paramIndex++;
    }

    if (is_completed !== null && is_completed !== undefined) {
      conditions.push(`is_completed = $${paramIndex}`);
      params.push(is_completed);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await query(
      `SELECT * FROM qas_registrations ${whereClause} ORDER BY created_at DESC`,
      params
    );

    return result.rows as Registration[];
  } catch (error) {
    console.error("Error exporting registrations:", error);
    return [];
  }
}

export async function validateCSVData(
  data: CSVRegistration[]
): Promise<CSVValidationError[]> {
  const errors: CSVValidationError[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 because row 1 is header, and index starts at 0

    // Required fields
    if (!row.first_name?.trim()) {
      errors.push({ row: rowNum, field: "first_name", message: "First name is required" });
    }
    if (!row.last_name?.trim()) {
      errors.push({ row: rowNum, field: "last_name", message: "Last name is required" });
    }
    if (!row.email?.trim()) {
      errors.push({ row: rowNum, field: "email", message: "Email is required" });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push({ row: rowNum, field: "email", message: "Invalid email format" });
    }

    // Optional field validations
    if (row.sat_score !== undefined && row.sat_score !== null) {
      const score = Number(row.sat_score);
      if (isNaN(score) || score < 400 || score > 1600) {
        errors.push({ row: rowNum, field: "sat_score", message: "SAT score must be between 400 and 1600" });
      }
    }

    if (row.target_score !== undefined && row.target_score !== null) {
      const target = Number(row.target_score);
      if (isNaN(target) || target < 400 || target > 1600) {
        errors.push({ row: rowNum, field: "target_score", message: "Target score must be between 400 and 1600" });
      }
    }

    if (row.birth_year !== undefined && row.birth_year !== null) {
      const year = Number(row.birth_year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < currentYear - 100 || year > currentYear - 10) {
        errors.push({ row: rowNum, field: "birth_year", message: "Invalid birth year" });
      }
    }

    if (row.sat_test_status && !["taken", "never"].includes(row.sat_test_status)) {
      errors.push({ row: rowNum, field: "sat_test_status", message: "SAT test status must be 'taken' or 'never'" });
    }

    // Validate priority_level (1-5)
    if (row.priority_level !== undefined && row.priority_level !== null) {
      const priority = Number(row.priority_level);
      if (isNaN(priority) || priority < 1 || priority > 5) {
        errors.push({ row: rowNum, field: "priority_level", message: "Priority level must be between 1 and 5" });
      }
    }

    // Validate engagement_pool
    if (row.engagement_pool && !VALID_ENGAGEMENT_POOLS.includes(row.engagement_pool)) {
      errors.push({
        row: rowNum,
        field: "engagement_pool",
        message: `Engagement pool must be one of: ${VALID_ENGAGEMENT_POOLS.join(', ')}`
      });
    }
  });

  return errors;
}

export async function importRegistrations(
  data: CSVRegistration[]
): Promise<CSVImportResult> {
  try {
    // Validate first
    const errors = await validateCSVData(data);
    if (errors.length > 0) {
      return { success: 0, failed: data.length, errors };
    }

    let successCount = 0;
    let failedCount = 0;
    const importErrors: CSVValidationError[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Check if email already exists
        const existingResult = await query(
          "SELECT id FROM qas_registrations WHERE email = $1",
          [row.email.trim().toLowerCase()]
        );

        if (existingResult.rows.length > 0) {
          // Update existing
          await query(
            `UPDATE qas_registrations SET
              first_name = $2,
              last_name = $3,
              phone = $4,
              course = $5,
              sat_score = $6,
              birth_year = $7,
              facebook_link = $8,
              discovery_source = $9,
              test_date = $10,
              target_score = $11,
              sat_test_status = $12,
              updated_at = NOW()
            WHERE email = $1`,
            [
              row.email.trim().toLowerCase(),
              row.first_name.trim(),
              row.last_name.trim(),
              row.phone?.trim() || null,
              row.course || null,
              row.sat_score || null,
              row.birth_year || null,
              row.facebook_link || null,
              row.discovery_source || null,
              row.test_date || null,
              row.target_score || null,
              row.sat_test_status || null,
            ]
          );
        } else {
          // Insert new
          await query(
            `INSERT INTO qas_registrations
              (first_name, last_name, email, phone, course, sat_score, birth_year,
               facebook_link, discovery_source, test_date, target_score, sat_test_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              row.first_name.trim(),
              row.last_name.trim(),
              row.email.trim().toLowerCase(),
              row.phone?.trim() || null,
              row.course || null,
              row.sat_score || null,
              row.birth_year || null,
              row.facebook_link || null,
              row.discovery_source || null,
              row.test_date || null,
              row.target_score || null,
              row.sat_test_status || null,
            ]
          );
        }
        successCount++;
      } catch (rowError) {
        failedCount++;
        importErrors.push({
          row: i + 2,
          field: "general",
          message: `Failed to import row: ${rowError instanceof Error ? rowError.message : "Unknown error"}`,
        });
      }
    }

    revalidatePath("/dashboard/registrations");

    return { success: successCount, failed: failedCount, errors: importErrors };
  } catch (error) {
    console.error("Error importing registrations:", error);
    return {
      success: 0,
      failed: data.length,
      errors: [{ row: 0, field: "general", message: "Failed to import registrations" }],
    };
  }
}
